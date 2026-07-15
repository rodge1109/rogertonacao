-- Database Updates for Clinic Booking System Advanced Features
-- Run these SQL commands in your PostgreSQL database

-- 1. Update appointments table with new columns (if not already added)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cancel_token VARCHAR(100);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS doctor_id INTEGER;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS sms_sent BOOLEAN DEFAULT false;

-- 2. Blocked Dates / Holidays table
CREATE TABLE IF NOT EXISTS blocked_dates (
    id SERIAL PRIMARY KEY,
    blocked_date DATE NOT NULL UNIQUE,
    reason VARCHAR(255) DEFAULT 'Holiday/Clinic Closed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Doctors table
CREATE TABLE IF NOT EXISTS doctors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    specialization VARCHAR(255) DEFAULT 'General Practice',
    color VARCHAR(20) DEFAULT '#3B82F6',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Services table with duration
CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    duration INTEGER DEFAULT 30,  -- duration in minutes
    price DECIMAL(10, 2) DEFAULT 0,
    description TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Add foreign key for doctor_id (optional, if you want referential integrity)
-- ALTER TABLE appointments ADD CONSTRAINT fk_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id);

-- Sample data for testing

-- Add some sample blocked dates
INSERT INTO blocked_dates (blocked_date, reason) VALUES
    ('2025-12-25', 'Christmas Day'),
    ('2025-12-31', 'New Year''s Eve'),
    ('2025-01-01', 'New Year''s Day')
ON CONFLICT (blocked_date) DO NOTHING;

-- Add some sample doctors
INSERT INTO doctors (name, specialization, color) VALUES
    ('Dr. Juan Dela Cruz', 'General Practice', '#3B82F6'),
    ('Dr. Maria Santos', 'Pediatrics', '#10B981'),
    ('Dr. Pedro Reyes', 'Internal Medicine', '#8B5CF6')
ON CONFLICT DO NOTHING;

-- Add some sample services
INSERT INTO services (name, duration, price, description) VALUES
    ('General Consultation', 30, 500, 'General health checkup and consultation'),
    ('Dental Cleaning', 45, 800, 'Professional teeth cleaning'),
    ('Eye Examination', 30, 600, 'Comprehensive eye exam'),
    ('Vaccination', 15, 350, 'Immunization shots'),
    ('Laboratory Tests', 60, 1200, 'Blood work and other lab tests'),
    ('Physical Therapy', 60, 1000, 'Rehabilitation therapy session')
ON CONFLICT DO NOTHING;

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_blocked_dates_date ON blocked_dates(blocked_date);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(preferred_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
