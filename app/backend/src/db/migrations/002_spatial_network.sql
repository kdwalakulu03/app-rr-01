-- =====================================================
-- Migration 002: Spatial Transport Network (Hub-Spoke)
-- =====================================================
-- RoamRicher's GIS-powered transport network.
--
-- Philosophy: Hub-and-spoke, NOT Google Maps routing.
--   - Nodes are hubs (airports, bus stations, city centers)
--   - Edges are connections between hubs (bus, train, flight, ferry)
--   - Geometry is AUTO-COMPUTED straight lines (haversine)
--   - Distances are haversine-approximate, not road-following
--   - For real navigation → deep-link to Google Maps
--
-- Tables:
--   transport_nodes      → POINT  (hubs in the network)
--   transport_edges      → auto-LINESTRING (connections)
--   transport_corridors  → multi-hop journeys (edge chains)
--   corridor_edges       → junction: which edges in which corridor
--   service_patterns     → operators, schedules, prices
--   route_skeletons      → traveller-facing customizable routes
--   skeleton_waypoints   → ordered stops along a skeleton

CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================
-- 1. TRANSPORT NODES  (the hubs)
-- ============================================
CREATE TABLE IF NOT EXISTS transport_nodes (
    id SERIAL PRIMARY KEY,

    -- Identity
    name VARCHAR(255) NOT NULL,
    name_local VARCHAR(255),
    slug VARCHAR(255) UNIQUE NOT NULL,

    -- Spatial (EPSG:4326 = WGS84 lat/lng)
    location GEOMETRY(Point, 4326) NOT NULL,
    country_code CHAR(2) NOT NULL,
    city VARCHAR(255),
    region VARCHAR(255),

    -- Classification
    node_type VARCHAR(50) NOT NULL DEFAULT 'city_center',
        -- airport | bus_terminal | train_station | ferry_pier
        -- border_crossing | city_center | accommodation_cluster
    hierarchy VARCHAR(30) NOT NULL DEFAULT 'local_hub',
        -- international_hub | regional_hub | local_hub | micro_destination

    -- Attributes
    description TEXT,
    timezone VARCHAR(50),
    elevation_m INTEGER,

    -- Operational info
    operating_hours VARCHAR(255),
    facilities JSONB DEFAULT '[]',
    contact JSONB DEFAULT '{}',

    -- Links to existing data
    place_id INTEGER REFERENCES places(id) ON DELETE SET NULL,
    osm_id BIGINT,

    -- Stats (maintained by triggers / cron)
    connection_count INTEGER DEFAULT 0,
    popularity_score NUMERIC(5,2) DEFAULT 0,

    -- Provenance
    created_by_provider_id INTEGER REFERENCES providers(id) ON DELETE SET NULL,
    created_by_user_id VARCHAR(128),

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tn_location   ON transport_nodes USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_tn_country    ON transport_nodes (country_code);
CREATE INDEX IF NOT EXISTS idx_tn_type       ON transport_nodes (node_type);
CREATE INDEX IF NOT EXISTS idx_tn_hierarchy  ON transport_nodes (hierarchy);
CREATE INDEX IF NOT EXISTS idx_tn_slug       ON transport_nodes (slug);

-- ============================================
-- 2. TRANSPORT EDGES  (hub-to-hub connections)
-- ============================================
-- Geometry is AUTO-COMPUTED as a straight line from source->target.
-- distance_km is AUTO-COMPUTED via haversine (ST_Distance geography).
-- No need to draw exact road paths — this is topology, not navigation.

CREATE TABLE IF NOT EXISTS transport_edges (
    id SERIAL PRIMARY KEY,

    -- Topology (which two nodes does this edge connect?)
    source_node_id INTEGER NOT NULL REFERENCES transport_nodes(id) ON DELETE CASCADE,
    target_node_id INTEGER NOT NULL REFERENCES transport_nodes(id) ON DELETE CASCADE,

    -- Auto-computed from node locations (trigger fills these)
    geometry GEOMETRY(LineString, 4326),
    distance_km NUMERIC(8,2),

    -- How you travel this edge
    transport_type VARCHAR(50) NOT NULL DEFAULT 'bus',
        -- bus | minivan | train | flight | ferry | boat | walk
        -- tuk_tuk | songthaew | motorcycle | car | cable_car
    road_surface VARCHAR(30),

    -- Journey info
    duration_minutes INTEGER,
    elevation_gain_m INTEGER,
    elevation_loss_m INTEGER,

    -- Cost
    typical_cost_local NUMERIC(10,2),
    typical_cost_usd NUMERIC(10,2),
    cost_currency CHAR(3),

    -- Quality
    difficulty VARCHAR(20) DEFAULT 'easy',
    safety_rating NUMERIC(2,1),
    scenic_rating NUMERIC(2,1),

    -- Seasonal availability
    seasonal BOOLEAN DEFAULT FALSE,
    available_months INTEGER[] DEFAULT ARRAY[1,2,3,4,5,6,7,8,9,10,11,12],
    seasonal_notes TEXT,

    -- Schedule
    frequency VARCHAR(50),
    first_departure TIME,
    last_departure TIME,

    -- Useful info
    description TEXT,
    warnings TEXT,
    tips TEXT,

    -- Navigation deep-link (auto-built from node coords)
    gmaps_deeplink TEXT,

    -- Bidirectional
    is_bidirectional BOOLEAN DEFAULT TRUE,
    reverse_edge_id INTEGER REFERENCES transport_edges(id) ON DELETE SET NULL,

    -- Provenance
    data_source VARCHAR(50) DEFAULT 'system',
    created_by_provider_id INTEGER REFERENCES providers(id) ON DELETE SET NULL,
    created_by_user_id VARCHAR(128),
    verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,

    -- Stats
    times_used INTEGER DEFAULT 0,
    avg_rating NUMERIC(2,1),

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(source_node_id, target_node_id, transport_type)
);

CREATE INDEX IF NOT EXISTS idx_te_geometry ON transport_edges USING GIST (geometry);
CREATE INDEX IF NOT EXISTS idx_te_source   ON transport_edges (source_node_id);
CREATE INDEX IF NOT EXISTS idx_te_target   ON transport_edges (target_node_id);
CREATE INDEX IF NOT EXISTS idx_te_type     ON transport_edges (transport_type);

-- ============================================
-- TRIGGER: Auto-compute edge geometry + distance + gmaps link
-- ============================================
CREATE OR REPLACE FUNCTION compute_edge_geometry()
RETURNS TRIGGER AS $$
DECLARE
    src_loc GEOMETRY;
    tgt_loc GEOMETRY;
BEGIN
    SELECT location INTO src_loc FROM transport_nodes WHERE id = NEW.source_node_id;
    SELECT location INTO tgt_loc FROM transport_nodes WHERE id = NEW.target_node_id;

    IF src_loc IS NOT NULL AND tgt_loc IS NOT NULL THEN
        NEW.geometry := ST_MakeLine(src_loc, tgt_loc);
        NEW.distance_km := ROUND((ST_Distance(src_loc::geography, tgt_loc::geography) / 1000.0)::numeric, 2);
        NEW.gmaps_deeplink := 'https://www.google.com/maps/dir/' ||
            ST_Y(src_loc) || ',' || ST_X(src_loc) || '/' ||
            ST_Y(tgt_loc) || ',' || ST_X(tgt_loc);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_edge_geometry
    BEFORE INSERT OR UPDATE OF source_node_id, target_node_id
    ON transport_edges
    FOR EACH ROW
    EXECUTE FUNCTION compute_edge_geometry();

-- ============================================
-- TRIGGER: Update node connection_count
-- ============================================
CREATE OR REPLACE FUNCTION update_node_connection_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE transport_nodes SET connection_count = (
            SELECT COUNT(*) FROM transport_edges
            WHERE source_node_id = NEW.source_node_id OR target_node_id = NEW.source_node_id
        ) WHERE id = NEW.source_node_id;
        UPDATE transport_nodes SET connection_count = (
            SELECT COUNT(*) FROM transport_edges
            WHERE source_node_id = NEW.target_node_id OR target_node_id = NEW.target_node_id
        ) WHERE id = NEW.target_node_id;
    END IF;
    IF TG_OP = 'DELETE' THEN
        UPDATE transport_nodes SET connection_count = (
            SELECT COUNT(*) FROM transport_edges
            WHERE source_node_id = OLD.source_node_id OR target_node_id = OLD.source_node_id
        ) WHERE id = OLD.source_node_id;
        UPDATE transport_nodes SET connection_count = (
            SELECT COUNT(*) FROM transport_edges
            WHERE source_node_id = OLD.target_node_id OR target_node_id = OLD.target_node_id
        ) WHERE id = OLD.target_node_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_node_connections
    AFTER INSERT OR UPDATE OR DELETE ON transport_edges
    FOR EACH ROW
    EXECUTE FUNCTION update_node_connection_count();

-- ============================================
-- 3. TRANSPORT CORRIDORS  (multi-hop journeys)
-- ============================================
CREATE TABLE IF NOT EXISTS transport_corridors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,

    origin_node_id INTEGER NOT NULL REFERENCES transport_nodes(id) ON DELETE CASCADE,
    destination_node_id INTEGER NOT NULL REFERENCES transport_nodes(id) ON DELETE CASCADE,
    country_codes CHAR(2)[] DEFAULT '{}',

    total_distance_km NUMERIC(8,2),
    total_duration_minutes INTEGER,
    total_cost_usd NUMERIC(10,2),

    corridor_type VARCHAR(50) DEFAULT 'overland',
    difficulty VARCHAR(20) DEFAULT 'easy',

    data_source VARCHAR(50) DEFAULT 'system',
    created_by_provider_id INTEGER REFERENCES providers(id) ON DELETE SET NULL,
    created_by_user_id VARCHAR(128),

    popularity_score NUMERIC(5,2) DEFAULT 0,
    times_used INTEGER DEFAULT 0,

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tc_origin ON transport_corridors (origin_node_id);
CREATE INDEX IF NOT EXISTS idx_tc_dest   ON transport_corridors (destination_node_id);

-- ============================================
-- 4. CORRIDOR EDGES  (junction table)
-- ============================================
CREATE TABLE IF NOT EXISTS corridor_edges (
    id SERIAL PRIMARY KEY,
    corridor_id INTEGER NOT NULL REFERENCES transport_corridors(id) ON DELETE CASCADE,
    edge_id INTEGER NOT NULL REFERENCES transport_edges(id) ON DELETE CASCADE,
    sequence_order INTEGER NOT NULL,
    waypoint_node_id INTEGER REFERENCES transport_nodes(id) ON DELETE SET NULL,
    wait_minutes INTEGER DEFAULT 0,
    notes TEXT,
    UNIQUE(corridor_id, sequence_order)
);

CREATE INDEX IF NOT EXISTS idx_ce_corridor ON corridor_edges (corridor_id);

-- ============================================
-- 5. SERVICE PATTERNS  (who operates what)
-- ============================================
CREATE TABLE IF NOT EXISTS service_patterns (
    id SERIAL PRIMARY KEY,
    edge_id INTEGER NOT NULL REFERENCES transport_edges(id) ON DELETE CASCADE,

    operator_name VARCHAR(255) NOT NULL,
    operator_type VARCHAR(50),
    provider_id INTEGER REFERENCES providers(id) ON DELETE SET NULL,

    days_of_week INTEGER[] DEFAULT ARRAY[0,1,2,3,4,5,6],
    departure_times TIME[],
    frequency_minutes INTEGER,

    price_local NUMERIC(10,2),
    price_usd NUMERIC(10,2),
    currency CHAR(3),
    price_notes TEXT,

    vehicle_type VARCHAR(100),
    capacity INTEGER,
    booking_required BOOLEAN DEFAULT FALSE,
    booking_url TEXT,
    booking_notes TEXT,

    pickup_zone GEOMETRY(Polygon, 4326),
    pickup_notes TEXT,

    comfort_rating NUMERIC(2,1),
    reliability_rating NUMERIC(2,1),

    seasonal BOOLEAN DEFAULT FALSE,
    available_months INTEGER[] DEFAULT ARRAY[1,2,3,4,5,6,7,8,9,10,11,12],

    verified BOOLEAN DEFAULT FALSE,
    last_verified_at TIMESTAMPTZ,
    last_price_update TIMESTAMPTZ,

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sp_edge ON service_patterns (edge_id);
CREATE INDEX IF NOT EXISTS idx_sp_pickup ON service_patterns USING GIST (pickup_zone) WHERE pickup_zone IS NOT NULL;

-- ============================================
-- 6. ROUTE SKELETONS  (traveller-facing routes)
-- ============================================
CREATE TABLE IF NOT EXISTS route_skeletons (
    id SERIAL PRIMARY KEY,
    route_template_id INTEGER REFERENCES route_templates(id) ON DELETE SET NULL,

    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,

    country_codes CHAR(2)[] DEFAULT '{}',
    duration_days INTEGER,
    total_distance_km NUMERIC(8,2),
    total_cost_usd NUMERIC(10,2),
    difficulty VARCHAR(20) DEFAULT 'easy',

    created_by_provider_id INTEGER REFERENCES providers(id) ON DELETE SET NULL,
    created_by_user_id VARCHAR(128),

    is_published BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,

    times_used INTEGER DEFAULT 0,
    avg_rating NUMERIC(2,1),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. SKELETON WAYPOINTS  (stops along a skeleton)
-- ============================================
CREATE TABLE IF NOT EXISTS skeleton_waypoints (
    id SERIAL PRIMARY KEY,
    skeleton_id INTEGER NOT NULL REFERENCES route_skeletons(id) ON DELETE CASCADE,
    sequence_order INTEGER NOT NULL,

    waypoint_type VARCHAR(30) NOT NULL DEFAULT 'hub',
    node_id INTEGER REFERENCES transport_nodes(id) ON DELETE SET NULL,
    place_id INTEGER REFERENCES places(id) ON DELETE SET NULL,

    name VARCHAR(255),
    location GEOMETRY(Point, 4326) NOT NULL,

    overnight BOOLEAN DEFAULT FALSE,
    stay_nights INTEGER DEFAULT 0,
    day_number INTEGER,

    arrival_edge_id INTEGER REFERENCES transport_edges(id) ON DELETE SET NULL,
    arrival_corridor_id INTEGER REFERENCES transport_corridors(id) ON DELETE SET NULL,

    description TEXT,
    tips TEXT,

    UNIQUE(skeleton_id, sequence_order)
);

CREATE INDEX IF NOT EXISTS idx_sw_skeleton ON skeleton_waypoints (skeleton_id);
CREATE INDEX IF NOT EXISTS idx_sw_location ON skeleton_waypoints USING GIST (location);

-- ============================================
-- HELPER: Slug generator
-- ============================================
CREATE OR REPLACE FUNCTION generate_slug(input TEXT) RETURNS TEXT AS $$
BEGIN
    RETURN lower(regexp_replace(regexp_replace(input, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'));
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- USEFUL SPATIAL VIEWS
-- ============================================

-- Nodes with lat/lng for easy API consumption
CREATE OR REPLACE VIEW v_transport_nodes AS
SELECT
    id, name, name_local, slug, node_type, hierarchy,
    country_code, city, region,
    ST_Y(location) AS latitude,
    ST_X(location) AS longitude,
    description, elevation_m, connection_count, popularity_score,
    facilities, is_active, created_at
FROM transport_nodes;

-- Edges with source/target names and coords
CREATE OR REPLACE VIEW v_transport_edges AS
SELECT
    e.id, e.transport_type, e.distance_km, e.duration_minutes,
    e.typical_cost_usd, e.difficulty, e.safety_rating, e.scenic_rating,
    e.frequency, e.seasonal, e.available_months, e.seasonal_notes,
    e.description, e.warnings, e.tips, e.gmaps_deeplink,
    e.is_bidirectional, e.verified, e.times_used,
    sn.id AS source_id, sn.name AS source_name,
    ST_Y(sn.location) AS source_lat, ST_X(sn.location) AS source_lng,
    tn.id AS target_id, tn.name AS target_name,
    ST_Y(tn.location) AS target_lat, ST_X(tn.location) AS target_lng,
    ST_AsGeoJSON(e.geometry)::json AS geojson
FROM transport_edges e
JOIN transport_nodes sn ON e.source_node_id = sn.id
JOIN transport_nodes tn ON e.target_node_id = tn.id
WHERE e.is_active = TRUE;

-- Node connections summary (for map popups)
CREATE OR REPLACE VIEW v_node_connections AS
SELECT
    n.id AS node_id, n.name AS node_name, n.hierarchy,
    COUNT(e.id) AS total_connections,
    jsonb_agg(jsonb_build_object(
        'edge_id', e.id,
        'target_id', CASE WHEN e.source_node_id = n.id THEN e.target_node_id ELSE e.source_node_id END,
        'target_name', CASE WHEN e.source_node_id = n.id THEN tn.name ELSE sn.name END,
        'transport', e.transport_type,
        'distance_km', e.distance_km,
        'duration_min', e.duration_minutes,
        'cost_usd', e.typical_cost_usd
    ) ORDER BY e.distance_km) AS connections
FROM transport_nodes n
LEFT JOIN transport_edges e ON (e.source_node_id = n.id OR (e.target_node_id = n.id AND e.is_bidirectional))
LEFT JOIN transport_nodes sn ON e.source_node_id = sn.id
LEFT JOIN transport_nodes tn ON e.target_node_id = tn.id
WHERE n.is_active = TRUE
GROUP BY n.id, n.name, n.hierarchy;
