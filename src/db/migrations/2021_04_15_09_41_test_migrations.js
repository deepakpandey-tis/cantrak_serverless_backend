exports.up = async (knex) => {
    await knex.raw(`CREATE TABLE IF NOT EXISTS public.testing_migration (
        id bigserial NOT NULL,
        "name" varchar(400) NULL,
        "isActive" bool NULL DEFAULT true,
        "createdAt" int8 NULL,
        "updatedAt" int8 NULL,
        CONSTRAINT testing_migration_pkey PRIMARY KEY (id)
    );`);

    await knex.raw(`INSERT INTO public.testing_migration ("name","isActive","createdAt","updatedAt") VALUES
             ('Deepak', true, 1615465168491, 1615465168491),
             ('Amar', true, 1615465168491, 1615465168491)
             ('Atif', true, 1615465168491, 1615465168491);`
            );
            
};

exports.down = async (knex) => {
    await knex.raw(`DROP TABLE IF EXISTS public.testing_migration`);
};
