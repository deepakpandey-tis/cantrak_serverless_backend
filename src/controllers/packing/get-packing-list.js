const knexReader = require('../../db/knex-reader');

const getPackingList = async (req, res) => {
    try {
        let orgId = req.me.orgId;

        let payload = req.body;
        let sortCol = payload.sortBy;
        let sortOrder = payload.orderBy;

        let reqData = req.query;
        let pageSize = reqData.per_page || 10;
        let pageNumber = reqData.current_page || 1;

        let { companyId, itemLotNo, itemId, fromDate, toDate } = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        // Setting default values, if not passed
        if(!sortCol || sortCol === ''){
            sortCol = `"packingOn" DESC, "lotNo" DESC, "itemName" ASC`;
            sortOrder = '';
        }

        // if(!sortOrder || sortOrder === ''){
        //     sortOrder = 'desc';
        // }

        if(pageNumber < 1){
            pageNumber = 1;
        }

        if(pageSize < 0){
            pageSize = 10;
        }
        
        // Using CTE (Common Table Expressions 'SELECT in WITH' for pageSize retrieval)
        sqlSelect = `SELECT pl.id, pl."orgId", pl."companyId", pl."packingOn", pl."lotNo"
        , pl."isActive", pl."createdBy", pl."createdAt", pl."updatedBy", pl."updatedAt"
        , it."itemCategoryId", it."itemId", it."txnType", it."lotNo" "itemLotNo", it."umId", it."specieId", it."strainId", it."storageLocationId"
        , it.quantity "itemQuantity", it."packingWeight" "itemPackingWeight", i.name "itemName", i.gtin, ums.name "itemUM", ums.abbreviation "itemUMAbbreviation", sl.name "storageLocationName"
        , c."companyName", u."name" "createdByName"
        `;

        sqlFrom = ` FROM packing_lots pl
        , item_txns it, items i, ums, storage_locations sl
        , companies c, users u
        `;

        sqlWhere = ` WHERE pl."orgId" = ${orgId}`;
        sqlWhere += ` AND pl."companyId" = c.id AND pl."createdBy" = u.id`;
        sqlWhere += ` AND it."packingLotId" = pl.id AND it.quantity > 0 AND it."itemId" = i.id AND it."umId" = ums.id AND it."storageLocationId" = sl.id`;
        
        if(companyId){
            sqlWhere += ` AND pl."companyId" = ${companyId}`;
        }
        if(itemId){
            sqlWhere += ` AND it."itemId" = ${itemId}`;
        }
        if(itemLotNo){
            sqlWhere += ` AND pl."lotNo" iLIKE '%${itemLotNo}%'`;
        }
        if(fromDate){
            sqlWhere += ` AND pl."packingOn" >= ${new Date(fromDate).getTime()}`;
        }
        if(toDate){
            sqlWhere += ` AND pl."packingOn" <= ${new Date(toDate).getTime()}`;
        }

        sqlOrderBy = ` ORDER BY ${sortCol} ${sortOrder}`;
        //console.log('getPackingList sql: ', sqlSelect + sqlFrom + sqlWhere);

        sqlStr  = `WITH Main_CTE AS (`;
        sqlStr += sqlSelect + sqlFrom + sqlWhere + `)`;
        sqlStr += `, Count_CTE AS (SELECT COUNT(*) AS "total" FROM Main_CTE)`;     // To get the total number of records
        sqlStr += ` SELECT * FROM Main_CTE, Count_CTE`;
        sqlStr += sqlOrderBy;
        sqlStr += ` OFFSET ((${pageNumber} - 1) * ${pageSize}) ROWS`
        sqlStr += ` FETCH NEXT ${pageSize} ROWS ONLY;`;

        //console.log('getPackingList: ', sqlStr);
        
        var selectedRecs = await knexReader.raw(sqlStr);
        //console.log('selectedRecs: ', selectedRecs);

          const result = {
            data: {
                list: selectedRecs.rows,
                message: "Packing list!"
            }
        }
        //console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][packing][getPackingList] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getPackingList;

/**
 */
