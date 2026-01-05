-- Add 'skipped' value to the ai_processing_status enum
ALTER TYPE ai_processing_status ADD VALUE IF NOT EXISTS 'skipped';