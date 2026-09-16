# Contrato da API de inscrições públicas

Este contrato é server-side e deve ser consumido pelo frontend público. A API não expõe credenciais do Turso ou Google Drive. O acesso posterior usa cookie `HttpOnly` emitido após a validação de código público + CPF.

## Regras comuns

- O identificador usado nas rotas é o `slug` presente em `src/config/competitions.json`.
- O código público é aleatório, único e usa o prefixo configurado, por exemplo `TEK-91D4BE` ou `MK1-4C82AF`.
- O limite padrão é 32 participantes por competição. O contador considera somente inscrições ativas daquela competição.
- Inscrições novas e alterações online ficam disponíveis até `18/09/2026 15:00` em `America/Sao_Paulo`. Depois disso, as rotas de alteração retornam `online_closed`/HTTP 410; o formulário pode continuar visível para exibir a orientação de atendimento presencial.
- Dados pessoais e aceites não podem ser alterados pelo acesso público. Redes sociais, links e dados específicos do Cosplay podem ser alterados enquanto o prazo estiver aberto.
- Para respostas JSON, envie `Accept: application/json` (ou `X-FGF-API: json`) quando indicado. Sem esse cabeçalho, as rotas de formulário retornam redirecionamento HTTP 303 para manter compatibilidade com o frontend atual.

## 1. Consultar status e limite

`GET /api/inscricoes/:slug/status`

Sem autenticação.

Resposta `200`:

```json
{
  "data": {
    "competition": {
      "id": "tekken-8",
      "slug": "tekken-8",
      "name": "Tekken 8",
      "category": "Fight Games",
      "eventDay": "DOMINGO",
      "eventDate": "2026-09-20",
      "startTime": "16h00"
    },
    "registration": {
      "registered": 0,
      "capacity": 32,
      "remaining": 32,
      "full": false,
      "onlineOpen": true,
      "deadline": "2026-09-18T18:00:00.000Z",
      "deadlineLabel": "18/09/2026 15:00",
      "onlineMessage": "Inscrições online abertas até 18/09/2026 15:00."
    }
  }
}
```

Resposta `404`: `{ "error": { "code": "not_found", "message": "..." } }`.

## 2. Criar inscrição

`POST /api/inscricoes/:slug`

Use `multipart/form-data` para manter o mesmo endpoint compatível com os arquivos do Cosplay. Campos comuns obrigatórios:

- `fullName`
- `dateOfBirth` (`AAAA-MM-DD`)
- `cpf`
- `city`
- `state`
- `consentRegulation=yes`
- `consentImage=yes`

Campos comuns opcionais:

- `phone`
- `email`
- `instagram`
- `tiktok`
- `facebook`
- `otherSocials`
- pares repetidos `referenceLinkLabel` + `referenceLinkUrl`

Para menores, enviar também `guardianFullName`, `guardianCpf`, `guardianPhone`, `guardianEmail` e `guardianRelationship`. O backend calcula a idade e exige o conjunto completo somente quando necessário. A primeira inscrição pode enviar múltiplos `authorizationCompetitionId`; todos os valores precisam existir em `src/config/competitions.json` e a competição atual sempre é incluída pelo servidor.

O backend normaliza os contatos antes de persistir: CPF fica somente com 11 dígitos e passa pela validação dos dois dígitos verificadores; telefone brasileiro fica no formato internacional sem pontuação (`+55DDDnúmero`). O formulário aceita CPF e telefone com ou sem pontuação, mas a validação server-side continua obrigatória. Telefone do participante pode ficar vazio; quando informado, deve conter DDD válido.

Cosplay acrescenta:

- `stageName` opcional;
- `stageCallName`, `characterName` e `sourceWork` obrigatórios;
- `stageName`, `cosplayDescription`, `presentationDescription`, `presentationNotes`, `technicalNotes`, `judgeNotes` e `musicTitle` opcionais;
- `consentPendrive=yes` obrigatório;
- `referenceFiles`: até 5 arquivos JPG, JPEG, PNG, WEBP ou PDF;
- `audioFile`: MP3, M4A ou WAV; MP4 não é aceito.

Registros comuns não aceitam campos nem arquivos específicos de Cosplay. O aceite da versão do regulamento é definido pelo servidor; o frontend não deve enviar uma versão confiável por conta própria.

Resposta JSON `201`:

```json
{
  "data": {
    "registrationId": "uuid",
    "publicCode": "TEK-91D4BE",
    "competitionId": "tekken-8",
    "eventAccessIncluded": true,
    "driveSyncStatus": "synced"
  }
}
```

Sem JSON, retorna `303 /inscricao/sucesso?code=...`.

Erros principais:

- `400 invalid`: campos, CPF, idade, responsável, aceite ou arquivo inválido;
- `409 full`: limite atingido;
- `409 duplicate`: CPF/competição já utilizado ou dados imutáveis conflitantes;
- `410 online_closed`: prazo encerrado;
- `404 not_found`: slug inexistente;
- `503 unavailable`: falha temporária de persistência.

## 3. Acessar inscrição

`POST /api/inscricao/acessar`

Sem autenticação prévia. Payload `application/x-www-form-urlencoded` ou `multipart/form-data`:

- `publicCode` obrigatório;
- `cpf` obrigatório.

Resposta JSON `200`:

```json
{ "data": { "authenticated": true, "redirect": "/inscricao/minha" } }
```

Sem JSON, retorna `303 /inscricao/minha` e define cookie de acesso privado. Após tentativas inválidas repetidas, retorna `429 rate`. Credenciais inválidas retornam `401 invalid` no modo JSON.

## 4. Obter dados da inscrição

`GET /api/inscricao/minha`

Exige o cookie privado emitido no acesso. Retorna `200` JSON com:

- registro e código público;
- participante, com CPF preservado no payload privado;
- competição e horário;
- responsável e autorização, quando aplicável;
- dados específicos do Cosplay, quando aplicável;
- links, aceites e metadados dos arquivos.

IDs do Google Drive e tokens não são retornados.

## 5. Atualizar campos permitidos

`POST /api/inscricao/minha`

Exige o cookie privado. Aceita `instagram`, `tiktok`, `facebook`, `otherSocials` e pares `referenceLinkLabel` + `referenceLinkUrl`.

Para Cosplay, aceita também os campos específicos de apresentação (`stageName`, `stageCallName`, `characterName`, `sourceWork`, `cosplayDescription`, `presentationDescription`, `presentationNotes`, `technicalNotes`, `judgeNotes` e `musicTitle`). Nome, nascimento, CPF, contato, cidade, estado, competição e aceites permanecem imutáveis no acesso público.

JSON: `200 { "data": { "saved": true } }`. Sem JSON: `303 /inscricao/minha?saved=1`.

## 6. Arquivos e autorização de menor

Todas as rotas abaixo exigem o cookie privado:

- `POST /api/inscricao/arquivo`: `fileType=guardian_authorization_signed` permite enviar ou substituir a autorização assinada para qualquer competição com menor. Para Cosplay, também aceita `cosplay_reference` e `cosplay_audio`.
- `POST /api/inscricao/autorizacao`: `action=physical_pending` registra que a autorização será entregue presencialmente.
- `GET /api/inscricao/arquivo/:id`: abre o arquivo privado pelo proxy server-side.
- `POST /api/inscricao/arquivo/:id`: `action=delete` remove arquivos públicos permitidos; documentos gerados pelo sistema não podem ser apagados.

Uploads e exclusões retornam `303 /inscricao/minha?file=1` em caso de sucesso ou `error=file` em caso de falha. O prazo online também se aplica a alterações, uploads, substituições e exclusões.

`GET /api/inscricao/autorizacao?format=blank` baixa o modelo em branco com as 16 competições. `GET /api/inscricao/autorizacao?format=filled` exige o cookie privado e gera a versão preenchida da autorização universal vigente do participante.

Uma autorização é identificada por `participant_id` e `version`, preserva `competitionIds` e pode ter status `pending`, `uploaded`, `physical_pending`, `received` ou `rejected`. Uma inscrição em competição já coberta por uma versão assinada reutiliza a autorização; uma nova competição fora da cobertura cria a próxima versão sem apagar o histórico.

Quando a inscrição é de menor, a mesma rotina compartilhada gera a autorização inicial, mantém o status (`pending`, `uploaded` ou `physical_pending`) e atualiza a ficha/PDF e o Drive da competição correta. O modelo definitivo do documento poderá ser substituído posteriormente sem criar outro fluxo.

## 7. Encerrar acesso

`POST /api/inscricao/logout`

Remove o cookie privado e retorna ao fluxo de acesso.

## Persistência e Drive

O mesmo motor grava todas as competições. Cada inscrição usa `competitions.drive_folder_id` e a chave idempotente `registration:<id>` dentro de:

`Family Game Festival 2026/Campeonatos/<competição>/<inscrição>`

O nome da pasta usa o código público como identidade técnica. Para Cosplay, o
padrão é `COS-XXXXXX - NOME COMPLETO - PERSONAGEM`; nas demais competições,
`CODIGO-XXXXXX - NOME COMPLETO`. Os nomes são sanitizados para o Drive.

O PDF da ficha é gerado para qualquer competição e usa `Ficha-Inscricao -`
seguido do nome da pasta. No Cosplay, referências e áudio ficam diretamente na
pasta da inscrição como `Referencia-01 - ...`, `Referencia-02 - ...` e
`Audio - ...`, preservando a extensão válida enviada. Autorizações usam
`Autorizacao-Menor - CODIGO - NOME.pdf` e, quando assinadas,
`Autorizacao-Menor-Assinada - CODIGO - NOME.ext`, sem personagem. As demais
competições não aceitam nem criam referências ou áudio. Retries atualizam os
arquivos/pastas identificados por chave, sem criar duplicatas.
