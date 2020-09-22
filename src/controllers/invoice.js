const Joi = require("@hapi/joi");
const moment = require("moment");
const uuidv4 = require("uuid/v4");
var jwt = require("jsonwebtoken");
const _ = require("lodash");
const knex = require("../db/knex");
const bcrypt = require("bcrypt");
const saltRounds = 10;

const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");
const request = require("request");

const invoiceController = {

    getInvoiceDetails: async (req, res) => {
        try {

            let payload = { entityId: req.query.entityId, entityType: req.query.entityType };

            console.log('[controllers][invoice][getInvoiceDetails]:  Payloads:', payload);

            const schema = Joi.object().keys({
                entityId: Joi.number().required(),
                entityType: Joi.string().required()
            });

            let result = Joi.validate(payload, schema);
            console.log(
                "[controllers][invoice][getInvoiceDetails]: JOi Result",
                result
            );

            if (result && result.hasOwnProperty("error") && result.error) {
                return res.status(400).json({
                    errors: [
                        { code: "VALIDATION_ERROR", message: result.error.message }
                    ]
                });
            }

            let { entityType, entityId } = payload;
            let invoiceDetail = null;

            if (entityType == 'quotations') {
                invoiceDetail = await knex("quotations").where({
                    id: entityId
                }).select('invoiceData', 'id').first();
            }

            if (entityType == 'service_orders') {
                invoiceDetail = await knex("service_orders").where({
                    id: entityId
                }).select('invoiceData', 'id').first();
            }

            if (entityType == 'service_requests') {
                invoiceDetail = await knex("service_orders").where({
                    serviceRequestId: entityId
                }).select('invoiceData', 'id').first();
            }

            res.status(200).json({
                data: invoiceDetail,
                message: "Invoice details !"
            });
        } catch (err) {
            console.log("[controllers][invoice][getInvoiceDetails]: Error", err)
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },

    updateInvoice: async (req, res) => {
        try {
            // validate keys
            let userId = req.me.id;
            let invoicePayload = req.body;
            await knex.transaction(async trx => {

                const schema = Joi.object().keys({
                    entityId: Joi.number().required(),
                    entityType: Joi.string().required(),
                    invoiceUpdate: Joi.array().required()
                });

                // const result = Joi.validate(JSON.parse(quotationPayload), schema);
                const result = schema.validate(invoicePayload)

                console.log(
                    "[controllers][invoice][updateInvoice]: JOi Result",
                    result
                );

                if (result && result.hasOwnProperty("error") && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: "VALIDATION_ERROR", message: result.error.message }
                        ]
                    });
                }

                // Update in quotation update table,
                const currentTime = new Date().getTime();
                const updateInvoiceReq = await knex
                    .update({
                        invoiceData: JSON.stringify(invoicePayload.invoiceUpdate),
                        updatedAt: currentTime
                    })
                    .where({ id: invoicePayload.entityId })
                    .returning(["*"])
                    .transacting(trx)
                    .into(invoicePayload.entityType);

                // Start Update Assigned Parts In Invoice

                let partsLength = invoicePayload.invoiceUpdate[0].parts.length;
                console.log("parts length", partsLength);

                let partsData;
                for (let i = 0; i < partsLength; i++) {
                    console.log("partsArray", invoicePayload.invoiceUpdate[0].parts[i]);
                    partsData = invoicePayload.invoiceUpdate[0].parts[i];
                    updateAssignedParts = await knex
                        .update({
                            unitCost: partsData.unitCost,
                            quantity: partsData.quantity,
                            updatedAt: currentTime
                        })
                        .where({
                            entityId: invoicePayload.entityId,
                            entityType: invoicePayload.entityType,
                            partId: partsData.id
                        })
                        .returning(["*"])
                        .transacting(trx)
                        .into("assigned_parts");
                }


                // Start Update Assigned Charges In Invoice

                let chargesLength = invoicePayload.invoiceUpdate[0].charges.length;
                console.log("charges length", chargesLength);

                let chargesData;
                for (let j = 0; j < chargesLength; j++) {
                    console.log("chargesArray", invoicePayload.invoiceUpdate[0].charges[j]);
                    chargesData = invoicePayload.invoiceUpdate[0].charges[j];
                    updateAssignedCharges = await knex
                        .update({
                            chargeId: chargesData.id,
                            totalHours: chargesData.totalHours,
                            rate: chargesData.rate,
                            updatedAt: currentTime
                        })
                        .where({
                            entityId: invoicePayload.entityId,
                            entityType: invoicePayload.entityType,
                            chargeId: chargesData.id
                        })
                        .returning(["*"])
                        .transacting(trx)
                        .into("assigned_service_charges");
                }

                console.log(
                    "[controllers][invoice][updateInvoice]: Update Data", updateInvoiceReq
                );
                invoiceResponse = updateInvoiceReq[0];
                trx.commit;

                return res.status(200).json({
                    data: {
                        invoiceResponse
                    },
                    message: "Invoice updated successfully !"
                });
            });
        } catch (err) {
            console.log("[controllers][invoice][updateInvoice] :  Error", err);
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },

    getServiceOrderInvoice: async (req, res) => {
        try {
            let { serviceOrderId } = req.body;
            let userInfo;
            let requesterInfo;
            let orgId = req.orgId;

            let pagination = {};
            [rows] = await Promise.all([
                knex("service_orders")
                    .leftJoin(
                        "service_appointments",
                        "service_orders.id",
                        "service_appointments.serviceOrderId"
                    )
                    .select([
                        "service_appointments.appointedDate",
                        "service_appointments.appointedTime",
                        "service_orders.*"
                    ])
                    .where({
                        "service_orders.id": serviceOrderId,
                        "service_orders.orgId": req.orgId
                    })
            ]);
            let serviceOrderMaster = await knex("service_orders")
                .leftJoin("service_requests", "service_orders.serviceRequestId", "=", "service_requests.id")
                .leftJoin("users", "service_requests.createdBy", "=", "users.id")
                .select(
                    "service_orders.serviceRequestId",
                    "users.name as quotationsCreated",
                    "service_requests.houseId",
                    "service_requests.createdAt"
                )
                .where({ "service_orders.id": serviceOrderId, "service_orders.orgId": orgId }).first();

            let serviceRequestId = serviceOrderMaster.serviceRequestId;
            console.log("serviceRequestId", serviceRequestId);

            const surveyOrderData = await knex("survey_orders").where({
                serviceRequestId: serviceRequestId,
                isActive: "true",
                surveyOrderStatus: "Approved"
            }).orderBy("surveyOrderStatus", "desc").limit(1).select("id", "appointedDate").first();

            // let entityType = 'survey_order_notes';
            // let remarksNotesResult = await knex.raw(`select "remarks_master".*,"users"."name" as "createdBy" from "remarks_master"  left join "users" on "remarks_master"."createdBy" = "users"."id"   where "remarks_master"."entityId" = ${surveyOrderData.id} and "remarks_master"."entityType" = '${entityType}' and "remarks_master"."isActive" = 'true' order by "remarks_master"."entityId" desc  limit 3`)

            // // let remarksNotesList = remarksNotesResult.rows;
            // // let remarkNotes;
            // // if (remarksNotesList) {
            // //     remarkNotes = remarksNotesList;
            // // } else {
            // //     remarkNotes = ''
            // // }
            let remarkNotes;

            let teamsResult = await knex.raw(`select "service_orders"."id" as "SOId","service_orders"."displayId" as "SONo","users"."name" as "assignedTo","teams"."teamName" as "teamName" from "service_orders" left join "assigned_service_team" on "service_orders"."id" = "assigned_service_team"."entityId" left join "teams" on "assigned_service_team"."teamId" = "teams"."teamId" left join "users" on "assigned_service_team"."userId" = "users"."id" where "service_orders"."id" = ${serviceOrderId} and "assigned_service_team"."entityType"='service_orders' limit 1`)
            let othersUserData = await knex.raw(`select "assigned_service_additional_users"."userId" as "userId","users"."name" as "addUsers" from "assigned_service_additional_users" left join "users" on "assigned_service_additional_users"."userId" = "users"."id" where "assigned_service_additional_users"."entityId" = ${serviceOrderId} and "assigned_service_additional_users"."entityType"='service_orders'`)

            console.log("results", teamsResult.rows);

            let additionalUsers = othersUserData.rows;
            let teamData = { ...teamsResult.rows, additionalUsers };


            console.log("SurveyOrderDate", surveyOrderData);
            requesterInfo = await knex("service_requests")
                .leftJoin("requested_by", "service_requests.requestedBy", "=", "requested_by.id")
                .leftJoin("source_of_request", "service_requests.serviceType", "=", "source_of_request.id")
                .leftJoin("users", "service_requests.createdBy", "=", "users.id")
                .select(
                    "requested_by.name",
                    "source_of_request.requestCode",
                    "service_requests.createdAt",
                    "service_requests.description",
                    "service_requests.location",
                    "service_requests.priority",
                    "users.name as createdBy"
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
                    "users.location",
                    "users.taxId",
                    "users.fax"
                )
                .where({
                    "user_house_allocation.houseId": serviceOrderMaster.houseId
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
                    "companies.descriptionEng",
                    "companies.description1",
                    "companies.companyAddressEng",
                    "companies.companyAddressThai",
                    "companies.telephone",
                    "companies.fax",
                    "companies.taxId",
                    "projects.project as projectCode",
                    "projects.projectName",
                    "buildings_and_phases.buildingPhaseCode",
                    "buildings_and_phases.description as buildingPhaseDescription",
                    "floor_and_zones.floorZoneCode",
                    "floor_and_zones.description as floorZoneDescription",
                    "property_units.unitNumber as unitNumber",
                    "property_units.description as unitDescription",
                    "property_units.houseId as houseId",
                    "companies.logoFile",
                    "companies.orgLogoFile"
                )
                .where({
                    "property_units.id": serviceOrderMaster.houseId
                }).first();

            console.log("PropertyInfo", propertyInfo);


            // Ger Problem Category/Sub Category/Details
            problemDetails = await knex("service_problems")
                .leftJoin("incident_categories", "service_problems.categoryId", "=", "incident_categories.id")
                .leftJoin("incident_sub_categories", "service_problems.problemId", "=", "incident_sub_categories.id")
                .leftJoin("incident_type", "incident_sub_categories.incidentTypeId", "=", "incident_type.id")
                .select(
                    "incident_categories.categoryCode ",
                    "incident_categories.descriptionEng",
                    // "incident_sub_categories.categoryCode as subCategoryCode",
                    "incident_sub_categories.descriptionEng as subCategoryDescriptionEng",
                    "service_problems.description",
                    "incident_type.typeCode as problemType"
                )
                .where({
                    "service_problems.serviceRequestId": serviceRequestId,
                    "service_problems.orgId": orgId
                });

            let locationResult = await knex("location_tags")
                .leftJoin("location_tags_master", "location_tags.locationTagId", "location_tags_master.id")
                .where({
                    "location_tags.entityType": "service_requests",
                    "location_tags.entityId": serviceRequestId
                })
                .select("location_tags_master.title")
            let tags = _.uniq(locationResult.map(v => v.title)) //[userHouseId.houseId];

            propertyInfo.locationTags = tags;
            console.log("locationResult", tags);


            userInfo = { ...tenantInfo, requesterInfo, propertyInfo, problemDetails, serviceMaster: serviceOrderMaster, surveyData: surveyOrderData, surveyOrderNotes: remarkNotes, teams: teamData }
            pagination.data = rows;
            pagination.tenant = userInfo;

            return res.status(200).json({
                data: {
                    serviceOrder: pagination
                }
            });
        } catch (err) {
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    }
};

module.exports = invoiceController;