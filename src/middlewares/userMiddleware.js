const knex = require('../db/knex');
const createError = require('http-errors');




const userMiddleware = {

    customerInfo: async (req, res, next) => {

        try {
            let currentUser = req.me;
            let userHouseId = await knex('user_house_allocation').where({ userId: currentUser.id }).select('houseId');
            console.log("userHouseId", userHouseId);
            currentUser.houseIds = userHouseId.map(v => v.houseId)//[userHouseId.houseId];

            req.me = currentUser;

            console.log('[middleware][user]: Current User:', currentUser.id, currentUser.email);
            return next();

        } catch (err) {
            console.log('[middleware][user] :  Error', err);
            next(createError(401));
        }
    }
};

module.exports = userMiddleware;


