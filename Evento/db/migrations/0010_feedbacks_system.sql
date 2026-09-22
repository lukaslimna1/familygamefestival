CREATE TABLE IF NOT EXISTS feedbacks (
  id TEXT PRIMARY KEY NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('sugestao', 'elogio', 'reclamacao')),
  estrelas INTEGER NOT NULL CHECK (estrelas >= 1 AND estrelas <= 5),
  categoria TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  anonimo INTEGER NOT NULL DEFAULT 0 CHECK (anonimo IN (0, 1)),
  nome TEXT,
  email TEXT,
  telefone TEXT,
  permite_contato INTEGER NOT NULL DEFAULT 0 CHECK (permite_contato IN (0, 1)),
  autorizacao_publicacao TEXT NOT NULL DEFAULT 'nao' CHECK (autorizacao_publicacao IN ('nome', 'anonimo', 'nao')),
  nome_publico TEXT,
  status TEXT NOT NULL DEFAULT 'novo' CHECK (status IN ('novo', 'lido', 'em_analise', 'respondido', 'resolvido', 'arquivado')),
  resposta TEXT,
  respondido_por TEXT,
  respondido_em TEXT,
  nota_interna TEXT,
  publicado_site INTEGER NOT NULL DEFAULT 0 CHECK (publicado_site IN (0, 1)),
  texto_publico TEXT,
  destaque INTEGER NOT NULL DEFAULT 0 CHECK (destaque IN (0, 1)),
  criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS feedbacks_status_idx
  ON feedbacks (status, criado_em);

CREATE INDEX IF NOT EXISTS feedbacks_tipo_idx
  ON feedbacks (tipo, criado_em);

CREATE INDEX IF NOT EXISTS feedbacks_publicado_site_idx
  ON feedbacks (publicado_site, destaque, criado_em);

CREATE INDEX IF NOT EXISTS feedbacks_categoria_idx
  ON feedbacks (categoria);
