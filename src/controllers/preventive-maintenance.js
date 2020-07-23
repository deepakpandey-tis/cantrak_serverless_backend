const Joi = require("@hapi/joi");
const _ = require("lodash");
const moment = require("moment");
require("moment-recur");

const { RRule, RRuleSet, rrulestr } = require("rrule");
const knex = require("../db/knex");


function getYears(mils) {
  let years = Math.ceil(mils / (1000 * 60 * 60 * 24 * 365));
  return years;
}

const pmController = {

  getPmAssetListByFilter: async (req, res) => {
    try {
      let reqData = req.query;
      let pagination = {};

      await knex.transaction(async trx => {
        const {
          companyId,
          assetSerial,
          projectId,
          buildingId,
          floorId
        } = req.body;

        let filters = {};
        if (assetSerial) {
          filters["asset_master.assetSerial"] = assetSerial;
        }
        if (companyId) {
          filters["asset_location.companyId"] = companyId;
        }
        if (projectId) {
          filters["asset_location.projectId"] = projectId;
        }
        if (buildingId) {
          filters["asset_location.buildingId"] = buildingId;
        }
        if (floorId) {
          filters["asset_location.floorId"] = floorId;
        }

        let per_page = reqData.per_page || 10;
        let page = reqData.current_page || 1;
        if (page < 1) page = 1;
        let offset = (page - 1) * per_page;
        let total, rows;
        if (_.isEmpty(filters)) {
          [total, rows] = await Promise.all([
            knex
              .count("* as count")
              .from("asset_master")
              .innerJoin(
                "asset_location",
                "asset_master.id",
                "asset_location.assetId"
              )
              .select([
                "asset_master.id as id",
                "asset_master.assetName",
                "asset_master.assetSerial",
                "asset_master.assetCategory",
                "asset_master.installationDate"
              ])
              .groupBy(["asset_master.id", "asset_location.id"]),
            knex
              .from("asset_master")
              .innerJoin(
                "asset_location",
                "asset_master.id",
                "asset_location.assetId"
              )
              .select([
                "asset_master.id as id",
                "asset_master.assetName",
                "asset_master.assetSerial",
                "asset_master.assetCategory",
                "asset_master.installationDate"
              ])
              .offset(offset)
              .limit(per_page)
          ]);
        } else {
          [total, rows] = await Promise.all([
            knex
              .count("* as count")
              .from("asset_master")
              .innerJoin(
                "asset_location",
                "asset_master.id",
                "asset_location.assetId"
              )
              .select([
                "asset_master.id as id",
                "asset_master.assetName",
                "asset_master.assetSerial",
                "asset_master.assetCategory",
                "asset_master.installationDate"
              ])
              .where(qb => {
                qb.where(filters);
              })
              .groupBy(["asset_master.id", "asset_location.id"]),
            knex
              .from("asset_master")
              .innerJoin(
                "asset_location",
                "asset_master.id",
                "asset_location.assetId"
              )
              .select([
                "asset_master.id as id",
                "asset_master.assetName",
                "asset_master.assetSerial",
                "asset_master.assetCategory",
                "asset_master.installationDate"
              ])
              .where(qb => {
                qb.where(filters);
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

        trx.commit;
      });
      return res.status(200).json({
        data: {
          pagination
        },
        message: "Asset List"
      });
    } catch (err) {
      console.log("[controllers][people][UpdatePeople] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },


  postFeedbackWithImages: async (req, res) => {
    try {
      await knex.transaction(async trx => {
        let feedbacks = req.body || [];
        let currentTime = new Date().getTime();

        const Parallel = require("async-parallel");

        let feedResultAsync = await Parallel.map(feedbacks, async feedback => {
          let {
            pmMasterId,
            assetId,
            taskId,
            userId,
            description,
            images
          } = feedback;

          const feedBackInsertResult = await knex
            .insert({
              pmMasterId,
              assetId,
              taskId,
              userId,
              description,
              updatedAt: currentTime,
              createdAt: currentTime
            })
            .returning(["*"])
            .transacting(trx)
            .into("pm_feedbacks");

          let imagesResult = []
          if (images) {
            imagesResult = await Parallel.map(images, async image => {
              let { s3Url, title, name } = image;
              let insertPayload = {
                entityType: "pm_feedbacks",
                entityId: feedBackInsertResult[0].id,
                createdAt: currentTime,
                updatedAt: currentTime,
                s3Url,
                title,
                name
              };
              let imageInsertResult = await knex
                .insert(insertPayload)
                .returning(["*"])
                .transacting(trx)
                .into("images");
              return imageInsertResult;
            });

          }
          return { feedback: feedBackInsertResult[0], images: imagesResult };
        });

        trx.commit;
        res.status(200).json({
          data: {
            feedbacks: feedResultAsync
          },
          message: "Feebacks posted"
        });
      });
    } catch (err) {
      console.log("[controllers][people][UpdatePeople] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getFeedbackList: async (req, res) => {
    try {
      await knex.transaction(async trx => {
        let { pmMasterId, assetId } = req.body;

        const feedbacks = await knex
          .from("pm_feedbacks as p")
          .where({ "p.pmMasterId": pmMasterId, "p.assetId": assetId })
          .select("p.id as id", "description");

        const Parallel = require("async-parallel");

        const data = await Parallel.map(feedbacks, async feedback => {
          const images = await knex("images")
            .select()
            .where({ entityId: feedback.id, entityType: "pm_feedbacks" });
          return { ...feedback, images };
        });

        trx.commit;
        res.status(200).json({
          feedbacks: data
        });
      });
    } catch (err) {
      console.log("[controllers][people][UpdatePeople] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },


  getPmByName: async (req, res) => {
    try {
      let name = req.body.pmNameSearchTerm;
      const pm = await knex('pm_master2').select().where((qb) => {
        qb.where('name', 'like', `%${name}%`)
      })

      return res.status(200).json({
        data: {
          pm
        },
        message: 'Search Results'
      })
    } catch (err) {
      console.log("[controllers][people][UpdatePeople] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },


  getAssetListOfPm: async (req, res) => {
    try {
      const pmMasterId = req.body.pmMasterId;
      const assetId = req.body.assetId
      let total, rows
      let pagination = {};
      let per_page = req.query.per_page || 10;
      let page = req.query.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;

      if (assetId) {
        [total, rows] = await Promise.all([
          knex
            .from("pm_assign_assets")
            .innerJoin('asset_master', 'pm_assign_assets.assetId', 'asset_master.id')
            .where({ pmMasterId, 'asset_master.id': assetId })
            .whereNull('pm_assign_assets.endDateTime')
          ,
          knex
            .from("pm_assign_assets")
            .innerJoin('asset_master', 'pm_assign_assets.assetId', 'asset_master.id')
            .groupBy('pm_assign_assets.id', 'asset_master.id')
            .where({ pmMasterId, 'asset_master.id': assetId })
            .whereNull('pm_assign_assets.endDateTime')
            .offset(offset)
            .limit(per_page)
        ])

      } else {

        [total, rows] = await Promise.all([
          knex
            .from("pm_assign_assets")
            .innerJoin('asset_master', 'pm_assign_assets.assetId', 'asset_master.id')
            .where({ pmMasterId })
            .whereNull('pm_assign_assets.endDateTime')
          ,
          knex
            .from("pm_assign_assets")
            .innerJoin('asset_master', 'pm_assign_assets.assetId', 'asset_master.id')
            .groupBy('pm_assign_assets.id', 'asset_master.id')
            .where({ pmMasterId })
            .whereNull('pm_assign_assets.endDateTime')
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
      return res.status(200).json({
        data: {
          assets: pagination
        },
        message: 'Asset list of a PM'
      })
    } catch (err) {
      console.log("[controllers][people][UpdatePeople] :  Error", err);
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getAssetListWithCompletedPm: async (req, res) => {
    try {
      const pmMasterId = req.body.pmMasterId;
      let pagination = {};
      let per_page = req.query.per_page || 10;
      let page = req.query.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;


      let [total, rows] = await Promise.all([
        knex
          .from("pm_assign_assets")
          .innerJoin('asset_master', 'pm_assign_assets.assetId', 'asset_master.id')
          .where({ pmMasterId })
          .whereNotNull('pm_assign_assets.endDateTime')
        ,
        knex
          .from("pm_assign_assets")
          .innerJoin('asset_master', 'pm_assign_assets.assetId', 'asset_master.id')
          .groupBy('pm_assign_assets.id', 'asset_master.id')
          .where({ pmMasterId })
          .whereNotNull('pm_assign_assets.endDateTime')
          .offset(offset)
          .limit(per_page)
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
          assets: pagination
        },
        message: 'Asset list of a PM'
      })
    } catch (err) {
      console.log("[controllers][people][UpdatePeople] :  Error", err);
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getAssetIdByAssetSerialOrBarcode: async (req, res) => {
    try {
      const assetSerialOrBarcode = req.body.assetSerialOrBarcode;
      if (!assetSerialOrBarcode) {
        return res.status(200).json({
          data: {
            assetId: ''
          }
        })
      }
      let asset = await knex('asset_master').select('id').where({ assetSerial: assetSerialOrBarcode }).orWhere({ barcode: assetSerialOrBarcode })
      if (asset && asset.length) {
        asset = asset[0].id
        return res.status(200).json({
          data: {
            assetId: asset
          }
        })
      }
      return res.status(200).json({
        data: {
          assetId: ''
        }
      })

    } catch (err) {
      console.log("[controllers][people][UpdatePeople] :  Error", err);
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },


  viewFeedbacksReport: async (req, res) => {
    try {
      let feedbacksView = null;
      let payload = req.body;
      const schema = Joi.object().keys({
        pmMasterId: Joi.number().required(),
        taskId: Joi.number().required()
      });

      const result = Joi.validate(payload, schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }]
        });
      }

      let feedbacksData = await knex("pm_feedbacks")
        .select()
        .where({ pmMasterId: payload.pmMasterId, taskId: payload.taskId });

      feedbacksView = _.omit(feedbacksData[0], [
        "createdAt",
        "updatedAt",
        "isActive"
      ]);

      return res.status(200).json({
        data: {
          feedbacks: feedbacksView
        },
        message: "Feedback details"
      });
    } catch (err) {
      console.log("[controllers][pm][viewFeedback] : Error", err);
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
    // Get Task List By PM Master ID
  }, getTaskListByPmId: async (req, res) => {

    try {
      let reqData = req.query;
      let pagination = {};

      const {
        pmMasterId
      } = req.body;

      let filters = {};
      if (pmMasterId) {
        filters["pm_task_master.pmMasterId"] = pmMasterId;
      }


      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;
      let total, rows;
      if (_.isEmpty(filters)) {
        [total, rows] = await Promise.all([
          knex
            .count("* as count")
            .from("pm_task_master"),
          knex
            .from("pm_task_master")
            .select('*')
            .offset(offset)
            .limit(per_page)
        ]);
      } else {
        [total, rows] = await Promise.all([
          knex
            .count("* as count")
            .from("pm_task_master")
            .where(qb => {
              qb.where(filters);
            }),

          knex
            .from("pm_task_master")
            .select('*')
            .where(qb => {
              qb.where(filters);
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
          pagination
        },
        message: "Preventive Maintaince Task List"
      });
    } catch (err) {
      console.log("[controllers][people][UpdatePeople] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  // Update Asset PM EndDate
  updateAssetPm: async (req, res) => {

    try {
      let assetData = null;
      const payload = req.body;

      const schema = Joi.object().keys({
        pmMasterId: Joi.number().required(),
        assetId: Joi.number().required(),
        pmDate: Joi.date().required(),
        startDateTime: Joi.date().required(),
        endDateTime: Joi.date().required(),
      })

      const result = Joi.validate(payload, schema)
      console.log('[controllers][administrationFeatures][PM]: JOi Result', result);

      if (result && result.hasOwnProperty('error') && result.error) {
        return res.status(400).json({
          errors: [
            { code: 'VALIDATION_ERROR', message: result.error.message }
          ],
        });
      }

      let currentTime = new Date().getTime()
      let updateData = { ...payload, updatedAt: currentTime };
      let updateResult = await knex('pm_assign_assets').update(updateData)
        .where({ pmMasterId: payload.pmMasterId, assetId: payload.assetId, pmDate: payload.pmDate }).returning(['*'])
      assetData = updateResult[0]

      return res.status(200).json({
        data: {
          assetPmUpdateData: assetData
        },
        message: 'Asset Pm EndDate Updated Successfully!'
      })


    } catch (err) {
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
    // Get PM Report
  }, getPmReport: async (req, res) => {

    try {

      let reportData = null;
      const payload = req.body;

      const schema = Joi.object().keys({
        pmMasterId: Joi.number().required(),
        assetId: Joi.number().required(),
        pmDate: Joi.date().required(),
      })

      const result = Joi.validate(payload, schema)
      console.log('[controllers][administrationFeatures][PMreport]: JOi Result', result);

      if (result && result.hasOwnProperty('error') && result.error) {
        return res.status(400).json({
          errors: [
            { code: 'VALIDATION_ERROR', message: result.error.message }
          ],
        });
      }

      let reportResult = await knex('pm_assign_assets')
        .innerJoin('pm_feedbacks', 'pm_assign_assets.pmMasterId', 'pm_feedbacks.pmMasterId')
        .innerJoin('pm_task_master', 'pm_assign_assets.pmMasterId', 'pm_task_master.pmMasterId')
        .leftJoin('images', 'pm_feedbacks.id', 'images.entityId')
        .select([
          'pm_assign_assets.id as id',
          'pm_task_master.taskName as Task Name',
          'pm_feedbacks.description as Feedback Description',
          'pm_assign_assets.startDateTime as startDate',
          'pm_assign_assets.startDateTime as endDate',
          'images.s3Url as image_url'
        ])
        .where({ 'pm_assign_assets.pmMasterId': payload.pmMasterId, 'pm_assign_assets.assetId': payload.assetId, 'pm_assign_assets.pmDate': payload.pmDate })

      return res.status(200).json({
        data: {
          pmReport: reportResult
        },
        message: 'Preventive Maintenance Report Successfully!'
      })

    } catch (err) {
      console.log('[controllers][preventive-maintainece][pmreport] :  Error', err);
      //trx.rollback
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  savePMTemplate: async (req, res) => {
    try {
      const { name, templateData } = req.body;
      const result = await knex('pm_templates').insert({ name, templateData })
      return res.status(200).json({
        data: {
          template: result[0]
        }
      })
    } catch (err) {
      console.log('[controllers][preventive-maintainece][pmreport] :  Error', err);
      //trx.rollback
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  searchPMTemplate: async (req, res) => {
    try {
      let { taskGroupSearchTerm } = req.body;
      let found = await knex('pm_templates').select().where(qb => {
        qb.where('pm_templates.name', 'like', `%${taskGroupSearchTerm}`)
      })

      if (found && found.length) {

        return res.status(200).json({
          data: {
            search_result: found
          },
          message: 'Result found'
        })
      }
      return res.status(200).json({
        data: {
          search_result: []
        },
        message: 'Not found'
      })

    } catch (err) {
      console.log('[controllers][preventive-maintainece][pmreport] :  Error', err);
      //trx.rollback
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },

  //pm dashboard
  getPMDashboardData: async (req, res) => {
    try {
      //calculate number of pms pending

    } catch (err) {

    }
  }
  ,
  /*GET Pm REPORT */
  pmReport: async (req, res) => {

    try {

      let payload = req.body;
      let fromDate = payload.fromDate;
      let toDate = payload.toDate;
      let fromNewDate = moment(fromDate).startOf('date').format();
      let toNewDate = moment(toDate).endOf('date', 'days').format();
      let fromTime = new Date(fromNewDate).getTime();
      let toTime = new Date(toNewDate).getTime();
      let filterProblem;


      console.log("From Time", fromDate, "To")

      let pmResult = await knex('pm_master2')
        .leftJoin('companies', 'pm_master2.companyId', 'companies.id')
        .leftJoin('projects', 'pm_master2.projectId', 'projects.id')
        .select([
          'pm_master2.*',
          'companies.companyId as companyCode',
          'companies.companyName',
          'companies.logoFile',
          'projects.project as ProjectCode',
          'projects.projectName',

        ])
        .where(qb => {


          if (fromDate && toDate) {
            qb.whereBetween('pm_master2.createdAt', [fromTime, toTime])

          }

          if (payload.companyId) {
            qb.where({ 'pm_master2.companyId': payload.companyId })
          }

          if (payload.projectId) {
            qb.where({ 'pm_master2.projectId': payload.projectId })

          } else {

          }

          qb.where({ 'pm_master2.orgId': req.orgId })

        })


      let n = pmResult;

      let pmIds = pmResult.map(it => it.id);

      let pmSchedule = await knex('task_group_schedule')
        .leftJoin('task_group_schedule_assign_assets', 'task_group_schedule.id', 'task_group_schedule_assign_assets.scheduleId')
        .leftJoin('asset_master', 'task_group_schedule_assign_assets.assetId', 'asset_master.id')
        // .leftJoin('pm_task', 'task_group_schedule.taskGroupId', 'pm_task.taskGroupId')
        .select([
          'task_group_schedule.id as scheduleId',
          'task_group_schedule.taskGroupId',
          'task_group_schedule.pmId',
          'task_group_schedule_assign_assets.assetId',
          'asset_master.assetName',
          'asset_master.assetCode',
          'task_group_schedule_assign_assets.status',
          'task_group_schedule_assign_assets.pmDate',
          'task_group_schedule_assign_assets.updatedAt',
          'task_group_schedule_assign_assets.scheduleStatus'

          //'pm_task.taskName',
          //  'pm_task.status',
          //'pm_task.id as taskId'
        ])
        .whereIn('task_group_schedule.pmId', pmIds)
        .where({ 'task_group_schedule.orgId': req.orgId })
      //pmSchedule.push({on:"",off:""})
      //pmSchedule = pmSchedule.map(v => ({ ...v, on: 0, off: 0}))


      filterProblem = pmSchedule.filter(v => v.status == 'COM')


      let mapData = _.chain(pmSchedule)
        .groupBy("assetCode")
        .map((value, key) => ({
          assetCode: key, planOrder: value.length, value: value[0],
          allValue: value, workDone: value.map(ite => ite.status).filter(v => v == 'COM').length,
          percentage: (100 * value.map(ite => ite.status).filter(v => v == 'COM').length / value.length).toFixed(2),
          off: value.map(ite => ite.scheduleStatus).filter(v => v == 'off').length,
          on: value.map(ite => ite.scheduleStatus).filter(v => v == 'on').length,
        }))
        .value()


      let final = [];
      let grouped = _.groupBy(pmSchedule, "assetCode");

      final.push(grouped);

      // let chartData = _.flatten(
      //   final
      //     .filter(v => !_.isEmpty(v))
      //     .map(v => _.keys(v).map(p => ({ [p]: (100 * v[p].map(ite => ite.status).filter(v => v == 'COM').length / pmSchedule.length).toFixed(2) })))
      // ).reduce((a, p) => {
      //   let l = _.keys(p)[0];
      //   if (a[l]) {
      //     a[l] += p[l];

      //   } else {
      //     a[l] = p[l];
      //   }
      //   return a;
      // }, {});

      let chartData = _.flatten(
        final
          .filter(v => !_.isEmpty(v))
          .map(v => _.keys(v).map(p => ({ [p]: (v[p].length) })))
      ).reduce((a, p) => {
        let l = _.keys(p)[0];
        if (a[l]) {
          a[l] += p[l];

        } else {
          a[l] = p[l];
        }
        return a;
      }, {});

      /*Work Done open */
      let workDoneChartData = _.flatten(
        final
          .filter(v => !_.isEmpty(v))
          .map(v => _.keys(v).map(p => ({ [p]: (v[p].map(ite => ite.status).filter(v => v == 'COM').length) })))
      ).reduce((a, p) => {
        let l = _.keys(p)[0];
        if (a[l]) {
          a[l] += p[l];

        } else {
          a[l] = p[l];
        }
        return a;
      }, {});

      /*Work Done close */

      let totalPlanOrder = 0;
      let totalWorkDone = 0;
      let totalPercentage = 0;
      let totalOn = 0;
      let totalOff = 0;
      const Parallel = require('async-parallel');
      pmResult = await Parallel.map(mapData, async item => {



        totalPlanOrder += Number(item.planOrder);
        totalWorkDone += Number(item.workDone);
        totalPercentage = 100 * totalWorkDone / totalPlanOrder;
        totalOn += Number(item.on);
        totalOff += Number(item.off);


        return {
          ...pmResult[0], fromDate, toDate, planOrder: item, totalPlanOrder: totalPlanOrder,
          totalWorkDone: totalWorkDone, totalPercentage: (totalPercentage).toFixed(2), chartData,
          totalOn: totalOn,
          totalOff: totalOff,
          workDoneChartData,
          totalSchedule: pmSchedule.length,
          totalDone: filterProblem.length,

        };

      })


      res.json({
        data: pmResult,
        a: pmIds,
        n,
        pmResult,
        message: "Prenventive Maintenance report succesully!",
      })

    } catch (err) {

      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });

    }

  }
  ,
  pmHistoryReport: async (req, res) => {

    try {

      let payload = req.body;
      let fromDate = payload.fromDate;
      let toDate = payload.toDate;
      let fromNewDate = moment(fromDate).startOf('date').format();
      let toNewDate = moment(toDate).endOf('date', 'days').format();
      let fromTime = new Date(fromNewDate).getTime();
      let toTime = new Date(toNewDate).getTime();


      let result = await knex('task_group_schedule_assign_assets')
        .leftJoin('task_group_schedule', 'task_group_schedule_assign_assets.scheduleId', 'task_group_schedule.id')
        .leftJoin('pm_master2', 'task_group_schedule.pmId', 'pm_master2.id')
        .leftJoin('asset_master', 'task_group_schedule_assign_assets.assetId', 'asset_master.id')
        .select([
          'task_group_schedule_assign_assets.*',
          'pm_master2.name as pmName',
          'asset_master.assetSerial'
        ])
        .where(qb => {

          if (fromDate && toDate) {
            qb.whereBetween('task_group_schedule_assign_assets.pmDate', [fromNewDate, toNewDate])

          }

          if (payload.companyId == 'all' || payload.companyId == '' || payload.companyId == null) {


          } else {

            qb.where('pm_master2.companyId', payload.companyId)

          }

          if (payload.assetSerial) {

            qb.where('asset_master.assetSerial', 'iLIKE', `%${payload.assetSerial}%`)

          }
          if (payload.status) {

            if (payload.status == "all" || payload.status == "") {

            } else {

              qb.where('task_group_schedule_assign_assets.status', payload.status)
            }
          }

          qb.where({ 'task_group_schedule_assign_assets.orgId': req.orgId })

        }).orderBy('pmDate', 'asc')


      return res.json({
        data: result,
        message: "Pm History Successfully!"
      })



    } catch (err) {

      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });

    }

  },

  pmScheduleReport: async (req, res) => {

    try {

      let payload = req.body;
      let startMonth = payload.startMonth;
      let endMonth = payload.endMonth;
      let lastDay;
      if (endMonth == "jan") {

        lastDay = 31;

      } else if (endMonth == "feb") {

        lastDay = 28;

      } else if (endMonth == "mar") {

        lastDay = 31;
      } else if (endMonth == "apr") {
        lastDay = 30;
      } else if (endMonth == "may") {
        lastDay = 31;
      } else if (endMonth == "jun") {
        lastDay = 30;
      } else if (endMonth == "jul") {
        lastDay = 31;
      } else if (endMonth == "aug") {
        lastDay = 31;
      } else if (endMonth == "sep") {
        lastDay = 30;
      } else if (endMonth == "oct") {
        lastDay = 31;
      } else if (endMonth == "nov") {
        lastDay = 30;
      } else if (endMonth == "dec") {
        lastDay = 31;
      }
      let year = payload.startYear;
      let fromDate = year + "-" + startMonth + "-" + 01;
      let toDate = year + "-" + endMonth + "-" + lastDay;


      let monthDifference = moment(toDate).diff(fromDate, "months");

      if (monthDifference > 3) {

        return res.status(400).json({
          errors: [
            { code: 'VALIDATION_ERROR', message: "You can see max four month report, please select max four month difference!" }
          ],
        });

      }


      let fromNewDate = moment(fromDate).startOf('date').format("YYYY-MM-DD");
      let toNewDate = moment(toDate).endOf('date', 'days').format();
      let fromTime = new Date(fromNewDate).getTime();
      let toTime = new Date(toNewDate).getTime();

      let result = await knex('task_group_schedule_assign_assets')
        .leftJoin('task_group_schedule', 'task_group_schedule_assign_assets.scheduleId', 'task_group_schedule.id')
        .leftJoin('pm_master2', 'task_group_schedule.pmId', 'pm_master2.id')
        .leftJoin('asset_master', 'task_group_schedule_assign_assets.assetId', 'asset_master.id')
        .leftJoin('companies', 'pm_master2.companyId', 'companies.id')
        .leftJoin('projects', 'pm_master2.projectId', 'projects.id')
        .select([
          'task_group_schedule_assign_assets.*',
          'pm_master2.name as pmName',
          'asset_master.assetSerial',
          'companies.companyId as companyCode',
          'companies.companyName',
          'companies.logoFile',
          'projects.project as projectCode',
          'projects.projectName',
          'task_group_schedule.repeatPeriod'
        ])
        .returning(["*"])
        .whereBetween('task_group_schedule_assign_assets.pmDate', [fromNewDate, toNewDate])
        .where(qb => {

          if (payload.companyId) {
            qb.where({ 'pm_master2.companyId': payload.companyId })
          }

          if (payload.projectId) {

            if (payload.projectId == "all" || payload.projectId == "") {
            } else {
              qb.where({ 'pm_master2.projectId': payload.projectId })

            }
          } else {

          }

          qb.where({ 'task_group_schedule_assign_assets.orgId': req.orgId, 'task_group_schedule_assign_assets.status': 'COM' })

        })
        .orderBy('task_group_schedule_assign_assets.pmDate', 'asc')

      const Parallel = require('async-parallel');

      let totalWeeks = 0;
      result = await Parallel.map(result, async item => {

        let week;
        week = Math.ceil(moment(item.pmDate).format('D') / 7);
        let month = moment(item.pmDate).month() + 1;
        var start = moment(item.pmDate).startOf('month').format('DD');
        var end = moment(item.pmDate).endOf('month').format('DD');
        var weeks = (end - start + 1) / 7;
        weeks = Math.floor(weeks);

        let mv = moment(item.pmDate);

        let newWeek = moment(item.pmDate).week();//mv.weeks();


        totalWeeks += weeks;

        return { ...item, week, month, weeks, totalWeeks, newWeek };
      })


      let arr = [];
      let p = { "repeatPeriod": 'MONTH', "repeatOn": ["SU"], "repeatFrequency": 1, "startDateTime": fromDate, "endDateTime": toDate };
      let dates = genrateWork(p);


      let arrMonth = [];

      let v = 0;


      let startWeek = moment(fromDate).week();
      let endWeek;
      if (endMonth == 'dec') {
        endWeek = 54;
      } else {

        endWeek = moment(toDate).week();

      }

      for (let i = startWeek; i < endWeek; i++) {

        arr.push({ "day": i })

      }



      let arr1 = [];
      let totalW = 0;
      for (let nd of dates) {

        var start1 = moment(nd).startOf('month').format('DD');
        var end1 = moment(nd).endOf('month').format('DD');
        var weeks1 = (end1 - start1 + 1) / 7;
        weeks1 = Math.ceil(weeks1);
        totalW += weeks1;
        let month = moment(nd).format('M');


        arr1.push({ ...nd, weeks1, totalW, month })
      }



      return res.json({
        data: result,
        message: "Pm Plan Action schedule report Successfully!",
        totalColumn: arr,
        dates,
        arr1,
        startWeek,
        endWeek,
        fromDate,
        toDate,

      })



    } catch (err) {

      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });

    }

  }

  , pmStatusClone: async (req, res) => {

    try {

      let result = [];
      let currentTime = new Date().getTime();
      let sc = await knex('task_group_schedule_assign_assets');

      for (let d of sc) {

        let workResult = await knex('pm_task').where({ taskGroupScheduleAssignAssetId: d.id });
        let workComplete = await knex('pm_task').where({ taskGroupScheduleAssignAssetId: d.id, status: "COM" });

        if (workResult.length == workComplete.length) {

          let workDate = moment(d.pmDate).format('YYYY-MM-DD');
          let currnetDate = moment().format('YYYY-MM-DD');
          if (workDate == currnetDate || workDate > currnetDate) {
            scheduleStatus = "on"
          } else if (workDate < currnetDate) {
            scheduleStatus = "off"
          }

          let workOrder = await knex('task_group_schedule_assign_assets').update({ status: 'COM', updatedAt: currentTime, scheduleStatus: scheduleStatus }).where({ id: d.id }).returning(['*'])
          result.push(workOrder[0]);
        }

        if (workResult[0].status == 'COM') {

        } else {
          await knex('task_group_schedule_assign_assets').update({ status: workResult[0].status, updatedAt: currentTime }).where({ id: d.id }).returning(['*'])

        }

      }

      return res.status(200).json({
        data: {
          result
        },
        message: 'Clone Successfully!'
      })

    } catch (err) {

      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }


  }
};
module.exports = pmController;

function genrateWork(payload) {


  let repeatPeriod = payload.repeatPeriod;
  let repeatOn = payload.repeatOn.length ? payload.repeatOn.join(',') : [];
  let repeatFrequency = Number(payload.repeatFrequency);
  let start = new Date(payload.startDateTime);

  console.log("=============sss", start, "==========================")
  let startYear = start.getFullYear();
  let startMonth = start.getMonth();
  let startDate = start.getDate();
  let end = new Date(payload.endDateTime);

  console.log("=============sss", end, "==========================", payload.repeatPeriod, payload.repeatOn, repeatFrequency, "=================")


  let endYear = end.getFullYear();
  let endMonth = end.getMonth();
  let endDate = end.getDate();
  let performingDates;

  let config = {
    interval: repeatFrequency,
    dtstart: new Date(
      Date.UTC(
        startYear, startMonth, startDate
      )
    ),
    until: new Date(
      Date.UTC(
        endYear, endMonth, endDate
      )
    ) // year, month, date
  };
  if (repeatPeriod === "YEAR") {
    config["freq"] = RRule.YEARLY;
  } else if (repeatPeriod === "MONTH") {
    config["freq"] = RRule.MONTHLY;
  } else if (repeatPeriod === "WEEK") {
    config["freq"] = RRule.WEEKLY;
    let array = [];

    if (repeatOn.includes("MO")) {
      array.push(RRule.MO);
    }
    if (repeatOn.includes("TU")) {
      array.push(RRule.TU);
    }
    if (repeatOn.includes("WE")) {
      array.push(RRule.WE);
    }
    if (repeatOn.includes("TH")) {
      array.push(RRule.TH);
    }
    if (repeatOn.includes("FR")) {
      array.push(RRule.FR);
    }
    if (repeatOn.includes("SA")) {
      array.push(RRule.SA);
    }
    if (repeatOn.includes("SU")) {
      array.push(RRule.SU);
    }
    config["byweekday"] = array;
  } else if (repeatPeriod === "DAY") {
    config["freq"] = RRule.DAILY;
  }

  const rule = new RRule(config);
  performingDates = rule.all();

  return performingDates;


}
