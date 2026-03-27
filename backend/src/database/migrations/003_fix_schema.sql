-- ============================================================
-- Migration 003: Fix schema to match service layer (MySQL)
-- ============================================================

-- Ensure next_number starts at 1 (not 0)
UPDATE document_sequences SET next_number = 1 WHERE next_number = 0;
