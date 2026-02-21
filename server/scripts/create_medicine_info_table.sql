-- Medicine Info Table
-- Global LLM-backed cache of medicine metadata (combination, drug class, used_for).
-- One row per unique medicine name. Not patient-specific.

CREATE TABLE IF NOT EXISTS medicine_info (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    medicine_name VARCHAR(255) NOT NULL,
    combination TEXT,
    drug_class VARCHAR(255),
    used_for TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Case-insensitive unique index so "Aspirin" and "aspirin" map to the same row
CREATE UNIQUE INDEX IF NOT EXISTS idx_medicine_info_name_lower
    ON medicine_info (LOWER(medicine_name));
