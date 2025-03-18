-- Add cancellation_requested column to files table
ALTER TABLE files ADD COLUMN IF NOT EXISTS cancellation_requested BOOLEAN NOT NULL DEFAULT false; 