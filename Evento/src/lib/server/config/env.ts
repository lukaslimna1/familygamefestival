import { z } from 'zod';

const requiredText = z.string().trim().min(1);

function getEnvironmentVariable(name: string) {
  return process.env[name] ?? (import.meta.env as Record<string, string | undefined>)[name];
}

function requireEnvironment<T extends z.ZodType>(schema: T, values: unknown, message: string): z.infer<T> {
  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    throw new Error(message);
  }
  return parsed.data;
}

export function getTursoConfig() {
  const config = requireEnvironment(
    z.object({
      url: requiredText,
      authToken: requiredText
    }),
    {
      url: getEnvironmentVariable('TURSO_DATABASE_URL'),
      authToken: getEnvironmentVariable('TURSO_AUTH_TOKEN')
    },
    'Configuração Turso incompleta: TURSO_DATABASE_URL e TURSO_AUTH_TOKEN são obrigatórios.'
  );

  return config;
}

export function getAdminConfig() {
  return requireEnvironment(
    z.object({
      sessionSecret: requiredText.min(32),
      sessionTtlSeconds: z.coerce.number().int().positive().default(28_800)
    }),
    {
      sessionSecret: getEnvironmentVariable('ADMIN_SESSION_SECRET'),
      sessionTtlSeconds: getEnvironmentVariable('ADMIN_SESSION_TTL_SECONDS')
    },
    'Configuração administrativa incompleta: ADMIN_SESSION_SECRET deve ter ao menos 32 caracteres.'
  );
}

export function getGoogleOAuthConfig() {
  return requireEnvironment(
    z.object({
      clientId: requiredText,
      clientSecret: requiredText,
      redirectUri: requiredText
    }),
    {
      clientId: getEnvironmentVariable('GOOGLE_CLIENT_ID'),
      clientSecret: getEnvironmentVariable('GOOGLE_CLIENT_SECRET'),
      redirectUri: getEnvironmentVariable('GOOGLE_REDIRECT_URI')
    },
    'Configuração OAuth do Google incompleta: preencha GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_REDIRECT_URI server-side.'
  );
}

export function getGoogleOAuthStateSecret() {
  return requireEnvironment(
    requiredText.min(32),
    getEnvironmentVariable('GOOGLE_OAUTH_STATE_SECRET'),
    'Proteção OAuth incompleta: GOOGLE_OAUTH_STATE_SECRET deve ter ao menos 32 caracteres.'
  );
}

export function getDriveConfig() {
  return requireEnvironment(
    z.object({
      clientId: requiredText,
      clientSecret: requiredText,
      redirectUri: requiredText,
      refreshToken: requiredText,
      rootFolderId: requiredText.default('root')
    }),
    {
      ...getGoogleOAuthConfig(),
      refreshToken: getEnvironmentVariable('GOOGLE_REFRESH_TOKEN'),
      rootFolderId: getEnvironmentVariable('GOOGLE_DRIVE_ROOT_FOLDER_ID')
    },
    'Configuração Google Drive incompleta: preencha as variáveis GOOGLE_* server-side.'
  );
}
