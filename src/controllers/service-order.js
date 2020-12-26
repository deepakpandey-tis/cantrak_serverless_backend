const Joi = require('@hapi/joi');
const _ = require('lodash');
const moment = require("moment")

const knex = require('../db/knex');
const XLSX = require('xlsx');


const serviceRequestNotification = require('../notifications/service-request/approval-notification');



const serviceOrderController = {
    addServiceOrder: async (req, res) => {
        try {

            let serviceOrder = null;
            let images = null
            let serviceOrderPayload = req.body;
            let assignedServiceTeamSR;
            let assignedServiceAdditionalUsers;

            await knex.transaction(async trx => {
                let ALLOWED_CHANNELS = ['IN_APP', 'EMAIL', 'WEB_PUSH', 'SOCKET_NOTIFY', 'LINE_NOTIFY'];

                images = req.body.images
                let serviceRequestId = req.body.serviceRequestId
                await knex('service_requests').update({ serviceStatusCode: 'A' }).where({ id: serviceRequestId })
                let serviceRequest = { id: req.body.serviceRequestId };
                serviceOrderPayload = _.omit(serviceOrderPayload, ['serviceRequest', 'teamId', 'mainUserId', 'additionalUsers', 'images'])

                const schema = Joi.object().keys({
                    serviceRequestId: Joi.number().required(),
                    orderDueDate: Joi.date().allow("").optional()
                })

                let result = Joi.validate(serviceOrderPayload, schema);
                console.log('[controllers][serviceOrder][addServiceOrder]: JOi Result', result);

                if (result && result.hasOwnProperty('error') && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: result.error.message }
                        ],
                    });
                }



                let currentTime = new Date().getTime();
                let newDueDate;
                if (serviceOrderPayload.orderDueDate) {
                    newDueDate = new Date(serviceOrderPayload.orderDueDate).getTime();
                } else {
                    newDueDate = new Date().getTime();
                }

                let propertyUnit = await knex
                    .select(['companyId'])
                    .where({ id: serviceOrderPayload.serviceRequestId })
                    .into("service_requests").first();

                // Insert into service_orders

                let inserServiceOrderPayload = {
                    ...serviceOrderPayload,
                    orderDueDate: newDueDate,
                    companyId: propertyUnit.companyId,
                    createdAt: currentTime,
                    updatedAt: currentTime,
                    orgId: req.orgId
                };

                let serviceOrderResults = await knex.insert(inserServiceOrderPayload).returning(['*']).transacting(trx).into('service_orders')
                serviceOrder = serviceOrderResults[0]

                // if new service request id that means direct serviceOrder


                let currentUser = req.me;

                if (currentUser && currentUser.roles && currentUser.roles.includes("admin") || currentUser.roles.includes("superAdmin")) {
                    // i am admin i can overwrite things here
                    let serviceRequestPayload = req.body.serviceRequest;
                    let serviceRequestId = req.body.serviceRequestId;

                    const schema = Joi.object().keys({
                        serviceRequestId: Joi.number().required(),
                        description: Joi.string().required(),
                        requestFor: Joi.string().required(),
                        houseId: Joi.string().required(),
                        commonId: Joi.string().required(),
                        serviceType: Joi.string().required(),
                        requestedBy: Joi.string().required(),
                        priority: Joi.string().required(),
                        location: Joi.string().required()
                    });

                    const result = Joi.validate({ serviceRequestId, ...serviceRequestPayload }, schema);
                    console.log('[controllers][service][request]: JOi Result', result);

                    if (result && result.hasOwnProperty('error') && result.error) {
                        return res.status(400).json({
                            errors: [
                                { code: 'VALIDATION_ERROR', message: result.error.message }
                            ],
                        });
                    }

                    // Insert in service_requests table,
                    const currentTime = new Date().getTime();

                    const updateServiceReq = await knex.update({ description: serviceRequestPayload.description, requestFor: serviceRequestPayload.requestFor, houseId: serviceRequestPayload.houseId, commonId: serviceRequestPayload.commonId, serviceType: serviceRequestPayload.serviceType, requestedBy: serviceRequestPayload.requestedBy, priority: serviceRequestPayload.priority, location: serviceRequestPayload.location, updatedAt: currentTime, isActive: true, moderationStatus: true, serviceStatusCode: "O" }).where({ id: serviceRequestId }).returning(['*']).transacting(trx).into('service_requests');

                    console.log('[controllers][service][request]: Update Data', updateServiceReq);

                    serviceRequest = updateServiceReq[0];
                }


                if (images && images.length) {
                    images = req.body.images.map(image => ({ ...image, createdAt: currentTime, updatedAt: currentTime, entityId: serviceOrder.id, entityType: 'service_orders', orgId: req.orgId }));
                    let addedImages = await knex.insert(images).returning(['*']).transacting(trx).into('images')
                    images = addedImages
                }

                // Insert into assigned_service_team table
                let { teamId, mainUserId, additionalUsers } = req.body;
                assignedServiceAdditionalUsers = additionalUsers

                //Service Order Team Management
                const assignedServiceTeamPayload = { teamId, userId: mainUserId, entityId: serviceOrder.id, entityType: 'service_orders', createdAt: currentTime, updatedAt: currentTime, orgId: req.orgId }
                let assignedServiceTeamResult = await knex.insert(assignedServiceTeamPayload).returning(['*']).transacting(trx).into('assigned_service_team')
                let assignedServiceTeam = assignedServiceTeamResult[0]
                //Service Order Team Management End

                // Service Request Team Management
                const assignedServiceTeamPayloadSR = { teamId, userId: mainUserId, entityId: serviceRequestId, entityType: 'service_requests', createdAt: currentTime, updatedAt: currentTime, orgId: req.orgId }
                let assignedServiceTeamResultSR = await knex.insert(assignedServiceTeamPayloadSR).returning(['*']).transacting(trx).into('assigned_service_team')
                assignedServiceTeamSR = assignedServiceTeamResultSR[0]
                //Service Request Team Management End


                // Send Notifications to Main User

                // Adding Notification in service request approval 

                let sender = await knex.from('users').where({ id: req.me.id }).first();
                let receiver = await knex.from('users').where({ id: mainUserId }).first();

                console.log("requested mainUserId id for notification", mainUserId);

                //  console.log("receiver tenant",receiver)

                let dataNos = {
                    payload: {}
                };

                await serviceRequestNotification.send(sender, receiver, dataNos, ALLOWED_CHANNELS);

                if (assignedServiceAdditionalUsers && assignedServiceAdditionalUsers.length) {
                    for (user of assignedServiceAdditionalUsers) {
                        await knex
                            .insert({
                                userId: user,
                                entityId: serviceOrder.id,
                                entityType: "service_orders",
                                createdAt: currentTime,
                                updatedAt: currentTime,
                                orgId: req.orgId
                            })
                            .returning(["*"])
                            .transacting(trx)
                            .into("assigned_service_additional_users");
                        await knex
                            .insert({
                                userId: user,
                                entityId: serviceRequestId,
                                entityType: "service_requests",
                                createdAt: currentTime,
                                updatedAt: currentTime,
                                orgId: req.orgId
                            })
                            .returning(["*"])
                            .transacting(trx)
                            .into("assigned_service_additional_users");
                        //additionalUsersResultantArray.push(userResult[0])

                        let receiver1 = await knex.from('users').where({ id: user }).first();
                        await serviceRequestNotification.send(sender, receiver1, dataNos, ALLOWED_CHANNELS);

                    }
                    // Send Notifications to Additional Users
                }

            })
            // updated table for triggers

            await knex
                .update({ isActive: true })
                .where({ serviceRequestId: serviceOrderPayload.serviceRequestId })
                .into("service_orders");

            // Service Request Additional Users End
            return res.status(200).json({
                data: { serviceOrder, assignedServiceTeamSR, assignedAdditionalUsers: assignedServiceAdditionalUsers, images: images },
                message: "Service Order added successfully!"
            });

        } catch (err) {
            console.log('[controllers][serviceOrder][addServiceOrder] :  Error', err);
            //trx.rollback
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    getServiceOrderList: async (req, res) => {
        try {
            //const serviceOrders = await knex('service_orders').select();
            console.log('ORG ID: ************************************************: ', req.orgId)
            let {
                serviceRequestId,
                description,
                serviceOrderStatus,
                archive,
                location,
                assignedBy,
                serviceStartTime,
                serviceStopTime,
                createdAt,
                createdBy,
                requestedBy,
                completedBy,
                recurrenceType,
                assignedTo,
                completedFrom,
                dueFrom,
                completedTo,
                dueTo,
                createdFrom,
                createdTo,
                unit,
                serviceType,
                serviceOrderId,
                building,
                tenantName,
                priority,
                company,
                project,
                serviceRequestIdForShared
            } = req.body

            let reqData = req.query;
            let total, rows
            const accessibleProjects = req.userProjectResources[0].projects


            let pagination = {};
            let per_page = reqData.per_page || 10;
            let page = reqData.current_page || 1;
            if (page < 1) page = 1;
            let offset = (page - 1) * per_page;
            //let filter = 
            //let filters = 
            let filters = {}
            if (serviceRequestId) {
                filters['service_requests.displayId'] = serviceRequestId
            }
            if (serviceRequestIdForShared) {
                filters['service_requests.id'] = serviceRequestIdForShared
            }
            // if (description) {
            //     filters['service_requests.description'] = description;
            // }



            if (serviceOrderStatus) {
                filters['status.descriptionEng'] = serviceOrderStatus
            }
            if (serviceOrderId) {
                filters['service_orders.displayId'] = serviceOrderId
            }

            if (archive) {
                filters['service_orders.archive'] = archive
            }

            if (location) {
                filters['service_requests.location'] = location
            }

            if (createdBy) {
                filters['service_orders.createdBy'] = createdBy
            }

            if (assignedBy) {
                filters['service_orders.createdBy'] = assignedBy
            }

            // if (requestedBy) {
            //     filters['service_orders.requestedBy'] = requestedBy
            // }

            if (completedBy) {
                filters['service_orders.completedBy'] = completedBy
            }

            if (recurrenceType) {
                filters['service_orders.recurrenceType'] = recurrenceType
            }
            if (assignedTo) {
                filters['users.name'] = assignedTo
            }

            // if (unit) {

            // }
            if (serviceType) {
                filters['service_requests.serviceType'] = serviceType
            }

            if (serviceStartTime) {
                filters['service_orders.serviceStartTime'] = serviceStartTime
            }

            if (serviceStopTime) {
                filters['service_orders.serviceStopTime'] = serviceStopTime
            }

            if (company) {
                filters["service_orders.companyId"] = company;
            }
            if (project) {
                filters["property_units.projectId"] = project;
            }



            // CreatedAt BETWEEN dates for created from - created to

            // orderDueDate - due from - to

            // completed on -> closed from - to
            let completedFromDate, completedToDate
            if (completedFrom && completedTo) {

                completedFromDate = new Date(completedFrom).getTime();
                completedToDate = new Date(completedTo).getTime();

            } else if (completedFrom && !completedTo) {

                completedFromDate = new Date(completedFrom).getTime();
                completedToDate = new Date("2030-01-01").getTime()

            } else if (!completedFrom && completedTo) {
                completedFromDate = new Date("2000-01-01").getTime();
                completedToDate = new Date(completedTo).getTime()
            }


            const d = new Date();
            let differencesTime = d.getTimezoneOffset();

            moment.tz.setDefault(moment.tz.guess()); // now we've set the default time zone          
            let selectedTimeZone = moment().tz();
            let currentTime = moment();
            console.log("Current Time:", currentTime.format("MMMM Do YYYY, h:mm:ss a"));

            let dueFromDate, dueToDate
            if (dueFrom && dueTo) {
                //dueFromDate = new Date(moment(dueFrom).startOf('day')).getTime()
                // dueFromDate = moment(dueFrom).format();
                // dueToDate = moment(dueTo).format();
                // console.log(dueFromDate)
                //dueFromDate = moment(dueFrom).tz(selectedTimeZone).valueOf();
                dueFromDate = dueFrom;
                //dueToDate = new Date(moment(dueTo).startOf('day')).getTime();
                // let toDate = moment(dueTo).endOf('date').format();
                //dueToDate = new Date(toDate).getTime();
                dueToDate = dueTo;
            }

            // } else if (dueFrom && !dueTo) {

            //     // dueFromDate = dueFrom;
            //     // dueToDate = "2030-01-01"
            //     // dueFromDate = new Date(moment(dueFrom).startOf('day')).getTime()
            //     // dueFromDate = moment(dueFrom).tz(selectedTimeZone).valueOf();
            //     // dueToDate = new Date().getTime()
            //     dueFromDate = moment(dueFrom).tz(selectedTimeZone).valueOf();
            //     dueToDate = new Date("2030-01-01").getTime();

            // } else if (!dueFrom && dueTo) {
            //     // dueFromDate = "2000-01-01";
            //     // dueToDate = dueTo
            //     dueFromDate = new Date("2000-01-01").getTime();
            //     dueToDate = new Date(dueTo).getTime();

            //     // dueFromDate = new Date().getTime()
            //     // dueToDate = new Date(moment(dueTo).startOf('day')).getTime()
            // }


            let createdFromDate, createdToDate
            if (createdFrom && createdTo) {

                createdFromDate = new Date(createdFrom).getTime();
                createdToDate = new Date(createdTo).getTime();

            } else if (createdFrom && !createdTo) {

                createdFromDate = new Date(createdFrom).getTime();
                createdToDate = new Date("2030-01-01").getTime()

            } else if (!createdFrom && createdTo) {
                createdFromDate = new Date("2000-01-01").getTime();
                createdToDate = new Date(createdTo).getTime()
            }


            if ((dueFromDate && dueToDate) || (createdFromDate && createdToDate)) {

                [total, rows] = await Promise.all([
                    knex.from('service_orders')
                        .leftJoin('service_requests', 'service_orders.serviceRequestId', 'service_requests.id')
                        .leftJoin('service_problems', 'service_requests.id', 'service_problems.serviceRequestId')
                        .leftJoin('incident_categories', 'service_problems.categoryId', 'incident_categories.id')
                        .leftJoin('assigned_service_team', 'service_requests.id', 'assigned_service_team.entityId')
                        .leftJoin('users', 'assigned_service_team.userId', 'users.id')
                        .leftJoin("service_status AS status", "service_requests.serviceStatusCode", "status.statusCode")
                        .leftJoin("users AS u", "service_requests.createdBy", "u.id")
                        .leftJoin('teams', 'assigned_service_team.teamId', 'teams.teamId')
                        .leftJoin('property_units', 'service_requests.houseId', 'property_units.id')
                        .leftJoin('buildings_and_phases', 'property_units.buildingPhaseId', 'buildings_and_phases.id')
                        .leftJoin('requested_by', 'service_requests.requestedBy', 'requested_by.id')
                        // .leftJoin('user_house_allocation', 'service_requests.houseId', 'user_house_allocation.houseId')
                        // .leftJoin('users as assignUser', 'user_house_allocation.userId', 'assignUser.id')
                        .leftJoin('companies', 'service_orders.companyId', 'companies.id')
                        .leftJoin('projects', 'property_units.projectId', 'projects.id')

                        .select([
                            'service_orders.id as So Id',
                            'service_requests.description as Description',
                            'service_requests.location as Location',
                            'service_requests.id as Sr Id',
                            'incident_categories.descriptionEng as Problem',
                            'priority as Priority',
                            'orderDueDate as Due Date',
                            'u.name as Created By',
                            'status.descriptionEng as Status',
                            'service_orders.createdAt as Date Created',
                            'service_requests.houseId as houseId',
                            "buildings_and_phases.description as Building Name",
                            "users.userName as Assigned Main User",
                            "teams.teamName as Team Name",
                            "requested_by.name as Requested By",
                            "property_units.unitNumber as Unit Number",
                            "property_units.id as unitId",
                            "service_orders.displayId as SO#",
                            "service_requests.displayId as SR#",
                            "companies.companyName",
                            "companies.companyId",
                            "projects.project",
                            "projects.projectName",

                            // "assignUser.name as Tenant Name"


                        ]).where((qb) => {
                            qb.where({ 'service_orders.orgId': req.orgId });
                            qb.whereIn('service_requests.projectId', accessibleProjects)
                            if (filters) {
                                qb.where(filters);
                            }
                            if (completedFromDate && completedToDate) {
                                qb.whereBetween('service_orders.completedOn', [completedFromDate, completedToDate])
                            }
                            if (dueFromDate && dueToDate) {
                                qb.whereBetween('service_orders.orderDueDate', [dueFromDate, dueToDate])
                            }
                            if (createdFromDate && createdToDate) {
                                qb.whereBetween('service_orders.createdAt', [createdFromDate, createdToDate])
                            }
                            if (unit) {
                                qb.where('property_units.unitNumber', 'ilike', `%${unit}%`)
                            }
                            if (building) {
                                qb.where('buildings_and_phases.description', 'ilike', `%${building}%`)
                            }

                            if (description) {
                                qb.where('service_requests.description', 'iLIKE', `%${description}%`)
                            }
                            if (requestedBy) {
                                qb.where('requested_by.name', 'ilike', `%${requestedBy}%`)
                            }
                            // if (tenantName) {
                            //     qb.where('assignUser.name', 'ilike', `%${tenantName}%`)
                            // }
                            if (priority) {
                                qb.where('service_requests.priority', 'ilike', `%${priority}%`)
                            }

                        }).groupBy([
                            'buildings_and_phases.id',
                            'teams.teamId',
                            'requested_by.id',
                            'property_units.id',
                            'service_requests.id',
                            'service_orders.id',
                            'service_problems.id',
                            'incident_categories.id',
                            'assigned_service_team.id',
                            'users.id', 'u.id',
                            "companies.id",
                            "projects.id",
                            // "assignUser.id",
                            // "user_house_allocation.id",
                            'status.id', 'users.id'
                        ]),

                    knex.from('service_orders')
                        .leftJoin('service_requests', 'service_orders.serviceRequestId', 'service_requests.id')
                        .leftJoin('service_problems', 'service_requests.id', 'service_problems.serviceRequestId')
                        .leftJoin('incident_categories', 'service_problems.categoryId', 'incident_categories.id')
                        .leftJoin('assigned_service_team', 'service_requests.id', 'assigned_service_team.entityId')
                        .leftJoin('users', 'assigned_service_team.userId', 'users.id')
                        .leftJoin("service_status AS status", "service_requests.serviceStatusCode", "status.statusCode")
                        .leftJoin("users AS u", "service_requests.createdBy", "u.id")
                        .leftJoin('teams', 'assigned_service_team.teamId', 'teams.teamId')
                        .leftJoin('property_units', 'service_requests.houseId', 'property_units.id')
                        //.leftJoin('buildings_and_phases', 'property_units.buildingPhaseId', 'buildings_and_phases.id')
                        // .leftJoin('requested_by', 'service_requests.requestedBy', 'requested_by.id')
                        // .leftJoin('teams', 'assigned_service_team.teamId', 'teams.teamId')
                        // .leftJoin('property_units', 'service_requests.houseId', 'property_units.id')
                        .leftJoin('buildings_and_phases', 'property_units.buildingPhaseId', 'buildings_and_phases.id')
                        .leftJoin('requested_by', 'service_requests.requestedBy', 'requested_by.id')
                        // .leftJoin('user_house_allocation', 'service_requests.houseId', 'user_house_allocation.houseId')
                        // .leftJoin('users as assignUser', 'user_house_allocation.userId', 'assignUser.id')
                        .leftJoin('companies', 'service_orders.companyId', 'companies.id')
                        .leftJoin('projects', 'property_units.projectId', 'projects.id')

                        .select([
                            'service_orders.id as So Id',
                            'service_requests.description as Description',
                            'service_requests.location as Location',
                            'service_requests.id as Sr Id',
                            'incident_categories.descriptionEng as Problem',
                            'priority as Priority',
                            'service_requests.createdBy as Created By',
                            'orderDueDate as Due Date',
                            'u.name as Created By',
                            'status.descriptionEng as Status',
                            'service_orders.createdAt as Date Created',
                            'service_requests.houseId as houseId',
                            "buildings_and_phases.description as Building Name",
                            "users.userName as Assigned Main User",
                            "teams.teamName as Team Name",
                            "requested_by.name as Requested By",
                            "property_units.unitNumber as Unit Number",
                            "property_units.id as unitId",
                            "service_orders.displayId as SO#",
                            "service_requests.displayId as SR#",
                            "companies.companyName",
                            "companies.companyId",
                            "projects.project",
                            "projects.projectName",

                            // "assignUser.name as Tenant Name"

                        ]).where((qb) => {
                            qb.where({ 'service_orders.orgId': req.orgId })
                            qb.whereIn('service_requests.projectId', accessibleProjects)
                            if (filters) {
                                qb.where(filters);
                            }
                            if (completedFromDate && completedToDate) {
                                qb.whereBetween('service_orders.completedOn', [completedFromDate, completedToDate])
                            }
                            if (dueFromDate && dueToDate) {
                                qb.whereBetween('service_orders.orderDueDate', [dueFromDate, dueToDate])
                            }
                            if (createdFromDate && createdToDate) {
                                qb.whereBetween('service_orders.createdAt', [createdFromDate, createdToDate])
                            }
                            if (unit) {
                                qb.where('property_units.unitNumber', 'ilike', `%${unit}%`)
                            }
                            if (building) {
                                qb.where('buildings_and_phases.description', 'ilike', `%${building}%`)
                            }
                            if (description) {
                                qb.where('service_requests.description', 'iLIKE', `%${description}%`)
                            }
                            if (requestedBy) {
                                qb.where('requested_by.name', 'ilike', `%${requestedBy}%`)
                            }
                            // if (tenantName) {
                            //     qb.where('assignUser.name', 'ilike', `%${tenantName}%`)
                            // }
                            if (priority) {
                                qb.where('service_requests.priority', 'ilike', `%${priority}%`)
                            }


                        }).offset(offset).limit(per_page).orderBy('service_orders.id', 'desc')
                ])
            } else if (_.isEmpty(filters)) {
                [total, rows] = await Promise.all([
                    knex

                        .from("service_orders")
                        .leftJoin(
                            "service_requests",
                            "service_orders.serviceRequestId",
                            "service_requests.id"
                        )
                        .leftJoin(
                            "service_problems",
                            "service_requests.id",
                            "service_problems.serviceRequestId"
                        )
                        .leftJoin(
                            "incident_categories",
                            "service_problems.categoryId",
                            "incident_categories.id"
                        )
                        .leftJoin(
                            "assigned_service_team",
                            "service_requests.id",
                            "assigned_service_team.entityId"
                        )
                        .leftJoin(
                            "users",
                            "assigned_service_team.userId",
                            "users.id"
                        )
                        .leftJoin("service_status AS status", "service_requests.serviceStatusCode", "status.statusCode")
                        .leftJoin("users AS u", "service_requests.createdBy", "u.id")
                        .leftJoin('teams', 'assigned_service_team.teamId', 'teams.teamId')
                        .leftJoin('property_units', 'service_requests.houseId', 'property_units.id')
                        .leftJoin('buildings_and_phases', 'property_units.buildingPhaseId', 'buildings_and_phases.id')
                        .leftJoin('requested_by', 'service_requests.requestedBy', 'requested_by.id')
                        // .leftJoin('user_house_allocation', 'service_requests.houseId', 'user_house_allocation.houseId')
                        // .leftJoin('users as assignUser', 'user_house_allocation.userId', 'assignUser.id')
                        .leftJoin('companies', 'service_orders.companyId', 'companies.id')
                        .leftJoin('projects', 'property_units.projectId', 'projects.id')

                        .select([
                            "service_orders.id as So Id",
                            "service_requests.description as Description",
                            "service_requests.location as Location",
                            "service_requests.id as Sr Id",
                            "incident_categories.descriptionEng as Problem",
                            "priority as Priority",
                            "orderDueDate as Due Date",
                            "status.descriptionEng as Status",
                            "u.name as Created By",
                            "service_orders.createdAt as Date Created",
                            'service_requests.houseId as houseId',
                            "buildings_and_phases.description as Building Name",
                            "users.userName as Assigned Main User",
                            "teams.teamName as Team Name",
                            "requested_by.name as Requested By",
                            "property_units.unitNumber as Unit Number",
                            "property_units.id as unitId",
                            "service_orders.displayId as SO#",
                            "service_requests.displayId as SR#",
                            "companies.companyName",
                            "companies.companyId",
                            "projects.project",
                            "projects.projectName",

                            // "assignUser.name as Tenant Name"
                        ])
                        .where(qb => {
                            qb.where({ "service_orders.orgId": req.orgId });
                            qb.whereIn('service_requests.projectId', accessibleProjects)


                            if (filters) {
                                qb.where(filters);
                            }
                            if (completedFromDate && completedToDate) {
                                qb.whereBetween("service_orders.completedOn", [
                                    completedFromDate,
                                    completedToDate
                                ]);
                            }
                            if (dueFromDate && dueToDate) {
                                qb.whereBetween("service_orders.orderDueDate", [
                                    dueFromDate,
                                    dueToDate
                                ]);
                            }
                            if (createdFromDate && createdToDate) {
                                qb.whereBetween("service_orders.createdAt", [
                                    createdFromDate,
                                    createdToDate
                                ]);
                            }
                            if (unit) {
                                qb.where('property_units.unitNumber', 'ilike', `%${unit}%`)
                            }
                            if (building) {
                                qb.where('buildings_and_phases.description', 'ilike', `%${building}%`)
                            }
                            if (description) {
                                qb.where('service_requests.description', 'iLIKE', `%${description}%`)
                            }

                            // if(tenantName){
                            //     qb.where('assignUser.name','ilike',`%${tenantName}%`)
                            // }
                            if (requestedBy) {
                                qb.where('requested_by.name', 'ilike', `%${requestedBy}%`)
                            }
                            if (priority) {
                                qb.where('service_requests.priority', 'ilike', `%${priority}%`)
                            }

                        })
                        .groupBy([
                            "service_requests.id",
                            "service_orders.id",
                            "service_problems.id",
                            "incident_categories.id",
                            "assigned_service_team.id",
                            "users.id",
                            "u.id",
                            "status.id",
                            'buildings_and_phases.id',
                            'teams.teamId',
                            'requested_by.id',
                            'property_units.id',
                            "companies.id",
                            "projects.id",
                            // "assignUser.id",
                            // "user_house_allocation.id"

                        ]),
                    knex
                        .from("service_orders")
                        .leftJoin(
                            "service_requests",
                            "service_orders.serviceRequestId",
                            "service_requests.id"
                        )
                        .leftJoin(
                            "service_problems",
                            "service_requests.id",
                            "service_problems.serviceRequestId"
                        )
                        .leftJoin(
                            "incident_categories",
                            "service_problems.categoryId",
                            "incident_categories.id"
                        )
                        .leftJoin(
                            "assigned_service_team",
                            "service_requests.id",
                            "assigned_service_team.entityId"
                        )
                        .leftJoin(
                            "users",
                            "assigned_service_team.userId",
                            "users.id"
                        )
                        .leftJoin("service_status AS status", "service_requests.serviceStatusCode", "status.statusCode")
                        .leftJoin("users AS u", "service_requests.createdBy", "u.id")
                        .leftJoin('teams', 'assigned_service_team.teamId', 'teams.teamId')
                        .leftJoin('property_units', 'service_requests.houseId', 'property_units.id')
                        .leftJoin('buildings_and_phases', 'property_units.buildingPhaseId', 'buildings_and_phases.id')
                        .leftJoin('requested_by', 'service_requests.requestedBy', 'requested_by.id')
                        // .leftJoin('user_house_allocation', 'service_requests.houseId', 'user_house_allocation.houseId')
                        // .leftJoin('users as assignUser', 'user_house_allocation.userId', 'assignUser.id')
                        .leftJoin('companies', 'service_orders.companyId', 'companies.id')
                        .leftJoin('projects', 'property_units.projectId', 'projects.id')

                        .select([
                            "service_orders.id as So Id",
                            "service_requests.description as Description",
                            "service_requests.location as Location",
                            "service_requests.id as Sr Id",
                            "incident_categories.descriptionEng as Problem",
                            "priority as Priority",
                            "u.name as Created By",
                            'service_requests.houseId as houseId',
                            "orderDueDate as Due Date",
                            "status.descriptionEng as Status",
                            "service_orders.createdAt as Date Created",
                            "buildings_and_phases.description as Building Name",
                            "users.userName as Assigned Main User",
                            "teams.teamName as Team Name",
                            "requested_by.name as Requested By",
                            "property_units.unitNumber as Unit Number",
                            "property_units.id as unitId",
                            "service_orders.displayId as SO#",
                            "service_requests.displayId as SR#",
                            "companies.companyName",
                            "companies.companyId",
                            "projects.project",
                            "projects.projectName",

                            // "assignUser.name as Tenant Name"

                        ])
                        .where(qb => {
                            qb.where({ "service_orders.orgId": req.orgId });
                            qb.whereIn('service_requests.projectId', accessibleProjects)


                            if (filters) {
                                qb.where(filters);
                            }
                            if (completedFromDate && completedToDate) {
                                qb.whereBetween("service_orders.completedOn", [
                                    completedFromDate,
                                    completedToDate
                                ]);
                            }
                            if (dueFromDate && dueToDate) {
                                qb.whereBetween("service_orders.orderDueDate", [
                                    dueFromDate,
                                    dueToDate
                                ]);
                            }
                            if (createdFromDate && createdToDate) {
                                qb.whereBetween("service_orders.createdAt", [
                                    createdFromDate,
                                    createdToDate
                                ]);
                            }
                            if (unit) {
                                qb.where('property_units.unitNumber', 'ilike', `%${unit}%`)
                            }
                            if (building) {
                                qb.where('buildings_and_phases.description', 'ilike', `%${building}%`)
                            }
                            if (description) {
                                qb.where('service_requests.description', 'iLIKE', `%${description}%`)
                            }
                            // if (tenantName) {
                            //     qb.where('assignUser.name', 'ilike', `%${tenantName}%`)
                            // }
                            if (requestedBy) {
                                qb.where('requested_by.name', 'ilike', `%${requestedBy}%`)
                            }
                            if (priority) {
                                qb.where('service_requests.priority', 'ilike', `%${priority}%`)
                            }

                        }).groupBy([
                            "service_requests.id",
                            "service_orders.id",
                            "service_problems.id",
                            "incident_categories.id",
                            "assigned_service_team.id",
                            "users.id",
                            "u.id",
                            "status.id",
                            'buildings_and_phases.id',
                            'teams.teamId',
                            'requested_by.id',
                            'property_units.id',
                            "companies.id",
                            "projects.id",
                            // "assignUser.id",
                            // "user_house_allocation.id"
                        ])
                        .offset(offset)
                        .limit(per_page).orderBy('service_orders.id', 'desc')
                ]);
                // [total, rows] = await Promise.all([
                //     knex

                //         .from("service_orders")
                //         .leftJoin(
                //             "service_requests",
                //             "service_orders.serviceRequestId",
                //             "service_requests.id"
                //         )
                //         .leftJoin(
                //             "service_problems",
                //             "service_requests.id",
                //             "service_problems.serviceRequestId"
                //         )
                //         .leftJoin(
                //             "incident_categories",
                //             "service_problems.categoryId",
                //             "incident_categories.id"
                //         )
                //         .leftJoin('assigned_service_team', 'service_requests.id', 'assigned_service_team.entityId')

                //         .leftJoin("service_status AS status", "service_requests.serviceStatusCode", "status.statusCode")
                //         .leftJoin("users AS u", "service_requests.createdBy", "u.id")
                //         .leftJoin('teams', 'assigned_service_team.teamId', 'teams.teamId')
                //         .leftJoin('users', 'assigned_service_team.userId', 'users.id')

                //         .leftJoin('property_units', 'service_requests.houseId', 'property_units.id')
                //         .leftJoin('buildings_and_phases', 'property_units.buildingPhaseId', 'buildings_and_phases.id')
                //         .leftJoin('requested_by', 'service_requests.requestedBy', 'requested_by.id')
                //         .leftJoin('user_house_allocation', 'service_requests.houseId', 'user_house_allocation.houseId')
                //         .leftJoin('users as assignUser', 'user_house_allocation.userId', 'assignUser.id')

                //         .select([
                //             "service_orders.id as So Id",
                //             "service_requests.description as Description",
                //             "service_requests.location as Location",
                //             "service_requests.id as Sr Id",
                //             "incident_categories.descriptionEng as Problem",
                //             "priority as Priority",

                //             //   "service_orders.createdBy as Created By",
                //             "orderDueDate as Due Date",
                //             'u.name as Created By',
                //             'status.descriptionEng as Status',
                //             'service_orders.createdAt as Date Created',
                //             'service_requests.houseId as houseId',
                //             "buildings_and_phases.description as Building Name",
                //             "users.userName as Assigned Main User",
                //             "teams.teamName as Team Name",
                //             "requested_by.name as Requested By",
                //             "property_units.unitNumber as Unit Number",
                //             "assignUser.name as Tenant Name"
                //         ])
                //         .groupBy([
                //             "service_requests.id",
                //             "service_orders.id",
                //             "service_problems.id",
                //             "incident_categories.id",
                //             "u.id",
                //             "status.id",
                //             'buildings_and_phases.id',
                //             'teams.teamId',
                //             'requested_by.id',
                //             'property_units.id',
                //             'users.id',
                //             "assignUser.id",
                //             "user_house_allocation.id"

                //         ])
                //         .where({ "service_orders.orgId": req.orgId })
                //         .whereIn('service_requests.projectId', accessibleProjects),

                //     knex
                //         .from("service_orders")
                //         .leftJoin(
                //             "service_requests",
                //             "service_orders.serviceRequestId",
                //             "service_requests.id"
                //         )
                //         .leftJoin(
                //             "service_problems",
                //             "service_requests.id",
                //             "service_problems.serviceRequestId"
                //         )
                //         .leftJoin(
                //             "incident_categories",
                //             "service_problems.categoryId",
                //             "incident_categories.id"
                //         )
                //         .leftJoin('assigned_service_team', 'service_requests.id', 'assigned_service_team.entityId')

                //         .leftJoin("service_status AS status", "service_requests.serviceStatusCode", "status.statusCode")
                //         .leftJoin("users AS u", "service_requests.createdBy", "u.id")
                //         .leftJoin('teams', 'assigned_service_team.teamId', 'teams.teamId')
                //         .leftJoin('users', 'assigned_service_team.userId', 'users.id')

                //         .leftJoin('property_units', 'service_requests.houseId', 'property_units.id')
                //         .leftJoin('buildings_and_phases', 'property_units.buildingPhaseId', 'buildings_and_phases.id')
                //         .leftJoin('requested_by', 'service_requests.requestedBy', 'requested_by.id')
                //         .leftJoin('user_house_allocation', 'service_requests.houseId', 'user_house_allocation.houseId')
                //         .leftJoin('users as assignUser', 'user_house_allocation.userId', 'assignUser.id')

                //         .select([
                //             "service_orders.id as So Id",
                //             "service_requests.description as Description",
                //             "service_requests.location as Location",
                //             "service_requests.id as Sr Id",
                //             "incident_categories.descriptionEng as Problem",
                //             "service_requests.priority as Priority",
                //             "u.name as Created By",
                //             //   "service_orders.createdBy as Created By",
                //             "orderDueDate as Due Date",
                //             "status.descriptionEng as Status",
                //             "service_orders.createdAt as Date Created",
                //             'service_requests.houseId as houseId',
                //             "buildings_and_phases.description as Building Name",
                //             "users.userName as Assigned Main User",
                //             "teams.teamName as Team Name",
                //             "requested_by.name as Requested By",
                //             "property_units.unitNumber as Unit Number",
                //             "assignUser.name as Tenant Name"

                //         ])
                //         .distinct('service_requests.id')
                //         .orderBy('service_orders.id', 'desc')
                //         .offset(offset)
                //         .limit(per_page)
                //         .where({ "service_orders.orgId": req.orgId })
                //         .whereIn('service_requests.projectId', accessibleProjects).orderBy('service_orders.id', 'desc'),
                // ]);
            } else {

                [total, rows] = await Promise.all([
                    knex

                        .from("service_orders")
                        .leftJoin(
                            "service_requests",
                            "service_orders.serviceRequestId",
                            "service_requests.id"
                        )
                        .leftJoin(
                            "service_problems",
                            "service_requests.id",
                            "service_problems.serviceRequestId"
                        )
                        .leftJoin(
                            "incident_categories",
                            "service_problems.categoryId",
                            "incident_categories.id"
                        )
                        .leftJoin(
                            "assigned_service_team",
                            "service_requests.id",
                            "assigned_service_team.entityId"
                        )
                        .leftJoin(
                            "users",
                            "assigned_service_team.userId",
                            "users.id"
                        )
                        .leftJoin("service_status AS status", "service_requests.serviceStatusCode", "status.statusCode")
                        .leftJoin("users AS u", "service_requests.createdBy", "u.id")
                        .leftJoin('teams', 'assigned_service_team.teamId', 'teams.teamId')
                        .leftJoin('property_units', 'service_requests.houseId', 'property_units.id')
                        .leftJoin('buildings_and_phases', 'property_units.buildingPhaseId', 'buildings_and_phases.id')
                        .leftJoin('requested_by', 'service_requests.requestedBy', 'requested_by.id')
                        // .leftJoin('user_house_allocation', 'service_requests.houseId', 'user_house_allocation.houseId')
                        // .leftJoin('users as assignUser', 'user_house_allocation.userId', 'assignUser.id')
                        .leftJoin('companies', 'service_orders.companyId', 'companies.id')
                        .leftJoin('projects', 'property_units.projectId', 'projects.id')

                        .select([
                            "service_orders.id as So Id",
                            "service_requests.description as Description",
                            "service_requests.location as Location",
                            "service_requests.id as Sr Id",
                            "incident_categories.descriptionEng as Problem",
                            "priority as Priority",
                            "orderDueDate as Due Date",
                            "status.descriptionEng as Status",
                            "u.name as Created By",
                            "service_orders.createdAt as Date Created",
                            'service_requests.houseId as houseId',
                            "buildings_and_phases.description as Building Name",
                            "users.userName as Assigned Main User",
                            "teams.teamName as Team Name",
                            "requested_by.name as Requested By",
                            "property_units.unitNumber as Unit Number",
                            "property_units.id as unitId",
                            "service_orders.displayId as SO#",
                            "service_requests.displayId as SR#",
                            "companies.companyName",
                            "companies.companyId",
                            "projects.project",
                            "projects.projectName",

                            // "assignUser.name as Tenant Name"
                        ])
                        .where(qb => {
                            qb.where({ "service_orders.orgId": req.orgId });
                            qb.whereIn('service_requests.projectId', accessibleProjects)


                            if (filters) {
                                qb.where(filters);
                            }
                            if (completedFromDate && completedToDate) {
                                qb.whereBetween("service_orders.completedOn", [
                                    completedFromDate,
                                    completedToDate
                                ]);
                            }
                            if (dueFromDate && dueToDate) {
                                qb.whereBetween("service_orders.orderDueDate", [
                                    dueFromDate,
                                    dueToDate
                                ]);
                            }
                            if (createdFromDate && createdToDate) {
                                qb.whereBetween("service_orders.createdAt", [
                                    createdFromDate,
                                    createdToDate
                                ]);
                            }
                            if (unit) {
                                qb.where('property_units.unitNumber', 'ilike', `%${unit}%`)
                            }
                            if (building) {
                                qb.where('buildings_and_phases.description', 'ilike', `%${building}%`)
                            }
                            if (description) {
                                qb.where('service_requests.description', 'iLIKE', `%${description}%`)
                            }
                            // if (tenantName) {
                            //     qb.where('assignUser.name', 'ilike', `%${tenantName}%`)
                            // }

                            if (requestedBy) {
                                qb.where('requested_by.name', 'ilike', `%${requestedBy}%`)
                            }
                            if (priority) {
                                qb.where('service_requests.priority', 'ilike', `%${priority}%`)
                            }

                        })
                        .groupBy([
                            "service_requests.id",
                            "service_orders.id",
                            "service_problems.id",
                            "incident_categories.id",
                            "assigned_service_team.id",
                            "users.id",
                            "u.id",
                            "status.id",
                            'buildings_and_phases.id',
                            'teams.teamId',
                            'requested_by.id',
                            'property_units.id',
                            "companies.id",
                            "projects.id",
                            // "assignUser.id",
                            // "user_house_allocation.id"

                        ]),
                    knex
                        .from("service_orders")
                        .leftJoin(
                            "service_requests",
                            "service_orders.serviceRequestId",
                            "service_requests.id"
                        )
                        .leftJoin(
                            "service_problems",
                            "service_requests.id",
                            "service_problems.serviceRequestId"
                        )
                        .leftJoin(
                            "incident_categories",
                            "service_problems.categoryId",
                            "incident_categories.id"
                        )
                        .leftJoin(
                            "assigned_service_team",
                            "service_requests.id",
                            "assigned_service_team.entityId"
                        )
                        .leftJoin(
                            "users",
                            "assigned_service_team.userId",
                            "users.id"
                        )
                        .leftJoin("service_status AS status", "service_requests.serviceStatusCode", "status.statusCode")
                        .leftJoin("users AS u", "service_requests.createdBy", "u.id")
                        .leftJoin('teams', 'assigned_service_team.teamId', 'teams.teamId')
                        .leftJoin('property_units', 'service_requests.houseId', 'property_units.id')
                        .leftJoin('buildings_and_phases', 'property_units.buildingPhaseId', 'buildings_and_phases.id')
                        .leftJoin('requested_by', 'service_requests.requestedBy', 'requested_by.id')
                        // .leftJoin('user_house_allocation', 'service_requests.houseId', 'user_house_allocation.houseId')
                        // .leftJoin('users as assignUser', 'user_house_allocation.userId', 'assignUser.id')
                        .leftJoin('companies', 'service_orders.companyId', 'companies.id')
                        .leftJoin('projects', 'property_units.projectId', 'projects.id')

                        .select([
                            "service_orders.id as So Id",
                            "service_requests.description as Description",
                            "service_requests.location as Location",
                            "service_requests.id as Sr Id",
                            "incident_categories.descriptionEng as Problem",
                            "priority as Priority",
                            "u.name as Created By",
                            'service_requests.houseId as houseId',
                            "orderDueDate as Due Date",
                            "status.descriptionEng as Status",
                            "service_orders.createdAt as Date Created",
                            "buildings_and_phases.description as Building Name",
                            "users.userName as Assigned Main User",
                            "teams.teamName as Team Name",
                            "requested_by.name as Requested By",
                            "property_units.unitNumber as Unit Number",
                            "property_units.id as unitId",
                            "service_orders.displayId as SO#",
                            "service_requests.displayId as SR#",
                            "companies.companyName",
                            "companies.companyId",
                            "projects.project",
                            "projects.projectName",
                            // "assignUser.name as Tenant Name"

                        ])
                        .where(qb => {
                            qb.where({ "service_orders.orgId": req.orgId });
                            qb.whereIn('service_requests.projectId', accessibleProjects)


                            if (filters) {
                                qb.where(filters);
                            }
                            if (completedFromDate && completedToDate) {
                                qb.whereBetween("service_orders.completedOn", [
                                    completedFromDate,
                                    completedToDate
                                ]);
                            }
                            if (dueFromDate && dueToDate) {
                                qb.whereBetween("service_orders.orderDueDate", [
                                    dueFromDate,
                                    dueToDate
                                ]);
                            }
                            if (createdFromDate && createdToDate) {
                                qb.whereBetween("service_orders.createdAt", [
                                    createdFromDate,
                                    createdToDate
                                ]);
                            }
                            if (unit) {
                                qb.where('property_units.unitNumber', 'ilike', `%${unit}%`)
                            }
                            if (building) {
                                qb.where('buildings_and_phases.description', 'ilike', `%${building}%`)
                            }
                            if (description) {
                                qb.where('service_requests.description', 'iLIKE', `%${description}%`)
                            }
                            // if (tenantName) {
                            //     qb.where('assignUser.name', 'ilike', `%${tenantName}%`)
                            // }
                            if (requestedBy) {
                                qb.where('requested_by.name', 'ilike', `%${requestedBy}%`)
                            }
                            if (priority) {
                                qb.where('service_requests.priority', 'ilike', `%${priority}%`)
                            }

                        })
                        .offset(offset)
                        .limit(per_page).orderBy('service_orders.id', 'desc')
                ]);

            }

            let count = total.length;
            pagination.total = count;
            pagination.per_page = per_page;
            pagination.offset = offset;
            pagination.to = offset + _.uniqBy(rows, 'So Id').length;
            pagination.last_page = Math.ceil(count / per_page);
            pagination.current_page = page;
            pagination.from = offset;
            // pagination.data = _.uniqBy(rows,'So Id');



            let Parallel = require('async-parallel');
            pagination.data = await Parallel.map(_.uniqBy(rows, 'So Id'), async pd => {

                let houseResult = await knex.from('user_house_allocation').select('userId').where({ houseId: pd.unitId }).first().orderBy('id', 'desc')

                if (houseResult) {
                    let tetantResult = await knex.from('users').select('name').where({ id: houseResult.userId }).first()
                    return {
                        ...pd,
                        "Tenant Name": tetantResult.name
                    }
                } else {
                    return {
                        ...pd,
                        "Tenant Name": ''
                    }
                }



            })





            // const serviceOrders = await knex
            //     .from('service_orders')
            //     .innerJoin('service_requests', 'service_orders.serviceRequestId', 'service_requests.id')
            //     .innerJoin('service_problems', 'service_requests.id', 'service_problems.serviceRequestId')
            //     .innerJoin('incident_categories', 'service_problems.categoryId', 'incident_categories.id')
            //     .select(['service_orders.id as so_id',
            //         'service_requests.id as sr_id', 'service_requests.description as sr_description',
            //         'location', 'priority', 'orderDueDate',
            //         'service_orders.createdAt as createdAt',
            //         'service_requests.requestedBy as requestedBy',
            //         'serviceOrderStatus', 'service_problems.description as sp_description',
            //         'categoryId', 'problemId',
            //         'incident_categories.id as categoryId',
            //         'incident_categories.descriptionEng as problem'

            //     ]).where(filters)
            //.innerJoin('service_problems', 'service_orders.serviceRequestId', 'service_problems.serviceRequestId')

            return res.status(200).json({
                data: {
                    service_orders: pagination
                },
                message: 'Service Orders List!'
            })


            // res.status(200).json({
            //     data: { serviceOrders },
            //     message: "Service Orders List !"
            // });
        } catch (err) {
            console.log('[controllers][serviceOrder][GetServiceOrderList] :  Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    getServiceOrderDetails: async (req, res) => {
        try {

            await knex.transaction(async trx => {
                let serviceOrderId = req.body.serviceOrderId;
                let serviceRequestId = req.body.serviceRequestId;

                // Get Service Order Details
                let serviceOrderResult = await knex.select().where({ id: serviceOrderId }).returning(['*']).transacting(trx).into('service_orders')

                // Get Service Request Details

                let serviceRequestResult = await knex.select().where({ id: serviceRequestId }).returning(['*']).transacting(trx).into('service_requests')


                // Get Team details based on ids provided
                let assignedServiceTeam = null
                if (serviceRequestId && serviceOrderId) {
                    assignedServiceTeam = await knex.select().where({ entityId: serviceOrderId, entityType: 'service_orders' }).returning(['*']).transacting(trx).into('assigned_service_team')
                } else {
                    assignedServiceTeam = await knex.select().where({ entityId: serviceRequestId, entityType: 'service_requests' }).returning(['*']).transacting(trx).into('assigned_service_team')
                }


                // Get additional users
                let additionalUsers = []
                if (serviceRequestId && serviceOrderId) {
                    additionalUsers = await knex.select().where({ entityId: serviceOrderId, entityType: 'service_orders' }).returning(['*']).transacting(trx).into('assigned_service_additional_users')
                } else {
                    additionalUsers = await knex.select().where({ entityId: serviceRequestId, entityType: 'service_requests' }).returning(['*']).transacting(trx).into('assigned_service_additional_users')
                }

                res.status(200).json({
                    data: { serviceOrder: serviceOrderResult[0], assignedServiceTeam, additionalUsers, serviceRequest: serviceRequestResult[0] },
                    message: "Service Order Details!"
                });
            })
        } catch (err) {
            console.log('[controllers][serviceOrder][GetServiceOrderDetails] :  Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    updateServiceOrder: async (req, res) => {
        try {
            let ALLOWED_CHANNELS = ['IN_APP', 'EMAIL', 'WEB_PUSH', 'SOCKET_NOTIFY', 'LINE_NOTIFY'];

            await knex.transaction(async trx => {
                let serviceOrder = null;
                let team = null;
                let additionalUsers = []
                let currentTime = new Date().getTime();
                const id = req.body.serviceOrderId;

                let srId = await knex.from('service_orders').where({ id: id }).first();

                let serviceRequestId = srId.serviceRequestId;
                const serviceOrderPayload = req.body;


                let updateData = { updatedAt: currentTime }
                serviceOrder = await knex.update(updateData).where({ id: id }).returning(['*']).transacting(trx).into('service_orders');


                // Check if previous teamId is equal to new team id
                let teamOldResult = await knex.select().where({ entityId: id, entityType: 'service_orders' }).returning(['*']).transacting(trx).into('assigned_service_team');
                console.log("teamOldResult", teamOldResult);
                let teamResult;
                const Parallel = require('async-parallel')
                teamResult = await Parallel.map(teamOldResult, async pd => {
                    return pd.teamId;
                })

                if (!_.isEqual(teamResult, [req.body.teamId])) {

                    console.log("notMatched", teamResult, req.body.teamId);

                    // Delete previous TeamId From Service Order
                    await knex.del().where({ entityId: id, entityType: 'service_orders' }).returning(['*']).transacting(trx).into('assigned_service_team')

                    // Delete previous TeamId From Service Request
                    await knex.del().where({ entityId: serviceRequestId, entityType: 'service_requests' }).returning(['*']).transacting(trx).into('assigned_service_team')


                    // Add new teamId
                    // let insertData = { createdAt: currentTime, updatedAt: currentTime, entityId: id, entityType: 'service_orders', teamId: serviceOrderPayload.teamId, userId: serviceOrderPayload.mainUserId }
                    // let teamRes = await knex.insert(insertData).returning(['*']).transacting(trx).into('assigned_service_team')
                    // team = teamRes[0]

                    //Service Order Team Management
                    const assignedServiceTeamPayload = { teamId: serviceOrderPayload.teamId, userId: serviceOrderPayload.mainUserId, entityId: id, entityType: 'service_orders', createdAt: currentTime, updatedAt: currentTime, orgId: req.orgId }
                    let assignedServiceTeamResult = await knex.insert(assignedServiceTeamPayload).returning(['*']).transacting(trx).into('assigned_service_team')
                    let assignedServiceTeam = assignedServiceTeamResult[0]
                    //Service Order Team Management End

                    // Service Request Team Management
                    const assignedServiceTeamPayloadSR = { teamId: serviceOrderPayload.teamId, userId: serviceOrderPayload.mainUserId, entityId: serviceRequestId, entityType: 'service_requests', createdAt: currentTime, updatedAt: currentTime, orgId: req.orgId }
                    let assignedServiceTeamResultSR = await knex.insert(assignedServiceTeamPayloadSR).returning(['*']).transacting(trx).into('assigned_service_team')
                    assignedServiceTeamSR = assignedServiceTeamResultSR[0]
                    //Service Request Team Management End


                    // Adding Notification in service request approval 

                    let sender = await knex.from('users').where({ id: req.me.id }).first();
                    let receiver = await knex.from('users').where({ id: serviceOrderPayload.mainUserId }).first();

                    console.log("requested mainUserId id for notification", serviceOrderPayload.mainUserId);

                    //  console.log("receiver tenant",receiver)

                    let dataNos = {
                        payload: {}
                    };

                    await serviceRequestNotification.send(sender, receiver, dataNos, ALLOWED_CHANNELS);

                }


                let assignedServiceAdditionalUsers = serviceOrderPayload.additionalUsers;
                let selectedUsers = [];

                let selectedUsersSOData = await knex.select().where({ entityId: id, entityType: 'service_orders' }).returning(['*']).transacting(trx).into('assigned_service_additional_users');
                selectedUsers = await Parallel.map(selectedUsersSOData, async user => {
                    return user.userId;
                })

                if (selectedUsers.length === 0) {

                    let selectedUsersSRData = await knex.select().where({ entityId: serviceRequestId, entityType: 'service_requests' }).returning(['*']).transacting(trx).into('assigned_service_additional_users')
                    selectedUsers = await Parallel.map(selectedUsersSRData, async user => {
                        return user.userId;
                    })
                }

                if (_.isEqual(selectedUsers, assignedServiceAdditionalUsers)) {
                    // trx.commit
                    trx.commit;
                    return res.status(200).json({
                        data: { serviceOrder, team, assignedAdditionalUsers: assignedServiceAdditionalUsers },
                        message: "Service Order updated successfully !"
                    });
                } else {

                    // Remove old users

                    for (user of selectedUsers) {
                        await knex.del().where({ entityId: id, entityType: 'service_orders' }).returning(['*']).transacting(trx).into('assigned_service_additional_users')
                        await knex.del().where({ entityId: serviceRequestId, entityType: 'service_requests' }).returning(['*']).transacting(trx).into('assigned_service_additional_users')
                    }

                    // Insert New Users
                    let dataNos = {
                        payload: {}
                    };

                    for (user of assignedServiceAdditionalUsers) {
                        // let userResult = await knex.insert({ userId: user, entityId: id, entityType: 'service_orders', createdAt: currentTime, updatedAt: currentTime }).returning(['*']).transacting(trx).into('assigned_service_additional_users')
                        // additionalUsers.push(userResult[0])

                        await knex
                            .insert({
                                userId: user,
                                entityId: id,
                                entityType: "service_orders",
                                createdAt: currentTime,
                                updatedAt: currentTime,
                                orgId: req.orgId
                            })
                            .returning(["*"])
                            .transacting(trx)
                            .into("assigned_service_additional_users");
                        await knex
                            .insert({
                                userId: user,
                                entityId: serviceRequestId,
                                entityType: "service_requests",
                                createdAt: currentTime,
                                updatedAt: currentTime,
                                orgId: req.orgId
                            })
                            .returning(["*"])
                            .transacting(trx)
                            .into("assigned_service_additional_users");
                        //additionalUsersResultantArray.push(userResult[0])
                        let sender = await knex.from('users').where({ id: req.me.id }).first();
                        let receiver1 = await knex.from('users').where({ id: user }).first();
                        await serviceRequestNotification.send(sender, receiver1, dataNos, ALLOWED_CHANNELS);

                    }
                    trx.commit;
                    return res.status(200).json({
                        data: { serviceOrder, team, assignedAdditionalUsers: additionalUsers },
                        message: "Service Order updated successfully !"
                    });
                }


            })
        } catch (err) {
            console.log('[controllers][serviceOrder][updateServiceOrder] :  Error', err);
            //trx.rollback
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    addServiceOrderPart: async (req, res) => {
        try {
            let assignedPart = [];

            await knex.transaction(async trx => {

                let assignedPartPayload = req.body;
                let schema = Joi.object().keys({
                    partId: Joi.string().required(),
                    //unitCost: Joi.string().required(),
                    unitCost: Joi.number().required(),
                    quantity: Joi.number().required(),
                    status: Joi.string().required(),
                    serviceOrderId: Joi.string().required()
                })


                let result = Joi.validate(assignedPartPayload, schema)
                console.log('[controllers][service][order]: JOi Result', result);

                // if (result && result.hasOwnProperty('error') && result.error) {
                //     return res.status(400).json({
                //         errors: [
                //             { code: 'VALIDATION_ERROR', message: result.error.message }
                //         ],
                //     });
                // }





                let avgUnitPrice;
                const currentTime = new Date().getTime();


                for (let d of assignedPartPayload) {


                    if (d.partId && d.unitCost && d.quantity && d.status && d.serviceOrderId) {

                        let avgResult = await knex('part_master').where({ id: d.partId, orgId: req.orgId }).first();
                        if (avgResult) {
                            avgUnitPrice = avgResult.avgUnitPrice;
                        }

                        // Insert in assigned_parts table,

                        let da = _.omit(d, ['serviceOrderId'])




                        let insertData = {
                            ...da,
                            entityId: d.serviceOrderId,
                            entityType: 'service_orders',
                            unitCost: avgUnitPrice,
                            createdAt: currentTime,
                            updatedAt: currentTime,
                            orgId: req.orgId,
                            avgUnitPrice: avgUnitPrice
                        }
                        let partResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('assigned_parts');
                        assignedPart.push(partResult);

                    } else {
                        return res.status(400).json({
                            errors: [
                                { code: 'VALIDATION_ERROR', message: "Fill All Field!" }
                            ],
                        });


                    }

                    // console.log("part================", partResult, "=========================")

                    trx.commit

                }

            })
            res.status(200).json({
                data: {
                    assignedPart: assignedPart
                },
                message: "Part added to Service order successfully !"
            });

        } catch (err) {
            console.log('[controllers][service][order] :  Error', err);
            //trx.rollback
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    addServiceOrderAsset: async (req, res) => {
        try {
            let assignedAsset = null;

            await knex.transaction(async trx => {

                let assignedAssetPayload = req.body;
                let schema = Joi.object().keys({
                    assetId: Joi.string().required(),
                    price: Joi.string().required(),
                    status: Joi.string().required(),
                    serviceOrderId: Joi.string().required()
                })


                let result = Joi.validate(assignedAssetPayload, schema)
                console.log('[controllers][service][order]: JOi Result', result);

                if (result && result.hasOwnProperty('error') && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: result.error.message }
                        ],
                    });
                }

                // Insert in assigned_parts table,
                const currentTime = new Date().getTime();

                let assignedAssetInsertPayload = _.omit(assignedAssetPayload, ['serviceOrderId'])

                let insertData = { ...assignedAssetInsertPayload, entityId: assignedAssetPayload.serviceOrderId, entityType: 'service_orders', createdAt: currentTime, updatedAt: currentTime, orgId: req.orgId }
                let assetResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('assigned_assets')
                assignedAsset = assetResult[0]
                trx.commit

            })
            res.status(200).json({
                data: {
                    assignedAsset: assignedAsset
                },
                message: "Asset added to Service order successfully !"
            });

        } catch (err) {
            console.log('[controllers][service][order] :  Error', err);
            //trx.rollback
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    deleteServiceOrderPart: async (req, res) => {
        try {
            let serviceOrder = null;
            let partResult = null;
            await knex.transaction(async trx => {

                let currentTime = new Date().getTime()
                const partPayload = req.body;
                const schema = Joi.object().keys({
                    serviceOrderId: Joi.string().required(),
                    partId: Joi.string().required()
                })

                let result = Joi.validate(partPayload, schema)
                console.log('[controllers][service][order]: JOi Result', result);

                if (result && result.hasOwnProperty('error') && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: result.error.message }
                        ],
                    });
                }

                // Now, check whether this service order is completed or not. If completed, we will soft delete the part from assigned_parts table
                let serviceOrderResult = await knex.select().where({ id: partPayload.serviceOrderId }).returning(['*']).transacting(trx).into('service_orders')

                serviceOrder = serviceOrderResult[0]
                if (String(serviceOrder.serviceOrderStatus).toUpperCase() === 'CMTD') {
                    // Now soft delete and return
                    let updatedPart = await knex.update({ status: 'CMTD', updatedAt: currentTime }).where({ partId: partPayload.partId, entityId: partPayload.serviceOrderId, entityType: 'service_orders' }).returning(['*']).transacting(trx).into('assigned_parts')
                    //partResult = updatedPartResult[0]
                    trx.commit;
                    return res.status(200).json({
                        data: {
                            updatedPart: updatedPart
                        },
                        message: "Assigned part status updated successfully !"
                    });

                }
                trx.commit
                return res.status(200).json({
                    data: {
                        updatedPart: null
                    },
                    message: 'Part status for this service order can not be updated because this service order is not completed yet.'
                })
            })


        } catch (err) {
            console.log('[controllers][service][order] :  Error', err);
            //trx.rollback
            return res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    deleteServiceOrderAsset: async (req, res) => {
        try {
            let serviceOrder = null;
            let partResult = null;
            await knex.transaction(async trx => {

                let currentTime = new Date().getTime()
                const assetPayload = req.body;
                const schema = Joi.object().keys({
                    serviceOrderId: Joi.string().required(),
                    assetId: Joi.string().required()
                })

                let result = Joi.validate(assetPayload, schema)
                console.log('[controllers][service][order]: JOi Result', result);

                if (result && result.hasOwnProperty('error') && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: result.error.message }
                        ],
                    });
                }

                // Now, check whether this service order is completed or not. If completed, we will soft delete the asset from assigned_parts table
                let serviceOrderResult = await knex.select().where({ id: assetPayload.serviceOrderId }).returning(['*']).transacting(trx).into('service_orders')

                serviceOrder = serviceOrderResult[0]
                if (String(serviceOrder.serviceOrderStatus).toUpperCase() === 'CMTD') {
                    // Now soft delete and return
                    let updatedAsset = await knex.update({ status: 'CMTD', updatedAt: currentTime }).where({ assetId: assetPayload.assetId, entityId: assetPayload.serviceOrderId, entityType: 'service_orders' }).returning(['*']).transacting(trx).into('assigned_assets')
                    //partResult = updatedPartResult[0]
                    trx.commit;
                    return res.status(200).json({
                        data: {
                            updatedAsset: updatedAsset
                        },
                        message: "Assigned asset status updated successfully !"
                    });

                }
                trx.commit
                return res.status(200).json({
                    data: {
                        updatedAsset: null
                    },
                    message: 'Asset status for this service order can not be updated because this service order is not completed yet.'
                })
            })


        } catch (err) {
            console.log('[controllers][service][order] :  Error', err);
            //trx.rollback
            return res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    exportServiceOrder: async (req, res) => {

        try {

            let {
                serviceRequestId,
                description,
                serviceOrderStatus,
                archive,
                location,
                assignedBy,
                serviceStartTime,
                serviceStopTime,
                createdAt,
                createdBy,
                requestedBy,
                completedBy,
                recurrenceType,
                assignedTo,
                completedFrom,
                dueFrom,
                completedTo,
                dueTo,
                createdFrom,
                createdTo,
                unit,
                serviceType
            } = req.body

            let reqData = req.query;
            let total, rows

            let pagination = {};
            let per_page = reqData.per_page || 10;
            let page = reqData.current_page || 1;
            if (page < 1) page = 1;
            let offset = (page - 1) * per_page;
            //let filter = 
            //let filters = 
            let filters = {}
            if (serviceRequestId) {
                filters['service_requests.id'] = serviceRequestId
            }
            if (description) {
                filters['service_requests.description'] = description;
            }

            if (serviceOrderStatus) {
                filters['service_orders.serviceOrderStatus'] = serviceOrderStatus
            }

            if (archive) {
                filters['service_orders.archive'] = archive
            }

            if (location) {
                filters['service_requests.location'] = location
            }

            if (createdBy) {
                filters['service_orders.createdBy'] = createdBy
            }

            if (assignedBy) {
                filters['service_orders.createdBy'] = assignedBy
            }

            if (requestedBy) {
                filters['service_orders.requestedBy'] = requestedBy
            }

            if (completedBy) {
                filters['service_orders.completedBy'] = completedBy
            }

            if (recurrenceType) {
                filters['service_orders.recurrenceType'] = recurrenceType
            }
            if (assignedTo) {
                filters['users.name'] = assignedTo
            }

            if (unit) {

            }
            if (serviceType) {
                filters['service_requests.serviceType'] = serviceType
            }

            if (serviceStartTime) {
                filters['service_orders.serviceStartTime'] = serviceStartTime
            }

            if (serviceStopTime) {
                filters['service_orders.serviceStopTime'] = serviceStopTime
            }


            // CreatedAt BETWEEN dates for created from - created to

            // orderDueDate - due from - to

            // completed on -> closed from - to
            let completedFromDate, completedToDate
            if (completedFrom && completedTo) {

                completedFromDate = new Date(completedFrom).getTime();
                completedToDate = new Date(completedTo).getTime();

            } else if (completedFrom && !completedTo) {

                completedFromDate = new Date(completedFrom).getTime();
                completedToDate = new Date("2030-01-01").getTime()

            } else if (!completedFrom && completedTo) {
                completedFromDate = new Date("2000-01-01").getTime();
                completedToDate = new Date(completedTo).getTime()
            }




            let dueFromDate, dueToDate
            if (dueFrom && dueTo) {

                dueFromDate = moment(dueFrom).format();
                dueToDate = moment(dueTo).format();
                console.log(dueFromDate)

            } else if (dueFrom && !dueTo) {

                dueFromDate = dueFrom;
                dueToDate = "2030-01-01"

            } else if (!dueFrom && dueTo) {
                dueFromDate = "2000-01-01";
                dueToDate = dueTo
            }


            let createdFromDate, createdToDate
            if (createdFrom && createdTo) {

                createdFromDate = new Date(createdFrom).getTime();
                createdToDate = new Date(createdTo).getTime();

            } else if (createdFrom && !createdTo) {

                createdFromDate = new Date(createdFrom).getTime();
                createdToDate = new Date("2030-01-01").getTime()

            } else if (!createdFrom && createdTo) {
                createdFromDate = new Date("2000-01-01").getTime();
                createdToDate = new Date(createdTo).getTime()
            }


            if ((dueFromDate && dueToDate) || (createdFromDate && createdToDate)) {


                [total, rows] = await Promise.all([
                    knex.count('* as count').from('service_orders')
                        .innerJoin('service_requests', 'service_orders.serviceRequestId', 'service_requests.id')
                        .innerJoin('service_problems', 'service_requests.id', 'service_problems.serviceRequestId')
                        .innerJoin('incident_categories', 'service_problems.categoryId', 'incident_categories.id')
                        .innerJoin('assigned_service_team', 'service_requests.id', 'assigned_service_team.entityId')
                        .innerJoin('users', 'assigned_service_team.userId', 'users.id')
                        .select([
                            'service_orders.id as So Id',
                            'service_requests.description as Description',
                            'service_requests.location as Location',
                            'service_requests.id as Sr Id',
                            'incident_categories.descriptionEng as Problem',
                            'priority as Priority',
                            'service_orders.createdBy as Created By',
                            'orderDueDate as Due Date',
                            'serviceOrderStatus as Status',
                            'service_orders.createdAt as Date Created'
                        ]).where((qb) => {

                            if (filters) {
                                qb.where(filters);
                            }
                            if (completedFromDate && completedToDate) {
                                qb.whereBetween('service_orders.completedOn', [completedFromDate, completedToDate])
                            }
                            if (dueFromDate && dueToDate) {
                                qb.whereBetween('service_orders.orderDueDate', [dueFromDate, dueToDate])
                            }
                            if (createdFromDate && createdToDate) {
                                qb.whereBetween('service_orders.createdAt', [createdFromDate, createdToDate])
                            }

                        }).groupBy(['service_requests.id', 'service_orders.id', 'service_problems.id', 'incident_categories.id', 'assigned_service_team.id', 'users.id']),
                    knex.from('service_orders')
                        .innerJoin('service_requests', 'service_orders.serviceRequestId', 'service_requests.id')
                        .innerJoin('service_problems', 'service_requests.id', 'service_problems.serviceRequestId')
                        .innerJoin('incident_categories', 'service_problems.categoryId', 'incident_categories.id')
                        .innerJoin('assigned_service_team', 'service_requests.id', 'assigned_service_team.entityId')
                        .innerJoin('users', 'assigned_service_team.userId', 'users.id')
                        .select([
                            'service_orders.id as So Id',
                            'service_requests.description as Description',
                            'service_requests.location as Location',
                            'service_requests.id as Sr Id',
                            'incident_categories.descriptionEng as Problem',
                            'priority as Priority',
                            'service_orders.createdBy as Created By',
                            'orderDueDate as Due Date',
                            'serviceOrderStatus as Status',
                            'service_orders.createdAt as Date Created'

                        ]).where((qb) => {

                            if (filters) {
                                qb.where(filters);
                            }
                            if (completedFromDate && completedToDate) {
                                qb.whereBetween('service_orders.completedOn', [completedFromDate, completedToDate])
                            }
                            if (dueFromDate && dueToDate) {
                                qb.whereBetween('service_orders.orderDueDate', [dueFromDate, dueToDate])
                            }
                            if (createdFromDate && createdToDate) {
                                qb.whereBetween('service_orders.createdAt', [createdFromDate, createdToDate])
                            }

                        }).offset(offset).limit(per_page)
                ])
            } else
                if (_.isEmpty(filters)) {
                    [total, rows] = await Promise.all([
                        knex.count('* as count').from('service_orders')
                            .innerJoin('service_requests', 'service_orders.serviceRequestId', 'service_requests.id')
                            .innerJoin('service_problems', 'service_requests.id', 'service_problems.serviceRequestId')
                            .innerJoin('incident_categories', 'service_problems.categoryId', 'incident_categories.id')
                            .select([
                                'service_orders.id as So Id',
                                'service_requests.description as Description',
                                'location as Location',
                                'service_requests.id as Sr Id',
                                'incident_categories.descriptionEng as Problem',
                                'priority as Priority',
                                'service_orders.createdBy as Created By',
                                'orderDueDate as Due Date',
                                'serviceOrderStatus as Status',
                                'service_orders.createdAt as Date Created'
                            ]).groupBy(['service_requests.id', 'service_orders.id', 'service_problems.id', 'incident_categories.id']),
                        knex.from('service_orders')
                            .innerJoin('service_requests', 'service_orders.serviceRequestId', 'service_requests.id')
                            .innerJoin('service_problems', 'service_requests.id', 'service_problems.serviceRequestId')
                            .innerJoin('incident_categories', 'service_problems.categoryId', 'incident_categories.id')
                            .select([
                                'service_orders.id as So Id',
                                'service_requests.description as Description',
                                'location as Location',
                                'service_requests.id as Sr Id',
                                'incident_categories.descriptionEng as Problem',
                                'priority as Priority',
                                'service_orders.createdBy as Created By',
                                'orderDueDate as Due Date',
                                'serviceOrderStatus as Status',
                                'service_orders.createdAt as Date Created'
                            ]).offset(offset).limit(per_page)
                    ])
                } else {
                    [total, rows] = await Promise.all([
                        knex.count('* as count').from('service_orders')
                            .innerJoin('service_requests', 'service_orders.serviceRequestId', 'service_requests.id')
                            .innerJoin('service_problems', 'service_requests.id', 'service_problems.serviceRequestId')
                            .innerJoin('incident_categories', 'service_problems.categoryId', 'incident_categories.id')
                            .innerJoin('assigned_service_team', 'service_requests.id', 'assigned_service_team.entityId')
                            .innerJoin('users', 'assigned_service_team.userId', 'users.id')
                            .select([
                                'service_orders.id as So Id',
                                'service_requests.description as Description',
                                'service_requests.location as Location',
                                'service_requests.id as Sr Id',
                                'incident_categories.descriptionEng as Problem',
                                'priority as Priority',
                                'service_orders.createdBy as Created By',
                                'orderDueDate as Due Date',
                                'serviceOrderStatus as Status',
                                'service_orders.createdAt as Date Created'
                            ]).where((qb) => {

                                if (filters) {
                                    qb.where(filters);
                                }
                                if (completedFromDate && completedToDate) {
                                    qb.whereBetween('service_orders.completedOn', [completedFromDate, completedToDate])
                                }
                                if (dueFromDate && dueToDate) {
                                    qb.whereBetween('service_orders.orderDueDate', [dueFromDate, dueToDate])
                                }
                                if (createdFromDate && createdToDate) {
                                    qb.whereBetween('service_orders.createdAt', [createdFromDate, createdToDate])
                                }

                            }).groupBy(['service_requests.id', 'service_orders.id', 'service_problems.id', 'incident_categories.id', 'assigned_service_team.id', 'users.id']),
                        knex.from('service_orders')
                            .innerJoin('service_requests', 'service_orders.serviceRequestId', 'service_requests.id')
                            .innerJoin('service_problems', 'service_requests.id', 'service_problems.serviceRequestId')
                            .innerJoin('incident_categories', 'service_problems.categoryId', 'incident_categories.id')
                            .innerJoin('assigned_service_team', 'service_requests.id', 'assigned_service_team.entityId')
                            .innerJoin('users', 'assigned_service_team.userId', 'users.id')
                            .select([
                                'service_orders.id as So Id',
                                'service_requests.description as Description',
                                'service_requests.location as Location',
                                'service_requests.id as Sr Id',
                                'incident_categories.descriptionEng as Problem',
                                'priority as Priority',
                                'service_orders.createdBy as Created By',
                                'orderDueDate as Due Date',
                                'serviceOrderStatus as Status',
                                'service_orders.createdAt as Date Created'

                            ]).where((qb) => {

                                if (filters) {
                                    qb.where(filters);
                                }
                                if (completedFromDate && completedToDate) {
                                    qb.whereBetween('service_orders.completedOn', [completedFromDate, completedToDate])
                                }
                                if (dueFromDate && dueToDate) {
                                    qb.whereBetween('service_orders.orderDueDate', [dueFromDate, dueToDate])
                                }
                                if (createdFromDate && createdToDate) {
                                    qb.whereBetween('service_orders.createdAt', [createdFromDate, createdToDate])
                                }

                            }).offset(offset).limit(per_page)
                    ])

                }

            var wb = XLSX.utils.book_new({ sheet: "Sheet JS" });
            var ws = XLSX.utils.json_to_sheet(rows);
            XLSX.utils.book_append_sheet(wb, ws, "pres");
            XLSX.write(wb, { bookType: "csv", bookSST: true, type: 'base64' })
            let filename = "uploads/ServiceOrder-" + Date.now() + ".csv";
            let check = XLSX.writeFile(wb, filename);

            return res.status(200).json({
                data: rows,
                message: "Service Order Data Export Successfully!"
            })


        } catch (err) {
            return res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            })
        }
    },
    getServiceOrderAssignedAssets: async (req, res) => {
        try {
            let { serviceOrderId } = req.body;
            let reqData = req.query;
            let total, rows;

            let pagination = {};
            let per_page = reqData.per_page || 10;
            let page = reqData.current_page || 1;
            if (page < 1) page = 1;
            let offset = (page - 1) * per_page;
            [total, rows] = await Promise.all([
                knex("assigned_assets")
                    .leftJoin(
                        "asset_master",
                        "assigned_assets.assetId",
                        "asset_master.id"
                    )
                    .leftJoin(
                        "asset_category_master",
                        "asset_master.assetCategoryId",
                        "asset_category_master.id"
                    )
                    // .leftJoin(
                    //   "assigned_assets",
                    //   "asset_master.id",
                    //   "assigned_assets.assetId"
                    // )
                    .leftJoin("companies", "asset_master.companyId", "companies.id")
                    .select([
                        "asset_master.id as id",
                        "asset_master.assetName as assetName",
                        "asset_master.model as model",
                        "asset_category_master.categoryName as categoryName",
                        "companies.companyName as companyName"
                    ])
                    .where({
                        entityType: "service_orders",
                        entityId: serviceOrderId,
                        "asset_master.orgId": req.orgId
                    }),

                knex("assigned_assets")
                    .leftJoin(
                        "asset_master",
                        "assigned_assets.assetId",
                        "asset_master.id"
                    )
                    .leftJoin(
                        "asset_category_master",
                        "asset_master.assetCategoryId",
                        "asset_category_master.id"
                    )

                    .leftJoin("companies", "asset_master.companyId", "companies.id")
                    // .leftJoin(
                    //   "asset_category_master",
                    //   "asset_master.assetCategoryId",
                    //   "asset_category_master.id"
                    // )
                    // .leftJoin(
                    //   "assigned_assets",
                    //   "asset_master.id",
                    //   "assigned_assets.entityId"
                    // )
                    // .leftJoin("companies", "asset_master.companyId", "companies.id")
                    .select([
                        "asset_master.id as id",
                        "asset_master.assetName as assetName",
                        "asset_master.model as model",
                        "asset_category_master.categoryName as categoryName",
                        "companies.companyName as companyName"
                    ])
                    .where({
                        entityType: "service_orders",
                        entityId: serviceOrderId,
                        "asset_master.orgId": req.orgId
                    })
                    .limit(per_page)
                    .offset(offset)
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
                    assets: pagination
                }
            });
        } catch (err) {
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    getNewServiceOrderId: async (req, res) => {
        try {
            const serviceOrder = await knex('service_orders').insert({}).returning(['*'])
            return res.status(200).json({
                data: {
                    serviceOrder
                },
                message: 'Service Order Generated successfully!'
            });
        } catch (err) {
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    addServiceAppointment: async (req, res) => {
        try {
            let serviceAppointment = null;
            let additionalUsers = [];
            let userId = req.me.id;
            let appointedTime;

            await knex.transaction(async trx => {
                let appointmentOrderPayload = req.body;
                let initialServiceAppointmentPayload = _.omit(appointmentOrderPayload, [
                    "additionalUsers",
                    "teamId",
                    "mainUserId"
                ]);

                const schema = Joi.object().keys({
                    serviceOrderId: Joi.string().required(),
                    appointedDate: Joi.string().required(),
                    appointedTime: Joi.string().required()
                });

                let result = Joi.validate(initialServiceAppointmentPayload, schema);
                console.log(
                    "[controllers][serviceorder][addServiceAppointment]: JOi Result",
                    result
                );

                if (result && result.hasOwnProperty("error") && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: "VALIDATION_ERROR", message: result.error.message }
                        ]
                    });
                }

                appointedTime = moment(initialServiceAppointmentPayload.appointedTime, 'HH:mm').hours() + ":" + moment(initialServiceAppointmentPayload.appointedTime, 'HH:mm').minutes();


                let currentTime = new Date().getTime();
                let insertServiceAppintmentData = {
                    ...initialServiceAppointmentPayload,
                    orgId: req.orgId,
                    status: 'Pending',
                    createdBy: userId,
                    createdAt: currentTime,
                    updatedAt: currentTime,
                    isActive: true,
                    appointedTime
                };
                // Insert into survey_orders table
                let surveyOrderResult = await knex
                    .insert(insertServiceAppintmentData)
                    .returning(["*"])
                    .transacting(trx)
                    .into("service_appointments");
                serviceAppointment = surveyOrderResult[0];

                // Insert into assigned_service_team table

                let assignedServiceTeamPayload = {
                    teamId: appointmentOrderPayload.teamId,
                    userId: appointmentOrderPayload.mainUserId,
                    entityId: serviceAppointment.id,
                    orgId: req.orgId,
                    entityType: "service_appointments",
                    createdAt: currentTime,
                    updatedAt: currentTime
                };

                const assignedServiceTeamResult = await knex
                    .insert(assignedServiceTeamPayload)
                    .returning(["*"])
                    .transacting(trx)
                    .into("assigned_service_team");
                assignedServiceTeam = assignedServiceTeamResult[0];

                // Insert into assigned_service_additional_users

                let assignedServiceAdditionalUsers = appointmentOrderPayload.additionalUsers;
                if (assignedServiceAdditionalUsers) {
                    for (user of assignedServiceAdditionalUsers) {
                        let userResult = await knex
                            .insert({
                                userId: user,
                                entityId: serviceAppointment.id,
                                entityType: "service_appointments",
                                orgId: req.orgId,
                                createdAt: currentTime,
                                updatedAt: currentTime
                            })
                            .returning(["*"])
                            .transacting(trx)
                            .into("assigned_service_additional_users");
                        additionalUsers.push(userResult[0]);
                    }
                }
                trx.commit;
                res.status(200).json({
                    data: {
                        serviceAppointment,
                        assignedServiceTeam,
                        assignedAdditionalUsers: additionalUsers,
                    },
                    message: "Service appointment created successfully !"
                });
            });
        } catch (err) {
            console.log("[controllers][surveyOrder][addSurveyOrder] :  Error", err);
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    getServiceAppointmentList: async (req, res) => {
        try {
            //const serviceOrders = await knex('service_orders').select();
            console.log('ORG ID: ************************************************: ', req.orgId)
            let { serviceOrderId } = req.body;
            let reqData = req.query;
            let total, rows

            let pagination = {};
            let per_page = reqData.per_page || 10;
            let page = reqData.current_page || 1;
            if (page < 1) page = 1;
            let offset = (page - 1) * per_page;

            [total, rows] = await Promise.all([
                knex.count('* as count').from('service_appointments')
                    .leftJoin('service_orders', 'service_appointments.serviceOrderId', 'service_orders.id')
                    .leftJoin('service_requests', 'service_orders.serviceRequestId', 'service_requests.id')
                    .leftJoin('users', 'service_appointments.createdBy', 'users.id')
                    .select([
                        'service_appointments.id as id',
                        'service_appointments.serviceOrderId as serviceOrderId',
                        'service_requests.priority as Priority',
                        'users.name as createdBy',
                        'service_appointments.appointedDate as appointedDate',
                        'service_appointments.appointedTime as appointedTime',
                        'service_appointments.createdAt as dateCreated',
                        'service_appointments.status as status',

                    ]).where({ 'service_appointments.orgId': req.orgId, 'service_appointments.serviceOrderId': serviceOrderId })
                    .groupBy(['service_appointments.id', 'service_requests.id', 'service_orders.id', 'users.id']),

                knex.from('service_appointments')
                    .leftJoin('service_orders', 'service_appointments.serviceOrderId', 'service_orders.id')
                    .leftJoin('service_requests', 'service_orders.serviceRequestId', 'service_requests.id')
                    .leftJoin('users', 'service_appointments.createdBy', 'users.id')
                    .select([
                        'service_appointments.id as id',
                        'service_appointments.serviceOrderId as serviceOrderId',
                        'service_requests.priority as Priority',
                        'users.name as createdBy',
                        'service_appointments.appointedDate as appointedDate',
                        'service_appointments.appointedTime as appointedTime',
                        'service_appointments.createdAt as dateCreated',
                        'service_appointments.status as status',
                        "service_orders.displayId as soNo"
                    ]).where({ 'service_appointments.orgId': req.orgId, 'service_appointments.serviceOrderId': serviceOrderId })
                    .groupBy(['service_appointments.id', 'service_requests.id', 'service_orders.id', 'users.id'])
                    .offset(offset).limit(per_page)
            ])

            const Parallel = require('async-parallel');

            rows = await Parallel.map(rows, async st => {

                let str = st.appointedTime;
                let appointedTime = str.substring(0, str.length - 3);

                return {
                    ...st,
                    appointedTime

                }

            })


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
                    service_appointment: pagination
                },
                message: 'Service Appointment List!'
            })
        } catch (err) {
            console.log('[controllers][serviceOrder][GetServiceAppointmenetList] :  Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    getServiceAppointmentDetails: async (req, res) => {
        try {

            await knex.transaction(async trx => {
                let serviceAppointmentId = req.body.serviceAppointmentId;
                let serviceRequestId = req.body.serviceRequestId;
                console.log("serviceAppointmentId", serviceAppointmentId);
                // Get Service Appointment Details
                let serviceAppointmentResult = await knex.select().where({ id: serviceAppointmentId }).returning(['*']).transacting(trx).into('service_appointments')

                // Get Service Request Details

                let serviceRequestResult = await knex.select().where({ id: serviceRequestId }).returning(['*']).transacting(trx).into('service_requests')


                // Get Team details based on ids provided
                let assignedServiceTeam = null
                if (serviceAppointmentId) {
                    assignedServiceTeam = await knex.select().where({ entityId: serviceAppointmentId, entityType: 'service_appointments' }).returning(['*']).transacting(trx).into('assigned_service_team')
                }

                let assignedServiceTeamUser = null
                if (assignedServiceTeam) {
                    assignedServiceTeamUser = await knex.select('name').where({ id: assignedServiceTeam[0]['userId'] }).returning(['*']).transacting(trx).into('users')
                }


                // Get additional users
                let additionalUsers = []
                if (serviceAppointmentId) {
                    additionalUsers = await knex.select().where({ entityId: serviceAppointmentId, entityType: 'service_appointments' }).returning(['*']).transacting(trx).into('assigned_service_additional_users')
                }

                res.status(200).json({
                    data: { serviceAppointment: serviceAppointmentResult[0], assignedServiceTeamUser, additionalUsers, serviceRequest: serviceRequestResult[0] },
                    message: "Service Appointment Details!"
                });
            })
        } catch (err) {
            console.log('[controllers][serviceOrder][GetServiceAppointmentsDetails] :  Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },

    updateServiceOrderNotes: async (req, res) => {
        // Define try/catch block
        try {
            let userId = req.me.id;
            let problemImagesData = [];

            await knex.transaction(async trx => {
                let upNotesPayload = _.omit(req.body, ["images"]);
                console.log(
                    "[controllers][quotation][updateNotes] : Request Body",
                    upNotesPayload
                );

                // validate keys
                const schema = Joi.object().keys({
                    serviceOrderId: Joi.number().required(),
                    description: Joi.string().required()
                });

                // let problemImages = upNotesPayload.problemsImages;
                // let noteImages = upNotesPayload.notesImages;
                // // validate params
                const result = Joi.validate(upNotesPayload, schema);

                if (result && result.hasOwnProperty("error") && result.error) {
                    res.status(400).json({
                        errors: [
                            { code: "VALIDATON ERRORS", message: result.message.error }
                        ]
                    });
                }

                const currentTime = new Date().getTime();
                // Insert into survey order post update table
                const insertData = {
                    serviceOrderId: upNotesPayload.serviceOrderId,
                    description: upNotesPayload.description,
                    orgId: req.orgId,
                    createdBy: userId,
                    createdAt: currentTime,
                    updatedAt: currentTime
                };
                console.log(
                    "[controllers][quotation][quotationPostNotes] : Insert Data ",
                    insertData
                );

                const resultSurveyNotes = await knex
                    .insert(insertData)
                    .returning(["*"])
                    .transacting(trx)
                    .into("service_orders_post_update");
                notesData = resultSurveyNotes;
                serviceOrderNoteId = notesData[0];

                // const Parallel = require('async-parallel');
                //  let notesResData = await Parallel.map(notesData, async item => {
                //       let username = await knex('users').where({ id: item.createdBy }).select('name');
                //       username = username[0].name;
                //       return notesData;
                //   });
                let usernameRes = await knex('users').where({ id: notesData[0].createdBy }).select('name')
                let username = usernameRes[0].name;
                notesData = { ...notesData[0], createdBy: username }

                /*INSERT IMAGE TABLE DATA OPEN */

                if (req.body.images && req.body.images.length) {
                    let imagesData = req.body.images;
                    for (image of imagesData) {
                        let d = await knex
                            .insert({
                                entityId: serviceOrderNoteId.id,
                                ...image,
                                entityType: "service_order_notes",
                                createdAt: currentTime,
                                updatedAt: currentTime,
                                orgId: req.orgId
                            })
                            .returning(["*"])
                            .transacting(trx)
                            .into("images");
                        problemImagesData.push(d[0]);
                    }
                }

                notesData = { ...notesData, s3Url: problemImagesData[0].s3Url }


                trx.commit;

                res.status(200).json({
                    data: {
                        serviceOrderNotesResponse: {
                            notesData: [notesData]
                        }
                    },
                    message: "Service Order Note updated successfully !"
                });
            });
        } catch (err) {
            console.log("[controllers][quotation][quotationPostNotes] : Error", err);
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    getServiceOrderNoteList: async (req, res) => {
        try {
            let serviceOrderNoteList = null;

            //await knex.transaction(async (trx) => {
            let serviceorder = req.body;

            const schema = Joi.object().keys({
                serviceOrderId: Joi.number().required()
            });
            let result = Joi.validate(serviceorder, schema);
            console.log(
                "[controllers][quotation][getquotationPostNotes]: JOi Result",
                result
            );

            if (result && result.hasOwnProperty("error") && result.error) {
                return res.status(400).json({
                    errors: [{ code: "VALIDATION_ERROR", message: result.error.message }]
                });
            }

            let serviceOrderId = serviceorder.serviceOrderId;
            let serviceOrderNoteResult = await knex.raw(`select "service_orders_post_update".*,"images"."s3Url","users"."name" as "createdBy" from "service_orders_post_update"  left join "users" on "service_orders_post_update"."createdBy" = "users"."id" left join "images" on "service_orders_post_update"."id" = "images"."entityId"  where "service_orders_post_update"."orgId" = ${req.orgId} and "service_orders_post_update"."serviceOrderId" = ${serviceOrderId} and "service_orders_post_update"."isActive" = 'true'`)

            serviceOrderNoteList = serviceOrderNoteResult.rows;

            return res.status(200).json({
                data: serviceOrderNoteList,
                message: "Service Order Details"
            });

            //});
        } catch (err) {
            console.log(
                "[controllers][quotation][getQuotationDetails] :  Error",
                err
            );
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    deleteServiceOrderRemark: async (req, res) => {
        try {
            let quotation = null;
            await knex.transaction(async trx => {
                let currentTime = new Date().getTime();
                const remarkPayload = req.body;
                const schema = Joi.object().keys({
                    remarkId: Joi.number().required()
                });

                let result = Joi.validate(remarkPayload, schema);
                console.log("[controllers][quotation]: JOi Result", result);

                if (result && result.hasOwnProperty("error") && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: "VALIDATION_ERROR", message: result.error.message }
                        ]
                    });
                }

                // Now soft delete and return
                let updatedRemark = await knex
                    .update({
                        isActive: "false",
                        updatedAt: currentTime,
                        orgId: req.orgId
                    })
                    .where({
                        id: remarkPayload.remarkId
                    })
                    .returning(["*"])
                    .transacting(trx)
                    .into("service_orders_post_update");

                trx.commit;

                return res.status(200).json({
                    data: {
                        deletedRemark: updatedRemark
                    },
                    message: "Service Order remarks deleted successfully !"
                });
            });
        } catch (err) {
            console.log("[controllers][quotation][remaks] :  Error", err);
            //trx.rollback
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    getServiceOrderDueDate: async (req, res) => {
        try {
            const soId = req.body.soId;
            const so = await knex('service_orders').select('orderDueDate', 'displayId').where({ id: soId }).first();
            if (so) {
                return res.status(200).json({
                    data: {
                        orderDueDate: so.orderDueDate,
                        displayId: so.displayId
                    }
                })
            }
            return res.status(200).json({
                data: {
                    orderDueDate: null
                }
            })
        } catch (err) {
            console.log(
                "[controllers][quotation][getQuotationDetails] :  Error",
                err
            );
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    updateAppointmentStatus: async (req, res) => {
        try {
            let serviceAppointmentId = req.body.data.serviceAppointmentId;
            let updateStatus = req.body.data.status;
            const currentTime = new Date().getTime();
            console.log('REQ>BODY&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&7', req.body)

            const status = await knex("service_appointments")
                .update({ status: updateStatus, approvedOn: currentTime, approvedBy: req.me.id })
                .where({ id: serviceAppointmentId });
            return res.status(200).json({
                data: {
                    status: updateStatus
                },
                message: "Appointment status updated successfully!"
            });
        } catch (err) {
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    getServiceOrderForReport: async (req, res) => {
        try {
            const payload = req.body;
            const accessibleProjects = req.userProjectResources[0].projects
            let sr = await knex.from("service_orders")
                .leftJoin("service_requests", "service_orders.serviceRequestId", "service_requests.id")

                .leftJoin(
                    "property_units",
                    "service_requests.houseId",
                    "property_units.id"
                )
                .leftJoin(
                    "service_status AS status",
                    "service_requests.serviceStatusCode",
                    "status.statusCode"
                )
                .leftJoin("users as u", "service_requests.requestedBy", "u.id")
                .leftJoin("buildings_and_phases", "property_units.buildingPhaseId", "buildings_and_phases.id")
                .leftJoin('companies', 'buildings_and_phases.companyId', 'companies.id')
                .leftJoin('projects', 'buildings_and_phases.projectId', 'projects.id')
                .leftJoin(
                    "service_problems",
                    "service_requests.id",
                    "service_problems.serviceRequestId"
                )
                .leftJoin('assigned_service_team', 'service_requests.id', 'assigned_service_team.entityId')
                .leftJoin('teams', 'assigned_service_team.teamId', 'teams.teamId')
                .leftJoin('users as mainUsers', 'assigned_service_team.userId', 'mainUsers.id')
                .leftJoin(
                    "incident_categories",
                    "service_problems.categoryId",
                    "incident_categories.id"
                )
                .leftJoin('incident_sub_categories', 'service_problems.problemId', 'incident_sub_categories.id')
                .leftJoin('incident_type', 'incident_sub_categories.incidentTypeId', 'incident_type.id')
                .leftJoin('users as c', 'service_requests.createdBy', 'c.id')
                .leftJoin('users as completedUser', 'service_requests.completedBy', 'completedUser.id')

                .select([
                    "service_requests.id as S Id",
                    "service_requests.houseId as houseId",
                    "service_requests.description as Description",
                    "service_requests.priority as Priority",
                    "service_requests.location as Location",
                    "status.descriptionEng as Status",
                    "property_units.unitNumber as Unit No",
                    // "requested_by.name as Requested By",
                    "service_requests.createdAt as Date Created",
                    "buildings_and_phases.buildingPhaseCode",
                    "buildings_and_phases.description as buildingDescription",
                    "incident_categories.descriptionEng as problemDescription",
                    // "requested_by.email as requestedByEmail",
                    "teams.teamName",
                    "teams.teamCode",
                    "mainUsers.name as mainUser",
                    "service_orders.id as SO Id",
                    "property_units.id as unitId",
                    "service_orders.orderDueDate",
                    'c.name as createdBy',
                    'service_requests.displayId as srNo',
                    'service_orders.displayId as soNo',
                    'service_orders.createdAt',
                    'service_requests.completedOn',
                    "incident_type.descriptionEng as problemType",
                    "incident_sub_categories.descriptionEng as subCategory",
                    "completedUser.name as completedBy"
                ])
                .groupBy([
                    "service_requests.id",
                    "status.id",
                    "u.id",
                    "property_units.id",
                    "buildings_and_phases.id",
                    "service_problems.id",
                    // "requested_by.id",
                    "assigned_service_team.id",
                    "teams.teamId",
                    "mainUsers.id",
                    "incident_categories.id",
                    "service_orders.id",
                    "c.id",
                    "incident_type.id",
                    "incident_sub_categories.id",
                    "completedUser.id"

                ])
                .where(qb => {
                    qb.where({ "service_requests.orgId": req.orgId })

                    if (payload.fromDate && payload.toDate) {
                        qb.whereBetween('service_orders.orderDueDate', [payload.fromDate, payload.toDate])
                    }
                    if (payload.teamId && payload.teamId.length) {
                        qb.whereIn('teams.teamId', payload.teamId)
                    }
                    if (payload.buildingId && payload.buildingId.length) {
                        qb.whereIn('buildings_and_phases.id', payload.buildingId)
                    }
                    if (payload.companyId) {
                        qb.where('companies.id', '=', payload.companyId)
                    }
                    if (payload.projectId) {
                        qb.where('projects.id', '=', payload.projectId)
                    }
                    if (payload.categoryId & payload.categoryId.length) {
                        qb.whereIn('incident_categories.id', payload.categoryId)
                    }
                    if (payload.status && payload.status.length) {
                        qb.whereIn('status.statusCode', payload.status)
                    }

                    if (payload.requestBy) {
                        qb.where('service_requests.requestedBy', payload.requestBy)
                    }

                    if (payload.completeFromDate && payload.completeToDate) {
                        qb.whereBetween('service_requests.completedOn', [payload.completeFromDate, payload.completeToDate])
                    }

                    if (payload.createFromDate && payload.createToDate) {
                        qb.whereBetween('service_orders.createdAt', [payload.createFromDate, payload.createToDate])
                    }
                })
                .whereIn('service_requests.projectId', accessibleProjects)
                .distinct('service_requests.id')
                .orderBy('service_requests.id', 'desc')


            const Parallel = require('async-parallel')
            let srWithTenant = await Parallel.map(sr, async pd => {


                let tagsResult = [];
                tagsResult = await knex('location_tags')
                    .leftJoin('location_tags_master', 'location_tags.locationTagId', 'location_tags_master.id')
                    .where({ 'location_tags.entityId': pd['S Id'], 'location_tags.entityType': 'service_requests', 'location_tags.orgId': req.orgId });

                tagsResult = _.uniqBy(tagsResult, 'title');
                tagsResult = tagsResult.map(v => v.title);
                let tag = tagsResult.toString();


                let houseResult = await knex.from('user_house_allocation').select('userId').where({ houseId: pd.unitId }).first().orderBy('id', 'desc')

                if (houseResult) {
                    let tetantResult = await knex.from('users').select('name').where({ id: houseResult.userId }).first()
                    return {
                        ...pd,
                        "Tenant Name": tetantResult.name,
                        tags: tag
                    }
                } else {
                    return {
                        ...pd,
                        "Tenant Name": '',
                        tags: tag

                    }
                }

            })


            let filterStatus = sr.filter(v => v.Status != "Cancel")


            let serviceIds = filterStatus.map(it => it.id);

            let serviceProblem = await knex.from('service_problems')
                .leftJoin('service_requests', 'service_problems.serviceRequestId', 'service_requests.id')
                .leftJoin('incident_categories', 'service_problems.categoryId', 'incident_categories.id')
                .leftJoin('incident_sub_categories', 'service_problems.problemId', 'incident_sub_categories.id')
                .leftJoin('incident_type', 'incident_sub_categories.incidentTypeId', 'incident_type.id')
                .select([
                    'service_problems.serviceRequestId',
                    'service_problems.problemId',
                    'service_problems.categoryId',
                    'service_problems.serviceRequestId',
                    'incident_type.typeCode as problemTypeCode',
                    'incident_type.descriptionEng as problemType',
                    'incident_categories.categoryCode',
                    'incident_categories.descriptionEng as category',
                    'incident_sub_categories.descriptionEng as subCategory',
                    'service_requests.serviceStatusCode',
                ])
                .whereIn('service_problems.serviceRequestId', serviceIds)
                .where({ 'service_problems.orgId': req.orgId })
                .orderBy('incident_type.typeCode', 'asc');

            let mapData = _.chain(serviceProblem).groupBy('categoryId').map((value, key) => ({
                category: key,
                serviceOrder: value.length,
                value: value[0]
            }))



            let arr = [];
            let totalServiceOrder = 0;

            for (let md of mapData) {

                totalServiceOrder += Number(md.serviceOrder)
                arr.push({
                    totalServiceOrder,
                    serviceOrder: md.serviceOrder,
                    problemTypeCode: md.value.problemTypeCode,
                    problemType: md.value.problemType,
                    categoryCode: md.value.categoryCode,
                    category: md.value.category,
                    subCategory: md.value.subCategory,
                })
            }


            return res.status(200).json({
                data: {
                    service_requests: srWithTenant,
                    problemData: _.orderBy(arr, "totalServiceOrder", "asc")

                }
            })
        } catch (err) {
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    // Get List of Satisfaction

    getSatisfactionList: async (req, res) => {
        try {
            let pagination = {};
            let rows = await knex("satisfaction")
                .where({ "satisfaction.orgId": req.orgId })
                .select([
                    "satisfaction.id",
                    "satisfaction.satisfactionCode as satisfactionCode",
                    "satisfaction.descriptionEng as descriptionEnglish",
                    "satisfaction.descriptionThai as descriptionThai"
                ])
                .orderBy('satisfaction.sequenceNo', 'ASC')

            pagination = rows;

            res.status(200).json({
                data: {
                    satisfaction: pagination
                },
                message: "Satisfaction list successfully!"
            });
        } catch (err) {
            console.log("[controllers][satisfaction][getSatisfactionList] :  Error", err);
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    /*GET SERVICE ORDER REPORT */
    getServiceOrderReport: async (req, res) => {

        try {

            let meData = req.me;
            let payload = req.query;
            const schema = Joi.object().keys({
                id: Joi.string().required()
            });

            const result = Joi.validate(payload, schema);
            console.log("[controllers][service][problem]: JOi Result", result);

            if (result && result.hasOwnProperty("error") && result.error) {
                return res.status(400).json({
                    errors: [
                        { code: "VALIDATION_ERROR", message: result.error.message }
                    ]
                });
            }

            let serviceOrderResult = await knex('service_orders')
                .leftJoin('service_requests', 'service_orders.serviceRequestId', 'service_requests.id')
                .leftJoin('companies', 'service_requests.companyId', 'companies.id')
                .leftJoin('projects', 'service_requests.projectId', 'projects.id')
                .leftJoin('property_units', 'service_requests.houseId', 'property_units.id')
                .leftJoin('buildings_and_phases', 'property_units.buildingPhaseId', 'buildings_and_phases.id')
                .leftJoin('requested_by', 'service_requests.requestedBy', 'requested_by.id')
                .leftJoin('service_problems', 'service_requests.id', 'service_problems.serviceRequestId')
                .leftJoin('incident_categories', 'service_problems.categoryId', 'incident_categories.id')
                .leftJoin('incident_sub_categories', 'service_problems.problemId', 'incident_sub_categories.id')
                .select([
                    'service_orders.*',
                    'companies.companyId',
                    'companies.companyName',
                    'companies.companyAddressEng',
                    'companies.logoFile',
                    'projects.project as ProjectCode',
                    'projects.projectName',
                    'buildings_and_phases.buildingPhaseCode',
                    'buildings_and_phases.description as BuildingDescription',
                    'requested_by.name as requestedByUser',
                    'service_requests.serviceStatusCode',
                    'service_requests.priority',
                    'requested_by.name as requestedByUser',
                    'service_requests.description',
                    'incident_sub_categories.descriptionEng as subCategory',

                ])
                .where({ 'service_orders.id': payload.id }).first()


            let partResult = await knex('assigned_parts')
                .leftJoin('part_master', 'assigned_parts.partId', 'part_master.id')
                .leftJoin('part_category_master', 'part_master.partCategory', 'part_category_master.id')
                .select([
                    'assigned_parts.*',
                    'part_master.*',
                    'part_category_master.*',
                    'assigned_parts.createdAt as requestedAt'
                ])
                .where({ 'assigned_parts.entityId': payload.id })


            return res.status(200).json({
                data: { ...serviceOrderResult, partResult, printedBy: meData },
                message: "Service Order Report Successfully!",
            });


        } catch (err) {

            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    /*GET PROBLEM CATEGORY REPORT */
    getProblemCategoryReport: async (req, res) => {

        try {

            let payload = req.body;
            let fromDate = payload.fromDate;
            let toDate = payload.toDate;

            let fromNewDate = moment(fromDate).startOf('date').format();
            let toNewDate = moment(toDate).endOf('date', 'days').format();
            let fromTime = new Date(fromNewDate).getTime();
            let toTime = new Date(toNewDate).getTime();
            let serviceResult;
            let filterProblem;
            let buildingType = "";

            if (payload.buildingId) {

            } else {
                buildingType = "All";
            }



            if (payload.type == "SR") {



                serviceResult = await knex('service_requests')
                    .leftJoin('companies', 'service_requests.companyId', 'companies.id')
                    .leftJoin('projects', 'service_requests.projectId', 'projects.id')
                    .leftJoin('property_units', 'service_requests.houseId', 'property_units.id')
                    .leftJoin('buildings_and_phases', 'property_units.buildingPhaseId', 'buildings_and_phases.id')
                    //.leftJoin('service_problems', 'service_requests.id', 'service_problems.serviceRequestId')
                    // .leftJoin('incident_categories', 'service_problems.categoryId', 'incident_categories.id')
                    // .leftJoin('incident_sub_categories', 'service_problems.problemId', 'incident_sub_categories.id')
                    // .leftJoin('incident_type', 'incident_sub_categories.incidentTypeId', 'incident_type.id')
                    .select([
                        'service_requests.*',
                        //'service_problems.problemId',
                        //'service_problems.categoryId',
                        //'incident_type.typeCode as problemTypeCode',
                        //'incident_type.descriptionEng as problemType',
                        //'incident_categories.categoryCode',
                        //'incident_categories.descriptionEng as category',
                        //'incident_sub_categories.descriptionEng as subCategory',
                        'companies.companyId as companyCode',
                        'companies.companyName',
                        'companies.logoFile',
                        'projects.project as ProjectCode',
                        'projects.projectName',
                        'buildings_and_phases.buildingPhaseCode',
                        'buildings_and_phases.description as BuildingDescription',
                    ])
                    .whereBetween('service_requests.createdAt', [fromDate, toDate])
                    .where(qb => {

                        if (payload.companyId) {
                            qb.where({ 'service_requests.companyId': payload.companyId })
                        }

                        if (payload.projectId) {
                            qb.where({ 'service_requests.projectId': payload.projectId })

                        } else {

                        }

                        if (payload.buildingId) {

                            qb.where({ 'buildings_and_phases.id': payload.buildingId })

                        } else {

                        }


                        if (payload.status.length > 0) {


                            if (payload.status.includes("C") || payload.status.includes("O") ||
                                payload.status.includes("A") || payload.status.includes("US") || payload.status.includes("IP") ||
                                payload.status.includes("OH") || payload.status.includes("COM")) {

                                qb.whereIn('service_requests.serviceStatusCode', payload.status)


                            } else {

                            }

                        }

                        // if (payload.status) {

                        //     qb.whereIn('service_requests.serviceStatusCode', payload.status)

                        // }

                        qb.where({ 'service_requests.moderationStatus': true, 'service_requests.orgId': req.orgId })

                    })

                let serviceIds = serviceResult.map(it => it.id);

                let serviceProblem = await knex.from('service_problems')
                    .leftJoin('service_requests', 'service_problems.serviceRequestId', 'service_requests.id')
                    .leftJoin('incident_categories', 'service_problems.categoryId', 'incident_categories.id')
                    .leftJoin('incident_sub_categories', 'service_problems.problemId', 'incident_sub_categories.id')
                    .leftJoin('incident_type', 'incident_sub_categories.incidentTypeId', 'incident_type.id')
                    .select([
                        'service_problems.problemId',
                        'service_problems.categoryId',
                        'incident_type.typeCode as problemTypeCode',
                        'incident_type.descriptionEng as problemType',
                        'incident_categories.categoryCode',
                        'incident_categories.descriptionEng as category',
                        'incident_sub_categories.descriptionEng as subCategory',
                        'service_requests.serviceStatusCode',
                    ])
                    .whereIn('service_problems.serviceRequestId', serviceIds)
                    .where({ 'service_problems.orgId': req.orgId })
                    .orderBy('incident_type.typeCode', 'asc');



                let serviceProblem2 = await knex.from('service_problems')
                    .leftJoin('service_requests', 'service_problems.serviceRequestId', 'service_requests.id')
                    .leftJoin('incident_categories', 'service_problems.categoryId', 'incident_categories.id')
                    .leftJoin('incident_sub_categories', 'service_problems.problemId', 'incident_sub_categories.id')
                    .leftJoin('incident_type', 'incident_sub_categories.incidentTypeId', 'incident_type.id')
                    .select([
                        "incident_categories.categoryCode",
                        "service_problems.serviceRequestId",
                        "incident_categories.descriptionEng",
                        "service_requests.serviceStatusCode"
                    ])
                    .whereIn('service_problems.serviceRequestId', serviceIds)
                    .where({ 'service_problems.orgId': req.orgId })
                    .orderBy('incident_type.typeCode', 'asc');

                filterProblem = serviceProblem2.filter(v => v.serviceStatusCode == 'COM')


                let mapData = _.chain(serviceProblem)
                    .groupBy("categoryId")
                    .map((value, key) => ({
                        category: key,
                        serviceOrder: value.length,
                        value: value[0],
                        allValue: value,
                        workDone: value.map(ite => ite.serviceStatusCode).filter(v => v == 'COM').length,
                        percentage: (100 * value.map(ite => ite.serviceStatusCode).filter(v => v == 'COM').length / value.length).toFixed(2)
                    }))
                    .value()


                let final = [];
                let grouped = _.groupBy(serviceProblem2, "categoryCode");

                final.push(grouped);

                // let chartData = _.flatten(
                //     final
                //         .filter(v => !_.isEmpty(v))
                //         .map(v => _.keys(v).map(p => ({ [p]: (100 * v[p].map(ite => ite.serviceStatusCode).filter(v => v == 'COM').length / v[p].length).toFixed(2) })))
                // ).reduce((a, p) => {
                //     let l = _.keys(p)[0];
                //     if (a[l]) {
                //         a[l] += p[l];

                //     } else {
                //         a[l] = p[l];
                //     }
                //     return a;
                // }, {});

                // let chartData = _.flatten(
                //     final
                //         .filter(v => !_.isEmpty(v))
                //         .map(v => _.keys(v).map(p => ({ [p]: (100 * v[p].length / serviceProblem2.length).toFixed(2) })))
                // ).reduce((a, p) => {
                //     let l = _.keys(p)[0];
                //     if (a[l]) {
                //         a[l] += p[l];

                //     } else {
                //         a[l] = p[l];
                //     }
                //     return a;
                // }, {});


                let chartData = _.flatten(
                    final
                        .filter(v => !_.isEmpty(v))
                        .map(v => _.keys(v).map(p => ({
                            [p]: (v[p].length)
                        })))
                ).reduce((a, p) => {
                    let l = _.keys(p)[0];
                    if (a[l]) {
                        a[l] += p[l];

                    } else {
                        a[l] = p[l];
                    }
                    return a;
                }, {});




                /*Work done percentage open */
                // let workDoneChartData = _.flatten(
                //     final
                //         .filter(v => !_.isEmpty(v))
                //         .map(v => _.keys(v).map(p => ({ [p]: (100 * v[p].map(ite => ite.serviceStatusCode).filter(v => v == 'COM').length / filterProblem.length).toFixed(2) })))
                // ).reduce((a, p) => {
                //     let l = _.keys(p)[0];
                //     if (a[l]) {
                //         a[l] += p[l];

                //     } else {
                //         a[l] = p[l];
                //     }
                //     return a;
                // }, {});


                let workDoneChartData = _.flatten(
                    final
                        .filter(v => !_.isEmpty(v))
                        .map(v => _.keys(v).map(p => ({
                            [p]: (v[p].map(ite => ite.serviceStatusCode).filter(v => v == 'COM').length)
                        })))
                ).reduce((a, p) => {
                    let l = _.keys(p)[0];
                    if (a[l]) {
                        a[l] += p[l];

                    } else {
                        a[l] = p[l];
                    }
                    return a;
                }, {});
                /*Work done percentage close */




                let totalServiceOrder = 0;
                let totalWorkDone = 0;
                let totalPercentage = 0;
                const Parallel = require('async-parallel');
                serviceResult = await Parallel.map(mapData, async item => {

                    totalServiceOrder += Number(item.serviceOrder);
                    totalWorkDone += Number(item.workDone);
                    totalPercentage = 100 * totalWorkDone / totalServiceOrder;


                    return {
                        ...serviceResult[0],
                        fromDate,
                        toDate,
                        serviceOrder: item,
                        totalServiceOrder: totalServiceOrder,
                        totalWorkDone: totalWorkDone,
                        totalPercentage: (totalPercentage).toFixed(2),
                        chartData,
                        reportType: "SR",
                        buildingType,
                        workDoneChartData,
                        totalServiceRequest: serviceProblem2.length,
                        totalDone: filterProblem.length
                    };

                })



            } else {

                serviceResult = await knex('service_orders')
                    .leftJoin('service_requests', 'service_orders.serviceRequestId', 'service_requests.id')
                    .leftJoin('companies', 'service_requests.companyId', 'companies.id')
                    .leftJoin('projects', 'service_requests.projectId', 'projects.id')
                    .leftJoin('property_units', 'service_requests.houseId', 'property_units.id')
                    .leftJoin('buildings_and_phases', 'property_units.buildingPhaseId', 'buildings_and_phases.id')
                    .select([
                        'service_requests.*',
                        'companies.companyId as companyCode',
                        'companies.companyName',
                        'companies.logoFile',
                        'projects.project as ProjectCode',
                        'projects.projectName',
                        'buildings_and_phases.buildingPhaseCode',
                        'buildings_and_phases.description as BuildingDescription',
                        'service_orders.serviceRequestId'
                    ])
                    .whereBetween('service_orders.createdAt', [fromDate, toDate])
                    .where(qb => {

                        if (payload.companyId) {
                            qb.where({ 'service_requests.companyId': payload.companyId })
                        }

                        if (payload.projectId) {
                            qb.where({ 'service_requests.projectId': payload.projectId })

                        } else {

                        }

                        if (payload.buildingId) {

                            qb.where({ 'buildings_and_phases.id': payload.buildingId })

                        } else {

                        }

                        if (payload.status.length > 0) {


                            if (payload.status.includes("C") || payload.status.includes("O") ||
                                payload.status.includes("A") || payload.status.includes("US") || payload.status.includes("IP") ||
                                payload.status.includes("OH") || payload.status.includes("COM")) {

                                qb.whereIn('service_requests.serviceStatusCode', payload.status)

                            } else {

                            }

                        }

                        qb.where({ 'service_requests.moderationStatus': true, 'service_requests.orgId': req.orgId })

                    })
                // .where({
                //     'service_requests.companyId': payload.companyId, 'service_requests.projectId': payload.projectId,
                //     'buildings_and_phases.id': payload.buildingId, 'service_requests.moderationStatus': true, 'service_requests.orgId': req.orgId
                // });

                let serviceIds = serviceResult.map(it => it.serviceRequestId);


                // let serviceProblem = await knex.from('service_problems')
                //     .leftJoin('service_requests', 'service_problems.serviceRequestId', 'service_requests.id')
                //     .leftJoin('incident_categories', 'service_problems.categoryId', 'incident_categories.id')
                //     .leftJoin('incident_sub_categories', 'service_problems.problemId', 'incident_sub_categories.id')
                //     .leftJoin('incident_type', 'incident_sub_categories.incidentTypeId', 'incident_type.id')
                //     .select([
                //         'service_problems.problemId',
                //         'service_problems.categoryId',
                //         'incident_type.typeCode as problemTypeCode',
                //         'incident_type.descriptionEng as problemType',
                //         'incident_categories.categoryCode',
                //         'incident_categories.descriptionEng as category',
                //         'incident_sub_categories.descriptionEng as subCategory',
                //         'service_requests.serviceStatusCode',
                //     ])
                //     .whereIn('service_problems.serviceRequestId', serviceIds)
                //     .where({ 'service_problems.orgId': req.orgId })
                //     .orderBy('categoryCode', 'asc');


                // let serviceProblem2 = await knex.from('service_problems')
                //     .leftJoin('service_requests', 'service_problems.serviceRequestId', 'service_requests.id')
                //     .leftJoin('incident_categories', 'service_problems.categoryId', 'incident_categories.id')
                //     .leftJoin('incident_sub_categories', 'service_problems.problemId', 'incident_sub_categories.id')
                //     .leftJoin('incident_type', 'incident_sub_categories.incidentTypeId', 'incident_type.id')
                //     .select([
                //         "incident_categories.categoryCode",
                //         "service_problems.serviceRequestId",
                //         "incident_categories.descriptionEng",
                //         "service_requests.serviceStatusCode"
                //     ])
                //     .whereIn('service_problems.serviceRequestId', serviceIds)
                //     .where({ 'service_problems.orgId': req.orgId });


                // let mapData = _.chain(serviceProblem)
                //     .groupBy("categoryId")
                //     .map((value, key) => ({
                //         category: key, serviceOrder: value.length, value: value[0],
                //         allValue: value, workDone: value.map(ite => ite.serviceStatusCode).filter(v => v == 'COM').length,
                //         percentage: 100 * value.map(ite => ite.serviceStatusCode).filter(v => v == 'COM').length / value.length
                //     }))
                //     .value()



                // let final = [];
                // let grouped = _.groupBy(serviceProblem2, "categoryCode");

                // final.push(grouped);

                // let chartData = _.flatten(
                //     final
                //         .filter(v => !_.isEmpty(v))
                //         .map(v => _.keys(v).map(p => ({ [p]: 100 * v[p].map(ite => ite.serviceStatusCode).filter(v => v == 'COM').length / v[p].length })))
                // ).reduce((a, p) => {
                //     let l = _.keys(p)[0];
                //     if (a[l]) {
                //         a[l] += p[l];

                //     } else {
                //         a[l] = p[l];
                //     }
                //     return a;
                // }, {});


                // let totalServiceOrder = 0;
                // let totalWorkDone = 0;
                // let totalPercentage = 0;
                // const Parallel = require('async-parallel');
                // serviceResult = await Parallel.map(mapData, async item => {

                //     return {
                //         ...serviceResult[0], fromDate, toDate, serviceOrder: item, totalServiceOrder: totalServiceOrder,
                //         totalWorkDone: totalWorkDone, totalPercentage: totalPercentage, chartData, reportType: "SO"
                //     };

                // })


                let serviceProblem = await knex.from('service_problems')
                    .leftJoin('service_requests', 'service_problems.serviceRequestId', 'service_requests.id')
                    .leftJoin('incident_categories', 'service_problems.categoryId', 'incident_categories.id')
                    .leftJoin('incident_sub_categories', 'service_problems.problemId', 'incident_sub_categories.id')
                    .leftJoin('incident_type', 'incident_sub_categories.incidentTypeId', 'incident_type.id')
                    .select([
                        'service_problems.problemId',
                        'service_problems.categoryId',
                        'incident_type.typeCode as problemTypeCode',
                        'incident_type.descriptionEng as problemType',
                        'incident_categories.categoryCode',
                        'incident_categories.descriptionEng as category',
                        'incident_sub_categories.descriptionEng as subCategory',
                        'service_requests.serviceStatusCode',
                    ])
                    .whereIn('service_problems.serviceRequestId', serviceIds)
                    .where({ 'service_problems.orgId': req.orgId })
                    .orderBy('incident_type.typeCode', 'asc');



                let serviceProblem2 = await knex.from('service_problems')
                    .leftJoin('service_requests', 'service_problems.serviceRequestId', 'service_requests.id')
                    .leftJoin('incident_categories', 'service_problems.categoryId', 'incident_categories.id')
                    .leftJoin('incident_sub_categories', 'service_problems.problemId', 'incident_sub_categories.id')
                    .leftJoin('incident_type', 'incident_sub_categories.incidentTypeId', 'incident_type.id')
                    .select([
                        "incident_categories.categoryCode",
                        "service_problems.serviceRequestId",
                        "incident_categories.descriptionEng",
                        "service_requests.serviceStatusCode"
                    ])
                    .whereIn('service_problems.serviceRequestId', serviceIds)
                    .where({ 'service_problems.orgId': req.orgId })
                    .orderBy('incident_type.typeCode', 'asc');


                filterProblem = serviceProblem2.filter(v => v.serviceStatusCode == 'COM')


                let mapData = _.chain(serviceProblem)
                    .groupBy("categoryId")
                    .map((value, key) => ({
                        category: key,
                        serviceOrder: value.length,
                        value: value[0],
                        allValue: value,
                        workDone: value.map(ite => ite.serviceStatusCode).filter(v => v == 'COM').length,
                        percentage: (100 * value.map(ite => ite.serviceStatusCode).filter(v => v == 'COM').length / value.length).toFixed(2)
                    }))
                    .value()


                let final = [];
                let grouped = _.groupBy(serviceProblem2, "categoryCode");

                final.push(grouped);

                // let chartData = _.flatten(
                //     final
                //         .filter(v => !_.isEmpty(v))
                //         .map(v => _.keys(v).map(p => ({ [p]: (100 * v[p].length / serviceProblem2.length).toFixed(2) })))
                // ).reduce((a, p) => {
                //     let l = _.keys(p)[0];
                //     if (a[l]) {
                //         a[l] += p[l];

                //     } else {
                //         a[l] = p[l];
                //     }
                //     return a;
                // }, {});


                let chartData = _.flatten(
                    final
                        .filter(v => !_.isEmpty(v))
                        .map(v => _.keys(v).map(p => ({
                            [p]: (v[p].length)
                        })))
                ).reduce((a, p) => {
                    let l = _.keys(p)[0];
                    if (a[l]) {
                        a[l] += p[l];

                    } else {
                        a[l] = p[l];
                    }
                    return a;
                }, {});




                /*Work done percentage open */
                // let workDoneChartData = _.flatten(
                //     final
                //         .filter(v => !_.isEmpty(v))
                //         .map(v => _.keys(v).map(p => ({ [p]: (100 * v[p].map(ite => ite.serviceStatusCode).filter(v => v == 'COM').length / filterProblem.length).toFixed(2) })))
                // ).reduce((a, p) => {
                //     let l = _.keys(p)[0];
                //     if (a[l]) {
                //         a[l] += p[l];

                //     } else {
                //         a[l] = p[l];
                //     }
                //     return a;
                // }, {});


                let workDoneChartData = _.flatten(
                    final
                        .filter(v => !_.isEmpty(v))
                        .map(v => _.keys(v).map(p => ({
                            [p]: (v[p].map(ite => ite.serviceStatusCode).filter(v => v == 'COM').length)
                        })))
                ).reduce((a, p) => {
                    let l = _.keys(p)[0];
                    if (a[l]) {
                        a[l] += p[l];

                    } else {
                        a[l] = p[l];
                    }
                    return a;
                }, {});

                /*Work done percentage close */

                let totalServiceOrder = 0;
                let totalWorkDone = 0;
                let totalPercentage = 0;
                const Parallel = require('async-parallel');
                serviceResult = await Parallel.map(mapData, async item => {

                    totalServiceOrder += Number(item.serviceOrder);
                    totalWorkDone += Number(item.workDone);
                    totalPercentage = 100 * totalWorkDone / totalServiceOrder;


                    return {
                        ...serviceResult[0],
                        fromDate,
                        toDate,
                        serviceOrder: item,
                        totalServiceOrder: totalServiceOrder,
                        totalWorkDone: totalWorkDone,
                        totalPercentage: (totalPercentage).toFixed(2),
                        chartData,
                        reportType: "SO",
                        buildingType,
                        workDoneChartData,
                        totalServiceRequest: serviceProblem2.length,
                        totalDone: filterProblem.length
                    };

                })


            }

            return res.status(200).json({
                data: serviceResult,
                message: "Problem Category Report Successfully!",
            });


        } catch (err) {

            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },

    /*GET SO COST REPORT */

    getSoCostReport: async (req, res) => {


        const accessibleProjects = req.userProjectResources[0].projects;
        let payload = req.body;

        let month;

        if (Number(payload.startMonth) <= 9) {

            month = "0" + Number(payload.startMonth);

        } else {
            month = Number(payload.startMonth);
        }

        let period = payload.startYear + "-" + month;

        let rows = await knex
            .from("service_orders")
            .leftJoin(
                "service_requests",
                "service_orders.serviceRequestId",
                "service_requests.id"
            )
            .leftJoin(
                "service_problems",
                "service_requests.id",
                "service_problems.serviceRequestId"
            )
            .leftJoin(
                "incident_categories",
                "service_problems.categoryId",
                "incident_categories.id"
            )
            .leftJoin(
                "assigned_service_team",
                "service_requests.id",
                "assigned_service_team.entityId"
            )
            .leftJoin(
                "users",
                "assigned_service_team.userId",
                "users.id"
            )
            .leftJoin("service_status AS status", "service_requests.serviceStatusCode", "status.statusCode")
            .leftJoin("users AS u", "service_requests.createdBy", "u.id")
            .leftJoin('teams', 'assigned_service_team.teamId', 'teams.teamId')
            .leftJoin('property_units', 'service_requests.houseId', 'property_units.id')
            .leftJoin('buildings_and_phases', 'property_units.buildingPhaseId', 'buildings_and_phases.id')
            .leftJoin('requested_by', 'service_requests.requestedBy', 'requested_by.id')
            // .leftJoin('user_house_allocation', 'service_requests.houseId', 'user_house_allocation.houseId')
            // .leftJoin('users as assignUser', 'user_house_allocation.userId', 'assignUser.id')
            .leftJoin('companies', 'service_orders.companyId', 'companies.id')
            .leftJoin('projects', 'property_units.projectId', 'projects.id')

            .select([
                "service_orders.id as soId",
                "service_requests.description",
                "service_requests.location",
                "service_requests.id as srId",
                "incident_categories.descriptionEng as problem",
                "priority as priority",
                "u.name as createdBy",
                'service_requests.houseId as houseId',
                "orderDueDate as dueDate",
                "status.descriptionEng as status",
                "service_orders.createdAt as dateCreated",
                "buildings_and_phases.description as buildingName",
                "users.userName as assignedMainUser",
                "teams.teamName as teamName",
                "requested_by.name as requestedBy",
                "property_units.unitNumber as unitNumber",
                "property_units.id as unitId",
                "service_orders.displayId as soNo",
                "service_requests.displayId as srNo",
                "companies.companyName",
                "companies.companyId",
                "projects.project",
                "projects.projectName",
                "service_orders.id",
                "service_requests.createdAt as serviceCreatedDate"


                // "assignUser.name as Tenant Name"

            ])
            .where(qb => {
                qb.where({ "service_orders.orgId": req.orgId });
                qb.whereIn('service_requests.projectId', accessibleProjects)
                qb.whereNot('service_requests.serviceStatusCode', 'C')



                if (payload.companyId) {

                    if (payload.companyId == "all") {

                    } else {
                        qb.where('service_requests.companyId', payload.companyId.id);
                    }
                }
                if (payload.projectId) {

                    if (payload.projectId == "all") {

                    } else {

                        qb.where('service_requests.projectId', payload.projectId.id);
                    }
                }


                if (payload.teamId) {

                    if (payload.teamId == "all") {

                    } else {

                        //let team = payload.teamId.map(v => v.teamId);
                        qb.where('teams.teamId', payload.teamId.teamId);
                    }
                }

                if (payload.startYear && payload.startMonth) {

                    qb.whereRaw(`to_char(to_timestamp(service_requests."createdAt"/1000),'YYYY-MM')='${period}'`)

                }

            }).groupBy([
                "service_requests.id",
                "service_orders.id",
                "service_problems.id",
                "incident_categories.id",
                "assigned_service_team.id",
                "users.id",
                "u.id",
                "status.id",
                'buildings_and_phases.id',
                'teams.teamId',
                'requested_by.id',
                'property_units.id',
                "companies.id",
                "projects.id",
                // "assignUser.id",
                // "user_house_allocation.id"
            ])
            .orderBy('service_orders.id', 'desc');


        const Parallel = require('async-parallel');
        let a = 0;
        const final = await Parallel.map(_.uniqBy(rows, 'id'), async (st) => {

            let partDataResult = await knex.from('assigned_parts')
                .leftJoin('part_master', 'assigned_parts.partId', 'part_master.id')
                .select([
                    'assigned_parts.*',
                    'part_master.partName',
                    'part_master.partCode',
                    'part_master.unitOfMeasure',
                ])
                .where(qb => {

                })
                .where({
                    'assigned_parts.orgId': req.orgId,
                    'assigned_parts.entityId': st.id,
                    'assigned_parts.entityType': 'service_orders'
                })

            let chargeDataResult = await knex.from('assigned_service_charges')
                .leftJoin('charge_master', 'assigned_service_charges.chargeId', 'charge_master.id')
                .select([
                    'assigned_service_charges.*',
                    'charge_master.chargeCode',
                    'charge_master.descriptionThai',
                    'charge_master.descriptionEng',
                    'charge_master.calculationUnit'

                ])
                .where(qb => {

                })
                .where({
                    'assigned_service_charges.orgId': req.orgId,
                    'assigned_service_charges.entityId': st.id,
                    'assigned_service_charges.entityType': 'service_orders'
                })


            let updatePartData = [];
            let updateChargeData = [];
            let totalCost;
            let unitPrice;

            let i = 0;
            for (let d of partDataResult) {


                i++;

                unitPrice = d.avgUnitPrice;
                totalCost = d.quantity * d.avgUnitPrice;

                updatePartData.push({ ...d, totalCost: totalCost, unitPrice: unitPrice })
            }

            let tagsResult = [];
            tagsResult = await knex('location_tags')
                .leftJoin('location_tags_master', 'location_tags.locationTagId', 'location_tags_master.id')
                .where({ 'location_tags.entityId': st.srId, 'location_tags.entityType': 'service_requests', 'location_tags.orgId': req.orgId })
                .where(qb => {

                    // if (payload.tags && payload.tags.length) {

                    //     if (payload.tags.includes('all')) {

                    //     } else {

                    //         let tag = payload.tags.map(v => v.id);

                    //         qb.whereIn('location_tags.locationTagId', tag);
                    //     }

                    // }
                })

            tagsResult = _.uniqBy(tagsResult, 'title');
            tagsResult = tagsResult.map(v => v.title);
            let tag;
            tag = tagsResult.toString();

            let chargeTotalCost;
            let chargeUnitPrice;
            let chargeTotalPrice;
            let chargeQuantity;

            let j = 0;
            for (let charge of chargeDataResult) {

                j++;

                chargeQuantity = charge.totalHours;
                chargeUnitPrice = charge.rate;
                chargeTotalCost = charge.totalHours * charge.rate;

                updateChargeData.push({ ...charge, chargeTotalCost: chargeTotalCost, chargeUnitPrice: chargeUnitPrice, chargeQuantity: chargeQuantity })

            }


            let totalRowSpan = 0;

            totalRowSpan = Number(updatePartData.length) + Number(updateChargeData.length);

            return {
                partData: updatePartData,
                createdAt: st.createdAt,
                srNo: st.srNo,
                soNo: st.soNo,
                srCreated: st.serviceCreatedDate,
                tags: tag,
                chargeData: updateChargeData,
                rowSpan: totalRowSpan,
                status: st.status

            }
        })




        return res.status(200).json({
            data: final,
            message: "So cost report Successfully!",
        });

    }
}

module.exports = serviceOrderController;