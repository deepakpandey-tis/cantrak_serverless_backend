const knex = require('../../db/knex');
const execDbProcedure = require('../../helpers/db/exec-db-procedure');

const scbPaymentCallback = async (req, res) => {
    try {

        let queryData = {
            query_name: "scb_payment_callback_log_save",
            record_id: null,
            json_log: req.body,
        };

        //console.log(queryData);
        let dbret = await execDbProcedure(queryData);
        //console.log(dbret);
        let transactionId = dbret.return_value[0].scb_transaction_id;
        let confirmId = dbret.return_value[0].record_id;

        let response_str = {};
        response_str.resCode = "00";
        response_str.resDesc = "success";
        response_str.transactionId = transactionId;
        response_str.confirmId = 'ScbPaymentCallBackLog:' + confirmId;
        console.log(response_str);

        //check again later, transaction not being returned for now...
        //let tq = scbpayment_transaction_inquiry(response_str, res);

        res.status(200).send(response_str);

    } catch (err) {
        console.log("[controllers][bill-payment][scbPaymentCallback] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });
    }
}

module.exports = scbPaymentCallback;