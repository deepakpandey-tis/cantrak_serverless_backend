const Joi = require('@hapi/joi');
const _ = require('lodash');
const AWS = require('aws-sdk');
const nodemailer = require("nodemailer");

const SHOULD_QUEUE = true;   // If true email will be queued and then sent

const sendEmailMessage = async (mailOptions) => {


    // if(process.env.APP_ENV !== 'PRODUCTION') {
    //     console.log("Not Production Env, we will not send mail");

    //     return Promise.resolve();
    // }

    AWS.config.update({
        accessKeyId: process.env.NOTIFIER_ACCESS_KEY_ID,
        secretAccessKey: process.env.NOTIFIER_SECRET_ACCESS_KEY,
        region: process.env.REGION || "us-east-1"
    });


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

    AWS.config.update({
        accessKeyId: process.env.NOTIFIER_ACCESS_KEY_ID,
        secretAccessKey: process.env.NOTIFIER_SECRET_ACCESS_KEY,
        region: process.env.REGION || "us-east-1"
    });


    const createdAt = new Date().toISOString();

    let params = {
        DelaySeconds: 5,
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
                StringValue: "EMAIL"
            }
        },
        MessageBody: messageBody,
        // MessageDeduplicationId: "TheWhistler",  // Required for FIFO queues
        // MessageId: "Group1",  // Required for FIFO queues
        QueueUrl: process.env.SQS_MAIL_QUEUE_URL
    };

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




const emailHelper = {
    sendTemplateEmail: async ({ to, subject, template, templateData, orgId }) => {
        try {
            var layout;
            console.log('[helpers][email][sendTemplateEmail] To:', to);
            console.log('[helpers][email][sendTemplateEmail] Template Data:', templateData);

            const schema = Joi.object().keys({
                to: Joi.string().email().required(),
                subject: Joi.string().required(),
                template: Joi.string().required(),
                templateData: Joi.object().optional(),
                layout: Joi.string().optional(),
                orgId: Joi.string().optional(),
            });

            const result = Joi.validate({ to, subject, template, templateData, layout, orgId }, schema);
            console.log('[helpers][email][sendTemplateEmail]: Joi Validate Params:', result);

            if (result && result.hasOwnProperty('error') && result.error) {
                return { code: 'PARAMS_VALIDATION_ERROR', message: + result.error.message, error: new Error('Could Not Send Mail due to params Validations Failed.') };
            }

            if(orgId === '56' && process.env.SITE_URL == 'https://d3lw11mvhjp3jm.cloudfront.net'){
                orgLogoFile = 'https://cbreconnect.servicemind.asia/assets/img/cbre-logo.png';
                orgNameData = "CBRE Connect";
                fromSettings = 'important-notifications@cbreconnect.servicemind.asia';
                layout='organization-layout.ejs';
            }else if(orgId === '89' && process.env.SITE_URL == 'https://d3lw11mvhjp3jm.cloudfront.net'){                
                orgLogoFile = 'https://senses.servicemind.asia/assets/img/senses-logo.png';
                orgNameData = "Senses";
                fromSettings = 'important-notifications@senses.servicemind.asia';
                layout='organization-layout.ejs';
            }else{
                orgLogoFile = 'https://servicemind.asia/wp-content/uploads/thegem-logos/logo_4ecb6ca197a78baa1c9bb3558b2f0c09_1x.png';
                orgNameData = "ServiceMind";
                fromSettings = 'important-notifications@servicemind.asia';
                // orgLogoFile = 'https://cbreconnect.servicemind.asia/assets/img/cbre-logo.png';
                // orgNameData = "CBRE Connect";
                // fromSettings = 'important-notifications@cbreconnect.servicemind.asia';
            }

            // CODE FOR COMPILING EMAIL TEMPLATES
            const path = require('path');
            const url = require('url');
            const util = require('util');
            const ejs = require('ejs');
            const fs = require("fs");
            // const readFile = util.promisify(fs.readFile);


            var emailTemplatePath = path.join(__dirname, '..', 'emails/', template);
            if (layout) {
                layout = path.join(path.dirname(emailTemplatePath), 'layouts/'+layout);
            } else {
                layout = path.join(path.dirname(emailTemplatePath), 'layouts/default-layout.ejs');
            }

            console.log('[helpers][email][sendTemplateEmail]: emailTemplatePath:', emailTemplatePath);
            console.log('[helpers][email][sendTemplateEmail]: Email layout:', layout);

            let htmlEmailContents = await ejs.renderFile(emailTemplatePath, { url, ...templateData });
            htmlEmailContents = await ejs.renderFile(layout, { url: url, body: htmlEmailContents, orgLogo: orgLogoFile, orgName: orgNameData });

            console.log('[helpers][email][sendTemplateEmail]: htmlEmailContents :', htmlEmailContents);

            let from = process.env.FROM_EMAIL_ADDRESS || fromSettings;

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