import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { and, eq } from 'drizzle-orm';
import { PDFDocument } from 'pdf-lib';
import competitionDefinitions from '../src/config/competitions.json';
import { getDatabase } from '../src/lib/server/db/client';
import { guardians, minorAuthorizations, participants, registrationFiles, registrationLinks, registrations, consents, competitions } from '../src/lib/server/db/schema';
import { createRegistrationDraft } from '../src/lib/server/db/repository';
import { getDriveClient } from '../src/lib/server/drive/client';
import { syncRegistrationToDrive } from '../src/lib/server/drive/registration-sync';

const projectDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const localEnvFile = join(projectDirectory, '.env.local');
if (existsSync(localEnvFile) && typeof process.loadEnvFile === 'function') process.loadEnvFile(localEnvFile);

const baseUrl = process.env.FGF_TEST_BASE_URL ?? 'http://localhost:4321';
const database = getDatabase();
const fakeAdultCpf = `8${Date.now().toString().slice(-10)}`;
const fakeMinorCpf = `7${(Date.now() + 1).toString().slice(-10)}`;
const fakeGuardianCpf = `6${(Date.now() + 2).toString().slice(-10)}`;
const runId = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
const adultEmail = `public-registration-adult-${runId}@example.invalid`;
const minorEmail = `public-registration-minor-${runId}@example.invalid`;
const competitionId = 'cosplay';
const registrationIds: string[] = [];
const participantIds: string[] = [];
const driveFolderIds: string[] = [];

function assertCondition(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function getLocation(response: Response) {
  const location = response.headers.get('location');
  assertCondition(location, `Resposta sem Location (status ${response.status}).`);
  return location;
}

function getCookie(response: Response) {
  const setCookie = response.headers.get('set-cookie');
  assertCondition(setCookie, 'A autenticação pública não devolveu cookie de acesso.');
  return setCookie.split(';', 1)[0];
}

async function createFormRegistration() {
  const form = new FormData();
  form.set('fullName', 'TESTE PUBLICO ADULTO - REMOVER');
  form.set('dateOfBirth', '2000-01-01');
  form.set('cpf', fakeAdultCpf);
  form.set('phone', '+5514999990000');
  form.set('email', adultEmail);
  form.set('city', 'Bauru');
  form.set('state', 'SP');
  form.set('instagram', '@teste-publico');
  form.set('stageName', 'Cosplayer Teste');
  form.set('stageCallName', 'Teste Público');
  form.set('characterName', 'Jinx');
  form.set('sourceWork', 'League of Legends');
  form.set('cosplayDescription', 'Registro fictício automatizado para validação técnica.');
  form.set('presentationDescription', 'Apresentação fictícia de teste.');
  form.set('presentationNotes', 'Não utilizar em produção.');
  form.set('musicTitle', 'Áudio fictício');
  form.set('referenceLinkLabel', 'Referência de teste');
  form.set('referenceLinkUrl', 'https://example.invalid/referencia');
  form.set('consentRegulation', 'yes');
  form.set('consentImage', 'yes');
  form.set('consentPendrive', 'yes');

  const response = await fetch(`${baseUrl}/api/inscricoes/cosplay`, { method: 'POST', body: form, headers: { Origin: baseUrl }, redirect: 'manual' });
  assertCondition(response.status === 303, `O envio público deveria redirecionar, recebeu ${response.status}: ${(await response.text()).slice(0, 240)}`);
  const location = new URL(getLocation(response));
  const code = location.searchParams.get('code');
  assertCondition(typeof code === 'string' && code.startsWith('COS-') && /^COS-[0-9A-F]{6}$/.test(code), 'O código público não segue o formato COS-XXXXXX.');
  const cookie = getCookie(await fetch(`${baseUrl}/api/inscricao/acessar`, {
    method: 'POST',
    body: (() => {
      const accessForm = new FormData();
      accessForm.set('publicCode', code);
      accessForm.set('cpf', fakeAdultCpf);
      return accessForm;
    })(),
    headers: { Origin: baseUrl },
    redirect: 'manual'
  }));
  const mine = await fetch(`${baseUrl}/api/inscricao/minha`, { headers: { Cookie: cookie, Accept: 'application/json' } });
  assertCondition(mine.status === 200, 'A API Minha inscrição não abriu após o acesso por código + CPF.');
  const minePayload = await mine.json() as { data?: { participant?: { fullName?: string } } };
  assertCondition(minePayload.data?.participant?.fullName === 'TESTE PUBLICO ADULTO - REMOVER', 'A API Minha inscrição não exibiu o participante de teste.');

  const updateForm = new FormData();
  updateForm.set('instagram', '@teste-publico-atualizado');
  updateForm.set('tiktok', 'teste-publico');
  updateForm.set('facebook', '');
  updateForm.set('otherSocials', 'https://example.invalid/outra');
  updateForm.set('stageName', 'Cosplayer Teste Atualizado');
  updateForm.set('stageCallName', 'Teste Público');
  updateForm.set('characterName', 'Jinx');
  updateForm.set('sourceWork', 'League of Legends');
  updateForm.set('cosplayDescription', 'Descrição fictícia atualizada.');
  updateForm.set('presentationDescription', 'Apresentação atualizada.');
  updateForm.set('presentationNotes', 'Observação atualizada.');
  updateForm.set('musicTitle', 'Áudio fictício atualizado');
  updateForm.set('referenceLinkLabel', 'Referência atualizada');
  updateForm.set('referenceLinkUrl', 'https://example.invalid/atualizada');
  const updateResponse = await fetch(`${baseUrl}/api/inscricao/minha`, { method: 'POST', body: updateForm, headers: { Cookie: cookie, Origin: baseUrl }, redirect: 'manual' });
  assertCondition(updateResponse.status === 303 && getLocation(updateResponse).includes('saved=1'), 'A atualização pública permitida não foi concluída.');

  const invalidAccessForm = new FormData();
  invalidAccessForm.set('publicCode', code);
  invalidAccessForm.set('cpf', '00000000000');
  const invalidAccess = await fetch(`${baseUrl}/api/inscricao/acessar`, { method: 'POST', body: invalidAccessForm, headers: { Origin: baseUrl }, redirect: 'manual' });
  assertCondition(invalidAccess.status === 303 && getLocation(invalidAccess).includes('error=invalid'), 'CPF inválido não foi rejeitado.');

  const [adult] = await database.select({ id: registrations.id, participantId: registrations.participantId, driveFolderId: registrations.driveFolderId }).from(registrations).innerJoin(participants, eq(registrations.participantId, participants.id)).where(eq(participants.cpf, fakeAdultCpf)).limit(1);
  assertCondition(adult, 'O registro público adulto não foi encontrado no Turso.');
  assertCondition(adult.driveFolderId, 'A pasta da inscrição Cosplay não foi criada no Drive.');
  registrationIds.push(adult.id);
  participantIds.push(adult.participantId);
  driveFolderIds.push(adult.driveFolderId);

  const drive = getDriveClient();
  const adultFolder = (await drive.files.get({ fileId: adult.driveFolderId, fields: 'id,name' })).data;
  const expectedAdultFolderName = `${code} - TESTE PUBLICO ADULTO - REMOVER - Jinx`;
  assertCondition(adultFolder.name === expectedAdultFolderName, 'A pasta Cosplay deve usar código + nome completo + personagem, sem nome artístico.');

  const uploadFile = async (fileType: string, name: string, type: string, content: string) => {
    const uploadForm = new FormData();
    uploadForm.set('fileType', fileType);
    uploadForm.set('file', new File([content], name, { type }));
    const response = await fetch(`${baseUrl}/api/inscricao/arquivo`, { method: 'POST', body: uploadForm, headers: { Cookie: cookie, Origin: baseUrl }, redirect: 'manual' });
    assertCondition(response.status === 303 && getLocation(response).includes('file=1'), `O upload de ${fileType} não foi concluído.`);
  };
  await uploadFile('cosplay_reference', 'referencia-teste.png', 'image/png', 'PNG-TESTE-FICTICIO');
  await uploadFile('cosplay_audio', 'apresentacao-teste.mp3', 'audio/mpeg', 'AUDIO-TESTE-FICTICIO-1');
  const [firstAudio] = await database.select({ id: registrationFiles.id, driveFileId: registrationFiles.driveFileId, contentHash: registrationFiles.contentHash }).from(registrationFiles).where(and(eq(registrationFiles.registrationId, adult.id), eq(registrationFiles.fileType, 'cosplay_audio'))).limit(1);
  assertCondition(firstAudio?.driveFileId, 'O áudio posterior não foi persistido no Drive.');
  await uploadFile('cosplay_audio', 'apresentacao-teste-substituta.mp3', 'audio/mpeg', 'AUDIO-TESTE-FICTICIO-2');
  const audioRows = await database.select({ id: registrationFiles.id, fileType: registrationFiles.fileType, originalName: registrationFiles.originalName, driveFileId: registrationFiles.driveFileId, drivePath: registrationFiles.drivePath, contentHash: registrationFiles.contentHash }).from(registrationFiles).where(eq(registrationFiles.registrationId, adult.id));
  const audioAfterReplacement = audioRows.find((file) => file.id === firstAudio.id);
  assertCondition(audioRows.length === 3 && audioAfterReplacement?.driveFileId === firstAudio.driveFileId && audioAfterReplacement.contentHash !== firstAudio.contentHash, 'A substituição do áudio criou linhas incorretas ou não atualizou o arquivo.');
  assertCondition(audioAfterReplacement, 'O áudio substituído não foi encontrado.');
  const reference = audioRows.find((file) => file.id !== firstAudio.id && file.id !== audioAfterReplacement.id);
  assertCondition(reference, 'A referência posterior não foi persistida.');
  const expectedReferenceName = `Referencia-01 - ${expectedAdultFolderName}.png`;
  const expectedAudioName = `Audio - ${expectedAdultFolderName}.mp3`;
  assertCondition(reference.drivePath?.endsWith(`/${expectedReferenceName}`), 'A referência não segue o padrão sequencial de nomenclatura.');
  assertCondition(audioAfterReplacement.drivePath?.endsWith(`/${expectedAudioName}`), 'O áudio não segue o padrão oficial de nomenclatura.');
  assertCondition(!reference.drivePath?.includes('/Referencias/'), 'A referência não deve ficar em subpasta.');
  assertCondition(reference.drivePath?.endsWith(`/${expectedReferenceName}`), 'O caminho da referência não aponta diretamente para a pasta da inscrição.');
  const referenceMetadata = (await drive.files.get({ fileId: reference.driveFileId!, fields: 'name,parents' })).data;
  const audioMetadata = (await drive.files.get({ fileId: audioAfterReplacement.driveFileId!, fields: 'name,parents' })).data;
  assertCondition(referenceMetadata.name === expectedReferenceName && referenceMetadata.parents?.includes(adult.driveFolderId), 'A referência não está com nome ou localização oficial no Drive.');
  assertCondition(audioMetadata.name === expectedAudioName && audioMetadata.parents?.includes(adult.driveFolderId), 'O áudio não está com nome ou localização oficial no Drive.');
  const deleteReferenceForm = new FormData();
  deleteReferenceForm.set('action', 'delete');
  const deleteReference = await fetch(`${baseUrl}/api/inscricao/arquivo/${reference.id}`, { method: 'POST', body: deleteReferenceForm, headers: { Cookie: cookie, Origin: baseUrl }, redirect: 'manual' });
  assertCondition(deleteReference.status === 303 && getLocation(deleteReference).includes('file=1'), 'A remoção da referência não foi concluída.');
  const remainingReferences = await database.select({ id: registrationFiles.id }).from(registrationFiles).where(eq(registrationFiles.registrationId, adult.id));
  assertCondition(remainingReferences.length === 2, 'A remoção da referência não refletiu no banco.');
  return code;
}

async function createMinorRegistration() {
  const created = await createRegistrationDraft({
    participant: {
      fullName: 'TESTE PUBLICO MENOR - REMOVER',
      cpf: fakeMinorCpf,
      phone: '+5514999990001',
      email: minorEmail,
      dateOfBirth: '2012-01-01',
      city: 'Bauru',
      state: 'SP'
    },
    competitionId,
    guardian: {
      fullName: 'RESPONSAVEL TESTE - REMOVER',
      cpf: fakeGuardianCpf,
      phone: '+5514999990002',
      email: `public-registration-guardian-${runId}@example.invalid`,
      relationship: 'Responsável legal'
    },
    consents: [
      { type: 'competition_regulation', granted: true, policyVersion: 'cosplay-2026-v1' },
      { type: 'image_use', granted: true, policyVersion: 'image-use-2026-v1' },
      { type: 'pendrive_backup', granted: true, policyVersion: 'pendrive-backup-2026-v1' }
    ],
    cosplay: {
      stageName: 'Menor Teste',
      stageCallName: 'Menor Teste',
      characterName: 'Kirby',
      sourceWork: 'Kirby',
      presentationType: 'Apresentação individual',
      cosplayDescription: 'Registro fictício de menor para teste.',
      presentationDescription: 'Apresentação fictícia.',
      presentationNotes: 'Teste automatizado.'
    }
  });
  registrationIds.push(created.registrationId);
  participantIds.push(created.participantId);
  const synced = await syncRegistrationToDrive(created.registrationId);
  driveFolderIds.push(synced.registrationFolderId);
  const [minor] = await database.select({ status: minorAuthorizations.status }).from(minorAuthorizations).where(eq(minorAuthorizations.registrationId, created.registrationId)).limit(1);
  assertCondition(minor?.status === 'pending', 'A autorização do menor não iniciou como pending.');
  const generatedAuthorization = await database.select({ fileType: registrationFiles.fileType, originalName: registrationFiles.originalName, driveFileId: registrationFiles.driveFileId }).from(registrationFiles).where(eq(registrationFiles.registrationId, created.registrationId)).limit(10);
  const authorizationFile = generatedAuthorization.find((file) => file.fileType === 'guardian_authorization');
  const expectedMinorFolderName = `${created.publicCode} - TESTE PUBLICO MENOR - REMOVER - Kirby`;
  const expectedAuthorizationName = `Autorizacao-Menor - ${created.publicCode} - TESTE PUBLICO MENOR - REMOVER.pdf`;
  assertCondition(authorizationFile?.driveFileId && authorizationFile.originalName === expectedAuthorizationName, 'A autorização do menor não segue o padrão oficial de nomenclatura.');
  const minorFolder = (await getDriveClient().files.get({ fileId: synced.registrationFolderId, fields: 'name' })).data;
  assertCondition(minorFolder.name === expectedMinorFolderName, 'A pasta Cosplay de menor não inclui exatamente o personagem esperado.');
  const authorizationMetadata = (await getDriveClient().files.get({ fileId: authorizationFile.driveFileId, fields: 'name,parents' })).data;
  assertCondition(authorizationMetadata.name === expectedAuthorizationName && authorizationMetadata.parents?.includes(synced.registrationFolderId), 'A autorização do menor não está diretamente na pasta da inscrição.');
  return created.publicCode;
}

async function removeDriveFolder(drive: ReturnType<typeof getDriveClient>, folderId: string) {
  const children = await drive.files.list({
    q: `'${folderId.replace(/'/g, "\\'")}' in parents and trashed = false`,
    spaces: 'drive',
    pageSize: 100,
    fields: 'files(id,name,parents,mimeType,appProperties)'
  });
  for (const child of children.data.files ?? []) {
    if (!child.id || child.parents?.includes(folderId) !== true) continue;
    if (child.mimeType === 'application/vnd.google-apps.folder') await removeDriveFolder(drive, child.id);
    else await drive.files.delete({ fileId: child.id });
  }
  await drive.files.delete({ fileId: folderId });
}

async function cleanup() {
  const drive = getDriveClient();
  for (const folderId of driveFolderIds) {
    try {
      const metadata = await drive.files.get({ fileId: folderId, fields: 'id,parents,appProperties' });
      if (metadata.data.id === folderId && metadata.data.appProperties?.['fgf-key']?.startsWith('registration:')) await removeDriveFolder(drive, folderId);
    } catch {
      // A folder already removed is acceptable in cleanup.
    }
  }
  for (const registrationId of registrationIds) {
    await database.delete(registrationLinks).where(eq(registrationLinks.registrationId, registrationId));
    await database.delete(registrationFiles).where(eq(registrationFiles.registrationId, registrationId));
    await database.delete(minorAuthorizations).where(eq(minorAuthorizations.registrationId, registrationId));
    await database.delete(consents).where(eq(consents.registrationId, registrationId));
    await database.delete(registrations).where(eq(registrations.id, registrationId));
  }
  for (const participantId of participantIds) {
    await database.delete(guardians).where(eq(guardians.participantId, participantId));
    await database.delete(participants).where(eq(participants.id, participantId));
  }
}

let result: Record<string, unknown> | undefined;
try {
  const adultCode = await createFormRegistration();
  const minorCode = await createMinorRegistration();
  result = { status: 'ok', publicCodeFormat: adultCode, minorCodeFormat: minorCode, updateFlow: true, invalidCpfRejected: true, minorAuthorizationGenerated: true };
} finally {
  await cleanup();
}

console.log(JSON.stringify(result, null, 2));
