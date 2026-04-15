-- =====================================================
-- Migration 004: Users & Profiles
-- =====================================================
-- Introduces a server-side user identity layer on top of Firebase Auth.
-- Supports 3 profile roles: traveler, provider, mentor.
-- Users can switch roles; each role has its own JSONB metadata.
--
-- Rule: GIST spatial index on EVERY geometry column.

-- ============================================
-- 1. USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,

    -- Firebase identity
    firebase_uid VARCHAR(128) UNIQUE NOT NULL,
    email VARCHAR(255),
    display_name VARCHAR(255),
    avatar_url TEXT,

    -- Active role (determines which UI module loads)
    active_role VARCHAR(20) NOT NULL DEFAULT 'traveler'
        CHECK (active_role IN ('traveler', 'provider', 'mentor')),

    -- Role-specific metadata (flexible JSONB per role)
    -- traveler_meta: { travel_style, interests[], budget_preference, countries_visited[] }
    -- provider_meta: { business_name, business_type, license_number, service_areas[] }
    -- mentor_meta:   { bio, specialties[], countries_expertise[], total_routes, verified }
    traveler_meta JSONB NOT NULL DEFAULT '{}',
    provider_meta JSONB NOT NULL DEFAULT '{}',
    mentor_meta   JSONB NOT NULL DEFAULT '{}',

    -- Last known location (for proximity features / nearby mentors)
    last_location GEOMETRY(Point, 4326),
    last_location_updated_at TIMESTAMPTZ,

    -- Stats
    trip_count INT NOT NULL DEFAULT 0,
    route_count INT NOT NULL DEFAULT 0,        -- mentor published routes
    contribution_count INT NOT NULL DEFAULT 0,  -- places contributed

    -- Lifecycle
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users (firebase_uid);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_active_role ON users (active_role);
CREATE INDEX IF NOT EXISTS idx_users_last_location ON users USING GIST (last_location);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at DESC);

-- ============================================
-- 2. UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_users_updated_at ON users;
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_users_updated_at();

-- ============================================
-- 3. LINK EXISTING TRIPS TO USER
-- ============================================
-- Add a user_id FK to trips table (nullable for backward compat)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'trips' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE trips ADD COLUMN user_id INT REFERENCES users(id) ON DELETE SET NULL;
        CREATE INDEX idx_trips_user_id ON trips (user_id);
    END IF;
END $$;

-- ============================================
-- 4. VERIFICATION / NOTES
-- ============================================
-- firebase_uid is the join key between Firebase Auth and our users table.
-- On first authenticated API call, ensureUser middleware will INSERT if not exists.
-- active_role drives frontend lazy-loading: only that role's module is loaded.
-- last_location has a GIST index for future "nearby mentors" queries.
