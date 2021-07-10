const knex = require('../../db/knex');

const getVisitors = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;
        let sqlStr = '';

        let visitorSelect = req.query.visitorSelect;

        let visitorDetail = null;

        sqlStr = `SELECT vi.id, vi."orgId", vi."userHouseAllocationId", vi."name", vi."mobileNo", vi."arrivalDate", vi."departureDate", vi."vehicleNo", vi."actualArrivalDate", vi."actualDepartureDate"
        , vi."status", vi."tenantId", vi."createdBy", vi."createdAt", vi."updatedBy", vi."updatedAt"
        , vi."propertyUnitsId" as "houseId", vi."registrationBy", pu."unitNumber"
        FROM visitor_invitations vi, property_units pu
        WHERE vi."orgId" = ${orgId} and vi."tenantId" = ${userId} and vi."propertyUnitsId" =  pu.id`;

        /* 2021/07/07
        sqlStr = `SELECT vi.id, vi."orgId", vi."userHouseAllocationId", vi."name", vi."mobileNo", vi."arrivalDate", vi."departureDate", vi."vehicleNo", vi."actualArrivalDate", vi."actualDepartureDate"
        , vi."status", vi."tenantId", vi."createdBy", vi."createdAt", vi."updatedBy", vi."updatedAt"
        , uha."houseId", pu."unitNumber"
        FROM visitor_invitations vi, user_house_allocation uha, property_units pu
        WHERE vi."orgId" = ${orgId} and vi."tenantId" = ${userId} and vi."userHouseAllocationId" = uha.id and uha."houseId" = pu.id`;
        */

        if(visitorSelect == 1){                 // Schedule Visits for today or at a later date
            sqlStr = sqlStr + ` and vi."status" = 1 and to_char(to_timestamp(vi."arrivalDate" / 1000.0), 'YYYYMMDD') >= to_char(now(), 'YYYYMMDD') and vi."actualArrivalDate" is null 
            ORDER BY vi."arrivalDate" desc, vi.id` ;
        }
        else if(visitorSelect == 2){            // Visitors History: Cancelled || No Show || Checked-out
            sqlStr = sqlStr + ` and (vi."status" = 3 or (to_char(to_timestamp(vi."arrivalDate" / 1000.0), 'YYYYMMDD') < to_char(now(), 'YYYYMMDD') and vi."actualArrivalDate" is null) or vi."actualDepartureDate" is not null) 
            ORDER BY vi."arrivalDate" desc, vi."actualArrivalDate" desc, vi.id asc` ;
        }
        /*
        else all visitors
        */

        console.log('[controllers][Visitor][getVisitors] sql: ', sqlStr);
        
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

module.exports = getVisitors;

/**
 * 2021/07/07   1. property unit id is now part of visitor_invitations table. propertyUnitsId is used to get unitNumber
 *                 user_house_allocation is therefore not used to get unitNumber
 *                 since registration of a unit without tenant assigned can be done, userHouseAllocationId and tenantId may be null
 *                 visitor-list: arrival-date >= today-date
 *                 history-list: cancelled || arrival-date < today-date || checked-out
 */
