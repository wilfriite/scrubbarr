import { BaseModel, column } from "@adonisjs/lucid/orm";
import type { DateTime } from "luxon";

export default class User extends BaseModel {
  @column({ isPrimary: true })
  declare id: number;

  @column()
  declare jellyfinId: string;

  @column()
  declare jellyseerrId: string | null;

  @column()
  declare username: string;

  @column()
  declare isAdmin: boolean;

  @column.dateTime()
  declare lastActivityAt: DateTime | null;

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime;
}
