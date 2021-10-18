const knexReader = require('../../db/knex-reader');

const getHarvestLotList = async (req, res) => {
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
        sqlSelect = `SELECT hpl.*
        , it."itemId", it."itemCategoryId", it.quantity "quantity", it."umId" "itemUMId", it."plantsCount" "itemPlantsCount", it.quality "quality", it."storageLocationId"
        , itm.name "itemName", sl.name "storageLocationName", um.name "itemUM"
        , c."companyName", lic.number "licenseNo"
        , u2."name" "createdByName"
        `;

        sqlFrom = ` FROM harvest_plant_lots hpl, item_txns it, items itm, ums um, companies c, storage_locations sl, licenses lic
        , users u2
        `;

        sqlWhere = ` WHERE hpl."orgId" = ${orgId} AND hpl."orgId" = it."orgId" AND hpl."companyId" = it."companyId" AND hpl.id = it."harvestPlantLotId"`;
        if(companyId){
            sqlWhere += ` AND hpl."companyId" = ${companyId}`;
        }
        if(itemId){
            sqlWhere += ` AND it."itemId" = ${itemId}`;
        }
        if(storageLocationId){
            sqlWhere += ` AND it."storageLocationId" = ${storageLocationId}`;
        }
        if(lotNo){
            sqlWhere += ` AND hpl."lotNo" iLIKE '%${lotNo}%'`;
        }

        sqlWhere += ` AND hpl."companyId" = c.id AND hpl."licenseId" = lic.id
          AND it."itemId" = itm.id AND it."storageLocationId" = sl.id AND it."umId" = um.id AND hpl."createdBy" = u2.id
        `;

        sqlOrderBy = ` ORDER BY ${sortCol} ${sortOrder}`;
        //console.log('getHarvestLotList sql: ', sqlSelect + sqlFrom + sqlWhere);

        sqlStr  = `WITH Main_CTE AS (`;
        sqlStr += sqlSelect + sqlFrom + sqlWhere + `)`;
        sqlStr += `, Count_CTE AS (SELECT COUNT(*) AS "total" FROM Main_CTE)`;     // To get the total number of records
        sqlStr += ` SELECT * FROM Main_CTE, Count_CTE`;
        sqlStr += sqlOrderBy;
        sqlStr += ` OFFSET ((${pageNumber} - 1) * ${pageSize}) ROWS`
        sqlStr += ` FETCH NEXT ${pageSize} ROWS ONLY;`;

        //console.log('getHarvestLotList: ', sqlStr);
        
        var selectedRecs = await knexReader.raw(sqlStr);
        //console.log('selectedRecs: ', selectedRecs);

          const result = {
            data: {
                list: selectedRecs.rows,
                message: "Harvest lot list!"
            }
        }
        //console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][harvest][getHarvestLotList] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getHarvestLotList;

/**
 */
