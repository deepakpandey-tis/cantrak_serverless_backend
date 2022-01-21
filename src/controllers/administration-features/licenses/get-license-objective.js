const Joi = require("@hapi/joi");
const knexReader = require("../../../db/knex-reader");

const getLicenseObjective = async (req, res) => {
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

        sqlSelect = `SELECT lo.*, lt.name "licenseTypeName"`;
        sqlFrom = ` FROM license_objectives lo, license_types lt`;
        sqlWhere = ` WHERE lo.id = ${payload.id} AND lo."licenseTypeId" = lt.id`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere;

        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                record: selectedRecs.rows[0],
            },
            message: "License Objective!"
        });

    } catch (err) {
        console.log("[controllers][administration-features][licenses][getLicenseObjective] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getLicenseObjective;
