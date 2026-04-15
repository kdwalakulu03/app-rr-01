-- =====================================================
-- Migration 005: Mentor Routes & Spatial Canvas
-- =====================================================
-- The core mentor data model for RoamRicher's spatial travel platform.
-- Mentors draw routes, drop pins, mark areas — all stored as PostGIS geometry.
--
-- Rule: GIST spatial index on EVERY geometry column.

-- ============================================
-- 1. MENTOR_ROUTES — the top-level route container
-- ============================================
CREATE TABLE IF NOT EXISTS mentor_routes (
    id SERIAL PRIMARY KEY,

    -- Creator (links to users.firebase_uid)
    creator_uid VARCHAR(128) NOT NULL,

    -- Metadata
    title VARCHAR(500) NOT NULL DEFAULT 'Untitled Route',
    description TEXT,
    country_code CHAR(2),
    region VARCHAR(255),           -- e.g. "Central Vietnam", "Northern Sri Lanka"
    cities TEXT[] DEFAULT '{}',    -- cities covered

    -- Trip metadata
    duration_days INT,
    travel_style VARCHAR(50),      -- backpacker, mid-range, luxury, adventure
    transport_modes TEXT[] DEFAULT '{}',  -- bus, train, motorbike, flight, ferry, walking
    budget_per_day_usd DECIMAL(10,2),
    best_season VARCHAR(100),      -- "Nov-Mar", "Year-round"
    difficulty VARCHAR(20),        -- easy, moderate, challenging

    -- Route geometry (combined line of all segments)
    route_geometry GEOMETRY(LineString, 4326),
    -- Bounding box for quick spatial queries
    bounds GEOMETRY(Polygon, 4326),

    -- Status & lifecycle
    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published', 'archived')),
    published_at TIMESTAMPTZ,

    -- Stats (updated on publish / views)
    view_count INT NOT NULL DEFAULT 0,
    save_count INT NOT NULL DEFAULT 0,
    fork_count INT NOT NULL DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mentor_routes_creator ON mentor_routes (creator_uid);
CREATE INDEX IF NOT EXISTS idx_mentor_routes_status ON mentor_routes (status);
CREATE INDEX IF NOT EXISTS idx_mentor_routes_country ON mentor_routes (country_code);
CREATE INDEX IF NOT EXISTS idx_mentor_routes_geometry ON mentor_routes USING GIST (route_geometry);
CREATE INDEX IF NOT EXISTS idx_mentor_routes_bounds ON mentor_routes USING GIST (bounds);
CREATE INDEX IF NOT EXISTS idx_mentor_routes_published ON mentor_routes (published_at DESC) WHERE status = 'published';

-- ============================================
-- 2. MENTOR_PINS — point-of-interest markers
-- ============================================
CREATE TABLE IF NOT EXISTS mentor_pins (
    id SERIAL PRIMARY KEY,
    mentor_route_id INT NOT NULL REFERENCES mentor_routes(id) ON DELETE CASCADE,

    -- Location
    location GEOMETRY(Point, 4326) NOT NULL,
    
    -- Categorization
    category VARCHAR(50) NOT NULL DEFAULT 'general'
        CHECK (category IN (
            'food', 'stay', 'transport', 'hidden-gem',
            'warning', 'photo-spot', 'activity', 'culture',
            'nature', 'nightlife', 'shopping', 'general'
        )),

    -- Content
    title VARCHAR(500),
    notes TEXT,
    tips TEXT,                     -- practical tips ("ask for the back room")
    photos TEXT[] DEFAULT '{}',    -- URLs
    cost_usd DECIMAL(10,2),       -- approximate cost
    duration_minutes INT,          -- how long to spend here
    time_of_day VARCHAR(20),       -- morning, afternoon, evening, night, anytime

    -- Ordering within route
    sequence_order INT NOT NULL DEFAULT 0,

    -- Day assignment (optional — for multi-day routes)
    day_number INT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mentor_pins_route ON mentor_pins (mentor_route_id);
CREATE INDEX IF NOT EXISTS idx_mentor_pins_location ON mentor_pins USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_mentor_pins_category ON mentor_pins (category);

-- ============================================
-- 3. MENTOR_SEGMENTS — road-snapped route pieces
-- ============================================
CREATE TABLE IF NOT EXISTS mentor_segments (
    id SERIAL PRIMARY KEY,
    mentor_route_id INT NOT NULL REFERENCES mentor_routes(id) ON DELETE CASCADE,

    -- The two pins this segment connects
    from_pin_id INT REFERENCES mentor_pins(id) ON DELETE SET NULL,
    to_pin_id INT REFERENCES mentor_pins(id) ON DELETE SET NULL,

    -- Road-snapped geometry from OSRM/GraphHopper
    geometry GEOMETRY(LineString, 4326) NOT NULL,

    -- Transport info
    transport_mode VARCHAR(30) NOT NULL DEFAULT 'driving'
        CHECK (transport_mode IN (
            'driving', 'walking', 'cycling', 'bus', 'train',
            'flight', 'ferry', 'motorbike', 'taxi', 'other'
        )),

    -- Metadata from OSRM response
    distance_km DECIMAL(10,2),
    duration_minutes INT,
    cost_usd DECIMAL(10,2),
    tips TEXT,                     -- "Take the morning bus, much less crowded"

    -- Ordering
    sequence_order INT NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mentor_segments_route ON mentor_segments (mentor_route_id);
CREATE INDEX IF NOT EXISTS idx_mentor_segments_geometry ON mentor_segments USING GIST (geometry);

-- ============================================
-- 4. MENTOR_AREAS — "explored this neighbourhood"
-- ============================================
CREATE TABLE IF NOT EXISTS mentor_areas (
    id SERIAL PRIMARY KEY,
    mentor_route_id INT NOT NULL REFERENCES mentor_routes(id) ON DELETE CASCADE,

    -- Polygon boundary
    boundary GEOMETRY(Polygon, 4326) NOT NULL,

    -- Content
    label VARCHAR(500),
    notes TEXT,
    category VARCHAR(50) DEFAULT 'explored'
        CHECK (category IN ('explored', 'recommended', 'avoid', 'nightlife-zone', 'food-street', 'market', 'other')),

    -- Styling hints for frontend
    color VARCHAR(7) DEFAULT '#10b981',  -- hex color
    opacity DECIMAL(3,2) DEFAULT 0.20,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mentor_areas_route ON mentor_areas (mentor_route_id);
CREATE INDEX IF NOT EXISTS idx_mentor_areas_boundary ON mentor_areas USING GIST (boundary);

-- ============================================
-- 5. UPDATED_AT TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_mentor_routes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_mentor_routes_updated_at ON mentor_routes;
CREATE TRIGGER trigger_mentor_routes_updated_at
    BEFORE UPDATE ON mentor_routes
    FOR EACH ROW
    EXECUTE FUNCTION update_mentor_routes_updated_at();

CREATE OR REPLACE FUNCTION update_mentor_pins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_mentor_pins_updated_at ON mentor_pins;
CREATE TRIGGER trigger_mentor_pins_updated_at
    BEFORE UPDATE ON mentor_pins
    FOR EACH ROW
    EXECUTE FUNCTION update_mentor_pins_updated_at();
