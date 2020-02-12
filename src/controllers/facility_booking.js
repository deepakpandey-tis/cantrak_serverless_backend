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
    facilityListing: async (req, res) => {
        try {
            let reqData = req.query;
            //let filters = req.body;
            let total, rows;
            // const accessibleProjects = req.userProjectResources[0].projects

            let pagination = {};
            let per_page = reqData.per_page || 10;
            let page = reqData.current_page || 1;
            if (page < 1) page = 1;
            let offset = (page - 1) * per_page;
            let filters = {};
            let {
                facilityId
            } = req.body;

            if (facilityId) {
                filters["facility_master.id"] = facilityId;
            }

            if (_.isEmpty(filters)) {
                [total, rows] = await Promise.all([
                    knex
                        .count("* as count")
                        .leftJoin('companies', 'facility_master.companyId', 'companies.id')
                        .leftJoin('projects', 'facility_master.projectId', 'projects.id')
                        .leftJoin('buildings_and_phases', 'facility_master.buildingPhaseId', 'buildings_and_phases.id')
                        .leftJoin('floor_and_zones', 'facility_master.floorZoneId', 'floor_and_zones.id')
                        .from("facility_master")
                        .where("facility_master.orgId", req.orgId)
                        .groupBy([
                            "facility_master.id",
                            "companies.id",
                            "projects.id",
                            "buildings_and_phases.id",
                            "floor_and_zones.id"
                        ]),
                    knex
                        .from("facility_master")
                        .leftJoin('companies', 'facility_master.companyId', 'companies.id')
                        .leftJoin('projects', 'facility_master.projectId', 'projects.id')
                        .leftJoin('buildings_and_phases', 'facility_master.buildingPhaseId', 'buildings_and_phases.id')
                        .leftJoin('floor_and_zones', 'facility_master.floorZoneId', 'floor_and_zones.id')
                        .where("facility_master.orgId", req.orgId)
                        .select([
                            "facility_master.id",
                            "facility_master.name",
                            "companies.companyName",
                            "projects.projectName",
                            "buildings_and_phases.buildingPhaseCode",
                            "buildings_and_phases.description as buildingDescription",
                            "floor_and_zones.floorZoneCode"
                        ])
                        .groupBy([
                            "facility_master.id",
                            "companies.id",
                            "projects.id",
                            "buildings_and_phases.id",
                            "floor_and_zones.id"
                        ])
                        .orderBy('facility_master.id', 'desc')
                        .offset(offset)
                        .limit(per_page)
                ]);
            } else {
                filters = _.omitBy(filters, val =>
                    val === "" || _.isNull(val) || _.isUndefined(val) || _.isEmpty(val)
                        ? true
                        : false
                );
                try {
                    [total, rows] = await Promise.all([
                        knex
                            .count("* as count")
                            .from("facility_master")
                            .leftJoin('companies', 'facility_master.companyId', 'companies.id')
                            .leftJoin('projects', 'facility_master.projectId', 'projects.id')
                            .leftJoin('buildings_and_phases', 'facility_master.buildingPhaseId', 'buildings_and_phases.id')
                            .leftJoin('floor_and_zones', 'facility_master.floorZoneId', 'floor_and_zones.id')

                            .where(qb => {
                                qb.where(filters);
                                qb.where("facility_master.orgId", req.orgId)

                            })
                            .groupBy([
                                "facility_master.id",
                                "companies.id",
                                "projects.id",
                                "buildings_and_phases.id",
                                "floor_and_zones.id"
                            ]),
                        knex
                            .from("facility_master")
                            .leftJoin('companies', 'facility_master.companyId', 'companies.id')
                            .leftJoin('projects', 'facility_master.projectId', 'projects.id')
                            .leftJoin('buildings_and_phases', 'facility_master.buildingPhaseId', 'buildings_and_phases.id')
                            .leftJoin('floor_and_zones', 'facility_master.floorZoneId', 'floor_and_zones.id')

                            .select([
                                "facility_master.id",
                                "facility_master.name",
                                "companies.companyName",
                                "projects.projectName",
                                "buildings_and_phases.buildingPhaseCode",
                                "buildings_and_phases.description as buildingDescription",
                                "floor_and_zones.floorZoneCode"
                            ])
                            .where(qb => {
                                qb.where(filters);
                                qb.where("facility_master.orgId", req.orgId)
                            })
                            .offset(offset)
                            .limit(per_page)
                    ]);
                } catch (e) {
                    // Error
                }
            }

            let count = total.length;

            pagination.total = count;
            pagination.per_page = per_page;
            pagination.offset = offset;
            pagination.to = offset + rows.length;
            pagination.last_page = Math.ceil(count / per_page);
            pagination.current_page = page;
            pagination.from = offset;
            pagination.data = rows;

            return res.status(200).json({
                data: {
                    facilities: pagination
                },
                message: "Facility List!"
            });
        } catch (err) {
            console.log("[controllers][facilityBooking][list] :  Error", err);
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    }

}


module.exports = facilityBookingController;