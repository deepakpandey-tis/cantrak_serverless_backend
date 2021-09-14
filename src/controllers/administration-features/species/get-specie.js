const Joi = require("@hapi/joi");
const knexReader = require("../../../db/knex-reader");

const getSpecie = async (req, res) => {
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

        sqlSelect = `SELECT s2.*`;
        sqlFrom = ` FROM species s2 `;
        sqlWhere = ` WHERE s2."orgId" = ${orgId} and s2.id = ${payload.id} `;

        sqlStr = sqlSelect + sqlFrom + sqlWhere;

        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                specie: selectedRecs.rows[0],
            },
            message: "Specie detail!"
        });

    } catch (err) {
        console.log("[controllers][administration-features][species][getSpecie] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getSpecie;
