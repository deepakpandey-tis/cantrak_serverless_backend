const knex = require('../../db/knex');

const getVisitorsCount = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;
        let sqlStr = '';

        let visitorsCount = null;

        sqlStr = `SELECT vi."createdBy"
        , sum(case when vi.status = 0 and vi."actualArrivalDate" is null then 1 else 0 end) "scheduleVisitorsCount"
        , sum(case when vi.status = 1 or vi."actualArrivalDate" is not null then 1 else 0 end) "historyVisitorsCount"
        FROM visitor_invitations vi
        WHERE vi."orgId" = ${orgId} and vi."createdBy" = ${userId}
        GROUP BY vi."createdBy"`;

        var selectedRecs = await knex.raw(sqlStr);

        visitorsCount = selectedRecs.rows[0];               // list contains only one row
        console.log(visitorsCount)

          const result = {
            data: {
                scheduleVisitorsCount: visitorsCount.scheduleVisitorsCount,
                historyVisitorsCount: visitorsCount.historyVisitorsCount,
                message: "Visitors count!"
            }
        }
        console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][Visitor][getVisotrsCount] :  Error", err);
        return res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
    });
    
    }

}

module.exports = getVisitorsCount;
