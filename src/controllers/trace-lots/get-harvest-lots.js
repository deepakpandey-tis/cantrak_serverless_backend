const Joi = require("@hapi/joi");
const knexReader = require("../../db/knex-reader");

const getHarvestLots = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;

        let sqlStr;

        const schema = Joi.object().keys({
            companyId: Joi.number().required(),
        });
        const result = Joi.validate(payload, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: result.error.message }
                ]
            });
        }

        sqlStr = `SELECT hpl.id, hpl."lotNo", hpl."harvestedOn" "lotDate"
        FROM harvest_plant_lots hpl
        WHERE hpl."orgId" = ${orgId} AND hpl."companyId" = ${payload.companyId} AND hpl."isActive"
        ORDER BY hpl."lotNo" DESC
        `;

        var selectedRecs = await knexReader.raw(sqlStr);

        // console.log("selectedRecs: ", selectedRecs.rows);

        return res.status(200).json({
            data: {
                records: selectedRecs.rows,
            },
            message: "Harvest lots!"
        });

    } catch (err) {
        console.log("[controllers][trace-lots][getHarvestLots] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getHarvestLots;
