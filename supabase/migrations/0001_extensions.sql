-- ============================================================================
-- THS OS — 0001: Extensions
-- ============================================================================
create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists pg_trgm;    -- fast fuzzy global search
