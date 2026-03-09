import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
  protected tableName = "media_queues";

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer("postpone_count").notNullable().defaultTo(0);
    });
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn("postpone_count");
    });
  }
}
