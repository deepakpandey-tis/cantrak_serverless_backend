const knex = require('../../db/knex');

const hasAnyVisitor = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;
        let sqlStr = '';

        let visitorSelect = req.query.visitorSelect;

        let visitorDetail = null;

        sqlStr = `SELECT *
        FROM visitor_invitations vi
        WHERE vi."orgId" = ${orgId} and vi."tenantId" = ${userId}`;

        if(visitorSelect == 1){                 // Active and Schedule Visit
            sqlStr = sqlStr + ` and vi."status" = 1 and vi."actualArrivalDate" is null` ;
        }
        else if(visitorSelect == 2){            // Cancelled and Already Visited Visitor
            sqlStr = sqlStr + ` and (vi."status" = 3 or vi."actualArrivalDate" is not null)` ;
        }
        /*
        else all visitors
        */

        sqlStr = sqlStr + ` limit 1`;

        var selectedRecs = await knex.raw(sqlStr);

        //  console.log(selectedRecs.rows.length)
        selectedRecs.rows.length > 0 ? visitorDetail = {hasVisitor: 1} : visitorDetail = {hasVisitor: 0};
        //  console.log(visitorDetail)

          const result = {
            data: {
                hasVisitor: visitorDetail.hasVisitor,
                message: "Has visitor!"
            }
        }
        //  console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][Visitor][getVisitors] :  Error", err);
        return res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
    });
    
    }

}

module.exports = hasAnyVisitor;
