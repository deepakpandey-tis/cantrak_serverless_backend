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
            sortCol = 'vi."arrivalDate"';
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
        , pu2."id",  pu2."unitNumber", u2."name" "tenantName", vi.id, vi."name", vi."createdAt", vi."status"
        , vi."arrivalDate", vi."actualArrivalDate", vi."actualDepartureDate"`;

        sqlFrom = ` FROM property_units pu2, user_house_allocation uha, users u2, visitor_invitations vi`;

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
        sqlWhere += ` and uha."orgId" = u2."orgId" and uha."userId" = u2.id`;
        sqlWhere += ` and uha."orgId" = vi."orgId" and uha.id = vi."userHouseAllocationId" and uha."userId" = vi."createdBy"`;
        if(visitorSelect === 1){                 // Schedule Visits: Active invitation / booking 
            sqlWhere += ` and  vi.status = 1 and vi."actualArrivalDate" is null`;
        }
        else
        if(visitorSelect === 2){            // Visitors History: Cancelled and Already visited
            sqlWhere += ` and (vi."status" = 3 or vi."actualArrivalDate" is not null)`;
        }

        if(payload.filter.visitorName){
            sqlWhere += ` and lower(vi."name") like lower('%${payload.filter.visitorName}%')`;
        }

        sqlOrderBy = ` ORDER BY ${sortCol} ${sortOrder}`;

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

        //console.log(sqlStr);
        
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
