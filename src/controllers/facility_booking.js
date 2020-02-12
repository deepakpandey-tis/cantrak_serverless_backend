const knex = require("../db/knex");
const Joi = require("@hapi/joi");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const moment = require("moment");

const uuidv4 = require("uuid/v4");
var jwt = require("jsonwebtoken");
const _ = require("lodash");

const facilityBookingController = {
    addFacility: async (req, res) => {
        try {
            const payload = _.omit(req.body, [
                'rules_and_regulations',
                'open_close_times', 'images',
                'fees_payload',
                'booking_frequency',
                'booking_criteria'
            ]);

            const schema = Joi.object().keys({
                "name": Joi.string().required(),
                "companyId": Joi.string().required(),
                "projectId": Joi.string().required(),
                "buildingPhaseId": Joi.string().required(),
                "floorZoneId": Joi.string().required(),
                "description": Joi.string().required(),
                "descriptionAlternateLang": Joi.string().required(),
            })

            const result = Joi.validate(payload, schema);
            if (result && result.hasOwnProperty("error") && result.error) {
                return res.status(400).json({
                    errors: [
                        { code: "VALIDATION_ERROR", message: result.error.message }
                    ]
                });
            }


            let currentTime = new Date().getTime()

            // Insert Facility
            const addedFacilityResult = await knex('facility_master')
                .insert({ ...payload, updatedAt: currentTime, createdAt: currentTime, orgId: req.orgId, createdBy: req.me.id }).first()


            // Insert Rules

            let rulesPayload = req.body.rules_and_regulations
            let addedRules = []
            for (let rule of rulesPayload) {
                /*
                {rules,
                "rulesAlternateLang",}
                */
                let addedRulesResult = await knex('rules_and_regulations').insert({ entityId: addedFacilityResult.id, entityType: 'facility_master', ...rule, updatedAt: currentTime, createdAt: currentTime, orgId: req.orgId, createdBy: req.me.id })
                addedRules.push(addedRulesResult[0])
            }


            // Open Close Time
            /*
            {"day",
            "openTime",
            "closeTime"
            */

            const open_close_times = req.body.open_close_times
            let addedOpenCloseTimeResult = await knex('entity_open_close_times').insert({ entityId: addedFacilityResult.id, entityType: 'facility_master', ...open_close_times, updatedAt: currentTime, createdAt: currentTime, orgId: req.orgId, createdBy: req.me.id })


            // Images
            const images = req.body.images;
            let insertedImages = []
            for (let img of images) {
                let insertedImage = await knex('images').insert({
                    entityType: 'facility_master',
                    entityId: addedFacilityResult.id,
                    s3Url: img.s3Url,
                    name: img.filename,
                    title: img.title
                })
                insertedImages.push(insertedImage[0])
            }


            // Fees
            const fees_payload = req.body.fees_payload
            /**
             * "feesType"
                "feesAmount"
                duration
             */
            const feesResult = await knex('entity_fees_master').insert({
                ...fees_payload,
                entityId: addedRulesResult.id,
                entityType: 'facility_master',
                updatedAt: currentTime,
                createdAt: currentTime,
                orgId: req.orgId,
                createdBy: req.me.id
            })


            // Booking Frequency limit
            const booking_frequency = req.body.booking_frequency;
            /*
                "limitType" 
                "limitValue"
            */
            const bookingFrequencyResult = await knex('entity_booking_limit')
                .insert({
                    ...booking_frequency,
                    entityType: 'facility_booking',
                    entityId: addedFacilityResult.id,
                    updatedAt: currentTime,
                    createdAt: currentTime,
                    orgId: req.orgId,
                    createdBy: req.me.id
                })

            // Booking Criteria
            /**
             * {"bookingAllowedAdvanceTime"
                "bookingCloseAdvanceTime"
                "allowConcurrentBooking"
                "concurrentBookingLimit"
                "minBookingPeriod"
                "maxBookingPeriod"}
             */

            const bookingCriteriaPayload = req.body.booking_criteria;
            const addedBookingCriteriaResult = await knex('entity_booking_criteria')
                .insert({
                    ...bookingCriteriaPayload,
                    entityId: addedFacilityResult.id,
                    entityType: 'facility_master',
                    updatedAt: currentTime,
                    createdAt: currentTime,
                    orgId: req.orgId,
                    createdBy: req.me.id
                })


            return res.status(200).json({
                data: {
                    addedFacility: addedFacilityResult,
                    addedRules: addedRules,
                    addedOpenCloseTime: addedOpenCloseTimeResult,
                    addedImages: insertedImages,
                    addedFees: feesResult,
                    addedBookingFrequency: bookingFrequencyResult,
                    addedBookingCriteria: addedBookingCriteriaResult
                }
            })
        } catch (err) {
            console.log('ADD FACILITY ERROR: ', err)
            return res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            })
        }
    },

    deleteFacility: async (req, res) => {
        try {
            const id = req.body.id;

            const deactivatedFacility = await knex('facility_master').update({ isActive: false }).where({ id: id }).returning(['*'])
            return res.status(200).json({
                data: {
                    deactivatedFacility
                },
                message: 'Facility deactivated Successfully!'
            })
        } catch (err) {
            console.log('DELETE FACILITY ERROR: ', err)
            return res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            })
        }
    },
    /*FACILITY DETAILS*/
    facilityDetails: async (req, res) => {

        try {

            let orgId = req.orgId;
            let payload = req.body;
            const schema = Joi.object().keys({
                id: Joi.string().required()
            })

            const result = Joi.validate(payload, schema);

            if (result && result.hasOwnProperty("error") && result.error) {
                return res.status(400).json({
                    errors: [
                        { code: "VALIDATION_ERROR", message: result.error.message }
                    ]
                });
            }

            let [facilityDetails,
                openingCloseingDetail,
                ruleRegulationDetail,
                bookingCriteriaDetail,
                facilityImages
            ] = await Promise.all([

                knex.from('facility_master')
                    .leftJoin("companies", "facility_master.companyId", "companies.id")
                    .leftJoin("projects", "facility_master.projectId", "projects.id")
                    .leftJoin("buildings_and_phases", "facility_master.buildingPhaseId", "buildings_and_phases.id")
                    .leftJoin('floor_and_zones', 'facility_master.floorZoneId', 'floor_and_zones.id')
                    .select([
                        'facility_master.id',
                        'facility_master.name',
                        'facility_master.description',
                        'facility_master.descriptionAlternateLang',
                        'companies.companyId',
                        'companies.companyName',
                        'projects.project as projectId',
                        'projects.projectName',
                        'buildings_and_phases.buildingPhaseCode',
                        'buildings_and_phases.description as buildingName',
                        'floor_and_zones.floorZoneCode',
                        'floor_and_zones.description as floorName',
                    ])
                    .where({ 'facility_master.id': payload.id }).first()
                ,
                knex.from('entity_open_close_times').where({ entityId: payload.id, entityType: 'facility_master' })
                ,
                knex.from('rules_and_regulations').where({ entityId: payload.id, entityType: 'facility_master' })
                ,
                knex.from('entity_booking_criteria').where({ entityId: payload.id, entityType: 'facility_master' })
                ,
                knex.from('images').where({ entityId: payload.id, entityType: 'facility_master' })
            ])

            return res.status(200).json({
                facilityDetails: { ...facilityDetails, openingCloseingDetail, ruleRegulationDetail, bookingCriteriaDetail, facilityImages },
                message: "Facility Details!"
            });

        } catch (err) {

            console.log("controller[facility-booking][facilityDetails]")

            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });

        }
    }

}


module.exports = facilityBookingController;