import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
  protected tableName = "media_queues";

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dateTime("deletion_planned_at").alter();
    });
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.date("deletion_planned_at").alter();
    });
  }
}
