const Joi = require("@hapi/joi");
const knexReader = require("../../../db/knex-reader");

const getLicenseNar = async (req, res) => {
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

        sqlSelect = `SELECT ln.*, s.name "supplierName"
        , (SELECT json_agg(row_to_json(i.*)) "items" 
        FROM (
        SELECT lni.id::text, lni."itemCategoryId"::text, lni."itemId"::text, lni.quantity, lni.quantity "originalQuantity", lni."umId"::text, lni."isActive", ums.name "itemUM"
        FROM license_nar_items lni, ums
        WHERE lni."licenseNarId" = ln.id AND lni."umId" = ums.id
        ) i
        )`;
        sqlFrom = ` FROM license_nars ln, suppliers s `;
        sqlWhere = ` WHERE ln.id = ${payload.id} AND ln."orgId" = ${orgId} AND ln."supplierId" = s.id`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere;

        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                record: selectedRecs.rows[0],
            },
            message: "License NAR detail!"
        });

    } catch (err) {
        console.log("[controllers][administration-features][licenses][getLicenseNar] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getLicenseNar;
