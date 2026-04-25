alter table public.app_settings
  add column if not exists transaction_amount_min_usd numeric(14,2),
  add column if not exists transaction_amount_max_usd numeric(14,2),
  add column if not exists transaction_amount_min_iqd numeric(14,2),
  add column if not exists transaction_amount_max_iqd numeric(14,2);

alter table public.app_settings
  drop constraint if exists app_settings_transaction_amount_min_usd_check,
  drop constraint if exists app_settings_transaction_amount_max_usd_check,
  drop constraint if exists app_settings_transaction_amount_min_iqd_check,
  drop constraint if exists app_settings_transaction_amount_max_iqd_check,
  drop constraint if exists app_settings_transaction_amount_usd_range_check,
  drop constraint if exists app_settings_transaction_amount_iqd_range_check;

alter table public.app_settings
  add constraint app_settings_transaction_amount_min_usd_check
    check (transaction_amount_min_usd is null or transaction_amount_min_usd >= 0),
  add constraint app_settings_transaction_amount_max_usd_check
    check (transaction_amount_max_usd is null or transaction_amount_max_usd >= 0),
  add constraint app_settings_transaction_amount_min_iqd_check
    check (transaction_amount_min_iqd is null or transaction_amount_min_iqd >= 0),
  add constraint app_settings_transaction_amount_max_iqd_check
    check (transaction_amount_max_iqd is null or transaction_amount_max_iqd >= 0),
  add constraint app_settings_transaction_amount_usd_range_check
    check (
      transaction_amount_min_usd is null
      or transaction_amount_max_usd is null
      or transaction_amount_min_usd <= transaction_amount_max_usd
    ),
  add constraint app_settings_transaction_amount_iqd_range_check
    check (
      transaction_amount_min_iqd is null
      or transaction_amount_max_iqd is null
      or transaction_amount_min_iqd <= transaction_amount_max_iqd
    );
