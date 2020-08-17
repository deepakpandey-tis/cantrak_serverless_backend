const Joi = require('@hapi/joi');
const _ = require('lodash');
const moment = require("moment")

const knex = require('../../db/knex');
const XLSX = require('xlsx');



const serviceAppointmentController = {

    getServiceAppointmentList: async (req, res) => {
        try {
            let serviceAppointmentData = null;
            let reqData = req.query;
            let total, rows
            let pagination = {};

            console.log("customerInfo", req.me.id);
            console.log("customerHouseInfo", req.me.houseIds);
            let houseIds = req.me.houseIds;

            let serviceRequestData = await knex.from("service_requests")
                .select('id')
                .whereIn("service_requests.houseId", houseIds)

            let serviceRequestIds = serviceRequestData.map(v => v.id)//[userHouseId.houseId];

            let serviceOrderData = await knex.from("service_orders")
                .select('id')
                .whereIn("service_orders.serviceRequestId", serviceRequestIds)

            let serviceOrderIds = serviceOrderData.map(v => v.id)//[userHouseId.houseId];


            let { serviceAppointmentId,
                serviceOrderId,
                status } = req.body;

            if (serviceAppointmentId || serviceOrderId || status) {

                let per_page = reqData.per_page || 10;
                let page = reqData.current_page || 1;
                if (page < 1) page = 1;
                let offset = (page - 1) * per_page;

                [total, rows] = await Promise.all([
                    knex.from("service_appointments")
                        .leftJoin('service_orders', 'service_appointments.serviceOrderId', 'service_orders.id')
                        .leftJoin('service_requests', 'service_orders.serviceRequestId', 'service_requests.id')
                        .leftJoin('users', 'service_appointments.createdBy', 'users.id')
                        .where({ 'service_appointments.orgId': req.orgId })
                        .whereIn("service_appointments.serviceOrderId", serviceOrderIds)
                        .where(qb => {
                            if (serviceAppointmentId) {
                                qb.where('service_appointments.id', serviceAppointmentId)
                            }
                            if (serviceOrderId) {
                                qb.where('service_appointments.serviceOrderId', serviceOrderId)
                            }
                            if (status) {
                                qb.where('service_appointments.status', status)
                            }
                        })
                        .groupBy(['service_appointments.id', 'service_requests.id', 'service_orders.id', 'users.id']),
                    //.first(),
                    //.innerJoin('part_master', 'part_ledger.partId', 'part_master.id').first(),
                    knex.from('service_appointments')
                        .leftJoin('service_orders', 'service_appointments.serviceOrderId', 'service_orders.id')
                        .leftJoin('service_requests', 'service_orders.serviceRequestId', 'service_requests.id')
                        .leftJoin('users', 'service_appointments.createdBy', 'users.id')
                        .where({ 'service_appointments.orgId': req.orgId })
                        .whereIn("service_appointments.serviceOrderId", serviceOrderIds)
                        .groupBy(['service_appointments.id', 'service_requests.id', 'service_orders.id', 'users.id'])
                        .select([
                            'service_appointments.id as id',
                            'service_appointments.serviceOrderId as serviceOrderId',
                            'service_requests.priority as Priority',
                            'service_requests.id as SRID',
                            'service_orders.id as SOID',
                            'users.name as createdBy',
                            'service_appointments.appointedDate as appointedDate',
                            'service_appointments.createdAt as dateCreated',
                            'service_appointments.status as status',
                            'service_orders.displayId as soNo'

                        ])
                        .where(qb => {
                            if (serviceAppointmentId) {
                                qb.where('service_appointments.id', serviceAppointmentId)
                            }
                            if (serviceOrderId) {
                                qb.where('service_orders.displayId', serviceOrderId)
                            }
                            if (status) {
                                qb.where('service_appointments.status', status)
                            }
                        })
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


            } else {

                let per_page = reqData.per_page || 10;
                let page = reqData.current_page || 1;
                if (page < 1) page = 1;
                let offset = (page - 1) * per_page;

                [total, rows] = await Promise.all([
                    knex.from("service_appointments")
                        .leftJoin('service_orders', 'service_appointments.serviceOrderId', 'service_orders.id')
                        .leftJoin('service_requests', 'service_orders.serviceRequestId', 'service_requests.id')
                        .leftJoin('users', 'service_appointments.createdBy', 'users.id')
                        .where({ 'service_appointments.orgId': req.orgId })
                        .whereIn("service_appointments.serviceOrderId", serviceOrderIds)
                        .groupBy(['service_appointments.id', 'service_requests.id', 'service_orders.id', 'users.id'])
                        .distinct('service_appointments.id'),
                    //.first(),
                    //.innerJoin('part_master', 'part_ledger.partId', 'part_master.id').first(),
                    knex.from('service_appointments')
                        .leftJoin('service_orders', 'service_appointments.serviceOrderId', 'service_orders.id')
                        .leftJoin('service_requests', 'service_orders.serviceRequestId', 'service_requests.id')
                        .leftJoin('users', 'service_appointments.createdBy', 'users.id')
                        .select([
                            'service_appointments.id as id',
                            'service_appointments.serviceOrderId as serviceOrderId',
                            'service_requests.priority as Priority',
                            'service_requests.id as SRID',
                            'service_orders.id as SOID',
                            'users.name as createdBy',
                            'service_appointments.appointedDate as appointedDate',
                            'service_appointments.createdAt as dateCreated',
                            'service_appointments.status as status',
                            'service_orders.displayId as soNo'
                        ])
                        .where({ 'service_appointments.orgId': req.orgId })
                        .whereIn("service_appointments.serviceOrderId", serviceOrderIds)
                        .groupBy(['service_appointments.id', 'service_requests.id', 'service_orders.id', 'users.id'])
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

            }

            return res.status(200).json({
                data: pagination,
                message: 'Parts List!'
            })

        } catch (err) {
            console.log('[controllers][parts][getParts] :  Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    getServiceAppointmentListOld: async (req, res) => {
        try {
            //const serviceOrders = await knex('service_orders').select();
            console.log("customerInfo", req.me.id);
            console.log("customerHouseInfo", req.me.houseIds);
            let houseIds = req.me.houseIds;

            let serviceRequestData = await knex.from("service_requests")
                .select('id')
                .whereIn("service_requests.houseId", houseIds)

            let serviceRequestIds = serviceRequestData.map(v => v.id)//[userHouseId.houseId];

            let serviceOrderData = await knex.from("service_orders")
                .select('id')
                .whereIn("service_orders.serviceRequestId", serviceRequestIds)

            let serviceOrderIds = serviceOrderData.map(v => v.id)//[userHouseId.houseId];

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
                        'service_requests.id as SRID',
                        'service_orders.id as SOID',
                        'users.name as createdBy',
                        'service_appointments.appointedDate as appointedDate',
                        'service_appointments.createdAt as dateCreated',
                        'service_appointments.status as status'
                    ]).where({ 'service_appointments.orgId': req.orgId })
                    .whereIn("service_appointments.serviceOrderId", serviceOrderIds)
                    .groupBy(['service_appointments.id', 'service_requests.id', 'service_orders.id', 'users.id']),

                knex.from('service_appointments')
                    .leftJoin('service_orders', 'service_appointments.serviceOrderId', 'service_orders.id')
                    .leftJoin('service_requests', 'service_orders.serviceRequestId', 'service_requests.id')
                    .leftJoin('users', 'service_appointments.createdBy', 'users.id')
                    .select([
                        'service_appointments.id as id',
                        'service_appointments.serviceOrderId as serviceOrderId',
                        'service_requests.priority as Priority',
                        'service_requests.id as SRID',
                        'service_orders.id as SOID',
                        'users.name as createdBy',
                        'service_appointments.appointedDate as appointedDate',
                        'service_appointments.createdAt as dateCreated',
                        'service_appointments.status as status'
                    ]).where({ 'service_appointments.orgId': req.orgId })
                    .whereIn("service_appointments.serviceOrderId", serviceOrderIds)
                    .groupBy(['service_appointments.id', 'service_requests.id', 'service_orders.id', 'users.id'])
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
    getServiceOrderList: async (req, res) => {
        try {
            //const serviceOrders = await knex('service_orders').select();
            console.log('ORG ID: ************************************************: ', req.orgId)
            let { serviceRequestId,
                description,
                serviceOrderStatus,
                archive,
                location, assignedBy,
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
            //                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            const accessibleProjects = req.userProjectResources[0].projects


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
                        .leftJoin('service_requests', 'service_orders.serviceRequestId', 'service_requests.id')
                        .leftJoin('service_problems', 'service_requests.id', 'service_problems.serviceRequestId')
                        .leftJoin('incident_categories', 'service_problems.categoryId', 'incident_categories.id')
                        .leftJoin('assigned_service_team', 'service_requests.id', 'assigned_service_team.entityId')
                        .leftJoin('users', 'assigned_service_team.userId', 'users.id')
                        .leftJoin("service_status AS status", "service_requests.serviceStatusCode", "status.statusCode")
                        .leftJoin("users AS u", "service_requests.createdBy", "u.id")
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
                            "service_orders.displayId as soNo",
                            "service_requests.displayId as srNo"
                        ]).where((qb) => {
                            qb.where({ 'service_orders.orgId': req.orgId });
                            //qb.whereIn('service_requests.projectId', accessibleProjects)
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

                        }).groupBy(['service_requests.id', 'service_orders.id', 'service_problems.id', 'incident_categories.id', 'assigned_service_team.id', 'users.id', 'u.id', 'status.id']),

                    knex.from('service_orders')
                        .leftJoin('service_requests', 'service_orders.serviceRequestId', 'service_requests.id')
                        .leftJoin('service_problems', 'service_requests.id', 'service_problems.serviceRequestId')
                        .leftJoin('incident_categories', 'service_problems.categoryId', 'incident_categories.id')
                        .leftJoin('assigned_service_team', 'service_requests.id', 'assigned_service_team.entityId')
                        .leftJoin('users', 'assigned_service_team.userId', 'users.id')
                        .leftJoin("service_status AS status", "service_requests.serviceStatusCode", "status.statusCode")
                        .leftJoin("users AS u", "service_requests.createdBy", "u.id")
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
                            "service_orders.displayId as soNo",
                            "service_requests.displayId as srNo"




                        ]).where((qb) => {
                            qb.where({ 'service_orders.orgId': req.orgId })
                            // qb.whereIn('service_requests.projectId', accessibleProjects)
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
                            .leftJoin("service_status AS status", "service_requests.serviceStatusCode", "status.statusCode")
                            .leftJoin("users AS u", "service_requests.createdBy", "u.id")

                            .select([
                                "service_orders.id as So Id",
                                "service_requests.description as Description",
                                "service_requests.location as Location",
                                "service_requests.id as Sr Id",
                                "incident_categories.descriptionEng as Problem",
                                "priority as Priority",

                                //   "service_orders.createdBy as Created By",
                                "orderDueDate as Due Date",
                                'u.name as Created By',
                                'status.descriptionEng as Status',
                                'service_orders.createdAt as Date Created',
                                'service_requests.houseId as houseId',
                                "service_orders.displayId as soNo",
                                "service_requests.displayId as srNo"


                            ])
                            .groupBy([
                                "service_requests.id",
                                "service_orders.id",
                                "service_problems.id",
                                "incident_categories.id",
                                "u.id",
                                "status.id"
                            ])
                            .where({ "service_orders.orgId": req.orgId }),
                        // .whereIn('service_requests.projectId', accessibleProjects),

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
                            .leftJoin("service_status AS status", "service_requests.serviceStatusCode", "status.statusCode")
                            .leftJoin("users AS u", "service_requests.createdBy", "u.id")
                            .select([
                                "service_orders.id as So Id",
                                "service_requests.description as Description",
                                "service_requests.location as Location",
                                "service_requests.id as Sr Id",
                                "incident_categories.descriptionEng as Problem",
                                "service_requests.priority as Priority",
                                "u.name as Created By",
                                //   "service_orders.createdBy as Created By",
                                "orderDueDate as Due Date",
                                "status.descriptionEng as Status",
                                "service_orders.createdAt as Date Created",
                                'service_requests.houseId as houseId',
                                "service_orders.displayId as soNo",
                                "service_requests.displayId as srNo"



                            ])
                            .offset(offset)
                            .limit(per_page)
                            .where({ "service_orders.orgId": req.orgId })
                        //  .whereIn('service_requests.projectId', accessibleProjects),
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
                            .leftJoin("service_status AS status", "service_requests.serviceStatusCode", "status.statusCode")
                            .leftJoin("users AS u", "service_requests.createdBy", "u.id")

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
                                "service_orders.displayId as soNo",
                                "service_requests.displayId as srNo"



                            ])
                            .where(qb => {
                                qb.where({ "service_orders.orgId": req.orgId });
                                // qb.whereIn('service_requests.projectId', accessibleProjects)


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
                                "users.id",
                                "u.id",
                                "status.id"
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
                                "service_orders.displayId as soNo",
                                "service_requests.displayId as srNo"


                            ])
                            .where(qb => {
                                qb.where({ "service_orders.orgId": req.orgId });
                                //qb.whereIn('service_requests.projectId', accessibleProjects)


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
    getServiceRequestAssignedAssets: async (req, res) => {
        try {
            let { serviceRequestId } = req.body;
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
                        "companies.companyName as companyName",
                        "asset_master.displayId"
                    ])
                    .where({
                        entityType: "service_requests",
                        entityId: serviceRequestId,
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
                        "companies.companyName as companyName",
                        "asset_master.displayId"

                    ])
                    .where({
                        entityType: "service_requests",
                        entityId: serviceRequestId,
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
    getServiceRequestAssignedParts: async (req, res) => {
        try {
            let reqData = req.query;
            let total, rows;

            let pagination = {};
            let per_page = reqData.per_page || 10;
            let page = reqData.current_page || 1;
            if (page < 1) page = 1;
            let offset = (page - 1) * per_page;

            let { serviceRequestId } = req.body;
            let serviceOrderResult = await knex('service_orders')
                .where({ orgId: req.orgId, serviceRequestId: serviceRequestId })
                .returning(['*']).first();

            console.log("serviceRequestPArtsData", serviceOrderResult);

            if (!serviceOrderResult) {
                pagination.total = 0;
                pagination.per_page = per_page;
                pagination.offset = offset;
                pagination.to = offset + 0;
                pagination.last_page = null;
                pagination.current_page = page;
                pagination.from = offset;
                pagination.data = [];

                return res.status(200).json({
                    data: {
                        assignedParts: pagination
                    }
                })
            }


            let serviceOrderId = serviceOrderResult.id;

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
                        "assigned_parts.status as status",
                        "part_master.displayId",

                    ])
                    .where({
                        "assigned_parts.entityId": serviceOrderId,
                        "assigned_parts.entityType": "service_orders"
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
                        "assigned_parts.status as status",
                        "part_master.displayId",

                    ])
                    .where({
                        "assigned_parts.entityId": serviceOrderId,
                        "assigned_parts.entityType": "service_orders"
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
            console.log(err);
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    getServiceRequestAssignedCharges: async (req, res) => {
        try {
            let reqData = req.query;
            let total, rows;

            let pagination = {};
            let per_page = reqData.per_page || 10;
            let page = reqData.current_page || 1;
            if (page < 1) page = 1;
            let offset = (page - 1) * per_page;

            let { serviceRequestId } = req.body;
            let serviceOrderResult = await knex('service_orders').where({ orgId: req.orgId, serviceRequestId: serviceRequestId }).returning(['*']).first();

            console.log("serviceRequestPArtsData", serviceOrderResult);
            if (!serviceOrderResult) {
                pagination.total = 0;
                pagination.per_page = per_page;
                pagination.offset = offset;
                pagination.to = offset + 0;
                pagination.last_page = null;
                pagination.current_page = page;
                pagination.from = offset;
                pagination.data = [];

                return res.status(200).json({
                    data: {
                        assignedCharges: pagination
                    }
                })
            }

            let serviceOrderId = serviceOrderResult.id;

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
                        "assigned_service_charges.totalHours as totalHours"
                    ])
                    .where({
                        "assigned_service_charges.entityId": serviceOrderId,
                        "assigned_service_charges.entityType": "service_orders"
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
                        "assigned_service_charges.totalHours as totalHours"
                    ])
                    .where({
                        "assigned_service_charges.entityId": serviceOrderId,
                        "assigned_service_charges.entityType": "service_orders"
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
    }

}

module.exports = serviceAppointmentController;