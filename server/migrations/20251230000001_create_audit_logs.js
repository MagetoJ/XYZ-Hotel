exports.up = function(knex) {
  return knex.schema.hasTable('audit_logs').then(exists => {
    if (!exists) {
      return knex.schema.createTable('audit_logs', table => {
        table.increments('id').primary();
        table.string('action').notNullable().index();
        table.integer('admin_id').unsigned().nullable().index();
        table.string('admin_username').nullable();
        table.integer('target_user_id').unsigned().nullable();
        table.string('target_username').nullable();
        table.text('details').nullable();
        table.timestamp('created_at').defaultTo(knex.fn.now()).index();
      });
    }
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('audit_logs');
};
