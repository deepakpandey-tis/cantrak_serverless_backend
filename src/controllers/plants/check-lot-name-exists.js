const Joi = require("@hapi/joi");
const knexReader = require("../../db/knex-reader");

const checkLotNameExists = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere;

        const schema = Joi.object().keys({
            companyId: Joi.string().required(),
            name: Joi.string().required()
        });
        const result = Joi.validate(payload, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: result.error.message }
                ]
            });
        }

        sqlSelect = `SELECT plt.*`;
        sqlFrom = ` FROM plant_lots plt`;
        sqlWhere = ` WHERE plt."orgId" = ${orgId} and plt."companyId" = ${payload.companyId} and plt.name iLIKE '${payload.name.trim()}' `;

        sqlStr = sqlSelect + sqlFrom + sqlWhere;

        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                exists: selectedRecs.rows[0] ? true : false,
            },
            message: "Plant Lot Name Exists!"
        });

    } catch (err) {
        console.log("[controllers][plants][checkLotNameExists] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = checkLotNameExists;
