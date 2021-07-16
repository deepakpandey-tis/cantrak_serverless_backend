const knex = require('../../db/knex');
const execDbProcedure = require('../../helpers/db/exec-db-procedure');

const getInvoiceHistory = async (req, res) => {
    try {

        console.log("[][][][][][][][][] ME [][][]][]][][][][][][][]",req.me);
        let userId = req.me.id;
        let queryData = {
            "query_name": "payment_log_get", 
            "record_id": null , 
            "show_request_response_flag": false,
            "user_id" : userId,
            ...req.body
        };

        let retVal = await execDbProcedure(queryData);
        return res.status(200).send(retVal);

    } catch (err) {
        console.log("[controllers][bill-payment][generalDbCall] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });
    }
}

module.exports = getInvoiceHistory;