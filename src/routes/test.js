const {Router} = require("express")
const knex = require('../db/knex');


const router = Router()
const emailHelper = require('../helpers/email');


router.get('/', async(req,res) => {
    try {
        let mailOptions = {
            to: 'xyz@mail.com',
            subject: 'Test Email ',
            template: 'test-email.ejs',
            templateData: {fullName: 'Deepak', OTP: '1111'}
        }
        const status = await emailHelper.sendTemplateEmail(mailOptions);

        res.json({
            status
        });

    } catch(err){
        res.status(200).json({failed:true})
    }
})

module.exports = router;