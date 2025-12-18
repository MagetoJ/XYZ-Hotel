exports.up = function(knex) {
  return knex.schema.createTable('room_transactions', function(table) {
    table.increments('id').primary();
    table.integer('room_id').unsigned().notNullable().references('id').inTable('rooms').onDelete('CASCADE');
    table.integer('staff_id').unsigned().notNullable().references('id').inTable('staff').onDelete('SET NULL');
    table.string('guest_name').notNullable();
    table.string('guest_contact').nullable();
    table.timestamp('check_in_time').defaultTo(knex.fn.now());
    table.timestamp('check_out_time').nullable();
    table.decimal('total_amount', 10, 2).nullable();
    table.string('status').defaultTo('active'); // active, completed
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('room_transactions');
};