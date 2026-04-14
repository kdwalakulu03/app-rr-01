import { Router } from 'express';
import { pool } from '../db/index.js';

export const countriesRouter = Router();

// Get all countries (with place data)
countriesRouter.get('/', async (_req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        code,
        name,
        name_local as "nameLocal",
        currency,
        timezone,
        languages,
        flag,
        hero_image as "heroImage",
        description,
        daily_budget_usd as "dailyBudgetUsd",
        marketplace_enabled as "marketplaceEnabled",
        guide_signup_enabled as "guideSignupEnabled",
        booking_payments_enabled as "bookingPaymentsEnabled",
        route_count as "routeCount",
        place_count as "placeCount",
        provider_count as "providerCount"
      FROM countries
      ORDER BY place_count DESC, name
    `);

    res.json({ countries: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get countries that have places data
countriesRouter.get('/with-places', async (_req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        c.code,
        c.name,
        c.flag,
        c.currency,
        c.daily_budget_usd as "dailyBudgetUsd",
        c.place_count as "placeCount",
        c.route_count as "routeCount"
      FROM countries c
      WHERE c.place_count > 0
      ORDER BY c.place_count DESC
    `);

    res.json({ countries: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get countries with routes
countriesRouter.get('/with-routes', async (_req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        c.code,
        c.name,
        c.flag,
        c.currency,
        COUNT(rt.id) as "routeCount"
      FROM countries c
      LEFT JOIN route_templates rt ON rt.country_code = c.code AND rt.is_published = true
      GROUP BY c.code, c.name, c.flag, c.currency
      HAVING COUNT(rt.id) > 0
      ORDER BY COUNT(rt.id) DESC, c.name
    `);

    res.json({ countries: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get country by code with stats
countriesRouter.get('/:code', async (req, res, next) => {
  try {
    const { code } = req.params;

    const result = await pool.query(`
      SELECT
        c.*,
        (SELECT COUNT(*) FROM places p WHERE p.country_code = c.code AND p.is_active = true) as "placeCount",
        (SELECT COUNT(*) FROM route_templates rt WHERE rt.country_code = c.code AND rt.is_published = true) as "routeCount"
      FROM countries c
      WHERE c.code = $1
    `, [code.toUpperCase()]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Country not found' });
    }

    // Get top cities for this country
    const citiesResult = await pool.query(`
      SELECT city, COUNT(*) as "placeCount"
      FROM places
      WHERE country_code = $1 AND city IS NOT NULL AND is_active = true
      GROUP BY city
      ORDER BY COUNT(*) DESC
      LIMIT 20
    `, [code.toUpperCase()]);

    // Get category breakdown
    const categoriesResult = await pool.query(`
      SELECT main_category as "mainCategory", COUNT(*) as count
      FROM places
      WHERE country_code = $1 AND is_active = true
      GROUP BY main_category
      ORDER BY count DESC
    `, [code.toUpperCase()]);

    res.json({
      country: result.rows[0],
      cities: citiesResult.rows,
      categories: categoriesResult.rows,
    });
  } catch (error) {
    next(error);
  }
});
