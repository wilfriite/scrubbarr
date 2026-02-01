import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
  protected tableName = "media_queues";

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string("strategy_name").nullable();
    });
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn("strategy_name");
    });
  }
}
