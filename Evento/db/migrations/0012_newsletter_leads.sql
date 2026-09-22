CREATE TABLE IF NOT EXISTS newsletter_leads (
  id TEXT PRIMARY KEY NOT NULL,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  origem TEXT NOT NULL DEFAULT 'home_pos_evento',
  criado_em TEXT NOT NULL,
  atualizado_em TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS newsletter_leads_email_unique ON newsletter_leads(email);
CREATE INDEX IF NOT EXISTS newsletter_leads_criado_em_idx ON newsletter_leads(criado_em);
