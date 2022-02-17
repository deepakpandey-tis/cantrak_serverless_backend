const knexReader = require('../../db/knex-reader');

const getWasteMaterialList = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;
        let sortCol = payload.sortBy;
        let sortOrder = payload.orderBy;

        let reqData = req.query;
        let pageSize = reqData.per_page || 10;
        let pageNumber = reqData.current_page || 1;

        let {isExport,  itemCategoryId, lotNo, companyId, itemId, strainId, storageLocationId, txnType, fromDate, toDate } = req.body;

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
        sqlSelect = `SELECT it.*, to_char(to_timestamp(it.date/1000)::date, 'dd/mm/yyyy') "dateStr"
        , CASE WHEN it.quantity < 0 THEN TRUNC((-1 * it.quantity::numeric), 4) ELSE TRUNC(it.quantity::numeric, 4) END "quantityStr"
        , CASE WHEN it."imported" THEN 'Yes' ELSE 'No' END "importedStr"
        , s.name "strainName", s2.name "specieName", CONCAT(s.name, ' (', s2.name, ')') "strainSpecieName", i2.name "itemName", i2.description "itemDescription", c."companyName"
        , sl.name "storageLocation", ic.name "itemCategory", ums.name "itemUM", ums.abbreviation "itemUMAbbreviation", u2."name" "createdByName"
        `;

        sqlFrom = ` FROM item_txns it, companies c, strains s, species s2, items i2, ums, txn_types tt
        , storage_locations sl, item_categories ic, users u2
        `;

        sqlWhere = ` WHERE s."orgId" = ${orgId}`;
        if(itemCategoryId){
            sqlWhere += ` AND it."itemCategoryId" = ${itemCategoryId}`;
        }
        if(companyId){
            sqlWhere += ` AND it."companyId" = ${companyId}`;
        }
        if(itemId){
            sqlWhere += ` AND it."itemId" = ${itemId}`;
        }
        if(strainId){
            sqlWhere += ` AND it."strainId" = ${strainId}`;
        }
        if(storageLocationId){
            sqlWhere += ` AND it."storageLocationId" = ${storageLocationId}`;
        }
        if(lotNo){
            sqlWhere += ` AND it."lotNo" iLIKE '%${lotNo}%'`;
        }
        if(txnType){
            sqlWhere += ` AND tt."id" = ${txnType}`;
        }
        if(fromDate){
            sqlWhere += ` AND it."date" >= ${new Date(fromDate).getTime()}`;
        }
        if(toDate){
            sqlWhere += ` AND it."date" <= ${new Date(toDate).getTime()}`;
        }

        sqlWhere += ` AND it."itemId" = i2.id AND it."strainId" = s.id AND it."specieId" = s2.id AND it."companyId" = c.id AND it."umId" = ums.id
          AND it."storageLocationId" = sl.id AND it."itemCategoryId" = ic.id AND it."umId" = ums.id AND tt.id = it."txnType" AND tt."subId" = it."subId" AND it."createdBy" = u2.id
        `;

        sqlOrderBy = ` ORDER BY ${sortCol} ${sortOrder}`;
        //console.log('getWasteMaterialList sql: ', sqlSelect + sqlFrom + sqlWhere);

        if(!isExport){
            sqlStr  = `WITH Main_CTE AS (`;
        }
        else {
            sqlStr  = ``;
        }

        sqlStr += sqlSelect + sqlFrom + sqlWhere;

        if(!isExport){
            sqlStr += `), Count_CTE AS (SELECT COUNT(*) AS "total" FROM Main_CTE)`;     // To get the total number of records
            sqlStr += ` SELECT * FROM Main_CTE, Count_CTE`;
        }

        sqlStr += sqlOrderBy;

        if(!isExport){
            sqlStr += ` OFFSET ((${pageNumber} - 1) * ${pageSize}) ROWS`
            sqlStr += ` FETCH NEXT ${pageSize} ROWS ONLY;`;
        }

        //console.log('getWasteMaterialList: ', sqlStr);
        
        var selectedRecs = await knexReader.raw(sqlStr);
        //console.log('selectedRecs: ', selectedRecs);

          const result = {
            data: {
                list: selectedRecs.rows,
                message: "Strains list!"
            }
        }
        //console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][administration-features][inventories][getWasteMaterialList] :  Error", err);
        return res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
    });
    
    }

}

module.exports = getWasteMaterialList;

/**
 */
