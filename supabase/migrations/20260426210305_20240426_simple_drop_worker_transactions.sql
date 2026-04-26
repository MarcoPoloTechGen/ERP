-- Simple migration to drop worker_transactions table
-- All worker transactions are now handled by party_transactions with party_type = 'worker'

DROP VIEW IF EXISTS app_worker_transactions;
DROP TABLE IF EXISTS worker_transactions CASCADE;