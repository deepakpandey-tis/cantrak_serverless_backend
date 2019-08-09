const knex = require('../db/knex');

const usersController = {
    list: async (req, res) => {
        const users = await knex.select().from('users');
        res.status(200).json({
            data: {
                users: users,
                // currentUser: req.me
            }
        });
    },
};

module.exports = usersController;