alter table public.app_settings
  drop constraint if exists app_settings_exchange_rate_iqd_per_100_usd_check;

alter table public.app_settings
  add constraint app_settings_exchange_rate_iqd_per_100_usd_check
  check (
    exchange_rate_iqd_per_100_usd is null
    or exchange_rate_iqd_per_100_usd between 100000 and 1000000
  );
