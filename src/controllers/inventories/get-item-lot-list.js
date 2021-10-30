const Joi = require("@hapi/joi");
const knexReader = require('../../db/knex-reader');

const TxnTypes ={
    ReceiveFromSupplier: 11,
    ReceiveFromTxnType: 11,
    ReceiveUptoTxnType: 50,
    IssueFromTxnType: 51,
    IssueUptoTxnType: 90,
};

const getItemLotList = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;

        let sortCol = payload.sortBy;
        let sortOrder = payload.orderBy;

        let reqData = req.query;
        let pageSize = reqData.per_page || 10;
        let pageNumber = reqData.current_page || 1;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlGroupBy, sqlOrderBy;

        const schema = Joi.object().keys({
            companyId: Joi.string().required(),
            itemCategoryId: Joi.string().required(),
            itemId: Joi.string().required()
        });
        let result = Joi.validate(payload, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: result.error.message }
                ]
            });
        }

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
        sqlSelect = `SELECT it."itemCategoryId", it."itemId", it."lotNo", it."storageLocationId", it."specieId" , it."strainId"
        , it."expiryDate", sum(it.quantity) "quantity"
        `;

        sqlFrom = ` FROM item_txns it`;

        sqlWhere = ` WHERE it."companyId" = ${payload.companyId} AND it."itemCategoryId" = ${payload.itemCategoryId} AND it."itemId" = ${payload.itemId}`;

        sqlGroupBy = ` GROUP BY it."itemCategoryId", it."itemId", it."lotNo", it."storageLocationId", it."specieId" , it."strainId", it."expiryDate"`;
        sqlOrderBy  = ` ORDER BY ${sortCol} ${sortOrder}`;

        sqlStr  = `WITH Main_CTE AS (`;
        sqlStr += sqlSelect + sqlFrom + sqlWhere + sqlGroupBy;
        sqlStr += `) SELECT * FROM Main_CTE`;
        sqlStr += sqlOrderBy;
        sqlStr += ` OFFSET ((${pageNumber} - 1) * ${pageSize}) ROWS`
        sqlStr += ` FETCH NEXT ${pageSize} ROWS ONLY;`;


        //console.log('getItemLotList: ', sqlStr);
        
        var selectedRecs = await knexReader.raw(sqlStr);
        //console.log('selectedRecs: ', selectedRecs);

          result = {
            data: {
                list: selectedRecs.rows,
                message: "Item lots list!"
            }
        }
        //console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][inventories][getItemLotList] :  Error", err);
        return res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
    });
    
    }

}

module.exports = getItemLotList;

/**
 */
