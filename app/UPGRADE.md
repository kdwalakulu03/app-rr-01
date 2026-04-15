# RoamRicher — Platform Upgrade Plan

> **Vision:** Transform from an itinerary-maker into a **spatial travel platform** where Mentors draw real routes, Travelers consume them, and Providers serve them.  
> **Architecture principle:** Uber-level layered design — modular, profile-scoped, GIS-first.  
> **Rule:** GIST spatial index on every geometry column from day one.

---

## Phase 1 — Foundation: User Profiles + Modular Architecture

### 1.1 Database: Users & Profiles
- [x] Create `004_users_profiles.sql` — `users` table with `firebase_uid`, `display_name`, `avatar_url`, `active_role` (traveler/provider/mentor), role-specific JSONB metadata, `last_location GEOMETRY(Point,4326)` with GIST index
- [x] Update `migrate.ts` to run ALL migration files sequentially with `_migrations` tracking table (idempotent)
- [x] Run migration, verify tables created ✅ 2026-04-14

### 1.2 Backend: User API Routes
- [x] Create `backend/src/routes/users.ts` — `GET /api/users/me`, `PUT /api/users/profile`, `PUT /api/users/switch-role`, `PUT /api/users/location`
- [x] Add `ensureUser` middleware — auto-upsert user row on first authenticated request
- [x] Wire `/api/users` into `backend/src/index.ts` (with `authMiddleware` + `ensureUser`)
- [x] Rebuild + redeploy backend container ✅ 2026-04-14

### 1.3 Frontend: Restructure Pages into Profile Modules
- [x] Reorganize `frontend/src/pages/`:
  - `pages/shared/` — HomePage, LoginPage, ExplorePage, RoutesPage, RouteDetailPage, MapPage
  - `pages/traveler/` — TripsPage, CreateTripPage, TripDetailPage, TripMapPage, SharedTripPage
  - `pages/provider/` — ProviderDashboard, ProviderRoutes, ProviderBookings, CreateRoute
  - `pages/mentor/` — placeholder index.ts ready for Phase 2
- [x] Update all imports in `App.tsx` + barrel files for each subfolder
- [x] Fix all relative imports (one directory deeper) ✅ 2026-04-14

### 1.4 Frontend: Split API Monolith
- [x] Break `frontend/src/lib/api.ts` (750 lines) into `lib/api/` directory:
  - `lib/api/client.ts` — ApiClient class with token management + all domain methods (backward compat)
  - `lib/api/types.ts` — all TypeScript interfaces (Country, Place, Trip, RouteTemplate, Transport*, etc.)
  - `lib/api/routes.ts` — country + place standalone functions
  - `lib/api/routeTemplates.ts` — route template standalone functions
  - `lib/api/trips.ts` — trip CRUD standalone functions
  - `lib/api/itinerary.ts` — GIS itinerary standalone functions
  - `lib/api/autopilot.ts` — autopilot standalone functions
  - `lib/api/spatial.ts` — transport network standalone functions
  - `lib/api/users.ts` — user profile standalone functions
  - `lib/api/index.ts` — barrel re-exports `api` + all types + namespaced domain modules
- [x] Zero import changes needed — `import { api, Trip } from '../../lib/api'` resolves to barrel ✅ 2026-04-14

### 1.5 Frontend: 3-Role Mode Switcher + Lazy Loading
- [x] Refactor `ModeSwitcher.tsx` to support 3 roles (traveler/provider/mentor) with emerald accent for mentor
- [x] Server-side sync: mode switch fires `PUT /api/users/switch-role` (fire-and-forget)
- [x] Layout.tsx: added `mentorNav` (Home, My Routes, Draw Route, Explore) + conditional nav rendering
- [x] App.tsx: added `/mentor` and `/mentor/canvas` routes with placeholder pages ✅ 2026-04-14
- [ ] Add `React.lazy()` code-splitting per profile group (deferred — works without it)

---

## Phase 2 — Mentor Data Model + Spatial Canvas Core

### 2.1 Database: Mentor Routes Schema
- [x] Create `005_mentor_routes.sql`:
  - `mentor_routes` — creator uid, title, description, country, status (draft/published), `route_geometry GEOMETRY(LineString, 4326)` + GIST index, `bounds GEOMETRY(Polygon, 4326)` + GIST index
  - `mentor_pins` — `location GEOMETRY(Point, 4326)` + GIST index, category (12 types: food/stay/transport/hidden-gem/warning/photo-spot/activity/culture/nature/nightlife/shopping/general), notes, photos[], mentor_route_id FK
  - `mentor_segments` — between-pin road-snapped geometry `GEOMETRY(LineString, 4326)` + GIST index, transport_mode (10 modes), duration, cost, tips
  - `mentor_areas` — `boundary GEOMETRY(Polygon, 4326)` + GIST index, label, notes (explored neighborhoods)
- [x] Run migration ✅ 2026-04-14

### 2.2 Backend: Mentor API + Road-Snapping Service
- [x] Create `backend/src/routes/mentor.ts` (~606 lines):
  - `POST /api/mentor/snap-route` — proxy coordinates to OSRM public API, polyline decode → GeoJSON LineString
  - `POST /api/mentor/routes` — CRUD for mentor routes
  - `POST/PUT/DELETE /api/mentor/routes/:id/pins` — pin CRUD
  - `POST/DELETE /api/mentor/routes/:id/segments` — segment CRUD with road-snapped geometry
  - `POST /api/mentor/routes/:id/publish` — validates 2+ pins, merges geometry via ST_LineMerge/ST_Collect, computes bounds
  - `GET /api/mentor/public` — browse published routes (mounted as public, no auth) with country filter + pagination
- [x] Split public/private routes — `mentorPublicRouter` at `/api/mentor/public`, `mentorRouter` behind auth ✅ 2026-04-14

### 2.3 Frontend: Mentor Spatial Canvas (MVP)
- [x] Create `pages/mentor/MentorCanvas.tsx` — full-screen MapLibre spatial canvas
- [x] **Pin Drop tool** — click map → categorized pin (12 categories, color-coded icons) with property panel
- [x] **Route Draw tool** — click 2+ points → OSRM snap → render road geometry as emerald line
- [x] **Toolbar** — left sidebar: Select/Pin/Route tools + stats + Save button
- [x] **Property Panel** — right sidebar: 3 tabs (Route Info, Pins list, Edit Pin) with title/notes/tips/cost/duration/day#/time fields
- [x] Save draft route + pins + segments to backend
- [x] Stats bar: pin count, total distance, total drive time
- [x] Wired into App.tsx replacing MentorPlaceholder ✅ 2026-04-14

### 2.4 Frontend: Area Draw Tool + Canvas Modularization
- [x] **Area Draw tool** — click-to-place polygon vertices, "Finish Area" button when 3+ vertices
- [x] Area CRUD backend — `POST/PUT/DELETE /api/mentor/routes/:id/areas` with ST_GeomFromGeoJSON Polygon storage
- [x] Render saved areas as fill + outline GeoJSON layers with per-feature color/opacity
- [x] Area draw preview layer (dashed outline + translucent fill while drawing)
- [x] Area vertex markers during drawing (emerald dots)
- [x] Right panel: Areas list tab (fly-to centroid on click) + Area edit tab (label, category, color picker, opacity slider, notes, delete)
- [x] 7 area categories: explored/recommended/avoid/nightlife-zone/food-street/market/other
- [x] Click-to-select areas in Select mode (queryRenderedFeatures)
- [x] Area stats in toolbar + bottom stats bar
- [x] **Modularized MentorCanvas.tsx** — split 1135-line monolith into 13 files (269-line orchestrator + 12 modules):
  - `canvas-types.ts` (49L), `canvas-constants.ts` (39L), `useCanvasApi.ts` (187L)
  - `CanvasToolbar.tsx` (117L), `CanvasMapLayers.tsx` (127L), `CanvasPanel.tsx` (128L)
  - `PanelRouteInfo.tsx` (78L), `PanelPinsList.tsx` (57L), `PanelPinEdit.tsx` (144L)
  - `PanelAreasList.tsx` (62L), `PanelAreaEdit.tsx` (111L)
- [x] All builds clean, deployed ✅ 2026-04-15

---

## Phase 3 — Mentor Publishing + Discovery

### 3.1 Backend: Mentor Route CRUD
- [x] Full endpoints:
  - `POST /api/mentor/routes` — create draft
  - `GET /api/mentor/routes` — list user's routes
  - `PUT /api/mentor/routes/:id` — update
  - `DELETE /api/mentor/routes/:id` — delete draft
  - `POST /api/mentor/routes/:id/publish` — validate spatial legitimacy (geometry connected, pins near route), set status=published
  - `GET /api/mentor/public` — browse all published (with spatial filters)
  - `GET /api/mentor/public/:id` — view single published route (with view_count increment)
  - `GET /api/mentor/routes/:id/geojson` — full GeoJSON FeatureCollection export
- [x] Backend modularized: `mentor/` directory with 9 modules (helpers, snap, routes-crud, pins-crud, segments-crud, areas-crud, geojson, publish, public)

### 3.2 Frontend: Mentor Dashboard
- [x] `pages/mentor/MentorDashboard.tsx` — list of user's routes (draft/published), view counts, stats, publish/edit/delete actions
- [x] `pages/mentor/MentorRouteView.tsx` — public read-only route view with map, pins, areas, segments

### 3.3 Route Discovery Integration
- [x] `RoutesPage` now fetches both editorial routes AND mentor-published routes in unified grid
- [x] Source-type filter tabs: All / Editorial / Mentor Routes
- [x] Mentor route cards show avatar, pin count, view count, fork count, travel style, difficulty
- [x] Mentor cards link to `/mentor/routes/:id` (MentorRouteView)
- [x] Editorial cards show "Editorial" badge, mentor cards show "Mentor Route" badge

### 3.4 "Use This Route" Flow
- [x] `POST /api/mentor/routes/:id/fork` — copies published route's pins, segments, areas into new draft for current user
- [x] `forked_from` column added via migration 006 (tracks attribution)
- [x] "Use This Route" button on MentorRouteView → forks + redirects to canvas
- [x] Increments `fork_count` on original route

---

## Phase 4 — Live Trip Recording + Polish

### 4.1 Live Spatial Recording
- [x] `pages/traveler/LiveRecord.tsx` — fullscreen map with Geolocation API tracking
- [x] `pages/traveler/live/useGeolocation.ts` — custom hook: start/pause/resume/stop, haversine distance, accuracy/speed filters
- [x] `pages/traveler/live/RecordingControls.tsx` — floating stats bar (time, distance, speed, accuracy, points) + start/pause/stop buttons
- [x] `pages/traveler/live/RecordingPinDrop.tsx` — quick category picker overlay (reuses PIN_CATEGORIES from mentor)
- [x] Auto-trace walked path as LineString, allow quick pin drops mid-trip
- [x] Post-recording save panel: title + description → saves as draft mentor route (reuses `saveCanvas()`)
- [x] "Edit in Canvas" / "My Routes" / "Back to Trips" post-save navigation
- [x] Route wired at `/trips/record` (App.tsx), "Record" nav item added for authenticated travelers (Layout.tsx)
- [x] GPS filtering: accuracy >50m rejected, <5m dedup, >720km/h glitch rejection

### 4.2 Itinerary Export
- [x] `GET /api/trips/export/:id/export/pdf` — PDF via pdfkit (server-side, pure JS)
  - A4 layout: accent header, trip meta, day-by-day activities with times/costs/places
  - Expenses appendix with table + total
  - Page footers with branding + page numbers
- [x] `backend/src/routes/export.ts` — dedicated export router mounted at `/api/trips/export`
- [x] PNG export via `html-to-image` (client-side DOM capture, 2× pixel ratio)
- [x] PDF + PNG download buttons on TripDetailPage header (FileDown, ImageDown icons)

### 4.3 Decompose Mega-Components
- [x] Break `TripDetailPage` (1,330 → 623 lines) → `trip-detail/constants.tsx`, `TimelineActivity.tsx`, `AddActivityPanel.tsx`, `AutopilotView.tsx`, `ExpensesView.tsx` (5 sub-modules)
- [x] Break `CreateTripPage` (1,340 → 308 lines) → `create-trip/types.ts`, `WhoStep.tsx`, `CountryStep.tsx`, `CitiesStep.tsx`, `WhenStep.tsx`, `StyleStep.tsx`, `TransportStep.tsx`, `ActivitiesStep.tsx` (8 sub-modules)
- [x] Break `TripMapPage` (1,222 → 539 lines) → `trip-map/constants.tsx`, `MapToolbar.tsx`, `CategoryPanel.tsx`, `ActivityPopup.tsx`, `PlacePopup.tsx`, `ContributePanel.tsx` (6 sub-modules)

### 4.4 Shared UI Component Library
- [x] Create `frontend/src/components/ui/` — Button, Card, Modal, Input, Select, Badge (6 primitives + barrel `index.ts`)
- [x] Migrate existing inline patterns to shared components:
  - `TripDetailPage` — expense modal → `<Modal>` + `<Button>`
  - `AutopilotView` — replan modal → `<Modal>` + `<Button>`
  - `TimelineActivity` — edit Cancel/Save → `<Button variant="secondary">` / `<Button>`
  - `ExpensesView` — "Log Expense" → `<Button icon={...}>`
  - `AddActivityPanel` — "Add to Itinerary" → `<Button loading={...}>`

---

## Architecture Notes

### Folder Structure Target
```
frontend/src/
├── components/
│   ├── ui/              ← shared primitives (Button, Card, Modal)
│   ├── maps/            ← MapLibre components (HeroMap, NetworkMap, etc.)
│   └── Layout.tsx
├── lib/
│   ├── api/             ← domain-split API clients
│   └── types/           ← shared TypeScript interfaces
├── providers/           ← React contexts (Auth, Theme, Mode)
└── pages/
    ├── shared/          ← public pages (Home, Login, Explore, Routes)
    ├── traveler/        ← trip planning + recording
    ├── provider/        ← provider dashboard + route creation
    └── mentor/          ← spatial canvas + route publishing
```

### Tech Decisions
- **Road snapping:** OSRM public API (free, no key) → GraphHopper free tier (500 req/day, needs key) as fallback. Self-host OSRM later when traffic justifies.
- **Map library:** MapLibre GL JS (already in use). Add MapLibre Draw for polygon/area tools.
- **Subdomain strategy:** Keep as route-based (`/mentor/*`, `/provider/*`) within one SPA for now. Split to subdomains (`mentor.roamricher.com`) when traffic justifies.
- **GIS validation on publish:** Ensure pins are within 500m of route geometry, segments are connected, total route geometry is valid LineString.
