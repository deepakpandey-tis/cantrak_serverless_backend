const Joi = require('@hapi/joi');
const _ = require('lodash');
const moment = require("moment")

const knex = require('../db/knex');
const XLSX = require('xlsx');



const serviceOrderController = {
    addServiceOrder: async (req, res) => {
        try {
            let serviceOrder = null;
            let images = null
            await knex.transaction(async trx => {


                let serviceOrderPayload = req.body;
                images = req.body.images
                let serviceRequestId = req.body.serviceRequestId
                let serviceRequest = { id: req.body.serviceRequestId };
                serviceOrderPayload = _.omit(serviceOrderPayload, ['serviceRequest', 'teamId', 'mainUserId', 'additionalUsers', 'images'])

                const schema = Joi.object().keys({
                    serviceRequestId: Joi.number().required(),
                    orderDueDate: Joi.date().required()
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


                // Insert into service_orders

                let inserServiceOrderPayload = {
                  ...serviceOrderPayload,
                  orderDueDate: new Date(serviceOrderPayload.orderDueDate).getTime(),
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
                    images = req.body.images.map(image => ({ ...image, createdAt: currentTime, updatedAt: currentTime, entityId: serviceOrder.id, entityType: 'service_orders',orgId:req.orgId }));
                    let addedImages = await knex.insert(images).returning(['*']).transacting(trx).into('images')
                    images = addedImages
                }

                // Insert into assigned_service_team table
                let { teamId, mainUserId, additionalUsers } = req.body;
                const assignedServiceTeamPayload = { teamId, userId: mainUserId, entityId: serviceOrder.id, entityType: 'service_orders', createdAt: currentTime, updatedAt: currentTime,orgId:req.orgId }
                let assignedServiceTeamResult = await knex.insert(assignedServiceTeamPayload).returning(['*']).transacting(trx).into('assigned_service_team')
                let assignedServiceTeam = assignedServiceTeamResult[0]


                let assignedServiceAdditionalUsers = additionalUsers

                let selectedUsers = await knex.select().where({ entityId: serviceOrder.id, entityType: 'service_orders' }).returning(['*']).transacting(trx).into('assigned_service_additional_users').map(user => user.userId)

                let additionalUsersResultantArray = []

                if (_.isEqual(selectedUsers, assignedServiceAdditionalUsers)) {
                    // trx.commit
                    trx.commit;
                    res.status(200).json({
                        data: { serviceOrder, serviceRequest, assignedServiceTeam },
                        message: "Service Order added successfully !"
                    });
                } else {

                    // Remove old users

                    for (user of selectedUsers) {
                        await knex
                          .del()
                          .where({
                            entityId: serviceOrder.id,
                            entityType: "service_orders",
                            orgId: req.orgId
                          })
                          .returning(["*"])
                          .transacting(trx)
                          .into("assigned_service_additional_users");
                    }

                    // Insert New Users

                    for (user of assignedServiceAdditionalUsers) {
                        let userResult = await knex
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
                        additionalUsersResultantArray.push(userResult[0])
                    }
                    trx.commit;
                    return res.status(200).json({
                        data: { serviceOrder, assignedServiceTeam, assignedAdditionalUsers: additionalUsersResultantArray, images: images },
                        message: "Service Order added successfully!"
                    });
                }





            })
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
            console.log('ORG ID: ************************************************: ',req.orgId)
            let { serviceRequestId,
                description,
                serviceOrderStatus,
                archive,
                location,assignedBy, 
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
                serviceType } = req.body

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

            if(assignedBy){
                filters['service_orders.createdBy'] = assignedBy
            }

            if (requestedBy) {
                filters['service_orders.requestedBy'] = requestedBy
            }

            if (completedBy) {
                filters['service_orders.completedBy'] = completedBy
            }

            if(recurrenceType){
                filters['service_orders.recurrenceType'] = recurrenceType
            }
            if(assignedTo){
                filters['users.name'] = assignedTo
            }

            if(unit){

            }
            if(serviceType){
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


            if((dueFromDate && dueToDate) || (createdFromDate && createdToDate)){
               
            
                [total, rows] = await Promise.all([
                    knex.count('* as count').from('service_orders')
                        .leftJoin('service_requests', 'service_orders.serviceRequestId', 'service_requests.id')
                        .leftJoin('service_problems', 'service_requests.id', 'service_problems.serviceRequestId')
                        .leftJoin('incident_categories', 'service_problems.categoryId', 'incident_categories.id')
                        .leftJoin('assigned_service_team','service_requests.id','assigned_service_team.entityId')
                        .leftJoin('users','assigned_service_team.userId','users.id')
                        .select([
                            'service_orders.id as So Id',
                            'service_requests.description as Description',
                            'service_requests.location as Location',
                            'service_requests.id as Sr Id', 
                            'incident_categories.descriptionEng as Problem',
                            'priority as Priority',
                            'service_requests.createdBy as Created By',
                             'orderDueDate as Due Date',
                             'serviceStatusCode as Status',
                            'service_orders.createdAt as Date Created'
                        ]).where((qb) => {
                            qb.where({ 'service_orders.orgId': req.orgId });

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

                        }).groupBy(['service_requests.id', 'service_orders.id', 'service_problems.id', 'incident_categories.id','assigned_service_team.id','users.id']),
                    knex.from('service_orders')
                        .leftJoin('service_requests', 'service_orders.serviceRequestId', 'service_requests.id')
                        .leftJoin('service_problems', 'service_requests.id', 'service_problems.serviceRequestId')
                        .leftJoin('incident_categories', 'service_problems.categoryId', 'incident_categories.id')
                        .leftJoin('assigned_service_team','service_requests.id','assigned_service_team.entityId')
                        .leftJoin('users','assigned_service_team.userId','users.id')
                        .select([
                            'service_orders.id as So Id',
                            'service_requests.description as Description',
                            'service_requests.location as Location',
                            'service_requests.id as Sr Id', 
                            'incident_categories.descriptionEng as Problem',
                            'priority as Priority',
                            'service_requests.createdBy as Created By',
                             'orderDueDate as Due Date',
                             'serviceStatusCode as Status',
                            'service_orders.createdAt as Date Created'
                            
                        ]).where((qb) => {
                            qb.where({'service_orders.orgId':req.orgId})
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
            else
            if (_.isEmpty(filters)) {
                [total, rows] = await Promise.all([
                  knex
                    .count("* as count")
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
                    .select([
                      "service_orders.id as So Id",
                      "service_requests.description as Description",
                      "location as Location",
                      "service_requests.id as Sr Id",
                      "incident_categories.descriptionEng as Problem",
                      "priority as Priority",
                      "service_requests.createdBy as Created By",

                      //   "service_orders.createdBy as Created By",
                      "orderDueDate as Due Date",
                      "serviceStatusCode as Status",
                      "service_orders.createdAt as Date Created"
                    ])
                    .groupBy([
                      "service_requests.id",
                      "service_orders.id",
                      "service_problems.id",
                      "incident_categories.id"
                    ])
                    .where({ "service_orders.orgId": req.orgId }),
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
                    .select([
                      "service_orders.id as So Id",
                      "service_requests.description as Description",
                      "location as Location",
                      "service_requests.id as Sr Id",
                      "incident_categories.descriptionEng as Problem",
                      "priority as Priority",
                      "service_requests.createdBy as Created By",
                    //   "service_orders.createdBy as Created By",
                      "orderDueDate as Due Date",
                      "serviceStatusCode as Status",
                      "service_orders.createdAt as Date Created"
                    ])
                    .offset(offset)
                    .limit(per_page)
                    .where({ "service_orders.orgId": req.orgId })
                ]);
            } else {
                [total, rows] = await Promise.all([
                  knex
                    .count("* as count")
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
                    .select([
                      "service_orders.id as So Id",
                      "service_requests.description as Description",
                      "service_requests.location as Location",
                      "service_requests.id as Sr Id",
                      "incident_categories.descriptionEng as Problem",
                      "priority as Priority",
                      "service_requests.createdBy as Created By",
                      "orderDueDate as Due Date",
                      "serviceStatusCode as Status",
                      "service_orders.createdAt as Date Created"
                    ])
                    .where(qb => {
                      qb.where({ "service_orders.orgId": req.orgId });

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
                    })
                    .groupBy([
                      "service_requests.id",
                      "service_orders.id",
                      "service_problems.id",
                      "incident_categories.id",
                      "assigned_service_team.id",
                      "users.id"
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
                    .select([
                      "service_orders.id as So Id",
                      "service_requests.description as Description",
                      "service_requests.location as Location",
                      "service_requests.id as Sr Id",
                      "incident_categories.descriptionEng as Problem",
                      "priority as Priority",
                      "service_requests.createdBy as Created By",

                      "orderDueDate as Due Date",
                      "serviceStatusCode as Status",
                      "service_orders.createdAt as Date Created"
                    ])
                    .where(qb => {
                      qb.where({ "service_orders.orgId": req.orgId });

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
                    })
                    .offset(offset)
                    .limit(per_page)
                ]);

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
            await knex.transaction(async trx => {
                let serviceOrder = null;
                let team = null;
                let additionalUsers = []
                let currentTime = new Date().getTime();
                const id = req.body.serviceOrderId;
                const serviceRequestId = req.body.serviceRequestId
                const serviceOrderPayload = req.body;


                let updateData = { updatedAt: currentTime }
                serviceOrder = await knex.update(updateData).where({ id: id }).returning(['*']).transacting(trx).into('service_orders');


                // Check if previous teamId is equal to new team id
                let teamResult = await knex.select().where({ entityId: id, entityType: 'service_orders' }).returning(['*']).transacting(trx).into('assigned_service_team').map(team => team.id)

                if (!_.isEqual(teamResult, [req.body.teamId])) {

                    // Delete previous TeamId
                    await knex.del().where({ entityId: id, entityType: 'service_orders' }).returning(['*']).transacting(trx).into('assigned_service_team')

                    // Add new teamId
                    let insertData = { createdAt: currentTime, updatedAt: currentTime, entityId: id, entityType: 'service_orders', teamId: serviceOrderPayload.teamId, userId: serviceOrderPayload.mainUserId }
                    let teamRes = await knex.insert(insertData).returning(['*']).transacting(trx).into('assigned_service_team')
                    team = teamRes[0]
                }







                let assignedServiceAdditionalUsers = serviceOrderPayload.additionalUsers;
                let selectedUsers = [];

                selectedUsers = await knex.select().where({ entityId: id, entityType: 'service_orders' }).returning(['*']).transacting(trx).into('assigned_service_additional_users').map(user => user.userId)
                if (selectedUsers.length === 0) {
                    selectedUsers = await knex.select().where({ entityId: serviceRequestId, entityType: 'service_requests' }).returning(['*']).transacting(trx).into('assigned_service_additional_users').map(user => user.userId)
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
                    }

                    // Insert New Users

                    for (user of assignedServiceAdditionalUsers) {
                        let userResult = await knex.insert({ userId: user, entityId: id, entityType: 'service_orders', createdAt: currentTime, updatedAt: currentTime }).returning(['*']).transacting(trx).into('assigned_service_additional_users')
                        additionalUsers.push(userResult[0])
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
            let assignedPart = null;

            await knex.transaction(async trx => {

                let assignedPartPayload = req.body;
                let schema = Joi.object().keys({
                    partId: Joi.string().required(),
                    unitCost: Joi.string().required(),
                    quantity: Joi.string().required(),
                    status: Joi.string().required(),
                    serviceOrderId: Joi.string().required()
                })


                let result = Joi.validate(assignedPartPayload, schema)
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

                let assignedPartInsertPayload = _.omit(assignedPartPayload, ['serviceOrderId'])

                let insertData = { ...assignedPartInsertPayload, entityId: assignedPartPayload.serviceOrderId, entityType: 'service_orders', createdAt: currentTime, updatedAt: currentTime }
                let partResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('assigned_parts')
                assignedPart = partResult[0]
                trx.commit

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

                let insertData = { ...assignedAssetInsertPayload, entityId: assignedAssetPayload.serviceOrderId, entityType: 'service_orders', createdAt: currentTime, updatedAt: currentTime, orgId:req.orgId }
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
    exportServiceOrder:async (req,res)=>{
        
        try{ 
          
            let { serviceRequestId,
                description,
                serviceOrderStatus,
                archive,
                location,assignedBy, 
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
                serviceType } = req.body

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

            if(assignedBy){
                filters['service_orders.createdBy'] = assignedBy
            }

            if (requestedBy) {
                filters['service_orders.requestedBy'] = requestedBy
            }

            if (completedBy) {
                filters['service_orders.completedBy'] = completedBy
            }

            if(recurrenceType){
                filters['service_orders.recurrenceType'] = recurrenceType
            }
            if(assignedTo){
                filters['users.name'] = assignedTo
            }

            if(unit){

            }
            if(serviceType){
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


            if((dueFromDate && dueToDate) || (createdFromDate && createdToDate)){
               
            
                [total, rows] = await Promise.all([
                    knex.count('* as count').from('service_orders')
                        .innerJoin('service_requests', 'service_orders.serviceRequestId', 'service_requests.id')
                        .innerJoin('service_problems', 'service_requests.id', 'service_problems.serviceRequestId')
                        .innerJoin('incident_categories', 'service_problems.categoryId', 'incident_categories.id')
                        .innerJoin('assigned_service_team','service_requests.id','assigned_service_team.entityId')
                        .innerJoin('users','assigned_service_team.userId','users.id')
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

                        }).groupBy(['service_requests.id', 'service_orders.id', 'service_problems.id', 'incident_categories.id','assigned_service_team.id','users.id']),
                    knex.from('service_orders')
                        .innerJoin('service_requests', 'service_orders.serviceRequestId', 'service_requests.id')
                        .innerJoin('service_problems', 'service_requests.id', 'service_problems.serviceRequestId')
                        .innerJoin('incident_categories', 'service_problems.categoryId', 'incident_categories.id')
                        .innerJoin('assigned_service_team','service_requests.id','assigned_service_team.entityId')
                        .innerJoin('users','assigned_service_team.userId','users.id')
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
            else
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
                        .innerJoin('assigned_service_team','service_requests.id','assigned_service_team.entityId')
                        .innerJoin('users','assigned_service_team.userId','users.id')
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

                        }).groupBy(['service_requests.id', 'service_orders.id', 'service_problems.id', 'incident_categories.id','assigned_service_team.id','users.id']),
                    knex.from('service_orders')
                        .innerJoin('service_requests', 'service_orders.serviceRequestId', 'service_requests.id')
                        .innerJoin('service_problems', 'service_requests.id', 'service_problems.serviceRequestId')
                        .innerJoin('incident_categories', 'service_problems.categoryId', 'incident_categories.id')
                        .innerJoin('assigned_service_team','service_requests.id','assigned_service_team.entityId')
                        .innerJoin('users','assigned_service_team.userId','users.id')
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
    
            var wb = XLSX.utils.book_new({sheet:"Sheet JS"});
            var ws = XLSX.utils.json_to_sheet(rows);
            XLSX.utils.book_append_sheet(wb, ws, "pres");
            XLSX.write(wb, {bookType:"csv", bookSST:true, type: 'base64'})
            let filename = "uploads/ServiceOrder-"+Date.now()+".csv";
            let  check = XLSX.writeFile(wb,filename);
            
                return res.status(200).json({
                    data:rows,
                    message:"Service Order Data Export Successfully!"
                })
                
            
         } catch(err){
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
    getNewServiceOrderId:async (req,res) => {
      try {
        const serviceOrder = await knex('service_orders').insert({}).returning(['*'])
        return res.status(200).json({
          data: {
            serviceOrder
          },
          message:'Service Order Generated successfully!'
        });
      } catch(err) {
          return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
          }); 
      }
  }
}

module.exports = serviceOrderController;