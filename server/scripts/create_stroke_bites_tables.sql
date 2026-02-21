-- Daily Stroke Bites Tables
-- Run this in Supabase SQL Editor

-- Table: stroke_bites (stores generated card sets per user per day)
CREATE TABLE IF NOT EXISTS stroke_bites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
    generated_date DATE NOT NULL,
    cards_json JSONB NOT NULL,
    start_card_id VARCHAR(20) NOT NULL,
    card_sequence_length INTEGER NOT NULL DEFAULT 8,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(patient_id, generated_date)  -- One bite set per user per day
);

-- Index for quick lookups by patient and date
CREATE INDEX IF NOT EXISTS idx_stroke_bites_patient_date
ON stroke_bites(patient_id, generated_date);

-- Table: stroke_bite_answers (stores Q&A responses for personalization)
CREATE TABLE IF NOT EXISTS stroke_bite_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bite_id UUID NOT NULL REFERENCES stroke_bites(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
    card_id VARCHAR(20) NOT NULL,
    selected_key VARCHAR(10) NOT NULL,
    question_text TEXT,
    selected_label TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying user's past answers
CREATE INDEX IF NOT EXISTS idx_stroke_bite_answers_patient
ON stroke_bite_answers(patient_id, created_at);

-- Verify tables were created
SELECT
    tablename,
    schemaname
FROM pg_tables
WHERE tablename IN ('stroke_bites', 'stroke_bite_answers');
