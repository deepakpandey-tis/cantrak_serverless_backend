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
                console.log('[][auth]: Token', token);
                const decodedTokenData = await jwt.verify(token, process.env.JWT_PRIVATE_KEY);
                // console.log('[middleware][auth]: Token Decoded Data:', decodedTokenData);

                const userId = decodedTokenData.id;
                req.id = decodedTokenData.id;
                req.orgId = decodedTokenData.orgId;

                let currentUser = await knex('users').where({ id: decodedTokenData.id });
                currentUser = currentUser[0];

                console.log('[middleware][auth]: Current User:', currentUser);

                if (currentUser.isActive) {

                    let roles = await knex('application_user_roles').where({ userId: currentUser.id });
                    currentUser.roles = roles;

                    const Parallel = require('async-parallel');
                    let roles = await Parallel.map(currentUser.roles, async item => {
                        let roleName = await knex('application_roles').where({ id: item.roleId }).select('name');
                        roleName = roleName[0].name;
                        return roleName
                        // let r;
                        // if (item.roleId == 1) {   // Superadmin
                        //     r = {
                        //         roleName: roleName
                        //     }
                        // } else if (item.roleId == 7) {   // Customer
                        //     r = {
                        //         roleName: roleName,
                        //         houseId: item.entityId
                        //     }
                        // } else {
                        //     r = {
                        //         roleName: roleName,
                        //         organisationId: item.entityId
                        //     }
                        // }
                        // return r;
                    });
                    currentUser.roles = roles;
                    currentUser.applicationRoles = roles;

                    req.me = currentUser;
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

            if (currentUser.roles && currentUser.roles.some(e => e.roleName === 'superAdmin')) {
                return next();
            }

            return next(createError(403));
        } catch (err) {
            console.log('[middleware][auth][isSuperAdmin] :  Error', err);
            next(createError(401));
        }
    },

    isAdmin: async (req, res, next) => {

        try {

            let currentUser = req.me;

            if (currentUser.roles && currentUser.roles.some(e => e.roleName === 'superAdmin')) {
                return next();
            }

            if (currentUser.roles && currentUser.roles.some(e => e.roleName === 'admin')) {
                return next();
            }

            return next(createError(403));
        } catch (err) {
            console.log('[middleware][auth][isAdmin] :  Error', err);
            next(createError(401));
        }
    },

    isEngineer: async (req, res, next) => {
        try {

            let currentUser = req.me;

            if (currentUser.roles && currentUser.roles.some(e => {
                return e.roleName === 'superAdmin' || e.roleName === 'admin' || e.roleName === 'engineer'
            })) {
                return next();
            }

            return next(createError(403));
        } catch (err) {
            console.log('[middleware][auth][isEngineer] :  Error', err);
            next(createError(401));
        }
    },

    isSupervisor: async (req, res, next) => {
        try {

            let currentUser = req.me;

            if (currentUser.roles && currentUser.roles.some(e => {
                return e.roleName === 'superAdmin' || e.roleName === 'admin' || e.roleName === 'engineer' || e.supervisor === 'supervisor'
            })) {
                return next();
            }

            return next(createError(403));
        } catch (err) {
            console.log('[middleware][auth][isSupervisor] :  Error', err);
            next(createError(401));
        }
    },

    isTechnician: async (req, res, next) => {
        try {

            let currentUser = req.me;

            if (currentUser.roles && currentUser.roles.some(e => {
                return e.roleName === 'superAdmin' || e.roleName === 'admin' || e.roleName === 'engineer' || e.supervisor === 'supervisor' || e.supervisor === 'technician' 
            })) {
                return next();
            }

            return next(createError(403));
        } catch (err) {
            console.log('[middleware][auth][isTechnician] :  Error', err);
            next(createError(401));
        }
    },

    isWorker: async (req, res, next) => {
        try {

            let currentUser = req.me;

            if (currentUser.roles && currentUser.roles.some(e => {
                return e.roleName !== 'customer'
            })) {
                return next();
            }

            return next(createError(403));
        } catch (err) {
            console.log('[middleware][auth][isTechnician] :  Error', err);
            next(createError(401));
        }
    },

    isCustomer: async (req, res, next) => {
        try {

            let currentUser = req.me;

            if (currentUser.roles && currentUser.roles.some(e => {
                return e.roleName === 'customer'
            })) {
                return next();
            }

            return next(createError(403));
        } catch (err) {
            console.log('[middleware][auth][isTechnician] :  Error', err);
            next(createError(401));
        }
    },


    isRole: async (req, res, next) => {

        try {

            let currentUser = req.me;

            if (currentUser && currentUser.roles && currentUser.roles.includes("superAdmin") || currentUser.roles.includes("admin") || currentUser.roles.includes("supervisor") || currentUser.roles.includes("technician") || currentUser.roles.includes("worker") || currentUser.roles.includes("engineer")) {
                return next();
            }
            return next(createError(403));
        } catch (err) {
            console.log('[middleware][auth][isRoleDelete] :  Error', err);
            next(createError(401));
        }
    }
};

module.exports = authMiddleware;


