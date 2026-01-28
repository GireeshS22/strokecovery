"""
Setup Supabase Database Tables
Run this script to create the initial tables for Strokecovery

Usage:
    Set environment variable DATABASE_URL or run with:
    DATABASE_URL="postgresql://user:pass@host:5432/db" python setup_database.py
"""

import os
import psycopg2
from urllib.parse import urlparse

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
        'password': parsed.password
    }


def create_tables():
    """Create the waitlist table and set up RLS policies"""

    conn = None
    try:
        # Get config from environment
        db_config = get_db_config()

        # Connect to database
        print("Connecting to Supabase PostgreSQL...")
        conn = psycopg2.connect(**db_config)
        conn.autocommit = True
        cursor = conn.cursor()

        print("Connected successfully!\n")

        # Create waitlist table
        print("Creating waitlist table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS waitlist (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """)
        print("[OK] Waitlist table created\n")

        # Enable Row Level Security
        print("Enabling Row Level Security...")
        cursor.execute("""
            ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
        """)
        print("[OK] RLS enabled\n")

        # Create policy for anonymous inserts
        print("Creating RLS policy for anonymous inserts...")
        cursor.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_policies
                    WHERE tablename = 'waitlist'
                    AND policyname = 'Allow anonymous inserts'
                ) THEN
                    CREATE POLICY "Allow anonymous inserts" ON waitlist
                        FOR INSERT TO anon
                        WITH CHECK (true);
                END IF;
            END
            $$;
        """)
        print("[OK] RLS policy created\n")

        # Verify table exists
        print("Verifying setup...")
        cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'waitlist';
        """)
        columns = cursor.fetchall()

        print("[OK] Table structure:")
        for col in columns:
            print(f"  - {col[0]}: {col[1]}")

        # Count existing rows
        cursor.execute("SELECT COUNT(*) FROM waitlist;")
        count = cursor.fetchone()[0]
        print(f"\nCurrent waitlist entries: {count}")

        print("\n" + "="*50)
        print("DATABASE SETUP COMPLETE!")
        print("="*50)
        print("\nYou can now test the waitlist form on your landing page.")

    except psycopg2.Error as e:
        print(f"Database error: {e}")
        raise
    finally:
        if conn:
            conn.close()
            print("\nConnection closed.")


if __name__ == "__main__":
    create_tables()
