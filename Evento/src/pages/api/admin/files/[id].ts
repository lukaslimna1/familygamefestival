import { Readable } from 'node:stream';
import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { getDatabase } from '../../../../lib/server/db/client';
import { registrationFiles } from '../../../../lib/server/db/schema';
import { getDriveClient } from '../../../../lib/server/drive/client';

export const prerender = false;

export const GET: APIRoute = async ({ params, locals, request }) => {
  if (!locals.admin) return new Response('Não autenticado.', { status: 401 });
  if (!params.id) return new Response('Arquivo não encontrado.', { status: 404 });

  const [file] = await getDatabase()
    .select({ fileType: registrationFiles.fileType, mimeType: registrationFiles.mimeType, originalName: registrationFiles.originalName, sizeBytes: registrationFiles.sizeBytes, driveFileId: registrationFiles.driveFileId })
    .from(registrationFiles)
    .where(eq(registrationFiles.id, params.id))
    .limit(1);

  if (!file || !['cosplay_reference', 'cosplay_audio', 'kpop_audio'].includes(file.fileType) || !file.driveFileId) return new Response('Arquivo não encontrado.', { status: 404 });

  try {
    const driveResponse = await getDriveClient().files.get({ fileId: file.driveFileId, alt: 'media' }, { responseType: 'stream' });
    const body = Readable.toWeb(driveResponse.data as Readable) as ReadableStream;
    const download = new URL(request.url).searchParams.get('download') === '1';
    const headers = new Headers({
      'Cache-Control': 'private, no-store',
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(file.originalName)}`,
      'Content-Type': file.mimeType || 'application/octet-stream'
    });
    if (file.sizeBytes > 0) headers.set('Content-Length', String(file.sizeBytes));
    return new Response(body, { headers });
  } catch {
    return new Response('Não foi possível carregar o arquivo.', { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
};
