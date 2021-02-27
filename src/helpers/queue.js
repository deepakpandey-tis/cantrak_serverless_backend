const Joi = require('@hapi/joi');
const _ = require('lodash');
const AWS = require('aws-sdk');
const uuidv4 = require('uuid/v4');
const knex = require("../db/knex");


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

    addToQueue: async (messageBody, queueName, messageType) => {
        try {

            console.log('[helpers][queue][addToQueue] : Going to Queue Job', messageBody, queueName);

            const sqsMessageBody = JSON.stringify(messageBody);

            // Check if message body is greater than 250 KB
            const size = Buffer.byteLength(sqsMessageBody);
            console.log('[helpers][queue][addToQueue] : Size of Message Payload:', size);

            if (size > 200 * 1024) {

                let bufferObject = new Buffer.from(sqsMessageBody);

                console.log('[helpers][queue][addToQueue] : Size of Message Payload > 250 KB', size);
                AWS.config.update({
                    accessKeyId: process.env.ACCESS_KEY_ID,
                    secretAccessKey: process.env.SECRET_ACCESS_KEY,
                    region: process.env.REGION || "us-east-1"
                });

                const actionId = uuidv4();
                const s3Params = {
                    Bucket: process.env.S3_BUCKET_NAME,
                    Key: `sqs/jobs/payloads/${actionId}.json`,
                    ContentType: 'application/json',
                    Body: bufferObject,
                    ACL: "public-read"
                };

                const s3 = new AWS.S3({
                    'signatureVersion': 'v4'
                });

                // Upload the object to s3...
                await s3.putObject(s3Params).promise();

                // prepare new Message Body for Sqs with s3 key...
                let newSqsMessage = {
                    'payloadType': 's3',
                    's3FileKey': `sqs/jobs/payloads/${actionId}.json`
                };
                newSqsMessage = Json.stringify(newSqsMessage);

                const messageSendResult = await sendSQSMessage(newSqsMessage, queueName, messageType);
                return { success: true, message: 'Job added to Queue with s3 Payload...', data: messageSendResult };

            } else {
                const messageSendResult = await sendSQSMessage(sqsMessageBody, queueName, messageType);
                return { success: true, message: 'Job added to Queue', data: messageSendResult };
            }

        } catch (err) {
            console.log('[helpers][queue][addToQueue]:  Error', err);
            return { code: 'UNKNOWN_ERROR', message: err.message, error: err };
        }
    },
};

module.exports = queueHelper;