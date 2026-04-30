-- =====================================================
-- MANUAL DEPLOYMENT - Error Notifications System
-- Copy and paste this entire file into Supabase Dashboard SQL Editor
-- =====================================================

-- 1. TABLE: Error Notifications
CREATE TABLE IF NOT EXISTS public.error_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    error_type TEXT NOT NULL,
    error_message TEXT NOT NULL,
    error_details JSONB DEFAULT '{}',
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    page_url TEXT,
    user_agent TEXT,
    stack_trace TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    email_sent BOOLEAN DEFAULT false,
    email_sent_at TIMESTAMPTZ,
    email_error TEXT
);

COMMENT ON TABLE public.error_notifications IS 'Stores error notifications for super admin alerts';

-- 2. TABLE: Notification Settings
CREATE TABLE IF NOT EXISTS public.notification_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    super_admin_email TEXT,
    notify_on_server_errors BOOLEAN DEFAULT true,
    notify_on_auth_errors BOOLEAN DEFAULT true,
    notify_on_permission_errors BOOLEAN DEFAULT true,
    notify_on_validation_errors BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default row
INSERT INTO public.notification_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- 3. RLS POLICIES
ALTER TABLE public.error_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Error notifications readable by super admins" ON public.error_notifications;
DROP POLICY IF EXISTS "Error notifications insertable by authenticated users" ON public.error_notifications;
DROP POLICY IF EXISTS "Notification settings readable by super admins" ON public.notification_settings;
DROP POLICY IF EXISTS "Notification settings updatable by super admins" ON public.notification_settings;

-- Create policies
CREATE POLICY "Error notifications readable by super admins"
    ON public.error_notifications FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'super_admin'
    ));

CREATE POLICY "Error notifications insertable by authenticated users"
    ON public.error_notifications FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Notification settings readable by super admins"
    ON public.notification_settings FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'super_admin'
    ));

CREATE POLICY "Notification settings updatable by super admins"
    ON public.notification_settings FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'super_admin'
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'super_admin'
    ));

-- 4. FUNCTION: Get super admin email
CREATE OR REPLACE FUNCTION public.get_super_admin_email()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (
        SELECT super_admin_email
        FROM public.notification_settings
        WHERE id = 1
    );
END;
$$;

-- 5. FUNCTION: Get notification settings
CREATE OR REPLACE FUNCTION public.get_notification_settings()
RETURNS public.notification_settings
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (
        SELECT *
        FROM public.notification_settings
        WHERE id = 1
    );
END;
$$;

-- 6. FUNCTION: Set super admin email
CREATE OR REPLACE FUNCTION public.set_super_admin_email(email TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.notification_settings (id, super_admin_email)
    VALUES (1, email)
    ON CONFLICT (id)
    DO UPDATE SET
        super_admin_email = EXCLUDED.super_admin_email,
        updated_at = now();
END;
$$;

-- 7. TRIGGER: On new error notification
DROP FUNCTION IF EXISTS public.send_error_notification() CASCADE;

CREATE OR REPLACE FUNCTION public.send_error_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    settings public.notification_settings;
    should_notify BOOLEAN := false;
BEGIN
    -- Get notification settings
    SELECT * INTO settings FROM public.notification_settings WHERE id = 1;

    -- Check if we should notify based on error type
    should_notify := CASE NEW.error_type
        WHEN 'server' THEN COALESCE(settings.notify_on_server_errors, true)
        WHEN 'auth' THEN COALESCE(settings.notify_on_auth_errors, true)
        WHEN 'permission' THEN COALESCE(settings.notify_on_permission_errors, true)
        WHEN 'validation' THEN COALESCE(settings.notify_on_validation_errors, false)
        ELSE false
    END;

    -- Only proceed if we have an email and should notify
    IF should_notify AND settings.super_admin_email IS NOT NULL THEN
        -- Invoke Edge Function via pg_net (if available) or just mark for processing
        NEW.email_sent := false; -- Will be processed by Edge Function polling
    END IF;

    RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS on_error_notification_created ON public.error_notifications;
CREATE TRIGGER on_error_notification_created
    BEFORE INSERT ON public.error_notifications
    FOR EACH ROW
    EXECUTE FUNCTION public.send_error_notification();

-- 8. INDEXES
CREATE INDEX IF NOT EXISTS idx_error_notifications_created_at
    ON public.error_notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_error_notifications_error_type
    ON public.error_notifications(error_type);

CREATE INDEX IF NOT EXISTS idx_error_notifications_email_sent
    ON public.error_notifications(email_sent)
    WHERE email_sent = false;

-- =====================================================
-- VERIFICATION
-- =====================================================
SELECT 'Tables created' as status;
SELECT COUNT(*) as error_notifications_count FROM public.error_notifications;
SELECT COUNT(*) as settings_count FROM public.notification_settings;
SELECT super_admin_email FROM public.notification_settings WHERE id = 1;
