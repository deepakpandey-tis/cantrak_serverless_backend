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
                    .groupBy(["quotations.id", "service_requests.id",  "users.id"]),

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
                    .groupBy(["quotations.id", "service_requests.id",  "users.id"])
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
    }
}

module.exports = quotationsController;