import type { APIRoute } from 'astro';
import { deleteRegistrationFile } from '../../../../lib/server/drive/registration-sync';
import { getRegistrationByAccess } from '../../../../lib/server/db/repository';
import { PUBLIC_REGISTRATION_ACCESS_COOKIE, verifyPublicRegistrationAccessToken } from '../../../../lib/server/registration/access';
import { getRegistrationWindowStatus } from '../../../../lib/server/registration/config';

export const prerender = false;

function redirect(request: Request, query = 'file=1') {
  return new Response(null, { status: 303, headers: { 'Cache-Control': 'no-store', Location: `/inscricao/minha?${query}` } });
}

export const POST: APIRoute = async ({ request, cookies, params }) => {
  const access = await verifyPublicRegistrationAccessToken(cookies.get(PUBLIC_REGISTRATION_ACCESS_COOKIE)?.value);
  if (!access || !params.id) return redirect(request, 'error=invalid');
  if (!getRegistrationWindowStatus().open) return redirect(request, 'error=closed');
  try {
    const form = await request.formData();
    if (form.get('action') !== 'delete') return redirect(request, 'error=file');
    const registration = await getRegistrationByAccess(access.registrationId, access.publicCode);
    if (!registration) return redirect(request, 'error=invalid');
    await deleteRegistrationFile({ registrationId: access.registrationId, fileId: params.id });
    return redirect(request);
  } catch {
    return redirect(request, 'error=file');
  }
};

export const GET: APIRoute = async ({ cookies, params }) => {
  const access = await verifyPublicRegistrationAccessToken(cookies.get(PUBLIC_REGISTRATION_ACCESS_COOKIE)?.value);
  if (!access || !params.id) return new Response('Não autorizado.', { status: 401 });
  const registration = await getRegistrationByAccess(access.registrationId, access.publicCode);
  const file = registration?.files.find((candidate) => candidate.id === params.id);
  if (!file?.driveFileId) return new Response('Arquivo não disponível.', { status: 404 });

  try {
    const { getDriveClient } = await import('../../../../lib/server/drive/client');
    const drive = getDriveClient();
    const response = await drive.files.get({ fileId: file.driveFileId, alt: 'media' }, { responseType: 'arraybuffer' });
    const bytes = Buffer.isBuffer(response.data) ? response.data : Buffer.from(response.data as ArrayBuffer);
    const body = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(body).set(bytes);
    return new Response(body, {
      status: 200,
      headers: {
        'Cache-Control': 'private, no-store',
        'Content-Type': file.mimeType,
        'Content-Disposition': `inline; filename="${file.originalName.replace(/["\r\n]/g, '')}"`
      }
    });
  } catch {
    return new Response('Arquivo não disponível.', { status: 404 });
  }
};
