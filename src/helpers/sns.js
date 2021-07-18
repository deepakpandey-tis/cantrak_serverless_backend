const AWS = require('aws-sdk');

const sendSNSMessage = async (messageBody, messageAttributes) => {

    console.log('[helpers][sns][sendSNSMessage]: messageBody:', messageBody);
    console.log('[helpers][sns][sendSNSMessage]: messageAttributes:', messageAttributes);
    console.log('[helpers][sns][sendSNSMessage]: THIRDPARTY_SNS_ARN:', process.env.THIRDPARTY_SNS_ARN);

    AWS.config.update({
        accessKeyId: process.env.ACCESS_KEY_ID,
        secretAccessKey: process.env.SECRET_ACCESS_KEY,
    });

    AWS.config.update({ region: process.env.THIRDPARTY_SNS_ARN_REGION || 'us-east-2' });


    // Create publish parameters
    let params = {
        Message: JSON.stringify(messageBody), /* required */
        TopicArn: process.env.THIRDPARTY_SNS_ARN
    };

    if (messageAttributes) {
        params.MessageAttributes = messageAttributes;
    }


    return new Promise(async (resolve, reject) => {

        var publishTextPromise = new AWS.SNS({ apiVersion: '2010-03-31' }).publish(params).promise();

        // Handle promise's fulfilled/rejected states
        publishTextPromise.then((data) => {
            console.log(`Message ${params.Message} send sent to the topic ${params.TopicArn}`);
            console.log("MessageID is " + data.MessageId);
            resolve(data);
        }).catch((err) => {
            console.error(err, err.stack);
            reject(err);
        });

    })
};


const snsHelper = {
    sendSNSMessage: async (message, type = "THIRDPARTY_NOTIFICATIONS") => {
        try {
            console.log('[helpers][sns][sendSNSMessage]:', message);

            let createdAt = new Date().getTime();
            createdAt = '' + createdAt;

            let orgId = message.orgId ? message.orgId : 0
            orgId = '' + orgId;

            let messageAttributes = null;

            if (type == "THIRDPARTY_NOTIFICATIONS") {
                messageAttributes = {
                    "MODULE": {
                        DataType: "String",
                        StringValue: message.module ? message.module : ""
                    },
                    "ORGID": {
                        DataType: "Number",
                        StringValue: orgId
                    },
                    "createdAt": {
                        DataType: "Number",
                        StringValue: createdAt
                    },
                }
            } else {
                messageAttributes = {
                    "ORGID": {
                        DataType: "Number",
                        StringValue: orgId
                    },
                    "createdAt": {
                        DataType: "Number",
                        StringValue: createdAt
                    },
                }
            }

            let sentData = await sendSNSMessage(message, messageAttributes);
            return sentData;
        } catch (err) {
            console.log('[helpers][sns][sendSNSMessage]:  Error', err);
            return { code: 'UNKNOWN_ERROR', message: err.message, error: err };
        }
    },
};

module.exports = snsHelper;