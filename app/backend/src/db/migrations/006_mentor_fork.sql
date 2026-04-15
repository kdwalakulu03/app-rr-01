-- =====================================================
-- Migration 006: Forked-from tracking for mentor routes
-- =====================================================
-- Adds a nullable FK column so forked routes know their origin.

ALTER TABLE mentor_routes
ADD COLUMN IF NOT EXISTS forked_from INT REFERENCES mentor_routes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_mentor_routes_forked ON mentor_routes (forked_from) WHERE forked_from IS NOT NULL;
