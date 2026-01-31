import { BaseSchema } from "@adonisjs/lucid/schema";
import { MediaQueueStatus } from "#models/media_queue";

export default class extends BaseSchema {
  protected tableName = "media_queues";

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments("id");

      // Identifiants uniques
      table.string("tmdb_id").notNullable().unique();
      table.string("name").notNullable();

      // État du processus
      // On utilise check() pour s'assurer que seules ces valeurs sont acceptées
      table
        .string("status")
        .defaultTo(MediaQueueStatus.PENDING)
        .notNullable()
        .checkIn(Object.values(MediaQueueStatus));

      table.integer("library_id").notNullable();
      table
        .foreign("library_id")
        .references("libraries.id")
        .onDelete("CASCADE");

      table.timestamp("deletion_planned_at").notNullable();
      table.timestamp("marked_at").notNullable();
      table.timestamp("updated_at").nullable();
    });
  }

  public async down() {
    this.schema.dropTable(this.tableName);
    // Si tu utilises Postgres, il faut aussi supprimer l'enum natif lors du rollback
    this.schema.raw('DROP TYPE IF EXISTS "media_status"');
  }
}
