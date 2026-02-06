import { BaseModel, belongsTo, column } from "@adonisjs/lucid/orm";
import type { BelongsTo } from "@adonisjs/lucid/types/relations";
import type { DateTime } from "luxon";
import Library from "./library.js";

export default class MediaQueue extends BaseModel {
  @column({ isPrimary: true })
  declare id: number;

  @column()
  declare externalId: string;

  @column()
  declare jellyfinId: string;

  @column()
  declare name: string;

  @belongsTo(() => Library)
  declare library: BelongsTo<typeof Library>;

  @column()
  declare libraryId: number;

  @column()
  declare strategyName: string;

  @column.date({ autoCreate: true })
  declare markedAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime;

  @column.date()
  declare deletionPlannedAt: DateTime;
}
