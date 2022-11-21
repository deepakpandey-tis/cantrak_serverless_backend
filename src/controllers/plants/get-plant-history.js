const Joi = require("@hapi/joi");
const knexReader = require("../../db/knex-reader");

const getPlantHistory = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;

        let sqlStr;

        const schema = Joi.object().keys({
            companyId: Joi.string().required(),
            plantLotId: Joi.string().required(),
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

        // recType: 1: Observation, 2: growth stage changed; 3: location changed
        sqlStr = `SELECT txn.*, gsf."name" "fromGrowthStage", gst."name" "toGrowthStage", lf.name "fromLocation", slf."name" "fromSubLocation", lt.name "toLocation", slt."name" "toSubLocation", u.name "createdByName"
        FROM (
            SELECT 1 "recType", it."createdAt" "date", 0 "fromGrowthStageId" , 0 "toGrowthStageId", 0 "fromLocationId", 0 "fromSubLocationId", 0 "toLocationId", 0 "toSubLocationId", i."s3Url", i."s3Path", it."tagData"::jsonb, it."createdBy", it."createdAt", rm.description "remark", 0 "harvestPlantLotId", false "isFinalHarvest", false "isEntireLot", null "imageData"
            FROM image_tags it, images i
            LEFT JOIN remarks_master rm ON rm."orgId" = i."orgId" AND rm."entityType" = 'plant_observation' AND rm."entityId" = i.id
            WHERE i."orgId" = ${orgId} AND i."entityType" = 'plant' AND i."entityId" = ${payload.id} AND it."orgId" = i."orgId" AND i.id = it."entityId"
            UNION
            SELECT 2 "recType", pgst."date" , pgst."fromGrowthStageId" , pgst."toGrowthStageId", 0 "fromLocationId", 0 "fromSubLocationId", 0 "toLocationId", 0 "toSubLocationId", null "s3Url", null "s3Path", null "tagData", pgst."createdBy", pgst."createdAt", rm.description "remark", 0 "harvestPlantLotId", false "isFinalHarvest", false "isEntireLot"
            , (SELECT json_agg(json_build_object('img', i."s3Url"))::jsonb FROM images i WHERE i."orgId" = pgst."orgId" AND i."entityType" = 'plant_change_growth_stage' AND i."entityId" = pgst."id") "imageData"
            FROM plant_growth_stages pgs, plant_growth_stage_txns pgst
            LEFT JOIN remarks_master rm ON rm."orgId" = pgst."orgId" AND rm."entityType" = 'plant_change_growth_stage' AND rm."entityId" = pgst.id
            WHERE pgst."orgId" = ${orgId} AND pgst."companyId" = ${payload.companyId} AND pgst."plantLotId" = ${payload.plantLotId} AND pgst."orgId" = pgs."orgId" AND pgst.id = pgs."plantGrowthStageTxnId"  AND pgs."plantId" = ${payload.id}
            UNION
            SELECT 3 "recType", plt."date" , 0 "fromGrowthStageId" , 0 "toGrowthStageId" , plt."fromLocationId" , plt."fromSubLocationId" , plt."toLocationId" , plt."toSubLocationId", null "s3Url", null "s3Path", null "tagData", plt."createdBy" , plt."createdAt", null "remark", 0 "harvestPlantLotId", false "isFinalHarvest", false "isEntireLot"
            , (SELECT json_agg(json_build_object('img', i."s3Url"))::jsonb FROM images i WHERE i."orgId" = plt."orgId" AND i."entityType" = 'plant_change_location' AND i."entityId" = plt."id") "imageData"
            FROM plant_location_txns plt, plant_locations pl
            WHERE plt."orgId" = ${orgId} AND plt."companyId" = ${payload.companyId} AND plt."plantLotId" = ${payload.plantLotId} AND plt."orgId" = pl."orgId" AND plt.id = pl."plantLocationTxnId" AND pl."plantId" = ${payload.id}
            UNION
            SELECT "recType", date, 0 "fromGrowthStageId", 0 "toGrowthStageId", 0 "fromLocationId", 0 "fromSubLocationId", 0 "toLocationId", 0 "toSubLocationId", null "s3Url", null "s3Path", null "tagData", "createdBy", "createdAt", null remark, "harvestPlantLotId", "isFinalHarvest", "isEntireLot", null "imageData"
            FROM (
            SELECT 4 "recType", hpl."harvestedOn" date, 0 "fromGrowthStageId", 0 "toGrowthStageId", 0 "fromLocationId", 0 "fromSubLocationId", 0 "toLocationId", 0 "toSubLocationId", null "s3Url", null "s3Path", null "tagData", hpl."createdBy", hpl."createdAt", null remark, hpl.id "harvestPlantLotId", hpl."isFinalHarvest", hpl."isEntireLot", jsonb_array_elements(hpl."plantIds") "plantId"
            FROM harvest_plant_lots hpl, plant_locations pl
            WHERE hpl."orgId" = ${orgId} AND hpl."companyId" = ${payload.companyId} AND hpl."plantLotId" = ${payload.plantLotId} AND hpl."orgId" = pl."orgId" AND pl."plantId" = ${payload.id} AND hpl."locationId" = pl."locationId" AND hpl."subLocationId" = pl."subLocationId"
            AND pl.id = (SELECT id FROM plant_locations pl3 WHERE pl3."orgId" = hpl."orgId" AND pl3."plantId" = ${payload.id} ORDER BY id desc limit 1)
            ) harvest_plant
            WHERE cast(harvest_plant."plantId"->>'id' as integer) = 0 OR cast(harvest_plant."plantId"->>'id' as integer) = ${payload.id}
            UNION 
            SELECT 5 "recType", pwt."date", pwt."growthStageId" "fromGrowthStageId", 0 "toGrowthStageId", pwt."locationId" "fromLocationId", pwt."subLocationId" "fromSubLocationId", 0 "toLocationId", 0 "toSubLocationId", null "s3Url", null "s3Path", null "tagData", pwt."createdBy", pwt."createdAt", description remark, 0 "harvestPlantLotId", false "isFinalHarvest", false "isEntireLot"
            , (SELECT json_agg(json_build_object('img', i."s3Url"))::jsonb FROM images i WHERE i."orgId" = pwt."orgId" AND i."entityType" = 'plant_waste' AND i."entityId" = pwt."id") "imageData"
            FROM plant_waste_txns pwt LEFT JOIN remarks_master rm ON rm."orgId" = pwt."orgId" AND rm."entityType" = 'plant_waste_txn_entry' AND rm."entityId" = pwt.id
            , jsonb_to_recordset(pwt."plantIds") as plantId(id bigint)
            WHERE pwt."orgId" = ${orgId} AND pwt."companyId" = ${payload.companyId} AND pwt."plantLotId" = ${payload.plantLotId} AND plantid.id = ${payload.id}
        ) txn
        LEFT JOIN growth_stages gsf ON gsf.id = txn."fromGrowthStageId"
        LEFT JOIN growth_stages gst ON gst.id = txn."toGrowthStageId"
        LEFT JOIN locations lf ON lf.id = txn."fromLocationId"
        LEFT JOIN sub_locations slf ON slf."locationId" = txn."fromLocationId" AND slf.id = txn."fromSubLocationId"
        LEFT JOIN locations lt ON lt.id = txn."toLocationId"
        LEFT JOIN sub_locations slt ON slt."locationId" = txn."toLocationId" AND slt.id = txn."toSubLocationId"
        , users u WHERE u.id = txn."createdBy"
        order by date, "createdAt"
        `;

        var selectedRecs = await knexReader.raw(sqlStr);

        //  get diseases from diseases table
        for(rec of selectedRecs.rows){
            if(rec.recType == 1){
                const ids = [...rec.tagData.plantCondition.diseases];
                sqlStr = `SELECT d.name FROM diseases d, UNNEST(string_to_array(regexp_replace('[ ${ids} ]', '[\\[ \\]]', '', 'g'), ',')::bigint[]) did WHERE d.id = did`;
    
                // console.log('sql: ', sqlStr);
    
                var selectedDiseases = await knexReader.raw(sqlStr);
    
                // console.log('Diseases: ', selectedDiseases.rows.map(r => r.name));
    
                rec.tagData.plantCondition.diseases = selectedDiseases.rows.map(r => r.name);
                // console.log('record: ', selectedRecs.rows);
            }
        }

        return res.status(200).json({
            data: {
                records: selectedRecs.rows,
            },
            message: "Plant history!"
        });

    } catch (err) {
        console.log("[controllers][plants][getPlantHistory] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getPlantHistory;
