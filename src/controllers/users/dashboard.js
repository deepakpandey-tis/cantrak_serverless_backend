const knex = require("../../db/knex");
const Joi = require("@hapi/joi");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const Moment = require("moment");
const MomentRange = require('moment-range');
const moment = MomentRange.extendMoment(Moment);

const uuidv4 = require("uuid/v4");
var jwt = require("jsonwebtoken");
const _ = require("lodash");




const dashboardController = {

    getDashboardData: async (req, res) => {
        try {

            console.log("customerInfo", req.me.id);
            console.log("customerHouseInfo", req.me.houseIds);
            let houseIds = req.me.houseIds;

            let orgId = req.orgId;
            // let accessibleProjects = req.userProjectResources[0].projects

            let prioritySeq = await knex('incident_priority').max('sequenceNo').where({ orgId: orgId });
            let priority;
            let priorityValue = null;
            if (prioritySeq.length) {

                let maxSeq = prioritySeq[0].max;
                priority = await knex('incident_priority').where({ sequenceNo: maxSeq, orgId: orgId }).groupBy(['incident_priority.incidentPriorityCode', 'incident_priority.id']).first();
                priorityValue = priority.incidentPriorityCode;
            }


            let getServiceRequests = await knex('service_requests')
                .select('id')
                .where({ "service_requests.serviceStatusCode": 'A', 'service_requests.orgId': orgId })
                .whereIn("service_requests.houseId", houseIds)
                .orWhere("service_requests.createdBy", req.me.id)

            console.log("service request list", getServiceRequests);

            let srIds = getServiceRequests.map(v => v.id)// Get all service request Ids where status = O (Open)


            let getServiceRequestsPriority = await knex('service_requests')
                .select('id')
                .where({ "service_requests.serviceStatusCode": 'A', 'service_requests.priority': priorityValue, 'service_requests.orgId': orgId })
                .whereIn("service_requests.houseId", houseIds)
                .orWhere("service_requests.createdBy", req.me.id)

            console.log("service request by priority list", getServiceRequestsPriority);

            let srIdP = getServiceRequestsPriority.map(v => v.id)// Get all service request Ids where status = O (Open)


            const [openRequests, openOrders, srhp, sohp] = await Promise.all([

                knex.from('service_requests')
                    .select('service_requests.serviceStatusCode as status')
                    .where({ serviceStatusCode: 'O', orgId })
                    .whereIn("service_requests.houseId", houseIds)
                    .orWhere("service_requests.createdBy", req.me.id)
                    .distinct('service_requests.id')
                ,

                knex.from('service_orders')
                    .innerJoin('service_requests', 'service_orders.serviceRequestId', 'service_requests.id')
                    .whereIn('service_orders.serviceRequestId', srIds)
                    .distinct('service_orders.id')


                ,

                knex.from('service_requests')
                    .select('service_requests.serviceStatusCode as status')
                    .where({ serviceStatusCode: 'O', orgId, priority: priorityValue })
                    .whereIn("service_requests.houseId", houseIds)
                    .orWhere("service_requests.createdBy", req.me.id)
                    .distinct('service_requests.id')

                ,

                knex.from('service_orders')
                    .innerJoin('service_requests', 'service_orders.serviceRequestId', 'service_requests.id')
                    .distinct('service_orders.id')
                    .whereIn('service_orders.serviceRequestId', srIdP)

            ])

            let open_service_requests = openRequests.length ? openRequests.length : 0;
            let open_service_orders = openOrders.length ? openOrders.length : 0;
            let open_service_requests_high_priority = srhp.length ? srhp.length : 0;
            let open_service_orders_high_priority = sohp.length ? sohp.length : 0;


            return res.status(200).json({
                data: {
                    open_service_requests,
                    open_service_orders,
                    open_service_requests_high_priority,
                    open_service_orders_high_priority,
                    priorityValue

                },
                message: 'Dashboard data'
            })

        } catch (err) {
            console.log('[controllers][dashboard][getDashboardData] :  Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },

    getBannerList: async (req, res) => {
        try {

            let bannersImg;

            bannersImg = await knex
                .from("banners_master")
                .where({ "banners_master.orgId": req.orgId, "banners_master.isActive": true })
                .select(
                    "banners_master.title as titles",
                    "banners_master.s3Url as banners"
                )
                .orderBy('banners_master.id', 'desc')
                .limit(6);

            return res.status(200).json({
                data: {
                    banners: bannersImg,
                },
                message: "Banners List!",
            });

        } catch (err) {
            console.log("[controllers][banners][getBanners],Error", err);
        }
    },

    getAnnouncementList: async (req, res) => {
        try {

            let announcement;

            announcement = await knex
                .from("announcement_master")              
                .innerJoin(
                    "announcement_user_master",
                    "announcement_master.id",
                    "announcement_user_master.announcementId"
                )
                .where({ 
                    "announcement_master.savedStatus": 2,
                    "announcement_user_master.orgId": req.orgId,
                    "announcement_user_master.userId": req.me.id,
                    "announcement_master.status": true
                 })
                .select(
                    "announcement_master.id as Id",
                    "announcement_master.title as titles",
                    "announcement_master.url as Url",
                    "announcement_master.description as details",
                    "announcement_master.createdAt as announcementDate"
                )
                .orderBy('announcement_master.id', 'desc')
                .limit(10);


                const Parallel = require("async-parallel");
                announcement = await Parallel.map(announcement, async (pp) => {   
                    
                    let imageResult = await knex
                    .from("images")
                    .select("s3Url as img", "title", "name")
                    .where({
                        entityId: pp.Id,
                        entityType: "announcement_image"
                    }).first();

                    return {
                        ...pp,
                        imageResult,
                        URL: process.env.SITE_URL
                    };
                });


            return res.status(200).json({
                data: {
                    announcement: announcement,
                },
                message: "Announcement List!",
            });

        } catch (err) {
            console.log("[controllers][Announcement][getAnnouncementList],Error", err);
        }
    },

    getThemeSetting: async (req, res) => {
        try {
            let themes;
            let themeValue;
            themes = await knex
                .from("theme_master")
                .where({ "theme_master.orgId": req.orgId })
                .select(
                    "theme_master.theme as theme"
                )
                .first();

            if(themes){
                themeValue = themes.theme;
            }else{
                themeValue = '1';
            }

            return res.status(200).json({
                data: {
                    result :  themeValue
                },
                message: "Theme Settings!",
            });

        } catch (err) {
            console.log("[controllers][dashboard][getThemes],Error", err);
        }
    },

    getAnnouncementDetails: async (req, res) => {
        try {
            let id = req.me.id;
            let { announcementId } = req.body;
            let resultData;

            resultData = await knex.from('announcement_user_master')                
                .innerJoin(
                    "announcement_master",
                    "announcement_user_master.announcementId",
                    "announcement_master.id"
                )
                .select([
                    "announcement_master.title as titles",
                    "announcement_master.url as Url",
                    "announcement_master.description as details",
                    "announcement_master.createdAt as announcementDate"
                ])
                .where({ 'announcement_user_master.orgId': req.orgId })
                .where({ 'announcement_user_master.announcementId': announcementId })
                .first()

                console.log("...resultData",resultData)
            
            let imageResult = await knex
                .from("images")
                .select("s3Url", "title", "name")
                .where({
                    entityId: announcementId,
                    entityType: "announcement_image"
                })
                

            res.status(200).json({
                data: {
                    announcementDetails: {
                        ...resultData, imageResult
                    }
                },
                message: "Announcement details successfully!"
            })

        } catch (err) {

            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });

        }
    }

};

module.exports = dashboardController;
