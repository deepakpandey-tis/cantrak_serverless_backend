const knex = require('../../db/knex');

const getVisitorList = async (req, res) => {
    try {
        const visitorModule = 15;

        let orgId = req.me.orgId;
        let userId = req.me.id;
        let payload = req.body;
        let visitorSelect = payload.visitorSelect;
        let sortCol = payload.sortCol;
        let sortOrder = payload.sortOrder;
        let pageNumber = payload.pageNumber;
        let pageSize = payload.pageSize;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        let visitorDetail = null;

        // Get logged-in user authorised / accessible projects
        let authorisedProjectIds = [];
        let authorisedProjects = req.userProjectResources.find(rec => rec.id == visitorModule)
        authorisedProjectIds = authorisedProjects.projects;
        //console.log('Authorised Project IDs:', authorisedProjectIds);

        // Setting default values, if not passed
        if(sortCol === ''){
            sortCol = '"arrivalDate"';
        }

        if(sortOrder === ''){
            sortOrder = 'DESC';
        }

        if(pageNumber < 0){
            pageNumber = 0;
        }

        if(pageSize < 0){
            pageSize = 10;
        }
        
        // Using CTE (Common Table Expressions 'SELECT in WITH' for pageSize retrieval)
        // No need for these Ids
        // sqlSelect = `SELECT pu2."orgId", pu2."companyId", pu2."projectId", pu2."buildingPhaseId"
        sqlSelect = `SELECT pu2."orgId", pu2."companyId", pu2."projectId", pu2."buildingPhaseId"
        , pu2."id" "puId",  pu2."unitNumber", u2."name" "tenantName", vi.id id, vi."name", vi."createdAt", vi."status"
        , vi."arrivalDate", vi."actualArrivalDate", vi."departureDate", vi."actualDepartureDate", vi."propertyUnitsId", vi."registrationBy"`;

        sqlFrom = ` FROM property_units pu2, user_house_allocation uha, visitor_invitations vi`;
        sqlFrom += ` LEFT OUTER JOIN users u2 ON vi."tenantId" = u2.id`;

        sqlWhere = ` WHERE pu2."orgId" = ${orgId}`;
        if(payload.filter.companyId){
            sqlWhere += ` and pu2."companyId" = ${payload.filter.companyId}`;

            if(payload.filter.projectId){
                sqlWhere += ` and pu2."projectId" = ${payload.filter.projectId}`;

                if(payload.filter.buildingPhaseId){
                    sqlWhere += ` and pu2."buildingPhaseId" = ${payload.filter.buildingPhaseId}`;

                    if(payload.filter.unitId){
                        sqlWhere += ` and pu2."id" = ${payload.filter.unitId}`;
                    }
                }
            }
        }

        // Company || Project NOT selected, show visitors of authorised projects
        if(!payload.filter.companyId || !payload.filter.projectId){
            sqlWhere += ` and pu2."projectId" in (${authorisedProjectIds})`
        }

        sqlWhere += ` and pu2."orgId" = uha."orgId" and pu2.id = uha."houseId"`;
        if(payload.filter.tenantId){
            sqlWhere += ` and uha."userId" = ${payload.filter.tenantId}`;
        }
        // 2021/07/07 part of left outer join  sqlWhere += ` and uha."orgId" = u2."orgId" and uha."userId" = u2.id`;
        sqlWhere += ` and uha."orgId" = vi."orgId" and uha.id = vi."userHouseAllocationId"`;
        if(visitorSelect === 1){                 // Schedule Visits / Check-ins: Active invitation / booking 
            sqlWhere += ` and  vi.status = 1 and vi."actualArrivalDate" is null`;
        }
        else
        if(visitorSelect === 2){                 // Schedule Departues / Check-outs: Active invitation / booking and Checked-ins
            sqlWhere += ` and  vi.status = 1 and vi."actualArrivalDate" is not null and vi."actualDepartureDate" is null`;
        }
        else
        if(visitorSelect === 3){                // Visitors History: Cancelled and Already visited
            sqlWhere += ` and (vi."status" = 3 or vi."actualDepartureDate" is not null)`;
        }

        if(payload.filter.visitorName){
            sqlWhere += ` and lower(vi."name") like lower('%${payload.filter.visitorName}%')`;
        }

        // Adding id in order by to ensure list is displayed in the order visitors are added
        sqlOrderBy = ` ORDER BY ${sortCol} ${sortOrder}, id asc`;
        //console.log('get-visitor-list sql: ', sqlSelect + sqlFrom + sqlWhere);

        sqlStr  = `WITH Main_CTE AS (`;
        sqlStr += sqlSelect + sqlFrom + sqlWhere + `)`;
        sqlStr += `, Count_CTE AS (SELECT COUNT(*) AS "totalCount" FROM Main_CTE)`;     // To get the total number of records
        sqlStr += ` SELECT * FROM Main_CTE, Count_CTE`;
        sqlStr += sqlOrderBy;
        sqlStr += ` OFFSET (${pageNumber} * ${pageSize}) ROWS`
        sqlStr += ` FETCH NEXT ${pageSize} ROWS ONLY;`;


        /* sql without pageSize logic
        console.log('get-visitor-list: ', payload);
        sqlStr = `SELECT pu2."unitNumber", u2."name" "tenantName", vi.id, vi."name", vi."createdAt", vi."arrivalDate"
        FROM property_units pu2, user_house_allocation uha, users u2, visitor_invitations vi
        WHERE pu2."orgId" = ${orgId}`;

        if(payload.filter.companyId){
            sqlStr += ` and pu2."companyId" = ${payload.filter.companyId}`

            if(payload.filter.projectId){
                sqlStr += ` and pu2."projectId" = ${payload.filter.projectId}`

                if(payload.filter.buildingPhaseId){
                    sqlStr += ` and pu2."buildingPhaseId" = ${payload.filter.buildingPhaseId}`

                    if(payload.filter.unitId){
                        sqlStr += ` and pu2."id" = ${payload.filter.unitId}`
                    }
                }
            }
        }

        sqlStr += ` and pu2."orgId" = uha."orgId" and pu2.id = uha."houseId"`
        if(payload.filter.tenantId){
            sqlStr += ` and uha."userId" = ${payload.filter.tenantId}`
        }

        sqlStr += ` and uha."orgId" = u2."orgId" and uha."userId" = u2.id`
        sqlStr += ` and uha."orgId" = vi."orgId" and uha.id = vi."userHouseAllocationId" and uha."userId" = vi."createdBy" and  vi.status = 1 and vi."actualArrivalDate" is null`
        if(payload.filter.visitorName){
            sqlStr += ` and lower(vi."name") like lower('%${payload.filter.visitorName}%')`
        }

        sqlStr += ` ORDER BY vi."arrivalDate" desc`
        */

        //console.log('getVisitorList: ', sqlStr);
        
        var selectedRecs = await knex.raw(sqlStr);

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
        console.log("[controllers][Visitor][getVisitorList] :  Error", err);
        return res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
    });
    
    }

}

module.exports = getVisitorList;

/**
 * 2021/07/07  columns added to select statement: propertyUnitsId, registrationBy
 */
