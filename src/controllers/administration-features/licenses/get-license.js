const Joi = require("@hapi/joi");
const knexReader = require("../../../db/knex-reader");

const getLicense = async (req, res) => {
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

        sqlSelect = `SELECT l2.*, lt.name "licenseType"
        , (SELECT json_agg(row_to_json(i.*)) "items" 
        FROM (
        SELECT li.id::text, li."itemCategoryId"::text, li."itemId"::text, li.quantity, li."umId"::text, li."isActive", it.name, ums.name "itemUM"
        , (SELECT sum(quantity) FROM license_nar_items lni WHERE li."itemCategoryId" = lni."itemCategoryId" and li."itemId" = lni."itemId") "quantityReceived"
        FROM license_items li, items it, ums
        WHERE li."licenseId" = l2.id AND li."itemId" = it.id AND li."umId" = ums.id
        ) i
        )`;
        sqlFrom = ` FROM licenses l2, license_types lt `;
        sqlWhere = ` WHERE l2.id = ${payload.id} AND l2."orgId" = ${orgId} AND l2."licenseTypeId" = lt.id`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere;

        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                record: selectedRecs.rows[0],
            },
            message: "License detail!"
        });

    } catch (err) {
        console.log("[controllers][administration-features][licenses][getLicense] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getLicense;
