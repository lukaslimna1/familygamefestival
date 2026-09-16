# Preparação local

## Variáveis

Para o fluxo OAuth local, use `Evento/.env.local`. Esse arquivo é local, já é
ignorado pelo Git e não deve ser commitado. As variáveis Google usadas nesta
etapa são:

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- `GOOGLE_OAUTH_STATE_SECRET`

`GOOGLE_REFRESH_TOKEN` será preenchida automaticamente no `Evento/.env.local`
quando o callback local receber um refresh token. Ela nunca é exibida no
navegador nem no console. `GOOGLE_DRIVE_ROOT_FOLDER_ID` deve apontar para a
pasta existente `Family Game Festival 2026`; o código não cria uma nova raiz.
Para os scripts e para o servidor Astro, mantenha `TURSO_DATABASE_URL` e
`TURSO_AUTH_TOKEN` no `Evento/.env.local`. O projeto usa uma única base Turso;
o isolamento do trabalho acontece pelas branches Git.

O OAuth server-side local usa esta URI de callback:

`http://localhost:4321/api/admin/google-drive/callback`

Cadastre essa URI no Google Cloud em **URIs de redirecionamento autorizados**.
Como a autorização é feita no servidor, não é necessário cadastrar nada em
**Origens JavaScript autorizadas**.

Para iniciar o fluxo depois de configurar as variáveis, abra:

`http://localhost:4321/api/admin/google-drive/authorize`

O escopo solicitado pelo fluxo é exclusivamente
`https://www.googleapis.com/auth/drive.file`, com acesso offline e consentimento
explícito para que o Google possa emitir um refresh token. O callback valida o
`state` assinado e armazenado em cookie HttpOnly antes de trocar o código por
tokens. Nenhum token é enviado ao navegador ou escrito no console.

No desenvolvimento local, o callback valida o `state`, troca o código e grava
somente o refresh token no `.env.local` do projeto. A criação da pasta
`Family Game Festival 2026` será uma operação separada, depois de confirmar
que a credencial foi persistida.

A estrutura-base do Drive usa a pasta principal como raiz do evento, com uma
área `Campeonatos` e uma subpasta para cada campeonato cadastrado. Pastas de
inscrições individuais só devem ser criadas quando houver uma inscrição real e
ficam diretamente dentro da pasta do campeonato correspondente.

Para sincronizar o catálogo de campeonatos já existente com o banco único:

```powershell
Set-Location 'H:\00- Family Game Festival\Evento'
npm run db:sync-competitions
```

O comando somente aceita a raiz configurada, valida `Family Game Festival
2026/Campeonatos` e as 16 pastas existentes; não cria outra raiz.

## Banco Turso único

```powershell
Set-Location 'H:\00- Family Game Festival\Evento'
npm run db:migrate:dry
npm run db:migrate
```

O runner usa a mesma base Turso configurada no `Evento/.env.local`. A migração
cria as tabelas de participantes, competições,
inscrições, consentimentos, responsáveis, autorizações de menores, dados
específicos do cosplay, arquivos, administradores e sessões.

## Desenvolvimento

```powershell
Set-Location 'H:\00- Family Game Festival\Evento'
npm run dev
```

Nenhuma rota pública foi redesenhada nesta fase. A próxima etapa deve criar o
login e os endpoints administrativos somente depois de validar a conexão com
o banco Turso único.
