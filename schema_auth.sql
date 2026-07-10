-- ============================================================================
-- CoupleMed — schema_auth.sql  (v53)
-- Tabela de usuários. Senhas com hash PBKDF2-SHA256, nunca em texto puro.
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  uid          TEXT PRIMARY KEY,
  login        TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'user',
  pass_hash    TEXT NOT NULL,
  salt         TEXT NOT NULL,
  iterations   INTEGER NOT NULL DEFAULT 50000,
  blocked      INTEGER NOT NULL DEFAULT 0,
  updated_at   INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_login ON users (login);
