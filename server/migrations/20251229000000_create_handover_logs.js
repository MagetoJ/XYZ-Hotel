exports.up = function(knex) {
  return knex.schema.createTable('handover_logs', table => {
    table.increments('id').primary();
    table.integer('staff_id').unsigned().references('id').inTable('staff').onDelete('CASCADE');
    table.text('message').notNullable();
    table.string('shift_type').defaultTo('Daily');
    table.boolean('is_resolved').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index('staff_id');
    table.index('created_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('handover_logs');
};
