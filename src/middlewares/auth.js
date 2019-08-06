const knex = require('../db/knex');
const createError = require('http-errors');


const authMiddleware = {
    isAuthenticated: async (req, res, next) => {
        if (!req.headers || !req.headers.authorization) {
            next(createError(401));
        }

        let token = req.headers.authorization;
        token = token.replace('Bearer ', '');

        if (token === 'abc123') {
            next();
        } else {
            next(createError(401));
        }
    }
};

module.exports = authMiddleware;


