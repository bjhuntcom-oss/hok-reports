-- Migration: Add suggestions column to Report table
-- Run on VPS: psql -U hokreports -d hokreports -h localhost -p 5433 -f tmp-migrate-suggestions.sql

ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "suggestions" TEXT;
