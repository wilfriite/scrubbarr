import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
  public async up() {
    this.schema.alterTable("media_queues", (table) => {
      table.renameColumn("tmdb_id", "external_id");
    });
    this.schema.alterTable("media_history_records", (table) => {
      table.renameColumn("tmdb_id", "external_id");
    });
  }

  public async down() {
    this.schema.alterTable("media_queues", (table) => {
      table.renameColumn("external_id", "tmdb_id");
    });
    this.schema.alterTable("media_history_records", (table) => {
      table.renameColumn("external_id", "tmdb_id");
    });
  }
}
