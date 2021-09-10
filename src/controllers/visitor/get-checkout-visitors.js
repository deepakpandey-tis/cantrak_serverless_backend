const knexReader = require('../../db/knex-reader');

const getCheckoutVisitors = async (req, res) => {
    try {
        const visitorModule = 15;

        let orgId = req.me.orgId;
        let userId = req.me.id;
        let payload = req.body;
        let visitorId = req.query.visitorId;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        let visitorList = null;

        // Get logged-in user authorised / accessible projects
        let authorisedProjectIds = [];
        let authorisedProjects = req.userPlantationResources.find(rec => rec.id == visitorModule)
        authorisedProjectIds = authorisedProjects.projects;

        sqlSelect = `SELECT vi.id, vi."orgId", vi."userHouseAllocationId", vi."name", vi."mobileNo", vi."arrivalDate", vi."departureDate", vi."vehicleNo", vi."actualArrivalDate", vi."actualDepartureDate"
        , vi."status", vi."tenantId", vi."createdBy", vi."createdAt", vi."updatedBy", vi."updatedAt", vi."propertyUnitsId" as "houseId", vi."registrationBy"
        , pu."unitNumber", u2."name" "tenantName", p2."projectName"`;

        sqlFrom = ` FROM visitor_invitations vi LEFT OUTER JOIN users u2 ON vi."tenantId" = u2.id`;
        sqlFrom += ` , property_units pu, projects p2 `;

        // Always Active Invitations and are NOT checked-out
        sqlWhere = ` WHERE`;
        if(visitorId > 0){
            // In case of 0, complete list is returned
            sqlWhere += ` vi.id = ${visitorId} and`;
        }
        sqlWhere += ` pu."orgId" = ${orgId} and vi."status" = 1 and vi."actualArrivalDate" is not null and vi."actualDepartureDate" is null and vi."propertyUnitsId" = pu.id`;
        sqlWhere += ` and pu."projectId" = p2.id `

        // Visitors only of authorised projects of logged-in user
        sqlWhere += ` and pu."projectId" in (${authorisedProjectIds})`;
        sqlWhere += ' ORDER BY vi."departureDate" desc'

        sqlStr = sqlSelect + sqlFrom + sqlWhere;
        //console.log('get-checkin-visitors: ', sqlStr);
        var selectedRecs = await knexReader.raw(sqlStr);

        visitorList = selectedRecs.rows;

        const result = {
            data: {
                list: visitorList,
                message: "Checkout Visitors list!"
            }
        }
        //console.log(result.data);

        return res.status(200).json({
            data: result.data
        });

    } catch (err) {
        console.log("[controllers][Visitor][getCheckoutVisitors] :  Error", err);
        return res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
    });
    
    }

}

module.exports = getCheckoutVisitors;

/**
 * 2021/07/07  1) columns added to select statement: propertyUnitsId, registrationBy
 *             2) Since registration for a unit can be done without assigned tenant, users table is now left outer join to retrieve records where tenantId is null / 0
 */
