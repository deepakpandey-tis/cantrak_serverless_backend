
const AWS = require('aws-sdk');
const knex = require('../db/knex');
const moment = require('moment');

var jwt = require('jsonwebtoken');


const AWS = require('aws-sdk');


const socketConnectionHelper = {

    getUserFromToken: async (token) => {
        try {

            const decodedTokenData = await jwt.verify(token, process.env.JWT_PRIVATE_KEY);
            console.log(`[helpers][socket-connection-helper][getUserFromToken]: decodedTokenData:`, decodedTokenData);

            let currentUser = await knex('users').where({ id: decodedTokenData.id }).first();

            return {userId: decodedTokenData.id, orgId: decodedTokenData.orgId, user: currentUser};

        } catch (err) {
            console.log(`[helpers][socket-connection-helper][getUserFromToken]: Error:`, err);
            return err;
        }
    },


    addConnection: async (userId, connectionId, deviceId, orgId) => {
        try {

            const currentTime = moment().valueOf();
            const expiryTime = moment().add(12, 'hours');

            let connection = await knex('socket_connections').where({ userId, deviceId })
                .where('expiredAt', '<', currentTime).select('*').first();

            if (connection) {
                // Update row with new connection Id...., and reset expired time as well...
                connection = await knex('socket_connections').where({ id: connection.id }).update({
                    connectionId, updatedAt: currentTime, expiredAt: expiryTime
                }).returning(["*"]);

            } else {
                connection = await knex('socket_connections').insert({
                    connectionId, userId, deviceId, orgId,
                    createdAt: currentTime, updatedAt: currentTime, expiredAt: expiryTime
                }).returning(["*"]);
            }

            return connection && connection[0] ? connection[0] : connection;

        } catch (err) {
            console.log(`[helpers][socket-connection-helper][addConnections]: Error:`, err);
            return err;
        }
    },


    removeConnection: async (connectionId) => {
        try {

            console.log(`[helpers][socket-connection-helper][removeConnection]: Removing connection with Id:`, connectionId);
            await knex('socket_connections').where({ connectionId }).del();

        } catch (err) {
            console.log(`[helpers][socket-connection-helper][removeConnection]: Error:`, err);
            return err;
        }
    },


    getAllConnectionsOfOrganisation: async (orgId) => {
        try {

            const currentTime = moment().valueOf();

            let connections = await knex('socket_connections').where({ orgId })
                .where('expiredAt', '<', currentTime).select('*');

            return connections;

        } catch (err) {
            console.log(`[helpers][socket-connection-helper][getAllConnections]: Error:`, err);
            return err;
        }
    },


    getConnectionByUserId: async (userId) => {
        try {

            const currentTime = moment().valueOf();

            let connections = await knex('socket_connections').where({ userId })
                .where('expiredAt', '<', currentTime).select('*');

            return connections;

        } catch (err) {
            console.log(`[helpers][socket-connection-helper][getConnectionByUserId]: Error:`, err);
            return err;
        }
    },


    getConnectionByConnectionId: async (connectionId) => {
        try {

            const currentTime = moment().valueOf();

            let connections = await knex('socket_connections').where({ connectionId })
                .where('expiredAt', '<', currentTime).select('*');

            return connections;

        } catch (err) {
            console.log(`[helpers][socket-connection-helper][getUserIdByConnectionId]: Error:`, err);
            return err;
        }
    },

};

module.exports = socketConnectionHelper;



