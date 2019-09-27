const knex = require('../db/knex');
const _ = require("lodash")

const usersController = {
    list: async (req, res) => {
        const users = await knex.select().from('users');





        let reqData = req.query;

        let pagination = {};
        let per_page = reqData.per_page || 10;
        let page = reqData.current_page || 1;
        if (page < 1) page = 1;
        let offset = (page - 1) * per_page;



        let [total, rows] = await Promise.all([
            knex.count('* as count').from("users").first(),
            knex.select("*").from("users").offset(offset).limit(per_page)
        ])

        let count = total.count;
        pagination.total = count;
        pagination.per_page = per_page;
        pagination.offset = offset;
        pagination.to = offset + rows.length;
        pagination.last_page = Math.ceil(count / per_page);
        pagination.current_page = page;
        pagination.from = offset;
        pagination.data = rows;





        res.status(200).json({
            data: {
                users: pagination,
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