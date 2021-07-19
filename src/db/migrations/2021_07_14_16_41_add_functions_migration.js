exports.up = async (knex) => {
    await knex.raw(`CREATE TABLE IF NOT EXISTS public.knex_db_functions_lock (
        id serial NOT NULL,
	    name varchar(500) NOT NULL,
	    hash varchar(1000) NOT NULL,
	    batch int4 NULL,
	    migration_time timestamptz NULL,
	    CONSTRAINT knex_function_migrations_pkey PRIMARY KEY (id)
    );`);
            
};

exports.down = async (knex) => {
    await knex.raw(`DROP TABLE IF EXISTS public.knex_db_functions_lock`);
};
