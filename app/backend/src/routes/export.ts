// ─── Trip export routes — PDF itinerary generation ───
import { Router } from 'express';
import PDFDocument from 'pdfkit';
import { pool } from '../db/index.js';
import { AppError } from '../middleware/errorHandler.js';

export const exportRouter = Router();

// Country code → emoji flag
function countryFlag(code: string): string {
  if (!code || code.length !== 2) return '';
  const base = 0x1f1e6;
  const upper = code.toUpperCase();
  return String.fromCodePoint(base + upper.charCodeAt(0) - 65, base + upper.charCodeAt(1) - 65);
}

function formatDate(d: string | Date | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(t: string | null): string {
  if (!t) return '';
  // Handle HH:MM:SS or HH:MM format
  const parts = t.split(':');
  if (parts.length < 2) return t;
  const h = parseInt(parts[0]);
  const m = parts[1];
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m} ${ampm}`;
}

// GET /api/trips/:id/export/pdf
exportRouter.get('/:id/export/pdf', async (req, res, next) => {
  try {
    const userId = req.user!.uid;
    const { id } = req.params;

    // Fetch trip
    const tripResult = await pool.query(`
      SELECT 
        t.id, t.name, t.start_date, t.end_date, t.country_code,
        t.cities, t.group_type, t.travelers, t.pace, t.budget_level,
        t.interests, t.total_spent, t.status,
        rt.name as route_name
      FROM trips t
      LEFT JOIN route_versions rv ON rv.id = t.route_version_id
      LEFT JOIN route_templates rt ON rt.id = rv.route_template_id
      WHERE t.id = $1 AND t.user_id = $2
    `, [id, userId]);

    if (tripResult.rows.length === 0) {
      throw new AppError('Trip not found', 404, 'NOT_FOUND');
    }

    const trip = tripResult.rows[0];

    // Fetch days
    const daysResult = await pool.query(`
      SELECT id, day_number, date, city, status, notes
      FROM trip_days
      WHERE trip_id = $1
      ORDER BY day_number
    `, [id]);

    // Fetch activities
    const activitiesResult = await pool.query(`
      SELECT 
        trip_day_id, day_number, sequence_order, name, description,
        category, planned_start_time, planned_duration_minutes,
        place_name, estimated_cost, actual_cost, status, notes
      FROM trip_activities
      WHERE trip_id = $1
      ORDER BY day_number, sequence_order
    `, [id]);

    // Group activities by day
    const activitiesByDay: Record<number, any[]> = {};
    for (const act of activitiesResult.rows) {
      const dayId = act.trip_day_id;
      if (!activitiesByDay[dayId]) activitiesByDay[dayId] = [];
      activitiesByDay[dayId].push(act);
    }

    // Fetch expenses
    const expensesResult = await pool.query(`
      SELECT data
      FROM trip_logs
      WHERE trip_id = $1 AND event_type = 'expense_logged'
      ORDER BY "timestamp" DESC
    `, [id]);

    const totalExpenses = expensesResult.rows.reduce((sum, r) => sum + (r.data?.amount || 0), 0);

    // ─── Build PDF ───
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 60, bottom: 60, left: 50, right: 50 },
      info: {
        Title: trip.name || 'Trip Itinerary',
        Author: 'RoamRicher',
        Subject: 'Travel Itinerary',
      },
    });

    // Set response headers
    const safeName = (trip.name || 'itinerary').replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.pdf"`);
    doc.pipe(res);

    const pageWidth = 495; // A4 width minus margins
    const accentColor = '#2563eb'; // primary-600

    // ── Title page ──
    doc.rect(0, 0, 595.28, 120).fill(accentColor);
    doc.fill('#ffffff')
      .fontSize(28)
      .text(trip.name || 'Trip Itinerary', 50, 45, { width: pageWidth });

    doc.fill('#dbeafe')
      .fontSize(11)
      .text('Powered by RoamRicher', 50, 82);

    // Meta block
    let y = 140;

    doc.fill('#374151').fontSize(10);

    const flag = countryFlag(trip.country_code);
    const metaLines: string[] = [];
    if (trip.start_date && trip.end_date) {
      metaLines.push(`${formatDate(trip.start_date)} — ${formatDate(trip.end_date)}`);
    }
    if (trip.country_code) metaLines.push(`${flag} ${trip.country_code.toUpperCase()}`);
    if (trip.cities?.length) metaLines.push(`Cities: ${trip.cities.join(', ')}`);
    if (trip.group_type) metaLines.push(`Group: ${trip.group_type} · ${trip.travelers || 1} traveler(s)`);
    if (trip.pace) metaLines.push(`Pace: ${trip.pace}`);
    if (trip.budget_level) metaLines.push(`Budget: ${trip.budget_level}`);
    if (trip.route_name) metaLines.push(`Route: ${trip.route_name}`);

    for (const line of metaLines) {
      doc.text(line, 50, y);
      y += 15;
    }

    y += 10;

    // Summary stats
    if (totalExpenses > 0 || trip.total_spent) {
      doc.fill(accentColor).fontSize(12).text('Summary', 50, y);
      y += 18;
      doc.fill('#374151').fontSize(10);
      const spent = totalExpenses || parseFloat(trip.total_spent) || 0;
      if (spent > 0) {
        doc.text(`Total Spent: $${spent.toFixed(2)}`, 50, y);
        y += 15;
      }
      doc.text(`Days: ${daysResult.rows.length}`, 50, y);
      y += 15;
      doc.text(`Activities: ${activitiesResult.rows.length}`, 50, y);
      y += 25;
    }

    // ── Day-by-day itinerary ──
    for (const day of daysResult.rows) {
      const activities = activitiesByDay[day.id] || [];

      // Check if we need a new page
      if (y > 680) {
        doc.addPage();
        y = 60;
      }

      // Day header
      doc.rect(50, y, pageWidth, 28).fill('#f3f4f6');
      doc.fill(accentColor)
        .fontSize(13)
        .text(
          `Day ${day.day_number}${day.city ? ` — ${day.city}` : ''}`,
          58, y + 7,
          { width: pageWidth - 16 }
        );

      const dateStr = formatDate(day.date);
      doc.fill('#6b7280').fontSize(8)
        .text(dateStr, 50, y + 10, { width: pageWidth - 8, align: 'right' });

      y += 36;

      if (day.notes) {
        doc.fill('#6b7280').fontSize(9).text(day.notes, 58, y, { width: pageWidth - 16 });
        y += doc.heightOfString(day.notes, { width: pageWidth - 16 }) + 8;
      }

      // Activities
      for (const act of activities) {
        if (y > 720) {
          doc.addPage();
          y = 60;
        }

        const timeStr = formatTime(act.planned_start_time);
        const durStr = act.planned_duration_minutes ? `${act.planned_duration_minutes} min` : '';

        // Activity row
        doc.fill('#1f2937').fontSize(10)
          .text(`${timeStr ? timeStr + '  ' : ''}${act.name}`, 66, y, { width: pageWidth - 100 });

        // Category + duration on right
        const rightInfo = [act.category, durStr].filter(Boolean).join(' · ');
        if (rightInfo) {
          doc.fill('#9ca3af').fontSize(8)
            .text(rightInfo, 50, y + 2, { width: pageWidth - 8, align: 'right' });
        }
        y += 16;

        // Place & cost
        const detailParts: string[] = [];
        if (act.place_name) detailParts.push(act.place_name);
        const cost = act.actual_cost || act.estimated_cost;
        if (cost) detailParts.push(`$${parseFloat(cost).toFixed(2)}`);
        if (act.status && act.status !== 'planned') detailParts.push(`[${act.status}]`);

        if (detailParts.length > 0) {
          doc.fill('#6b7280').fontSize(8)
            .text(detailParts.join(' · '), 74, y, { width: pageWidth - 32 });
          y += 12;
        }

        if (act.description) {
          doc.fill('#6b7280').fontSize(8)
            .text(act.description, 74, y, { width: pageWidth - 32 });
          y += doc.heightOfString(act.description, { width: pageWidth - 32 }) + 4;
        }

        y += 6;
      }

      if (activities.length === 0) {
        doc.fill('#9ca3af').fontSize(9).text('No activities planned', 66, y);
        y += 20;
      }

      y += 12;
    }

    // ── Expenses appendix ──
    if (expensesResult.rows.length > 0) {
      doc.addPage();
      y = 60;

      doc.fill(accentColor).fontSize(16).text('Expense Log', 50, y);
      y += 28;

      // Table header
      doc.fill('#6b7280').fontSize(8);
      doc.text('Description', 50, y, { width: 200 });
      doc.text('Category', 250, y, { width: 100 });
      doc.text('Amount', 370, y, { width: 125, align: 'right' });
      y += 14;

      doc.moveTo(50, y).lineTo(545, y).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
      y += 6;

      for (const row of expensesResult.rows) {
        if (y > 740) {
          doc.addPage();
          y = 60;
        }
        const d = row.data || {};
        doc.fill('#374151').fontSize(9);
        doc.text(d.description || '—', 50, y, { width: 200 });
        doc.text(d.category || '—', 250, y, { width: 100 });
        doc.text(`$${(d.amount || 0).toFixed(2)}`, 370, y, { width: 125, align: 'right' });
        y += 15;
      }

      // Total
      y += 4;
      doc.moveTo(50, y).lineTo(545, y).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
      y += 8;
      doc.fill(accentColor).fontSize(10)
        .text(`Total: $${totalExpenses.toFixed(2)}`, 370, y, { width: 125, align: 'right' });
    }

    // ── Footer on every page ──
    const pages = doc.bufferedPageRange();
    for (let i = pages.start; i < pages.start + pages.count; i++) {
      doc.switchToPage(i);
      doc.fill('#9ca3af').fontSize(7)
        .text(
          `Generated by RoamRicher · roamricher.com · Page ${i + 1} of ${pages.count}`,
          50, 780,
          { width: pageWidth, align: 'center' }
        );
    }

    doc.end();
  } catch (error) {
    next(error);
  }
});
