# Painel administrativo e inscrições — arquitetura base

## Auditoria do projeto existente

- Repositório: `H:\00- Family Game Festival`.
- Aplicação publicada: `H:\00- Family Game Festival\Evento`.
- Stack real encontrada: Astro 7.3.2 + TypeScript-like frontmatter `.astro`.
- Configuração anterior: site estático com `output: 'static'`.
- Configuração da Vercel: projeto `familygamefestival`, framework Astro e
  `rootDirectory: Evento`.
- Rotas públicas existentes: home, cronograma, campeonatos por dia e por
  modalidade, patrocinadores, expositores, press kit e regulamento do cosplay.
- Dados atuais: arquivos estáticos em `src/data` e assets públicos em
  `public/assets`.
- Não havia API, banco, migrações, autenticação, área administrativa ou
  integração com Google Drive.
- A especificação recebida menciona Next.js, mas não há Next.js neste
  repositório. Converter o site inteiro seria uma mudança de alto risco e não
  é necessária para preservar o site público.

## Decisão arquitetural

O site público continua em Astro. A aplicação agora usa o adapter oficial da
Vercel e `output: 'server'` para permitir futuras rotas protegidas e endpoints
server-side, mantendo as rotas e o sistema visual existentes sem redesign.

Todo código sensível ficará em `src/lib/server` e não poderá ser importado por
componentes client-side. O fluxo planejado é:

```text
formulário público
  -> validação server-side
  -> Turso (registro + consentimentos)
  -> fila/status drive_pending
  -> sincronização idempotente no Google Drive
  -> painel administrativo protegido
```

O Turso é a fonte de verdade do cadastro. O Google Drive armazena documentos,
referências, áudio e PDFs; arquivos binários não serão colocados no banco.

O catálogo canônico de campeonatos fica em `src/config/competitions.json`.
Ele é consumido pelos dados públicos e pelos scripts de sincronização, evitando
que um campeonato seja cadastrado com nomes, horários ou pastas divergentes.

A tabela `competitions` também reserva os parâmetros editáveis de cada
modalidade: limites de participantes, mínimo para premiação, quantidade/tamanho
de referências e tipos/tamanho de áudio. Isso permite configurar Cosplay e
modalidades futuras sem criar colunas como `imagem1` e `imagem2`.

## Estrutura criada nesta etapa

```text
Evento/
├─ db/migrations/0001_initial_schema.sql
├─ db/migrations/0002_competition_drive_links.sql
├─ db/migrations/0003_admin_usernames.sql
├─ db/migrations/0004_admin_force_password_change.sql
├─ scripts/admin-create.ts
├─ scripts/db-migrate.mjs
├─ scripts/sync-competitions.mjs
├─ scripts/test-admin-auth.ts
├─ scripts/test-registration-drive.ts
├─ src/config/competitions.json
├─ src/lib/server/
│  ├─ auth/password.ts
│  ├─ auth/admin-repository.ts
│  ├─ auth/login-rate-limit.ts
│  ├─ auth/session.ts
│  ├─ config/env.ts
│  ├─ db/client.ts
│  ├─ db/repository.ts
│  ├─ db/schema.ts
│  └─ drive/
│     ├─ client.ts
│     ├─ folders.ts
│     └─ registration-sync.ts
│  └─ pdf/
│     └─ registration-sheet.ts
└─ docs/
   ├─ admin-panel-architecture.md
   └─ admin-panel-setup.md
```

## Autenticação administrativa implementada

O acesso administrativo usa username e senha validados exclusivamente no
servidor. Senhas são armazenadas com bcrypt; o banco guarda apenas o hash. O
login cria um JWT curto com identificador de sessão, mas a autorização efetiva
exige também uma linha ativa correspondente em `admin_sessions`. Assim, logout,
troca de senha, expiração e revogação invalidam a sessão no banco.

As rotas `/admin/*` e `/api/admin/*` são protegidas pelo middleware, com exceção
de `/admin/login` e `/api/admin/login`. A sessão é enviada em cookie HttpOnly,
SameSite=Lax, com Secure em HTTPS/produção. O limite básico de tentativas fica
em memória por instância para reduzir abuso sem adicionar outro serviço nesta
etapa.

O administrador não é criado automaticamente: `npm run admin:create` é o
bootstrap interativo para que o responsável escolha as credenciais. A coluna
`admins.email` legada recebe apenas um identificador interno derivado do
username; ela não é usada como credencial nem é exibida no frontend.

A coluna `admins.must_change_password` controla o primeiro acesso. Quando
verdadeira, a sessão é criada normalmente, mas o middleware permite somente a
troca de senha e o logout. Depois de um novo hash ser salvo, a flag volta para
falsa, todas as sessões do administrador são revogadas e o login é solicitado
novamente.

## Estado e pendências

- Branch local: `feature/admin-panel`.
- Nenhum push, merge, deploy ou alteração no `main` foi realizado.
- A migração será aplicada na única base Turso do projeto, usada tanto durante
  o desenvolvimento local quanto após a publicação.
- A migration `0002_competition_drive_links.sql` adiciona somente os vínculos
  necessários: pasta Drive da competição, código público da inscrição e pasta
  Drive da inscrição. O catálogo sincronizado contém 16 competições e 16 IDs
  de pastas Drive únicos.
- A integração oficial usa `@libsql/client` no servidor Astro e lê somente
  `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN` do ambiente local.
- O Google Drive usa OAuth2 server-side e a raiz existente
  `Family Game Festival 2026/Campeonatos`. As pastas de participantes são
  criadas somente dentro da pasta da própria competição, com chave idempotente.
- A sincronização registra `drive_pending`, `drive_syncing`, `synced` ou
  `failed` no Turso. O teste técnico criou e removeu uma inscrição fictícia de
  Tekken 8, incluindo sua pasta e seu PDF de teste.
- Lucas Lima e Juruna continuam previstos como os primeiros administradores,
  mas nenhuma conta real foi criada automaticamente. Eles devem ser criados
  manualmente com `npm run admin:create` após a revisão; a senha temporária de
  Juruna deve usar a opção de troca obrigatória.
- O painel inicial protegido contém somente os espaços de Inscrições, Cosplay,
  Menores e Configurações, além de troca de senha e logout. Formulários
  públicos e regras específicas de cada campeonato continuam fora desta etapa.
- A geração de PDF validada agora é apenas a base server-side do fluxo de teste
  e não é um PDF oficial público.
