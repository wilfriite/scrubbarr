import { BaseModel, belongsTo, column } from "@adonisjs/lucid/orm";
import type { BelongsTo } from "@adonisjs/lucid/types/relations";
import type { DateTime } from "luxon";
import Library from "./library.js";

// On ajoute quelques champs pour être serein
export default class MediaQueue extends BaseModel {
  @column({ isPrimary: true })
  declare id: number;

  @column()
  declare tmdbId: string;

  @column()
  declare name: string;

  @belongsTo(() => Library)
  declare library: BelongsTo<typeof Library>;

  @column()
  declare libraryId: number;

  @column.date({ autoCreate: true })
  declare markedAt: DateTime;

  @column.dateTime()
  declare updatedAt: DateTime | null;

  @column.date()
  declare deletionPlannedAt: DateTime;

  @column()
  declare status: (typeof MediaQueueStatus)[keyof typeof MediaQueueStatus];
}

export const MediaQueueStatus = {
  PENDING: "PENDING",
  DELETED: "DELETED",
  CANCELLED: "CANCELLED",
} as const;
