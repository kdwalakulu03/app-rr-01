import { Router } from 'express';
import { pool } from '../db/index.js';
import type { RouteTemplate, RouteSearchParams } from '../types/index.js';

export const routesRouter = Router();

// Search/list routes with matching algorithm
routesRouter.get('/', async (req, res, next) => {
  try {
    const {
      country,
      minDays,
      maxDays,
      budgetLevel,
      pace,
      interests,
      tags,
      groupType,
      limit = 20,
      offset = 0,
    } = req.query as RouteSearchParams & { limit?: string; offset?: string };

    let query = `
      SELECT 
        rt.id,
        rt.provider_id as "providerId",
        rt.name,
        rt.slug,
        rt.short_description as "shortDescription",
        rt.country_code as "countryCode",
        rt.country,
        rt.region,
        rt.cities,
        rt.start_city as "startCity",
        rt.end_city as "endCity",
        rt.duration_days as "durationDays",
        rt.budget_level as "budgetLevel",
        rt.estimated_cost_budget as "estimatedCostBudget",
        rt.estimated_cost_moderate as "estimatedCostModerate",
        rt.estimated_cost_luxury as "estimatedCostLuxury",
        rt.currency,
        rt.pace,
        rt.group_types as "groupTypes",
        rt.tags,
        rt.highlights,
        rt.interests,
        rt.cover_image as "coverImage",
        rt.rating,
        rt.review_count as "reviewCount",
        rt.times_used as "timesUsed",
        rt.completion_rate as "completionRate",
        rt.is_featured as "isFeatured",
        rt.is_official as "isOfficial",
        p.name as "providerName",
        p.type as "providerType",
        p.is_verified as "providerVerified"
      FROM route_templates rt
      JOIN providers p ON p.id = rt.provider_id
      WHERE rt.is_published = true
    `;

    const params: unknown[] = [];
    let paramIndex = 1;

    if (country) {
      query += ` AND rt.country_code = $${paramIndex++}`;
      params.push(country);
    }

    if (minDays) {
      query += ` AND rt.duration_days >= $${paramIndex++}`;
      params.push(Number(minDays));
    }

    if (maxDays) {
      query += ` AND rt.duration_days <= $${paramIndex++}`;
      params.push(Number(maxDays));
    }

    if (budgetLevel) {
      query += ` AND rt.budget_level = $${paramIndex++}`;
      params.push(budgetLevel);
    }

    if (pace) {
      query += ` AND rt.pace = $${paramIndex++}`;
      params.push(pace);
    }

    if (tags && Array.isArray(tags) && tags.length > 0) {
      query += ` AND rt.tags && $${paramIndex++}`;
      params.push(tags);
    }

    if (interests && Array.isArray(interests) && interests.length > 0) {
      query += ` AND rt.interests && $${paramIndex++}`;
      params.push(interests);
    }

    if (groupType) {
      query += ` AND $${paramIndex++} = ANY(rt.group_types)`;
      params.push(groupType);
    }

    // Order by featured, rating, times used
    query += ` ORDER BY rt.is_featured DESC, rt.rating DESC, rt.times_used DESC`;
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(Number(limit), Number(offset));

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) FROM route_templates rt
      WHERE rt.is_published = true
    `;
    const countParams: unknown[] = [];
    let countParamIndex = 1;

    if (country) {
      countQuery += ` AND rt.country_code = $${countParamIndex++}`;
      countParams.push(country);
    }

    const countResult = await pool.query(countQuery, countParams);

    res.json({
      routes: result.rows as RouteTemplate[],
      total: parseInt(countResult.rows[0].count),
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (error) {
    next(error);
  }
});

// Get route by slug with full details
routesRouter.get('/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;

    // Get route template
    const routeResult = await pool.query(`
      SELECT 
        rt.*,
        p.name as provider_name,
        p.slug as provider_slug,
        p.type as provider_type,
        p.bio as provider_bio,
        p.avatar_url as provider_avatar,
        p.is_verified as provider_verified
      FROM route_templates rt
      JOIN providers p ON p.id = rt.provider_id
      WHERE rt.slug = $1
    `, [slug]);

    if (routeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Route not found' });
    }

    const route = routeResult.rows[0];

    // Get current version with days and activities
    if (route.current_version_id) {
      const daysResult = await pool.query(`
        SELECT 
          rd.id,
          rd.day_number as "dayNumber",
          rd.title,
          rd.description,
          rd.city,
          rd.overnight_city as "overnightCity",
          rd.accommodation_notes as "accommodationNotes",
          rd.main_transport as "mainTransport",
          rd.transport_notes as "transportNotes"
        FROM route_days rd
        WHERE rd.route_version_id = $1
        ORDER BY rd.day_number
      `, [route.current_version_id]);

      // Get activities for each day
      for (const day of daysResult.rows) {
        const activitiesResult = await pool.query(`
          SELECT 
            ra.id,
            ra.name,
            ra.description,
            ra.category,
            ra.sequence_order as "sequenceOrder",
            ra.start_time as "startTime",
            ra.duration_minutes as "durationMinutes",
            ra.place_name as "placeName",
            ra.latitude,
            ra.longitude,
            ra.notes,
            ra.tips,
            ra.cost_estimate as "costEstimate"
          FROM route_activities ra
          WHERE ra.route_day_id = $1
          ORDER BY ra.sequence_order
        `, [day.id]);

        day.activities = activitiesResult.rows;
      }

      route.days = daysResult.rows;
    }

    // Format response
    const formattedRoute: RouteTemplate = {
      id: route.id,
      providerId: route.provider_id,
      provider: {
        id: route.provider_id,
        name: route.provider_name,
        slug: route.provider_slug,
        type: route.provider_type,
        bio: route.provider_bio,
        avatarUrl: route.provider_avatar,
        isVerified: route.provider_verified,
      },
      name: route.name,
      slug: route.slug,
      shortDescription: route.short_description,
      description: route.description,
      countryCode: route.country_code,
      country: route.country,
      region: route.region,
      cities: route.cities,
      startCity: route.start_city,
      endCity: route.end_city,
      durationDays: route.duration_days,
      budgetLevel: route.budget_level,
      estimatedCostBudget: route.estimated_cost_budget,
      estimatedCostModerate: route.estimated_cost_moderate,
      estimatedCostLuxury: route.estimated_cost_luxury,
      currency: route.currency,
      pace: route.pace,
      groupTypes: route.group_types,
      minTravelers: route.min_travelers,
      maxTravelers: route.max_travelers,
      tags: route.tags,
      highlights: route.highlights,
      interests: route.interests,
      coverImage: route.cover_image,
      images: route.images,
      rating: route.rating,
      reviewCount: route.review_count,
      timesUsed: route.times_used,
      completionRate: route.completion_rate,
      isPublished: route.is_published,
      isFeatured: route.is_featured,
      isOfficial: route.is_official,
      currentVersionId: route.current_version_id,
      publishedAt: route.published_at,
      createdAt: route.created_at,
      updatedAt: route.updated_at,
      days: route.days,
    } as RouteTemplate & { days?: unknown[]; provider?: unknown };

    res.json({ route: formattedRoute });
  } catch (error) {
    next(error);
  }
});

// Get route matching score for user preferences
routesRouter.post('/match', async (req, res, next) => {
  try {
    const {
      country,
      days,
      budget,
      interests = [],
      pace = 'normal',
      groupType = 'solo',
    } = req.body;

    // Get all published routes for the country
    const routesResult = await pool.query(`
      SELECT 
        rt.*,
        p.name as provider_name,
        p.type as provider_type,
        p.is_verified as provider_verified
      FROM route_templates rt
      JOIN providers p ON p.id = rt.provider_id
      WHERE rt.is_published = true
        AND rt.country_code = $1
    `, [country]);

    const routes = routesResult.rows;

    // Calculate match scores
    const scoredRoutes = routes.map(route => {
      let score = 0;
      const reasons: string[] = [];

      // Duration match (0-25 points)
      const durationDiff = Math.abs(route.duration_days - days);
      if (durationDiff === 0) {
        score += 25;
        reasons.push('Perfect duration match');
      } else if (durationDiff <= 1) {
        score += 20;
        reasons.push('Close duration match');
      } else if (durationDiff <= 2) {
        score += 10;
      }

      // Budget match (0-25 points)
      if (route.budget_level === budget) {
        score += 25;
        reasons.push('Budget level match');
      } else if (
        (budget === 'moderate' && route.budget_level !== 'luxury') ||
        (route.budget_level === 'moderate')
      ) {
        score += 15;
      }

      // Pace match (0-15 points)
      if (route.pace === pace) {
        score += 15;
        reasons.push('Pace preference match');
      } else if (
        (pace === 'normal' && route.pace !== 'fast') ||
        (route.pace === 'normal')
      ) {
        score += 8;
      }

      // Interest overlap (0-25 points)
      const routeInterests = route.interests || [];
      const matchedInterests = interests.filter((i: string) => 
        routeInterests.includes(i)
      );
      if (matchedInterests.length > 0) {
        const interestScore = Math.min(25, matchedInterests.length * 8);
        score += interestScore;
        reasons.push(`Matches ${matchedInterests.length} interest(s)`);
      }

      // Group type match (0-10 points)
      if (route.group_types?.includes(groupType)) {
        score += 10;
        reasons.push('Suitable for your group');
      }

      // Bonus for official/featured routes
      if (route.is_official) score += 5;
      if (route.is_featured) score += 3;

      // Bonus for high ratings
      if (route.rating >= 4.5) score += 5;
      else if (route.rating >= 4.0) score += 3;

      return {
        route: {
          id: route.id,
          name: route.name,
          slug: route.slug,
          shortDescription: route.short_description,
          durationDays: route.duration_days,
          budgetLevel: route.budget_level,
          estimatedCostModerate: route.estimated_cost_moderate,
          cities: route.cities,
          tags: route.tags,
          interests: route.interests,
          coverImage: route.cover_image,
          rating: route.rating,
          reviewCount: route.review_count,
          timesUsed: route.times_used,
          providerName: route.provider_name,
          providerType: route.provider_type,
          providerVerified: route.provider_verified,
          isOfficial: route.is_official,
        },
        matchScore: Math.min(100, score),
        matchReasons: reasons,
      };
    });

    // Sort by match score
    scoredRoutes.sort((a, b) => b.matchScore - a.matchScore);

    res.json({
      matches: scoredRoutes.slice(0, 10),
      total: scoredRoutes.length,
    });
  } catch (error) {
    next(error);
  }
});
