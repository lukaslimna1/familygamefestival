import { randomUUID } from 'node:crypto';
import type { APIRoute } from 'astro';
import { getRegistrationByAccess } from '../../../lib/server/db/repository';
import { uploadRegistrationFile, type RegistrationUploadFileType } from '../../../lib/server/drive/registration-sync';
import { consents } from '../../../lib/server/db/schema';
import { getDatabase } from '../../../lib/server/db/client';
import { PUBLIC_REGISTRATION_ACCESS_COOKIE, verifyPublicRegistrationAccessToken } from '../../../lib/server/registration/access';
import {
  COSPLAY_AUDIO_MAX_BYTES,
  COSPLAY_REFERENCE_FILE_LIMIT,
  COSPLAY_REFERENCE_MAX_BYTES,
  getRegistrationWindowStatus,
  REGISTRATION_POLICY_VERSIONS
} from '../../../lib/server/registration/config';

export const prerender = false;

function redirect(request: Request, query: string) {
  const url = new URL('/inscricao/minha', request.url);
  const [key, value] = query.split('=');
  if (key && value) url.searchParams.set(key, value);
  return new Response(null, { status: 303, headers: { 'Cache-Control': 'no-store', Location: url.toString() } });
}

function extension(name: string) {
  return name.split('.').pop()?.toLowerCase() ?? '';
}

function isFile(value: FormDataEntryValue | null): value is File {
  return typeof File !== 'undefined' && value instanceof File && value.size > 0;
}

function isRegistrationFileType(value: string): value is RegistrationUploadFileType {
  return ['cosplay_reference', 'cosplay_audio', 'kpop_audio', 'guardian_authorization_signed'].includes(value);
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const access = await verifyPublicRegistrationAccessToken(cookies.get(PUBLIC_REGISTRATION_ACCESS_COOKIE)?.value);
  if (!access || !getRegistrationWindowStatus().open) return redirect(request, !access ? 'error=invalid' : 'error=closed');

  try {
    const form = await request.formData();
    const fileType = form.get('fileType');
    const file = form.get('file');
    if (typeof fileType !== 'string' || !isRegistrationFileType(fileType) || !isFile(file)) {
      return redirect(request, 'error=file');
    }

    const registration = await getRegistrationByAccess(access.registrationId, access.publicCode);
    if (!registration) return redirect(request, 'error=invalid');
    if (fileType === 'kpop_audio' && registration.competitionId !== 'k-pop-individual') return redirect(request, 'error=file');
    if ((fileType === 'cosplay_reference' || fileType === 'cosplay_audio') && registration.competitionId !== 'cosplay') return redirect(request, 'error=file');
    if (fileType === 'guardian_authorization_signed' && !registration.minorAuthorization) return redirect(request, 'error=file');
    const ext = extension(file.name);
    if (fileType === 'cosplay_reference') {
      const currentCount = registration.files.filter((candidate) => candidate.fileType === fileType).length;
      if (currentCount >= COSPLAY_REFERENCE_FILE_LIMIT || currentCount + 1 > COSPLAY_REFERENCE_FILE_LIMIT) return redirect(request, 'error=file');
      if (!['jpg', 'jpeg', 'png', 'webp', 'pdf'].includes(ext) || file.size > COSPLAY_REFERENCE_MAX_BYTES) return redirect(request, 'error=file');
    }
    if (fileType === 'cosplay_audio') {
      if (!['mp3', 'm4a', 'wav'].includes(ext) || file.size > COSPLAY_AUDIO_MAX_BYTES) return redirect(request, 'error=file');
      const hasPendriveConsent = registration.consents.some((consent) => consent.type === 'pendrive_backup' && consent.granted);
      if (!hasPendriveConsent && form.get('consentPendrive') !== 'yes') return redirect(request, 'error=file');
    }
    if (fileType === 'kpop_audio') {
      if (ext !== 'mp3' || (file.type && file.type !== 'audio/mpeg') || file.size > COSPLAY_AUDIO_MAX_BYTES) return redirect(request, 'error=file');
      const hasPendriveConsent = registration.consents.some((consent) => consent.type === 'pendrive_backup' && consent.granted);
      if (!hasPendriveConsent && form.get('consentPendrive') !== 'yes') return redirect(request, 'error=file');
    }
    if (fileType === 'guardian_authorization_signed') {
      if (!registration.minorAuthorization || !['pdf', 'jpg', 'jpeg', 'png'].includes(ext) || file.size > COSPLAY_REFERENCE_MAX_BYTES) return redirect(request, 'error=file');
    }

    await uploadRegistrationFile({
      registrationId: access.registrationId,
      fileType,
      originalName: file.name,
      mimeType: file.type || (ext === 'pdf' ? 'application/pdf' : 'application/octet-stream'),
      bytes: new Uint8Array(await file.arrayBuffer())
    });
    if ((fileType === 'cosplay_audio' || fileType === 'kpop_audio') && !registration.consents.some((consent) => consent.type === 'pendrive_backup' && consent.granted)) {
      await getDatabase().insert(consents).values({
        id: randomUUID(),
        registrationId: access.registrationId,
        consentType: 'pendrive_backup',
        granted: true,
        policyVersion: REGISTRATION_POLICY_VERSIONS.pendriveBackup,
        grantedAt: new Date().toISOString()
      });
    }
    return redirect(request, 'file=1');
  } catch {
    return redirect(request, 'error=file');
  }
};
