import { BaseSchema } from '@adonisjs/lucid/schema'
import { LibraryType } from '#models/library'

export default class extends BaseSchema {
  protected tableName = 'libraries'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('jellyfin_id').unique().notNullable() 
      table.string('name').notNullable()                 
      table.enum('type', Object.values(LibraryType)).notNullable()
      table.integer('grace_period_days').defaultTo(30)   
      table.boolean('is_active').defaultTo(true)         
      table.timestamps(true)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}