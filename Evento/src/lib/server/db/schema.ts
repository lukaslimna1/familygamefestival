import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

const timestamp = (name: string) => text(name).notNull().default(sql`(CURRENT_TIMESTAMP)`);

export const participants = sqliteTable('participants', {
  id: text('id').primaryKey(),
  fullName: text('full_name').notNull(),
  cpf: text('cpf').notNull(),
  phone: text('phone').notNull(),
  email: text('email').notNull(),
  dateOfBirth: text('date_of_birth').notNull(),
  city: text('city').notNull().default(''),
  state: text('state').notNull().default(''),
  instagram: text('instagram'),
  tiktok: text('tiktok'),
  facebook: text('facebook'),
  otherSocials: text('other_socials'),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at')
}, (table) => ({
  cpfUnique: uniqueIndex('participants_cpf_unique').on(table.cpf),
  emailIndex: index('participants_email_idx').on(table.email)
}));

export const competitions = sqliteTable('competitions', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull(),
  title: text('title').notNull(),
  category: text('category').notNull(),
  eventDay: text('event_day').notNull(),
  eventDate: text('event_date').notNull(),
  startTime: text('start_time').notNull(),
  registrationPriceCents: integer('registration_price_cents'),
  prizeCents: integer('prize_cents'),
  prizeNote: text('prize_note'),
  maxParticipants: integer('max_participants'),
  minParticipantsForPrize: integer('min_participants_for_prize'),
  referenceFileLimit: integer('reference_file_limit'),
  referenceMaxBytes: integer('reference_max_bytes'),
  referenceMimeTypes: text('reference_mime_types'),
  audioMaxBytes: integer('audio_max_bytes'),
  audioMimeTypes: text('audio_mime_types'),
  registrationMode: text('registration_mode').notNull().default('online_and_onsite'),
  isFree: integer('is_free', { mode: 'boolean' }).notNull().default(false),
  status: text('status').notNull().default('published'),
  driveFolderId: text('drive_folder_id'),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at')
}, (table) => ({
  slugUnique: uniqueIndex('competitions_slug_unique').on(table.slug),
  eventDayIndex: index('competitions_event_day_idx').on(table.eventDay, table.eventDate, table.startTime),
  driveFolderUnique: uniqueIndex('competitions_drive_folder_unique')
    .on(table.driveFolderId)
    .where(sql`${table.driveFolderId} IS NOT NULL`)
}));

export const registrations = sqliteTable('registrations', {
  id: text('id').primaryKey(),
  participantId: text('participant_id').notNull().references(() => participants.id, { onDelete: 'cascade' }),
  competitionId: text('competition_id').notNull().references(() => competitions.id, { onDelete: 'restrict' }),
  status: text('status').notNull().default('pending'),
  source: text('source').notNull().default('online'),
  driveSyncStatus: text('drive_sync_status').notNull().default('drive_pending'),
  driveLastError: text('drive_last_error'),
  publicCode: text('public_code'),
  driveFolderId: text('drive_folder_id'),
  eventAccessIncluded: integer('event_access_included', { mode: 'boolean' }).notNull().default(false),
  submittedAt: text('submitted_at'),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at')
}, (table) => ({
  participantCompetitionUnique: uniqueIndex('registrations_participant_competition_unique').on(table.participantId, table.competitionId),
  publicCodeUnique: uniqueIndex('registrations_public_code_unique')
    .on(table.publicCode)
    .where(sql`${table.publicCode} IS NOT NULL`),
  competitionIndex: index('registrations_competition_idx').on(table.competitionId, table.status, table.createdAt),
  driveSyncIndex: index('registrations_drive_sync_idx').on(table.driveSyncStatus, table.updatedAt)
}));

export const consents = sqliteTable('consents', {
  id: text('id').primaryKey(),
  registrationId: text('registration_id').notNull().references(() => registrations.id, { onDelete: 'cascade' }),
  consentType: text('consent_type').notNull(),
  granted: integer('granted', { mode: 'boolean' }).notNull(),
  policyVersion: text('policy_version').notNull(),
  grantedAt: text('granted_at').notNull()
}, (table) => ({
  uniqueConsent: uniqueIndex('consents_registration_type_version_unique').on(table.registrationId, table.consentType, table.policyVersion)
}));

export const guardians = sqliteTable('guardians', {
  id: text('id').primaryKey(),
  participantId: text('participant_id').notNull().references(() => participants.id, { onDelete: 'cascade' }),
  fullName: text('full_name').notNull(),
  cpf: text('cpf').notNull(),
  phone: text('phone').notNull(),
  email: text('email').notNull(),
  relationship: text('relationship').notNull(),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at')
}, (table) => ({
  participantIndex: index('guardians_participant_idx').on(table.participantId)
}));

export const minorAuthorizations = sqliteTable('minor_authorizations', {
  id: text('id').primaryKey(),
  registrationId: text('registration_id').notNull().references(() => registrations.id, { onDelete: 'cascade' }),
  participantId: text('participant_id').notNull().references(() => participants.id, { onDelete: 'cascade' }),
  guardianId: text('guardian_id').notNull().references(() => guardians.id, { onDelete: 'restrict' }),
  version: integer('version').notNull().default(1),
  competitionIds: text('competition_ids').notNull().default('[]'),
  status: text('status').notNull().default('pending'),
  driveFileId: text('drive_file_id'),
  signedDriveFileId: text('signed_drive_file_id'),
  deliveryType: text('delivery_type'),
  requestedAt: timestamp('requested_at'),
  uploadedAt: text('uploaded_at'),
  receivedAt: text('received_at'),
  rejectionReason: text('rejection_reason'),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at')
}, (table) => ({
  participantIndex: index('minor_authorizations_participant_idx').on(table.participantId, table.version),
  participantVersionUnique: uniqueIndex('minor_authorizations_participant_version_unique').on(table.participantId, table.version)
}));

export const cosplayEntries = sqliteTable('cosplay_entries', {
  id: text('id').primaryKey(),
  registrationId: text('registration_id').notNull().references(() => registrations.id, { onDelete: 'cascade' }),
  stageName: text('stage_name'),
  characterName: text('character_name').notNull(),
  sourceWork: text('source_work').notNull(),
  presentationType: text('presentation_type').notNull(),
  cosplayDescription: text('cosplay_description').notNull().default(''),
  presentationDescription: text('presentation_description'),
  stageCallName: text('stage_call_name').notNull().default(''),
  presentationNotes: text('presentation_notes'),
  technicalNotes: text('technical_notes'),
  judgeNotes: text('judge_notes'),
  musicTitle: text('music_title'),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at')
}, (table) => ({
  registrationUnique: uniqueIndex('cosplay_entries_registration_unique').on(table.registrationId)
}));

export const registrationFiles = sqliteTable('registration_files', {
  id: text('id').primaryKey(),
  registrationId: text('registration_id').notNull().references(() => registrations.id, { onDelete: 'cascade' }),
  fileType: text('file_type').notNull(),
  originalName: text('original_name').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  contentHash: text('content_hash'),
  driveFileId: text('drive_file_id'),
  drivePath: text('drive_path'),
  authorizationVersion: integer('authorization_version'),
  syncStatus: text('sync_status').notNull().default('drive_pending'),
  lastError: text('last_error'),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at')
}, (table) => ({
  syncIndex: index('registration_files_sync_idx').on(table.syncStatus, table.createdAt),
  contentHashUnique: uniqueIndex('registration_files_hash_unique').on(table.registrationId, table.fileType, table.contentHash)
}));

export const registrationLinks = sqliteTable('registration_links', {
  id: text('id').primaryKey(),
  registrationId: text('registration_id').notNull().references(() => registrations.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  url: text('url').notNull(),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at')
}, (table) => ({
  registrationIndex: index('registration_links_registration_idx').on(table.registrationId, table.createdAt)
}));

export const admins = sqliteTable('admins', {
  id: text('id').primaryKey(),
  displayName: text('display_name').notNull(),
  username: text('username'),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  status: text('status').notNull().default('active'),
  mustChangePassword: integer('must_change_password', { mode: 'boolean' }).notNull().default(false),
  lastLoginAt: text('last_login_at'),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at')
}, (table) => ({
  emailUnique: uniqueIndex('admins_email_unique').on(table.email)
}));

export const adminSessions = sqliteTable('admin_sessions', {
  id: text('id').primaryKey(),
  adminId: text('admin_id').notNull().references(() => admins.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  expiresAt: text('expires_at').notNull(),
  revokedAt: text('revoked_at'),
  createdAt: timestamp('created_at')
}, (table) => ({
  tokenUnique: uniqueIndex('admin_sessions_token_unique').on(table.tokenHash),
  activeIndex: index('admin_sessions_active_idx').on(table.adminId, table.expiresAt, table.revokedAt)
}));

export const databaseSchema = {
  participants,
  competitions,
  registrations,
  consents,
  guardians,
  minorAuthorizations,
  cosplayEntries,
  registrationFiles,
  registrationLinks,
  admins,
  adminSessions
};
