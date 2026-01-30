"""
Create Database Tables for Strokecovery App
Run from server/ folder with: python -m scripts.create_tables
"""

import sys
import os

# Add parent directory to path so we can import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import engine


def create_tables():
    """Create users and patient_profiles tables with RLS policies."""

    print("=" * 50)
    print("STROKECOVERY - DATABASE SETUP")
    print("=" * 50)

    with engine.connect() as conn:
        # Enable autocommit for DDL statements
        conn = conn.execution_options(isolation_level="AUTOCOMMIT")

        # 1. Create users table
        print("\n[1/6] Creating users table...")
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS users (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255),
                auth_provider VARCHAR(20) DEFAULT 'email',
                role VARCHAR(20) DEFAULT 'patient',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """))
        print("    [OK] users table created")

        # 2. Create patient_profiles table
        print("\n[2/6] Creating patient_profiles table...")
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS patient_profiles (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                stroke_date DATE,
                stroke_type VARCHAR(50),
                affected_side VARCHAR(20),
                current_therapies TEXT[],
                onboarding_completed BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(user_id)
            );
        """))
        print("    [OK] patient_profiles table created")

        # 3. Enable RLS on users
        print("\n[3/6] Enabling Row Level Security on users...")
        conn.execute(text("ALTER TABLE users ENABLE ROW LEVEL SECURITY;"))
        print("    [OK] RLS enabled on users")

        # 4. Enable RLS on patient_profiles
        print("\n[4/6] Enabling Row Level Security on patient_profiles...")
        conn.execute(text("ALTER TABLE patient_profiles ENABLE ROW LEVEL SECURITY;"))
        print("    [OK] RLS enabled on patient_profiles")

        # 5. Create RLS policies for users
        print("\n[5/6] Creating RLS policies for users...")
        conn.execute(text("""
            DO $$
            BEGIN
                -- Allow service role full access
                IF NOT EXISTS (
                    SELECT 1 FROM pg_policies
                    WHERE tablename = 'users' AND policyname = 'Service role full access'
                ) THEN
                    CREATE POLICY "Service role full access" ON users
                        FOR ALL TO service_role
                        USING (true)
                        WITH CHECK (true);
                END IF;

                -- Allow anon to insert (for registration)
                IF NOT EXISTS (
                    SELECT 1 FROM pg_policies
                    WHERE tablename = 'users' AND policyname = 'Allow registration'
                ) THEN
                    CREATE POLICY "Allow registration" ON users
                        FOR INSERT TO anon
                        WITH CHECK (true);
                END IF;
            END
            $$;
        """))
        print("    [OK] RLS policies created for users")

        # 6. Create RLS policies for patient_profiles
        print("\n[6/6] Creating RLS policies for patient_profiles...")
        conn.execute(text("""
            DO $$
            BEGIN
                -- Allow service role full access
                IF NOT EXISTS (
                    SELECT 1 FROM pg_policies
                    WHERE tablename = 'patient_profiles' AND policyname = 'Service role full access'
                ) THEN
                    CREATE POLICY "Service role full access" ON patient_profiles
                        FOR ALL TO service_role
                        USING (true)
                        WITH CHECK (true);
                END IF;

                -- Allow anon to insert (for onboarding)
                IF NOT EXISTS (
                    SELECT 1 FROM pg_policies
                    WHERE tablename = 'patient_profiles' AND policyname = 'Allow profile creation'
                ) THEN
                    CREATE POLICY "Allow profile creation" ON patient_profiles
                        FOR INSERT TO anon
                        WITH CHECK (true);
                END IF;
            END
            $$;
        """))
        print("    [OK] RLS policies created for patient_profiles")

        # Verify tables exist
        print("\n" + "-" * 50)
        print("VERIFYING TABLES...")
        print("-" * 50)

        result = conn.execute(text("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name IN ('users', 'patient_profiles', 'waitlist')
            ORDER BY table_name;
        """))
        tables = [row[0] for row in result]
        print(f"\nTables found: {', '.join(tables)}")

        # Show users table structure
        print("\n[users] columns:")
        result = conn.execute(text("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'users'
            ORDER BY ordinal_position;
        """))
        for row in result:
            print(f"    - {row[0]}: {row[1]}")

        # Show patient_profiles table structure
        print("\n[patient_profiles] columns:")
        result = conn.execute(text("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'patient_profiles'
            ORDER BY ordinal_position;
        """))
        for row in result:
            print(f"    - {row[0]}: {row[1]}")

    print("\n" + "=" * 50)
    print("DATABASE SETUP COMPLETE!")
    print("=" * 50)


if __name__ == "__main__":
    create_tables()
