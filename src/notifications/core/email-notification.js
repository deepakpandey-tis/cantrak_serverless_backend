const _ = require('lodash');
const emailHelper = require('../../helpers/email'); 

const emailNotification = {
    send: async ({ to, subject, template, templateData }) => {
        try {

            await emailHelper.sendTemplateEmail({ to, subject, template, templateData });

        } catch (err) {
            console.log('[notifications][core][email-notification][send]:  Error', err);
            return { code: 'UNKNOWN_ERROR', message: err.message, error: err };
        }
    },

};

module.exports = emailNotification;