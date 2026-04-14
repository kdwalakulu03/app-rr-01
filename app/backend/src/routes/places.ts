import { Router } from 'express';
import { pool } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';

export const placesRouter = Router();

// List places with filters
placesRouter.get('/', async (req, res, next) => {
  try {
    const {
      country,
      city,
      category,
      subCategory,
      search,
      lat,
      lng,
      radius = 5000,
      minRating,
      limit = 50,
      offset = 0,
    } = req.query;

    let query = `
      SELECT
        id,
        google_place_id as "googlePlaceId",
        name,
        name_en as "nameEn",
        slug,
        latitude,
        longitude,
        country_code as "countryCode",
        country,
        city,
        main_category as "mainCategory",
        sub_category as "subCategory",
        description,
        image_url as "imageUrl",
        rating,
        review_count as "reviewCount",
        price_level as "priceLevel",
        amenities
      FROM places
      WHERE is_active = true
    `;

    const params: unknown[] = [];
    let pi = 1;

    if (country) {
      query += ` AND country_code = $${pi++}`;
      params.push(country);
    }
    if (city) {
      query += ` AND city ILIKE $${pi++}`;
      params.push(`%${city}%`);
    }
    if (category) {
      query += ` AND main_category = $${pi++}`;
      params.push(category);
    }
    if (subCategory) {
      query += ` AND sub_category = $${pi++}`;
      params.push(subCategory);
    }
    if (search) {
      query += ` AND name ILIKE $${pi++}`;
      params.push(`%${search}%`);
    }
    if (minRating) {
      query += ` AND rating >= $${pi++}`;
      params.push(Number(minRating));
    }

    // Spatial query
    if (lat && lng) {
      query += ` AND ST_DWithin(
        location::geography,
        ST_SetSRID(ST_MakePoint($${pi++}, $${pi++}), 4326)::geography,
        $${pi++}
      )`;
      params.push(lng, lat, radius);
    }

    query += ` ORDER BY rating DESC NULLS LAST, review_count DESC`;
    query += ` LIMIT $${pi++} OFFSET $${pi++}`;
    params.push(Number(limit), Number(offset));

    const result = await pool.query(query, params);

    // Get total count (simple)
    let countQuery = 'SELECT COUNT(*) FROM places WHERE is_active = true';
    const countParams: unknown[] = [];
    let ci = 1;
    if (country) {
      countQuery += ` AND country_code = $${ci++}`;
      countParams.push(country);
    }
    if (city) {
      countQuery += ` AND city ILIKE $${ci++}`;
      countParams.push(`%${city}%`);
    }
    if (category) {
      countQuery += ` AND main_category = $${ci++}`;
      countParams.push(category);
    }
    const countResult = await pool.query(countQuery, countParams);

    res.json({
      places: result.rows,
      total: parseInt(countResult.rows[0].count),
      count: result.rows.length,
    });
  } catch (error) {
    next(error);
  }
});

// Get categories for a country
placesRouter.get('/categories', async (req, res, next) => {
  try {
    const { country } = req.query;

    let query = `
      SELECT main_category as "mainCategory",
             sub_category as "subCategory",
             COUNT(*) as count
      FROM places
      WHERE is_active = true
    `;
    const params: unknown[] = [];
    if (country) {
      query += ` AND country_code = $1`;
      params.push(country);
    }
    query += ` GROUP BY main_category, sub_category ORDER BY count DESC`;

    const result = await pool.query(query, params);
    res.json({ categories: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get cities for a country
placesRouter.get('/cities', async (req, res, next) => {
  try {
    const { country } = req.query;

    if (!country) {
      return res.status(400).json({ error: 'country parameter required' });
    }

    const result = await pool.query(`
      SELECT city,
             COUNT(*) as "placeCount",
             ROUND(AVG(rating)::numeric, 1) as "avgRating"
      FROM places
      WHERE country_code = $1 AND is_active = true AND city IS NOT NULL
      GROUP BY city
      ORDER BY COUNT(*) DESC
    `, [country]);

    res.json({ cities: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get place by ID
placesRouter.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT
        id,
        google_place_id as "googlePlaceId",
        name,
        name_en as "nameEn",
        slug,
        latitude,
        longitude,
        country_code as "countryCode",
        country,
        city,
        state_province as "stateProvince",
        district,
        address,
        main_category as "mainCategory",
        sub_category as "subCategory",
        description,
        opening_hours as "openingHours",
        phone,
        website,
        email,
        image_url as "imageUrl",
        photos_json as "photosJson",
        rating,
        review_count as "reviewCount",
        price_level as "priceLevel",
        price,
        price_currency as "priceCurrency",
        amenities,
        source,
        visit_count as "visitCount",
        avg_duration_minutes as "avgDurationMinutes"
      FROM places
      WHERE id = $1 AND is_active = true
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Place not found' });
    }

    res.json({ place: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Get nearby places
placesRouter.get('/:id/nearby', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { radius = 1000, limit = 10 } = req.query;

    const placeResult = await pool.query(
      'SELECT latitude, longitude FROM places WHERE id = $1',
      [id]
    );

    if (placeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Place not found' });
    }

    const { latitude, longitude } = placeResult.rows[0];

    const result = await pool.query(`
      SELECT
        id, name,
        main_category as "mainCategory",
        sub_category as "subCategory",
        latitude, longitude, rating,
        ST_Distance(
          location::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        ) as distance
      FROM places
      WHERE id != $3
        AND is_active = true
        AND ST_DWithin(
          location::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          $4
        )
      ORDER BY distance
      LIMIT $5
    `, [longitude, latitude, id, radius, limit]);

    res.json({ places: result.rows });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// User-contributed place
// ==========================================
placesRouter.post('/user', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user?.uid;
    const {
      name,
      latitude,
      longitude,
      countryCode,
      city,
      mainCategory,
      subCategory,
      description,
      website,
      rating,
      priceLevel,
    } = req.body;

    // Validate required fields
    if (!name || latitude == null || longitude == null || !countryCode || !mainCategory) {
      return res.status(400).json({
        error: 'name, latitude, longitude, countryCode, and mainCategory are required',
      });
    }

    // Generate slug
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const result = await pool.query(
      `INSERT INTO places (
        name, slug, latitude, longitude,
        location,
        country_code, city,
        main_category, sub_category,
        description, website,
        rating, price_level,
        source, search_query, is_active
      ) VALUES (
        $1, $2, $3, $4,
        ST_SetSRID(ST_MakePoint($5, $6), 4326),
        $7, $8,
        $9, $10,
        $11, $12,
        $13, $14,
        'user', $15, true
      )
      RETURNING id, name, slug, latitude, longitude,
        country_code as "countryCode", city,
        main_category as "mainCategory",
        sub_category as "subCategory",
        description, rating, source`,
      [
        name, slug, latitude, longitude,
        longitude, latitude,  // for ST_MakePoint (lng, lat)
        countryCode, city || null,
        mainCategory, subCategory || null,
        description || null, website || null,
        rating || null, priceLevel || null,
        `user:${userId}`,
      ]
    );

    res.status(201).json({ place: result.rows[0] });
  } catch (error) {
    next(error);
  }
});
