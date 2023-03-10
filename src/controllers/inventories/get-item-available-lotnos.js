const Joi = require("@hapi/joi");
const knexReader = require("../../db/knex-reader");

const getItemAvailableLotNos = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlGroupBy, sqlOrderBy;

        const schema = Joi.object().keys({
            companyId: Joi.string().required(),
            itemCategoryId: Joi.string().required(),
            itemId: Joi.string().required()
        });
        const result = Joi.validate(payload, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: result.error.message }
                ]
            });
        }

        sqlSelect = `SELECT it."itemCategoryId", it."itemId", it."lotNo", it."storageLocationId", it."specieId" , it."strainId"
        , it."expiryDate", sum(it.quantity) "quantity"
        `;

        sqlFrom = ` FROM item_txns it`;

        sqlWhere = ` WHERE it."companyId" = ${payload.companyId} AND it."itemCategoryId" = ${payload.itemCategoryId} AND it."itemId" = ${payload.itemId}`;

        sqlGroupBy = ` GROUP BY it."itemCategoryId", it."itemId", it."lotNo", it."storageLocationId", it."specieId" , it."strainId", it."expiryDate"`;
        sqlOrderBy  = ` ORDER BY "lotNo" ASC`;      //  ASC to show older lots first

        // sqlStr  = sqlSelect + sqlFrom + sqlWhere + sqlGroupBy + sqlOrderBy;

        sqlStr  = `WITH Main_CTE AS (`;
        sqlStr += sqlSelect + sqlFrom + sqlWhere + sqlGroupBy + `)`;
        sqlStr += ` SELECT * FROM Main_CTE WHERE quantity > 0`;
        sqlStr += sqlOrderBy;

        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                records: selectedRecs.rows,
            },
            message: "Item Available lots!"
        });

    } catch (err) {
        console.log("[controllers][inventories][getItemAvailableLotNos] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getItemAvailableLotNos;
