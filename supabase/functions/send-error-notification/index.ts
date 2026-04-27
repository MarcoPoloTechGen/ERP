// Edge Function pour envoyer des notifications d'erreur au super admin
// Utilise Resend ou tout autre service d'email

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'noreply@btp-erp.com'

serve(async (req) => {
  // Vérifier la méthode
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const { error_notification_id } = await req.json()

    if (!error_notification_id) {
      return new Response(
        JSON.stringify({ error: 'Missing error_notification_id' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Créer client Supabase avec service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Récupérer les détails de l'erreur
    const { data: errorNotification, error: fetchError } = await supabaseClient
      .from('error_notifications')
      .select('*')
      .eq('id', error_notification_id)
      .single()

    if (fetchError || !errorNotification) {
      return new Response(
        JSON.stringify({ error: 'Error notification not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Récupérer l'email du super admin depuis les settings
    const { data: settings, error: settingsError } = await supabaseClient
      .from('notification_settings')
      .select('super_admin_email, notify_on_error, notify_on_critical_only')
      .single()

    if (settingsError || !settings?.notify_on_error) {
      return new Response(
        JSON.stringify({ message: 'Notifications disabled' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Si critical_only, vérifier si l'erreur est critique
    if (settings.notify_on_critical_only) {
      const criticalTypes = ['server', 'auth', 'permission']
      if (!criticalTypes.includes(errorNotification.error_type)) {
        return new Response(
          JSON.stringify({ message: 'Non-critical error, email not sent' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    const adminEmail = settings.super_admin_email
    if (!adminEmail) {
      // Fallback: chercher un super admin dans la base
      const { data: admin } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('role', 'super_admin')
        .limit(1)
        .single()

      if (!admin) {
        return new Response(
          JSON.stringify({ error: 'No admin email configured' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // Récupérer l'email depuis auth.users
      const { data: userData } = await supabaseClient.auth.admin.getUserById(admin.id)
      if (!userData?.user?.email) {
        return new Response(
          JSON.stringify({ error: 'Could not find admin email' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    // Construire l'email
    const emailHtml = buildEmailHtml(errorNotification)

    // Envoyer l'email via Resend
    if (RESEND_API_KEY) {
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `ERP BTP <${FROM_EMAIL}>`,
          to: [adminEmail],
          subject: `🚨 Erreur ${errorNotification.error_type} - ERP BTP`,
          html: emailHtml,
        }),
      })

      if (!resendResponse.ok) {
        const errorData = await resendResponse.text()
        console.error('Resend error:', errorData)
        return new Response(
          JSON.stringify({ error: 'Failed to send email', details: errorData }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }
    } else {
      // Mode dev: logger l'email
      console.log('=== EMAIL TO ADMIN ===')
      console.log('To:', adminEmail)
      console.log('Subject:', `🚨 Erreur ${errorNotification.error_type} - ERP BTP`)
      console.log('Body:', emailHtml)
      console.log('=======================')
    }

    // Mettre à jour le statut
    await supabaseClient
      .from('error_notifications')
      .update({ email_sent: true, email_sent_at: new Date().toISOString() })
      .eq('id', error_notification_id)

    return new Response(
      JSON.stringify({ success: true, message: 'Notification sent' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

function buildEmailHtml(error: any): string {
  const errorDetails = error.error_details ? JSON.stringify(error.error_details, null, 2) : 'N/A'
  const date = new Date(error.created_at).toLocaleString('fr-FR')

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .field { margin-bottom: 12px; }
    .label { font-weight: 600; color: #6b7280; font-size: 12px; text-transform: uppercase; }
    .value { font-family: monospace; background: #fff; padding: 8px; border-radius: 4px; margin-top: 4px; }
    .error-message { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 12px; border-radius: 4px; }
    .footer { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px; }
    pre { overflow-x: auto; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚨 Alerte Erreur ERP BTP</h1>
      <p>Une erreur a été détectée dans l'application</p>
    </div>
    <div class="content">
      <div class="error-message">
        <strong>${escapeHtml(error.error_message)}</strong>
      </div>

      <div class="field">
        <div class="label">Type d'erreur</div>
        <div class="value">${escapeHtml(error.error_type)}</div>
      </div>

      <div class="field">
        <div class="label">Date</div>
        <div class="value">${date}</div>
      </div>

      <div class="field">
        <div class="label">Utilisateur</div>
        <div class="value">${error.user_email || 'Non connecté'} (ID: ${error.user_id || 'N/A'})</div>
      </div>

      <div class="field">
        <div class="label">URL</div>
        <div class="value">${escapeHtml(error.url || 'N/A')}</div>
      </div>

      <div class="field">
        <div class="label">User Agent</div>
        <div class="value">${escapeHtml(error.user_agent || 'N/A')}</div>
      </div>

      <div class="field">
        <div class="label">Détails</div>
        <div class="value"><pre>${escapeHtml(errorDetails)}</pre></div>
      </div>
    </div>
    <div class="footer">
      <p>ERP BTP - Notification automatique</p>
      <p>Si vous ne souhaitez plus recevoir ces emails, modifiez les paramètres dans l'application.</p>
    </div>
  </div>
</body>
</html>
  `
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
