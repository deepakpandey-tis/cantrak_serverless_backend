const _ = require('lodash');
const AWS = require('aws-sdk');


const smsNotification = {
    send: async ({ textMessage, mobileNumber }) => {
        try {

            AWS.config.update({
                accessKeyId: process.env.NOTIFIER_ACCESS_KEY_ID,
                secretAccessKey: process.env.NOTIFIER_SECRET_ACCESS_KEY,
                region: 'us-east-1'
            });
        
            let smsAttributes = {
                attributes: { /* required */
                    'DefaultSMSType': 'Transactional', /* highest reliability */
                    //'DefaultSMSType': 'Promotional' /* lowest cost */
                }
            };
        
            // Create promise and SNS service object
            let setSMSTypePromise = new AWS.SNS({ apiVersion: '2010-03-31' }).setSMSAttributes(smsAttributes).promise();
        
            setSMSTypePromise.then((data) => {
                console.log(data);
            }).catch((err) => {
                console.error(err, err.stack);
            });
        
            // Create publish parameters
            var params = {
                Message: textMessage, /* required */
                PhoneNumber: mobileNumber,
            };
        
            // Create promise and SNS service object
            var publishTextPromise = new AWS.SNS({ apiVersion: '2010-03-31' }).publish(params).promise();
           
            smsSentData = await new Promise((resolve, reject) => {
                publishTextPromise.then((data) => {
                    resolve(data)
                }).catch((err) => {
                    reject(err)
                });
            });
        
            return smsSentData;

        } catch (err) {
            console.log('[notifications][core][sms-notification][send]:  Error', err);
            return { code: 'UNKNOWN_ERROR', message: err.message, error: err };
        }
    },

};

module.exports = smsNotification;