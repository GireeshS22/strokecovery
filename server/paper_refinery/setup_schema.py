"""
Setup PaperRefinery Database Tables
Run this script to create the tables for paper processing and insights storage.

Usage:
    cd server
    python -m paper_refinery.setup_schema
"""

import os
import psycopg2
from urllib.parse import urlparse, unquote
from dotenv import load_dotenv

# Load .env file
load_dotenv()


def get_db_config():
    """Get database config from environment variable"""
    database_url = os.environ.get('DATABASE_URL')

    if not database_url:
        raise ValueError(
            "DATABASE_URL environment variable not set.\n"
            "Set it like: DATABASE_URL='postgresql://user:pass@host:5432/db'"
        )

    parsed = urlparse(database_url)

    return {
        'host': parsed.hostname,
        'port': parsed.port or 5432,
        'database': parsed.path[1:],  # Remove leading /
        'user': parsed.username,
        'password': unquote(parsed.password) if parsed.password else None
    }


def create_tables():
    """Create the PaperRefinery tables"""

    conn = None
    try:
        db_config = get_db_config()

        print("Connecting to Supabase PostgreSQL...")
        conn = psycopg2.connect(**db_config)
        conn.autocommit = True
        cursor = conn.cursor()

        print("Connected successfully!\n")

        # Enable pgvector extension
        print("Enabling pgvector extension...")
        cursor.execute("CREATE EXTENSION IF NOT EXISTS vector;")
        print("[OK] pgvector enabled\n")

        # Create papers table
        print("Creating papers table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS papers (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                hash VARCHAR(64) UNIQUE NOT NULL,
                filename TEXT NOT NULL,
                title TEXT,
                authors TEXT[],
                publication_year INT,
                study_type VARCHAR(50),
                processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """)
        print("[OK] papers table created\n")

        # Create paper_sections table
        print("Creating paper_sections table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS paper_sections (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                paper_id UUID REFERENCES papers(id) ON DELETE CASCADE,
                section_name TEXT,
                raw_text TEXT,
                section_order INT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """)
        print("[OK] paper_sections table created\n")

        # Create insights table with vector column
        print("Creating insights table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS insights (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                paper_id UUID REFERENCES papers(id) ON DELETE CASCADE,
                section_id UUID REFERENCES paper_sections(id) ON DELETE CASCADE,

                -- Extracted insight data
                claim TEXT NOT NULL,
                evidence TEXT,
                quantitative_result TEXT,
                stroke_types TEXT[],
                recovery_phase VARCHAR(20),
                intervention TEXT,
                sample_size INT,

                -- Vector embedding for semantic search
                embedding vector(1536),

                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """)
        print("[OK] insights table created\n")

        # Create vector index for fast similarity search
        print("Creating vector index...")
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS insights_embedding_idx
            ON insights
            USING ivfflat (embedding vector_cosine_ops)
            WITH (lists = 100);
        """)
        print("[OK] vector index created\n")

        # Create index on stroke_types for filtering
        print("Creating filter indexes...")
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS insights_stroke_types_idx
            ON insights USING GIN (stroke_types);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS insights_recovery_phase_idx
            ON insights (recovery_phase);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS insights_paper_id_idx
            ON insights (paper_id);
        """)
        print("[OK] filter indexes created\n")

        # Create RPC function for vector similarity search
        print("Creating search function...")
        cursor.execute("""
            CREATE OR REPLACE FUNCTION match_insights(
                query_embedding vector(1536),
                match_count INT DEFAULT 10,
                filter_stroke_types TEXT[] DEFAULT NULL,
                filter_recovery_phase TEXT DEFAULT NULL
            )
            RETURNS TABLE (
                id UUID,
                paper_id UUID,
                claim TEXT,
                evidence TEXT,
                quantitative_result TEXT,
                stroke_types TEXT[],
                recovery_phase VARCHAR(20),
                intervention TEXT,
                sample_size INT,
                similarity FLOAT
            )
            LANGUAGE plpgsql
            AS $$
            BEGIN
                RETURN QUERY
                SELECT
                    i.id,
                    i.paper_id,
                    i.claim,
                    i.evidence,
                    i.quantitative_result,
                    i.stroke_types,
                    i.recovery_phase,
                    i.intervention,
                    i.sample_size,
                    1 - (i.embedding <=> query_embedding) AS similarity
                FROM insights i
                WHERE
                    (filter_stroke_types IS NULL OR i.stroke_types && filter_stroke_types)
                    AND (filter_recovery_phase IS NULL OR i.recovery_phase = filter_recovery_phase)
                ORDER BY i.embedding <=> query_embedding
                LIMIT match_count;
            END;
            $$;
        """)
        print("[OK] search function created\n")

        # Verify tables exist
        print("Verifying setup...")
        cursor.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_name IN ('papers', 'paper_sections', 'insights');
        """)
        tables = cursor.fetchall()
        print(f"[OK] Tables created: {[t[0] for t in tables]}")

        # Count rows
        cursor.execute("SELECT COUNT(*) FROM papers;")
        papers_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM insights;")
        insights_count = cursor.fetchone()[0]
        print(f"\nCurrent data: {papers_count} papers, {insights_count} insights")

        print("\n" + "="*50)
        print("PAPER REFINERY SCHEMA SETUP COMPLETE!")
        print("="*50)

    except psycopg2.Error as e:
        print(f"Database error: {e}")
        raise
    finally:
        if conn:
            conn.close()
            print("\nConnection closed.")


if __name__ == "__main__":
    create_tables()
