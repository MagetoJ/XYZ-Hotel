exports.up = function(knex) {
  return knex.schema.createTable('shifts', function(table) {
    table.increments('id').primary();
    table.integer('staff_id').unsigned().references('id').inTable('staff').onDelete('CASCADE');
    table.date('shift_date').notNullable();
    table.time('start_time').notNullable();
    table.time('end_time').notNullable();
    table.timestamp('actual_start_time').nullable();
    table.timestamp('actual_end_time').nullable();
    table.string('status').defaultTo('scheduled');
    table.integer('break_duration').defaultTo(0);
    table.text('notes').nullable();
    table.timestamps(true, true);
  })
  .then(() => {
    return knex.schema.createTable('attendance_log', function(table) {
      table.increments('id').primary();
      table.integer('staff_id').unsigned().references('id').inTable('staff').onDelete('CASCADE');
      table.integer('shift_id').unsigned().references('id').inTable('shifts').onDelete('SET NULL').nullable();
      table.timestamp('clock_in').notNullable();
      table.timestamp('clock_out').nullable();
      table.string('status').notNullable();
      table.decimal('total_hours', 8, 2).nullable();
    });
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('attendance_log').then(() => {
    return knex.schema.dropTable('shifts');
  });
};