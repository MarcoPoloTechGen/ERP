# Send Error Notification Edge Function

## Manual Deployment Steps (No CLI required)

### Step 1: Create the Function in Supabase Dashboard

1. Go to your Supabase Project Dashboard: https://app.supabase.com/project/_/functions
2. Click "New Function"
3. Name: `send-error-notification`
4. Copy and paste the content from `index.ts` into the editor
5. Click "Deploy"

### Step 2: Set Environment Variables

1. Go to Project Settings → Edge Functions
2. Add these secrets:
   - `RESEND_API_KEY` = `re_xxxxxxxxxxxxxxxxxxxxxxxx` (your Resend API key)
   - `FROM_EMAIL` = `noreply@yourdomain.com`

### Step 3: Test the Function

Run this SQL in the SQL Editor to test:

```sql
-- Insert a test error
INSERT INTO public.error_notifications (
    error_type,
    error_message,
    error_details,
    user_email,
    page_url
) VALUES (
    'server',
    'Test error message',
    '{"test": true}',
    'test@example.com',
    'https://yourapp.com/test'
);
```

### Step 4: Configure Super Admin Email

1. Go to your app → Admin page
2. Find "Notifications d'erreur" section
3. Enter the super admin email
4. Click Save

## Alternative: Deploy via Zip Upload

If you prefer, you can zip the `send-error-notification` folder and upload it via the Dashboard.

## Troubleshooting

- **Email not sending**: Check that `RESEND_API_KEY` is set correctly
- **Domain not verified**: Verify your domain in Resend dashboard first
- **Function not found**: Make sure the function name matches exactly: `send-error-notification`
