const Joi = require("@hapi/joi");
const knexReader = require("../../db/knex-reader");
const { ItemCategory, BatchTypes, TxnTypes, SystemStores } = require('../../helpers/txn-types');

const getPublicTraceQrDetail = async (req, res) => {
    try {
        let orgId = req.me?.orgId;
        let userId = req.me?.id;

        let payload = req.body;

        let sqlStr;

        const schema = Joi.object().keys({
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

        if(orgId == undefined){
            orgId = null;
        }
        sqlStr = `SELECT tl.*, case when c."companyName" is null then tl."cultivatedBy" else c."companyName" end "cultivatedBy"
        , s.name "specieName", s2.name "strainName", s2.flavor, s2."topEffect"
        , u."name" "createdByName", ums.name "umName", ums.abbreviation "umAbbreviation", i."s3Url"
        FROM trace_lots tl LEFT JOIN ums ON tl."umId" = ums.id
        LEFT JOIN companies c ON c."orgId" = ${orgId} AND c.id = tl."companyId"
        LEFT JOIN images i ON i."orgId" = tl."orgId" AND i."entityType" = 'public_trace_lot' AND i."entityId" = ${payload.id}
        , species s, strains s2, users u
        WHERE tl.id = ${payload.id}
        AND tl."createdBy" = u.id
        AND tl."orgId" = s."orgId" AND tl."specieId" = s.id AND tl."orgId" = s2."orgId" AND tl."specieId" = s2."specieId" AND tl."strainId" = s2.id
        `;

        var selectedRecs = await knexReader.raw(sqlStr);

        if(selectedRecs.rows[0].lotType == 1){
            //  Production lot
            sqlStr = `SELECT DISTINCT pl2."name" "plantLotName"
            FROM production_lots pl, item_txns it, harvest_plant_lots hpl, plant_lots pl2
            WHERE pl.id = ${selectedRecs.rows[0].productionLotId}
            AND it."orgId" = pl."orgId" AND it."companyId" = pl."companyId" AND it."productionLotId" = pl.id  AND it."txnType" = ${TxnTypes.IssueForProduction} AND it.quantity < 0 AND it."lotNo" = hpl."lotNo" AND hpl."plantLotId" = pl2.id
            `;
    
            var selectedPlantLotName = await knexReader.raw(sqlStr);
            selectedRecs.rows[0].plantLotName = selectedPlantLotName.rows[0].plantLotName;
        }
        else if(selectedRecs.rows[0].lotType == 0){
            //  Harvest lot
            sqlStr = `SELECT pl2.name "plantLotName"
            FROM harvest_plant_lots hpl, plant_lots pl2
            WHERE hpl.id = ${selectedRecs.rows[0].productionLotId}
            AND hpl."plantLotId" = pl2.id`;

            var selectedPlantLotName = await knexReader.raw(sqlStr);
            selectedRecs.rows[0].plantLotName = selectedPlantLotName.rows[0].plantLotName;
        }

        // console.log("selectedRecs: ", selectedRecs.rows);

        return res.status(200).json({
            data: {
                record: selectedRecs.rows[0],
            },
            message: "Trace QR detail!"
        });

    } catch (err) {
        console.log("[controllers][trace-lots][getPublicTraceQrDetail] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getPublicTraceQrDetail;
