import { BaseModel, column } from "@adonisjs/lucid/orm";
import type { DateTime } from "luxon";

export default class Library extends BaseModel {
  @column({ isPrimary: true })
  declare id: number;

  @column()
  declare jellyfinId: string;

  @column()
  declare name: string;

  @column()
  declare type: (typeof LibraryType)[keyof typeof LibraryType];

  @column()
  declare gracePeriodDays: number;

  @column()
  declare isActive: boolean;

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime;
}

export const LibraryType = {
  Movies: "movies",
  TvShows: "tvshows",
} as const;
