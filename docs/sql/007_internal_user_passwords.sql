-- Internal users can now log in with password (not just SSO)
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS first_access_at TIMESTAMPTZ;

-- Link users to their operational location
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS local_id UUID REFERENCES locais(id);
