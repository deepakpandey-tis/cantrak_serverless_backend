const Joi = require("@hapi/joi");
const knexReader = require("../../db/knex-reader");

const getPlantLotHistory = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;

        let sqlStr;

        const schema = Joi.object().keys({
            companyId: Joi.string().required(),
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

        // recType: 1: Plant Lot, 2: Observation, 3: Individual Plant Observation (plant marked ill or healthy), 4: growth stage changed; 5: location changed; 6: waste txn; 7: harvest txn
        sqlStr = `SELECT txn.*, lf.name "fromLocation", slf."name" "fromSubLocation", lt.name "toLocation", slt."name" "toSubLocation", s."name" "specieName", s2."name" "strainName", gsf."name" "fromGrowthStage", gst."name" "toGrowthStage", u."name" "createdByName"
        FROM (
            SELECT * FROM (
                SELECT 1 "recType", pl."lotNo", pl."name" "plantLotName", 0 "harvestPlantLotId", 0 "fromLocationId", 0 "fromSubLocationId", pl."locationId" "toLocationId", pl."subLocationId" "toSubLocationId", pl."specieId", pl."strainId", 0 "fromGrowthStageId", pgs."growthStageId" "toGrowthStageId", pl."plantedOn" date, pl."plantsCount", 0 "observationType", null "s3Url", null::jsonb "tagData", null remark, false "isFinalHarvest", false "isEntireLot", pl."createdBy", pl."createdAt", null::jsonb "imageData"
                FROM plant_lots pl, plants p, plant_growth_stages pgs
                WHERE pl.id = ${payload.id} AND pl."orgId" = ${orgId} AND p."orgId" = pl."orgId" AND p."plantLotId" = pl.id AND pgs."orgId" = p."orgId" AND pgs."plantId" = p.id AND pgs."plantGrowthStageTxnId" is null LIMIT 1) a
            UNION
            SELECT DISTINCT 2 "recType", null "lotNo", null "plantLotName", 0 "harvestPlantLotId", 0 "fromLocationId", 0 "fromSubLocationId", pot."locationId" "toLocationId", pot."subLocationId" "toSubLocationId", 0 "specieId", 0 "strainId", 0 "fromGrowthStageId", pot."growthStageId" "toGrowthStageId", pot."date", pot."totalPlants" "plantsCount", pot."observationType", i."s3Url", it."tagData"::jsonb, rm.description remark, false "isFinalHarvest", false "isEntireLot", pot."createdBy", pot."createdAt", null::jsonb "imageData"
            FROM plant_observation_txns pot, images i, image_tags it, remarks_master rm
            WHERE pot."orgId" = ${orgId} AND pot."plantLotId" = ${payload.id} AND pot."orgId" = i."orgId" AND i."entityType" = 'plant' AND pot.id = i.record_id AND i."orgId" = it."orgId" AND i."entityType" = it."entityType" AND i."id" = it."entityId" AND pot."orgId" = rm."orgId" AND rm."entityType" = 'plant_observation' AND i.id = rm."entityId"
            UNION
            SELECT 3 "recType", null "lotNo", null "plantLotName", 0 "harvestPlantLotId", 0 "fromLocationId", 0 "fromSubLocationId", 0 "toLocationId", 0 "toSubLocationId", 0 "specieId", 0 "strainId", 0 "fromGrowthStageId", 0 "toGrowthStageId", it."createdAt" "date", 1 "plantsCount", 0 "observationType", i."s3Url", it."tagData"::jsonb, rm.description remark, false "isFinalHarvest", false "isEntireLot", it."createdBy", it."createdAt", null::jsonb "imageData"
            FROM plant_lots pl, plants p, image_tags it, images i
            LEFT JOIN remarks_master rm ON rm."orgId" = i."orgId" AND rm."entityType" = 'plant_observation' AND rm."entityId" = i.id
            WHERE i."orgId" = ${orgId} AND i."entityType" = 'plant' AND i.record_id is null AND it."orgId" = i."orgId" AND i.id = it."entityId"
            AND pl.id = ${payload.id} AND pl.id = p."plantLotId" AND i."entityId" = p.id
            UNION
            SELECT 4 "recType", null "lotNo", null "plantLotName", 0 "harvestPlantLotId", 0 "fromLocationId", 0 "fromSubLocationId", pgst."locationId" "toLocationId", pgst."subLocationId" "toSubLocationId", 0 "specieId", 0 "strainId", pgst."fromGrowthStageId", pgst."toGrowthStageId", pgst."date", pgst."totalPlants" "plantsCount", 0 "observationType", null "s3Url", null "tagData", rm.description remark, false "isFinalHarvest", false "isEntireLot", pgst."createdBy" , pgst."createdAt"
            , (SELECT json_agg(json_build_object('img', i."s3Url"))::jsonb from images i where i."orgId" = pgst."orgId" AND i."entityType" = 'plant_change_growth_stage' AND i."entityId" = pgst."id") "imageData"
            FROM plant_growth_stage_txns pgst, remarks_master rm
            WHERE pgst."orgId" = ${orgId} AND pgst."plantLotId" = ${payload.id} AND pgst."orgId" = rm."orgId" AND rm."entityType" = 'plant_change_growth_stage' AND pgst.id = rm."entityId"
            UNION
            SELECT 5 "recType", null "lotNo", null "plantLotName", 0 "harvestPlantLotId", plt."fromLocationId", plt."fromSubLocationId", plt."toLocationId", plt."toSubLocationId", 0 "specieId", 0 "strainId", 0 "fromGrowthStageId", plt."growthStageId" "toGrowthStageId", plt."date", plt."totalPlants" "plantsCount", 0 "observationType", null "s3Url", null "tagData", rm.description remark, false "isFinalHarvest", false "isEntireLot", plt."createdBy", plt."createdAt"
            , (SELECT json_agg(json_build_object('img', i."s3Url"))::jsonb FROM images i WHERE i."orgId" = plt."orgId" AND i."entityType" = 'plant_change_location' AND i."entityId" = plt."id") "imageData"
            FROM plant_location_txns plt, remarks_master rm
            WHERE plt."orgId" = ${orgId} AND plt."plantLotId" = ${payload.id} AND plt."orgId" = rm."orgId" AND rm."entityType" = 'plant_change_location' AND plt.id = rm."entityId"
            UNION
            SELECT 6 "recType", null "lotNo", null "plantLotName", 0 "harvestPlantLotId", 0 "fromLocationId", 0 "fromSubLocationId", pwt."locationId" "toLocationId", pwt."subLocationId" "toSubLocationId", 0 "specieId", 0 "strainId", 0 "fromGrowthStageId", pwt."growthStageId" "toGrowthStageId", pwt."date", pwt."totalPlants" "plantsCount", 0 "observationType", null "s3Url", null "tagData", rm.description remark, false "isFinalHarvest", false "isEntireLot", pwt."createdBy", pwt."createdAt"
            , (SELECT json_agg(json_build_object('img', i."s3Url"))::jsonb FROM images i WHERE i."orgId" = pwt."orgId" AND i."entityType" = 'plant_waste' AND i."entityId" = pwt."id") "imageData"
            FROM plant_waste_txns pwt, remarks_master rm
            WHERE pwt."orgId" = ${orgId} AND pwt."plantLotId" = ${payload.id} AND pwt."orgId" = rm."orgId" AND rm."entityType" = 'plant_waste_txn_entry' AND rm."entityId" = pwt.id
            UNION
            SELECT 7 "recType", null "lotNo", null "plantLotName", hpl.id "harvestPlantLotId", 0 "fromLocationId", 0 "fromSubLocationId", hpl."locationId" "toLocationId", hpl."subLocationId" "toSubLocationId", hpl."specieId", hpl."strainId", 0 "fromGrowthStageId", 0 "toGrowthStageId", hpl."harvestedOn" date, hpl."plantsCount", 0 "observationType", null "s3Url", null "tagData", null remark, "isFinalHarvest", "isEntireLot", hpl."createdBy", hpl."createdAt", null::jsonb "imageData"
            FROM harvest_plant_lots hpl WHERE hpl."plantLotId" = ${payload.id} AND hpl."orgId" = ${orgId}
            ) txn
            left join growth_stages gsf on gsf.id = txn."fromGrowthStageId"
            left join growth_stages gst on gst.id = txn."toGrowthStageId"
            left join locations lf on lf.id = txn."fromLocationId"
            left join sub_locations slf on slf."locationId" = txn."fromLocationId" AND slf.id = txn."fromSubLocationId"
            left join locations lt on lt.id = txn."toLocationId"
            left join sub_locations slt on slt."locationId" = txn."toLocationId" AND slt.id = txn."toSubLocationId"
            LEFT JOIN species s ON txn."specieId" = s.id
            LEFT JOIN strains s2 ON txn."strainId" = s2.id
            , users u WHERE u.id = txn."createdBy"
            ORDER BY date, "createdAt"
        `;

        var selectedRecs = await knexReader.raw(sqlStr);

        //  get diseases from diseases table
        for(rec of selectedRecs.rows){
            if(rec.recType == 2 || rec.recType == 3){
                const ids = [...rec.tagData.plantCondition.diseases];
                sqlStr = `SELECT d.name FROM diseases d, UNNEST(string_to_array(regexp_replace('[ ${ids} ]', '[\\[ \\]]', '', 'g'), ',')::bigint[]) did WHERE d.id = did`;
    
                // console.log('diseases: ', rec.tagData.plantCondition.diseases);
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
            message: "Plant Lot history!"
        });

    } catch (err) {
        console.log("[controllers][plants][getPlantLotHistory] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getPlantLotHistory;
