const Joi = require('@hapi/joi');
const _ = require('lodash');
const moment = require("moment")

const knex = require('../../db/knex');
const XLSX = require('xlsx');



const serviceAppointmentController = {

    getServiceAppointmentList: async (req, res) => {
        try {
            //const serviceOrders = await knex('service_orders').select();
            console.log("customerInfo", req.me.id);
            console.log("customerHouseInfo", req.me.houseIds);
            let houseIds =  req.me.houseIds;
      
            let serviceRequestData= await knex.from("service_requests")
            .select('id')
            .whereIn("service_requests.houseId",houseIds)
      
            let serviceRequestIds = serviceRequestData.map(v => v.id)//[userHouseId.houseId];
      
            let serviceOrderData= await knex.from("service_orders")
            .select('id')
            .whereIn("service_orders.serviceRequestId",serviceRequestIds)
      
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
                        'users.name as createdBy',
                        'service_appointments.appointedDate as appointedDate',
                        'service_appointments.createdAt as dateCreated',
                        'service_appointments.status as status'
                    ]).where({ 'service_appointments.orgId': req.orgId})
                    .whereIn("service_appointments.serviceOrderId",serviceOrderIds)
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
                        'service_appointments.createdAt as dateCreated',
                        'service_appointments.status as status'
                    ]).where({ 'service_appointments.orgId': req.orgId})
                    .whereIn("service_appointments.serviceOrderId",serviceOrderIds)
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
    }

}

module.exports = serviceAppointmentController;