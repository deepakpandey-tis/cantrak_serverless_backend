const Joi = require('@hapi/joi');
const _ = require('lodash');
const moment = require("moment")

const knex = require('../../db/knex');
const XLSX = require('xlsx');



const quotationsController = {

    getQuotationsList: async (req, res) => {
        try {
            //const serviceOrders = await knex('service_orders').select();
            console.log("customerInfo", req.me.id);
            console.log("customerHouseInfo", req.me.houseIds);
            let houseIds = req.me.houseIds;

            let serviceRequestData = await knex.from("service_requests")
                .select('id')
                .whereIn("service_requests.houseId", houseIds)

            let serviceRequestIds = serviceRequestData.map(v => v.id)//[userHouseId.houseId];  

            console.log('ORG ID: ************************************************: ', req.orgId)
            let reqData = req.query;
            let total, rows

            let pagination = {};
            let per_page = reqData.per_page || 10;
            let page = reqData.current_page || 1;
            if (page < 1) page = 1;
            let offset = (page - 1) * per_page;

            [total, rows] = await Promise.all([
                knex.count("* as count").from("quotations")
                    .innerJoin("service_requests", "quotations.serviceRequestId", "service_requests.id")
                    .leftJoin("users", "quotations.createdBy", "users.id")
                    .where("quotations.orgId", req.orgId)
                    .whereIn("quotations.serviceRequestId", serviceRequestIds)
                    .groupBy(["quotations.id", "service_requests.id", "users.id"]),

                knex.from('quotations')
                    .innerJoin("service_requests", "quotations.serviceRequestId", "service_requests.id")
                    .leftJoin("users", "quotations.createdBy", "users.id")
                    .select([
                        "quotations.id as QId",
                        "quotations.serviceRequestId as serviceRequestId",
                        "service_requests.description as Description",
                        "service_requests.id as SRID",
                        "service_requests.priority as Priority",
                        "users.name as createdBy",
                        "quotations.quotationStatus as Status",
                        "quotations.createdAt as dateCreated"
                    ]).where({ 'quotations.orgId': req.orgId })
                    .whereIn("quotations.serviceRequestId", serviceRequestIds)
                    .groupBy(["quotations.id", "service_requests.id", "users.id"])
                    .offset(offset).limit(per_page)
            ])

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
                data: pagination,
                message: 'Quotations List!'
            })
        } catch (err) {
            console.log('[controllers][quotations][GetQuotationList] :  Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    getQuotationDetails: async (req, res) => {
        try {
            //let quotationRequestId = req.query.id;
            // Get Quotations Details

            await knex.transaction(async trx => {
                let payload = req.body;
                const schema = Joi.object().keys({
                    quotationId: Joi.number().required()
                });

                let result = Joi.validate(payload, schema);
                console.log(
                    "[controllers][quotation][Quotation Details]: JOi Result",
                    result
                );

                if (result && result.hasOwnProperty("error") && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: "VALIDATION_ERROR", message: result.error.message }
                        ]
                    });
                }

                let quotationRequestId = payload.quotationId;

                quotationView = await knex("quotations")
                    .leftJoin('companies', 'quotations.companyId', 'companies.id')
                    .leftJoin('projects', 'quotations.projectId', 'projects.id')
                    .leftJoin('buildings_and_phases', 'quotations.buildingId', 'buildings_and_phases.id')
                    .leftJoin('floor_and_zones', 'quotations.floorId', 'floor_and_zones.id')
                    .leftJoin('property_units', 'quotations.unitId', 'property_units.id')
                    .leftJoin(
                        "assigned_service_team as astm", "astm.entityId", "=", "quotations.id",
                        "astm.entityType", "=", "quotations"
                    )
                    .leftJoin("teams", "teams.teamId", "=", "astm.teamId")
                    .leftJoin("users as astUser", "astUser.id", "=", "astm.userId")

                    .leftJoin("users as authUser", "authUser.id", "=", "quotations.createdBy")
                    .leftJoin("users as checkUser", "checkUser.id", "=", "quotations.checkedBy")
                    .leftJoin("users as inspectedUser", "inspectedUser.id", "=", "quotations.inspectedBy")
                    .leftJoin("users as acknowledgeUser", "acknowledgeUser.id", "=", "quotations.acknowledgeBy")
                    .leftJoin(
                        "quotation_service_charges", "quotation_service_charges.quotationId", "=",
                        "quotation_service_charges.quotationId"
                    )
                    .leftJoin("organisation_user_roles", "astm.userId", "=", "organisation_user_roles.userId")
                    .leftJoin("organisation_roles", "organisation_user_roles.roleId", "=", "organisation_roles.id")
                    .select(
                        "quotations.id as quotationId",
                        "quotations.serviceRequestId as serviceRequestId",
                        "checkUser.name as checkedBy",
                        "inspectedUser.name as inspectedBy",
                        "checkUser.id as checkedByUserId",
                        "inspectedUser.id as inspectedByUserId",
                        "acknowledgeUser.id as acknowledgeByUserId",
                        "acknowledgeUser.name as acknowledgeBy",
                        "quotations.createdAt",
                        "quotations.quotationStatus",
                        "companies.companyName",
                        "projects.projectName",
                        "buildings_and_phases.buildingPhaseCode",
                        "floor_and_zones.floorZoneCode",
                        "property_units.unitNumber",
                        "companies.id as companyId",
                        "projects.id as projectId",
                        "buildings_and_phases.id as buildingId",
                        "floor_and_zones.id as floorId",
                        "property_units.id as unitId",
                        "teams.teamName as assignTeam",
                        "astUser.name as assignedMainUsers",
                        "authUser.name as createdBy",
                        "organisation_roles.name as userRole",
                        "quotations.invoiceData as invoiceData"
                    )
                    .where({ "quotations.id": quotationRequestId });
                console.log(
                    "[controllers][teams][getTeamList] : Team List",
                    quotationView
                );
                quotationsDetails = _.omit(
                    quotationView[0],
                    ["id"],
                    ["isActive"],
                    ["updatedAt"]
                );

                // Get addtional User list For Quotations
                addtionalUser = await knex("assigned_service_additional_users")
                    .leftJoin("users", "assigned_service_additional_users.userId", "=", "users.id")
                    .leftJoin("organisation_user_roles", "assigned_service_additional_users.userId", "=", "organisation_user_roles.userId")
                    .leftJoin("organisation_roles", "organisation_user_roles.roleId", "=", "organisation_roles.id")
                    .select("users.name as addtionalUsers", "organisation_roles.name as userRole")
                    .where({
                        "assigned_service_additional_users.entityId": quotationRequestId,
                        "assigned_service_additional_users.entityType": "quotations"
                    });
                console.log(
                    "[controllers][teams][getTeamList] : Addtional Users List", addtionalUser
                );
                quotationsDetails.addtinalUserList = addtionalUser;
                quotationsDetails.parts = [];
                quotationsDetails.assets = [];
                quotationsDetails.charges = [];

                teamResult = { quotation: quotationsDetails };
            });

            res.status(200).json({
                data: teamResult,
                message: "Quotations details !"
            });
        } catch (err) {
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    getQuotationAssignedParts: async (req, res) => {
        try {
            let reqData = req.query;
            let total, rows;

            let pagination = {};
            let per_page = reqData.per_page || 10;
            let page = reqData.current_page || 1;
            if (page < 1) page = 1;
            let offset = (page - 1) * per_page;

            let { quotationId } = req.body;


            [total, rows] = await Promise.all([
                knex("part_master")
                    .innerJoin(
                        "assigned_parts",
                        "part_master.id",
                        "assigned_parts.partId"
                    )
                    .select([
                        "part_master.partName as partName",
                        "part_master.id as id",
                        "part_master.partCode as partCode",
                        "assigned_parts.quantity as quantity",
                        "assigned_parts.unitCost as unitCost",
                        "assigned_parts.id as apId"
                    ])
                    .where({
                        entityId: quotationId,
                        entityType: "quotations"
                    }),
                knex("part_master")
                    .innerJoin(
                        "assigned_parts",
                        "part_master.id",
                        "assigned_parts.partId"
                    )
                    .select([
                        "part_master.partName as partName",
                        "part_master.id as id",
                        "part_master.partCode as partCode",
                        "assigned_parts.quantity as quantity",
                        "assigned_parts.unitCost as unitCost",
                        "assigned_parts.id as apId"
                    ])
                    .where({
                        entityId: quotationId,
                        entityType: "quotations"
                    })
                    .offset(offset)
                    .limit(per_page)
            ]);


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
                    assignedParts: pagination
                }
            })


        } catch (err) {
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    getQuotationAssignedCharges: async (req, res) => {
        try {
            let reqData = req.query;
            let total, rows;

            let pagination = {};
            let per_page = reqData.per_page || 10;
            let page = reqData.current_page || 1;
            if (page < 1) page = 1;
            let offset = (page - 1) * per_page;

            let { quotationId } = req.body;


            [total, rows] = await Promise.all([
                knex("charge_master")
                    .innerJoin(
                        "assigned_service_charges",
                        "charge_master.id",
                        "assigned_service_charges.chargeId"
                    )
                    .select([
                        "charge_master.chargeCode as chargeCode",
                        "charge_master.descriptionEng as descriptionEng",
                        "charge_master.descriptionThai as descriptionThai",
                        "charge_master.id as id",
                        "charge_master.calculationUnit as calculationUnit",
                        "assigned_service_charges.rate as rate",
                        "assigned_service_charges.totalHours as totalHours",
                        "assigned_service_charges.id as cid"
                    ])
                    .where({
                        entityId: quotationId,
                        entityType: "quotations"
                    }),
                knex("charge_master")
                    .innerJoin(
                        "assigned_service_charges",
                        "charge_master.id",
                        "assigned_service_charges.chargeId"
                    )
                    .select([
                        "charge_master.chargeCode as chargeCode",
                        "charge_master.descriptionEng as descriptionEng",
                        "charge_master.descriptionThai as descriptionThai",
                        "charge_master.id as id",
                        "charge_master.calculationUnit as calculationUnit",
                        "assigned_service_charges.rate as rate",
                        "assigned_service_charges.totalHours as totalHours",
                        "assigned_service_charges.id as cid"
                    ])
                    .where({
                        entityId: quotationId,
                        entityType: "quotations"
                    })
                    .offset(offset)
                    .limit(per_page)
            ]);


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
                    assignedCharges: pagination
                }
            })


        } catch (err) {
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    getQuotationInvoice: async (req, res) => {
        try {
            let { quotationId } = req.body;
            let rows;
            let userInfo;
            let requesterInfo;
            let orgId = req.orgId;

            let pagination = {};
            [rows] = await Promise.all([
                knex("quotations")
                    .leftJoin(
                        "taxes",
                        "quotations.vatId",
                        "taxes.id"
                    )
                    .select([
                        "taxes.taxCode as taxCode",
                        "quotations.*"
                    ])
                    .where({
                        "quotations.id": quotationId,
                        "quotations.orgId": req.orgId
                    })
            ]);


            let quotationMaster = await knex("quotations")
                .leftJoin("users", "quotations.createdBy", "=", "users.id")
                .select(
                    "quotations.serviceRequestId",
                    "users.name as quotationsCreated",
                    "quotations.unitId",
                    "quotations.createdAt"

                )
                .where({ "quotations.id": quotationId, "quotations.orgId": orgId }).first();

            let serviceRequestId = quotationMaster.serviceRequestId;
            console.log("serviceRequestId", serviceRequestId);

            const DataResult = await knex("service_requests").where({
                id: serviceRequestId,
                isActive: "true"
            }).first();


            requesterInfo = await knex("service_requests")
                .leftJoin("requested_by", "service_requests.requestedBy", "=", "requested_by.id")
                .leftJoin("source_of_request", "service_requests.serviceType", "=", "source_of_request.id")
                .select(
                    "requested_by.name",
                    "source_of_request.requestCode",
                    "service_requests.createdAt",
                    "service_requests.description",
                    "service_requests.location"
                )
                .where({
                    "service_requests.id": serviceRequestId
                }).first();
            requesterData = requesterInfo;
            console.log("requestedByDetails", requesterData);


            tenantInfo = await knex("user_house_allocation")
                .leftJoin("users", "user_house_allocation.userId", "=", "users.id")
                .select(
                    "users.name",
                    "users.mobileNo",
                    "users.email",
                    "users.location"
                )
                .where({
                    "user_house_allocation.houseId": quotationMaster.unitId
                }).first();
            tenantData = tenantInfo;
            console.log("tenantDataInfo", tenantData);

            propertyInfo = await knex("property_units")
                .leftJoin("companies", "property_units.companyId", "=", "companies.id")
                .leftJoin("projects", "property_units.projectId", "=", "projects.id")
                .leftJoin("buildings_and_phases", "property_units.buildingPhaseId", "=", "buildings_and_phases.id")
                .leftJoin("floor_and_zones", "property_units.floorZoneId", "=", "floor_and_zones.id")
                .select(
                    "companies.companyName",
                    "projects.project as projectCode",
                    "projects.projectName",
                    "buildings_and_phases.buildingPhaseCode",
                    "buildings_and_phases.description as buildingPhaseDescription",
                    "floor_and_zones.floorZoneCode",
                    "floor_and_zones.description as floorZoneDescription",
                    "property_units.unitNumber as unitNumber",
                    "property_units.description as unitDescription",
                    "property_units.houseId as houseId",
                    "companies.logoFile"
                )
                .where({
                    "property_units.id": quotationMaster.unitId
                }).first();

            console.log("PropertyInfo", propertyInfo);

            userInfo = { ...tenantInfo, requesterInfo, propertyInfo, serviceMaster: quotationMaster }
            pagination.data = rows;
            pagination.tenant = userInfo;
            // pagination.propertyDetails = userInfo;
            // pagination.companyData = companyInfo;

            return res.status(200).json({
                data: {
                    quotation: pagination
                }
            });
        } catch (err) {
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
}

module.exports = quotationsController;