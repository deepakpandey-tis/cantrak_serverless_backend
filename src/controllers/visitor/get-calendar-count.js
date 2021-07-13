const knex = require('../../db/knex');

const getCalendarCount = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;
        let payload = req.body;
        let sqlStr = '';

        let visitorsCount = null;

        /**
         *  calculation of in-house visitors based upon:
         *  (checked-in visitors but not checked-out) 
         *  OR 
         *  (checked-in and also checked-out) 
         *  OR 
         *  (Not Checked-in)
         * 
         *  calculation of in-house visitors based upon:
         *  not checked-in visitors
         */
        sqlStr = `SELECT 
        cdate, max(incoming_visitors) incoming_visitors, max(inhouse_visitors) inhouse_visitors
        (
            SELECT cdate, max(incoming_visitors) incoming_visitors, max(inhouse_visitors) inhouse_visitors
            FROM (
                SELECT to_char(to_timestamp(vi."departureDate" / 1000.0), 'YYYYMMDD') cdate, 0 incoming_visitors,
                    row_number() over (partition by to_char(to_timestamp(vi."departureDate" / 1000.0), 'YYYYMMDD') order by to_char(to_timestamp(vi."departureDate" / 1000.0), 'YYYYMMDD')) as inhouse_visitors
                FROM visitor_invitations vi, property_units pu
                WHERE vi."orgId" = ${orgId} and vi."propertyUnitsId" = pu.id and pu."companyId" = ${payload.companyId}
                and to_char(to_timestamp(vi."arrivalDate" / 1000.0), 'YYYYMMDD') >= ${payload.starDate} and to_char(to_timestamp(vi."arrivalDate" / 1000.0), 'YYYYMMDD') <= ${payload.endDate}   -- between dates
                and vi.status = 1
                and
                (
                    (vi."actualArrivalDate" is not null and vi."actualDepartureDate" is null)  -- checked-in and not checked-out
                    OR
                    (vi."actualArrivalDate" is not null and vi."actualDepartureDate" is not null)  -- checked-in and also checked-out
                    OR
                    (vi."actualArrivalDate" is null)  -- visitor not checked-in
                )
            ) as inhouse
            group by inhouse.cdate
            union all
            select to_char(to_timestamp(vi."arrivalDate" / 1000.0), 'YYYYMMDD') "cdate", count(1) incoming_visitors, 0 inhouse_visitors
            from visitor_invitations vi, property_units pu
            WHERE vi."orgId" = ${orgId} and vi."propertyUnitsId" = pu.id and pu."companyId" = ${payload.companyId}
            and (to_char(to_timestamp(vi."arrivalDate" / 1000.0), 'YYYYMMDD') >= ${payload.start_date} and to_char(to_timestamp(vi."arrivalDate" / 1000.0), 'YYYYMMDD') <= ${payload.end_date} and vi."actualArrivalDate" is null)  -- incoming visitors
            and vi.status = 1
            group by to_char(to_timestamp(vi."arrivalDate" / 1000.0), 'YYYYMMDD')
            order by cdate
        ) x group by x.cdate;`;

        var selectedRecs = await knex.raw(sqlStr);

        visitorsCount = selectedRecs.rows;               // list contains dates wise count of incoming visitors and inhouse visitors
        console.log(visitorsCount)

          const result = {
            data: {
                data: visitorsCount,
                message: "Calendar Incoming and Inhouse Visitors Count!"
            }
        }
        console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][Visitor][getCalendarCount] :  Error", err);
        return res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
    });
    
    }

}

module.exports = getCalendarCount;
