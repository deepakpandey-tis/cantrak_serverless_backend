const Joi = require("@hapi/joi");
const knexReader = require("../../db/knex-reader");
const { ItemCategory, TxnTypes, SystemStores } = require('../../helpers/txn-types');

const getLotOutputItems = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;

        let sqlStr;

        const schema = Joi.object().keys({
            companyId: Joi.number().required(),
            id: Joi.number().required()
        });
        const result = Joi.validate(payload, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: result.error.message }
                ]
            });
        }

        sqlStr = `SELECT pl.id "productionLotId", it.id "itemTxnId", it.quantity, it."expiryDate"
        , i.id "itemId", i.name "itemName", ums.id "umId", ums.name "umName", ums.abbreviation "umAbbreviation", s.id "specieId", s.name "specieName", s2.id "strainId", s2.name "strainName"
        FROM production_lots pl, item_txns it, items i, ums, species s, strains s2
        WHERE pl."orgId" = ${orgId} AND pl."companyId" = ${payload.companyId} AND pl."id" = '${payload.id}'
        AND it."productionLotId" = pl.id AND it."txnType" = ${TxnTypes.ReceiveFromProduction} AND it.quantity > 0
        AND it."itemId" = i.id AND it."umId" = ums.id AND it."specieId" = s.id AND it."strainId" = s2.id
        ORDER BY i."name"
        `;

        var selectedRecs = await knexReader.raw(sqlStr);

        // console.log("selectedRecs: ", selectedRecs.rows);

        // To get production lot input items plant details (comma separated growing locations, planted dates and total harvested plants)
        sqlStr = `SELECT string_agg(gl."name", ', ') "growingLocation", string_agg(to_char(to_timestamp(gl."plantedOn"/1000 )::date, 'dd MON yyyy'), ', ') "plantedDates", sum(gl."plantsCount") "plantsCount"
        FROM (
        SELECT l."name", pl."plantedOn" , hpl."plantsCount"
        FROM harvest_plant_lots hpl, plant_lots pl, locations l
        WHERE hpl."orgId" = ${orgId} AND hpl."companyId" = ${payload.companyId} AND hpl."lotNo" in
        (SELECT it."lotNo" FROM production_lots pl, item_txns it
        WHERE pl."orgId" = hpl."orgId" AND pl."companyId" = hpl."companyId" AND pl."id" = ${payload.id} AND it."orgId" = pl."orgId" AND it."companyId" = pl."companyId" AND it."productionLotId" = pl.id AND it."txnType" = ${TxnTypes.IssueForProduction} AND it.quantity < 0)
        AND hpl."plantLotId" = pl.id AND pl."locationId" = l.id
        order by pl.id) gl
        `;

        var selectedPlantRecs = await knexReader.raw(sqlStr);

        // console.log("selectedPlantRecs: ", selectedPlantRecs.rows[0]);

        return res.status(200).json({
            data: {
                records: selectedRecs.rows,
                plantInfo: selectedPlantRecs.rows[0],
            },
            message: "Lot output items!"
        });

    } catch (err) {
        console.log("[controllers][trace-lots][getLotOutputItems] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getLotOutputItems;
