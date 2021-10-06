const knexReader = require('../../../db/knex-reader');

const getItemList = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;
        let sortCol = payload.sortBy;
        let sortOrder = payload.orderBy;

        let reqData = req.query;
        let pageSize = reqData.per_page || 10;
        let pageNumber = reqData.current_page || 1;

        let { name, umId, itemCategoryId } = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        // Setting default values, if not passed
        if(!sortCol || sortCol === ''){
            sortCol = 'name';
        }

        if(!sortOrder || sortOrder === ''){
            sortOrder = 'asc';
        }

        if(pageNumber < 1){
            pageNumber = 1;
        }

        if(pageSize < 0){
            pageSize = 10;
        }
        
        // Using CTE (Common Table Expressions 'SELECT in WITH' for pageSize retrieval)
        sqlSelect = `SELECT i2.*, ic.name "itemCategory", ums.name "itemUM", ums.abbreviation "itemUMAbbreviation"
        , u2."name" "createdByName"
        `;

        sqlFrom = ` FROM items i2, item_categories ic, ums, users u2`;

        sqlWhere = ` WHERE i2."orgId" = ${orgId}`;
        sqlWhere += ` AND i2."itemCategoryId" = ic.id AND i2."umId" = ums.id AND i2."createdBy" = u2.id`;
        if(name){
            sqlWhere += ` AND (i2."name" iLIKE '%${name}%' OR i2."description" iLIKE '%${name}%')`;
        }
        if(umId){
            sqlWhere += ` AND i2."umId" = ${umId}`;
        }
        if(itemCategoryId){
            sqlWhere += ` AND i2."itemCategoryId" = ${itemCategoryId}`;
        }

        sqlOrderBy = ` ORDER BY ${sortCol} ${sortOrder}`;
        //console.log('getItemList sql: ', sqlSelect + sqlFrom + sqlWhere);

        sqlStr  = `WITH Main_CTE AS (`;
        sqlStr += sqlSelect + sqlFrom + sqlWhere + `)`;
        sqlStr += `, Count_CTE AS (SELECT COUNT(*) AS "total" FROM Main_CTE)`;     // To get the total number of records
        sqlStr += ` SELECT * FROM Main_CTE, Count_CTE`;
        sqlStr += sqlOrderBy;
        sqlStr += ` OFFSET ((${pageNumber} - 1) * ${pageSize}) ROWS`
        sqlStr += ` FETCH NEXT ${pageSize} ROWS ONLY;`;

        //console.log('getItemList: ', sqlStr);
        
        var selectedRecs = await knexReader.raw(sqlStr);
        //console.log('selectedRecs: ', selectedRecs);

          const result = {
            data: {
                list: selectedRecs.rows,
                message: "Items list!"
            }
        }
        //console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][administration-features][items][getItemList] :  Error", err);
        return res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
    });
    
    }

}

module.exports = getItemList;

/**
 */
