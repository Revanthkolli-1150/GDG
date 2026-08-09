-- ============================================================================
-- CENTRALIZED EMERGENCY AMBULANCE DISPATCH & REAL-TIME HOSPITAL TELEMETRY
-- PostgreSQL + PostGIS Database Schema (schema.sql)
-- ============================================================================

-- Enable PostGIS Extension for Geospatial Calculations
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- ENUM TYPES
-- ----------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('PARAMEDIC', 'ER_STAFF', 'DISPATCHER', 'PUBLIC');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE ambulance_status AS ENUM ('AVAILABLE', 'DISPATCHED', 'EN_ROUTE_TO_SCENE', 'AT_SCENE', 'TRANSPORTING', 'AT_HOSPITAL', 'OFF_DUTY');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE incident_priority AS ENUM ('CRITICAL_P1', 'URGENT_P2', 'NON_URGENT_P3');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE incident_status AS ENUM ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'HANDOFF_COMPLETE', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE esi_triage_level AS ENUM ('RED_LEVEL_1', 'YELLOW_LEVEL_2', 'GREEN_LEVEL_3');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE hospital_status AS ENUM ('NORMAL', 'BUSY', 'DIVERTING', 'FULL_CAPACITY');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ----------------------------------------------------------------------------
-- 1. USERS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role user_role NOT NULL DEFAULT 'PARAMEDIC',
    phone VARCHAR(30),
    hospital_id UUID, -- NULL if paramedic/dispatcher
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 2. HOSPITALS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hospitals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    address VARCHAR(255) NOT NULL,
    location GEOMETRY(Point, 4326) NOT NULL,
    trauma_bays_total INT NOT NULL DEFAULT 10,
    trauma_bays_available INT NOT NULL DEFAULT 5,
    icu_beds_available INT NOT NULL DEFAULT 3,
    status hospital_status NOT NULL DEFAULT 'NORMAL',
    contact_phone VARCHAR(30),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Spatial Index for Hospitals
CREATE INDEX IF NOT EXISTS idx_hospitals_location ON hospitals USING GIST (location);

-- ----------------------------------------------------------------------------
-- 3. AMBULANCES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ambulances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_sign VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'MEDIC-101'
    vehicle_plate VARCHAR(30) UNIQUE NOT NULL,
    status ambulance_status NOT NULL DEFAULT 'AVAILABLE',
    current_location GEOMETRY(Point, 4326) NOT NULL,
    current_bearing DOUBLE PRECISION DEFAULT 0.0,
    current_speed DOUBLE PRECISION DEFAULT 0.0, -- km/h
    assigned_incident_id UUID,
    assigned_hospital_id UUID,
    assigned_paramedic_id UUID REFERENCES users(id),
    last_ping_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Spatial Index for Ambulances
CREATE INDEX IF NOT EXISTS idx_ambulances_location ON ambulances USING GIST (current_location);
CREATE INDEX IF NOT EXISTS idx_ambulances_status ON ambulances(status);

-- ----------------------------------------------------------------------------
-- 4. INCIDENTS (EMERGENCY CALLS) TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    caller_name VARCHAR(150) DEFAULT 'Anonymous Public Caller',
    caller_phone VARCHAR(30),
    incident_type VARCHAR(100) NOT NULL, -- e.g., 'CARDIAC_ARREST', 'TRAUMA'
    priority incident_priority NOT NULL DEFAULT 'URGENT_P2',
    status incident_status NOT NULL DEFAULT 'PENDING',
    location GEOMETRY(Point, 4326) NOT NULL,
    address_text TEXT NOT NULL,
    assigned_ambulance_id UUID REFERENCES ambulances(id),
    destination_hospital_id UUID REFERENCES hospitals(id),
    description TEXT,
    reported_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Spatial Index for Incidents
CREATE INDEX IF NOT EXISTS idx_incidents_location ON incidents USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_priority ON incidents(priority);

-- Add ForeignKey back reference
ALTER TABLE ambulances 
    ADD CONSTRAINT fk_ambulances_incident 
    FOREIGN KEY (assigned_incident_id) REFERENCES incidents(id) ON DELETE SET NULL;
    
ALTER TABLE ambulances 
    ADD CONSTRAINT fk_ambulances_hospital 
    FOREIGN KEY (assigned_hospital_id) REFERENCES hospitals(id) ON DELETE SET NULL;

-- ----------------------------------------------------------------------------
-- 5. PATIENT TRIAGE & TELEMETRY TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patient_triage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    ambulance_id UUID NOT NULL REFERENCES ambulances(id),
    paramedic_id UUID REFERENCES users(id),
    patient_name VARCHAR(150),
    patient_age INT,
    patient_gender VARCHAR(20),
    esi_level esi_triage_level NOT NULL DEFAULT 'RED_LEVEL_1',
    chief_complaint TEXT NOT NULL,
    heart_rate INT, -- bpm
    blood_pressure_systolic INT, -- mmHg
    blood_pressure_diastolic INT, -- mmHg
    spo2 INT, -- % oxygen saturation
    respiratory_rate INT, -- breaths/min
    temperature_celsius NUMERIC(4,1),
    ekg_rhythm VARCHAR(100) DEFAULT 'Sinus Rhythm',
    notes TEXT,
    is_synced_from_offline BOOLEAN DEFAULT FALSE,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_triage_incident ON patient_triage(incident_id);
CREATE INDEX IF NOT EXISTS idx_triage_esi ON patient_triage(esi_level);

-- ----------------------------------------------------------------------------
-- 6. OFFLINE SYNC LOGS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    paramedic_id UUID REFERENCES users(id),
    client_tx_id VARCHAR(100) NOT NULL UNIQUE,
    records_synced INT NOT NULL DEFAULT 1,
    sync_status VARCHAR(50) NOT NULL DEFAULT 'SUCCESS',
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

-- ----------------------------------------------------------------------------
-- HELPER GEOSPATIAL FUNCTIONS
-- ----------------------------------------------------------------------------

-- Function: Find Nearest Available Ambulances to a Location (in meters)
CREATE OR REPLACE FUNCTION get_nearest_available_ambulances(
    req_lat DOUBLE PRECISION,
    req_lng DOUBLE PRECISION,
    limit_count INT DEFAULT 5
)
RETURNS TABLE (
    ambulance_id UUID,
    call_sign VARCHAR(50),
    status ambulance_status,
    distance_meters DOUBLE PRECISION,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id AS ambulance_id,
        a.call_sign,
        a.status,
        ST_DistanceSphere(a.current_location, ST_SetSRID(ST_MakePoint(req_lng, req_lat), 4326)) AS distance_meters,
        ST_Y(a.current_location::geometry) AS latitude,
        ST_X(a.current_location::geometry) AS longitude
    FROM ambulances a
    WHERE a.status = 'AVAILABLE'
    ORDER BY a.current_location <-> ST_SetSRID(ST_MakePoint(req_lng, req_lat), 4326)
    LIMIT limit_count;
END;
$$;

-- Function: Find Nearest Hospital with Available Trauma Bays
CREATE OR REPLACE FUNCTION get_nearest_capacity_hospital(
    req_lat DOUBLE PRECISION,
    req_lng DOUBLE PRECISION
)
RETURNS TABLE (
    hospital_id UUID,
    hospital_name VARCHAR(200),
    trauma_bays_available INT,
    distance_meters DOUBLE PRECISION,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        h.id AS hospital_id,
        h.name AS hospital_name,
        h.trauma_bays_available,
        ST_DistanceSphere(h.location, ST_SetSRID(ST_MakePoint(req_lng, req_lat), 4326)) AS distance_meters,
        ST_Y(h.location::geometry) AS latitude,
        ST_X(h.location::geometry) AS longitude
    FROM hospitals h
    WHERE h.trauma_bays_available > 0 AND h.status != 'DIVERTING'
    ORDER BY h.location <-> ST_SetSRID(ST_MakePoint(req_lng, req_lat), 4326)
    LIMIT 1;
END;
$$;
