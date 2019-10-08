const Joi = require('@hapi/joi');
const _ = require('lodash');
const moment = require("moment")
require('moment-recur');

const { RRule, RRuleSet, rrulestr } = require('rrule')

const knex = require('../db/knex');

//const trx = knex.transaction();


const pmController = {
    createPmTaskSchedule: async (req, res) => {
        try {
            //let noOfDates = null
            let pm_task = null
            let tasks = null
            let assetResults = []
            await knex.transaction(async trx => {

                let payload = req.body;
                let repeatType = payload.repeatType;
                let repeatOn = payload.repeatOn;
                let repeatNumber = Number(payload.repeatNumber)
                let start = new Date(payload.pmStartDateTime)
                let startYear = start.getFullYear()
                let startMonth = start.getMonth()
                let startDate = start.getDate()

                let end = new Date(payload.pmEndDateTime)

                let endYear = end.getFullYear()
                let endMonth = end.getMonth()
                let endDate = end.getDate()
                let pmPerformingDates


                let config = {
                    interval: repeatNumber,
                    dtstart: new Date(Date.UTC(startYear, startMonth, startDate)),
                    until: new Date(Date.UTC(endYear, endMonth, endDate)) // year, month, date
                }
                if (repeatType === "YEAR") {
                    config['freq'] = RRule.YEARLY
                } else if (repeatType === "MONTH") {
                    config['freq'] = RRule.MONTHLY
                } else if (repeatType === "WEEK") {
                    config['freq'] = RRule.WEEKLY;
                    let array = []

                    if (repeatOn.includes('MO')) {
                        array.push(RRule.MO)
                    }
                    if (repeatOn.includes('TU')) {
                        array.push(RRule.TU)
                    }
                    if (repeatOn.includes('WE')) {
                        array.push(RRule.WE)
                    }
                    if (repeatOn.includes('TH')) {
                        array.push(RRule.TH)
                    }
                    if (repeatOn.includes('FR')) {
                        array.push(RRule.FR)
                    }
                    if (repeatOn.includes('SA')) {
                        array.push(RRule.SA)
                    }
                    if (repeatOn.includes('SU')) {
                        array.push(RRule.SU)
                    }
                    config['byweekday'] = array
                } else if (repeatType === "DAY") {
                    config['freq'] = RRule.DAILY;
                }

                const rule = new RRule(config)

                pmPerformingDates = rule.all()



                // insert into pm task to pm_master
                let currentTime = new Date().getTime()
                let insertPayload = { assetCategoryId: payload.assetCategoryId, pmStartDate: payload.pmStartDateTime, pmStopDate: payload.pmEndDateTime, updatedAt: currentTime, createdAt: currentTime, repeatType: payload.repeatType, repeatOn: payload.repeatOn, repeatNumber: payload.repeatNumber }
                pmResult = await knex.insert(insertPayload).returning(['*']).transacting(trx).into('pm_master')
                pm_task = pmResult[0]


                // insert tasks

                let tasksInsertPayload = payload.tasks.map(v => ({ pmMasterId: pm_task.id, taskName: v, updatedAt: currentTime, createdAt: currentTime }))
                tasks = await knex.insert(tasksInsertPayload).returning(['*']).transacting(trx).into('pm_task_master')
                // for each pm performing date for each asset add entry to pm_assign_asset with pm_id

                // insert into pm_assign_assets

                for (let i = 0; i < payload.assets.length; i++) {
                    const assetId = payload.assets[i];

                    for (let j = 0; j < pmPerformingDates.length; j++) {
                        const date = pmPerformingDates[j];
                        let assetResult = await knex.insert({ pmDate: date, pmMasterId: pm_task.id, assetId, createdAt: currentTime, updatedAt: currentTime }).returning(['*']).transacting(trx).into('pm_assign_assets')
                        assetResults.push(assetResult[0])
                    }

                }
                trx.commit;
            })

            return res.status(200).json({
                data: {
                    pm_task: pm_task,
                    tasks,
                    assetResults
                },
                message: 'Task created successfully!'
            })
        } catch (err) {
            console.log('[controllers][people][UpdatePeople] :  Error', err);
            //trx.rollback
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    getPmAssetListByFilter: async (req, res) => {
        try {
            let reqData = req.query;
            let pagination = {};

            await knex.transaction(async trx => {
                const { companyId, assetSerial, projectId, buildingId, floorId } = req.body;

                let filters = {}
                if (assetSerial) {
                    filters['asset_master.assetSerial'] = assetSerial
                }
                if (companyId) {
                    filters['asset_location.companyId'] = companyId;
                }
                if (projectId) {
                    filters['asset_location.projectId'] = projectId
                }
                if (buildingId) {
                    filters['asset_location.buildingId'] = buildingId
                }
                if (floorId) {
                    filters['asset_location.floorId'] = floorId
                }


                let per_page = reqData.per_page || 10;
                let page = reqData.current_page || 1;
                if (page < 1) page = 1;
                let offset = (page - 1) * per_page;
                let total, rows
                if (_.isEmpty(filters)) {



                    [total, rows] = await Promise.all([
                        knex.count('* as count').from("asset_master")
                            .innerJoin('asset_location', 'asset_master.id', 'asset_location.assetId')
                            .select(['asset_master.id as id', 'asset_master.assetName', 'asset_master.assetSerial', 'asset_master.assetCategory', 'asset_master.installationDate'])
                            .groupBy(['asset_master.id', 'asset_location.id']),
                        knex.from('asset_master')
                            .innerJoin('asset_location', 'asset_master.id', 'asset_location.assetId')
                            .select(['asset_master.id as id', 'asset_master.assetName', 'asset_master.assetSerial', 'asset_master.assetCategory', 'asset_master.installationDate'])
                            .offset(offset)
                            .limit(per_page)
                    ])
                } else {
                    [total, rows] = await Promise.all([
                        knex.count('* as count').from("asset_master")
                            .innerJoin('asset_location', 'asset_master.id', 'asset_location.assetId')
                            .select(['asset_master.id as id', 'asset_master.assetName', 'asset_master.assetSerial', 'asset_master.assetCategory', 'asset_master.installationDate'])
                            .where(qb => {
                                qb.where(filters)
                            }).groupBy(['asset_master.id', 'asset_location.id']),
                        knex.from('asset_master')
                            .innerJoin('asset_location', 'asset_master.id', 'asset_location.assetId')
                            .select(['asset_master.id as id', 'asset_master.assetName', 'asset_master.assetSerial', 'asset_master.assetCategory', 'asset_master.installationDate'])
                            .where(qb => {
                                qb.where(filters)
                            })
                            .offset(offset)
                            .limit(per_page)
                    ])
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


                trx.commit;
            })
            return res.status(200).json({
                data: {
                    pagination
                },
                message: 'Asset List'
            })
        } catch (err) {
            console.log('[controllers][people][UpdatePeople] :  Error', err);
            //trx.rollback
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    assignTeamToPmTask: async (req, res) => {
        try {
            let assignedTeam = null
            let addedAdditionalUsers = []

            await knex.transaction(async trx => {
                let payload = req.body;
                let additionalUsers = payload.additionalUsers

                const currentTime = new Date().getTime()
                // add to assigned_service_team
                let insertedTeamResult = await knex.insert({ entityType: "pm_master", entityId: payload.pmMasterId, updatedAt: currentTime, createdAt: currentTime, teamId: payload.teamId, userId: payload.userId }).returning(['*']).transacting(trx).into('assigned_service_team')
                assignedTeam = insertedTeamResult[0]

                // Now add additional users to the table assigned_service_additional_users

                for (let i = 0; i < additionalUsers.length; i++) {
                    const id = additionalUsers[i];
                    let result = await knex.insert({ updatedAt: currentTime, createdAt: currentTime, entityId: payload.pmMasterId, entityType: "pm_master", userId: payload.userId }).returning(['*']).transacting(trx).into('assigned_service_additional_users')
                    addedAdditionalUsers.push(result[0])
                }
                trx.commit

            })
            return res.status(200).json({
                data: {

                    assignedTeam,
                    additionalUsers: addedAdditionalUsers
                },
                message: 'Team added to PM'
            })
        } catch (err) {
            console.log('[controllers][people][UpdatePeople] :  Error', err);
            //trx.rollback
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    postFeedbackWithImages: async (req, res) => {
        try {

            await knex.transaction(async trx => {
                let feedbacks = req.body || []
                let currentTime = new Date().getTime()


                const Parallel = require('async-parallel');

                let feedResultAsync = await Parallel.map(feedbacks, async feedback => {
                    let { pmMasterId,
                        assetId,
                        taskId,
                        userId,
                        description, images } = feedback;

                    const feedBackInsertResult = await knex.insert({
                        pmMasterId,
                        assetId,
                        taskId,
                        userId,
                        description, updatedAt: currentTime, createdAt: currentTime
                    }).returning(['*']).transacting(trx).into('pm_feedbacks')

                    let imagesResult = await Parallel.map(images, async image => {
                        let { s3Url, title, name } = image;
                        let insertPayload = { entityType: 'pm_feedbacks', entityId: feedBackInsertResult[0].id, createdAt: currentTime, updatedAt: currentTime, s3Url, title, name }
                        let imageInsertResult = await knex.insert(insertPayload).returning(['*']).transacting(trx).into('images')
                        return imageInsertResult

                    })
                    return { feedback: feedBackInsertResult[0], images: imagesResult }

                })



                trx.commit;
                res.status(200).json({
                    data: {
                        feedbacks: feedResultAsync
                    },
                    message: 'Feebacks posted'
                })

            })

        } catch (err) {
            console.log('[controllers][people][UpdatePeople] :  Error', err);
            //trx.rollback
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    getFeedbackList: async (req, res) => {
        try {
            await knex.transaction(async trx => {


                let { pmMasterId,
                    assetId } = req.body;

                const feedbacks = await knex.from('pm_feedbacks as p')
                .where({ 'p.pmMasterId': pmMasterId, 'p.assetId': assetId})
                .select('p.id as id','description')

                const Parallel = require('async-parallel')

                const data = await Parallel.map(feedbacks, async feedback => {
                    const images = await knex('images').select().where({entityId:feedback.id, entityType:'pm_feedbacks'})
                    return {...feedback,images};
                })

                trx.commit;
                res.status(200).json({
                    feedbacks:data
                })

            })
        } catch (err) {
            console.log('[controllers][people][UpdatePeople] :  Error', err);
            //trx.rollback
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    }
}

module.exports = pmController