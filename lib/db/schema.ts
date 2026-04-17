import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const actresses = sqliteTable('actresses', {
  id: text('id').primaryKey(), // minnano ID
  name_ja: text('name_ja').notNull(),
  name_cn: text('name_cn'),
  birthday: text('birthday'),
  height: integer('height'),
  bust: integer('bust'),
  waist: integer('waist'),
  hip: integer('hip'),
  debut_date: text('debut_date'),
  avatar_url: text('avatar_url'),
  created_at: text('created_at').notNull().default(new Date().toISOString()),
  updated_at: text('updated_at').notNull().default(new Date().toISOString()),
});

export const events = sqliteTable('events', {
  id: text('id').primaryKey(), // av-event ID
  actress_id: text('actress_id').notNull().references(() => actresses.id),
  title: text('title').notNull(),
  venue: text('venue').notNull(),
  prefecture: text('prefecture'),
  datetime: text('datetime').notNull(), // ISO8601
  event_type: text('event_type'), // 'sign' | 'debut' | 'live' | etc.
  url: text('url').notNull(),
  created_at: text('created_at').notNull().default(new Date().toISOString()),
});

export const actress_events_count = sqliteTable('actress_events_count', {
  actress_id: text('actress_id').primaryKey().references(() => actresses.id),
  total_events: integer('total_events').notNull().default(0),
  year_2025_events: integer('year_2025_events').notNull().default(0),
  year_2026_events: integer('year_2026_events').notNull().default(0),
  month_04_2026_events: integer('month_04_2026_events').notNull().default(0),
});

export const votes = sqliteTable('votes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  actress_id: text('actress_id').notNull().references(() => actresses.id),
  ip_address: text('ip_address').notNull(),
  voted_at: text('voted_at').notNull().default(new Date().toISOString()),
});