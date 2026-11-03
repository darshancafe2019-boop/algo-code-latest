-- ============================================================================
-- QUANT.OS — Phase 2: Supabase Auth Identity Mapping Migration
-- Target: Supabase PostgreSQL (Free/Pro)
-- Idempotent and Non-Destructive
-- ============================================================================

-- 1. Ensure supabase_uid column exists on users table to bind Supabase Auth UUIDs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'supabase_uid'
    ) THEN
        ALTER TABLE public.users ADD COLUMN supabase_uid VARCHAR(128) UNIQUE;
        COMMENT ON COLUMN public.users.supabase_uid IS 'Supabase auth.users.id (UUID) mapped to this QUANT.OS account';
    END IF;
END $$;

-- 2. Create index for fast O(1) user resolution during JWT verification
CREATE INDEX IF NOT EXISTS idx_users_supabase_uid ON public.users(supabase_uid);

-- 3. Ensure role and status constraints are preserved
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_users_role_valid'
    ) THEN
        ALTER TABLE public.users 
        ADD CONSTRAINT chk_users_role_valid 
        CHECK (role IN ('ADMIN', 'OPERATOR', 'TRADER', 'RISK_MANAGER', 'VIEWER'));
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        -- Constraint already exists or table has existing values to review
        NULL;
END $$;

-- 4. Create an audit table for Supabase Auth identity link events if not present
CREATE TABLE IF NOT EXISTS public.supabase_identity_links (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(128) NOT NULL,
    supabase_uid VARCHAR(128) NOT NULL,
    email VARCHAR(255) NOT NULL,
    linked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(64) DEFAULT '127.0.0.1',
    user_agent TEXT DEFAULT '',
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT uq_sb_identity_user_uid UNIQUE (user_id, supabase_uid)
);

CREATE INDEX IF NOT EXISTS idx_sb_identity_user_id ON public.supabase_identity_links(user_id);
CREATE INDEX IF NOT EXISTS idx_sb_identity_supabase_uid ON public.supabase_identity_links(supabase_uid);

-- 5. Safe & Idempotent Administrator Identity Linking (Non-destructive)
-- IMPORTANT SECURITY RULES:
-- a) Never set existing user UUIDs to NULL.
-- b) Never overwrite existing account mappings (enforce supabase_uid IS NULL).
-- c) Never elevate or change roles based on email or JWT metadata.
-- Target Supabase Auth UUID: a0eb64ff-814e-4121-88bb-61d28727a3d0
DO $$
DECLARE
    target_supabase_uuid VARCHAR(128) := 'a0eb64ff-814e-4121-88bb-61d28727a3d0';
BEGIN
    -- Only execute if operator has replaced or confirmed a valid UUID
    IF target_supabase_uuid <> 'PASTE-ASHISH-SUPABASE-AUTH-UUID-HERE' AND target_supabase_uuid IS NOT NULL THEN
        UPDATE public.users
        SET supabase_uid = target_supabase_uuid
        WHERE email = 'ashishparadkar1999@gmail.com'
          AND role = 'ADMIN'
          AND is_active = 1
          AND supabase_uid IS NULL;

        -- Record audit trail with strict unique constraint idempotency
        IF FOUND THEN
            INSERT INTO public.supabase_identity_links (user_id, supabase_uid, email, ip_address, user_agent)
            SELECT id, supabase_uid, email, '127.0.0.1', 'Manual/Migration Script'
            FROM public.users
            WHERE email = 'ashishparadkar1999@gmail.com'
              AND supabase_uid = target_supabase_uuid
            ON CONFLICT (user_id, supabase_uid) DO NOTHING;
        END IF;
    END IF;
END $$;

-- 6. Verification Queries: Run these after applying to confirm migration success
-- Check user mapping status without modifying data:
-- SELECT id, username, email, role, is_active, supabase_uid FROM public.users ORDER BY role ASC, created_at ASC;


