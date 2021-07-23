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
        console.log(dbret);

        let returnValue = dbret.return_value && dbret.return_value[0] ? dbret.return_value : dbret.return_value;

        let response_str = {
            resCode: '00',
            resDesc: 'Success',
            transactionId: returnValue.transactionId,
            confirmId: `ScbPaymentCallBackLog:${returnValue.record_id}`
        };
     
        console.log(response_str);
        
        res.status(200).send(response_str);

    } catch (err) {
        console.log("[controllers][bill-payment][scbPaymentCallback] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });
    }
}

module.exports = scbPaymentCallback;