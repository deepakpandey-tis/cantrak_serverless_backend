const knex = require('../../db/knex');
const execDbProcedure = require('../../helpers/db/exec-db-procedure');
const paymentLogSave = require('./payment_log_save');

const generalDbCall = async (req, res) => {
    try {

        let pre_query_name = req.body.query_name;
        let pre_record_id = req.body.record_id;

        if (pre_query_name == "payment_log_save") {
            return paymentLogSave(req, res);
        }
        else {
            let queryData = {...req.body};

            let retVal = await execDbProcedure(queryData);
            return res.status(200).send(retVal);
        }

    } catch (err) {
        console.log("[controllers][bill-payment][generalDbCall] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });
    }
}

module.exports = generalDbCall;