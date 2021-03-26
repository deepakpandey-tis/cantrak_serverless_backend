const knex = require('../../db/knex');

const getVisitorList = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;
        let projectIds = req.accessibleProjects;
        let sqlStr = '';

        let visitorSelect = req.query.visitorSelect;

        let visitorDetail = null;

        sqlStr = `SELECT vi.id, vi."orgId", vi."userHouseAllocationId", vi."name", vi."mobileNo", vi."arrivalDate", vi."departureDate", vi."guestCount", vi."vehicleNo", vi."actualArrivalDate", vi."actualDepartureDate"
        , vi."status", vi."createdBy", vi."createdAt", vi."updatedBy", vi."updatedAt", uha."houseId", pu."unitNumber"
        FROM visitor_invitations vi, user_house_allocation uha, property_units pu
        WHERE vi."orgId" = ${orgId} and vi."createdBy" = ${userId} and vi."userHouseAllocationId" = uha.id and uha."houseId" = pu.id`;

        if(visitorSelect == 1){                 // Schedule Visits: Active invitation / booking 
            sqlStr = sqlStr + ` and vi."status" = 1 and vi."actualArrivalDate" is null 
            ORDER BY vi."arrivalDate" desc` ;
        }
        else if(visitorSelect == 2){            // Visitors History: Cancelled and Already visited
            sqlStr = sqlStr + ` and (vi."status" = 3 or vi."actualArrivalDate" is not null) 
            ORDER BY vi."arrivalDate" desc, vi."actualArrivalDate" desc` ;
        }
        /*
        else all visitors
        */

        //console.log(sqlStr);
        
        var selectedRecs = await knex.raw(sqlStr);

        visitorDetail = selectedRecs.rows;
        //console.log(visitorDetail)

          const result = {
            data: {
                list: visitorDetail,
                message: "Visitors list!"
            }
        }
        //console.log(result.data)

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

module.exports = getVisitorList;
