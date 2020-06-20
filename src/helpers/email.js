const Joi = require('@hapi/joi');
const _ = require('lodash');
const AWS = require('aws-sdk');
const nodemailer = require("nodemailer");


AWS.config.update({
    accessKeyId: process.env.NOTIFIER_ACCESS_KEY_ID,
    secretAccessKey: process.env.NOTIFIER_SECRET_ACCESS_KEY,
    region: process.env.REGION || "us-east-1"
});

const SHOULD_QUEUE = true;

const sendEmailMessage = async (mailOptions) => {


    if(process.env.APP_ENV !== 'PRODUCTION') {
        console.log("Not Production Env, we will not send mail");

        return Promise.resolve();
    }


    return new Promise(async (resolve, reject) => {
        const ses = new AWS.SES();

        const transporter = nodemailer.createTransport({
            SES: ses
        });

        transporter.sendMail(mailOptions, function (err, info) {
            if (err) {
                console.log("Error sending email");
                reject(err);
            } else {
                console.log("Email sent successfully");
                resolve(info);
            }
        });

    })
};

const sendSQSMessage = async (messageBody) => {

    if(process.env.APP_ENV !== 'PRODUCTION') {
        console.log("Not Production Env, Not Queing");

        return Promise.resolve();
    }

    const createdAt = new Date().toISOString();

    let params = {
        DelaySeconds: 10,
        MessageAttributes: {
            "title": {
                DataType: "String",
                StringValue: "Email Message Body"
            },
            "createdAt": {
                DataType: "String",
                StringValue: createdAt
            },
            // "WeeksOn": {
            //     DataType: "Number",
            //     StringValue: "6"
            // }
        },
        MessageBody: messageBody,
        // MessageDeduplicationId: "TheWhistler",  // Required for FIFO queues
        // MessageId: "Group1",  // Required for FIFO queues
        QueueUrl: process.env.SQS_MAIL_QUEUE_URL
    };

    return new Promise(async (resolve, reject) => {
        const sqs = new AWS.SQS();
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


const emailHelper = {
    sendTemplateEmail: async ({ to, subject, template, templateData }) => {
        try {

            console.log('[helpers][email][sendTemplateEmail] To:', to);
            console.log('[helpers][email][sendTemplateEmail] Template Data:', templateData);

            const schema = Joi.object().keys({
                to: Joi.string().email().required(),
                subject: Joi.string().required(),
                template: Joi.string().required(),
                templateData: Joi.object().optional(),
                layout: Joi.string().optional(),
            });

            const result = Joi.validate({ to, subject, template, templateData, layout }, schema);
            console.log('[helpers][email][sendTemplateEmail]: Joi Validate Params:', result);

            if (result && result.hasOwnProperty('error') && result.error) {
                return { code: 'PARAMS_VALIDATION_ERROR', message: + result.error.message, error: new Error('Could Not Send Mail due to params Validations Failed.') };
            }

            // CODE FOR COMPILING EMAIL TEMPLATES
            const path = require('path');
            const url = require('url');
            const util = require('util');
            const ejs = require('ejs');
            const fs = require("fs");
            // const readFile = util.promisify(fs.readFile);


            var emailTemplatePath = path.join(__dirname, '..', 'emails/', template);
            var layout;
            if (layout) {
                layout = path.join(path.dirname(emailTemplatePath), path.resolve('layouts/', layout));
            } else {
                layout = path.join(path.dirname(emailTemplatePath), 'layouts/default-layout.ejs');
            }

            console.log('[helpers][email][sendTemplateEmail]: emailTemplatePath:', emailTemplatePath);
            console.log('[helpers][email][sendTemplateEmail]: Email layout:', layout);

            let htmlEmailContents = await ejs.renderFile(emailTemplatePath, { url, ...templateData });
            htmlEmailContents = await ejs.renderFile(layout, { url: url, body: htmlEmailContents });

            console.log('[helpers][email][sendTemplateEmail]: htmlEmailContents :', htmlEmailContents);

            let from = process.env.FROM_EMAIL_ADDRESS || 'important-notifications@servicemind.asia';

            let mailOptions = {
                from: from,
                to: to,
                subject: subject,
                headers: {
                    'SM-MAIL-TRACE': 'SM'
                },
                // text: `Verification Link: ${emailMessageData.verficationLink}`,
                html: htmlEmailContents
            };


            if (SHOULD_QUEUE) {
                await emailHelper.queueEmailForSend(mailOptions);     // Will sent the mail on queue (async)
                return true; 
            } else {
                 await emailHelper.sendEmail(mailOptions);     // Will sent the mail on queue (async)
                 return true;
            }

        } catch (err) {
            console.log('[helpers][email][sendTemplateEmail]:  Error', err);
            return { code: 'UNKNOWN_ERROR', message: err.message, error: err };
        }
    },

    queueEmailForSend: async ({ from, to, subject, html }) => {
        try {

            console.log('[helpers][email][queueEmailForSend] : Going to Queue Email for Send');
            // console.log('[helpers][email][queueEmailForSend] : Mail Options:', mailOptions);

            const sqsMessageBody = JSON.stringify({ from, to, subject, html });
            const messageSendResult = await sendSQSMessage(sqsMessageBody);

            return { success: true, message: 'Email Queued for sending', data: messageSendResult };

        } catch (err) {
            console.log('[helpers][email][queueEmailForSend]:  Error', err);
            return { code: 'UNKNOWN_ERROR', message: err.message, error: err };
        }
    },

    sendEmail: async ({ from, to, subject, html }) => {
        try {

            console.log('[helpers][email][sendEmail] : Going to Send Email');
            // console.log('[helpers][email][queueEmailForSend] : Mail Options:', mailOptions);

            const emailSendResult = await sendEmailMessage({ from, to, subject, html });

            return { success: true, message: 'Email Sent Successfully', data: emailSendResult };

        } catch (err) {
            console.log('[helpers][email][queueEmailForSend]:  Error', err);
            return { code: 'UNKNOWN_ERROR', message: err.message, error: err };
        }
    }
};

module.exports = emailHelper;