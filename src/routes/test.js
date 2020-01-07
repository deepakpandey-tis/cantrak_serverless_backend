const {Router} = require("express")

const router = Router()
const emailHelper = require('../helpers/email');
const trimmer = require('../middlewares/trimmer')


router.get('/', async(req,res) => {
    try {
        let mailOptions = {
            to: 'mail@deepakpandey.in',
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

router.post('/',trimmer, (req,res) => {
    return res.status(200).json(req.body)
})

module.exports = router;