const Joi = require('@hapi/joi');
const _ = require('lodash');
const AWS = require('aws-sdk');
const nodemailer = require("nodemailer");
const knex = require("../db/knex");
const queueHelper = require('./queue');


const SHOULD_QUEUE = process.env.IS_OFFLINE ? false : true;   // If true email will be queued and then sent

const sendEmailMessage = async (mailOptions) => {

    AWS.config.update({
        accessKeyId: process.env.ACCESS_KEY_ID,
        secretAccessKey: process.env.SECRET_ACCESS_KEY,
        region: process.env.REGION || "ap-southeast-1"
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

const emailHelper = {
    sendTemplateEmail: async ({ to, subject, template, templateData, orgId }) => {
        console.log("template data======>>>>>", templateData.orgId)
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

            let orgMaster = await knex('organisations').select('organisationName', 'organisationLogo')
                .where({ id: templateData.orgId, isActive: true }).first();
            console.log("orgMasterData", orgMaster);

            if (orgMaster.organisationLogo == '') {
                orgLogoFile = 'https://servicemind.asia/wp-content/uploads/thegem-logos/logo_4ecb6ca197a78baa1c9bb3558b2f0c09_1x.png';
            } else {
                orgLogoFile = orgMaster.organisationLogo;
            }

            if (orgMaster.organisationName == '') {
                orgNameData = "ServiceMind";
            } else {
                orgNameData = orgMaster.organisationName;
            }

            fromSettings = 'important-notifications@servicemind.asia';
            layout = 'organization-layout.ejs';


            // CODE FOR COMPILING EMAIL TEMPLATES
            const path = require('path');
            const url = require('url');
            const util = require('util');
            const ejs = require('ejs');
            const fs = require("fs");
            // const readFile = util.promisify(fs.readFile);


            var emailTemplatePath = path.join(__dirname, '..', 'emails/', template);
            if (layout) {
                layout = path.join(__dirname, '..', 'emails', 'layouts/' + layout);
            } else {
                layout = path.join(path.dirname(emailTemplatePath), 'layouts/default-layout.ejs');
            }

            console.log('[helpers][email][sendTemplateEmail]: emailTemplatePath:', emailTemplatePath);
            console.log('[helpers][email][sendTemplateEmail]: Email layout:', layout);

            let htmlEmailContents = await ejs.renderFile(emailTemplatePath, { url, ...templateData ,orgName: orgNameData});
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

            const messageSendResult = await queueHelper.addToQueue({ from, to, subject, html }, 'mail-queue', 'EMAIL');

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