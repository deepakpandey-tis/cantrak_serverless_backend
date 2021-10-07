const Joi = require("@hapi/joi");
const knexReader = require("../../../db/knex-reader");

const getStrain = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere;

        const schema = Joi.object().keys({
            id: Joi.string().required()
        });
        const result = Joi.validate(payload, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: result.error.message }
                ]
            });
        }

        sqlSelect = `SELECT s.*, i2.name "itemName", i2.description "itemDescription", ic.name "itemCategory", ums.name "itemUM", ums.abbreviation "itemUMAbbreviation"`;
        sqlFrom = ` FROM strains s, items i2, item_categories ic, ums `;
        sqlWhere = ` WHERE s."orgId" = ${orgId} AND s.id = ${payload.id} AND s."itemId" = i2.id AND i2."itemCategoryId" = ic.id AND i2."umId" = ums.id `;

        sqlStr = sqlSelect + sqlFrom + sqlWhere;

        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                record: selectedRecs.rows[0],
            },
            message: "Strain detail!"
        });

    } catch (err) {
        console.log("[controllers][administration-features][strains][getStrain] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getStrain;
