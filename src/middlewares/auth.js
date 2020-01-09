const knex = require('../db/knex');
const createError = require('http-errors');
var jwt = require('jsonwebtoken');



const authMiddleware = {

    isAuthenticated: async (req, res, next) => {

        try {

            if (!req.headers || !req.headers.authorization) {
                next(createError(401));
            }

            let token = req.headers.authorization;
            token = token.replace('Bearer ', '');

            if (token && token != '') {

                // Very token using JWT
                console.log('[isAuthenticated]: Token', token);
                const decodedTokenData = await jwt.verify(token, process.env.JWT_PRIVATE_KEY);
                // console.log('[middleware][auth]: Token Decoded Data:', decodedTokenData);

                req.id = decodedTokenData.id;
                req.orgId = decodedTokenData.orgId;

                let currentUser = await knex('users').where({ id: decodedTokenData.id }).first();

                // console.log('[middleware][auth]: Current User:', currentUser);

                if (currentUser.isActive) {

                    // An user can have atmost one application role
                    let userApplicationRole = await knex('application_user_roles').where({ userId: Number(currentUser.id) }).select('roleId', 'orgId').first();
                    currentUser.roles = userApplicationRole;

                    switch (Number(userApplicationRole.roleId)) {
                        case 1:
                            req.superAdmin = true;
                            currentUser.isSuperAdmin = true;
                            currentUser.roles = ['superAdmin'];
                            break;
                        case 2:
                            req.orgAdmin = true;
                            currentUser.isOrgAdmin = true;
                            currentUser.roles = ['orgAdmin'];
                            break;
                        case 3:
                            req.orgUser = true;
                            currentUser.isOrgUser = true;
                            currentUser.roles = ['orgUser'];
                            break;
                        case 4:
                            req.customer = true;
                            currentUser.isCustomer = true;
                            currentUser.roles = ['customer'];
                            break;
                    }
                    // let roleName = await knex('application_roles').where({ id: userApplicationRole.roleId }).select('name').first();
                    // currentUser.roles = [roleName];

                    req.me = currentUser;
                    
                    console.log('[middleware][auth]: Current User:', currentUser);
                    return next();
                }

                // If currentUser isNotActive
                return next(createError(401));

            } else {
                return next(createError(401));
            }
        } catch (err) {
            console.log('[middleware][auth] :  Error', err);
            next(createError(401));
        }
    },

    isSuperAdmin: async (req, res, next) => {

        try {

            let currentUser = req.me;

            if (currentUser.roles && currentUser.roles.some(e => e === 'superAdmin')) {
                return next();
            }

            return next(createError(403));
        } catch (err) {
            console.log('[middleware][auth][isSuperAdmin] :  Error', err);
            next(createError(401));
        }
    },

    isOrgAdmin: async (req, res, next) => {

        try {

            let currentUser = req.me;

            if (currentUser.roles && currentUser.roles.some(e => e === 'orgAdmin' || e === 'superAdmin')) {
                return next();
            }

            return next(createError(403));
        } catch (err) {
            console.log('[middleware][auth][isOrgAdmin] :  Error', err);
            next(createError(401));
        }
    },

    isOrgUser: async (req, res, next) => {

        try {

            let currentUser = req.me;

            if (currentUser.roles && currentUser.roles.some(e => e === 'orgUser')) {
                return next();
            }

            return next(createError(403));
        } catch (err) {
            console.log('[middleware][auth][isOrgUser] :  Error', err);
            next(createError(401));
        }
    },

    isCustomer: async (req, res, next) => {
        try {

            let currentUser = req.me;

            if (currentUser.roles && currentUser.roles.some(e => e === 'customer')) {
                return next();
            }

            return next(createError(403));
        } catch (err) {
            console.log('[middleware][auth][isTechnician] :  Error', err);
            next(createError(401));
        }
    },
};

module.exports = authMiddleware;


