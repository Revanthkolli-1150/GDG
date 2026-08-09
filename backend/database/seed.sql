-- ============================================================================
-- CENTRALIZED EMERGENCY AMBULANCE DISPATCH & REAL-TIME HOSPITAL TELEMETRY
-- PostgreSQL + PostGIS Indian 108/112 EMS Network Seed Data (seed.sql)
-- ============================================================================

-- Seed Real Indian Premier Hospitals
INSERT INTO hospitals (id, name, address, location, trauma_bays_total, trauma_bays_available, icu_beds_available, status, contact_phone)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'AIIMS Apex Trauma Center', 'Sri Aurobindo Marg, Ansari Nagar, New Delhi', ST_SetSRID(ST_MakePoint(77.210000, 28.567200), 4326), 25, 8, 5, 'NORMAL', '+91-11-26588500'),
    ('22222222-2222-2222-2222-222222222222', 'Fortis Escorts Heart Institute', 'Okhla Road, Sukhdev Vihar, New Delhi', ST_SetSRID(ST_MakePoint(77.275000, 28.560400), 4326), 16, 4, 3, 'BUSY', '+91-11-47135000'),
    ('33333333-3333-3333-3333-333333333333', 'Max Super Speciality Hospital', 'Press Enclave Road, Saket, New Delhi', ST_SetSRID(ST_MakePoint(77.211700, 28.528300), 4326), 20, 9, 6, 'NORMAL', '+91-11-26515050'),
    ('44444444-4444-4444-4444-444444444444', 'Apollo Hospitals Jubilee Hills', 'Road No 72, Film Nagar, Hyderabad, Telangana', ST_SetSRID(ST_MakePoint(78.411100, 17.425600), 4326), 18, 5, 4, 'NORMAL', '+91-40-23607777'),
    ('55555555-5555-5555-5555-555555555555', 'Manipal Hospital HAL Airport Road', '98 HAL Old Airport Rd, Kodihalli, Bengaluru, Karnataka', ST_SetSRID(ST_MakePoint(77.648300, 12.958500), 4326), 15, 3, 2, 'BUSY', '+91-80-25024444')
ON CONFLICT (id) DO NOTHING;

-- Seed Indian EMS Users
INSERT INTO users (id, email, password_hash, full_name, role, phone, hospital_id)
VALUES
    ('a1111111-1111-1111-1111-111111111111', 'dispatcher.delhi@108ems.gov.in', '$2b$10$abcdefghijklmnopqrstuv', 'Central Dispatcher Rajesh Kumar', 'DISPATCHER', '+91-9810010811', NULL),
    ('a2222222-2222-2222-2222-222222222222', 'er.head@aiims.edu', '$2b$10$abcdefghijklmnopqrstuv', 'Dr. Ananya Sharma, MD (Trauma Lead)', 'ER_STAFF', '+91-9811234567', '11111111-1111-1111-1111-111111111111'),
    ('a3333333-3333-3333-3333-333333333333', 'lead.paramedic@108delhi.in', '$2b$10$abcdefghijklmnopqrstuv', 'Paramedic Officer Vikram Singh', 'PARAMEDIC', '+91-9876543210', NULL),
    ('a4444444-4444-4444-4444-444444444444', 'paramedic.south@108mumbai.in', '$2b$10$abcdefghijklmnopqrstuv', 'Paramedic Officer Priya Nair', 'PARAMEDIC', '+91-9820098765', NULL)
ON CONFLICT (id) DO NOTHING;

-- Seed Indian 108 / 112 Fleet Ambulances
INSERT INTO ambulances (id, call_sign, vehicle_plate, status, current_location, current_bearing, current_speed, assigned_paramedic_id)
VALUES
    ('b1111111-1111-1111-1111-111111111111', '108-ALS-DEL-01', 'DL-01-GA-1081', 'AVAILABLE', ST_SetSRID(ST_MakePoint(77.215000, 28.560000), 4326), 180.0, 0.0, 'a3333333-3333-3333-3333-333333333333'),
    ('b2222222-2222-2222-2222-222222222222', '108-BLS-DEL-04', 'DL-03-CB-9041', 'AVAILABLE', ST_SetSRID(ST_MakePoint(77.230000, 28.550000), 4326), 90.0, 0.0, 'a4444444-4444-4444-4444-444444444444'),
    ('b3333333-3333-3333-3333-333333333333', 'APOLLO-CRITICAL-02', 'TS-09-EM-8080', 'AVAILABLE', ST_SetSRID(ST_MakePoint(77.200000, 28.540000), 4326), 270.0, 0.0, NULL),
    ('b4444444-4444-4444-4444-444444444444', '112-EMRI-BLR-09', 'KA-01-MH-1129', 'AVAILABLE', ST_SetSRID(ST_MakePoint(77.250000, 28.570000), 4326), 45.0, 0.0, NULL)
ON CONFLICT (id) DO NOTHING;

-- Seed Sample Indian Emergency Incidents
INSERT INTO incidents (id, caller_name, caller_phone, incident_type, priority, status, location, address_text, description)
VALUES
    ('c1111111-1111-1111-1111-111111111111', 'Ramesh Gupta', '+91-9810998811', 'CARDIAC_ARREST', 'CRITICAL_P1', 'PENDING', ST_SetSRID(ST_MakePoint(77.218000, 28.555000), 4326), 'Connaught Place Outer Circle, Block C, New Delhi', '54yo male collapsed near metro exit, crushing chest pain, bystander CPR initiated'),
    ('c2222222-2222-2222-2222-222222222222', 'Sunita Verma', '+91-9871233441', 'SEVERE_TRAUMA', 'CRITICAL_P1', 'PENDING', ST_SetSRID(ST_MakePoint(77.240000, 28.545000), 4326), 'Ring Road Flyover Junction, Lajpat Nagar, Delhi', 'High-speed multi-vehicle collision, patient pinned in vehicle with acute hypotension')
ON CONFLICT (id) DO NOTHING;
