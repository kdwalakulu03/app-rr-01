import { Router } from 'express';
import { pool } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';

export const spatialRouter = Router();

// ── Helper: snake_case → camelCase ──────────────────
function camelise(row: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(row)) {
    const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    out[camel] = value;
  }
  return out;
}
function cameliseRows(rows: any[]): any[] {
  return rows.map(camelise);
}

// =====================================================
// GET /api/spatial/nodes — List transport nodes
// =====================================================
// Query params: country, hierarchy, type, search, lat, lng, radius
spatialRouter.get('/nodes', async (req, res, next) => {
  try {
    const {
      country,
      hierarchy,
      type,
      search,
      lat,
      lng,
      radius = 50000, // 50km default
      limit = 100,
      offset = 0,
    } = req.query;

    const conditions: string[] = ['n.is_active = TRUE'];
    const params: any[] = [];
    let paramIdx = 1;

    if (country) {
      conditions.push(`n.country_code = $${paramIdx++}`);
      params.push(country);
    }
    if (hierarchy) {
      conditions.push(`n.hierarchy = $${paramIdx++}`);
      params.push(hierarchy);
    }
    if (type) {
      conditions.push(`n.node_type = $${paramIdx++}`);
      params.push(type);
    }
    if (search) {
      conditions.push(`(n.name ILIKE $${paramIdx} OR n.city ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }
    if (lat && lng) {
      conditions.push(
        `ST_DWithin(n.location::geography, ST_SetSRID(ST_MakePoint($${paramIdx}, $${paramIdx + 1}), 4326)::geography, $${paramIdx + 2})`
      );
      params.push(Number(lng), Number(lat), Number(radius));
      paramIdx += 3;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(`
      SELECT
        n.id, n.name, n.name_local, n.slug, n.node_type, n.hierarchy,
        n.country_code, n.city, n.region,
        ST_Y(n.location) AS latitude,
        ST_X(n.location) AS longitude,
        n.description, n.elevation_m, n.connection_count, n.popularity_score,
        n.facilities, n.operating_hours,
        n.created_at
      FROM transport_nodes n
      ${where}
      ORDER BY n.connection_count DESC, n.name
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}
    `, [...params, Number(limit), Number(offset)]);

    res.json({
      nodes: cameliseRows(result.rows),
      count: result.rows.length,
    });
  } catch (error) {
    next(error);
  }
});

// =====================================================
// GET /api/spatial/nodes/:id — Single node with connections
// =====================================================
spatialRouter.get('/nodes/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get node
    const nodeResult = await pool.query(`
      SELECT
        n.id, n.name, n.name_local, n.slug, n.node_type, n.hierarchy,
        n.country_code, n.city, n.region,
        ST_Y(n.location) AS latitude,
        ST_X(n.location) AS longitude,
        n.description, n.elevation_m, n.connection_count,
        n.facilities, n.operating_hours, n.contact,
        n.created_at
      FROM transport_nodes n
      WHERE n.id = $1
    `, [id]);

    if (nodeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Node not found' });
    }

    // Get outbound connections (edges FROM this node)
    const edgesResult = await pool.query(`
      SELECT
        e.id AS edge_id,
        e.transport_type,
        e.distance_km,
        e.duration_minutes,
        e.typical_cost_usd,
        e.cost_currency,
        e.frequency,
        e.difficulty,
        e.safety_rating,
        e.scenic_rating,
        e.seasonal,
        e.available_months,
        e.seasonal_notes,
        e.description,
        e.warnings,
        e.tips,
        e.gmaps_deeplink,
        e.is_bidirectional,
        e.verified,
        tn.id AS target_id,
        tn.name AS target_name,
        tn.hierarchy AS target_hierarchy,
        tn.node_type AS target_type,
        ST_Y(tn.location) AS target_lat,
        ST_X(tn.location) AS target_lng
      FROM transport_edges e
      JOIN transport_nodes tn ON e.target_node_id = tn.id
      WHERE e.source_node_id = $1 AND e.is_active = TRUE
      ORDER BY e.distance_km
    `, [id]);

    // Also get inbound edges where bidirectional
    const inboundResult = await pool.query(`
      SELECT
        e.id AS edge_id,
        e.transport_type,
        e.distance_km,
        e.duration_minutes,
        e.typical_cost_usd,
        e.cost_currency,
        e.frequency,
        e.difficulty,
        e.safety_rating,
        e.scenic_rating,
        e.seasonal,
        e.available_months,
        e.seasonal_notes,
        e.description,
        e.warnings,
        e.tips,
        e.gmaps_deeplink,
        e.is_bidirectional,
        e.verified,
        sn.id AS target_id,
        sn.name AS target_name,
        sn.hierarchy AS target_hierarchy,
        sn.node_type AS target_type,
        ST_Y(sn.location) AS target_lat,
        ST_X(sn.location) AS target_lng
      FROM transport_edges e
      JOIN transport_nodes sn ON e.source_node_id = sn.id
      WHERE e.target_node_id = $1 AND e.is_bidirectional = TRUE AND e.is_active = TRUE
      ORDER BY e.distance_km
    `, [id]);

    // Merge and deduplicate connections
    const allConnections = [...edgesResult.rows, ...inboundResult.rows];

    res.json({
      node: camelise(nodeResult.rows[0]),
      connections: cameliseRows(allConnections),
    });
  } catch (error) {
    next(error);
  }
});

// =====================================================
// GET /api/spatial/network/:countryCode — Full network GeoJSON
// =====================================================
// Returns the complete node + edge network for a country as GeoJSON
// for rendering on MapLibre in one request.
spatialRouter.get('/network/:countryCode', async (req, res, next) => {
  try {
    const { countryCode } = req.params;
    const country = countryCode.toUpperCase();

    // Get all nodes for this country
    const nodesResult = await pool.query(`
      SELECT
        n.id, n.name, n.name_local, n.slug, n.node_type, n.hierarchy,
        n.city, n.connection_count, n.popularity_score,
        ST_Y(n.location) AS latitude,
        ST_X(n.location) AS longitude
      FROM transport_nodes n
      WHERE n.country_code = $1 AND n.is_active = TRUE
      ORDER BY n.connection_count DESC
    `, [country]);

    // Get all edges where both nodes are in this country
    const edgesResult = await pool.query(`
      SELECT
        e.id, e.transport_type, e.distance_km, e.duration_minutes,
        e.typical_cost_usd, e.frequency, e.difficulty,
        e.seasonal, e.is_bidirectional,
        e.description, e.tips, e.gmaps_deeplink,
        sn.id AS source_id, sn.name AS source_name,
        ST_Y(sn.location) AS source_lat, ST_X(sn.location) AS source_lng,
        tn.id AS target_id, tn.name AS target_name,
        ST_Y(tn.location) AS target_lat, ST_X(tn.location) AS target_lng
      FROM transport_edges e
      JOIN transport_nodes sn ON e.source_node_id = sn.id
      JOIN transport_nodes tn ON e.target_node_id = tn.id
      WHERE sn.country_code = $1 AND tn.country_code = $1 AND e.is_active = TRUE
      ORDER BY e.distance_km
    `, [country]);

    // Build GeoJSON FeatureCollection for nodes
    const nodeFeatures = nodesResult.rows.map((n: any) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [n.longitude, n.latitude],
      },
      properties: {
        id: n.id,
        name: n.name,
        nameLocal: n.name_local,
        slug: n.slug,
        nodeType: n.node_type,
        hierarchy: n.hierarchy,
        city: n.city,
        connectionCount: n.connection_count,
        // Visual encoding: size based on hierarchy
        markerSize: n.hierarchy === 'international_hub' ? 20
          : n.hierarchy === 'regional_hub' ? 14
          : n.hierarchy === 'local_hub' ? 10
          : 7,
      },
    }));

    // Build GeoJSON FeatureCollection for edges (as straight lines)
    const edgeFeatures = edgesResult.rows.map((e: any) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'LineString' as const,
        coordinates: [
          [e.source_lng, e.source_lat],
          [e.target_lng, e.target_lat],
        ],
      },
      properties: {
        id: e.id,
        transportType: e.transport_type,
        distanceKm: e.distance_km,
        durationMinutes: e.duration_minutes,
        costUsd: e.typical_cost_usd,
        frequency: e.frequency,
        difficulty: e.difficulty,
        seasonal: e.seasonal,
        bidirectional: e.is_bidirectional,
        sourceName: e.source_name,
        targetName: e.target_name,
        description: e.description,
        tips: e.tips,
        gmapsLink: e.gmaps_deeplink,
      },
    }));

    res.json({
      country: country,
      nodes: {
        type: 'FeatureCollection',
        features: nodeFeatures,
      },
      edges: {
        type: 'FeatureCollection',
        features: edgeFeatures,
      },
      stats: {
        totalNodes: nodesResult.rows.length,
        totalEdges: edgesResult.rows.length,
        hubs: nodesResult.rows.filter((n: any) => n.hierarchy === 'international_hub' || n.hierarchy === 'regional_hub').length,
      },
    });
  } catch (error) {
    next(error);
  }
});

// =====================================================
// GET /api/spatial/edges — List edges with filters
// =====================================================
spatialRouter.get('/edges', async (req, res, next) => {
  try {
    const { country, transport, sourceNode, targetNode, limit = 50, offset = 0 } = req.query;

    const conditions: string[] = ['e.is_active = TRUE'];
    const params: any[] = [];
    let paramIdx = 1;

    if (country) {
      conditions.push(`(sn.country_code = $${paramIdx} OR tn.country_code = $${paramIdx})`);
      params.push(String(country).toUpperCase());
      paramIdx++;
    }
    if (transport) {
      conditions.push(`e.transport_type = $${paramIdx++}`);
      params.push(transport);
    }
    if (sourceNode) {
      conditions.push(`e.source_node_id = $${paramIdx++}`);
      params.push(Number(sourceNode));
    }
    if (targetNode) {
      conditions.push(`e.target_node_id = $${paramIdx++}`);
      params.push(Number(targetNode));
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(`
      SELECT
        e.id, e.transport_type, e.distance_km, e.duration_minutes,
        e.typical_cost_usd, e.cost_currency, e.frequency,
        e.difficulty, e.safety_rating, e.scenic_rating,
        e.seasonal, e.available_months, e.seasonal_notes,
        e.description, e.warnings, e.tips, e.gmaps_deeplink,
        e.is_bidirectional, e.verified,
        sn.id AS source_id, sn.name AS source_name, sn.hierarchy AS source_hierarchy,
        tn.id AS target_id, tn.name AS target_name, tn.hierarchy AS target_hierarchy
      FROM transport_edges e
      JOIN transport_nodes sn ON e.source_node_id = sn.id
      JOIN transport_nodes tn ON e.target_node_id = tn.id
      ${where}
      ORDER BY e.distance_km
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}
    `, [...params, Number(limit), Number(offset)]);

    res.json({
      edges: cameliseRows(result.rows),
      count: result.rows.length,
    });
  } catch (error) {
    next(error);
  }
});

// =====================================================
// GET /api/spatial/reachable/:nodeId — Reachable nodes
// =====================================================
// BFS through hub graph: "What can I reach from Bangkok in under 5 hours?"
spatialRouter.get('/reachable/:nodeId', async (req, res, next) => {
  try {
    const { nodeId } = req.params;
    const maxMinutes = Number(req.query.maxMinutes || 300); // 5 hours default
    const maxHops = Number(req.query.maxHops || 3);

    // Recursive CTE for BFS through the transport graph
    const result = await pool.query(`
      WITH RECURSIVE reachable AS (
        -- Base: direct connections from source node
        SELECT
          e.target_node_id AS node_id,
          e.duration_minutes AS total_minutes,
          e.distance_km::numeric AS total_km,
          e.typical_cost_usd::numeric AS total_cost,
          1 AS hops,
          ARRAY[e.source_node_id, e.target_node_id] AS path,
          ARRAY[e.transport_type::text] AS transport_types
        FROM transport_edges e
        WHERE e.source_node_id = $1 AND e.is_active = TRUE
          AND e.duration_minutes <= $2

        UNION ALL

        -- Recursive: from each reached node, find next hops
        SELECT
          e.target_node_id,
          r.total_minutes + e.duration_minutes,
          r.total_km + e.distance_km::numeric,
          r.total_cost + COALESCE(e.typical_cost_usd::numeric, 0),
          r.hops + 1,
          r.path || e.target_node_id,
          r.transport_types || e.transport_type::text
        FROM reachable r
        JOIN transport_edges e ON e.source_node_id = r.node_id AND e.is_active = TRUE
        WHERE r.hops < $3
          AND r.total_minutes + e.duration_minutes <= $2
          AND NOT (e.target_node_id = ANY(r.path))  -- prevent cycles
      )
      SELECT DISTINCT ON (r.node_id)
        r.node_id,
        n.name,
        n.hierarchy,
        n.node_type,
        ST_Y(n.location) AS latitude,
        ST_X(n.location) AS longitude,
        r.total_minutes,
        r.total_km,
        r.total_cost,
        r.hops,
        r.transport_types
      FROM reachable r
      JOIN transport_nodes n ON r.node_id = n.id
      ORDER BY r.node_id, r.total_minutes
    `, [Number(nodeId), maxMinutes, maxHops]);

    // Also include bidirectional edges (can reach via inbound edges)
    const biResult = await pool.query(`
      WITH RECURSIVE reachable AS (
        SELECT
          e.source_node_id AS node_id,
          e.duration_minutes AS total_minutes,
          e.distance_km::numeric AS total_km,
          e.typical_cost_usd::numeric AS total_cost,
          1 AS hops,
          ARRAY[$1::int, e.source_node_id] AS path,
          ARRAY[e.transport_type::text] AS transport_types
        FROM transport_edges e
        WHERE e.target_node_id = $1 AND e.is_bidirectional = TRUE AND e.is_active = TRUE
          AND e.duration_minutes <= $2

        UNION ALL

        Select
          e.source_node_id,
          r.total_minutes + e.duration_minutes,
          r.total_km + e.distance_km::numeric,
          r.total_cost + COALESCE(e.typical_cost_usd::numeric, 0),
          r.hops + 1,
          r.path || e.source_node_id,
          r.transport_types || e.transport_type::text
        FROM reachable r
        JOIN transport_edges e ON e.target_node_id = r.node_id AND e.is_bidirectional = TRUE AND e.is_active = TRUE
        WHERE r.hops < $3
          AND r.total_minutes + e.duration_minutes <= $2
          AND NOT (e.source_node_id = ANY(r.path))
      )
      SELECT DISTINCT ON (r.node_id)
        r.node_id,
        n.name,
        n.hierarchy,
        n.node_type,
        ST_Y(n.location) AS latitude,
        ST_X(n.location) AS longitude,
        r.total_minutes,
        r.total_km,
        r.total_cost,
        r.hops,
        r.transport_types
      FROM reachable r
      JOIN transport_nodes n ON r.node_id = n.id
      WHERE r.node_id != $1
      ORDER BY r.node_id, r.total_minutes
    `, [Number(nodeId), maxMinutes, maxHops]);

    // Merge, keeping shortest time for each node
    const nodeMap = new Map<number, any>();
    for (const row of [...result.rows, ...biResult.rows]) {
      const existing = nodeMap.get(row.node_id);
      if (!existing || row.total_minutes < existing.total_minutes) {
        nodeMap.set(row.node_id, row);
      }
    }

    const reachable = Array.from(nodeMap.values()).sort((a, b) => a.total_minutes - b.total_minutes);

    res.json({
      fromNodeId: Number(nodeId),
      maxMinutes,
      maxHops,
      reachable: cameliseRows(reachable),
      count: reachable.length,
    });
  } catch (error) {
    next(error);
  }
});

// =====================================================
// POST /api/spatial/nodes — Create a new transport node
// =====================================================
// Used by providers and power users to add hubs to the network.
spatialRouter.post('/nodes', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user?.uid;
    const {
      name, nameLocal, latitude, longitude, countryCode,
      city, region, nodeType, hierarchy, description,
      timezone, operatingHours, facilities,
    } = req.body;

    if (!name || !latitude || !longitude || !countryCode) {
      return res.status(400).json({ error: 'name, latitude, longitude, countryCode required' });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');

    const result = await pool.query(`
      INSERT INTO transport_nodes
        (name, name_local, slug, location, country_code, city, region,
         node_type, hierarchy, description, timezone, operating_hours, facilities,
         created_by_user_id)
      VALUES
        ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326), $6, $7, $8,
         $9, $10, $11, $12, $13, $14, $15)
      RETURNING id, name, slug
    `, [
      name, nameLocal || null, slug,
      longitude, latitude, countryCode.toUpperCase(),
      city || null, region || null,
      nodeType || 'city_center', hierarchy || 'local_hub',
      description || null, timezone || null, operatingHours || null,
      facilities ? JSON.stringify(facilities) : '[]',
      userId || null,
    ]);

    res.status(201).json({ node: result.rows[0] });
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Node with that slug already exists' });
    }
    next(error);
  }
});

// =====================================================
// POST /api/spatial/edges — Create a new transport edge
// =====================================================
// Used by providers to add connections between nodes.
spatialRouter.post('/edges', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user?.uid;
    const {
      sourceNodeId, targetNodeId, transportType,
      durationMinutes, typicalCostLocal, typicalCostUsd, costCurrency,
      difficulty, safetyRating, scenicRating,
      seasonal, availableMonths, seasonalNotes,
      frequency, firstDeparture, lastDeparture,
      description, warnings, tips,
      isBidirectional,
    } = req.body;

    if (!sourceNodeId || !targetNodeId || !transportType) {
      return res.status(400).json({ error: 'sourceNodeId, targetNodeId, transportType required' });
    }

    const result = await pool.query(`
      INSERT INTO transport_edges
        (source_node_id, target_node_id, transport_type,
         duration_minutes, typical_cost_local, typical_cost_usd, cost_currency,
         difficulty, safety_rating, scenic_rating,
         seasonal, available_months, seasonal_notes,
         frequency, first_departure, last_departure,
         description, warnings, tips,
         is_bidirectional, created_by_user_id, data_source)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, 'provider')
      RETURNING id, source_node_id, target_node_id, transport_type, distance_km, gmaps_deeplink
    `, [
      sourceNodeId, targetNodeId, transportType,
      durationMinutes || null, typicalCostLocal || null, typicalCostUsd || null, costCurrency || null,
      difficulty || 'easy', safetyRating || null, scenicRating || null,
      seasonal || false, availableMonths || [1,2,3,4,5,6,7,8,9,10,11,12], seasonalNotes || null,
      frequency || null, firstDeparture || null, lastDeparture || null,
      description || null, warnings || null, tips || null,
      isBidirectional !== false, userId || null,
    ]);

    res.status(201).json({ edge: result.rows[0] });
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Edge already exists for this source/target/transport combination' });
    }
    next(error);
  }
});
