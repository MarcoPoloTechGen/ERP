-- Table pour stocker les notifications d'erreur
CREATE TABLE IF NOT EXISTS public.error_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_details JSONB,
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  app_version TEXT,
  url TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMPTZ
);

-- Index pour les requêtes rapides
CREATE INDEX IF NOT EXISTS idx_error_notifications_created_at 
  ON public.error_notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_error_notifications_email_sent 
  ON public.error_notifications(email_sent) 
  WHERE email_sent = FALSE;

-- RLS policies
ALTER TABLE public.error_notifications ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs authentifiés peuvent créer des notifications
CREATE POLICY "Allow authenticated users to create error notifications"
  ON public.error_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Seuls les admins peuvent lire
CREATE POLICY "Only admins can view error notifications"
  ON public.error_notifications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  );

-- Fonction pour envoyer l'email au super admin via trigger
CREATE OR REPLACE FUNCTION public.notify_super_admin_on_error()
RETURNS TRIGGER AS $$
DECLARE
  super_admin_email TEXT;
  app_name TEXT := 'ERP BTP';
BEGIN
  -- Récupérer l'email du super admin
  SELECT email INTO super_admin_email
  FROM auth.users u
  JOIN public.profiles p ON u.id = p.id
  WHERE p.role = 'super_admin'
  LIMIT 1;

  -- Si pas de super admin, chercher un admin
  IF super_admin_email IS NULL THEN
    SELECT email INTO super_admin_email
    FROM auth.users u
    JOIN public.profiles p ON u.id = p.id
    WHERE p.role = 'admin'
    LIMIT 1;
  END IF;

  -- Mettre à jour le record pour indiquer qu'un email devrait être envoyé
  IF super_admin_email IS NOT NULL THEN
    NEW.email_sent := FALSE; -- Sera traité par la Edge Function
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour les nouvelles erreurs
DROP TRIGGER IF EXISTS on_error_notification_created ON public.error_notifications;
CREATE TRIGGER on_error_notification_created
  AFTER INSERT ON public.error_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_super_admin_on_error();

-- Table pour configurer les notifications (email du super admin)
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  super_admin_email TEXT,
  notify_on_error BOOLEAN DEFAULT TRUE,
  notify_on_critical_only BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO public.notification_settings (super_admin_email, notify_on_error, notify_on_critical_only)
VALUES (NULL, TRUE, TRUE)
ON CONFLICT DO NOTHING;

-- RLS pour notification_settings
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only super admins can manage notification settings"
  ON public.notification_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  );
