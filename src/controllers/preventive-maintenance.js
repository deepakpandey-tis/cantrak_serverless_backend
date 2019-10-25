const Joi = require("@hapi/joi");
const _   = require("lodash");
const moment = require("moment");
require("moment-recur");

const { RRule, RRuleSet, rrulestr } = require("rrule");
const knex = require("../db/knex");

//const trx = knex.transaction();
function getYears(mils) {
  let years = Math.ceil(mils / (1000 * 60 * 60 * 24 * 365));
  return years;
}

const pmController = {
  createPmTaskSchedule: async (req, res) => {
    try {
      //let noOfDates = null
      let pm_task = null;
      let tasks = null;
      let assetResults = [];
      await knex.transaction(async trx => {
        let payload = req.body;
        let repeatType = payload.repeatType;
        let repeatOn = payload.repeatOn && payload.repeatOn.length ? payload.repeatOn.join(','):[];
        let repeatNumber = Number(payload.repeatNumber);
        let start = new Date(payload.pmStartDateTime);
        let startYear = start.getFullYear();
        let startMonth = start.getMonth();
        let startDate = start.getDate();
        let end = new Date(payload.pmEndDateTime);
        let endYear = end.getFullYear();
        let endMonth = end.getMonth();
        let endDate = end.getDate();
        let pmPerformingDates;

        let config = {
          interval: repeatNumber,
          dtstart: new Date(Date.UTC(startYear, startMonth, startDate)),
          until: new Date(Date.UTC(endYear, endMonth, endDate)) // year, month, date
        };
        if (repeatType === "YEAR") {
          config["freq"] = RRule.YEARLY;
        } else if (repeatType === "MONTH") {
          config["freq"] = RRule.MONTHLY;
        } else if (repeatType === "WEEK") {
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
        } else if (repeatType === "DAY") {
          config["freq"] = RRule.DAILY;
        }




        const schema = Joi.object().keys({
          assetCategoryId: Joi.number().required(),
          pmStartDateTime: Joi.date().required(),
          pmEndDateTime: Joi.date().required(),
          repeatType: Joi.string().required(),
          repeatNumber: Joi.number().required(),
          assets: Joi.array().items(Joi.string().required()).strict().required(),
          tasks: Joi.array().items(Joi.string().required()).strict().required(),
      });

      const result = Joi.validate(_.omit(payload,'repeatOn'), schema);
      console.log('[controllers][preventive-maintaince][createpmtask]: JOi Result', result);

      if (result && result.hasOwnProperty('error') && result.error) {
          return res.status(400).json({
              errors: [
                  { code: 'VALIDATION_ERROR', message: result.error.message }
              ],
          });
      }




        const rule = new RRule(config);

        pmPerformingDates = rule.all();

        // insert into pm task to pm_master
        let currentTime = new Date().getTime();
        let insertPayload = {
          assetCategoryId: payload.assetCategoryId,
          pmStartDate: payload.pmStartDateTime,
          pmStopDate: payload.pmEndDateTime,
          updatedAt: currentTime,
          createdAt: currentTime,
          repeatType: payload.repeatType,
          repeatOn,
          repeatNumber: payload.repeatNumber
        };
        pmResult = await knex
          .insert(insertPayload)
          .returning(["*"])
          .transacting(trx)
          .into("pm_master");
        pm_task = pmResult[0];

        // insert tasks

        let tasksInsertPayload = payload.tasks.map(v => ({
          pmMasterId: pm_task.id,
          taskName: v,
          updatedAt: currentTime,
          createdAt: currentTime
        }));
        tasks = await knex
          .insert(tasksInsertPayload)
          .returning(["*"])
          .transacting(trx)
          .into("pm_task_master");
        // for each pm performing date for each asset add entry to pm_assign_asset with pm_id

        // insert into pm_assign_assets

        for (let i = 0; i < payload.assets.length; i++) {
          const assetId = payload.assets[i];

          for (let j = 0; j < pmPerformingDates.length; j++) {
            const date = pmPerformingDates[j];
            let assetResult = await knex
              .insert({
                pmDate: date,
                pmMasterId: pm_task.id,
                assetId,
                createdAt: currentTime,
                updatedAt: currentTime
              })
              .returning(["*"])
              .transacting(trx)
              .into("pm_assign_assets");
            assetResults.push(assetResult[0]);
          }
        }
        trx.commit;
      });

      return res.status(200).json({
        data: {
          pm_task: pm_task,
          tasks,
          assetResults
        },
        message: "Task created successfully!"
      });
    } catch (err) {
      console.log("[controllers][people][UpdatePeople] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
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
  assignTeamToPmTask: async (req, res) => {
    try {
      let assignedTeam = null;
      let addedAdditionalUsers = [];

      await knex.transaction(async trx => {
        let payload = req.body;
        let additionalUsers = payload.additionalUsers;

        const currentTime = new Date().getTime();
        // add to assigned_service_team
        let insertedTeamResult = await knex
          .insert({
            entityType: "pm_master",
            entityId: payload.pmMasterId,
            updatedAt: currentTime,
            createdAt: currentTime,
            teamId: payload.teamId,
            userId: payload.userId
          })
          .returning(["*"])
          .transacting(trx)
          .into("assigned_service_team");
        assignedTeam = insertedTeamResult[0];

        // Now add additional users to the table assigned_service_additional_users

        for (let i = 0; i < additionalUsers.length; i++) {
          const id = additionalUsers[i];
          let result = await knex
            .insert({
              updatedAt: currentTime,
              createdAt: currentTime,
              entityId: payload.pmMasterId,
              entityType: "pm_master",
              userId: payload.userId
            })
            .returning(["*"])
            .transacting(trx)
            .into("assigned_service_additional_users");
          addedAdditionalUsers.push(result[0]);
        }
        trx.commit;
      });
      return res.status(200).json({
        data: {
          assignedTeam,
          additionalUsers: addedAdditionalUsers
        },
        message: "Team added to PM"
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
            if(images){
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
  getPmById:async(req,res) => {
    try {
      const pmMasterId = req.body.pmMasterId;
      const pm = await knex('pm_master').select('pmStartDate','pmStopDate','repeatType','repeatOn','repeatNumber').where({id:pmMasterId})
      return res.status(200).json({
        data: {
          pm: pm[0]
        }
      })
    }catch(err){
      console.log("[controllers][people][UpdatePeople] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getPmListByAssetId: async(req,res) => {
    try {
      // here i need to get pms by assetId
      let assetId = req.body.assetId;




      let pagination = {};
      let per_page = req.query.per_page || 10;
      let page = req.query.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;


      let [total, rows] = await Promise.all([
        knex.select().from('pm_master')
          .whereIn('id', function () {
            this.distinct('pmMasterId')
              .from('pm_assign_assets')
              .innerJoin('pm_master', 'pm_assign_assets.pmMasterId', 'pm_master.id')
              .where({ assetId })
          }),
        knex.select().from('pm_master')
          .whereIn('id', function () {
            this.distinct('pmMasterId')
              .from('pm_assign_assets')
              .innerJoin('pm_master', 'pm_assign_assets.pmMasterId', 'pm_master.id')
              .where({ assetId })
          })
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

        res.status(200).json({
          data: {
            pms:pagination
          }
        })

    } catch(err) {
      console.log("[controllers][people][UpdatePeople] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getPMList: async (req,res) => {
    try {
      let pagination = {};
      let per_page = req.query.per_page || 10;
      let page = req.query.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;
      
      //const pms = await knex('pm_master').select()

      let [total,rows] = await Promise.all([
        knex.from('pm_master')
       // .innerJoin('asset_category_master','pm_master.assetCategoryId','asset_category_master.id')
        ///.offset(offset).limit(per_page)
        
        ,
        knex.from('pm_master')
        //.innerJoin('asset_category_master','pm_master.assetCategoryId','asset_category_master.id')
        .offset(offset).limit(per_page)
        
      ])

      // let [total, rows] = await Promise.all([
      //   knex
      //     .count("* as count", "pm_master.*")
      //     .from("pm_master")
      //     .offset(offset)
      //     .limit(per_page)
      //     .first(),
      //   knex
      //     .from("pm_master")
      //     .offset(offset)
      //     .limit(per_page)
      //   ])

       // console.log(JSON.stringify(total,null,2))

      let count = total.length;
      pagination.total = count;
      pagination.per_page = per_page;
      pagination.offset = offset;
      pagination.to = offset + rows.length;
      pagination.last_page = Math.ceil(count / per_page);
      pagination.current_page = page;
      pagination.from = offset;
      pagination.data = rows;

      res.status(200).json({
        data: {
          preventive_maintenance: pagination
        },
        message: 'PM List'
      })
    } catch(err) {
      console.log("[controllers][people][UpdatePeople] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getSingleAssetPmScheduleList: async (req,res) => {
    try {
      // Get whole pm schedule list of an asset
      let pmMasterId = req.body.pmMasterId;
      const assetSerialOrBarcode = req.body.assetSerialOrBarcode
      // need to find assetId by assetSerial or assetBarcode
      //let assetId = req.body.asset
      let pmSchedule = await knex('pm_master').select().where({id:pmMasterId})
      let assetResult = await knex('asset_master').select('id').where(qb => {
        qb.where({'barcode':`${assetSerialOrBarcode}`}).orWhere({'assetSerial':`${assetSerialOrBarcode}`})
      })
      console.log(assetResult)
      let assetId = assetResult && assetResult.length  ? assetResult[0].id : null;

      if(!assetId){
        return res.status(200).json({
          data: {
            pmSchedule: pmSchedule[0],
            assets: []
          }  
        })
      }
      let assets = await knex('pm_assign_assets').select().where({assetId,pmMasterId});
      return res.status(200).json({
        data: {
          pmSchedule: pmSchedule[0],
          assets: assets
        }
      })
        } catch(err) {
      console.log("[controllers][people][UpdatePeople] :  Error", err);
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getAssetListOfPm: async (req,res) => {
    try {
      const pmMasterId = req.body.pmMasterId;
      const assetId = req.body.assetId
      let total, rows
      let pagination = {};
      let per_page = req.query.per_page || 10;
      let page = req.query.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;
      
      if(assetId){
        [total, rows] = await Promise.all([
          knex
            .from("pm_assign_assets")
            .innerJoin('asset_master', 'pm_assign_assets.assetId', 'asset_master.id')
            .where({ pmMasterId,'asset_master.id':assetId })
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
            .where({pmMasterId})
            .whereNull('pm_assign_assets.endDateTime')
            ,
          knex
            .from("pm_assign_assets")
            .innerJoin('asset_master', 'pm_assign_assets.assetId', 'asset_master.id')
            .groupBy('pm_assign_assets.id', 'asset_master.id')
            .where({pmMasterId})
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
          assets:pagination
        },
        message: 'Asset list of a PM'
      })
    } catch(err) {
      console.log("[controllers][people][UpdatePeople] :  Error", err);
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getAssetListWithCompletedPm: async (req,res) => {
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
    } catch(err) {
      console.log("[controllers][people][UpdatePeople] :  Error", err);
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getAssetIdByAssetSerialOrBarcode:async(req,res) => {
    try {
      const assetSerialOrBarcode = req.body.assetSerialOrBarcode;
      if(!assetSerialOrBarcode){
        return res.status(200).json({
          data: {
            assetId: ''
          }
        })
      }
      let asset = await knex('asset_master').select('id').where({assetSerial:assetSerialOrBarcode}).orWhere({barcode:assetSerialOrBarcode})
      if (asset && asset.length){
        asset = asset[0].id
          return res.status(200).json({
            data: {
              assetId:asset
            }
          })
      }
      return res.status(200).json({
        data: {
          assetId:''
        }
      })

    } catch(err) {
      console.log("[controllers][people][UpdatePeople] :  Error", err);
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  // getPmTaskScheduleList: async (req, res) => {
  //   try {
  //     let pmPayload = req.body;

  //     let filterList = {};
  //     let newCreatedDate = "";
  //     let newCreatedDateTo = "";

  //     let pagination = {};
  //     let per_page = req.query.per_page || 10;
  //     let page = req.query.current_page || 1;
  //     if (page < 1) page = 1;
  //     let offset = (page - 1) * per_page;

  //     if (pmPayload.isFilterActive == "true") {
  //       // assetType
  //       if (
  //         pmPayload.assetType != "undefined" &&
  //         pmPayload.assetType != "" &&
  //         pmPayload.assetType
  //       ) {
  //         filterList["pm.assetCategoryId"] = pmPayload.assetType;
  //       }

  //       // assetSerial
  //       if (pmPayload.assetSerial != "undefined" && pmPayload.assetSerial) {
  //         filterList["asass.assetId"] = pmPayload.assetSerial;
  //       }

  //       // project
  //       if (pmPayload.project != "undefined" && pmPayload.project) {
  //         filterList["pro.project"] = pmPayload.project;
  //       }

  //       // floor
  //       if (pmPayload.floor != "undefined" && pmPayload.floor) {
  //         filterList["pro.floor"] = pmPayload.floor;
  //       }

  //       // building
  //       if (
  //         (pmPayload.building != "undefined",
  //         pmPayload.building != "" && pmPayload.building)
  //       ) {
  //         filterList["pro.building"] = pmPayload.building;
  //       }

  //       // assignedTeam
  //       if (
  //         pmPayload.assignedTeam != "undefined" &&
  //         pmPayload.assignedTeam != "" &&
  //         pmPayload.assignedTeam
  //       ) {
  //         filterList["assTeam.teamId"] = pmPayload.assignedTeam;
  //       }

  //       // assignedUser
  //       if (
  //         pmPayload.assignedUser != "undefined" &&
  //         pmPayload.assignedUser != "" &&
  //         pmPayload.assignedUser
  //       ) {
  //         filterList["addUser.assignedUser"] = pmPayload.assignedUser;
  //       }

  //       // pmFromDate DATES
  //       if (
  //         pmPayload.pmFromDate != "undefined" &&
  //         pmPayload.pmFromDate != "" &&
  //         pmPayload.pmFromDate &&
  //         pmPayload.pmToDate != "undefined" &&
  //         pmPayload.pmToDate != "" &&
  //         pmPayload.pmToDate
  //       ) {
  //         let myDate = pmPayload.pmFromDate;
  //         console.log("fromDate", myDate);
  //         newCreatedDate = new Date(myDate).getTime();

  //         let myDateTo = pmPayload.pmToDate;
  //         console.log("toDate", myDateTo);
  //         newCreatedDateTo = new Date(myDateTo).getTime();
  //       }

  //       console.log("Filter Query", filterList);

  //       /* Get List of survey order List By Filter Data */

  //       // For get the totalCount
  //       total = await knex
  //         .count("* as count")
  //         .from("pm_master As pm")
  //         .where(qb => {
  //           qb.where(filterList);
  //           if (newCreatedDate || newCreatedDateTo) {
  //             qb.whereBetween("pm.createdAt", [
  //               newCreatedDate,
  //               newCreatedDateTo
  //             ]);
  //           }
  //         })
  //         .innerJoin("pm_assign_assets as asass", "pm.id", "asass.assetId")
  //         .leftJoin(
  //           "assigned_service_team AS assTeam",
  //           "pm.id",
  //           "assTeam.entityId"
  //         )
  //         .select("pm.id AS pmId", "pm.createdAt AS createdAt")
  //         .groupBy([
  //           "pm.id",
  //           // "pm.id",
  //           "asass.id",
  //           "assTeam.id"
  //         ]);

  //       // For Get Rows In Pagination With Offset and Limit
  //       rows = await knex
  //         .select("pm.id AS pmId", "pm.createdAt AS createdAt")
  //         .from("pm_master As pm")
  //         .where(qb => {
  //           qb.where(filterList);
  //           if (newCreatedDate || newCreatedDateTo) {
  //             qb.whereBetween("pm.createdAt", [
  //               newCreatedDate,
  //               newCreatedDateTo
  //             ]);
  //           }
  //         })
  //         .innerJoin("pm_assign_assets as asass", "pm.id", "asass.assetId")
  //         .leftJoin(
  //           "assigned_service_team AS assTeam",
  //           "pm.id",
  //           "assTeam.entityId"
  //         )
  //         .offset(offset)
  //         .limit(per_page);
  //     } else if (pmPayload.isFilterActive == "false") {
  //       /* Get List of All survey order of particular service requests */
  //       // For get the totalCount
  //       total = await knex
  //         .count("* as count")
  //         .from("pm_master")
  //         .where({ isActive: "true" })
  //         .innerJoin(
  //           "service_requests",
  //           "survey_orders.serviceRequestId",
  //           "service_requests.id"
  //         )
  //         .groupBy(["pm_master.id"])
  //         .select(["pm_master.*"]);

  //       // For get the rows With pagination
  //       rows = await knex
  //         .select()
  //         .from("pm_master")
  //         .where({ isActive: "true" })
  //         .innerJoin(
  //           "service_requests",
  //           "survey_orders.serviceRequestId",
  //           "service_requests.id"
  //         )
  //         .select(["pm_master.*"])
  //         .offset(offset)
  //         .limit(per_page);
  //     }

  //     let count = total.length;
  //     pagination.total = count;
  //     pagination.per_page = per_page;
  //     pagination.offset = offset;
  //     pagination.to = offset + rows.length;
  //     pagination.last_page = Math.ceil(count / per_page);
  //     pagination.current_page = page;
  //     pagination.from = offset;
  //     pagination.data = rows;

  //     res.status(200).json({
  //       data: pagination,
  //       message: "Preventive Maintenance List"
  //     });
  //   } catch (err) {
  //     console.log("[controllers][pm][getPmTaskScheduleList] :  Error", err);
  //     res.status(500).json({
  //       errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
  //     });
  //   }
  // },
  // getPmTaskScheduleLists: async (req, res) => {
  //   try {
  //     let reqData = req.query;
  //     let pagination = {};
  //     console.log("request params", reqData);
  //     let per_page = reqData.per_page || 10;
  //     let page = reqData.current_page || 1;
  //     if (page < 1) page = 1;
  //     let offset = (page - 1) * per_page;

  //     let [total, rows] = await Promise.all([
  //       knex
  //         .count("* as count", "pm_master.*")
  //         .from("pm_master")
  //         .where({ "pm_master.isActive": "true" })
  //         .offset(offset)
  //         .limit(per_page)
  //         .first(),
  //       knex
  //         .from("pm_master")
  //         .innerJoin(
  //           "assigned_service_team",
  //           "pm_master.id",
  //           "=",
  //           "assigned_service_team.entityId",
  //           "assigned_service_team.entityType",
  //           "=",
  //           "pm_master"
  //         )
  //         .innerJoin(
  //           "incident_categories",
  //           "pm_master.assetCategoryId",
  //           "=",
  //           "incident_categories.id"
  //         )
  //         .offset(offset)
  //         .limit(per_page)
  //     ]);

  //     let count = total.count;
  //     pagination.total = count;
  //     pagination.per_page = per_page;
  //     pagination.offset = offset;
  //     pagination.to = offset + rows.length;
  //     pagination.last_page = Math.ceil(count / per_page);
  //     pagination.current_page = page;
  //     pagination.from = offset;
  //     pagination.data = rows;

  //     return res.status(200).json({
  //       data: {
  //         pmTask: pagination
  //       },
  //       message: "PM Task Scheduled List!"
  //     });
  //   } catch (err) {
  //     console.log("[controllers][pm][getpmList] : Error", err);
  //     trx.rollback;
  //     res.status(500).json({
  //       errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
  //     });
  //   }
  // },
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
  },getTaskListByPmId: async(req,res)=>{

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
  updateAssetPm: async (req,res)=>{

    try{
      let   assetData = null;
      const payload  = req.body;

      const schema = Joi.object().keys({
        pmMasterId: Joi.number().required(),
        assetId: Joi.number().required(),
        pmDate:Joi.date().required(),
        startDateTime:Joi.date().required(),
        endDateTime:Joi.date().required(),
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

          let currentTime  = new Date().getTime()
          let updateData   = { ...payload, updatedAt: currentTime };
          let updateResult = await knex('pm_assign_assets').update(updateData)
          .where({pmMasterId:payload.pmMasterId,assetId:payload.assetId,pmDate:payload.pmDate}).returning(['*'])
          assetData        = updateResult[0]

          return res.status(200).json({
            data: {
              assetPmUpdateData: assetData
            },
            message: 'Asset Pm EndDate Updated Successfully!'
          })
          

    }catch(err){
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
    // Get PM Report
  },getPmReport:async (req,res)=>{

    try{

      let   reportData = null;
      const payload  = req.body;

      const schema = Joi.object().keys({
        pmMasterId: Joi.number().required(),
        assetId: Joi.number().required(),
        pmDate:Joi.date().required(),
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
      .innerJoin('pm_feedbacks','pm_assign_assets.pmMasterId','pm_feedbacks.pmMasterId')
      .innerJoin('pm_task_master','pm_assign_assets.pmMasterId','pm_task_master.pmMasterId')
      .leftJoin('images','pm_feedbacks.id','images.entityId')
      .select([
        'pm_assign_assets.id as id',
        'pm_task_master.taskName as Task Name',
        'pm_feedbacks.description as Feedback Description',
        'pm_assign_assets.startDateTime as startDate',
        'pm_assign_assets.startDateTime as endDate',
        'images.s3Url as image_url'
      ])
      .where({'pm_assign_assets.pmMasterId':payload.pmMasterId,'pm_assign_assets.assetId':payload.assetId,'pm_assign_assets.pmDate':payload.pmDate})

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
  savePMTemplate: async (req,res) => {
    try {
      const {name,templateData} = req.body;
      const result = await knex('pm_templates').insert({name,templateData})
      return res.status(200).json({
        data: {
          template: result[0]
        }
      })
    } catch(err) {
      console.log('[controllers][preventive-maintainece][pmreport] :  Error', err);
      //trx.rollback
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  searchPMTemplate: async (req,res) => {
    try {
      let {taskGroupSearchTerm} = req.body;
      let found = await knex('pm_templates').select().where(qb => {
        qb.where('pm_templates.name','like',`%${taskGroupSearchTerm}`)
      })

      if(found && found.length){

        return res.status(200).json({
          data: {
            search_result:found
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

    } catch(err) {
      console.log('[controllers][preventive-maintainece][pmreport] :  Error', err);
      //trx.rollback
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  }

};
module.exports = pmController;
