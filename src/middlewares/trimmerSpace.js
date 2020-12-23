const _ = require('lodash')
const trimmerSpace = {

    signUpTrimmer: (req, res, next) => {

        let body = req.body;
        if (body.email || body.userName || body.mobileNo) {
            body.email = String(body.email).replace(/\s+/g, '');
            body.userName = String(body.userName).replace(/\s+/g, '');
            body.mobileNo = String(body.mobileNo).replace(/\s+/g, '');
        }
        // if (body.email) {

        //     email = body.email.replace(/\s+/g, '');
        //     body.email = email;

        // } else if (body.userName) {

        //     userName = body.userName.replace(/\s+/g, '');
        //     body.userName = userName

        // } else if (body.mobileNo) {

        //     mobileNo = body.mobileNo.replace(/\s+/g, '');

        //     body.mobileNo = mobileNo + "00000000000000000000000";
        // }
        req.body = body;
        next();

    }

}

module.exports = trimmerSpace;