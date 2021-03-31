const knex = require('../../db/knex');

const getCheckinVisitors = async (req, res) => {
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
        let authorisedProjects = req.userProjectResources.find(rec => rec.id == visitorModule)
        authorisedProjectIds = authorisedProjects.projects;

        sqlSelect = `SELECT vi.id, vi."orgId", vi."userHouseAllocationId", vi."name", vi."mobileNo", vi."arrivalDate", vi."departureDate", vi."guestCount", vi."vehicleNo", vi."actualArrivalDate", vi."actualDepartureDate"
        , vi."status", vi."createdBy", vi."createdAt", vi."updatedBy", vi."updatedAt", uha."houseId", pu."unitNumber", u2."name" "tenantName", p2."projectName"`;

        sqlFrom = ` FROM visitor_invitations vi, user_house_allocation uha, property_units pu, users u2, projects p2 `;

        // Always Active Invitations and are NOT checked-in
        sqlWhere = ` WHERE`;
        if(visitorId > 0){
            // In case of 0, complete list is returned
            sqlWhere += ` vi.id = ${visitorId} and`;
        }
        sqlWhere += ` pu."orgId" = ${orgId} and vi."status" = 1 and vi."actualArrivalDate" is null and vi."userHouseAllocationId" = uha.id and uha."houseId" = pu.id`;
        sqlWhere += ` and  vi."createdBy" = u2.id and pu."projectId" = p2.id `

        // Visitors only of authorised projects of logged-in user
        sqlWhere += ` and pu."projectId" in (${authorisedProjectIds})`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere;
        //console.log('get-checkin-visitors: ', sqlStr);
        var selectedRecs = await knex.raw(sqlStr);

        visitorList = selectedRecs.rows;

        const result = {
            data: {
                list: visitorList,
                message: "Checkin Visitors list!"
            }
        }
        //console.log(result.data);

        return res.status(200).json({
            data: result.data
        });

    } catch (err) {
        console.log("[controllers][Visitor][getCheckinVisitors] :  Error", err);
        return res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
    });
    
    }

}

module.exports = getCheckinVisitors;
