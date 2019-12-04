const {Router} = require("express")
const knex = require('../db/knex');


const router = Router()
const emailHelper = require('../helpers/email');


router.get('/', async(req,res) => {
    try {
        
        const status = await emailHelper.sendTemplateEmail('xyz@mail.com', 'Test Email ', 'test-email.ejs', {fullName: 'Deepak', OTP: '1111'});

        res.json({
            status
        });

    } catch(err){
        res.status(200).json({failed:true})
    }
})

module.exports = router;