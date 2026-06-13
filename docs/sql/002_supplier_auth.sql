-- Suppliers authenticate by password (no external IdP). Add the hash column and
-- relax external_subject so password users don't need a federated subject.
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE app_users ALTER COLUMN external_subject DROP NOT NULL;

-- external_subject stays unique only when present.
ALTER TABLE app_users DROP CONSTRAINT IF EXISTS app_users_external_subject_key;
CREATE UNIQUE INDEX IF NOT EXISTS app_users_external_subject_key
  ON app_users (external_subject) WHERE external_subject IS NOT NULL;

-- A user must have either a password or an external subject.
ALTER TABLE app_users DROP CONSTRAINT IF EXISTS app_users_auth_method_chk;
ALTER TABLE app_users ADD CONSTRAINT app_users_auth_method_chk
  CHECK (password_hash IS NOT NULL OR external_subject IS NOT NULL);
