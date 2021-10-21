const knexReader = require('../../db/knex-reader');

const getProductionLotList = async (req, res) => {
    try {
        let orgId = req.me.orgId;

        let payload = req.body;
        let sortCol = payload.sortBy;
        let sortOrder = payload.orderBy;

        let reqData = req.query;
        let pageSize = reqData.per_page || 10;
        let pageNumber = reqData.current_page || 1;

        let { companyId, lotNo, itemId, storageLocationId } = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        // Setting default values, if not passed
        if(!sortCol || sortCol === ''){
            sortCol = `"lotNo"`;
        }

        if(!sortOrder || sortOrder === ''){
            sortOrder = 'desc';
        }

        if(pageNumber < 1){
            pageNumber = 1;
        }

        if(pageSize < 0){
            pageSize = 10;
        }
        
        // Using CTE (Common Table Expressions 'SELECT in WITH' for pageSize retrieval)
        sqlSelect = `SELECT pl.*
        , itm.name "itemName", sl.name "storageLocationName", um.name "itemUM"
        , c."companyName", pl."lotNo" "plantLotNo", p.name "processName"
        , u2."name" "createdByName"
        `;

        sqlFrom = ` FROM production_lots pl, items itm, ums um, companies c, storage_locations sl
        , users u2, processes p
        `;

        sqlWhere = ` WHERE pl."orgId" = ${orgId}`;
        if(companyId){
            sqlWhere += ` AND pl."companyId" = ${companyId}`;
        }
        if(itemId){
            sqlWhere += ` AND pl."itemId" = ${itemId}`;
        }
        if(storageLocationId){
            sqlWhere += ` AND pl."storageLocationId" = ${storageLocationId}`;
        }
        if(lotNo){
            sqlWhere += ` AND pl."lotNo" iLIKE '%${lotNo}%'`;
        }

        sqlWhere += ` AND pl."companyId" = c.id AND pl."processId" = p.id
          AND pl."itemId" = itm.id AND pl."storageLocationId" = sl.id AND pl."umId" = um.id AND pl."createdBy" = u2.id
        `;

        sqlOrderBy = ` ORDER BY ${sortCol} ${sortOrder}`;
        //console.log('getProductionLotList sql: ', sqlSelect + sqlFrom + sqlWhere);

        sqlStr  = `WITH Main_CTE AS (`;
        sqlStr += sqlSelect + sqlFrom + sqlWhere + `)`;
        sqlStr += `, Count_CTE AS (SELECT COUNT(*) AS "total" FROM Main_CTE)`;     // To get the total number of records
        sqlStr += ` SELECT * FROM Main_CTE, Count_CTE`;
        sqlStr += sqlOrderBy;
        sqlStr += ` OFFSET ((${pageNumber} - 1) * ${pageSize}) ROWS`
        sqlStr += ` FETCH NEXT ${pageSize} ROWS ONLY;`;

        //console.log('getProductionLotList: ', sqlStr);
        
        var selectedRecs = await knexReader.raw(sqlStr);
        //console.log('selectedRecs: ', selectedRecs);

          const result = {
            data: {
                list: selectedRecs.rows,
                message: "Production lot list!"
            }
        }
        //console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][production][getProductionLotList] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getProductionLotList;

/**
 */
