const knexReader = require('../../db/knex-reader');
const moment = require("moment");

const getWorkPlanList = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;
        let sortCol = payload.sortBy;
        let sortOrder = payload.orderBy;

        let reqData = req.query;
        let pageSize = reqData.per_page || 10;
        let pageNumber = reqData.current_page || 1;

        let { name, companyId, entityTypeIds, fromDate, toDate } = req.body;
        // let { name, companyId, plantationId } = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        // Setting default values, if not passed
        if(!sortCol || sortCol === ''){
            sortCol = `"createdAt" desc`;
            sortOrder = '';
        }

        // if(!sortOrder || sortOrder === ''){
        //     sortOrder = 'asc';
        // }

        if(pageNumber < 1){
            pageNumber = 1;
        }

        if(pageSize < 0){
            pageSize = 10;
        }
        
        // Show only active Work Plan Templates

        // Using CTE (Common Table Expressions 'SELECT in WITH' for pageSize retrieval)
        sqlSelect = `SELECT wpm.*, CASE WHEN wpm."entityTypeId" = 27 THEN 'For Sub Growing Location' WHEN wpm."entityTypeId" = 28 THEN 'For Plant Lot' ELSE 'For Growing Location' END "templateType"
        , u2."name" "createdByName", c."companyName"
        `;
        // , u2."name" "createdByName", c."companyName", p.name "plantationName"

        sqlFrom = ` FROM work_plan_master wpm
        , users u2, companies c
        `;
        // LEFT JOIN plantations p ON wpm."plantationId" = p.id

        sqlWhere = ` WHERE wpm."orgId" = ${orgId}`;
        sqlWhere += ` AND wpm."createdBy" = u2.id AND wpm."companyId" = c.id AND wpm."isActive"
        `;

        if(name && name != ''){
            sqlWhere += ` AND wpm."name" iLIKE '%${name}%'`;
        }

        if(companyId && companyId != ''){
            sqlWhere += ` AND wpm."companyId" = ${companyId}`;
        }

        if(fromDate){
            sqlWhere += ` AND to_timestamp(wpm."createdAt"/1000)::date >= to_timestamp(${new Date(fromDate).getTime()}/1000)::date`;
        }
        if(toDate){
            sqlWhere += ` AND to_timestamp(wpm."createdAt"/1000)::date <= to_timestamp(${new Date(toDate).getTime()}/1000)::date`;
        }
        if(entityTypeIds && entityTypeIds.length && entityTypeIds[0] != 0){
            sqlWhere += ` AND wpm."entityTypeId" IN (${entityTypeIds})`;
        }

        // if(plantationId && plantationId != ''){
        //     sqlWhere += ` AND wpm."plantationId" = ${plantationId}`;
        // }

        sqlOrderBy = ` ORDER BY ${sortCol} ${sortOrder}`;
        //console.log('getWorkPlanList sql: ', sqlSelect + sqlFrom + sqlWhere);

        sqlStr  = `WITH Main_CTE AS (`;
        sqlStr += sqlSelect + sqlFrom + sqlWhere + `)`;
        sqlStr += `, Count_CTE AS (SELECT COUNT(*) AS "total" FROM Main_CTE)`;     // To get the total number of records
        sqlStr += ` SELECT * FROM Main_CTE, Count_CTE`;
        sqlStr += sqlOrderBy;
        sqlStr += ` OFFSET ((${pageNumber} - 1) * ${pageSize}) ROWS`
        sqlStr += ` FETCH NEXT ${pageSize} ROWS ONLY;`;

        //console.log('getWorkPlanList: ', sqlStr);
        
        var selectedRecs = await knexReader.raw(sqlStr);
        //console.log('selectedRecs: ', selectedRecs);

          const result = {
            data: {
                list: selectedRecs.rows,
                message: "Work Plans list!"
            }
        }
        //console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][work-plans][getWorkPlanList] :  Error", err);
        return res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
    });
    
    }

}

module.exports = getWorkPlanList;

/**
 */
