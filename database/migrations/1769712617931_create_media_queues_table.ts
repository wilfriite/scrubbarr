import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
  protected tableName = "media_queues";

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments("id");

      // Identifiants uniques
      table.string("tmdb_id").notNullable().unique();
      table.string("name").notNullable();

      table
        .integer("library_id")
        .unsigned()
        .references("id")
        .inTable("libraries")
        .onDelete("SET NULL") // In case the library is deleted, we'd like to keep the queue item
        .nullable();

      table.timestamp("deletion_planned_at").notNullable();
      table.timestamp("marked_at").notNullable();
      table.timestamp("updated_at").notNullable();
    });
  }

  public async down() {
    this.schema.dropTable(this.tableName);
    // Si tu utilises Postgres, il faut aussi supprimer l'enum natif lors du rollback
    this.schema.raw('DROP TYPE IF EXISTS "media_status"');
  }
}
