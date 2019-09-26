const knex = require('../db/knex');
const _ = require("lodash")

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
    getUserDetails: async (req, res) => {
        try {
            const id = req.query.id;
            let user = null
            userResult = await knex.from('users').where({ 'users.id': id })

            user = userResult[0]

            let roles = await knex('user_roles').where({ userId: id });

            const Parallel = require('async-parallel');
            roles = await Parallel.map(roles, async item => {
                let rolename = await knex('roles').where({ id: item.roleId }).select('name');
                rolename = rolename[0].name;
                return rolename;
            });

            let omitedUser = _.omit(user, ['createdAt', 'updatedAt', 'password', "verifyToken",
                "createdBy",
                "verifyTokenExpiryTime"])



            return res.status(200).json({
                data: {
                    user: { ...omitedUser, roles }
                },
                message: 'User Details'
            })
        } catch (err) {
            console.log('[controllers][serviceOrder][GetServiceOrderList] :  Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    }
};

module.exports = usersController;