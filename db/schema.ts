import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const owner = sqliteTable('site_owner', {
  key: text('key').primaryKey(), userId: text('user_id').notNull(),
});
export const members = sqliteTable('editors', {
  userId: text('user_id').primaryKey(), email: text('email').notNull(),
  name: text('name').notNull(), active: integer('active').notNull().default(1), joinedAt: text('joined_at').notNull(),
});
export const invitations = sqliteTable('editor_invitations', {
  email: text('email').primaryKey(), invitedBy: text('invited_by').notNull(), createdAt: text('created_at').notNull(),
});
export const posts = sqliteTable('archive_posts', {
  id: text('id').primaryKey(), round: integer('round').notNull(), kind: text('kind').notNull(),
  draftJson: text('draft_json').notNull(), liveJson: text('live_json'),
  version: integer('version').notNull().default(1), updatedBy: text('updated_by').notNull(),
  updatedAt: text('updated_at').notNull(), publishedAt: text('published_at'),
});
export const revisions = sqliteTable('archive_revisions', {
  id: integer('id').primaryKey({autoIncrement:true}), postId: text('post_id').notNull(),
  version: integer('version').notNull(), contentJson: text('content_json').notNull(),
  action: text('action').notNull(), actorId: text('actor_id').notNull(), createdAt: text('created_at').notNull(),
});
