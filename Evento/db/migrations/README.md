# Migrações do banco

As migrações desta pasta são versionadas e executadas em ordem pelo comando
`npm run db:migrate`. O runner registra cada arquivo aplicado em
`schema_migrations` e não reaplica versões já executadas.

O projeto utiliza uma única base Turso para desenvolvimento e publicação.
O runner lê `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN` do arquivo local
`Evento/.env.local`, que permanece fora do Git.

Para adicionar uma alteração, crie o próximo arquivo sequencial, por exemplo
`0002_add_competition_limits.sql`. Não edite uma migração já aplicada.
