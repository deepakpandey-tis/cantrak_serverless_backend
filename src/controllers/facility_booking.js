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
            const payload = req.body;
            // const schem
        } catch (err) {

        }
    },
    /*FACILITY DETAILS*/
    facilityDetails: async (req, res) => {

        try {

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
                openCloseDetail,
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
                    .where({ 'facility_master.id': payload.id })
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
                facilityDetails: { ...facilityDetails, ...openCloseDetail, ...ruleRegulationDetail, ...bookingCriteriaDetail,...facilityImages},
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