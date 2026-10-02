import { pgTable, uuid, varchar, text, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// --- Users Table ---
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull().default('citizen'), // 'citizen' | 'advocate' | 'admin'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// --- Advocate Profiles Table ---
export const advocateProfiles = pgTable('advocate_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  barCouncilNumber: varchar('bar_council_number', { length: 100 }).notNull().unique(),
  practiceAreas: text('practice_areas').notNull(), // Comma-separated or serialized array
  experienceYears: integer('experience_years').notNull(),
  bio: text('bio').notNull(),
  certificateUrl: varchar('certificate_url', { length: 512 }),
  status: varchar('status', { length: 50 }).notNull().default('pending'), // 'pending' | 'approved' | 'rejected'
  verifiedAt: timestamp('verified_at'),
  verifiedBy: uuid('verified_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// --- Cases Table ---
export const cases = pgTable('cases', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  category: varchar('category', { length: 100 }).notNull(), // 'consumer' | 'rent' | 'labor' | etc.
  status: varchar('status', { length: 50 }).notNull().default('pending'), // 'pending' | 'active' | 'closed'
  citizenId: uuid('citizen_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  advocateId: uuid('advocate_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// --- Case Hearings Table ---
export const caseHearings = pgTable('case_hearings', {
  id: uuid('id').defaultRandom().primaryKey(),
  caseId: uuid('case_id').references(() => cases.id, { onDelete: 'cascade' }).notNull(),
  hearingDate: timestamp('hearing_date').notNull(),
  notes: text('notes'),
  status: varchar('status', { length: 50 }).notNull().default('scheduled'), // 'scheduled' | 'completed' | 'postponed'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// --- Case Documents Table (Secure Case Uploads) ---
export const caseDocuments = pgTable('case_documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  caseId: uuid('case_id').references(() => cases.id, { onDelete: 'cascade' }).notNull(),
  uploaderId: uuid('uploader_id').references(() => users.id).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  filePath: varchar('file_path', { length: 512 }).notNull(),
  fileType: varchar('file_type', { length: 100 }).notNull(),
  fileSize: integer('file_size').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// --- Legal Document Templates ---
export const documentTemplates = pgTable('document_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  category: varchar('category', { length: 100 }).notNull(), // 'rti' | 'consumer' | 'agreement'
  contentTemplate: text('content_template').notNull(), // Template text with place-holders
  fieldsSchema: jsonb('fields_schema').notNull(), // JSON defining fields and rules (e.g. name, type, label)
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// --- Generated Documents (instantiated templates) ---
export const generatedDocuments = pgTable('generated_documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  templateId: uuid('template_id').references(() => documentTemplates.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  filledData: jsonb('filled_data').notNull(), // The actual dynamic responses
  filePath: varchar('file_path', { length: 512 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- Connection Requests Table (Citizen ↔ Advocate Linking) ---
export const connectionRequests = pgTable('connection_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  citizenId: uuid('citizen_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  advocateId: uuid('advocate_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  caseId: uuid('case_id').references(() => cases.id, { onDelete: 'set null' }),
  status: varchar('status', { length: 50 }).notNull().default('pending'), // 'pending' | 'accepted' | 'rejected'
  message: text('message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// --- Notifications Table ---
export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: varchar('type', { length: 100 }).notNull(), // 'connection_request' | 'connection_accepted' | 'connection_rejected' | 'case_update' | 'hearing_scheduled' | 'consultation_scheduled' | 'consultation_started' | 'general'
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  isRead: varchar('is_read', { length: 10 }).notNull().default('false'),
  relatedId: uuid('related_id'), // optional: points to case/connection/consultation ID
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- Consultations Table (Virtual Legal Aid Consultation Rooms) ---
export const consultations = pgTable('consultations', {
  id: uuid('id').defaultRandom().primaryKey(),
  caseId: uuid('case_id').references(() => cases.id, { onDelete: 'set null' }),
  connectionId: uuid('connection_id').references(() => connectionRequests.id, { onDelete: 'set null' }),
  citizenId: uuid('citizen_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  advocateId: uuid('advocate_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('scheduled'), // 'scheduled' | 'active' | 'completed' | 'cancelled'
  meetingRoomId: varchar('meeting_room_id', { length: 255 }).notNull(),
  scheduledAt: timestamp('scheduled_at').defaultNow().notNull(),
  startedAt: timestamp('started_at'),
  endedAt: timestamp('ended_at'),
  sessionNotes: text('session_notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// --- Messages Table (Client-Advocate Case & Direct Messaging) ---
export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  senderId: uuid('sender_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  receiverId: uuid('receiver_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  caseId: uuid('case_id').references(() => cases.id, { onDelete: 'set null' }),
  connectionId: uuid('connection_id').references(() => connectionRequests.id, { onDelete: 'set null' }),
  content: text('content').notNull(),
  attachmentUrl: text('attachment_url'),
  attachmentName: varchar('attachment_name', { length: 255 }),
  attachmentType: varchar('attachment_type', { length: 100 }),
  isRead: varchar('is_read', { length: 10 }).notNull().default('false'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- Assessments Table (Legal Dispute & Readiness Evaluations) ---
export const assessments = pgTable('assessments', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  category: varchar('category', { length: 50 }).notNull(), // 'consumer' | 'tenant' | 'labor' | 'cyber' | 'family' | 'civil'
  score: integer('score').notNull(),
  status: varchar('status', { length: 50 }).notNull(), // 'strong' | 'moderate' | 'weak'
  title: varchar('title', { length: 255 }).notNull(),
  summary: text('summary').notNull(),
  actionRecommendation: text('action_recommendation').notNull(),
  answers: jsonb('answers'), // Record of questions and chosen answers
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- Relations ---

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(advocateProfiles, {
    fields: [users.id],
    references: [advocateProfiles.userId],
  }),
  citizenCases: many(cases, { relationName: 'citizenCases' }),
  advocateCases: many(cases, { relationName: 'advocateCases' }),
  generatedDocs: many(generatedDocuments),
  sentConnectionRequests: many(connectionRequests, { relationName: 'citizenConnections' }),
  receivedConnectionRequests: many(connectionRequests, { relationName: 'advocateConnections' }),
  notifications: many(notifications),
  citizenConsultations: many(consultations, { relationName: 'citizenConsultations' }),
  advocateConsultations: many(consultations, { relationName: 'advocateConsultations' }),
  sentMessages: many(messages, { relationName: 'sentMessages' }),
  receivedMessages: many(messages, { relationName: 'receivedMessages' }),
  assessments: many(assessments),
}));

export const advocateProfilesRelations = relations(advocateProfiles, ({ one }) => ({
  user: one(users, {
    fields: [advocateProfiles.userId],
    references: [users.id],
  }),
  verifier: one(users, {
    fields: [advocateProfiles.verifiedBy],
    references: [users.id],
  }),
}));

export const casesRelations = relations(cases, ({ one, many }) => ({
  citizen: one(users, {
    fields: [cases.citizenId],
    references: [users.id],
    relationName: 'citizenCases',
  }),
  advocate: one(users, {
    fields: [cases.advocateId],
    references: [users.id],
    relationName: 'advocateCases',
  }),
  hearings: many(caseHearings),
  documents: many(caseDocuments),
  connectionRequests: many(connectionRequests),
  consultations: many(consultations),
  messages: many(messages),
}));

export const caseHearingsRelations = relations(caseHearings, ({ one }) => ({
  case: one(cases, {
    fields: [caseHearings.caseId],
    references: [cases.id],
  }),
}));

export const caseDocumentsRelations = relations(caseDocuments, ({ one }) => ({
  case: one(cases, {
    fields: [caseDocuments.caseId],
    references: [cases.id],
  }),
  uploader: one(users, {
    fields: [caseDocuments.uploaderId],
    references: [users.id],
  }),
}));

export const generatedDocumentsRelations = relations(generatedDocuments, ({ one }) => ({
  template: one(documentTemplates, {
    fields: [generatedDocuments.templateId],
    references: [documentTemplates.id],
  }),
  user: one(users, {
    fields: [generatedDocuments.userId],
    references: [users.id],
  }),
}));

export const connectionRequestsRelations = relations(connectionRequests, ({ one, many }) => ({
  citizen: one(users, {
    fields: [connectionRequests.citizenId],
    references: [users.id],
    relationName: 'citizenConnections',
  }),
  advocate: one(users, {
    fields: [connectionRequests.advocateId],
    references: [users.id],
    relationName: 'advocateConnections',
  }),
  case: one(cases, {
    fields: [connectionRequests.caseId],
    references: [cases.id],
  }),
  messages: many(messages),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const consultationsRelations = relations(consultations, ({ one }) => ({
  case: one(cases, {
    fields: [consultations.caseId],
    references: [cases.id],
  }),
  citizen: one(users, {
    fields: [consultations.citizenId],
    references: [users.id],
    relationName: 'citizenConsultations',
  }),
  advocate: one(users, {
    fields: [consultations.advocateId],
    references: [users.id],
    relationName: 'advocateConsultations',
  }),
  connection: one(connectionRequests, {
    fields: [consultations.connectionId],
    references: [connectionRequests.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: 'sentMessages',
  }),
  receiver: one(users, {
    fields: [messages.receiverId],
    references: [users.id],
    relationName: 'receivedMessages',
  }),
  case: one(cases, {
    fields: [messages.caseId],
    references: [cases.id],
  }),
  connection: one(connectionRequests, {
    fields: [messages.connectionId],
    references: [connectionRequests.id],
  }),
}));

export const assessmentsRelations = relations(assessments, ({ one }) => ({
  user: one(users, {
    fields: [assessments.userId],
    references: [users.id],
  }),
}));

// --- India Code Acts Table (National Statutes & Legislation) ---
export const acts = pgTable('acts', {
  id: uuid('id').defaultRandom().primaryKey(),
  actNumber: varchar('act_number', { length: 100 }),
  actYear: integer('act_year').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  shortTitle: varchar('short_title', { length: 50 }).notNull(),
  category: varchar('category', { length: 100 }).notNull(), // 'Criminal Law' | 'Constitutional Law' | 'Civil Law' | 'Consumer Law' | etc.
  ministry: varchar('ministry', { length: 255 }),
  indiaCodeUrl: varchar('india_code_url', { length: 512 }),
  overview: text('overview').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- Act Sections Table (Statutory Sections, Plain Language Summaries & Remedies) ---
export const actSections = pgTable('act_sections', {
  id: uuid('id').defaultRandom().primaryKey(),
  actId: uuid('act_id').references(() => acts.id, { onDelete: 'cascade' }).notNull(),
  sectionNumber: varchar('section_number', { length: 100 }).notNull(),
  sectionTitle: varchar('section_title', { length: 255 }).notNull(),
  legalText: text('legal_text').notNull(),
  plainSummary: text('plain_summary').notNull(),
  punishmentOrRemedy: text('punishment_or_remedy'),
  cognizable: varchar('cognizable', { length: 50 }).default('N/A'),
  bailable: varchar('bailable', { length: 50 }).default('N/A'),
  forum: varchar('forum', { length: 255 }),
  keyPrecedent: text('key_precedent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const actsRelations = relations(acts, ({ many }) => ({
  sections: many(actSections),
}));

export const actSectionsRelations = relations(actSections, ({ one }) => ({
  act: one(acts, {
    fields: [actSections.actId],
    references: [acts.id],
  }),
}));


