const knex = require('../../db/knex');

const getCalendarVisitorList = async (req, res) => {
    try {
        const visitorModule = 15;

        let orgId = req.me.orgId;
        let userId = req.me.id;
        let payload = req.body;
        let sqlStr = '';

        let visitorList = null;

        // Get logged-in user authorised / accessible projects
        let authorisedProjectIds = [];
        let authorisedProjects = req.userProjectResources.find(rec => rec.id == visitorModule)
        authorisedProjectIds = authorisedProjects.projects;
        //console.log('Authorised Project IDs:', authorisedProjectIds);

        /**
         *  visitorType: 1 - Incoming
         *  visitorType: 2 - Inhouse
         */
        sqlStr = `SELECT 1 "visitorType"
        , to_char(to_timestamp(vi."arrivalDate" / 1000.0), 'YYYYMMDD') "arrivalDate", to_char(to_timestamp(vi."departureDate" / 1000.0), 'YYYYMMDD') "departureDate"
        , vi.id, vi."name", pu."unitNumber", u."name" "tenantName", vi."mobileNo", vi."vehicleNo"
        from visitor_invitations vi
        left join users u on vi."tenantId" = u.id
        , property_units pu
        WHERE vi."orgId" = ${orgId} and vi."propertyUnitsId" = pu.id`;

        if(payload.companyId > 0) {
            // for selected company
            sqlStr += ` and pu."companyId" = ${payload.companyId}`;
        }
        sqlStr += ` and pu."projectId" in (${authorisedProjectIds})`

        sqlStr += ` and (to_char(to_timestamp(vi."arrivalDate" / 1000.0), 'YYYYMMDD') >= '${payload.startDate}' and to_char(to_timestamp(vi."arrivalDate" / 1000.0), 'YYYYMMDD') <= '${payload.endDate}' and vi."actualArrivalDate" is null)  -- incoming visitors
        and vi.status = 1
        union all
        select 2 visitor_type,
        case when vi."actualArrivalDate" is not null then to_char(to_timestamp(vi."actualArrivalDate" / 1000.0), 'YYYYMMDD') else to_char(to_timestamp(vi."arrivalDate" / 1000.0), 'YYYYMMDD') end "arrivalDate",
        case when vi."actualDepartureDate" is not null then to_char(to_timestamp(vi."actualDepartureDate" / 1000.0), 'YYYYMMDD') else to_char(to_timestamp(vi."departureDate" / 1000.0), 'YYYYMMDD') end "departureDate",
        vi.id, vi."name", pu."unitNumber"
        , u."name" "tenantName", vi."mobileNo", vi."vehicleNo"
        from visitor_invitations vi
        left join users u on vi."tenantId" = u.id
        , property_units pu
        where vi."orgId" = ${orgId} and vi."propertyUnitsId" = pu.id`;

        if(payload.companyId > 0) {
            // for selected company
            sqlStr += ` and pu."companyId" = ${payload.companyId}`;
        }
        sqlStr += ` and pu."projectId" in (${authorisedProjectIds})`

        sqlStr += ` and (to_char(to_timestamp(vi."arrivalDate" / 1000.0), 'YYYYMMDD') >= '${payload.startDate}' and to_char(to_timestamp(vi."arrivalDate" / 1000.0), 'YYYYMMDD') <= '${payload.endDate}' and vi."actualArrivalDate" is null)
        and vi.status = 1
        and
        (
            (vi."actualArrivalDate" is not null and vi."actualDepartureDate" is null)  -- checked-in and not checked-out
            or
            (vi."actualArrivalDate" is not null and vi."actualDepartureDate" is not null)  -- checked-in and also checked-out
            or
            (vi."actualArrivalDate" is null and to_char(to_timestamp(vi."arrivalDate" / 1000.0), 'YYYYMMDD') <> to_char(to_timestamp(vi."departureDate" / 1000.0), 'YYYYMMDD'))  -- visitor not checked-in and leaving same day (included in Incoming list)
        )
        order by "arrivalDate", "unitNumber" ;
        `;

        var selectedRecs = await knex.raw(sqlStr);

        visitorList = selectedRecs.rows;
        console.log(visitorList)

          const result = {
            data: {
                data: visitorList,
                message: "Calendar Incoming and Inhouse Visitor List!"
            }
        }
        console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][Visitor][getCalendarVisitorList] :  Error", err);
        return res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
    });
    
    }

}

module.exports = getCalendarVisitorList;

/**
 * 2021/07/14   Provision for All Companies added
 */
