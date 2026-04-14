-- Roam Richer / NearNow4 Database Schema
-- Migration 001: Core Tables
-- Adapted for Google Maps place data (186K+ real places across 26 countries)

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- 1. PROVIDERS
-- ============================================
CREATE TABLE IF NOT EXISTS providers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'editorial',
    bio TEXT,
    avatar_url TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    credentials JSONB DEFAULT '{}',
    email VARCHAR(255),
    phone VARCHAR(50),
    website TEXT,
    social_links JSONB DEFAULT '{}',
    country_code CHAR(2),
    city VARCHAR(255),
    route_count INT DEFAULT 0,
    total_trips INT DEFAULT 0,
    avg_rating DECIMAL(2,1) DEFAULT 0,
    review_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO providers (id, name, slug, type, bio, is_verified, verified_at)
VALUES (1, 'Roam Richer Originals', 'roamricher-originals', 'editorial',
        'Expertly curated travel routes by the Roam Richer team.',
        TRUE, NOW())
ON CONFLICT (id) DO NOTHING;
SELECT setval('providers_id_seq', (SELECT COALESCE(MAX(id),1) FROM providers), true);

-- ============================================
-- 2. PLACES (Google Maps data)
-- ============================================
CREATE TABLE IF NOT EXISTS places (
    id SERIAL PRIMARY KEY,
    google_place_id TEXT,
    name TEXT NOT NULL,
    name_en TEXT,
    slug TEXT,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    location GEOMETRY(Point, 4326),
    country_code CHAR(2) NOT NULL,
    country VARCHAR(100),
    city VARCHAR(255),
    state_province VARCHAR(255),
    district VARCHAR(255),
    address TEXT,
    main_category VARCHAR(100) NOT NULL,
    sub_category VARCHAR(100),
    description TEXT,
    opening_hours VARCHAR(500),
    phone VARCHAR(100),
    website TEXT,
    email VARCHAR(255),
    image_url TEXT,
    photos_json TEXT,
    rating DECIMAL(2,1),
    review_count INT DEFAULT 0,
    price_level INT,
    price VARCHAR(100),
    price_currency VARCHAR(10) DEFAULT 'USD',
    amenities TEXT,
    source VARCHAR(50) DEFAULT 'google_maps',
    search_query VARCHAR(500),
    search_location VARCHAR(255),
    visit_count INT DEFAULT 0,
    avg_duration_minutes INT,
    is_active BOOLEAN DEFAULT TRUE,
    scraped_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_places_location ON places USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_places_country ON places(country_code);
CREATE INDEX IF NOT EXISTS idx_places_country_category ON places(country_code, main_category);
CREATE INDEX IF NOT EXISTS idx_places_country_city ON places(country_code, city);
CREATE INDEX IF NOT EXISTS idx_places_category ON places(main_category);
CREATE INDEX IF NOT EXISTS idx_places_sub_category ON places(sub_category);
CREATE INDEX IF NOT EXISTS idx_places_city ON places(city);
CREATE INDEX IF NOT EXISTS idx_places_rating ON places(rating DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_places_name_trgm ON places USING GIN(name gin_trgm_ops);

-- Auto-generate PostGIS point
CREATE OR REPLACE FUNCTION places_update_location()
RETURNS TRIGGER AS $$
BEGIN
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS places_location_trigger ON places;
CREATE TRIGGER places_location_trigger
BEFORE INSERT OR UPDATE OF latitude, longitude ON places
FOR EACH ROW EXECUTE FUNCTION places_update_location();

-- ============================================
-- 3. EXPERIENCES
-- ============================================
CREATE TABLE IF NOT EXISTS experiences (
    id SERIAL PRIMARY KEY,
    place_id INT REFERENCES places(id) ON DELETE CASCADE,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    activity_type VARCHAR(100),
    category VARCHAR(100),
    duration_minutes INT NOT NULL DEFAULT 60,
    time_of_day_fit VARCHAR(50)[],
    best_days VARCHAR(20)[],
    priority VARCHAR(20) DEFAULT 'normal',
    is_skippable BOOLEAN DEFAULT TRUE,
    skip_if_rain BOOLEAN DEFAULT FALSE,
    indoor BOOLEAN DEFAULT FALSE,
    cost_budget DECIMAL(10,2),
    cost_moderate DECIMAL(10,2),
    cost_luxury DECIMAL(10,2),
    currency CHAR(3) DEFAULT 'USD',
    requires_booking BOOLEAN DEFAULT FALSE,
    booking_url TEXT,
    min_group_size INT DEFAULT 1,
    max_group_size INT,
    age_restriction VARCHAR(50),
    tags TEXT[],
    completion_rate DECIMAL(5,2),
    actual_avg_duration INT,
    skip_rate DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_experiences_place ON experiences(place_id);

-- ============================================
-- 4. ROUTE_TEMPLATES
-- ============================================
CREATE TABLE IF NOT EXISTS route_templates (
    id SERIAL PRIMARY KEY,
    provider_id INT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    name VARCHAR(500) NOT NULL,
    slug VARCHAR(500) UNIQUE NOT NULL,
    short_description VARCHAR(500),
    description TEXT,
    country_code CHAR(2) NOT NULL,
    country VARCHAR(100),
    region VARCHAR(255),
    cities TEXT[] NOT NULL,
    start_city VARCHAR(255),
    end_city VARCHAR(255),
    duration_days INT NOT NULL,
    budget_level VARCHAR(20) NOT NULL,
    estimated_cost_budget DECIMAL(10,2),
    estimated_cost_moderate DECIMAL(10,2),
    estimated_cost_luxury DECIMAL(10,2),
    currency CHAR(3) DEFAULT 'USD',
    pace VARCHAR(20) DEFAULT 'normal',
    group_types TEXT[],
    min_travelers INT DEFAULT 1,
    max_travelers INT,
    tags TEXT[],
    highlights TEXT[],
    interests TEXT[],
    cover_image TEXT,
    images TEXT[],
    rating DECIMAL(2,1) DEFAULT 0,
    review_count INT DEFAULT 0,
    times_used INT DEFAULT 0,
    completion_rate DECIMAL(5,2),
    is_published BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    is_official BOOLEAN DEFAULT FALSE,
    current_version_id INT,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_route_templates_provider ON route_templates(provider_id);
CREATE INDEX IF NOT EXISTS idx_route_templates_country ON route_templates(country_code);
CREATE INDEX IF NOT EXISTS idx_route_templates_slug ON route_templates(slug);

-- ============================================
-- 5. ROUTE_VERSIONS + DAYS + ACTIVITIES
-- ============================================
CREATE TABLE IF NOT EXISTS route_versions (
    id SERIAL PRIMARY KEY,
    route_template_id INT NOT NULL REFERENCES route_templates(id) ON DELETE CASCADE,
    version_number INT NOT NULL DEFAULT 1,
    change_notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN
    ALTER TABLE route_templates
    ADD CONSTRAINT fk_route_templates_current_version
    FOREIGN KEY (current_version_id) REFERENCES route_versions(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS route_days (
    id SERIAL PRIMARY KEY,
    route_version_id INT NOT NULL REFERENCES route_versions(id) ON DELETE CASCADE,
    day_number INT NOT NULL,
    title VARCHAR(255),
    description TEXT,
    city VARCHAR(255),
    overnight_city VARCHAR(255),
    accommodation_notes TEXT,
    main_transport VARCHAR(100),
    transport_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(route_version_id, day_number)
);

CREATE TABLE IF NOT EXISTS route_activities (
    id SERIAL PRIMARY KEY,
    route_day_id INT NOT NULL REFERENCES route_days(id) ON DELETE CASCADE,
    experience_id INT REFERENCES experiences(id) ON DELETE SET NULL,
    place_id INT REFERENCES places(id) ON DELETE SET NULL,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    sequence_order INT NOT NULL,
    start_time TIME,
    duration_minutes INT DEFAULT 60,
    place_name VARCHAR(500),
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    notes TEXT,
    tips TEXT,
    cost_estimate DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. TRIPS + DAYS + ACTIVITIES
-- ============================================
CREATE TABLE IF NOT EXISTS trips (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    route_version_id INT REFERENCES route_versions(id) ON DELETE SET NULL,
    name VARCHAR(255),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    country_code CHAR(2),
    cities TEXT[],
    group_type VARCHAR(50),
    travelers INT DEFAULT 1,
    adults INT DEFAULT 1,
    kids INT DEFAULT 0,
    pace VARCHAR(20) DEFAULT 'normal',
    budget_level VARCHAR(20) DEFAULT 'moderate',
    interests TEXT[],
    transport_modes TEXT[],
    status VARCHAR(50) DEFAULT 'planning',
    current_day INT DEFAULT 1,
    total_activities INT DEFAULT 0,
    completed_activities INT DEFAULT 0,
    skipped_activities INT DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0,
    share_token VARCHAR(100) UNIQUE,
    is_public BOOLEAN DEFAULT FALSE,
    show_costs BOOLEAN DEFAULT TRUE,
    show_times BOOLEAN DEFAULT TRUE,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trips_user ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_share_token ON trips(share_token);

CREATE TABLE IF NOT EXISTS trip_days (
    id SERIAL PRIMARY KEY,
    trip_id INT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    day_number INT NOT NULL,
    date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'upcoming',
    city VARCHAR(255),
    weather_condition VARCHAR(100),
    weather_temp_c DECIMAL(4,1),
    planned_activities INT DEFAULT 0,
    completed_activities INT DEFAULT 0,
    skipped_activities INT DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(trip_id, day_number)
);

CREATE TABLE IF NOT EXISTS trip_activities (
    id SERIAL PRIMARY KEY,
    trip_id INT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    trip_day_id INT REFERENCES trip_days(id) ON DELETE SET NULL,
    route_activity_id INT REFERENCES route_activities(id) ON DELETE SET NULL,
    experience_id INT REFERENCES experiences(id) ON DELETE SET NULL,
    place_id INT REFERENCES places(id) ON DELETE SET NULL,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    day_number INT NOT NULL,
    sequence_order INT NOT NULL,
    planned_start_time TIME,
    planned_duration_minutes INT,
    place_name VARCHAR(500),
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    estimated_cost DECIMAL(10,2),
    actual_cost DECIMAL(10,2),
    currency CHAR(3) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'pending',
    skip_reason VARCHAR(255),
    actual_start_time TIMESTAMPTZ,
    actual_end_time TIMESTAMPTZ,
    actual_duration_minutes INT,
    notes TEXT,
    rating INT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. TRIP_LOGS
-- ============================================
CREATE TABLE IF NOT EXISTS trip_logs (
    id SERIAL PRIMARY KEY,
    trip_id INT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    trip_activity_id INT REFERENCES trip_activities(id) ON DELETE SET NULL,
    user_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    location_accuracy DECIMAL(6,2),
    data JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_logs_trip ON trip_logs(trip_id);

-- ============================================
-- 8. COUNTRIES
-- ============================================
CREATE TABLE IF NOT EXISTS countries (
    code CHAR(2) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    name_local VARCHAR(100),
    currency CHAR(3),
    timezone VARCHAR(50),
    languages TEXT[],
    flag VARCHAR(10),
    hero_image TEXT,
    description TEXT,
    daily_budget_usd DECIMAL(8,2),
    marketplace_enabled BOOLEAN DEFAULT FALSE,
    guide_signup_enabled BOOLEAN DEFAULT FALSE,
    booking_payments_enabled BOOLEAN DEFAULT FALSE,
    route_count INT DEFAULT 0,
    place_count INT DEFAULT 0,
    provider_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 9. REVIEWS
-- ============================================
CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    trip_id INT REFERENCES trips(id) ON DELETE SET NULL,
    route_template_id INT REFERENCES route_templates(id) ON DELETE CASCADE,
    provider_id INT REFERENCES providers(id) ON DELETE SET NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    content TEXT,
    rating_accuracy INT,
    rating_value INT,
    rating_experience INT,
    photos TEXT[],
    is_verified BOOLEAN DEFAULT FALSE,
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TRIGGERS: auto-update updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
    CREATE TRIGGER update_providers_updated_at BEFORE UPDATE ON providers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TRIGGER update_places_updated_at BEFORE UPDATE ON places FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TRIGGER update_route_templates_updated_at BEFORE UPDATE ON route_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON trips FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TRIGGER update_trip_activities_updated_at BEFORE UPDATE ON trip_activities FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
