import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
  protected tableName = "media_queues";

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string("jellyfin_id").unique().notNullable();
    });
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn("jellyfin_id");
    });
  }
}
