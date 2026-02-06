import { BaseModel, belongsTo, column } from "@adonisjs/lucid/orm";
import type { BelongsTo } from "@adonisjs/lucid/types/relations";
import type { DateTime } from "luxon";
import Library from "./library.js";

export default class MediaHistoryRecord extends BaseModel {
  @column({ isPrimary: true })
  declare id: number;

  @column()
  declare externalId: string;

  @column()
  declare jellyfinId: string;

  @column()
  declare name: string;

  @column()
  declare type: string;

  @belongsTo(() => Library)
  declare library: BelongsTo<typeof Library>;

  @column()
  declare libraryId: number;

  @column()
  declare strategyName: string;

  @column.date()
  declare plannedAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime;

  @column.dateTime({ autoCreate: true })
  declare processedAt: DateTime;

  @column()
  declare status: (typeof MediaHistoryRecordStatus)[keyof typeof MediaHistoryRecordStatus];
}

export const MediaHistoryRecordStatus = {
  DELETED: "DELETED", // Actually deleted from *arr
  MANUAL_KEEP: "MANUAL_KEEP", // User clicked on "Keep" (if there's UI in the future)
  AUTO_SAVED: "AUTO_SAVED", // 'check:queue' command decided to keep the media
} as const;
