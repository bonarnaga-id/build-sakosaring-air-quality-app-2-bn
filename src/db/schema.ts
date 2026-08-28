import {
  pgTable,
  serial,
  varchar,
  real,
  integer,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * Tabel stasiun pemantauan kualitas udara di Kecamatan Sako, Palembang.
 */
export const stasiunSako = pgTable("stasiun_sako", {
  id: serial("id").primaryKey(),
  location: varchar("location", { length: 255 }).notNull().unique(),
  pm25: real("pm25").notNull(),
  pm10: real("pm10").notNull(),
  co: real("co").notNull(),
  so2: real("so2").notNull(),
  ispu: integer("ispu").notNull(),
  comfortIndex: real("comfort_index").notNull(),
  status: varchar("status", { length: 40 }).notNull(),
  temperature: real("temperature").notNull(),
  humidity: real("humidity").notNull(),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
});

/**
 * Tabel riwayat donasi Trakteer.
 */
export const riwayatTrakteer = pgTable("riwayat_trakteer", {
  id: serial("id").primaryKey(),
  donorName: varchar("donor_name", { length: 255 }).notNull(),
  amount: integer("amount").notNull(),
  message: text("message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type StasiunSako = typeof stasiunSako.$inferSelect;
export type NewStasiunSako = typeof stasiunSako.$inferInsert;
export type RiwayatTrakteer = typeof riwayatTrakteer.$inferSelect;
export type NewRiwayatTrakteer = typeof riwayatTrakteer.$inferInsert;
