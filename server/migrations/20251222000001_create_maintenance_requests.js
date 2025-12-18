exports.up = function(knex) {
  return knex.schema.hasTable('maintenance_requests').then(function(exists) {
    if (exists) return;
    return knex.schema.createTable('maintenance_requests', function(table) {
      table.increments('id').primary();
      table.integer('room_id').unsigned().references('id').inTable('rooms').onDelete('CASCADE');
      table.string('title').notNullable();
      table.text('description').notNullable();
      table.enum('priority', ['low', 'medium', 'high', 'urgent']).defaultTo('medium');
      table.enum('status', ['pending', 'in_progress', 'completed', 'cancelled']).defaultTo('pending');
      table.integer('reported_by').unsigned().references('id').inTable('staff').onDelete('CASCADE');
      table.integer('assigned_to').unsigned().references('id').inTable('staff').onDelete('SET NULL').nullable();
      table.timestamp('reported_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('completed_at').nullable();
      table.text('notes').nullable();
      table.timestamps(true, true);
    });
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('maintenance_requests');
};