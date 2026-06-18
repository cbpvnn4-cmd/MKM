-- Elevator Management System - PostgreSQL Initialization
-- This script runs automatically when the database container is first created

\echo 'Creating extensions...'

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For better text search

\echo 'Setting up database configuration...'

-- Set timezone to UTC for consistency
SET timezone = 'UTC';

-- Create custom function for auto-updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

\echo 'Database initialization completed successfully!'
\echo 'Tables will be created by SQLAlchemy Alembic migrations on first startup.'
