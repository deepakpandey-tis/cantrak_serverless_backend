const knex = require("../../db/knex");
const Joi = require("@hapi/joi");
const moment = require("moment-timezone");
// const momentWithTZ = require("moment");
const _ = require("lodash");
const emailHelper = require('../../helpers/email')

const facilityHelper = require('../../helpers/facility');
const QRCODE = require("qrcode");


var arrayCompare = require("array-compare");


const SUNDAY = 'Sun';
const MONDAY = 'Mon';
const TUESDAY = 'Tue';
const WEDNESDAY = 'Wed';
const THURSDAY = 'Thu';
const FRIDAY = 'Fri';
const SATURDAY = 'Sat';

const WEEK_DAYS = [SUNDAY, MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY];

const facilityBookingController = {

    getIncomingParcelList: async (req, res) => {

        try {
            let id = req.me.id;
            //let resourceProject = req.userProjectResources[0].projects;
            let { listType } = req.body;
            let resultData;
            let resultPickUp;
            let totalNewParcel;
            console.log("listType", listType);
            let parcelType;
            if (listType == "1") {
                parcelType = "1";
            }    
            let parcelsId = [];

            
            
            // READY FOR PICK-UP PARCELS

            resultData = await knex.from('parcel_management')
                .leftJoin(
                    "parcel_user_tis",
                    "parcel_management.id",
                    "parcel_user_tis.parcelId"
                )
                .leftJoin(
                    "parcel_user_non_tis",
                    "parcel_management.id",
                    "parcel_user_non_tis.parcelId"
                )
                .leftJoin(
                    "property_units",
                    "parcel_user_tis.unitId",
                    "property_units.id"
                )
                .leftJoin(
                    "courier",
                    "parcel_management.carrierId",
                    "courier.id"
                )
                .leftJoin("users", "parcel_user_tis.tenantId", "users.id")
                .select([
                    "parcel_user_tis.*",
                    "parcel_user_non_tis.*",
                    "parcel_management.id",
                    "parcel_management.parcelCondition",
                    "parcel_management.parcelType",
                    "parcel_user_tis.unitId",
                    "parcel_management.trackingNumber",
                    "parcel_management.parcelStatus",
                    "users.name as tenant",
                    "parcel_management.createdAt",
                    "parcel_management.pickedUpType",
                    "property_units.unitNumber",
                    "parcel_management.description",
                    "courier.courierName",
                    "parcel_management.receivedDate",
                    "parcel_management.qrCode"

                ])
                .where({ 'parcel_management.orgId': req.orgId, 'parcel_management.parcelStatus': '1',  'parcel_management.pickedUpType': parcelType })
                .where({ 'parcel_user_tis.tenantId': id })
                .orderBy('parcel_management.id', 'desc')

                totalNewParcel = await knex('parcel_management').count('* as totalNewAddParcel')
                .where({ 'parcel_management.orgId': req.orgId, 'parcel_management.parcelStatus': '1', 'parcel_management.pickedUpType': parcelType, 'parcel_management.parcelViewStatus': '1' }).first();
               console.log("totalUnreadParcel",totalNewParcel);
               let totalNewParcelAdded = totalNewParcel.totalNewAddParcel;

            const Parallel = require("async-parallel");
            resultData = await Parallel.map(resultData, async (pd) => {
                console.log("...resultData",pd.unitNumber)
                parcelsId = pd.id;

                let unitNumber = pd.unitNumber

                let qrCode1 = 'org~' + req.orgId + '~unitNumber~' + unitNumber + '~parcel~' + pd.id
                let qrCode;
                if (qrCode1) {
                    qrCode = await QRCODE.toDataURL(qrCode1);
                }

                let imageResult = await knex
                    .from("images")
                    .select("s3Url", "title", "name")
                    .where({
                        entityId: pd.id,
                        entityType: "parcel_management"
                    }).first();

                return {
                    ...pd,
                    uploadedImages: imageResult,
                    qrCode,
                    totalNewParcelAdded                     
                };
            });
           
            res.status(200).json({
                data: {
                    parcelListData: resultData
                },
                message: "Parcel list successfully!"
            })

            console.log("parcelsId",parcelsId);
            // Update view status as view all outgoing parcel by user
            await Parallel.map(resultData, async (up) => {
                // Update view status as view all outgoing parcel by user
                const updateParcelStatus = await knex("parcel_management")
                    .update({ parcelViewStatus: '0'})
                    .where({'parcel_management.id' : up.id});
            });

        } catch (err) {

            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });

        }

    },

    getOutgoingParcelList: async (req, res) => {

        try {
            let id = req.me.id;
            //let resourceProject = req.userProjectResources[0].projects;
            let { listType } = req.body;
            let resultData;
            let resultPickUp;
            let totalNewParcel
            console.log("listType", listType);
            let parcelType;
            if (listType == "2") {
                parcelType = "2";
            }
            
            let parcelsId = Array;
            
            
            // READY FOR PICK-UP PARCELS

            resultData = await knex.from('parcel_management')
                .leftJoin(
                    "parcel_user_tis",
                    "parcel_management.id",
                    "parcel_user_tis.parcelId"
                )
                .leftJoin(
                    "parcel_user_non_tis",
                    "parcel_management.id",
                    "parcel_user_non_tis.parcelId"
                )
                .leftJoin(
                    "property_units",
                    "parcel_user_tis.unitId",
                    "property_units.id"
                )
                .leftJoin(
                    "courier",
                    "parcel_management.carrierId",
                    "courier.id"
                )
                .leftJoin("users", "parcel_user_tis.tenantId", "users.id")
                .select([
                    "parcel_user_tis.*",
                    "parcel_user_non_tis.*",
                    "parcel_management.id",
                    "parcel_management.parcelCondition",
                    "parcel_management.parcelType",
                    "parcel_user_tis.unitId",
                    "parcel_management.trackingNumber",
                    "parcel_management.parcelStatus",
                    "users.name as tenant",
                    "parcel_management.createdAt",
                    "parcel_management.pickedUpType",
                    "property_units.unitNumber",
                    "parcel_management.description",
                    "courier.courierName",
                    "parcel_management.receivedDate",
                    "parcel_management.qrCode"

                ])
                .where({ 'parcel_management.orgId': req.orgId, 'parcel_management.parcelStatus': '1',  'parcel_management.pickedUpType': parcelType })
                .where({ 'parcel_user_tis.tenantId': id })
                .orderBy('parcel_management.id', 'desc')

                totalNewParcel = await knex('parcel_management').count('* as totalNewAddParcel')
                .where({ 'parcel_management.orgId': req.orgId, 'parcel_management.parcelStatus': '1', 'parcel_management.pickedUpType': parcelType, 'parcel_management.parcelViewStatus': '1' }).first();
               console.log("totalUnreadParcel",totalNewParcel);
               let totalNewParcelAdded = totalNewParcel.totalNewAddParcel;

               
            const Parallel = require("async-parallel");
            resultData = await Parallel.map(resultData, async (pd) => {

                parcelsId = pd.id;

                console.log("...resultData",pd.unitNumber)
                let unitNumber = pd.unitNumber

                let qrCode1 = 'org~' + req.orgId + '~unitNumber~' + unitNumber + '~parcel~' + pd.id
                let qrCode;
                if (qrCode1) {
                    qrCode = await QRCODE.toDataURL(qrCode1);
                }

                let imageResult = await knex
                    .from("images")
                    .select("s3Url", "title", "name")
                    .where({
                        entityId: pd.id,
                        entityType: "parcel_management"
                    }).first();

                return {
                    ...pd,
                    uploadedImages: imageResult,
                    qrCode,
                    totalNewParcelAdded 

                };
            });

            res.status(200).json({
                data: {
                    parcelListData: resultData
                },
                message: "Parcel list successfully!"
            })

            console.log("parcelsId",parcelsId);
            await Parallel.map(resultData, async (up) => {
                // Update view status as view all outgoing parcel by user
                const updateParcelStatus = await knex("parcel_management")
                    .update({ parcelViewStatus: '0'})
                    .where({'parcel_management.id' : up.id});
            });

        } catch (err) {

            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });

        }

    },

    getPickedUpParcelList: async (req, res) => {

        try {
            let id = req.me.id;
            //let resourceProject = req.userProjectResources[0].projects;
            let { listType } = req.body;
            let resultPickUp;
            let totalNewParcel;
            console.log("listType", listType);
            let parcelType;
            if (listType == "1") {
                parcelType = "1";
            }    
                      
            // PICKED-UP PARCELS

            resultPickUp = await knex.from('parcel_management')
                .leftJoin(
                    "parcel_user_tis",
                    "parcel_management.id",
                    "parcel_user_tis.parcelId"
                )
                .leftJoin(
                    "parcel_user_non_tis",
                    "parcel_management.id",
                    "parcel_user_non_tis.parcelId"
                )
                .leftJoin(
                    "property_units",
                    "parcel_user_tis.unitId",
                    "property_units.id"
                )
                .leftJoin(
                    "courier",
                    "parcel_management.carrierId",
                    "courier.id"
                )
                .leftJoin("users", "parcel_user_tis.tenantId", "users.id")
                .select([
                    "parcel_user_tis.*",
                    "parcel_user_non_tis.*",
                    "parcel_management.id",
                    "parcel_management.parcelCondition",
                    "parcel_management.parcelType",
                    "parcel_user_tis.unitId",
                    "parcel_management.trackingNumber",
                    "parcel_management.parcelStatus",
                    "users.name as tenant",
                    "parcel_management.createdAt",
                    "parcel_management.pickedUpType",
                    "property_units.unitNumber",
                    "parcel_management.description",
                    "courier.courierName",
                    "parcel_management.receivedDate",
                    "parcel_management.qrCode"

                ])
                .where({ 'parcel_management.orgId': req.orgId, 'parcel_management.parcelStatus': '2', 'parcel_management.pickedUpType': parcelType })
                .where({ 'parcel_user_tis.tenantId': id })
                .orderBy('parcel_management.receivedDate', 'desc')
                .limit(20)
               
            const Parallel = require("async-parallel");
            resultPickUp = await Parallel.map(resultPickUp, async (pp) => {
                console.log("...resultPickUp",pp.unitNumber)
                let unitNumber = pp.unitNumber

                let qrCode1 = 'org~' + req.orgId + '~unitNumber~' + unitNumber + '~parcel~' + pp.id
                let qrCode;
                if (qrCode1) {
                    qrCode = await QRCODE.toDataURL(qrCode1);
                }

                let imageResult = await knex
                    .from("images")
                    .select("s3Url", "title", "name")
                    .where({
                        entityId: pp.id,
                        entityType: "parcel_management"
                    }).first();

                return {
                    ...pp,
                    uploadedImages: imageResult,
                    qrCode

                };
            });

            res.status(200).json({
                data: {
                    parcelPickedData: resultPickUp
                },
                message: "Parcel list successfully!"
            })
            
        } catch (err) {

            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });

        }

    },

    getDispatchedParcelList: async (req, res) => {

        try {
            let id = req.me.id;
            //let resourceProject = req.userProjectResources[0].projects;
            let { listType } = req.body;
            let resultPickUp;
            let totalNewParcel
            console.log("listType", listType);
            let parcelType;
            if (listType == "2") {
                parcelType = "2";
            }
                        
            // PICKED-UP PARCELS

            resultPickUp = await knex.from('parcel_management')
                .leftJoin(
                    "parcel_user_tis",
                    "parcel_management.id",
                    "parcel_user_tis.parcelId"
                )
                .leftJoin(
                    "parcel_user_non_tis",
                    "parcel_management.id",
                    "parcel_user_non_tis.parcelId"
                )
                .leftJoin(
                    "property_units",
                    "parcel_user_tis.unitId",
                    "property_units.id"
                )
                .leftJoin(
                    "courier",
                    "parcel_management.carrierId",
                    "courier.id"
                )
                .leftJoin("users", "parcel_user_tis.tenantId", "users.id")
                .select([
                    "parcel_user_tis.*",
                    "parcel_user_non_tis.*",
                    "parcel_management.id",
                    "parcel_management.parcelCondition",
                    "parcel_management.parcelType",
                    "parcel_user_tis.unitId",
                    "parcel_management.trackingNumber",
                    "parcel_management.parcelStatus",
                    "users.name as tenant",
                    "parcel_management.createdAt",
                    "parcel_management.pickedUpType",
                    "property_units.unitNumber",
                    "parcel_management.description",
                    "courier.courierName",
                    "parcel_management.receivedDate",
                    "parcel_management.qrCode"

                ])
                .where({ 'parcel_management.orgId': req.orgId, 'parcel_management.parcelStatus': '2', 'parcel_management.pickedUpType': parcelType })
                .where({ 'parcel_user_tis.tenantId': id })
                .orderBy('parcel_management.receivedDate', 'desc')
                .limit(20);
               
            const Parallel = require("async-parallel");
            resultPickUp = await Parallel.map(resultPickUp, async (pp) => {
                console.log("...resultPickUp",pp.unitNumber)
                let unitNumber = pp.unitNumber

                let qrCode1 = 'org~' + req.orgId + '~unitNumber~' + unitNumber + '~parcel~' + pp.id
                let qrCode;
                if (qrCode1) {
                    qrCode = await QRCODE.toDataURL(qrCode1);
                }

                let imageResult = await knex
                    .from("images")
                    .select("s3Url", "title", "name")
                    .where({
                        entityId: pp.id,
                        entityType: "parcel_management"
                    }).first();

                return {
                    ...pp,
                    uploadedImages: imageResult,
                    qrCode

                };
            });


            res.status(200).json({
                data: {
                    parcelPickedData: resultPickUp
                },
                message: "Parcel list successfully!"
            })
           

        } catch (err) {

            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });

        }

    },

    getParcelDetails: async (req, res) => {
        try {
            let id = req.me.id;
            let { parcelId } = req.body;
            let resultData;
            let parcelStatus;

            resultData = await knex.from('parcel_management')
                .leftJoin(
                    "parcel_user_tis",
                    "parcel_management.id",
                    "parcel_user_tis.parcelId"
                )
                .leftJoin(
                    "parcel_user_non_tis",
                    "parcel_management.id",
                    "parcel_user_non_tis.parcelId"
                )
                .leftJoin(
                    "property_units",
                    "parcel_user_tis.unitId",
                    "property_units.id"
                )
                .leftJoin(
                    "courier",
                    "parcel_management.carrierId",
                    "courier.id"
                )
                .leftJoin("users", "parcel_user_tis.tenantId", "users.id")
                .select([
                    "parcel_user_tis.*",
                    "parcel_user_non_tis.*",
                    "parcel_management.id",
                    "parcel_management.parcelCondition",
                    "parcel_management.parcelType",
                    "parcel_user_tis.unitId",
                    "parcel_management.trackingNumber",
                    "parcel_management.parcelStatus",
                    "users.name as tenant",
                    "parcel_management.createdAt",
                    "parcel_management.pickedUpType",
                    "property_units.unitNumber",
                    "parcel_management.description",
                    "courier.courierName",
                    "parcel_management.receivedDate",
                    "parcel_management.pickedUpAt",
                    "parcel_management.signature"
                ])
                .where({ 'parcel_management.orgId': req.orgId })
                .where({ 'parcel_management.id': parcelId })
                .first()

                console.log("...resultData",resultData)
            
            let imageResult = await knex
                .from("images")
                .select("s3Url", "title", "name")
                .where({
                    entityId: parcelId,
                    entityType: "parcel_management"
                })


                let pickUpImageResult = await knex
                .from("images")
                .select("s3Url", "title", "name")
                .where({
                    entityId: parcelId,
                    entityType: "pickup_parcel"
                })

                let pickUpRemarks = await knex
                .from("remarks_master")
                .select("description")
                .where({
                    entityId: parcelId,
                    entityType: "pickup_parcel_remarks",
                    orgId: req.orgId,
                }).first();

            res.status(200).json({
                data: {
                    parcelDetails: {
                        ...resultData, imageResult, pickUpImageResult,pickUpRemarks
                    }
                },
                message: "Parcel details successfully!"
            })

        } catch (err) {

            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });

        }

    },

    getParcelApprovalList: async (req, res) => {
        try {
            let id = req.me.id;
            let parcelIds = req.body.parcelId;
            let newParcel = parcelIds.split(',');

            console.log("parcels", newParcel);
            let resultData;
            let parcelStatus;

            resultData = await knex.from('parcel_management')
                .leftJoin(
                    "parcel_user_tis",
                    "parcel_management.id",
                    "parcel_user_tis.parcelId"
                )
                .leftJoin(
                    "parcel_user_non_tis",
                    "parcel_management.id",
                    "parcel_user_non_tis.parcelId"
                )
                .leftJoin(
                    "property_units",
                    "parcel_user_tis.unitId",
                    "property_units.id"
                )
                .leftJoin(
                    "courier",
                    "parcel_management.carrierId",
                    "courier.id"
                )
                .leftJoin("users", "parcel_user_tis.tenantId", "users.id")
                .select([
                    "parcel_user_tis.*",
                    "parcel_user_non_tis.*",
                    "parcel_management.id",
                    "parcel_management.parcelCondition",
                    "parcel_management.parcelType",
                    "parcel_user_tis.unitId",
                    "parcel_management.trackingNumber",
                    "parcel_management.parcelStatus",
                    "users.name as tenant",
                    "parcel_management.createdAt",
                    "parcel_management.pickedUpType",
                    "property_units.unitNumber",
                    "parcel_management.description",
                    "courier.courierName",
                    "parcel_management.receivedDate",
                    "parcel_management.pickedUpAt",
                ])
                .where({ 'parcel_management.orgId': req.orgId })
                .whereIn('parcel_management.id', newParcel)


            const Parallel = require("async-parallel");
            resultData = await Parallel.map(resultData, async (pd) => {
                let unitNumber = pd.unitNumber

                let qrCode1 = 'org~' + req.orgId + '~unitNumber~' + unitNumber + '~parcel~' + pd.id
                let qrCode;
                if (qrCode1) {
                    qrCode = await QRCODE.toDataURL(qrCode1);
                }

                let imageResult = await knex
                    .from("images")
                    .select("s3Url", "title", "name")
                    .where({
                        entityType: "parcel_management",
                        entityId: pd.id
                    }).first();
                return {
                    ...pd,
                    uploadedImages: imageResult,
                    qrCode

                };
            });



            res.status(200).json({
                data: {
                    parcelApprovalList:resultData
                },
                message: "Parcel details successfully!"
            })

        } catch (err) {

            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });

        }
    },

    getUserPendingApprovalList: async (req, res) => {
        try {
            let id = req.me.id;          
            let resultData;
            var array = [];
            let approvalUrl;

            resultData = await knex.from('parcel_management')
                .leftJoin(
                    "parcel_user_tis",
                    "parcel_management.id",
                    "parcel_user_tis.parcelId"
                )
                .leftJoin(
                    "parcel_user_non_tis",
                    "parcel_management.id",
                    "parcel_user_non_tis.parcelId"
                )
                .leftJoin(
                    "property_units",
                    "parcel_user_tis.unitId",
                    "property_units.id"
                )
                .leftJoin(
                    "courier",
                    "parcel_management.carrierId",
                    "courier.id"
                )
                .leftJoin("users", "parcel_user_tis.tenantId", "users.id")
                .select([
                    "parcel_management.id"                    
                ])
                .where({ 'parcel_management.orgId': req.orgId })
                .where({ 'parcel_management.isPendingForApproval' : true});

                if(resultData.length > 0){
                    let parcelIds;
                    resultData.forEach(function(item) {
                        parcelIds+=item.id+",";
                    });

                    let pId = parcelIds.replace(/,\s*$/, "");  
                    let newPid = pId.replace("undefined","");
                    
                    console.log("newPid+++++", newPid);
                    console.log("pid+++++", pId);
                    console.log("resultArray+++++", parcelIds);

                    approvalUrl = `${process.env.SITE_URL}/user/parcel/parcel-confirmation?parcels=${newPid}`;
                    console.log("approvalUrl", approvalUrl);

                }else{
                    approvalUrl = "";
                }
                
                let totalPendingApproval = resultData.length;
                console.log("totalPending",totalPendingApproval);

            res.status(200).json({
                data: {
                    parcelPendingApprovalList:approvalUrl,
                    pendingParcelCount: totalPendingApproval
                },
                message: "Parcel approval url!"
            })

        } catch (err) {

            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });

        }
    },

    cancelParcel: async (req, res) => {
        try {
            const parcelId = req.body.parcelId;
            let newParcel = parcelId.split(',');
            const currentTime = new Date().getTime();

            const status = await knex("parcel_management")
                .update({ parcelStatus: '5', updatedAt: currentTime, isPendingForApproval: false})
                .whereIn('parcel_management.id', newParcel);
            return res.status(200).json({
                data: {
                    status: "CANCELLED"
                },
                message: "Parcel has been cancelled!"
            });
        } catch (err) {
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    approveParcel: async (req, res) => {
        try {
            let parcelId = req.body.parcelId;
            let newParcel = parcelId.split(',');

            const currentTime = new Date().getTime();
            console.log('REQ>BODY&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&7', req.body)

            const status = await knex("parcel_management")
                .update({ parcelStatus: '2', receivedDate: currentTime, receivedBy: req.me.id, isPendingForApproval: false })
                .whereIn('parcel_management.id', newParcel);

            return res.status(200).json({
                data: {
                    status: "Picked"
                },
                message: "Parcel accepted successfully!"
            });
        } catch (err) {
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },

    /*GET USER FACILITY LIST */
    getUserFacilityList: async (req, res) => {

        try {
            let id = req.me.id;
            let propertUnitresult = null;
            let userHouseResult = null;
            let propertyUnitFinalResult = null;
            //let resourceProject = req.userProjectResources[0].projects;
            let { startDateTime, endDateTime, projectId, buildingId } = req.body;
            let resultData;

            console.log("customerHouseInfo", req.me.houseIds);
            let houseIdArray = req.me.houseIds;

            propertyUnitFinalResult = await knex.from('property_units')
                .where({ orgId: req.orgId })
                .whereIn('id', houseIdArray);

            let projectArray = _.uniqBy(propertyUnitFinalResult, 'projectId').map(v => v.projectId)


            resultData = await knex.from('facility_master')
                .leftJoin('companies', 'facility_master.companyId', 'companies.id')
                .leftJoin('projects', 'facility_master.projectId', 'projects.id')
                .leftJoin('buildings_and_phases', 'facility_master.buildingPhaseId', 'buildings_and_phases.id')
                .leftJoin('floor_and_zones', 'facility_master.floorZoneId', 'floor_and_zones.id')
                .leftJoin('entity_open_close_times', 'facility_master.id', 'entity_open_close_times.entityId')
                .select([
                    'facility_master.*',
                    'companies.companyId as companyCode',
                    'companies.companyName',
                    'projects.project as projectCode',
                    'projects.projectName',
                    'buildings_and_phases.buildingPhaseCode',
                    'buildings_and_phases.description as buildingName',
                    'floor_and_zones.floorZoneCode',
                    'floor_and_zones.description as floorName',

                ])
                .where(qb => {
                    if (projectId) {
                        qb.where('facility_master.projectId', projectId)
                    }
                    if (buildingId) {
                        qb.where('facility_master.buildingPhaseId', buildingId)
                    }
                    if (startDateTime && endDateTime) {
                        qb.where('entity_open_close_times.openTime', '>=', startDateTime)
                        qb.where('entity_open_close_times.closeTime', '<=', endDateTime)
                    }
                })
                .where({ 'facility_master.orgId': req.orgId, 'facility_master.moderationStatus': true, 'facility_master.status': true })
                .whereIn('facility_master.projectId', projectArray)
                .orderBy('facility_master.id', 'desc')
                .groupBy('facility_master.id', 'companies.id', 'projects.id', 'buildings_and_phases.id', 'floor_and_zones.id')
                .distinct('facility_master.id')



            const Parallel = require('async-parallel');
            resultData = await Parallel.map(resultData, async pd => {

                let imageResult = await knex.from('images').select('s3Url', 'title', 'name')
                    .where({ "entityId": pd.id, "entityType": 'facility_master' })

                let iconResult = await knex.from('images').select('s3Url', 'title', 'name')
                    .where({ "entityId": pd.facilityTypeId, "entityType": 'facility_type_icon' }).first();

                let currentTime = new Date().getTime();
                let startDate = moment(currentTime).startOf('date').format();
                let endDate = moment(currentTime).endOf('date').format();
                let startTime = new Date(startDate).getTime();
                let endTime = new Date(endDate).getTime();

                let bookingResult = await knex.from('entity_bookings')
                    .where({ "entityId": pd.id, "entityType": 'facility_master', orgId: req.orgId })
                    .whereBetween('bookedAt', [startTime, endTime]);

                let todayTotalBooking = 0;
                if (bookingResult.length) {
                    todayTotalBooking = bookingResult.length;
                }


                let feeResult = await knex.from('entity_fees_master').select("feesType", "feesAmount", "duration", 'id as feeId')
                    .where({ "entityId": pd.id, "entityType": 'facility_master', orgId: req.orgId }).first();

                let charges;

                if (feeResult) {
                    charges = feeResult;
                }


                let checkMaxBooking = await knex('entity_bookings').where({ "entityId": pd.id, "entityType": 'facility_master', orgId: req.orgId })
                let sortBy = 0;
                if (checkMaxBooking.length) {
                    sortBy = checkMaxBooking.length;
                }



                return {
                    ...pd,
                    uploadedImages: imageResult,
                    uploadedIcons: iconResult,
                    todayTotalBooking,
                    charges,
                    sortBy
                }

            })

            res.status(200).json({
                data: {
                    facilityData: _.orderBy(resultData, 'sortBy', 'desc')
                },
                message: "Facility list successfully!"
            })

        } catch (err) {

            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });

        }

    },
    /*FACILITY DETAILS */
    userFacilityDetails: async (req, res) => {

        try {

            let resultData;
            let facilityCapacity;
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


            // Get Facility Quota By Facility Id

            let [facilityDetails,
                openingClosingDetail,
                ruleRegulationDetail,
                bookingCriteriaDetail,
                facilityImages,
                feeDetails,
                bookingLimits,
                bookingQuota
            ] = await Promise.all([

                await knex.from('facility_master')
                    .leftJoin('companies', 'facility_master.companyId', 'companies.id')
                    .leftJoin('projects', 'facility_master.projectId', 'projects.id')
                    .leftJoin('buildings_and_phases', 'facility_master.buildingPhaseId', 'buildings_and_phases.id')
                    .leftJoin('floor_and_zones', 'facility_master.floorZoneId', 'floor_and_zones.id')
                    .select([
                        'facility_master.*',
                        'companies.companyId as companyCode',
                        'companies.companyName',
                        'projects.project as projectCode',
                        'projects.projectName',
                        'buildings_and_phases.buildingPhaseCode',
                        'buildings_and_phases.description as buildingName',
                        'floor_and_zones.floorZoneCode',
                        'floor_and_zones.description as floorName',
                    ])
                    .where({ 'facility_master.id': payload.id }).first(),
                knex.from('entity_open_close_times').where({ entityId: payload.id, entityType: 'facility_master', orgId: req.orgId })
                ,
                knex.from('rules_and_regulations').where({ entityId: payload.id, entityType: 'facility_master', orgId: req.orgId })
                ,
                knex.from('entity_booking_criteria').where({ entityId: payload.id, entityType: 'facility_master', orgId: req.orgId }).first()
                ,
                knex.from('images').where({ entityId: payload.id, entityType: 'facility_master' }),
                knex('entity_fees_master').select(['feesType', 'feesAmount', 'duration']).where({ entityId: payload.id, entityType: 'facility_master', orgId: req.orgId }),
                knex('entity_booking_limit').select(['limitType', 'limitValue']).where({ entityId: payload.id, entityType: 'facility_master', orgId: req.orgId })
                ,
                knex('facility_property_unit_type_quota_limit')
                    .leftJoin('property_unit_type_master', 'facility_property_unit_type_quota_limit.propertyUnitTypeId', 'property_unit_type_master.id')
                    .select([
                        'facility_property_unit_type_quota_limit.*',
                        'property_unit_type_master.propertyUnitTypeCode',
                        'property_unit_type_master.descriptionEng',
                        'property_unit_type_master.descriptionThai',
                    ])
                    .where({
                        'facility_property_unit_type_quota_limit.entityId': payload.id, 'facility_property_unit_type_quota_limit.entityType': 'facility_master',
                        'facility_property_unit_type_quota_limit.orgId': req.orgId
                    })

            ])


            let iconResult = await knex.from('images').select('s3Url', 'title', 'name')
                .where({ "entityId": facilityDetails.facilityTypeId, "entityType": 'facility_type_icon' }).first();


            return res.status(200).json({

                facilityDetails: {
                    ...facilityDetails, openingClosingDetail: _.uniqBy(openingClosingDetail, 'day'), ruleRegulationDetail: ruleRegulationDetail,
                    bookingCriteriaDetail, facilityImages, feeDetails, bookingLimits: _.uniqBy(bookingLimits, 'limitType'), bookingQuota, iconResult
                },
                message: "Facility Details Successfully!"
            })

        } catch (err) {

            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    /*YOUR FACILITY BOOKING LIST */
    yourFacilityBookingList: async (req, res) => {

        try {

            let resultData;
            let id = req.me.id;
            let { listType } = req.body;
            let endTime = new Date().getTime();

            console.log("listType+++++++", listType);


            if (listType == "upcoming") {

                console.log("upcoming++++++++++++++++++++");

                resultData = await knex.from('entity_bookings')
                    .leftJoin('facility_master', 'entity_bookings.entityId', 'facility_master.id')
                    .leftJoin('companies', 'facility_master.companyId', 'companies.id')
                    .leftJoin('projects', 'facility_master.projectId', 'projects.id')
                    .leftJoin('buildings_and_phases', 'facility_master.buildingPhaseId', 'buildings_and_phases.id')
                    .leftJoin('floor_and_zones', 'facility_master.floorZoneId', 'floor_and_zones.id')
                    .leftJoin('entity_fees_master', 'facility_master.id', 'entity_fees_master.entityId')
                    .select([
                        'entity_bookings.*',
                        'facility_master.id as facilityId',
                        'facility_master.name as facilityName',
                        'facility_master.facilityTypeId',
                        'facility_master.enablePreCheckIn',
                        'facility_master.qrCode',
                        'companies.companyId as companyCode',
                        'companies.companyName',
                        'projects.project as projectCode',
                        'projects.projectName',
                        'buildings_and_phases.buildingPhaseCode',
                        'buildings_and_phases.description as buildingName',
                        'floor_and_zones.floorZoneCode',
                        'floor_and_zones.description as floorName',
                        'facility_master.isActive',
                        'facility_master.checkInType',
                        'facility_master.preCheckinTime',
                        'entity_fees_master.currency as currency'
                    ])
                    // .where(qb => {
                    //     if (listType) {

                    //         if (listType == "upcoming") {
                    //             qb.where('entity_bookings.bookingEndDateTime', '>=', endTime)
                    //         }

                    //         if (listType == "expired") {
                    //             qb.where('entity_bookings.bookingEndDateTime', '<=', endTime)
                    //         }
                    //     }
                    // })
                    .where('entity_bookings.bookingStartDateTime', '>=', endTime)
                    .where({ 'entity_bookings.entityType': 'facility_master', 'entity_bookings.orgId': req.orgId })
                    .where({ 'entity_bookings.bookedBy': id })
                    .orderBy('entity_bookings.bookingStartDateTime', 'asc')
            }

            if (listType == "expired") {

                console.log("expired++++++++++++++++++++");

                resultData = await knex.from('entity_bookings')
                    .leftJoin('facility_master', 'entity_bookings.entityId', 'facility_master.id')
                    .leftJoin('companies', 'facility_master.companyId', 'companies.id')
                    .leftJoin('projects', 'facility_master.projectId', 'projects.id')
                    .leftJoin('buildings_and_phases', 'facility_master.buildingPhaseId', 'buildings_and_phases.id')
                    .leftJoin('floor_and_zones', 'facility_master.floorZoneId', 'floor_and_zones.id')
                    .leftJoin('entity_fees_master', 'facility_master.id', 'entity_fees_master.entityId')
                    .select([
                        'entity_bookings.*',
                        'facility_master.id as facilityId',
                        'facility_master.facilityTypeId',
                        'facility_master.name as facilityName',
                        'companies.companyId as companyCode',
                        'companies.companyName',
                        'projects.project as projectCode',
                        'projects.projectName',
                        'buildings_and_phases.buildingPhaseCode',
                        'buildings_and_phases.description as buildingName',
                        'floor_and_zones.floorZoneCode',
                        'floor_and_zones.description as floorName',
                        'facility_master.isActive',
                        'entity_fees_master.currency as currency'
                    ])
                    // .where(qb => {
                    //     if (listType) {

                    //         if (listType == "upcoming") {
                    //             qb.where('entity_bookings.bookingEndDateTime', '>=', endTime)
                    //         }

                    //         if (listType == "expired") {
                    //             qb.where('entity_bookings.bookingEndDateTime', '<=', endTime)
                    //         }
                    //     }
                    // })
                    .where('entity_bookings.bookingEndDateTime', '<=', endTime)
                    .where({ 'entity_bookings.entityType': 'facility_master', 'entity_bookings.orgId': req.orgId })
                    .where({ 'entity_bookings.bookedBy': id })
                    .orderBy('entity_bookings.bookingEndDateTime', 'desc')

            }

            const Parallel = require('async-parallel');

            resultData = await Parallel.map(resultData, async pd => {
                let imageResult = await knex.from('images').select('s3Url', 'title', 'name')
                    .where({ "entityId": pd.facilityId, "entityType": 'facility_master', orgId: req.orgId })

                let iconResult = await knex.from('images').select('s3Url', 'title', 'name')
                    .where({ "entityId": pd.facilityTypeId, "entityType": 'facility_type_icon' }).first();

                return {
                    ...pd,
                    uploadedIcons: iconResult,
                    uploadedImages: imageResult
                }
            })

            return res.status(200).json({
                bookingData: resultData,
                message: "Your booking list successfully!"
            })


        } catch (err) {
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERRROR", message: err.message }]
            })
        }
    },
    /*FACILITY BOOK NOW */
    facilityBookNow: async (req, res) => {

        try {
            let id = req.me.id;
            let payload = req.body;
            let resultData;
            console.log("customerHouseInfo", req.me.houseIds);
            // let unitId = req.me.houseIds[0];
            let unitId;

            const schema = Joi.object().keys({
                facilityId: Joi.string().required(),
                bookingStartDateTime: Joi.date().required(),
                bookingEndDateTime: Joi.date().required(),
                noOfSeats: Joi.number().required(),
                unitId: Joi.string().required(),
                offset: Joi.number().required(),
                currentTime: Joi.date().required(),
                timezone: Joi.string().required(),
            })

            const result = Joi.validate(payload, schema);

            if (result && result.hasOwnProperty("error") && result.error) {
                return res.status(400).json({
                    errors: [
                        { code: "VALIDATION_ERROR", message: result.error.message }
                    ]
                });
            }

            // Get project id

            let facilityMaster = await knex('facility_master').select('projectId')
                .where({ id: payload.facilityId, orgId: req.orgId, isActive: true }).first();

            console.log("facilityBook", facilityMaster);

            if (!facilityMaster) {
                return res.status(400).json({
                    errors: [
                        { code: "NOT_FOUND", message: `Facility Closed.` }
                    ]
                });
            }


            // Get Facility Quota By Facility Id           

            unitId = payload.unitId;

            // Check booking Quota
            let checkFacilityQuota = await facilityHelper.getBookingQuota({ facilityId: payload.facilityId, bookingStartDateTime: payload.bookingStartDateTime, bookingEndDateTime: payload.bookingEndDateTime, offset: payload.offset, currentTime: payload.currentTime, timezone: payload.timezone, unitId: payload.unitId, orgId: req.orgId })
            console.log("checkFacilityQuota", checkFacilityQuota);

            if (checkFacilityQuota.code && checkFacilityQuota.message) {
                return res.status(400).json({
                    errors: [
                        { code: checkFacilityQuota.code, message: checkFacilityQuota.message }
                    ]
                });
            }



            if (checkFacilityQuota < 0 && !checkFacilityQuota.code) {
                return res.status(400).json({
                    errors: [
                        { code: "SLOT_BOOKED", message: `Slot is not available` }
                    ]
                });
            }

            // Check booking Capacity
            let checkFacilityCapacity = await facilityHelper.getBookingCapacity({ facilityId: payload.facilityId, bookingStartDateTime: payload.bookingStartDateTime, bookingEndDateTime: payload.bookingEndDateTime, offset: payload.offset, currentTime: payload.currentTime, timezone: payload.timezone, unitId: payload.unitId, orgId: req.orgId, noOfSeats: payload.noOfSeats })
            console.log("checkFacilityCapacity", checkFacilityCapacity);
            if (checkFacilityCapacity < 0) {
                return res.status(400).json({
                    errors: [
                        { code: "Quota_BOOKED", message: `Selected no. of Pax is not available in this slot.` }
                    ]
                });
            }

            // check facility is closed

            let closeFacility = await knex('facility_master')
                .select('inActiveReason')
                .where({ id: payload.facilityId, orgId: req.orgId, isActive: false })
                .first();

            console.log("closedFacility", closeFacility);
            if (closeFacility) {

                let closeReasonMessage = closeFacility.inActiveReason;

                return res.status(400).json({
                    errors: [
                        { code: "FACILITY_CLOSED_STATUS", message: `Facility is closed : Reason- ${closeReasonMessage}.` }
                    ]
                });
            }


            // check facility timing is closed

            let closeFacilityTiming = await knex('facility_close_date')
                .select('*')
                .where({ entityId: payload.facilityId, entityType: 'facility_master', orgId: req.orgId })
                .where('facility_close_date.endDate', '>', payload.bookingStartDateTime)
                .where('facility_close_date.startDate', '<', payload.bookingEndDateTime)
                .first();

            console.log("closeFacilityTiming", closeFacilityTiming);
            if (closeFacilityTiming) {

                let closeReason = await knex('facility_close_date')
                    .select('closeReason')
                    .where({ entityId: payload.facilityId, entityType: 'facility_master', orgId: req.orgId })
                    .first();

                let closeReasonMessage = closeReason.closeReason;

                return res.status(400).json({
                    errors: [
                        { code: "FACILITY_CLOSED", message: `Facility is closed for selected time slot : Reason- ${closeReasonMessage}.` }
                    ]
                });
            }


            checkQuotaByUnit = await knex('property_units').select('propertyUnitType').where({ id: unitId, orgId: req.orgId }).first();

            // Check concurrent booking for only flexible booking
            let bookingCriteria1 = await knex('entity_booking_criteria').select('*').where({ entityId: payload.facilityId, entityType: 'facility_master', orgId: req.orgId }).first();
            console.log("bookingCriteria", bookingCriteria1);
            let totalConcurrentLimit = bookingCriteria1.concurrentBookingLimit;
            let allowBookingSeat = 0;
            if (bookingCriteria1 && bookingCriteria1.bookingType == '1' && bookingCriteria1.allowConcurrentBooking == true) {   // Flexible Booking

                let bookingData = await knex('entity_bookings').count('* as totalBookedSeats')
                    .where('entity_bookings.bookingEndDateTime', '>', payload.bookingStartDateTime)
                    .where('entity_bookings.bookingStartDateTime', '<', payload.bookingEndDateTime)
                    .where({ 'entityId': payload.facilityId, 'isBookingCancelled': false, 'entityType': 'facility_master', 'orgId': req.orgId }).first();
                console.log("totalBookingSeats", bookingData);
                allowBookingSeat = Number(1) + Number(bookingData.totalBookedSeats);
                console.log("allowBookingSeat", allowBookingSeat);

                if (allowBookingSeat > totalConcurrentLimit) {
                    return res.status(400).json({
                        errors: [
                            { code: "ALREADY_SLOT_BOOKED", message: `You slot booking is overlapping, please try other timing slot.` }
                        ]
                    });
                }

            }

            // exit

            let facilityData = await knex.from('facility_master').where({ id: payload.facilityId }).first();


            let startTime = new Date(payload.bookingStartDateTime).getTime();
            let endTime = new Date(payload.bookingEndDateTime).getTime();

            let currentTime = new Date().getTime();

            let price = await knex.from('entity_fees_master').where({ entityId: payload.facilityId }).first();

            let facilitySlot = await knex.from('entity_booking_criteria').where({ entityId: payload.facilityId }).first();

            let totalFees = 0;

            if (price.feesType == '1') {
                totalFees = price.feesAmount * payload.noOfSeats;
            } else if (price.feesType == '2') {
                let calDuration = facilitySlot.slotDuration * price.feesAmount / price.duration;
                totalFees = calDuration * payload.noOfSeats;
            } else {
                totalFees = 0;
            }

            let confirmType;
            // Confirmed Status (1=>Auto Confirmed, 2=>Manually Confirmed)
            if (facilityData.bookingStatus == 1) {
                confirmedStatus = true;
                confirmType = 1;
            } else {
                confirmedStatus = false;
                confirmType = 0;
            }

            let insertData = {
                entityId: payload.facilityId,
                entityType: "facility_master",
                bookedAt: currentTime,
                bookedBy: id,
                noOfSeats: payload.noOfSeats,
                feesPaid: totalFees,
                bookingStartDateTime: startTime,
                bookingEndDateTime: endTime,
                createdAt: currentTime,
                updatedAt: currentTime,
                orgId: req.orgId,
                unitId: unitId,
                companyId: facilityData.companyId,
                isBookingConfirmed: confirmedStatus,
                confirmedType: confirmType
            }
            let insertResult = await knex('entity_bookings').insert(insertData).returning(['*']);
            resultData = insertResult[0];


            const user = await knex('users').select(['email', 'name']).where({ id: id }).first();


            if (facilityData.bookingStatus == "2") {

                let orgAdminResult = await knex('organisations').select('organisationAdminId').where({ id: req.orgId }).first();

                let adminEmail;
                if (orgAdminResult) {

                    let adminUser = await knex('users').select('email').where({ id: orgAdminResult.organisationAdminId }).first();
                    adminEmail = adminUser.email;

                }


                await emailHelper.sendTemplateEmail({ to: user.email, subject: 'Booking Approved Required', template: 'booking-confirmed-required.ejs', templateData: { fullName: user.name, bookingStartDateTime: moment(Number(resultData.bookingStartDateTime)).format('YYYY-MM-DD hh:mm A'), bookingEndDateTime: moment(+resultData.bookingEndDateTime).format('YYYY-MM-DD hh:mm A'), noOfSeats: resultData.noOfSeats, facilityName: facilityData.name } })

                await emailHelper.sendTemplateEmail({ to: adminEmail, subject: 'Booking Approved Required ', template: 'booking-confirmed-admin.ejs', templateData: { fullName: user.name, bookingStartDateTime: moment(Number(resultData.bookingStartDateTime)).format('YYYY-MM-DD hh:mm A'), bookingEndDateTime: moment(+resultData.bookingEndDateTime).format('YYYY-MM-DD hh:mm A'), noOfSeats: resultData.noOfSeats, facilityName: facilityData.name } })


            } else {


                await emailHelper.sendTemplateEmail({ to: user.email, subject: 'Booking Confirmed', template: 'booking-confirmed.ejs', templateData: { fullName: user.name, bookingStartDateTime: moment(Number(resultData.bookingStartDateTime)).format('YYYY-MM-DD hh:mm A'), bookingEndDateTime: moment(+resultData.bookingEndDateTime).format('YYYY-MM-DD hh:mm A'), noOfSeats: resultData.noOfSeats, facilityName: facilityData.name } })

            }
            let updateDisplayId = await knex('entity_bookings').update({ isActive: true }).where({ isActive: true });

            res.status(200).json({
                result: resultData,
                message: "Your facility booked successfully!"
            })


        } catch (err) {

            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERRROR", message: err.message }]
            })
        }
    },


    /* GET FACILITY AVAILABLE SEATS */
    getFacilityAvailableSeats: async (req, res) => {

        try {

            let id = req.me.id;
            let payload = req.body;
            console.log("customerHouseInfo", req.me.houseIds);
            let unitIds;
            let checkQuotaByUnit;
            let dailyQuota;
            let weeklyQuota;
            let monthlyQuota;

            const schema = Joi.object().keys({
                facilityId: Joi.string().required(),
                bookingStartDateTime: Joi.date().required(),
                bookingEndDateTime: Joi.date().required(),
                offset: Joi.number().required(),
                currentTime: Joi.date().required(),
                timezone: Joi.string().required(),
                unitId: Joi.string().required()
            })

            const result = Joi.validate(payload, schema);

            if (result && result.hasOwnProperty("error") && result.error) {
                return res.status(400).json({
                    errors: [
                        { code: "VALIDATION_ERROR", message: result.error.message }
                    ]
                });
            }

            // Start New Implementation 


            // Get project id

            let facilityMaster = await knex('facility_master').select('projectId')
                .where({ id: payload.facilityId, orgId: req.orgId, isActive: true }).first();
            console.log("facilityBook", facilityMaster);

            if (!facilityMaster) {
                return res.status(400).json({
                    errors: [
                        { code: "NOT_FOUND", message: `Facility Closed.` }
                    ]
                });
            }

            let getPropertyUnits = await knex('property_units').select('*')
                .where({ projectId: facilityMaster.projectId, orgId: req.orgId, id: payload.unitId })

            console.log("getPropertyUnits", getPropertyUnits);

            unitIds = getPropertyUnits[0].id//;
            // Case 2: If property unit does not have any property unit type set
            // Error : 
            console.log("getPropertyUnits[0].propertyUnitType", getPropertyUnits[0].propertyUnitType);

            if (getPropertyUnits[0].propertyUnitType == null) {
                return res.status(400).json({
                    errors: [
                        { code: "PROPERTY_UNIT_TYPE_STATUS", message: `Property unit type of one of your properties is not defined please contact admin.....` }
                    ]
                });
            }

            let getFacilityQuotaData = await knex('facility_property_unit_type_quota_limit').select('*').where({ entityId: payload.facilityId, entityType: 'facility_master', propertyUnitTypeId: getPropertyUnits[0].propertyUnitType, orgId: req.orgId });
            console.log("FacilityQuotaUnitWise", getFacilityQuotaData, getFacilityQuotaData.length);

            let facilityData = await knex.from('entity_booking_criteria')
                .select('entity_booking_criteria.concurrentBookingLimit')
                .where({ 'entity_booking_criteria.entityId': payload.facilityId, 'entity_booking_criteria.entityType': 'facility_master', 'entity_booking_criteria.orgId': req.orgId })
                .first();

            if (facilityData.concurrentBookingLimit == null || getFacilityQuotaData == '') {
                // Case 1 : concurrent booking is not defined and property unit type not set quota for this facility,  all quota type  will set as unlimited
                dailyQuota = 999999;
                monthlyQuota = 999999;
                weeklyQuota = 999999;
            } else {
                console.log("getFacilityQuotaData11111111111111", getFacilityQuotaData[0].daily)
                dailyQuota = getFacilityQuotaData[0].daily;
                weeklyQuota = getFacilityQuotaData[0].weekly;
                monthlyQuota = getFacilityQuotaData[0].monthly;
            }
            console.log("daily/monthly/weekly", dailyQuota, weeklyQuota, monthlyQuota);

            // checkQuotaByUnit = await knex('property_units').select('propertyUnitType').where({ id: getPropertyUnits[0].id, orgId: req.orgId }).first();


            // Get Facility Quota By Facility Id
            // let properUnitTypeMaster;
            // let getFacilityQuotaData = await knex('facility_property_unit_type_quota_limit').select('propertyUnitTypeId').where({ entityId: payload.facilityId, entityType: 'facility_master', orgId: req.orgId });
            // console.log("FacilityQuotaUnitWise", getFacilityQuotaData);

            // properUnitTypeMaster = getFacilityQuotaData.map(v => v.propertyUnitTypeId)//;

            // let getPropertyUnitMaster = await knex('property_units').select('id')
            //     .where({ orgId: req.orgId })
            //     .whereIn('propertyUnitType', properUnitTypeMaster);

            // let allProperUnitMaster = getPropertyUnitMaster.map(v => v.id)//;

            // console.log("allProperUnitMaster", allProperUnitMaster);

            // const compareData = arrayCompare(allProperUnitMaster, req.me.houseIds);

            // console.log("compare Property list", compareData);

            // compareData.found = compareData.found.map(a => a.a);
            // console.log("compare found", compareData.found);

            // let properUnitTypeIdFound;

            // if (compareData.found.length > 0) {
            //     properUnitTypeIdFound = compareData.found[0].toString();
            // }

            // console.log("found property unit id", properUnitTypeIdFound);

            // if (!properUnitTypeIdFound) {
            //     return res.status(400).json({
            //         errors: [
            //             { code: "PROPERTY_UNIT_TYPE_STATUS", message: `This facility's property unit  has missing property unit type , Please contact admin for further assistance.` }
            //         ]
            //     });
            // } else {
            //     unitIds = properUnitTypeIdFound;
            //     checkQuotaByUnit = await knex('property_units').select('propertyUnitType').where({ id: unitIds, orgId: req.orgId }).first();
            // }


            // Set timezone for moment
            moment.tz.setDefault(payload.timezone);
            let currentTime = moment();
            console.log('Current Time:', currentTime.format('MMMM Do YYYY, h:mm:ss a'));


            let bookingStartTime = moment(+payload.bookingStartDateTime).seconds(0).milliseconds(0).valueOf();
            let bookingEndTime = moment(+payload.bookingEndDateTime).seconds(0).milliseconds(0).valueOf();
            console.log('User Selected Booking Start/End Time: ', moment(bookingStartTime).format('YYYY-MM-DD HH:mm'), moment(bookingEndTime).format('YYYY-MM-DD HH:mm'));

            let bookingDay = moment(bookingStartTime).format('ddd');
            console.log('Checking Booking Availability of Day: ', bookingDay);

            let openCloseTimes = await knex.from('entity_open_close_times').where({
                entityId: payload.facilityId, entityType: 'facility_master', orgId: req.orgId,
                day: bookingDay
            }).first();
            console.log('openCloseTimes:', openCloseTimes);

            let bookingFullDay = moment(bookingStartTime).format('dddd');

            if (!openCloseTimes) {
                return res.status(400).json({
                    errors: [
                        { code: "BOOKING_CLOSED_FOR_THE_DAY", message: `Booking is not opened for selected day (${bookingFullDay}).` }
                    ]
                });
            }


            // Get Booking Daily,Monthly,Weekly Quota By UNIT
            // let getFacilityQuotaUnitWise = await knex('facility_property_unit_type_quota_limit').select('*').where({ entityId: payload.facilityId, entityType: 'facility_master', propertyUnitTypeId: checkQuotaByUnit.propertyUnitType, orgId: req.orgId }).first();
            // console.log("FacilityQuotaUnitWise", getFacilityQuotaUnitWise);



            // check facility is closed

            let closeFacility = await knex('facility_master')
                .select('inActiveReason')
                .where({ id: payload.facilityId, orgId: req.orgId, isActive: false })
                .first();

            console.log("closedFacility", closeFacility);
            if (closeFacility) {

                let closeReasonMessage = closeFacility.inActiveReason;

                return res.status(400).json({
                    errors: [
                        { code: "FACILITY_CLOSED_STATUS", message: `Facility is closed : Reason- ${closeReasonMessage}.` }
                    ]
                });
            }

            // check facility is closed

            let closeFacilityTiming = await knex('facility_close_date')
                .select('*')
                .where({ entityId: payload.facilityId, entityType: 'facility_master', orgId: req.orgId })
                .where('facility_close_date.endDate', '>', bookingStartTime)
                .where('facility_close_date.startDate', '<', bookingEndTime)
                .first();

            console.log("closeFacilityTiming", closeFacilityTiming);
            if (closeFacilityTiming) {

                let closeReason = await knex('facility_close_date')
                    .select('closeReason')
                    .where({ entityId: payload.facilityId, entityType: 'facility_master', orgId: req.orgId })
                    .first();

                let closeReasonMessage = closeReason.closeReason;

                return res.status(400).json({
                    errors: [
                        { code: "FACILITY_CLOSED", message: `Facility is closed for selected time slot : Reason- ${closeReasonMessage}.` }
                    ]
                });
            }


            let bookingCriteria = await knex('entity_booking_criteria').select('*').where({ entityId: payload.facilityId, entityType: 'facility_master', orgId: req.orgId }).first();
            console.log("bookingCriteria", bookingCriteria);

            if (bookingCriteria && bookingCriteria.bookingType == '1') {   // Flexible Booking

                if (bookingEndTime <= bookingStartTime) {
                    return res.status(400).json({
                        errors: [
                            { code: "INVALID_DATE_TIME_SELECTION", message: `Booking end time should be greater than start time. Please correct!` }
                        ]
                    });
                }

                let openingTimeOnBookingDay = moment(bookingStartTime).hours(moment(+openCloseTimes.openTime).hours())
                    .minutes(moment(+openCloseTimes.openTime).minutes()).seconds(0).milliseconds(0);


                let closingTimeOnBookingDay = moment(bookingStartTime).hours(moment(+openCloseTimes.closeTime).hours())
                    .minutes(moment(+openCloseTimes.closeTime).minutes()).seconds(0).milliseconds(0);

                console.log('openingTimeOnBookingDay:', openingTimeOnBookingDay.format('YYYY-MM-DD HH:mm:ss'));
                console.log('closingTimeOnBookingDay:', closingTimeOnBookingDay.format('YYYY-MM-DD HH:mm:ss'));


                if (openingTimeOnBookingDay.valueOf() > moment(bookingStartTime).valueOf()) {
                    return res.status(400).json({
                        errors: [
                            { code: "INVALID_DATE_TIME_SELECTION", message: `Please select booking start and end time b/w opening and closing hours for the day.` }
                        ]
                    });
                }


                if (closingTimeOnBookingDay.valueOf() < moment(bookingEndTime).valueOf()) {
                    return res.status(400).json({
                        errors: [
                            { code: "INVALID_DATE_TIME_SELECTION", message: `Please select booking start and end time b/w opening and closing hours for the day.` }
                        ]
                    });
                }

                let bookingPeriodAllow = await knex('entity_booking_criteria').select(['maxBookingPeriod', 'minBookingPeriod']).where({ entityId: payload.facilityId, bookingType: 1, entityType: 'facility_master', orgId: req.orgId }).first();
                console.log("maxBookingPeriodAllow", bookingPeriodAllow);
                let maxDuration;
                let minDuration;

                if (bookingPeriodAllow && bookingPeriodAllow.maxBookingPeriod) {
                    maxDuration = moment(+payload.bookingEndDateTime) - moment(+payload.bookingStartDateTime);
                    let maxDurationInMinutes = maxDuration / 1000 / 60;
                    console.log("maxDuration", maxDurationInMinutes);

                    if (maxDurationInMinutes > bookingPeriodAllow.maxBookingPeriod) {
                        return res.status(400).json({
                            errors: [
                                { code: "MAX_BOOKING_DURATION", message: `Maximum booking duration allowed is ${bookingPeriodAllow.maxBookingPeriod} minutes. You can not book more then max duration.` }
                            ]
                        });
                    }
                }

                if (bookingPeriodAllow && bookingPeriodAllow.minBookingPeriod) {
                    minDuration = moment(+payload.bookingEndDateTime) - moment(+payload.bookingStartDateTime);
                    let minDurationInMinutes = minDuration / 1000 / 60;
                    console.log("minDuration", minDurationInMinutes);

                    if (minDurationInMinutes < bookingPeriodAllow.minBookingPeriod) {
                        return res.status(400).json({
                            errors: [
                                { code: "MIN_BOOKING_DURATION", message: `Minimum booking duration allowed is ${bookingPeriodAllow.minBookingPeriod} minutes. You can not book less then min duration.` }
                            ]
                        });
                    }
                }

            }


            // Allow Advance Time Backup

            // if (bookingAllowingTiming && bookingAllowingTiming.bookingAllowedAdvanceTime) {

            //     console.log('Advance Allow Time:', moment(currentTime).add(+bookingAllowingTiming.bookingAllowedAdvanceTime, 'minutes').format('MMMM Do YYYY, h:mm:ss a'));

            //     let isValidBookingInsideAllowPeriod = moment(currentTime).add(+bookingAllowingTiming.bookingAllowedAdvanceTime, 'minutes') > moment(bookingStartTime);

            //     console.log("isValidBookingInsideAllowPeriod", isValidBookingInsideAllowPeriod);


            //     if (!isValidBookingInsideAllowPeriod) {

            //         let advanceString = bookingAllowingTiming.bookingAllowedAdvanceTime;
            //         if (parseInt(advanceString / 24 / 60) > 0) {
            //             advanceString = parseInt(advanceString / 24 / 60) + " days, " + parseInt(advanceString / 60 % 24) + ' hours, ' + parseInt(advanceString % 60) + ' minutes';
            //         } else {
            //             advanceString = parseInt(advanceString / 60 % 24) + ' hours, ' + parseInt(advanceString % 60) + ' minutes';
            //         }

            //         return res.status(400).json({
            //             errors: [
            //                 { code: "ADVANCED_BOOKING_ALLOW_DURATION", message: `Advance booking upto ${advanceString} is allowed only.` }
            //             ]
            //         });
            //     }
            // }

            // Close Advance Time Backup
            // if (bookingAllowingTiming && bookingAllowingTiming.bookingCloseAdvanceTime) {

            //     console.log('Advance Booking Close Time:', moment(currentTime).add(+bookingAllowingTiming.bookingCloseAdvanceTime, 'minutes').format('MMMM Do YYYY, h:mm:ss a'));


            //     let isValidBookingBeforeLockPeriod = moment(currentTime).add(+bookingAllowingTiming.bookingCloseAdvanceTime, 'minutes') < moment(bookingStartTime);

            //     console.log("isValidBookingBeforeLockPeriod", isValidBookingBeforeLockPeriod);

            //     if (!isValidBookingBeforeLockPeriod) {
            //         return res.status(400).json({
            //             errors: [
            //                 { code: "ADVANCED_BOOKING_LOCK_DURATION", message: `Booking needs to be made before ${bookingAllowingTiming.bookingCloseAdvanceTime} minutes of booking start period.` }
            //             ]
            //         });
            //     }
            // }

            let bookingAllowingTiming = await knex('entity_booking_criteria').select(['bookingAllowedAdvanceTime', 'bookingCloseAdvanceTime']).where({ entityId: payload.facilityId, entityType: 'facility_master', orgId: req.orgId }).first();

            console.log('Booking Start Time:', moment(bookingStartTime).format('MMMM Do YYYY, h:mm:ss a'));
            console.log('bookingAllowingTiming', bookingAllowingTiming);

            if (bookingAllowingTiming && bookingAllowingTiming.bookingCloseAdvanceTime) {

                console.log('Advance Allow Time:', moment(currentTime).add(+bookingAllowingTiming.bookingCloseAdvanceTime, 'minutes').format('MMMM Do YYYY, h:mm:ss a'));

                let isValidBookingInsideAllowPeriod = moment(currentTime).add(+bookingAllowingTiming.bookingCloseAdvanceTime, 'minutes') > moment(bookingStartTime);

                console.log("isValidBookingInsideAllowPeriod", isValidBookingInsideAllowPeriod);


                if (!isValidBookingInsideAllowPeriod) {

                    let advanceString = bookingAllowingTiming.bookingCloseAdvanceTime;
                    if (parseInt(advanceString / 24 / 60) > 0) {
                        //  advanceString = parseInt(advanceString / 24 / 60) + " days, " + parseInt(advanceString / 60 % 24) + ' hours, ' + parseInt(advanceString % 60) + ' minutes';
                        advanceString = parseInt(advanceString / 24 / 60) + " days";

                    } else {
                        advanceString = parseInt(advanceString / 60 % 24) + ' hours, ' + parseInt(advanceString % 60) + ' minutes';
                    }

                    return res.status(400).json({
                        errors: [
                            { code: "ADVANCED_BOOKING_ALLOW_DURATION", message: `Advance booking upto ${advanceString} is allowed only.` }
                        ]
                    });
                }
            }

            if (bookingAllowingTiming && bookingAllowingTiming.bookingAllowedAdvanceTime) {

                console.log('Advance Booking Close Time:', moment(currentTime).add(+bookingAllowingTiming.bookingAllowedAdvanceTime, 'minutes').format('MMMM Do YYYY, h:mm:ss a'));


                let isValidBookingBeforeLockPeriod = moment(currentTime).add(+bookingAllowingTiming.bookingAllowedAdvanceTime, 'minutes') < moment(bookingStartTime);

                console.log("isValidBookingBeforeLockPeriod", isValidBookingBeforeLockPeriod);

                if (!isValidBookingBeforeLockPeriod) {
                    return res.status(400).json({
                        errors: [
                            { code: "ADVANCED_BOOKING_LOCK_DURATION", message: `Booking needs to be made before ${bookingAllowingTiming.bookingAllowedAdvanceTime} minutes of booking start period.` }
                        ]
                    });
                }
            }


            // Validate Daily Quota Limit, Weekly Quota Limit, And Monthly Quota Limit
            //let dailyQuota = await knex('entity_booking_limit').select(['limitType', 'limitValue']).where({ entityId: payload.facilityId, limitType: 1, entityType: 'facility_master', orgId: req.orgId }).first();

            let quotaBooked = 0;

            if (dailyQuota && dailyQuota > 0) {
                let dailyQuotas = Number(dailyQuota);
                console.log("dailyQuota", dailyQuota);
                let startOfDay = moment(+payload.bookingStartDateTime).startOf('day').valueOf();
                let endOfDay = moment(+payload.bookingStartDateTime).endOf('day').valueOf();
                console.log("startOfDay", startOfDay, endOfDay);

                let rawQuery = await knex.raw(`select count(*) AS totalSeats from entity_bookings where "entityId"  = ${payload.facilityId}  and  "bookingStartDateTime" >= ${startOfDay}  and "bookingEndDateTime"  <= ${endOfDay} and "isBookingCancelled" = false  and "unitId" = ${unitIds} `);
                let totalBookedSeatForADay = rawQuery.rows[0].totalseats;
                console.log("total Bookings Done for a day", totalBookedSeatForADay);
                quotaBooked = dailyQuota;
                // Checking Daily Booking Quota Limit Is Completed
                if (dailyQuotas <= totalBookedSeatForADay) {
                    return res.status(400).json({
                        errors: [
                            { code: "DAILY_QUOTA_EXCEEDED", message: `Your daily quota of ${dailyQuota} seat bookings is full. You can not book any more seats today.` }
                        ]
                    });
                }

                // if (dailyQuota <= totalBookedSeatForADay) {
                //     return res.status(400).json({
                //         errors: [
                //             { code: "DAILY_QUOTA_EXCEEDED", message: `Your daily quota of ${dailyQuota} seat bookings is full. You can not book any more seats today.` }
                //         ]
                //     });
                // }
            }

            //let weeklyQuota = await knex('entity_booking_limit').select(['limitType', 'limitValue']).where({ entityId: payload.facilityId, limitType: 2, entityType: 'facility_master', orgId: req.orgId }).first();
            if (weeklyQuota && weeklyQuota > 0) {
                let weeklyQuotas = Number(weeklyQuota);
                let startOfWeek = moment(+payload.bookingStartDateTime).startOf('week').valueOf();
                let endOfWeek = moment(+payload.bookingStartDateTime).endOf('week').valueOf();
                console.log("startOfWeek", startOfWeek, endOfWeek);
                console.log("weeklyQuota", weeklyQuota);
                let rawQuery = await knex.raw(`select count(*) AS totalSeats from entity_bookings where "entityId"  = ${payload.facilityId}  and  "bookingStartDateTime" >= ${startOfWeek}  and "bookingEndDateTime"  <= ${endOfWeek} and "isBookingCancelled" = false  and "unitId" = ${unitIds} `);
                let totalBookedSeatForAWeek = rawQuery.rows[0].totalseats;
                console.log("total Bookings Done for a week", totalBookedSeatForAWeek);
                quotaBooked = weeklyQuota;
                // Checking Weekly Booking Quota Limit Is Completed
                if (weeklyQuotas <= totalBookedSeatForAWeek) {
                    return res.status(400).json({
                        errors: [
                            { code: "WEEKLY_QUOTA_EXCEEDED", message: `Your weekly quota of ${weeklyQuota} seat bookings is full. You can not book any more seats in this week.` }
                        ]
                    });
                }

                // if (weeklyQuota <= totalBookedSeatForAWeek) {
                //     return res.status(400).json({
                //         errors: [
                //             { code: "WEEKLY_QUOTA_EXCEEDED", message: `Your weekly quota of ${weeklyQuota} seat bookings is full. You can not book any more seats in this week.` }
                //         ]
                //     });
                // }
            }

            // let monthlyQuota = await knex('entity_booking_limit').select(['limitType', 'limitValue']).where({ entityId: payload.facilityId, limitType: 3, entityType: 'facility_master', orgId: req.orgId }).first();

            if (monthlyQuota && monthlyQuota > 0) {
                let monthlyQuotas = Number(monthlyQuota);
                console.log("monthlyQuota", monthlyQuotas);

                let startOfMonth = moment(+payload.bookingStartDateTime).startOf('month').valueOf();
                let endOfMonth = moment(+payload.bookingStartDateTime).endOf('month').valueOf();
                console.log("startOfMonth", startOfMonth, endOfMonth);

                let rawQuery = await knex.raw(`select count(*) AS totalSeats from entity_bookings where "entityId"  = ${payload.facilityId}  and  "bookingStartDateTime" >= ${startOfMonth}  and "bookingEndDateTime"  <= ${endOfMonth} and "isBookingCancelled" = false and "unitId" = ${unitIds} `);
                let totalBookedSeatForAMonth = rawQuery.rows[0].totalseats;
                console.log("total Bookings Done for a month", totalBookedSeatForAMonth);
                quotaBooked = monthlyQuota;
                // Checking Monthly Booking Quota Limit Is Completed
                if (monthlyQuotas <= totalBookedSeatForAMonth) {
                    return res.status(400).json({
                        errors: [
                            { code: "MONTHLY_QUOTA_EXCEEDED", message: `Your monthly quota of ${monthlyQuota} seat bookings is full. You can not book any more seats in this month.` }
                        ]
                    });
                }
                // if (monthlyQuota <= totalBookedSeatForAMonth) {
                //     return res.status(400).json({
                //         errors: [
                //             { code: "MONTHLY_QUOTA_EXCEEDED", message: `Your monthly quota of ${monthlyQuota} seat bookings is full. You can not book any more seats in this month.` }
                //         ]
                //     });
                // }
            }


            let availableSeats = 0;

            // let startOfDay = moment(+payload.bookingStartDateTime).startOf('day').valueOf();
            // let endOfDay = moment(+payload.bookingStartDateTime).endOf('day').valueOf();

            // let bookingData = await knex('entity_bookings').sum('noOfSeats as totalBookedSeats')
            //     .where('entity_bookings.bookingStartDateTime', '>=', startOfDay)
            //     .where('entity_bookings.bookingEndDateTime', '<=', endOfDay)
            //     .where({ 'entityId': payload.facilityId, 'isBookingCancelled': false, 'entityType': 'facility_master', 'orgId': req.orgId }).first();

            let bookingData = await knex('entity_bookings').sum('noOfSeats as totalBookedSeats')
                .where('entity_bookings.bookingEndDateTime', '>', bookingStartTime)
                .where('entity_bookings.bookingStartDateTime', '<', bookingEndTime)
                .where({ 'entityId': payload.facilityId, 'entityType': 'facility_master', 'isBookingCancelled': false, 'orgId': req.orgId }).first();
            console.log("totalBookingSeats/bookingData", bookingData);

            // let bookingData = await knex('entity_bookings').sum('noOfSeats as totalBookedSeats')
            //     .where('entity_bookings.bookingStartDateTime', '>=', bookingStartTime)
            //     .where('entity_bookings.bookingStartDateTime', '<=', bookingEndTime)
            //     .where({ 'entityId': payload.facilityId, 'entityType': 'facility_master', 'isBookingCancelled': false, 'orgId': req.orgId }).first();


            let facilityDatas = await knex.from('facility_master')
                .leftJoin('entity_booking_criteria', 'facility_master.id', 'entity_booking_criteria.entityId')
                .select([
                    'facility_master.id',
                    'facility_master.name',
                    'facility_master.multipleSeatsLimit',
                    'entity_booking_criteria.minBookingPeriod',
                    'entity_booking_criteria.maxBookingPeriod',
                    'entity_booking_criteria.bookingAllowedAdvanceTime',
                    'entity_booking_criteria.bookingCloseAdvanceTime',
                    'entity_booking_criteria.allowConcurrentBooking',
                    'entity_booking_criteria.concurrentBookingLimit',
                ])
                .where({ 'facility_master.id': payload.facilityId, 'facility_master.orgId': req.orgId })
                .first();

            // Check if pax capacity disable and set NO
            if (facilityDatas.allowConcurrentBooking == true) {
                availableSeats = Number(facilityDatas.concurrentBookingLimit) - Number(bookingData.totalBookedSeats);
            } else if (facilityDatas.allowConcurrentBooking == false && facilityDatas.concurrentBookingLimit == 0) {
                availableSeats = Number(5000);
            } else if (facilityDatas.allowConcurrentBooking == false && facilityDatas.concurrentBookingLimit != 0) {
                availableSeats = Number(facilityDatas.concurrentBookingLimit) - Number(bookingData.totalBookedSeats);
            }


            console.log("totalSeatAvailable", facilityDatas.concurrentBookingLimit, bookingData.totalBookedSeats)
            console.log("availableSeats", availableSeats);

            // let AllQuotaData = await knex('facility_property_unit_type_quota_limit')
            //     .where({ 'entityId': payload.facilityId, 'entityType': 'facility_master', propertyUnitTypeId: checkQuotaByUnit.propertyUnitType, orgId: req.orgId }).first();


            let startOf;
            let endOf;
            let dailyLimit = 0;
            let weeklyLimit = 0;
            let monthlyLimit = 0;
            let dailyRemainingLimit = 0;
            let dailyBookedSeat = 0;
            let weeklyRemainingLimit = 0;
            let weeklyBookedSeat = 0;
            let monthlyRemainingLimit = 0;
            let monthlyBookedSeat = 0;


            if (dailyQuota && dailyQuota > 0) {
                startOf = moment(+payload.bookingStartDateTime).startOf('day').valueOf();
                endOf = moment(+payload.bookingStartDateTime).endOf('day').valueOf();

                let rawQuery = await knex.raw(`select count(*) AS totalSeats from entity_bookings where "entityId"  = ${payload.facilityId}  and  "bookingStartDateTime" >= ${startOf}  and "bookingEndDateTime"  <= ${endOf} and "isBookingCancelled" = false and "unitId" = ${unitIds} `);
                console.log("totalBookedSeats", rawQuery.rows);
                let totalBookedSeat = rawQuery.rows[0].totalseats;

                dailyLimit = dailyQuota;
                dailyRemainingLimit = dailyQuota - totalBookedSeat;
                dailyBookedSeat = totalBookedSeat;
            }

            if (weeklyQuota && weeklyQuota > 0) {
                startOf = moment(+payload.bookingStartDateTime).startOf('week').valueOf();
                endOf = moment(+payload.bookingStartDateTime).endOf('week').valueOf();

                let rawQuery = await knex.raw(`select count(*) AS totalSeats from entity_bookings where "entityId"  = ${payload.facilityId}  and  "bookingStartDateTime" >= ${startOf}  and "bookingEndDateTime"  <= ${endOf}  and "isBookingCancelled" = false and "unitId" = ${unitIds} `);
                console.log("totalBookedSeats", rawQuery.rows);
                let totalBookedSeat = rawQuery.rows[0].totalseats;

                weeklyLimit = weeklyQuota;
                weeklyRemainingLimit = weeklyQuota - totalBookedSeat;
                weeklyBookedSeat = totalBookedSeat;
            }

            if (monthlyQuota && monthlyQuota > 0) {
                startOf = moment(+payload.bookingStartDateTime).startOf('month').valueOf();
                endOf = moment(+payload.bookingStartDateTime).endOf('month').valueOf();

                let rawQuery = await knex.raw(`select count(*) AS totalSeats from entity_bookings where "entityId"  = ${payload.facilityId}  and  "bookingStartDateTime" >= ${startOf}  and "bookingEndDateTime"  <= ${endOf} and  "isBookingCancelled" = false and "unitId" = ${unitIds} `);
                console.log("totalBookedSeats", rawQuery.rows);
                let totalBookedSeat = rawQuery.rows[0].totalseats;

                monthlyLimit = monthlyQuota;
                monthlyRemainingLimit = monthlyQuota - totalBookedSeat;
                monthlyBookedSeat = totalBookedSeat;
            }

            let remainingLimit = {
                'daily': Number(dailyLimit),
                'dailyRemaining': Number(dailyRemainingLimit),
                'dailyBookedSeats': Number(dailyBookedSeat),
                'weekly': Number(weeklyLimit),
                'weeklyRemaining': Number(weeklyRemainingLimit),
                'weeklyBookedSeats': Number(weeklyBookedSeat),
                'monthly': Number(monthlyLimit),
                'monthlyRemaining': Number(monthlyRemainingLimit),
                'monthlyBookedSeats': Number(monthlyBookedSeat)
            };
            //let bookedSeat = totalBookedSeat;

            let QuotaData = {
                remainingLimit
            };

            console.log("quota", QuotaData);

            // let QuotaData = await knex('entity_booking_limit')
            //     .where({ 'entityId': payload.facilityId, 'entityType': 'facility_master', orgId: req.orgId })
            //     .orderBy('limitType');


            // const Parallel = require('async-parallel');
            // let startOf;
            // let endOf;
            // QuotaData = await Parallel.map(QuotaData, async item => {

            //     if (item.limitType == 1) {
            //         startOf = moment(+payload.bookingStartDateTime).startOf('day').valueOf();
            //         endOf = moment(+payload.bookingStartDateTime).endOf('day').valueOf();
            //     }

            //     if (item.limitType == 2) {
            //         startOf = moment(+payload.bookingStartDateTime).startOf('week').valueOf();
            //         endOf = moment(+payload.bookingStartDateTime).endOf('week').valueOf();
            //     }

            //     if (item.limitType == 3) {
            //         startOf = moment(+payload.bookingStartDateTime).startOf('month').valueOf();
            //         endOf = moment(+payload.bookingStartDateTime).endOf('month').valueOf();
            //     }


            //     let rawQuery = await knex.raw(`select COALESCE(SUM("noOfSeats"),0) AS totalSeats from entity_bookings where "entityId"  = ${payload.facilityId}  and  "bookingStartDateTime" >= ${startOf}  and "bookingEndDateTime"  <= ${endOf} and "isBookingConfirmed" = true and "isBookingCancelled" = false and "unitId" = ${unitIds}`);
            //     console.log("totalBookedSeats", rawQuery.rows);
            //     let totalBookedSeat = rawQuery.rows[0].totalseats;

            //     console.log("totalSeats", item.limitValue);

            //     let id = item.limitType;

            //     let remainingLimit = item.limitValue - totalBookedSeat;
            //     let bookedSeat = totalBookedSeat;

            //     return {
            //         ...item,
            //         remaining: Number(remainingLimit),
            //         bookedSeats: Number(bookedSeat)
            //     };
            // })


            return res.status(200).json({
                data: {
                    facility: { ...facilityData, availableSeats, userQuota: QuotaData }
                },
                message: "Facility Data successfully!"
            })


        } catch (err) {

            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            })

        }
    },



    /* User Can Cancel booking facility */
    cancelBooking: async (req, res) => {
        try {
            const { bookingId, cancellationReason } = req.body;
            const currentTime = new Date().getTime()
            const cancelled = await knex('entity_bookings').update({ cancellationReason, cancelledAt: currentTime, cancelledBy: req.me.id, isBookingCancelled: true, isBookingConfirmed: false }).where({ id: bookingId }).returning(['*'])
            const bookedByUser = await knex('entity_bookings').select('*').where({ id: bookingId }).first()
            const user = await knex('users').select(['email', 'name']).where({ id: bookedByUser.bookedBy }).first()
            await emailHelper.sendTemplateEmail({ to: user.email, subject: 'Booking Cancelled', template: 'booking-cancelled.ejs', templateData: { fullName: user.name, reason: cancellationReason, bookingStartDateTime: moment(Number(bookedByUser.bookingStartDateTime)).format('YYYY-MM-DD hh:mm A'), bookingEndDateTime: moment(+bookedByUser.bookingEndDateTime).format('YYYY-MM-DD hh:mm A'), noOfSeats: bookedByUser.noOfSeats } })
            return res.status(200).json({ message: 'cancelled!', data: cancelled })
        } catch (err) {
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            })
        }
    },

    // Get All Login User Unit List
    getUnitList: async (req, res) => {
        try {
            let id = req.me.id;
            const { facilityId } = req.body;
            console.log("customerHouseInfo", req.me.houseIds);

            let facilityData = await knex.from('facility_master').where({ id: facilityId }).first();

            let getPropertyUnits = await knex('property_units').select('*')
                .where({ projectId: facilityData.projectId, orgId: req.orgId })
                .whereIn('id', req.me.houseIds);

            return res.status(200).json({
                data: {
                    propertyData: getPropertyUnits
                }
            })

        } catch (err) {
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            })
        }
    },

    // Get All Login User Unit List
    getAllUnitList: async (req, res) => {
        try {
            let id = req.me.id;
            const { facilityId } = req.body;
            console.log("customerHouseInfo", req.me.houseIds);

            let facilityData = await knex.from('facility_master').where({ id: facilityId }).first();

            let getPropertyUnits = await knex('property_units').select('*')
                .where({ projectId: facilityData.projectId, orgId: req.orgId })

            return res.status(200).json({
                data: {
                    propertyData: getPropertyUnits
                }
            })

        } catch (err) {
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            })
        }
    },
    checkInFacility: async (req, res) => {
        try {
            orgId = req.orgId
            let bookingId = req.body.bookingId
            const currentTime = new Date().getTime()

            let updateData = {
                checkedInAt: currentTime,
                isCheckedIn: true,

            }

            let result = await knex("entity_bookings")
                .update(updateData)
                .returning(["*"])
                .where({ id: bookingId, orgId: orgId, isBookingConfirmed: true })

            return res
                .status(200)
                .json({ message: "Checked In!", data: result });

        } catch (err) {
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERRROR", message: err.message }],
            });
        }
    }

}



module.exports = facilityBookingController;