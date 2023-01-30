const knex = require('../../db/knex');
const Joi = require('@hapi/joi');
const Parallel = require('async-parallel');
const moment = require("moment");
const axios = require('axios');

const { EntityTypes, EntityActions } = require('../../helpers/user-activity-constants');

const addBulkObservation = async (req, res) => {
    try {
        const orgId = req.orgId;
        const payload = req.body;
        const userId = req.me.id;
        const username = req.me.name;

        const schema = Joi.object().keys({
            plantIds: Joi.array().items(Joi.alternatives(Joi.number(), Joi.string())).required(),
            companyId: Joi.alternatives(Joi.number(), Joi.string()).required(),
            plantLotId: Joi.alternatives(Joi.number(), Joi.string()).required(),
            remark: Joi.string().allow(null, '').optional(),
            imageName: Joi.string().allow(null, '').required(),
            imageTitle: Joi.string().allow(null, '').required(),
            s3Url: Joi.string().allow(null, '').required(),
            diseases: Joi.string().allow(null, '').optional(),
            lotNumber: Joi.alternatives(Joi.number(), Joi.string()).required(),
            tagData: Joi.object().keys({
                growthStage: Joi.object().required(),
                plantCondition: Joi.object().keys({
                    appearsFine: Joi.boolean().required(),
                    appearsIll: Joi.boolean().required(),
                    diseases: Joi.array().items(Joi.alternatives(Joi.number(), Joi.string())).required()
                }).required()
            })
        });

        const validationResult = Joi.validate(payload, schema);

        if (validationResult && validationResult.hasOwnProperty("error") && validationResult.error) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: validationResult.error.message },
                ],
            });
        }

        await knex.transaction(async (trx) => {
            const currentTime = new Date().getTime();

            const plantIds= await Parallel.filter(payload.plantIds, async (plantId) => {
                const plant = await trx("plants")
                    .where({
                        id: plantId,
                        orgId: orgId
                    })
                    .first();
                return !!plant;
            }, 1);

            // return if the plantIds supplied in the payload are not found in the DB.
            if(plantIds.length <= 0) {
                return;
            }

            const imagesData = plantIds.map((plantId) => {
                const data = {
                    entityId: plantId,
                    entityType: 'plant',
                    s3Url: payload.s3Url,
                    title: payload.title,
                    name: payload.name,
                    createdAt: currentTime,
                    isActive: true,
                    orgId: orgId
                };
                return data;
            });

            const imagesResult = await trx("images")
                .insert(imagesData)
                .returning('*');

            const imageTagsData = imagesResult.map((image) => {
                const data = {
                    entityType: 'plant',
                    entityId: image.id,
                    tagData: payload.tagData,
                    orgId: orgId,
                    createdBy: userId,
                    createdAt: currentTime
                };
                return data;
            });

            const imageTagsResult = await trx("image_tags")
                .insert(imageTagsData)
                .returning('*');

            if(payload.remark && payload.remark.trim()) {
                const remarksData = imagesResult.map((image) => {
                    const data = {
                        entityType: "plant_observation",
                        entityId: image.id,
                        description: payload.remark.trim(),
                        orgId: orgId,
                        createdBy: req.me.id,
                        createdAt: currentTime,
                        updatedAt: currentTime,
                    }
                    return data;
                });
    
                await trx("remarks_master")
                    .insert(remarksData)
                    .returning('*');
            }

            if(payload.s3Url && payload.s3Url.trim()) {
                try {
                    const axios = require('axios');
                    const FormData = require('form-data');

                    var data = new FormData();
                    // data.append('imageURL', 'https://pg888-resources.s3.ap-southeast-1.amazonaws.com/production/5e44a357-a52b-463d-a5fa-21afea3d226a.jpg');
                    data.append('imageURL', `${payload.s3Url}`);

                    var config = {
                        method: 'post',
                        url: 'https://api.growdocb2b.com/SendImageURL',
                        headers: {
                            'x-api-key': '6XWNO1FVsA4L5YjOxH85t397U94KEW415fn9SxUN',
                            ...data.getHeaders()
                        },
                        data: data
                    };

                    let response = await axios(config);

                    const growdocData = imagesResult.map((image) => {
                        const data = {
                            entityId: image.id,
                            entityType: 'plant',
                            plantLotId: payload.plantLotId,
                            plantId: image.entityId,
                            apiResponse: JSON.stringify(response.data),
                            orgId: orgId,
                            companyId: payload.companyId,
                            createdBy: userId,
                            createdAt: currentTime,
                            updatedBy: userId,
                            updatedAt: currentTime,
                        };
                        return data;
                    });

                    await trx('growdoc_txns')
                        .insert(growdocData)
                        .returning('*');

                } catch(error) {
                    console.log('error', error);
                }
            }

            //  Log user activity
            const userActivityData = await Parallel.map(imageTagsResult, async (imageTag) => {
                const imageId = imageTag.entityId;
                const image = imagesResult.find((image) => image.id == imageId);

                const plantId = image.entityId;
                const plant = await trx('plants')
                    .where({
                        id: plantId,
                        orgId: orgId
                    })
                    .first();

                let description;

                if(payload.diseases && payload.diseases.trim()) {
                    description = `${username} added diseases ${payload.diseases} for plant serial ${plant?.plantSerial} of plant lot ${payload.lotNumber} on ${moment(currentTime).format('DD MMM YYYY hh:mm:ss a')} `
                } else {
                    description = `${username} added plant serial ${plant?.plantSerial} of plant lot ${payload.lotNumber} seems normal on ${moment(currentTime).format('DD MMM YYYY hh:mm:ss a')} `   
                }
                
                const data = {
                    orgId: orgId,
                    companyId: payload.companyId,
                    entityId: imageTag.id,
                    entityTypeId: EntityTypes.PlantObservation,
                    entityActionId: EntityActions.Add,
                    description: description,
                    createdBy: userId,
                    createdAt: currentTime,
                };

                return data;
            }, 1);


            await trx("user_activities")
                .insert(userActivityData)
                .returning('*');

        });

        return res.status(200).json({
            message: 'Bulk observation added successfully'
        });


    } catch (error) {
        console.log("[controllers][plants][addBulkObservation] :  Error", error);
        res.status(500).json({
            errors: [
                { code: "UNKNOWN_SERVER_ERROR", message: error.message },
            ],
        });
    }
};

module.exports = addBulkObservation;