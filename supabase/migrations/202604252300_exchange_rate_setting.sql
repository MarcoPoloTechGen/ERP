alter table public.app_settings
  add column if not exists exchange_rate_iqd_per_100_usd numeric(14,2);

alter table public.app_settings
  drop constraint if exists app_settings_exchange_rate_iqd_per_100_usd_check;

alter table public.app_settings
  add constraint app_settings_exchange_rate_iqd_per_100_usd_check
  check (exchange_rate_iqd_per_100_usd is null or exchange_rate_iqd_per_100_usd >= 0);
