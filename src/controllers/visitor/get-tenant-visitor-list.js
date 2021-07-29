const knexReader = require('../../db/knex-reader');

const getTenantVisitorList = async (req, res) => {
    try {
        const visitorModule = 15;

        let orgId = req.me.orgId;
        let userId = req.me.id;
        let payload = req.body;
        let visitorSelect = +payload.visitorSelect;
        let visitorStatus = +payload?.visitorStatus;
        let pageNumber = payload.pageNumber;
        let pageSize = payload.pageSize;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        let visitorDetail = null;

        // Using CTE (Common Table Expressions 'SELECT in WITH' for pageSize retrieval)
        // No need for these Ids
        sqlSelect = `SELECT vi.id, vi."orgId", vi."userHouseAllocationId", vi."name", vi."mobileNo", vi."arrivalDate", vi."departureDate", vi."vehicleNo", vi."actualArrivalDate", vi."actualDepartureDate"
        , vi."status", vi."tenantId", vi."createdBy", vi."createdAt", vi."updatedBy", vi."updatedAt"
        , vi."propertyUnitsId" as "houseId", vi."registrationBy", pu."unitNumber"`;

        sqlFrom = ` FROM visitor_invitations vi, property_units pu`;

        sqlWhere = ` WHERE vi."orgId" = ${orgId} and vi."tenantId" = ${userId} and vi."propertyUnitsId" =  pu.id`;

        if(visitorSelect === 1){                 // Schedule Visits for today or at a later date
            sqlWhere += ` and  vi.status = 1 and to_char(to_timestamp(vi."arrivalDate" / 1000.0), 'YYYYMMDD') >= to_char(now(), 'YYYYMMDD') and vi."actualArrivalDate" is null`;
        }
        else
        if(visitorSelect === 2){                 // Schedule Departues / Check-outs: Active invitation / booking and Checked-ins
            sqlWhere += ` and  vi.status = 1 and vi."actualArrivalDate" is not null and vi."actualDepartureDate" is null`;
        }
        else
        if(visitorSelect === 3){                // Visitors History: Cancelled || No Show || Checked-out
            switch (visitorStatus){
                case 2: // Checked-out
                    sqlWhere += ` and vi."actualDepartureDate" is not null`;
                break ;

                case 3: // Cancellation
                    sqlWhere += ` and vi.status = 3`;
                break ;

                case 4: // No-Show
                    sqlWhere += ` and vi.status = 1 and to_char(to_timestamp(vi."arrivalDate" / 1000.0), 'YYYYMMDD') < to_char(now(), 'YYYYMMDD') and vi."actualArrivalDate" is null`;
                break ;

                default: // All
                    sqlWhere += ` and (vi."status" = 3 or (to_char(to_timestamp(vi."arrivalDate" / 1000.0), 'YYYYMMDD') < to_char(now(), 'YYYYMMDD') and vi."actualArrivalDate" is null) or vi."actualDepartureDate" is not null)`;
                break ;
            };

            sqlOrderBy = ` ORDER BY "arrivalDate" desc, "actualArrivalDate" desc, id asc`;
        }

        sqlStr  = `WITH Main_CTE AS (`;
        sqlStr += sqlSelect + sqlFrom + sqlWhere + `)`;
        sqlStr += `, Count_CTE AS (SELECT COUNT(*) AS "totalCount" FROM Main_CTE)`;     // To get the total number of records
        sqlStr += ` SELECT * FROM Main_CTE, Count_CTE`;
        sqlStr += sqlOrderBy;
        sqlStr += ` OFFSET (${pageNumber} * ${pageSize}) ROWS`
        sqlStr += ` FETCH NEXT ${pageSize} ROWS ONLY;`;

        console.log('getTenantVisitorList: ', sqlStr);
        
        var selectedRecs = await knexReader.raw(sqlStr);

        visitorDetail = selectedRecs.rows;
        //console.log(visitorDetail, selectedRecs);

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
        console.log("[controllers][Visitor][getTenantVisitorList] :  Error", err);
        return res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
    });
    
    }

}

module.exports = getTenantVisitorList;
