import { BaseSchema } from "@adonisjs/lucid/schema";
import { MediaHistoryRecordStatus } from "#models/media_history_record";

export default class extends BaseSchema {
  protected tableName = "media_history_records";

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments("id");

      table.string("jellyfin_id").index().notNullable();
      table.string("tmdb_id").index().notNullable();
      table.string("name").notNullable();
      table.string("type").notNullable();

      table.string("strategy_name").notNullable();

      table
        .integer("library_id")
        .unsigned()
        .references("id")
        .inTable("libraries")
        .onDelete("SET NULL") // In case the library is deleted, we'd like to keep the queue item
        .nullable();

      table
        .string("status")
        .notNullable()
        .checkIn(Object.values(MediaHistoryRecordStatus));

      // Dates
      table.timestamp("planned_at").notNullable();
      table.timestamp("processed_at").notNullable();

      table.timestamp("updated_at").notNullable();
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
