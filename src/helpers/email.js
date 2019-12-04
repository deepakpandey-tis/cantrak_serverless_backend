const knex = require('../db/knex');
const Joi = require('@hapi/joi');
const moment = require('moment');
const uuidv4 = require('uuid/v4');
const _ = require('lodash');


const emailHelper = {
    sendTemplateEmail: async ({to, subject, template, templateData, layout}) => {
        // const users = await knex.select().from('users');
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

            let from = process.env.FROM_EMAIL_ADDRESS || 'no-reply@servicemind.asia';

            let mailOptions = {
                from: from,
                to: to,
                subject: subject,
                // text: `Verification Link: ${emailMessageData.verficationLink}`,
                html: htmlEmailContents
            };

            return await emailHelper.queueEmailForSend(mailOptions);


        } catch (err) {
            console.log('[helpers][email][sendTemplateEmail]:  Error', err);
            return { code: 'UNKNOWN_ERROR', message: err.message, error: err };
        }
    },

    queueEmailForSend: async ({from, to, subject, html}) => {
        try {

            console.log('[helpers][email][queueEmailForSend] : Going to Queue Email for Send');
            // console.log('[helpers][email][queueEmailForSend] : Mail Options:', mailOptions);



            return { success: true, message: 'Email Queued for sending' };

        } catch (err) {
            console.log('[helpers][email][queueEmailForSend]:  Error', err);
            return { code: 'UNKNOWN_ERROR', message: err.message, error: err };
        }
    }
};

module.exports = emailHelper;