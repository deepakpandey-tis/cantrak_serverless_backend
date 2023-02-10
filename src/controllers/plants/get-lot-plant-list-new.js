const Joi = require('@hapi/joi');
const Parallel = require('async-parallel');

const knexReader = require('../../db/knex-reader');

const getLotPlantListNew = async (req, res) => {
    try {
        const { orgId, userId } = req.me;
        const payload = req.body;

        const schema = Joi.object().keys({
            id: Joi.alternatives(Joi.number(), Joi.string()).required(),
            fromPlantSerial: Joi.string().allow(null, '').optional(),
            uptoPlantSerial: Joi.string().allow(null, '').optional(),
            orderBy: Joi.string().allow(null, '').optional(),
            sortBy: Joi.string().allow(null, '').optional(),
            locationId: Joi.alternatives(Joi.number().allow(null), Joi.string().allow(null, '')).optional(),
            subLocationId: Joi.alternatives(Joi.number().allow(null), Joi.string().allow(null, '')).optional(),
            plantTypeId: Joi.alternatives(Joi.number().allow(null), Joi.string().allow(null, '')).optional(),
            currentGrowthStageId: Joi.alternatives(Joi.number().allow(null), Joi.string().allow(null, '')).optional(),
            plantsWithAiResponse: Joi.alternatives(Joi.number().allow(null), Joi.string().allow(null, '')).optional(),
            includeWaste: Joi.bool().allow(null).optional(),
            notIncludeWaste: Joi.bool().allow(null).optional(),
            notIncludeSelectedFinalHarvestedPlants: Joi.bool().allow(null).optional(),
            plantTypeIds: Joi.array().items(Joi.alternatives(Joi.number(), Joi.string())).optional(),
            growthStageIds: Joi.array().items(Joi.alternatives(Joi.number(), Joi.string())).optional(),
            searchTerm: Joi.string().allow(null, '').optional(),
        });

        const validationResult = Joi.validate(payload, schema);

        if (validationResult && validationResult.hasOwnProperty("error") && validationResult.error) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: validationResult.error.message },
                ],
            });
        }

        const { per_page, current_page } = req.query;

        let pageSize = parseInt(per_page) || 10;
        let pageNumber = parseInt(current_page) || 1;

        if(pageNumber < 1) {
            pageNumber = 1;
        }

        if(pageSize <= 0) {
            pageSize = 10;
        }
        
        const offset = (pageNumber - 1) * pageSize;

        const { 
            plantTypeId, 
            id: plantLotId, 
            locationId, 
            subLocationId, 
            plantsWithAiResponse, 
            sortBy, 
            orderBy, 
            notIncludeSelectedFinalHarvestedPlants,
            fromPlantSerial,
            uptoPlantSerial,
            currentGrowthStageId,
            plantTypeIds,
            growthStageIds,
            notIncludeWaste,
            searchTerm
        } = payload;

        let finalHarvestedPlantIds = [];

        if (notIncludeSelectedFinalHarvestedPlants || plantTypeId == 4 || plantTypeIds?.includes(4) || plantTypeIds?.includes('4')) { // plant type 4 = harvested plants
            const locationQuery = {};
            if(locationId && locationId.trim() && locationId != 0) {
                locationQuery.locationId = locationId;

                if(subLocationId && subLocationId.trim() && subLocationId != 0) {
                    locationQuery.subLocationId = subLocationId;
                }
            }

            let finalHarvestedPlants = await knexReader("harvest_plant_lots")
                .select("*")
                .where({
                    plantLotId: plantLotId,
                    orgId: orgId,
                    ...locationQuery,
                    isFinalHarvest: true,
                });

            finalHarvestedPlantIds = await Parallel.map(finalHarvestedPlants, async (plant) => {
                if(plant.isEntireLot) {
                    let plantIds = await knexReader.with(
                        'pl',
                        knexReader.raw(`
                            SELECT DISTINCT ON (plant_locations."plantId")
                                plant_locations.*
                            FROM 
                                plant_locations
                            WHERE 
                                plant_locations."plantLotId" = ?
                            AND
                                plant_locations."orgId" = ?
                            ORDER BY 
                                plant_locations."plantId" ASC, plant_locations."startDate" DESC
                        `, [plantLotId, orgId])
                    )
                    .from('pl')
                    .where({
                        locationId: plant.locationId,
                        subLocationId: plant.subLocationId
                    });

                    plantIds = plantIds.map(pt => pt.plantId);

                    if(plantIds.length > 0) {
                        plantIds = await knexReader("plants")
                            .pluck('id')
                            .where({
                                plantLotId: plantLotId,
                                orgId: orgId,
                                isWaste: false
                            })
                            .whereIn('id', plantIds);
                    }

                    return plantIds;
                } else {
                    return plant.plantIds.map(pid => pid.id);
                }
            }, 1);

            finalHarvestedPlantIds = finalHarvestedPlantIds.flat();
        }

        let baseQuery = knexReader("plant_lots")
            .innerJoin("plants", "plant_lots.id", "plants.plantLotId")
            .joinRaw(
                `INNER JOIN 
                    plant_locations 
                    ON 
                    plants.id = plant_locations."plantId" 
                    AND 
                    plant_locations.id = (
                        SELECT id 
                        FROM plant_locations pl2 
                        WHERE pl2."orgId" = ? AND pl2."plantId" = plants.id ORDER BY id DESC LIMIT 1
                )`,
                [orgId]
            )
            .joinRaw(
                `INNER JOIN 
                    plant_growth_stages 
                    ON 
                    plants.id = plant_growth_stages."plantId" 
                    AND 
                    plant_growth_stages.id = (
                        SELECT id 
                        FROM plant_growth_stages pgs2
                        WHERE pgs2."orgId" = ? AND pgs2."plantId" = plants.id ORDER BY id DESC LIMIT 1
                )`,
                [orgId]
            )
            .innerJoin("locations", "plant_locations.locationId", "locations.id")
            .innerJoin("sub_locations", "plant_locations.subLocationId", "sub_locations.id")
            .innerJoin("growth_stages", "plant_growth_stages.growthStageId", "growth_stages.id")
            .innerJoin("strains", "plant_lots.strainId", "strains.id")
            .innerJoin("species", "plant_lots.specieId", "species.id");

        baseQuery = baseQuery.clone().modify((qb) => {
            if(plantsWithAiResponse) {
                qb
                .with(
                    'observation',
                    knexReader.raw(
                        `
                        SELECT DISTINCT ON(images."entityId") image_tags."tagData", images."entityId", growdoc_txns."apiResponse" FROM images
                        INNER JOIN
                            growdoc_txns
                        ON
                            growdoc_txns."orgId" = images."orgId"
                        AND
                            growdoc_txns."entityType" = images."entityType"
                        AND
                            growdoc_txns."entityId" = images.id
                        AND
                            growdoc_txns."apiResponse" IS NOT NULL
                        INNER JOIN
                            image_tags
                        ON
                            image_tags."entityType" = images."entityType"
                        AND
                            image_tags."entityId" = images.id
                        AND
                            image_tags."orgId" = images."orgId"
                        ORDER BY
                            images."entityId" ASC, images."createdAt" DESC
                        `
                    )
                );
                qb.innerJoin("observation", "observation.entityId", "plants.id");
                
            } else {
                qb
                .with(
                    'observation',
                    knexReader.raw(
                        `
                        SELECT DISTINCT ON(images."entityId") image_tags."tagData", images."entityId", growdoc_txns."apiResponse" FROM images
                        LEFT JOIN
                            growdoc_txns
                        ON
                            growdoc_txns."orgId" = images."orgId"
                        AND
                            growdoc_txns."entityType" = images."entityType"
                        AND
                            growdoc_txns."entityId" = images.id
                        INNER JOIN
                            image_tags
                        ON
                            image_tags."entityType" = images."entityType"
                        AND
                            image_tags."entityId" = images.id
                        AND
                            image_tags."orgId" = images."orgId"
                        ORDER BY
                            images."entityId" ASC, images."createdAt" DESC
                        `
                    )
                )
                qb.leftJoin("observation", "observation.entityId", "plants.id");
            }
        });
        
        baseQuery = baseQuery.clone().modify((qb) => {
            qb
            .where({
                'plant_lots.id': plantLotId,
                'plant_lots.orgId': orgId,
                'plants.isActive': true
            });

            if(plantTypeIds) {
                const plantTypeQueries = [];

                if (plantTypeIds.includes(1) || plantTypeIds.includes('1')) {
                    const query = `((
                        (observation."tagData"->'plantCondition'->>'appearsFine')::boolean is true
                        OR
                        observation."tagData" is NULL
                    ) AND NOT plants."isWaste")`;
                    plantTypeQueries.push(query);
                }
                if (plantTypeIds.includes(2) || plantTypeIds.includes('2')) {
                    const query = `((observation."tagData"->'plantCondition'->>'appearsIll')::boolean is true AND NOT plants."isWaste")`;
                    plantTypeQueries.push(query);
                }
                if (plantTypeIds.includes(3) || plantTypeIds.includes('3')) {
                    const query = `plants."isWaste"`;
                    plantTypeQueries.push(query);
                }
                if (plantTypeIds.includes(4) || plantTypeIds.includes('4')) {
                    if (finalHarvestedPlantIds.length > 0) {
                        const query = `plants.id IN (${finalHarvestedPlantIds.join(' , ')})`;
                        plantTypeQueries.push(query);
                    } else {
                        const query = `plants.id < 0`;
                        plantTypeQueries.push(query);
                    }
                }

                if(plantTypeQueries.length > 0) {
                    if(plantTypeQueries.length > 1) {
                        const query = `(${plantTypeQueries.join(' OR ') })`;
                        qb.whereRaw(query);
                    } else {
                        const query = plantTypeQueries[0];
                        qb.whereRaw(query);
                    }
                }

            } else {
                if (plantTypeId == 1) { // plantTypeId = 1 => Healthy plants
                    qb.whereRaw(`(
                        (observation."tagData"->'plantCondition'->>'appearsFine')::boolean is true
                        OR
                        observation."tagData" is NULL
                    )`)
                    .whereRaw(`NOT plants."isWaste"`);
                } else if (plantTypeId == 2) { 
                    // plantTypeId = 2 => Unhealthy plants
                    qb.whereRaw(`(observation."tagData"->'plantCondition'->>'appearsIll')::boolean is true`)
                    .whereRaw(`NOT plants."isWaste"`);
                } else if (plantTypeId == 3) { 
                    // plantTypeId = 3 => Waste plants
                    qb.whereRaw(`plants."isWaste"`);
                } else if (plantTypeId == 4) { 
                    // plantTypeId = 4 => Harvested plants
                    if (finalHarvestedPlantIds.length > 0) {
                        qb.whereIn(`plants.id`, finalHarvestedPlantIds);
                    } else {
                        qb.where('plants.id', '<', '0');
                    }
                }
            }

            if (notIncludeSelectedFinalHarvestedPlants) {
                if (finalHarvestedPlantIds.length > 0) {
                    qb.whereNotIn(`plants.id`, finalHarvestedPlantIds);
                }
            }

            if (notIncludeWaste) {
                qb.whereRaw(`NOT plants."isWaste"`);   
            }


            if(locationId && `${locationId}`.trim()) {
                qb.where('plant_locations.locationId', locationId);
            }

            if(subLocationId && `${subLocationId}`.trim()) {
                qb.where('plant_locations.subLocationId', subLocationId);
            }

            if (uptoPlantSerial && `${uptoPlantSerial}`.trim()) {
                if (fromPlantSerial && `${fromPlantSerial}`.trim()) {
                    qb.where('plants.plantSerial', '>=',fromPlantSerial);
                }
                qb.where('plants.plantSerial', '<=', uptoPlantSerial);
            }
            else if (fromPlantSerial && `${fromPlantSerial}`.trim()) {
                qb.whereILike("plants.plantSerial", `%${fromPlantSerial}%`);
            }

            if(growthStageIds && growthStageIds.length > 0) {
                qb.whereIn('plant_growth_stages.growthStageId', growthStageIds);
            } else if(currentGrowthStageId) {
                qb.where('plant_growth_stages.growthStageId', currentGrowthStageId);
            }

            if (searchTerm && `${searchTerm}`.trim().length > 0) {
                qb.whereILike("plants.plantSerial", `%${searchTerm}%`);
            }

        });

        const countQuery = baseQuery.clone().modify((qb) => {
            qb.count("* as count");
            qb.first();
        });

        const resQuery = baseQuery.clone().modify((qb) => {
            qb
            .select(
                'plant_lots.*',
                'plants.id AS plantId',
                'plants.plantSerial',
                'plants.isActive AS plantIsActive',
                'plants.isWaste AS plantIsWaste',
                'plants.isDestroy AS plantIsDestroy',
                'plants.isEndOfLife AS plantIsEndOfLife',
                'plant_locations.id AS plantLocationId',
                'plant_locations.locationId AS plantCurrentLocationId',
                'plant_locations.subLocationId AS plantCurrentSubLocationId',
                'locations.name AS plantLocationName',
                'sub_locations.name AS plantSubLocationName',
                'plant_growth_stages.growthStageId AS plantGrowthStageId',
                'plant_growth_stages.startDate AS plantGrowthStageDate',
                'growth_stages.name AS plantGrowthStageName',
                'strains.name AS strainName',
                'species.name AS specieName',
                "observation.tagData",
                "observation.entityId",
                "observation.apiResponse"
            )
            .orderBy(`${sortBy ? sortBy : 'plants.plantSerial'}`, `${(sortBy && orderBy) ? orderBy : 'desc'}`)
            .offset(offset)
            .limit(pageSize);
        });


        console.log(resQuery.toString());

        const [total, rows] = await Promise.all([countQuery, resQuery]);

        return res.status(200).json({
            data: { list: rows, total: parseInt(total.count) }
        });

    } catch(error) {
        console.log("[controllers][plants][getLotPlantListNew] :  Error", error);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: error.message }],
        });
    }
};

module.exports = getLotPlantListNew;