const knex = require('../../db/knex');
const execDbProcedure = require('../../helpers/db/exec-db-procedure');

const getInvoice = async (req, res) => {
    try {

        console.log("[][][][][][][][][] ME [][][]][]][][][][][][][]",req.me);
        let userId = req.me.id;
        let queryData = {
            "query_name": "invoice_get_by_customer_group_by_project", 
            "user_id": userId,
            "show_only_outstanding_flag": true
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

module.exports = getInvoice;