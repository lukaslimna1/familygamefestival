import { createRegistrationDraft, RegistrationError } from '../db/repository';
import { uploadRegistrationFile, syncRegistrationToDrive } from '../drive/registration-sync';
import {
  COSPLAY_AUDIO_MAX_BYTES,
  COSPLAY_REFERENCE_FILE_LIMIT,
  COSPLAY_REFERENCE_MAX_BYTES,
  getCompetitionDefinitionBySlug,
  getCompetitionRegulationVersion,
  isCosplayCompetition,
  REGISTRATION_POLICY_VERSIONS
} from './config';

function text(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

function optionalText(form: FormData, name: string) {
  const value = text(form, name);
  return value || undefined;
}

function authorizationCompetitionIds(form: FormData) {
  const values = [...form.getAll('authorizationCompetitionId'), ...form.getAll('authorizationCompetitionIds')]
    .filter((value): value is string => typeof value === 'string')
    .flatMap((value) => {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [value];
      } catch {
        return [value];
      }
    })
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter(Boolean);
  return [...new Set(values)];
}

function isFile(value: FormDataEntryValue): value is File {
  return typeof File !== 'undefined' && value instanceof File && value.size > 0;
}

function extension(name: string) {
  return name.split('.').pop()?.toLowerCase() ?? '';
}

function isReferenceFile(file: File) {
  return ['jpg', 'jpeg', 'png', 'webp', 'pdf'].includes(extension(file.name))
    || ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type);
}

function isAudioFile(file: File) {
  return ['mp3', 'm4a', 'wav'].includes(extension(file.name))
    && !file.type.startsWith('video/');
}

function wantsJson(request: Request) {
  return request.headers.get('accept')?.includes('application/json') || request.headers.get('x-fgf-api') === 'json';
}

function errorStatus(code: string) {
  if (code === 'full') return 409;
  if (code === 'duplicate') return 409;
  if (code === 'online_closed') return 410;
  if (code === 'unavailable') return 503;
  return 400;
}

function redirectToForm(request: Request, slug: string, error: string) {
  const location = new URL(`/inscricoes/${slug}`, request.url);
  location.searchParams.set('error', error === 'online_closed' ? 'closed' : error);
  return new Response(null, {
    status: 303,
    headers: { 'Cache-Control': 'no-store', Location: location.toString() }
  });
}

function errorResponse(request: Request, slug: string, error: RegistrationError | Error) {
  const code = error instanceof RegistrationError ? error.code : 'unavailable';
  const message = error instanceof RegistrationError ? error.message : 'Não foi possível processar a inscrição agora.';
  if (!wantsJson(request)) return redirectToForm(request, slug, code);
  return new Response(JSON.stringify({ error: { code, message } }), {
    status: errorStatus(code),
    headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' }
  });
}

function successResponse(request: Request, created: { registrationId: string; publicCode: string; competitionId: string; eventAccessIncluded: boolean; driveSyncStatus: string }) {
  if (wantsJson(request)) {
    return new Response(JSON.stringify({
      data: {
        registrationId: created.registrationId,
        publicCode: created.publicCode,
        competitionId: created.competitionId,
        eventAccessIncluded: created.eventAccessIncluded,
        driveSyncStatus: created.driveSyncStatus
      }
    }), {
      status: 201,
      headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
  const location = new URL('/inscricao/sucesso', request.url);
  location.searchParams.set('code', created.publicCode);
  if (created.driveSyncStatus !== 'synced') location.searchParams.set('sync', 'pending');
  return new Response(null, {
    status: 303,
    headers: { 'Cache-Control': 'no-store', Location: location.toString() }
  });
}

export async function createPublicRegistration(request: Request, competitionSlug: string) {
  const definition = getCompetitionDefinitionBySlug(competitionSlug);
  if (!definition) {
    if (wantsJson(request)) {
      return new Response(JSON.stringify({ error: { code: 'not_found', message: 'Competição não encontrada.' } }), {
        status: 404,
        headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' }
      });
    }
    return new Response('Competição não encontrada.', { status: 404 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return errorResponse(request, definition.slug, new RegistrationError('invalid', 'Formulário inválido.'));
  }

  const cosplay = isCosplayCompetition(definition);
  const referenceFiles = form.getAll('referenceFiles').filter(isFile);
  const audioEntries = form.getAll('audioFile').filter(isFile);
  const selectedAuthorizationCompetitionIds = authorizationCompetitionIds(form);
  if (!cosplay && (referenceFiles.length > 0 || audioEntries.length > 0)) {
    return errorResponse(request, definition.slug, new RegistrationError('invalid', 'Arquivos de Cosplay não pertencem a esta competição.'));
  }
  if (referenceFiles.length > COSPLAY_REFERENCE_FILE_LIMIT || referenceFiles.some((file) => !isReferenceFile(file) || file.size > COSPLAY_REFERENCE_MAX_BYTES)) {
    return errorResponse(request, definition.slug, new RegistrationError('invalid', 'Uma ou mais referências possuem formato ou tamanho inválido.'));
  }
  if (audioEntries.length > 1 || audioEntries.some((file) => !isAudioFile(file) || file.size > COSPLAY_AUDIO_MAX_BYTES)) {
    return errorResponse(request, definition.slug, new RegistrationError('invalid', 'O áudio deve ser MP3, M4A ou WAV e respeitar o tamanho máximo.'));
  }

  const labels = form.getAll('referenceLinkLabel').filter((value): value is string => typeof value === 'string');
  const urls = form.getAll('referenceLinkUrl').filter((value): value is string => typeof value === 'string');
  const links = labels
    .map((label, index) => ({ label: label.trim(), url: (urls[index] ?? '').trim() }))
    .filter((link) => link.label || link.url);

  const guardianNames = ['guardianFullName', 'guardianCpf', 'guardianPhone', 'guardianEmail', 'guardianRelationship'];
  const guardianValues = guardianNames.map((name) => text(form, name));
  const hasGuardianData = guardianValues.some(Boolean);
  const acceptedRegulation = form.get('consentRegulation') === 'yes';
  const acceptedImage = form.get('consentImage') === 'yes';
  const acceptedPendrive = form.get('consentPendrive') === 'yes';
  if (!acceptedRegulation || !acceptedImage || (cosplay && !acceptedPendrive)) {
    return errorResponse(request, definition.slug, new RegistrationError('invalid', 'Os aceites obrigatórios não foram confirmados.'));
  }

  try {
    const created = await createRegistrationDraft({
      participant: {
        fullName: text(form, 'fullName'),
        cpf: text(form, 'cpf'),
        phone: optionalText(form, 'phone'),
        email: optionalText(form, 'email'),
        dateOfBirth: text(form, 'dateOfBirth'),
        city: text(form, 'city'),
        state: text(form, 'state'),
        instagram: optionalText(form, 'instagram'),
        tiktok: optionalText(form, 'tiktok'),
        facebook: optionalText(form, 'facebook'),
        otherSocials: optionalText(form, 'otherSocials')
      },
      competitionId: definition.id,
      ...(selectedAuthorizationCompetitionIds.length > 0 ? { authorizationCompetitionIds: selectedAuthorizationCompetitionIds } : {}),
      links,
      consents: [
        { type: 'competition_regulation', granted: true, policyVersion: getCompetitionRegulationVersion(definition) },
        { type: 'image_use', granted: true, policyVersion: REGISTRATION_POLICY_VERSIONS.imageUse },
        ...(cosplay ? [{ type: 'pendrive_backup' as const, granted: true as const, policyVersion: REGISTRATION_POLICY_VERSIONS.pendriveBackup }] : [])
      ],
      ...(hasGuardianData ? {
        guardian: {
          fullName: guardianValues[0],
          cpf: guardianValues[1],
          phone: guardianValues[2],
          email: guardianValues[3],
          relationship: guardianValues[4]
        }
      } : {}),
      ...(cosplay ? {
        cosplay: {
          stageName: optionalText(form, 'stageName'),
          stageCallName: text(form, 'stageCallName'),
          characterName: text(form, 'characterName'),
          sourceWork: text(form, 'sourceWork'),
          presentationType: 'Apresentação individual',
          cosplayDescription: optionalText(form, 'cosplayDescription'),
          presentationDescription: optionalText(form, 'presentationDescription'),
          presentationNotes: optionalText(form, 'presentationNotes'),
          technicalNotes: optionalText(form, 'technicalNotes'),
          judgeNotes: optionalText(form, 'judgeNotes'),
          musicTitle: optionalText(form, 'musicTitle')
        }
      } : {})
    });

    let driveFailed = false;
    try {
      await syncRegistrationToDrive(created.registrationId);
    } catch {
      driveFailed = true;
    }

    let filesFailed = false;
    for (const file of referenceFiles) {
      try {
        await uploadRegistrationFile({
          registrationId: created.registrationId,
          fileType: 'cosplay_reference',
          originalName: file.name,
          mimeType: file.type || 'application/octet-stream',
          bytes: new Uint8Array(await file.arrayBuffer())
        });
      } catch {
        filesFailed = true;
      }
    }
    const audio = audioEntries[0];
    if (audio) {
      try {
        await uploadRegistrationFile({
          registrationId: created.registrationId,
          fileType: 'cosplay_audio',
          originalName: audio.name,
          mimeType: audio.type || 'audio/mpeg',
          bytes: new Uint8Array(await audio.arrayBuffer())
        });
      } catch {
        filesFailed = true;
      }
    }

    return successResponse(request, {
      ...created,
      competitionId: definition.id,
      driveSyncStatus: driveFailed || filesFailed ? 'pending' : 'synced'
    });
  } catch (error) {
    return errorResponse(request, definition.slug, error instanceof RegistrationError ? error : new Error('Não foi possível salvar a inscrição agora.'));
  }
}
