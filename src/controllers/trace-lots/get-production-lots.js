const Joi = require("@hapi/joi");
const knexReader = require("../../db/knex-reader");
const { ItemCategory, BatchTypes, TxnTypes, SystemStores } = require('../../helpers/txn-types');

const getProductionLots = async (req, res) => {
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

        sqlStr = `SELECT DISTINCT pl.id, pl."lotNo", pl."productionOn" "lotDate", pl2."name" "plantLotName"
        FROM production_lots pl, item_txns it, harvest_plant_lots hpl, plant_lots pl2
        WHERE pl."orgId" = ${orgId} AND pl."companyId" = ${payload.companyId} AND pl."isActive" AND pl."fromHarvestLot"
        AND it."orgId" = pl."orgId" AND it."companyId" = pl."companyId" AND it."productionLotId" = pl.id  AND it."txnType" = ${TxnTypes.IssueForProduction} AND it.quantity < 0 and it."lotNo" = hpl."lotNo" and hpl."plantLotId" = pl2.id
        ORDER BY pl."lotNo" DESC
        `;

        var selectedRecs = await knexReader.raw(sqlStr);

        // console.log("selectedRecs: ", selectedRecs.rows);

        return res.status(200).json({
            data: {
                records: selectedRecs.rows,
            },
            message: "Production lots!"
        });

    } catch (err) {
        console.log("[controllers][trace-lots][getProductionLots] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getProductionLots;
