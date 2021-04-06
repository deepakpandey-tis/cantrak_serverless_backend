const knex = require('./db/knex');

module.exports.dBWakeUpTask = async (event, context) => {
  
  await knex('users').limit(1);
  console.log('[handlers][dBWakeUpTask]: Task Completed Successfully');

  return true;
};
