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
    """Create all database tables with RLS policies."""

    print("=" * 50)
    print("STROKECOVERY - DATABASE SETUP")
    print("=" * 50)

    with engine.connect() as conn:
        # Enable autocommit for DDL statements
        conn = conn.execution_options(isolation_level="AUTOCOMMIT")

        # 1. Create users table
        print("\n[1/10] Creating users table...")
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS users (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                name VARCHAR(255),
                password_hash VARCHAR(255),
                auth_provider VARCHAR(20) DEFAULT 'email',
                role VARCHAR(20) DEFAULT 'patient',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """))
        # Add name column if it doesn't exist (for existing databases)
        conn.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'users' AND column_name = 'name'
                ) THEN
                    ALTER TABLE users ADD COLUMN name VARCHAR(255);
                END IF;
            END
            $$;
        """))
        print("    [OK] users table created")

        # 2. Create patient_profiles table
        print("\n[2/10] Creating patient_profiles table...")
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

        # 3. Create medicines table
        print("\n[3/10] Creating medicines table...")
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS medicines (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                patient_id UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                dosage VARCHAR(100),
                morning BOOLEAN DEFAULT FALSE,
                afternoon BOOLEAN DEFAULT FALSE,
                night BOOLEAN DEFAULT FALSE,
                timing VARCHAR(20) DEFAULT 'any_time',
                start_date DATE NOT NULL,
                end_date DATE,
                notes TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """))
        # Create index on patient_id for faster lookups
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_medicines_patient_id ON medicines(patient_id);
        """))
        print("    [OK] medicines table created")

        # 4. Create medicine_logs table
        print("\n[4/10] Creating medicine_logs table...")
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS medicine_logs (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
                scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
                time_of_day VARCHAR(20) NOT NULL,
                taken_at TIMESTAMP WITH TIME ZONE,
                status VARCHAR(20) DEFAULT 'pending',
                notes TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """))
        # Create indexes for faster lookups
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_medicine_logs_medicine_id ON medicine_logs(medicine_id);
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_medicine_logs_scheduled_time ON medicine_logs(scheduled_time);
        """))
        print("    [OK] medicine_logs table created")

        # 5. Enable RLS on users
        print("\n[5/10] Enabling Row Level Security on users...")
        conn.execute(text("ALTER TABLE users ENABLE ROW LEVEL SECURITY;"))
        print("    [OK] RLS enabled on users")

        # 6. Enable RLS on patient_profiles
        print("\n[6/10] Enabling Row Level Security on patient_profiles...")
        conn.execute(text("ALTER TABLE patient_profiles ENABLE ROW LEVEL SECURITY;"))
        print("    [OK] RLS enabled on patient_profiles")

        # 7. Enable RLS on medicines
        print("\n[7/10] Enabling Row Level Security on medicines...")
        conn.execute(text("ALTER TABLE medicines ENABLE ROW LEVEL SECURITY;"))
        print("    [OK] RLS enabled on medicines")

        # 8. Enable RLS on medicine_logs
        print("\n[8/10] Enabling Row Level Security on medicine_logs...")
        conn.execute(text("ALTER TABLE medicine_logs ENABLE ROW LEVEL SECURITY;"))
        print("    [OK] RLS enabled on medicine_logs")

        # 9. Create RLS policies for users
        print("\n[9/10] Creating RLS policies for users...")
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

        # 10. Create RLS policies for patient_profiles, medicines, and medicine_logs
        print("\n[10/10] Creating RLS policies for all tables...")
        conn.execute(text("""
            DO $$
            BEGIN
                -- Allow service role full access to patient_profiles
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

                -- Allow service role full access to medicines
                IF NOT EXISTS (
                    SELECT 1 FROM pg_policies
                    WHERE tablename = 'medicines' AND policyname = 'Service role full access'
                ) THEN
                    CREATE POLICY "Service role full access" ON medicines
                        FOR ALL TO service_role
                        USING (true)
                        WITH CHECK (true);
                END IF;

                -- Allow service role full access to medicine_logs
                IF NOT EXISTS (
                    SELECT 1 FROM pg_policies
                    WHERE tablename = 'medicine_logs' AND policyname = 'Service role full access'
                ) THEN
                    CREATE POLICY "Service role full access" ON medicine_logs
                        FOR ALL TO service_role
                        USING (true)
                        WITH CHECK (true);
                END IF;
            END
            $$;
        """))
        print("    [OK] RLS policies created for all tables")

        # Verify tables exist
        print("\n" + "-" * 50)
        print("VERIFYING TABLES...")
        print("-" * 50)

        result = conn.execute(text("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name IN ('users', 'patient_profiles', 'medicines', 'medicine_logs')
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

        # Show medicines table structure
        print("\n[medicines] columns:")
        result = conn.execute(text("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'medicines'
            ORDER BY ordinal_position;
        """))
        for row in result:
            print(f"    - {row[0]}: {row[1]}")

        # Show medicine_logs table structure
        print("\n[medicine_logs] columns:")
        result = conn.execute(text("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'medicine_logs'
            ORDER BY ordinal_position;
        """))
        for row in result:
            print(f"    - {row[0]}: {row[1]}")

    print("\n" + "=" * 50)
    print("DATABASE SETUP COMPLETE!")
    print("=" * 50)


if __name__ == "__main__":
    create_tables()
