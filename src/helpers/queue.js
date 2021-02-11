const Joi = require('@hapi/joi');
const _ = require('lodash');
const AWS = require('aws-sdk');
const knex = require("../db/knex");

const createPmLongJobsNotification = require('../notifications/preventive-maintenance/long-jobs-notification')

const sendSQSMessage = async (messageBody, queueName, messageType) => {

    AWS.config.update({
        accessKeyId: process.env.NOTIFIER_ACCESS_KEY_ID,
        secretAccessKey: process.env.NOTIFIER_SECRET_ACCESS_KEY,
        region: process.env.REGION || "us-east-1"
    });

    const createdAt = new Date().toISOString();

    let params = {};

    if (queueName == 'mail-queue') {
        params = {
            DelaySeconds: 1,
            MessageAttributes: {
                "title": {
                    DataType: "String",
                    StringValue: "Email Message Body"
                },
                "createdAt": {
                    DataType: "String",
                    StringValue: createdAt
                },
                "messageType": {
                    DataType: "String",
                    StringValue: messageType
                }
            },
            MessageBody: messageBody,
            // MessageDeduplicationId: "TheWhistler",  // Required for FIFO queues
            // MessageId: "Group1",  // Required for FIFO queues
            QueueUrl: process.env.SQS_MAIL_QUEUE_URL
        };
    }

    if (queueName == 'long-jobs') {
        params = {
            DelaySeconds: 1,
            MessageAttributes: {
                "title": {
                    DataType: "String",
                    StringValue: "Long Jobs Message Body"
                },
                "createdAt": {
                    DataType: "String",
                    StringValue: createdAt
                },
                "messageType": {
                    DataType: "String",
                    StringValue: messageType
                }
            },
            MessageBody: messageBody,
            // MessageDeduplicationId: "TheWhistler",  // Required for FIFO queues
            // MessageId: "Group1",  // Required for FIFO queues
            QueueUrl: process.env.SQS_LONG_JOBS_URL
        };
    }

    return new Promise(async (resolve, reject) => {
        const sqs = new AWS.SQS({ apiVersion: '2012-11-05' });
        sqs.sendMessage(params, (err, data) => {
            if (err) {
                console.log("SQS Message POST Error", err);
                reject(err)
            } else {
                console.log("SQS Message POST Success", data.MessageId);
                resolve(data);
            }
        });
    })
};




const queueHelper = {

    addToQueue: async ( messageBody, queueName, messageType ) => {
        try {

            console.log('[helpers][queue][addToQueue] : Going to Queue Job',messageBody,queueName);

            const sqsMessageBody = JSON.stringify({ messageBody });
            const messageSendResult = await sendSQSMessage(sqsMessageBody, queueName, messageType);

            // const ALLOWED_CHANNELS = ['IN_APP','WEB_PUSH','SOCKET_NOTIFY']
            // let orgMaster = await knex
            // .from("organisations")
            // .where({ id: messageBody.orgId })
            // .first();

            // let dataNos = {
            //     payload: {
            //         orgData : orgMaster
            //     },
            // };

            // let receiver = await knex.from("users").where({ id: messageBody.requestedBy.id }).first();
            // let sender = await knex.from("users").where({ id: messageBody.requestedBy.id }).first();


            // await createPmLongJobsNotification.send(
            //     sender,
            //     receiver,
            //     dataNos,
            //     ALLOWED_CHANNELS
            // )




            return { success: true, message: 'Job added to Queue', data: messageSendResult };

        } catch (err) {
            console.log('[helpers][queue][addToQueue]:  Error', err);
            return { code: 'UNKNOWN_ERROR', message: err.message, error: err };
        }
    },
};

module.exports = queueHelper;