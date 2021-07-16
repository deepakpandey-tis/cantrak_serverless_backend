const knex = require('../../db/knex');
const execDbProcedure = require('../../helpers/db/exec-db-procedure');

const saveImage = async (req, res) => {
    try {

        console.log("[][][][][][][][][] ME [][][]][]][][][][][][][]",req.me);
        let userId = req.me.id;
        let queryData = {

            "query_name":"images_save",
            
            "id":null,
            
            "entityId":"1",
            
            "entityType":"BILL_PAYMENT",
            
            "createdAt":null,
            
            "updatedAt":null,
            
            "isActive":true,
            
            "orgId":1,
            
            "record_id":null,
            
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

module.exports = saveImage;