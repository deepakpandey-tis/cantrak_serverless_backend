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

        sqlSelect = `SELECT l2.*, lt.name "licenseType", lc.name "licenseCategory"`;
        sqlFrom = ` FROM licenses l2, license_types lt, license_categories lc `;
        sqlWhere = ` WHERE l2.id = ${payload.id} AND l2."orgId" = ${orgId} AND l2."licenseTypeId" = lt.id AND l2."licenseCategoryId" = lc.id`;

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
