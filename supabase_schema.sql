-- SQL Schema for TR Moreira Logistics - COMPLETE DATABASE
-- Copy and paste this into your Supabase SQL Editor

-- 1. Create Trucks Table
CREATE TABLE IF NOT EXISTS trucks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plate TEXT NOT NULL UNIQUE,
    type TEXT,
    model TEXT,
    trailer_category TEXT,
    location_status TEXT DEFAULT 'yard',
    maintenance_status TEXT DEFAULT 'ok',
    doc_url TEXT,
    status TEXT DEFAULT 'available',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Drivers Table
CREATE TABLE IF NOT EXISTS drivers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    status TEXT DEFAULT 'active',
    work_status TEXT DEFAULT 'home',
    truck_id UUID REFERENCES trucks(id) ON DELETE SET NULL, -- Fixed Truck (Cavalo)
    current_trailer_id UUID REFERENCES trucks(id) ON DELETE SET NULL, -- Dynamic Trailer (Carreta)
    current_invoice TEXT,
    avatar_url TEXT,
    cnh_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Trips Table
CREATE TABLE IF NOT EXISTS trips (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
    truck_id UUID REFERENCES trucks(id) ON DELETE SET NULL, -- Cavalo
    trailer_id UUID REFERENCES trucks(id) ON DELETE SET NULL, -- Carreta
    type TEXT DEFAULT 'ida', -- 'ida' or 'volta'
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    cte TEXT NOT NULL,
    loading_date DATE NOT NULL,
    cte_date DATE,
    delivery_date DATE,
    km_initial DECIMAL(12,2),
    km_final DECIMAL(12,2),
    freight_value DECIMAL(12,2) NOT NULL DEFAULT 0,
    advance_value DECIMAL(12,2) NOT NULL DEFAULT 0,
    received_date DATE,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create Trip Expenses Table
CREATE TABLE IF NOT EXISTS trip_expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    responsible_party TEXT DEFAULT 'ederval',
    date DATE NOT NULL,
    description TEXT NOT NULL,
    value DECIMAL(12,2) NOT NULL DEFAULT 0,
    liters DECIMAL(12,2),
    receipt_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create Debts Table
CREATE TABLE IF NOT EXISTS debts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    person_name TEXT NOT NULL,
    total_value DECIMAL(12,2) NOT NULL DEFAULT 0,
    installments_count INTEGER DEFAULT 1,
    installments_paid INTEGER DEFAULT 0,
    due_date DATE NOT NULL,
    type TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create Company Expenses Table
CREATE TABLE IF NOT EXISTS company_expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    value DECIMAL(12,2) NOT NULL DEFAULT 0,
    category TEXT,
    receipt_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create Reminders Table
CREATE TABLE IF NOT EXISTS reminders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    type TEXT DEFAULT 'general',
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Enable RLS on all tables
ALTER TABLE trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- 9. Create Public Access Policies (Allows read/write for demo/simple apps)
-- If you want restricted access, modify these policies accordingly.
DROP POLICY IF EXISTS "Public Access Trucks" ON trucks;
CREATE POLICY "Public Access Trucks" ON trucks FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Access Drivers" ON drivers;
CREATE POLICY "Public Access Drivers" ON drivers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Access Trips" ON trips;
CREATE POLICY "Public Access Trips" ON trips FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Access Trip Expenses" ON trip_expenses;
CREATE POLICY "Public Access Trip Expenses" ON trip_expenses FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Access Debts" ON debts;
CREATE POLICY "Public Access Debts" ON debts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Access Company Expenses" ON company_expenses;
CREATE POLICY "Public Access Company Expenses" ON company_expenses FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Access Reminders" ON reminders;
CREATE POLICY "Public Access Reminders" ON reminders FOR ALL USING (true) WITH CHECK (true);

-- 10. Update/Migration commands (if tables already exist)
DO $$ 
BEGIN 
    -- Drop all restrictive check constraints to prevent any constraint mismatches
    ALTER TABLE trucks DROP CONSTRAINT IF EXISTS trucks_type_check;
    ALTER TABLE trucks DROP CONSTRAINT IF EXISTS trucks_trailer_category_check;
    ALTER TABLE trucks DROP CONSTRAINT IF EXISTS trucks_location_status_check;
    ALTER TABLE trucks DROP CONSTRAINT IF EXISTS trucks_maintenance_status_check;
    ALTER TABLE drivers DROP CONSTRAINT IF EXISTS drivers_status_check;
    ALTER TABLE drivers DROP CONSTRAINT IF EXISTS drivers_work_status_check;
    ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_status_check;
    ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_type_check;
    ALTER TABLE trip_expenses DROP CONSTRAINT IF EXISTS trip_expenses_type_check;
    ALTER TABLE trip_expenses DROP CONSTRAINT IF EXISTS trip_expenses_responsible_party_check;
    ALTER TABLE debts DROP CONSTRAINT IF EXISTS debts_type_check;
    ALTER TABLE debts DROP CONSTRAINT IF EXISTS debts_status_check;
    ALTER TABLE reminders DROP CONSTRAINT IF EXISTS reminders_type_check;

    -- Trucks
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trucks' AND column_name='status') THEN ALTER TABLE trucks ADD COLUMN status TEXT DEFAULT 'available'; END IF;
    
    -- Expenses & Receipts
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_expenses' AND column_name='receipt_url') THEN ALTER TABLE company_expenses ADD COLUMN receipt_url TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trip_expenses' AND column_name='receipt_url') THEN ALTER TABLE trip_expenses ADD COLUMN receipt_url TEXT; END IF;
    
    -- Responsible Party & Driver Payment Type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trip_expenses' AND column_name='responsible_party') THEN 
        ALTER TABLE trip_expenses ADD COLUMN responsible_party TEXT DEFAULT 'ederval'; 
    END IF;

    -- Remove Type constraint from trips (Unified freights)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trips' AND column_name='type') THEN 
        ALTER TABLE trips ADD COLUMN type TEXT DEFAULT 'ida'; 
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trips' AND column_name='type') THEN 
        ALTER TABLE trips ALTER COLUMN type DROP NOT NULL;
    END IF;

    -- Reminders consistency
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reminders' AND column_name='title') THEN 
        ALTER TABLE reminders ADD COLUMN title TEXT DEFAULT 'Lembrete';
        UPDATE reminders SET title = description WHERE title IS NULL;
        ALTER TABLE reminders ALTER COLUMN title SET NOT NULL;
    END IF;
END $$;

-- 11. STORAGE SETUP (Manually create these in Supabase Storage UI if needed)
-- Bucket: "documents" (Make sure it is PUBLIC)

