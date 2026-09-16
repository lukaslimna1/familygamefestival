import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { and, eq } from 'drizzle-orm';
import { PDFDocument } from 'pdf-lib';
import { getDatabase } from '../src/lib/server/db/client';
import { competitions, consents, guardians, minorAuthorizations, participants, registrationFiles, registrationLinks, registrations } from '../src/lib/server/db/schema';
import { findRegistrationByCredentials, getCompetitionRegistrationStatus, getRegistrationDetails } from '../src/lib/server/db/repository';
import { getDriveClient } from '../src/lib/server/drive/client';
import { getRegistrationWindowStatus } from '../src/lib/server/registration/config';

const projectDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const localEnvFile = join(projectDirectory, '.env.local');
if (existsSync(localEnvFile) && typeof process.loadEnvFile === 'function') process.loadEnvFile(localEnvFile);

const baseUrl = process.env.FGF_TEST_BASE_URL ?? 'http://localhost:4321';
const database = getDatabase();
const drive = getDriveClient();
const runId = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const adultCpf = `8${runId.slice(-10)}`;
const minorCpf = `7${runId.slice(-10)}`;
const guardianCpf = `6${runId.slice(-10)}`;
const registrationIds: string[] = [];
const participantIds: string[] = [];
const driveFolderIds: string[] = [];

function assertCondition(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function responseCookie(response: Response) {
  const value = response.headers.get('set-cookie');
  assertCondition(value, 'O endpoint de acesso não devolveu cookie.');
  return value.split(';', 1)[0];
}

async function submitCommon(slug: string, values: Record<string, string>) {
  const form = new FormData();
  for (const [key, value] of Object.entries(values)) form.set(key, value);
  form.set('consentRegulation', 'yes');
  form.set('consentImage', 'yes');
  const response = await fetch(`${baseUrl}/api/inscricoes/${slug}`, {
    method: 'POST',
    body: form,
    headers: { Accept: 'application/json', Origin: baseUrl },
    redirect: 'manual'
  });
  if (response.status !== 201) {
    throw new Error(`A inscrição comum ${slug} deveria retornar 201, recebeu ${response.status}: ${(await response.text()).slice(0, 300)}`);
  }
  const body = await response.json() as { data?: { registrationId: string; publicCode: string; competitionId: string } };
  assertCondition(body.data?.registrationId && body.data.competitionId === slug, `A resposta da inscrição ${slug} não contém o registro esperado.`);
  registrationIds.push(body.data.registrationId);
  const details = await getRegistrationDetails(body.data.registrationId);
  assertCondition(details, `O registro ${slug} não foi persistido.`);
  participantIds.push(details.participantId);
  return { code: body.data.publicCode, registrationId: body.data.registrationId, details };
}

async function removeDriveFolder(folderId: string) {
  const children = await drive.files.list({
    q: `'${folderId.replace(/'/g, "\\'")}' in parents and trashed = false`,
    spaces: 'drive',
    pageSize: 100,
    fields: 'files(id,mimeType,parents,appProperties)'
  });
  for (const child of children.data.files ?? []) {
    if (!child.id || child.parents?.includes(folderId) !== true) continue;
    if (child.mimeType === 'application/vnd.google-apps.folder') await removeDriveFolder(child.id);
    else await drive.files.delete({ fileId: child.id });
  }
  await drive.files.delete({ fileId: folderId });
}

async function cleanup() {
  const ids = new Set(driveFolderIds);
  for (const registrationId of registrationIds) {
    const details = await getRegistrationDetails(registrationId);
    if (details?.driveFolderId) ids.add(details.driveFolderId);
  }
  for (const folderId of ids) {
    try {
      const metadata = await drive.files.get({ fileId: folderId, fields: 'id,appProperties' });
      if (metadata.data.appProperties?.['fgf-key']?.startsWith('registration:')) await removeDriveFolder(folderId);
    } catch {
      // Idempotent cleanup: an already removed test folder is acceptable.
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
  const tekkenStatus = await getCompetitionRegistrationStatus('tekken-8');
  const streetStatus = await getCompetitionRegistrationStatus('street-fighter-6');
  assertCondition(tekkenStatus?.capacity === 32 && streetStatus?.capacity === 32, 'O limite padrão não é 32 por competição.');
  assertCondition(getRegistrationWindowStatus(new Date('2026-09-18T18:00:00.000Z')).open === false, 'O prazo não encerra no instante configurado.');

  const adult = await submitCommon('tekken-8', {
    fullName: 'TESTE GENERICO ADULTO - REMOVER',
    dateOfBirth: '2000-01-01',
    cpf: adultCpf,
    phone: '',
    email: '',
    city: 'Bauru',
    state: 'SP',
    referenceLinkLabel: 'Link de teste',
    referenceLinkUrl: 'https://example.invalid/teste'
  });
  assertCondition(/^TEK-[0-9A-F]{6}$/.test(adult.code), 'O prefixo aleatório do Tekken não foi aplicado.');
  assertCondition(adult.details.competitionId === 'tekken-8' && adult.details.cosplay === null, 'A inscrição comum recebeu dados de Cosplay ou competição incorreta.');
  const adultAccessForm = new FormData();
  adultAccessForm.set('publicCode', adult.code);
  adultAccessForm.set('cpf', adultCpf);
  const adultAccess = await fetch(`${baseUrl}/api/inscricao/acessar`, { method: 'POST', body: adultAccessForm, headers: { Accept: 'application/json', Origin: baseUrl }, redirect: 'manual' });
  const adultAccessText = await adultAccess.text();
  let adultAccessBody: { data?: { authenticated?: boolean }; error?: { code?: string } } = {};
  try { adultAccessBody = adultAccessText ? JSON.parse(adultAccessText) : {}; } catch { /* mensagem abaixo */ }
  if (adultAccess.status !== 200 || adultAccessBody.data?.authenticated !== true) {
    throw new Error(`O acesso por código + CPF não funciona para competição comum (${adultAccess.status}, ${adultAccessBody.error?.code ?? 'sem código'}).`);
  }
  const adultCookie = responseCookie(adultAccess);
  const adultMine = await fetch(`${baseUrl}/api/inscricao/minha`, { headers: { Accept: 'application/json', Cookie: adultCookie } });
  assertCondition(adultMine.status === 200 && (await adultMine.json()).data?.competition?.id === 'tekken-8', 'A consulta privada não identificou a competição comum.');
  const adultUpdate = new FormData();
  adultUpdate.set('instagram', '@teste-generico-atualizado');
  const adultUpdateResponse = await fetch(`${baseUrl}/api/inscricao/minha`, { method: 'POST', body: adultUpdate, headers: { Accept: 'application/json', Cookie: adultCookie, Origin: baseUrl } });
  assertCondition(adultUpdateResponse.status === 200, 'A edição de redes sociais da competição comum falhou.');

  const minor = await submitCommon('street-fighter-6', {
    fullName: 'TESTE GENERICO MENOR - REMOVER',
    dateOfBirth: '2012-01-01',
    cpf: minorCpf,
    phone: '+5514999990000',
    email: `generic-minor-${runId}@example.invalid`,
    city: 'Bauru',
    state: 'SP',
    guardianFullName: 'RESPONSAVEL GENERICO - REMOVER',
    guardianCpf,
    guardianPhone: '+5514999990001',
    guardianEmail: `generic-guardian-${runId}@example.invalid`,
    guardianRelationship: 'Responsável legal'
  });
  assertCondition(/^SF6-[0-9A-F]{6}$/.test(minor.code), 'O prefixo aleatório do Street Fighter não foi aplicado.');
  assertCondition(Boolean(minor.details.minorAuthorization) && minor.details.competitionId === 'street-fighter-6', 'A autorização do menor não ficou vinculada à competição correta.');

  const minorAccessForm = new FormData();
  minorAccessForm.set('publicCode', minor.code);
  minorAccessForm.set('cpf', minorCpf);
  const minorAccess = await fetch(`${baseUrl}/api/inscricao/acessar`, { method: 'POST', body: minorAccessForm, headers: { Accept: 'application/json', Origin: baseUrl }, redirect: 'manual' });
  assertCondition(minorAccess.status === 200, 'O acesso da inscrição comum menor falhou.');
  const minorCookie = responseCookie(minorAccess);
  const authorizationForm = new FormData();
  authorizationForm.set('fileType', 'guardian_authorization_signed');
  authorizationForm.set('file', new File(['AUTORIZACAO-TESTE-FICTICIA'], 'autorizacao-teste.pdf', { type: 'application/pdf' }));
  const authorizationUpload = await fetch(`${baseUrl}/api/inscricao/arquivo`, { method: 'POST', body: authorizationForm, headers: { Cookie: minorCookie, Origin: baseUrl }, redirect: 'manual' });
  assertCondition(authorizationUpload.status === 303 && authorizationUpload.headers.get('location')?.includes('file=1'), 'O upload genérico da autorização assinada falhou.');

  const commonDetails = await getRegistrationDetails(minor.registrationId);
  assertCondition(commonDetails?.minorAuthorization?.status === 'uploaded', 'O status da autorização genérica não foi atualizado.');
  assertCondition(commonDetails?.competitionFolderId && commonDetails.competitionFolderId === (await database.select({ driveFolderId: competitions.driveFolderId }).from(competitions).where(eq(competitions.id, 'street-fighter-6')).limit(1))[0]?.driveFolderId, 'A competição comum não está ligada à pasta Drive correta.');
  assertCondition(commonDetails && !commonDetails.files.some((file) => file.fileType === 'cosplay_reference' || file.fileType === 'cosplay_audio'), 'Uma competição comum recebeu arquivos específicos de Cosplay.');
  assertCondition(commonDetails?.driveFolderId, 'A pasta da competição comum não foi criada no Drive.');
  const expectedCommonFolderName = `${minor.code} - TESTE GENERICO MENOR - REMOVER`;
  const expectedCommonSheetName = `Ficha-Inscricao - ${expectedCommonFolderName}.pdf`;
  const expectedCommonAuthorizationName = `Autorizacao-Menor-Assinada - ${minor.code} - TESTE GENERICO MENOR - REMOVER.pdf`;
  const commonFolder = (await drive.files.get({ fileId: commonDetails.driveFolderId, fields: 'name' })).data;
  assertCondition(commonFolder.name === expectedCommonFolderName, 'A pasta de campeonato comum deve usar somente código e nome completo.');
  const sheet = commonDetails?.files.find((file) => file.fileType === 'registration_sheet');
  assertCondition(sheet?.driveFileId, 'A ficha PDF da competição comum não foi criada.');
  const signedAuthorization = commonDetails.files.find((file) => file.fileType === 'guardian_authorization_signed');
  assertCondition(signedAuthorization?.driveFileId, 'A autorização assinada da competição comum não foi persistida.');
  const sheetMetadata = (await drive.files.get({ fileId: sheet.driveFileId, fields: 'name,parents' })).data;
  const signedMetadata = (await drive.files.get({ fileId: signedAuthorization.driveFileId, fields: 'name,parents' })).data;
  assertCondition(sheetMetadata.name === expectedCommonSheetName && sheetMetadata.parents?.includes(commonDetails.driveFolderId), 'A ficha comum não segue o padrão de nome/localização.');
  assertCondition(signedMetadata.name === expectedCommonAuthorizationName && signedMetadata.parents?.includes(commonDetails.driveFolderId), 'A autorização assinada comum não segue o padrão de nome/localização.');
  const pdfResponse = await drive.files.get({ fileId: sheet.driveFileId, alt: 'media' }, { responseType: 'arraybuffer' });
  const pdfBytes = Buffer.isBuffer(pdfResponse.data) ? pdfResponse.data : Buffer.from(pdfResponse.data as ArrayBuffer);
  const pdf = await PDFDocument.load(pdfBytes);
  assertCondition(pdf.getPageCount() >= 1, 'A ficha PDF da competição comum é inválida.');

  const tekkenCount = (await getCompetitionRegistrationStatus('tekken-8'))?.registered ?? 0;
  const streetCount = (await getCompetitionRegistrationStatus('street-fighter-6'))?.registered ?? 0;
  assertCondition(tekkenCount >= 1 && streetCount >= 1, 'Duas competições não puderam receber inscrições simultaneamente.');
  assertCondition((await findRegistrationByCredentials(adult.code, adultCpf))?.competitionId === 'tekken-8', 'A busca por credenciais não retornou a competição correta.');
  result = {
    status: 'ok',
    commonAdult: true,
    commonMinor: true,
    prefixes: ['TEK', 'SF6'],
    independentCapacity32: true,
    deadlineValidated: true,
    accessAndUpdateValidated: true,
    minorAuthorizationValidated: true,
    driveCompetitionFoldersValidated: true,
    pdfValidated: true
  };
} finally {
  await cleanup();
}

console.log(JSON.stringify(result, null, 2));
