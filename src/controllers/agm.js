const Joi = require("@hapi/joi");
const _ = require("lodash");

const knex = require("../db/knex");
const moment = require("moment");
const { join, orderBy, trim } = require("lodash");
const redisHelper = require("../helpers/redis");
const { leftJoin } = require("../db/knex");

const agmController = {
  generateAGMId: async (req, res) => {
    try {
      const generatedId = await knex("agm_master")
        .insert({ createdAt: new Date().getTime() })
        .returning(["*"]);

      return res.status(200).json({
        data: {
          id: generatedId[0].id,
        },
      });
    } catch (err) {
      console.log(
        "[controllers][AGM][generate] :  Error",
        err
      );
      return res.status(500).json({
        errors: [
          {
            code: "UNKNOWN_SERVER_ERROR",
            message: err.message,
          },
        ],
      });
    }
  },

  /* Add Agm Preparation */
  addAgmPreparation: async (req, res) => {
    try {
      let addedAGMResult = null;
      let agmPrepPayload = req.body;
      let addedChoices = [];

      console.log("payload for agm===>>>", req.body);
      await knex.transaction(async (trx) => {
        const payload = _.omit(req.body, [
          "agmId",
          "finalAddedAgenda",
          "description",
          "proxyDocumentName",
          "template",
          "waterMarkText",
          "proxyDocument",
          "combineOwnershipRatio"
        ]);

        const schema = Joi.object().keys({
          agmName: Joi.string().required(),
          companyId: Joi.string().required(),
          projectId: Joi.string().required(),
          agmDate: Joi.string().required(),
          startTime: Joi.string().required(),
          endTime: Joi.string().required(),
        });
        const result = Joi.validate(payload, schema);
        if (
          result &&
          result.hasOwnProperty("error") &&
          result.error
        ) {
          return res.status(400).json({
            errors: [
              {
                code: "VALIDATION_ERROR",
                message: result.error.message,
              },
            ],
          });
        }

        let checkUpdate = await knex("agm_master")
          .where({ id: req.body.agmId })
          .first();

        if (
          checkUpdate &&
          checkUpdate.moderationStatus == true
        ) {
          message = "AGM updated successfully!";
        } else {
          message = "AGM added successfully!";
        }

        let currentTime = new Date().getTime();

        let addAGMResultData = await knex("agm_master")
          .update({
            // ...payload,
            companyId: payload.companyId,
            projectId: payload.projectId,
            agmName: payload.agmName,
            agmDate: new Date(payload.agmDate).getTime(),
            startTime: new Date(
              payload.startTime
            ).getTime(),
            endTime: new Date(payload.endTime).getTime(),
            waterMarkText: req.body.waterMarkText,
            updatedAt: currentTime,
            createdAt: currentTime,
            orgId: req.orgId,
            createdBy: req.me.id,
            moderationStatus: true,
            combineOwnershipRatio:req.body.combineOwnershipRatio
          })
          .where({ id: req.body.agmId })
          .returning(["*"]);
        addedAGMResult = addAGMResultData[0];

        //insert agenda

        let agendaPayload = req.body.finalAddedAgenda;

        console.log("agenda payload===>>>", agendaPayload);

        let delAgenda = await knex("agenda_master")
          .where({
            agmId: addedAGMResult.id,
          })
          .del();

        addedAgenda = [];

        for (let agenda of agendaPayload) {
          console.log("agenda====>>>>", agenda);
          // i++;
          let eligibility;
          if (agenda.eligibleForVoting == "Yes") {
            eligibility = true;
          } else {
            eligibility = false;
          }
          let addedAgendaResult = await knex(
            "agenda_master"
          )
            .insert({
              agmId: addedAGMResult.id,
              agendaName: agenda.agendaName,
              agendaNameThai: agenda.agendaNameThai,
              agendaNo: agenda.agendaNo,
              eligibleForVoting: eligibility,
              isMultiSelect : agenda.isMultiSelect,
              updatedAt: currentTime,
              createdAt: currentTime,
              orgId: req.orgId,
            })
            .returning(["*"]);
          addedAgenda.push(addedAgendaResult[0]);

          console.log(
            "added agenda",
            addedAgendaResult[0].id
          );

          for (let c of agenda.choices) {
            console.log("agenda choices===>>>>", c);
            let agendaChoiceResult = await knex(
              "agenda_choice"
            ).insert({
              agendaId: addedAgendaResult[0].id,
              choiceValue: c.choice,
              choiceValueThai: c.choiceThai,
              updatedAt: currentTime,
              createdAt: currentTime,
              orgId: req.orgId,
            });

            addedChoices = agendaChoiceResult[0];
          }

          console.log("added choices", addedChoices);
        }

        //insert proxy document

        let proxyDocumentPayload =
          req.body.proxyDocumentName;

        let delProxyDocument = await knex(
          "agm_proxy_document_master"
        )
          .where({
            agmId: addedAGMResult.id,
          })
          .del();

        for (let proxy of proxyDocumentPayload) {
          console.log("proxy document===>>>>", proxy);

          let proxyResult = await knex(
            "agm_proxy_document_master"
          ).insert({
            agmId: addedAGMResult.id,
            documentName: req.body.proxyDocument,
            subDocumentName: proxy.proxyName,
            updatedAt: currentTime,
            createdAt: currentTime,
            orgId: req.orgId,
          });
        }

        trx.commit;
      });

      return res.status(200).json({
        message: "AgM added successfully",
      });
    } catch (err) {
      return res.status(200).json({
        errors: [
          {
            code: "UNKNOWN SERVER ERROR",
            message: err.message,
          },
        ],
      });
    }
  },

  /* Update Agm Preparation */
  updateAgmPreparation: async (req, res) => {
    try {
      let addedAGMResult = null;
      let agmPrepPayload = req.body;

      await knex.transaction(async (trx) => {
        const payload = _.omit(req.body, [
          "agmId",
          "votingAgendaName",
          "description",
          "proxyDocumentName",
          "ProxyDocumentTemplateId",
          "subDocument",
        ]);

        const schema = Joi.object().keys({
          name: Joi.string().required(),
          companyId: Joi.string().required(),
          projectId: Joi.string().required(),
          agmdate: Joi.string().required(),
        });
        const result = Joi.validate(payload, schema);
        if (
          result &&
          result.hasOwnProperty("error") &&
          result.error
        ) {
          return res.status(400).json({
            errors: [
              {
                code: "VALIDATION_ERROR",
                message: result.error.message,
              },
            ],
          });
        }

        let checkUpdate = await knex("agm_master")
          .where({ id: req.body.agmId })
          .first();

        if (
          checkUpdate &&
          checkUpdate.moderationStatus == true
        ) {
          message = "AGM updated successfully!";
        } else {
          message = "AGM added successfully!";
        }

        let currentTime = new Date().getTime();

        let addAGMResultData = await knex("agm_master")
          .update({
            ...payload,
            updatedAt: currentTime,
            createdAt: currentTime,
            orgId: req.orgId,
            createdBy: req.me.id,
            moderationStatus: true,
          })
          .where({ id: req.body.agmId })
          .returning(["*"]);
        addedAGMResult = addAGMResultData[0];

        //insert agenda

        let agendaPayload = req.body.agendaPayload;

        let delAgenda = await knex("agenda_master")
          .where({
            agmId: addedAGMResult.id,
          })
          .del();

        addedAgenda = [];

        for (let agenda of agendaPayload) {
          let addedAgendaResult = await knex(
            "agenda_master"
          )
            .insert({
              agmId: addedAGMResult.id,
              entityType: "agenda_master",
              ...agenda,
              updatedAt: currentTime,
              createdAt: currentTime,
              orgId: req.orgId,
              createdBy: req.me.id,
            })
            .returning(["*"]);
          addedAgenda.push(addedAgendaResult[0]);
        }

        //insert proxy document

        let proxyDocumentPayload =
          req.body.proxyDocumentPayload;

        let delProxyDocument = await knex("proxy_document")
          .where({
            entityId: addedAGMResult.id,
          })
          .del();

        trx.commit;
      });
    } catch (err) {
      return res.status(200).json({
        errors: [
          {
            code: "UNKNOWN SERVER ERROR",
            message: err.message,
          },
        ],
      });
    }
  },

  /**IMPORT OWNER DATA */
  importOwnerData: async (req, res) => {
    try {
      let data = req.body.arrayToObject;

      console.log("+++++++++++++", req.body, "=========");
      let totalData = data.length - 1;
      let fail = 0;
      let success = 0;
      let result = null;
      let userId = req.me.id;
      let errors = [];
      let header = Object.values(data[0]);
      header.unshift("Error");
      errors.push(header);

      if (
        data[0].B === "UNIT_NO" &&
        data[0].C === "HOUSE_NO" &&
        data[0].D == "ACTUAL_OWNERSHIP_RATIO" &&
        data[0].E === "OWNERSHIP_RATIO" &&
        data[0].F === "CO_OWNER_NAME" &&
        data[0].G === "ELIGIBILITY_TOGGLE"
        // data[0].G === "ID_NO" &&
        // data[0].H === "JOIN_OWNER_NAME"
      ) {
        if (data.length > 0) {
          let i = 0;
          for (let ownerData of data) {
            i++;
            if (i > 1) {
              if (!ownerData.B) {
                let values = _.values(ownerData);
                values.unshift("Unit no. can not empty!");
                errors.push(values);
                fail++;
                continue;
              }

              if (!ownerData.C) {
                let values = _.values(ownerData);
                values.unshift(
                  "House Number can not empty!"
                );
                errors.push(values);
                fail++;
                continue;
              }

              if (!ownerData.D) {
                let values = _.values(ownerData);
                values.unshift(
                  "Actual Ownership ratio can not empty!"
                );
                errors.push(values);
                fail++;
                continue;
              }

              if (!ownerData.E) {
                let values = _.values(ownerData);
                values.unshift(
                  "Ownership ratio can not be empty!"
                );
                errors.push(values);
                fail++;
                continue;
              }

              if (!ownerData.F) {
                let values = _.values(ownerData);
                values.unshift(
                  "Co owner name can not be empty!"
                );
                errors.push(values);
                fail++;
                continue;
              }
              let unitId;
              let checkExist = await knex("property_units")
                .select("id")
                .where({
                  orgId: req.orgId,
                  unitNumber: ownerData.B.toUpperCase(),
                });

              if (checkExist.length > 0) {
                unitId = checkExist[0].id;
              } else {
                let values = _.values(ownerData);
                values.unshift(
                  "Unit Number Does not exist!"
                );
                errors.push(values);
                fail++;
                continue;
              }

              let eligibility;
              console.log(
                "ownerdata h====>>>>>",
                ownerData.H
              );
              if (ownerData.F == "Yes") {
                eligibility = true;
              } else {
                eligibility = false;
              }

              let ownerName = ownerData.F.trim();

              // console.log("owner name value",ownerName)

              let insertData = {
                agmId: req.body.agmId,
                companyId: req.body.companyId,
                projectId: req.body.projectId,
                unitId: unitId,
                unitNumber: ownerData.B,
                houseId: ownerData.C,
                ownerName: ownerName,
                joinOwnerName: ownerData.I,
                actualOwnershipRatio: ownerData.D,
                ownershipRatio: ownerData.E,
                ownerIdNo: ownerData.H,
                eligibility: eligibility,
                orgId: req.orgId,
                isActive: true,
                createdAt: new Date().getTime(),
                updatedAt: new Date().getTime(),
                createdBy: req.me.id,
              };

              let resultData = await knex
                .insert(insertData)
                .returning(["*"])
                .into("agm_owner_master");
              success++;
            }
          }

          let message = null;
          if (totalData == success) {
            message =
              "System have processed ( " +
              totalData +
              " ) entries and added them successfully!";
          } else {
            message =
              "System have processed ( " +
              totalData +
              " ) entries out of which only ( " +
              success +
              " ) are added and others are failed ( " +
              fail +
              " ) due to validation!";
          }
          return res.status(200).json({
            message: message,
            errors,
          });
        }
      } else {
        return res.status(400).json({
          errors: [
            {
              code: "VALIDATION_ERROR",
              message: "Please Choose valid File!",
            },
          ],
        });
      }
    } catch (err) {
      return res.status(500).json({
        errors: [
          {
            code: "UNKNOWN SERVER ERROR",
            message: err.message,
          },
        ],
      });
    }
  },

  /*ADD OWNER*/
  addOwner: async (req, res) => {
    try {
      let resultData;
      await knex.transaction(async (trx) => {
        const payload = _.omit(req.body, [
          "joinOwnerName",
          "ownerIdNo",
        ]);

        const schema = Joi.object().keys({
          agmId: Joi.string().required(),
          companyId: Joi.string().required(),
          projectId: Joi.string().required(),
          houseId: Joi.string().required(),
          unitNo: Joi.string().required(),
          ownerName: Joi.string().required(),
          // actualOwnershipRatio : Joi.string().required(),
          ownershipRatio: Joi.string().required(),
          eligibility: Joi.boolean().required(),
        });

        const result = Joi.validate(payload, schema);
        if (
          result &&
          result.hasOwnProperty("error") &&
          result.error
        ) {
          return res.status(400).json({
            errors: [
              {
                code: "VALIDATION_ERROR",
                message: result.error.message,
              },
            ],
          });
        }

        let insertData = {
          agmId: payload.agmId,
          unitId: payload.unitNo,
          companyId: payload.companyId,
          projectId: payload.projectId,
          ownerName: payload.ownerName,
          joinOwnerName: req.body.joinOwnerName,
          // actualOwnershipRatio: req.body.actualOwnershipRatio,
          ownershipRatio: payload.ownershipRatio,
          ownerIdNo: payload.ownerIdNo,
          eligibility: payload.eligibility,
          orgId: req.orgId,
          isActive: true,
          createdAt: new Date().getTime(),
          updatedAt: new Date().getTime(),
          createdBy: req.me.id,
        };

        resultData = await knex
          .insert(insertData)
          .returning(["*"])
          .into("agm_owner_master");
        trx.commit;
      });
      return res.status(200).json({
        data: resultData,
        message: "Owner added successfully!",
      });
    } catch (err) {
      return res.status(500).json({
        errors: [
          {
            code: "UNKNOWN SERVER ERROR",
            message: err.message,
          },
        ],
      });
    }
  },

  /*UPDATE OWNER DATA */

  updateOwner: async (req, res) => {
    try {
      //console.log('atif');
      // let payload = req.body;
      let resultData;
      //console.log(req.body);
      await knex.transaction(async (trx) => {
        const payload = _.omit(req.body, [
          "joinOwnerName",
          "ownerIdNo",
        ]);
        console.log(payload);
        const schema = Joi.object().keys({
          ownerId: Joi.string().required(),
          agmId: Joi.string().required(),
          companyId: Joi.string().required(),
          projectId: Joi.string().required(),
          houseId: Joi.string().required(),
          unitNo: Joi.string().required(),
          ownerName: Joi.string().required(),
          ownershipRatio: Joi.string().required(),
          eligibility: Joi.boolean().required(),
        });

        const result = Joi.validate(payload, schema);
        if (
          result &&
          result.hasOwnProperty("error") &&
          result.error
        ) {
          return res.status(400).json({
            errors: [
              {
                code: "VALIDATION_ERROR",
                message: result.error.message,
              },
            ],
          });
        }

        let updateData = {
          agmId: payload.agmId,
          unitId: payload.unitNo,
          companyId: payload.companyId,
          projectId: payload.projectId,
          ownerName: payload.ownerName,
          joinOwnerName: req.body.joinOwnerName,
          ownershipRatio: payload.ownershipRatio,
          ownerIdNo: payload.ownerIdNo,
          eligibility: payload.eligibility,
          orgId: req.orgId,
          updatedAt: new Date().getTime(),
        };

        resultData = await knex("agm_owner_master")
          .update(updateData)
          .where({ id: payload.ownerId })
          .returning(["*"]);
      });
      return res.status(200).json({
        data: resultData,
        message: "Owner updated successfully!",
      });
    } catch (err) {
      return res.status(500).json({
        errors: [
          {
            code: "UNKNOWN SERVER ERROR",
            message: err.message,
          },
        ],
      });
    }
  },

  /*DELETE OWNER */
  deleteOwner: async (req, res) => {
    try {
      let payload = req.body;
      const schema = Joi.object().keys({
        id: Joi.string().required(),
      });
      const result = Joi.validate(payload, schema);
      if (
        result &&
        result.hasOwnProperty("error") &&
        result.error
      ) {
        return res.status(400).json({
          errors: [
            {
              code: "VALIDATION_ERROR",
              message: result.error.message,
            },
          ],
        });
      }
      let delResult = await knex("agm_owner_master")
        .where({ id: payload.id, orgId: req.orgId })
        .del()
        .returning(["*"]);
      return res.status(200).json({
        data: delResult,
        message: "Owner deleted successfully!",
      });
    } catch (err) {
      return res.status(500).json({
        errors: [
          {
            code: "UNKNOWN SERVER ERROR",
            message: err.message,
          },
        ],
      });
    }
  },

  /*UPDATE ELIGIBILITY */
  updateEligibility: async (req, res) => {
    try {
      let payload = req.body;

      const schema = new Joi.object().keys({
        id: Joi.string().required(),
        eligibility: Joi.string().required(),
      });

      const result = Joi.validate(payload, schema);
      if (
        result &&
        result.hasOwnProperty("error") &&
        result.error
      ) {
        return res.status(400).json({
          errors: [
            {
              code: "VALIDATION_ERROR",
              message: result.error.message,
            },
          ],
        });
      }

      let updateData = {
        eligibility: payload.eligibility,
      };

      let updateResult = await knex("agm_owner_master")
        .update(updateData)
        .where({ id: payload.id, orgId: req.orgId })
        .returning(["*"]);

      return res.status(200).json({
        data: updateResult,
        message: "Eligibility updated successfully!",
      });
    } catch (err) {
      return res.status(500).json({
        errors: [
          {
            code: "UNKNOWN SERVER ERROR",
            message: err.message,
          },
        ],
      });
    }
  },

  /*GET AGM LIST */
  getAgmList: async (req, res) => {
    try {
      let payload = req.body;
      let reqData = req.query;
      let total, rows;
      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;

      [total, rows] = await Promise.all([
        knex
          .count("* as count")
          .from("agm_master")
          .leftJoin(
            "companies",
            "agm_master.companyId",
            "companies.id"
          )
          .leftJoin(
            "projects",
            "agm_master.projectId",
            "projects.id"
          )
          .where({ "agm_master.orgId": req.orgId })
          .where((qb) => {
            if (payload.agmId) {
              qb.where("agm_master.id", payload.agmId);
            }
            if (payload.companyId) {
              qb.where(
                "agm_master.companyId",
                payload.companyId
              );
            }
            if (payload.projectId) {
              qb.where(
                "agm_master.projectId",
                payload.projectId
              );
            }
            if (payload.agmDate) {
              qb.where(
                "agm_master.agmDate",
                payload.agmDate
              );
            }
          })
          .first(),
        knex
          .from("agm_master")
          .leftJoin(
            "companies",
            "agm_master.companyId",
            "companies.id"
          )
          .leftJoin(
            "projects",
            "agm_master.projectId",
            "projects.id"
          )
          .select([
            "agm_master.*",
            "companies.companyName",
            "projects.projectName",
          ])
          .where({ "agm_master.orgId": req.orgId })
          .where((qb) => {
            if (payload.agmId) {
              qb.where("agm_master.id", payload.agmId);
            }
            if (payload.companyId) {
              qb.where(
                "agm_master.companyId",
                payload.companyId
              );
            }
            if (payload.projectId) {
              qb.where(
                "agm_master.projectId",
                payload.projectId
              );
            }
            if (payload.agmDate) {
              qb.where(
                "agm_master.agmDate",
                payload.agmDate
              );
            }
          })
          .offset(offset)
          .limit(per_page)
          .orderBy("agm_master.agmDate", "asc"),
      ]);

      let count = total.count;
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
          AGMList: pagination,
        },
        message: "AGM Preparation list successfully !",
      });
    } catch (err) {
      return res.status(500).json({
        errors: [
          {
            code: "UNKNOWN SERVER ERROR",
            message: err.message,
          },
        ],
      });
    }
  },

  /*GET OWNER LIST  */
  getOwnerList: async (req, res) => {
    try {
      let payload = req.body;
      console.log(
        "payload value for pages=====>>>>>",
        payload
      );
      let reqData = req.query;
      let total, rows;

      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;

      [total, rows] = await Promise.all([
        knex
          .count("* as count")
          .from("agm_owner_master")
          .leftJoin(
            "property_units",
            "agm_owner_master.unitId",
            "property_units.id"
          )

          // .leftJoin("proxy_document","agm_owner_master.agmId","proxy_document.agmId")
          // .where({
          //   "agm_owner_master.companyId": payload.companyId,
          //   "agm_owner_master.projectId": payload.projectId,
          // })
          .where({
            "agm_owner_master.agmId": payload.agmId,
            "agm_owner_master.orgId": req.orgId,
          })
          .where((qb) => {
            // qb.where("agm_owner_master.orgId", req.orgId);
            if (payload.filterType == 1) {
            }
            if (payload.filterType == 2) {
              qb.where(
                "agm_owner_master.registrationType",
                1
              );
            }
            if (payload.filterType == 3) {
              qb.where(
                "agm_owner_master.registrationType",
                2
              );
            }
            if (payload.filterType == 4) {
              qb.where(
                "agm_owner_master.registrationType",
                1
              );
              qb.orWhere(
                "agm_owner_master.registrationType",
                2
              );
            }
            if (payload.agmId) {
              qb.where(
                "agm_owner_master.agmId",
                payload.agmId
              );
            }
            if (payload.unitId) {
              qb.where(
                "agm_owner_master.unitId",
                payload.unitId
              );
            }
            if (payload.ownerName) {
              qb.where(
                "agm_owner_master.ownerName",
                "iLIKE",
                `%${payload.ownerName}%`
              );
            }
          })
          .first(),
        knex
          .from("agm_owner_master")
          .leftJoin(
            "property_units",
            "agm_owner_master.unitId",
            "property_units.id"
          )
          // .leftJoin("proxy_document","agm_owner_master.agmId","proxy_document.agmId")
          .select([
            "agm_owner_master.*",
            "property_units.unitNumber",
            "property_units.description as unitDescription",
          ])
          .where({
            "agm_owner_master.agmId": payload.agmId,
            "agm_owner_master.orgId": req.orgId,
          })
          .where((qb) => {
            if (payload.filterType == 1) {
            }
            if (payload.filterType == 2) {
              qb.where(
                "agm_owner_master.registrationType",
                1
              );
            }
            if (payload.filterType == 3) {
              qb.orWhere(
                "agm_owner_master.registrationType",
                2
              );
            }
            if (payload.filterType == 4) {
              qb.where(
                "agm_owner_master.registrationType",
                1
              );
              qb.orWhere(
                "agm_owner_master.registrationType",
                2
              );
            }

            if (payload.agmId) {
              qb.where(
                "agm_owner_master.agmId",
                payload.agmId
              );
            }
            if (payload.unitId) {
              qb.where(
                "agm_owner_master.unitId",
                payload.unitId
              );
            }
            if (payload.ownerName) {
              qb.where(
                "agm_owner_master.ownerName",
                "iLIKE",
                `%${payload.ownerName}%`
              );
            }
          })
          .offset(offset)
          .limit(per_page)
          .orderBy("agm_owner_master.unitNumber", "asc"),
      ]);

      const Parallel = require("async-parallel");

      rows = await Parallel.map(rows, async (pd) => {
        let proxyData = await knex
          .from("agm_proxy_documents")
          .select(["agm_proxy_documents.proxyName"])
          .where("agm_proxy_documents.ownerMasterId", pd.id)
          .first();

        return { ...pd, proxyData };
      });

      let count = total.count;
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
          ownerList: pagination,
        },
        message: "Owner list successfully !",
      });
    } catch (err) {
      return res.status(500).json({
        errors: [
          {
            code: "UNKNOWN SERVER ERROR",
            message: err.message,
          },
        ],
      });
    }
  },

  getOwnerListByUnit: async (req, res) => {
    try {
      let payload = req.body;

      let ownerList = await knex("agm_owner_master")
        .leftJoin(
          "property_units",
          "agm_owner_master.unitId",
          "property_units.id"
        )
        .select([
          "agm_owner_master.*",
          "property_units.unitNumber",
          "property_units.description as unitDescription",
        ])
        .where({
          "agm_owner_master.orgId": req.orgId,
          "agm_owner_master.agmId": payload.agmId,
        })
        .where((qb) => {
          if (payload.unitNo) {
            qb.whereIn(
              "agm_owner_master.unitId",
              payload.unitNo
            );
          }
          if (payload.ownerName) {
            qb.where(
              "agm_owner_master.ownerName",
              payload.ownerName
            );
          }
          if (payload.ownerIdNo) {
            qb.where(
              "agm_owner_master.ownerIdNo",
              payload.ownerIdNo
            );
          }
        });

      return res.status(200).json({
        data: ownerList,
        message: "get owner list Successfully!",
      });
    } catch (err) {
      return res.status(500).json({
        errors: [
          {
            code: "UNKNOWN SERVER ERROR",
            message: err.message,
          },
        ],
      });
    }
  },
  /*GET AGM DETAILS */
  getAgmDetails: async (req, res) => {
    try {
      let payload = req.body;
      const schema = new Joi.object().keys({
        id: Joi.string().required(),
      });

      const result = Joi.validate(payload, schema);
      if (
        result &&
        result.hasOwnProperty("error") &&
        result.error
      ) {
        return res.status(400).json({
          errors: [
            {
              code: "VALIDATION_ERROR",
              message: result.error.message,
            },
          ],
        });
      }

      let agmDetails = await knex("agm_master")
        .leftJoin(
          "companies",
          "agm_master.companyId",
          "companies.id"
        )
        .leftJoin(
          "projects",
          "agm_master.projectId",
          "projects.id"
        )
        .select([
          "agm_master.*",
          "companies.companyId as companyCode",
          "companies.companyName",
          "projects.project as projectCode",
          "projects.projectName",
        ])
        .where({
          "agm_master.id": payload.id,
          "agm_master.orgId": req.orgId,
        });

      let votingDocDownloadUrl = await redisHelper.getValue(
        `agm-${payload.id}-voting-docs-link`
      );

      return res.status(200).json({
        data: agmDetails,
        votingDocDownloadUrl,
        message: "Agm Details Successfully!",
      });
    } catch (err) {
      return res.status(500).json({
        errors: [
          {
            code: "UNKNOWN SERVER ERROR",
            message: err.message,
          },
        ],
      });
    }
  },

  ownerRegistration: async (req, res) => {
    try {
      const payload = _.omit(req.body, ["ownerId"]);

      const schema = new Joi.object().keys({
        agmId: Joi.string().required(),
        signature: Joi.string().required(),
        registrationType: Joi.string().required(),
      });

      const result = Joi.validate(payload, schema);
      if (
        result &&
        result.hasOwnProperty("error") &&
        result.error
      ) {
        return res.status(400).json({
          errors: [
            {
              code: "VALIDATION_ERROR",
              message: result.error.message,
            },
          ],
        });
      }

      let currentTime = new Date().getTime();

      let insertData = {
        signature: payload.signature,
        signatureAt: currentTime,
        registrationType: payload.registrationType,
      };

      let insertResult;
      for (let owner of req.body.ownerId) {
        console.log("owner data===", owner);
        insertData = await knex
          .update(insertData)
          .where({ agmId: payload.agmId, id: owner })
          .returning(["*"])
          .into("agm_owner_master");
      }

      return res.status(200).json({
        data: insertResult,
        message: "Signature registered added successfully!",
      });
    } catch (err) {
      return res.status(500).json({
        errors: [
          {
            code: "UNKNOWN SERVER ERROR",
            message: err.message,
          },
        ],
      });
    }
  },

  /*OWNER PROXY REGISTRATION*/
  ownerProxyRegistration: async (req, res) => {
    try {
      // let payload = req.body;
      console.log("owner Id====>>>>", req.body);
      const payload = _.omit(req.body, [
        "ownerId",
        "proxyName",
        "proxyId",
        "ownerProxyId",
        "imagesArray",
      ]);

      const schema = new Joi.object().keys({
        agmId: Joi.string().required(),
        signature: Joi.string().required(),
        type: Joi.string().required(),
      });

      const result = Joi.validate(payload, schema);
      if (
        result &&
        result.hasOwnProperty("error") &&
        result.error
      ) {
        return res.status(400).json({
          errors: [
            {
              code: "VALIDATION_ERROR",
              message: result.error.message,
            },
          ],
        });
      }
      let currentTime = new Date().getTime();

      let insertData = {
        signature: payload.signature,
        signatureAt: currentTime,
        registrationType: payload.type,
      };

      let insertResult;
      let insertProxyResult;

      for (let owner of req.body.ownerId) {
        insertResult = await knex
          .update(insertData)
          .where({ agmId: payload.agmId, id: owner })
          .returning(["*"])
          .into("agm_owner_master");

        for (let proxy of req.body.ownerProxyId) {
          let insertProxyData = {
            agmId: payload.agmId,
            ownerMasterId: owner,
            proxyDocumentMasterId: proxy,
            proxyName: req.body.proxyName,
            proxyIdentificationNumber: req.body.proxyId,
            createdAt: currentTime,
            updatedAt: currentTime,
            orgId: req.orgId,
          };

          insertProxyResult = await knex
            .insert(insertProxyData)
            .returning(["*"])
            .into("agm_proxy_documents");
        }

        let insertImages;
        if (req.body.imagesArray) {
          console.log(
            "images====>>>>",
            req.body.imagesArray
          );
          for (let image of req.body.imagesArray) {
            console.log("value in image===>>>", image);
            insertImages = await knex
              .insert({
                title: image.filename,
                name: image.filename,
                s3Url: image.s3Url,
                entityId: owner,
                entityType: "agm_proxy_documents",
                orgId: req.orgId,
              })
              .returning(["*"])
              .into("images");
          }
        }
      }

      return res.status(200).json({
        data: {
          insertResult: insertResult,
          insertProxyResult: insertProxyResult,
        },
        message: "Proxy added successfully!",
      });
    } catch (err) {
      return res.status(500).json({
        errors: [
          {
            code: "UNKNOWN SERVER ERROR",
            message: err.message,
          },
        ],
      });
    }
  },

  /*GET AGENDA LIST */
  getAgendaList: async (req, res) => {
    try {
      let payload = req.body;
      let agendaList;
      const schema = new Joi.object().keys({
        agmId: Joi.number().required(),
      });

      const result = Joi.validate(payload, schema);
      if (
        result &&
        result.hasOwnProperty("error") &&
        result.error
      ) {
        return res.status(400).json({
          errors: [
            {
              code: "VALIDATION_ERROR",
              message: result.error.message,
            },
          ],
        });
      }

      agendaList = await knex("agenda_master")
        .where({
          "agenda_master.agmId": payload.agmId,
          "agenda_master.orgId": req.orgId,
        })
        .select(["agenda_master.*"]);

      const Parallel = require("async-parallel");

      agendaList = await Parallel.map(
        agendaList,
        async (pd) => {
          let vote = await knex("agm_voting")
            .count("*")
            .where({ agendaId: pd.id })
            .first();
          // .first();

          return { ...pd, vote };
        }
      );

      agendaList = await Parallel.map(
        agendaList,
        async (pd) => {
          let choiceData = await knex
            .from("agenda_choice")
            .select([
              "agenda_choice.id",
              "agenda_choice.choiceValue",
              "agenda_choice.choiceValueThai",
            ])
            .where("agenda_choice.agendaId", pd.id);
          // .first();

          return { ...pd, choiceData };
        }
      );

      // let updateResult = await knex('agm_owner_master').update(updateData).where({ id: payload.id, orgId: req.orgId }).returning(["*"]);

      return res.status(200).json({
        data: agendaList,
        message: "Get Agenda Lists!",
      });
    } catch (err) {
      return res.status(500).json({
        errors: [
          {
            code: "UNKNOWN SERVER ERROR",
            message: err.message,
          },
        ],
      });
    }
  },

  /* UPDATE AGENDA*/

  updateAgenda: async (req, res) => {
    try {
      console.log("owner Id====>>>>", req.body);
      const payload = _.omit(req.body, ["agmName"]);

      const schema = new Joi.object().keys({
        agmId: Joi.string().required(),
        data: Joi.array().required(),
      });
      const result = Joi.validate(payload, schema);
      if (
        result &&
        result.hasOwnProperty("error") &&
        result.error
      ) {
        return res.status(400).json({
          errors: [
            {
              code: "VALIDATION_ERROR",
              message: result.error.message,
            },
          ],
        });
      }
      let currentTime = new Date().getTime();

      let updateResult;
      let updateAgmResult;

      // Put all things in transaction..........

      for (let agenda of req.body.data) {
        let updateData = {
          defaultChoiceId: agenda.choiceId,
          updatedAt: currentTime,
        };
        updateResult = await knex
          .update(updateData)
          .where({ id: agenda.agendaId })
          .returning(["*"])
          .into("agenda_master");
      }

      let updateAgmData = {
        isCompleted: true,
        updatedAt: currentTime,
      };

      updateAgmResult = await knex
        .update(updateAgmData)
        .where({ id: req.body.agmId })
        .returning(["*"])
        .into("agm_master");

      // Going to schedule a job for the same...

      const queueHelper = require("../helpers/queue");
      await queueHelper.addToQueue(
        {
          agmId: agmId,
          data: {},
          orgId: req.orgId,
          requestedBy: req.me,
        },
        "long-jobs",
        "AGM_FINAL_SUBMIT"
      );

      return res.status(200).json({
        updateResult: updateResult,
        updateAgmResult: updateAgmResult,
        message: "Update Agenda",
      });
    } catch (err) {
      return res.status(500).json({
        errors: [
          {
            code: "UNKNOWN SERVER ERROR",
            message: err.message,
          },
        ],
      });
    }
  },

  /*GET OWNER DETAILS */
  getOwnerDetails: async (req, res) => {
    try {
      let payload = req.body;
      let ownerDetails;
      const schema = new Joi.object().keys({
        ownerId: Joi.number().required(),
        agmId: Joi.number().required(),
      });

      const result = Joi.validate(payload, schema);
      if (
        result &&
        result.hasOwnProperty("error") &&
        result.error
      ) {
        return res.status(400).json({
          errors: [
            {
              code: "VALIDATION_ERROR",
              message: result.error.message,
            },
          ],
        });
      }

      ownerDetails = await knex("agm_owner_master")
        .where({
          "agm_owner_master.id": payload.ownerId,
          orgId: req.orgId,
        })
        .select(["agm_owner_master.*"]);

      return res.status(200).json({
        data: ownerDetails,
        message: "Get Owner Details!",
      });
    } catch (err) {
      return res.status(500).json({
        errors: [
          {
            code: "UNKNOWN SERVER ERROR",
            message: err.message,
          },
        ],
      });
    }
  },

  getOwnerSignature: async (req, res) => {
    try {
      let payload = req.body;

      let ownerSignature;
      const schema = new Joi.object().keys({
        ownerId: Joi.number().required(),
        agmId: Joi.number().required(),
      });

      const result = Joi.validate(payload, schema);
      if (
        result &&
        result.hasOwnProperty("error") &&
        result.error
      ) {
        return res.status(400).json({
          errors: [
            {
              code: "VALIDATION_ERROR",
              message: result.error.message,
            },
          ],
        });
      }

      ownerSignature = await knex("agm_owner_master")
        .where({
          "agm_owner_master.id": payload.ownerId,
          orgId: req.orgId,
        })
        .select(["agm_owner_master.signature"]);

      return res.status(200).json({
        data: ownerSignature,
        message: "Get Owner Signature!",
      });
    } catch (err) {
      return res.status(500).json({
        errors: [
          {
            code: "UNKNOWN SERVER ERROR",
            message: err.message,
          },
        ],
      });
    }
  },

  // updateOwner: async (req, res) => {
  //   try {
  //     let payload = req.body;
  //     let updateOwner;
  //     const schema = new Joi.object().keys({
  //       agmId: Joi.number().required(),
  //       unitNo: Joi.number().required(),
  //       ownerName: Joi.string().required(),
  //       eligibility: Joi.number().required(),
  //       ownerId: Joi.number().required(),
  //     });

  //     const result = Joi.validate(payload, schema);
  //     if (result && result.hasOwnProperty("error") && result.error) {
  //       return res.status(400).json({
  //         errors: [{ code: "VALIDATION_ERROR", message: result.error.message }],
  //       });
  //     }

  //     let updateData = {
  //       eligibility: payload.eligibility,
  //       ownerName: payload.ownerName,
  //       unitId: payload.unitId,
  //     };

  //     updateOwner = await knex("agm_owner_master")
  //       .update(updateData)
  //       .where({ id: payload.ownerId, orgId: req.orgId, agmId: payload.agmId })
  //       .returning(["*"]);

  //     return res.status(200).json({
  //       data: updateOwner,
  //       message: "Owner updated successfully!",
  //     });
  //   } catch (err) {
  //     return res.status(500).json({
  //       errors: [{ code: "UNKNOWN SERVER ERROR", message: err.message }],
  //     });
  //   }
  // },

  /* Get Proxy Document List */
  getProxyDocumentList: async (req, res) => {
    try {
      let payload = req.body;
      console.log("agm details===>>>", payload);
      let documentList;
      const schema = new Joi.object().keys({
        agmId: Joi.number().required(),
      });
      const result = Joi.validate(payload, schema);
      if (
        result &&
        result.hasOwnProperty("error") &&
        result.error
      ) {
        return res.status(400).json({
          errors: [
            {
              code: "VALIDATION_ERROR",
              message: result.error.message,
            },
          ],
        });
      }

      documentList = await knex("agm_proxy_document_master")
        .where({
          "agm_proxy_document_master.agmId": payload.agmId,
        })
        .select(["agm_proxy_document_master.*"]);

      // let updateResult = await knex('agm_owner_master').update(updateData).where({ id: payload.id, orgId: req.orgId }).returning(["*"]);

      return res.status(200).json({
        data: documentList,
        message: "Proxy Document Lists!",
      });
    } catch (err) {
      return res.status(500).json({
        errors: [
          {
            code: "UNKNOWN SERVER ERROR",
            message: err.message,
          },
        ],
      });
    }
  },
  toggleEligibility: async (req, res) => {
    try {
      let ownerList;
      let message;

      await knex.transaction(async (trx) => {
        let payload = req.body;

        const schema = Joi.object().keys({
          id: Joi.number().required(),
        });

        const result = Joi.validate(payload, schema);
        if (
          result &&
          result.hasOwnProperty("error") &&
          result.error
        ) {
          return res.status(400).json({
            errors: [
              {
                code: "VALIDATION_ERROR",
                message: result.error.message,
              },
            ],
          });
        }

        let ownerResult;

        let checkEligibility = await knex
          .from("agm_owner_master")
          .where({ id: payload.id })
          .returning(["*"]);

        if (checkEligibility && checkEligibility.length) {
          if ((checkEligibility[0].eligibility = true)) {
            ownerResult = await knex
              .update({ eligibility: false })
              .where({ id: payload.id })
              .returning(["*"])
              .transacting(trx)
              .into("agm_owner_master");
            ownerList = ownerResult[0];
            message = "Owner deactivated successfully!";
          } else {
            ownerResult = await knex
              .update({ eligibility: true })
              .where({ id: payload.id })
              .returning(["*"])
              .transacting(trx)
              .into("agm_owner_master");
            courier = courierResult[0];
            message = "Owner activated successfully!";
          }
        }
      });
    } catch (err) {}
  },
  getUnitList: async (req, res) => {
    try {
      let id = req.me.id;
      const { agmId } = req.body;

      let getPropertyUnits = await knex
        .from("property_units")
        .leftJoin(
          "agm_owner_master",
          "property_units.id",
          "agm_owner_master.unitId"
        )
        .select(["property_units.*"])
        .where({
          "property_units.orgId": req.orgId,
          "property_units.isActive": true,
          "agm_owner_master.agmId": agmId,
        })
        .orderBy("property_units.unitNumber", "asc");

      getPropertyUnits = _.uniqBy(getPropertyUnits, "id");

      return res.status(200).json({
        data: {
          propertyData: getPropertyUnits,
        },
      });
    } catch (err) {
      res.status(500).json({
        errors: [
          {
            code: "UNKNOWN_SERVER_ERROR",
            message: err.message,
          },
        ],
      });
    }
  },
  getUnitListByCompanyAndProject: async (req, res) => {
    try {
      let id = req.me.id;

      let getPropertyUnits = await knex("property_units")
        .select("*")
        .where({
          orgId: req.orgId,
          isActive: true,
          companyId: req.body.companyId,
          projectId: req.body.projectId,
        });

      return res.status(200).json({
        data: {
          propertyData: getPropertyUnits,
        },
      });
    } catch (err) {
      res.status(500).json({
        errors: [
          {
            code: "UNKNOWN_SERVER_ERROR",
            message: err.message,
          },
        ],
      });
    }
  },

  getProxyDocumentImages: async (req, res) => {
    try {
      let payload = req.body;

      const schema = new Joi.object().keys({
        agmId: Joi.number().required(),
        ownerId: Joi.number().required(),
      });
      const result = Joi.validate(payload, schema);
      if (
        result &&
        result.hasOwnProperty("error") &&
        result.error
      ) {
        return res.status(400).json({
          errors: [
            {
              code: "VALIDATION_ERROR",
              message: result.error.message,
            },
          ],
        });
      }

      let waterMarkText = await knex("agm_master")
      .leftJoin("agm_owner_master","agm_master.id","agm_owner_master.agmId")

      .select([
        "agm_master.waterMarkText",
        "agm_owner_master.signature"
      ])
      .where({"agm_master.id":payload.agmId , "agm_master.orgId" : req.orgId,"agm_owner_master.id":payload.ownerId})
      .first();

      let images = await knex.from("images").where({
        entityId: payload.ownerId,
        entityType: "agm_proxy_documents",
      });

      return res.status(200).json({
        data: {
          proxyImages: images,
          waterMarkText
        },
      });
    } catch (err) {
      return res.status(500).json({
        errors: [
          {
            code: "UNKNOWN_SERVER_ERROR",
            message: err.message,
          },
        ],
      });
    }
  },

  generatePdfOfVotingDocument: async (req, res) => {
    try {
      const payload = req.body;

      const { agmId } = payload;
      console.log(
        "[controllers][agm][generatePdfOfVotingDocument]: AgmId:",
        agmId
      );

      if (!agmId) {
        return res.status(400).json({
          errors: [
            {
              code: "BAD_REQUEST",
              message: "Please pass valid AgmId",
            },
          ],
        });
      }

      // GET AGM Details...
      let agmDetails = await knex("agm_master")
        .leftJoin(
          "companies",
          "agm_master.companyId",
          "companies.id"
        )
        .leftJoin(
          "projects",
          "agm_master.projectId",
          "projects.id"
        )
        .select([
          "agm_master.*",
          "companies.companyId as companyCode",
          "companies.companyName",
          "projects.project as projectCode",
          "projects.projectName",
        ])
        .where({
          "agm_master.id": agmId,
          "agm_master.orgId": req.orgId,
        })
        .first();

      console.log(
        "[controllers][agm][generatePdfOfVotingDocument]: AGM Details:",
        agmDetails
      );

      const queueHelper = require("../helpers/queue");
      await queueHelper.addToQueue(
        {
          agmId: agmId,
          data: {
            agmDetails,
          },
          orgId: req.orgId,
          requestedBy: req.me,
        },
        "long-jobs",
        "AGM_PREPARE_VOTING_DOCUMENT"
      );

      return res.status(200).json({
        data: {},
        message:
          "We are preparing Voting Document for this AGM. Please wait for few minutes. Once generated we will notify you via App Notification & Email",
      });
    } catch (err) {
      res.status(500).json({ failed: true, error: err });
    }
  },

  checkVotingStatus: async (req, res) => {
    try {
      let payload = req.body;

      const schema = new Joi.object().keys({
        agmId: Joi.number().required(),
        ownerMasterId: Joi.number().required(),
        agendaId: Joi.number().required(),
        // unitId:Joi.number().required()
      });
      const result = Joi.validate(payload, schema);
      if (
        result &&
        result.hasOwnProperty("error") &&
        result.error
      ) {
        return res.status(400).json({
          errors: [
            {
              code: "VALIDATION_ERROR",
              message: result.error.message,
            },
          ],
        });
      }

      let votingData = await knex.from("agm_voting").where({
        agmId: payload.agmId,
        ownerMasterId: payload.ownerMasterId,
        agendaId: payload.agendaId,
      });

      return res.status(200).json({
        data: {
          votingStatus: votingData,
        },
      });
    } catch (err) {
      return res.status(500).json({
        errors: [
          {
            code: "UNKNOWN_SERVER_ERROR",
            message: err.message,
          },
        ],
      });
    }
  },

  getScannedAgendaDetail: async (req, res) => {
    try {
      let payload = req.body;

      const schema = new Joi.object().keys({
        agmId: Joi.number().required(),
        ownerMasterId: Joi.number().required(),
        agendaId: Joi.number().required(),
        choiceId: Joi.number().required(),
      });
      const result = Joi.validate(payload, schema);
      if (
        result &&
        result.hasOwnProperty("error") &&
        result.error
      ) {
        return res.status(400).json({
          errors: [
            {
              code: "VALIDATION_ERROR",
              message: result.error.message,
            },
          ],
        });
      }

      let agendaChoiceData = await knex
        .from("agenda_choice")
        .leftJoin(
          "agenda_master",
          "agenda_choice.agendaId",
          "agenda_master.id"
        )
        .select([
          "agenda_choice.choiceValue",
          "agenda_master.agendaName",
        ])
        .where({
          "agenda_choice.agendaId": payload.agendaId,
          "agenda_choice.id": payload.choiceId,
        });

      // let totalRatio = await knex("agm_owner_master")
      //   .select("agm_owner_master.ownershipRatio")
      //   .where("agm_owner_master.agmId", payload.agmId);

      // let total = [];
      // for (let d of totalRatio) {
      //   total.push(parseInt(d.ownershipRatio));
      // }

      // let totalRatioSum = total.reduce((a, b) => a + b, 0);

      // Use Query to calculate sum...
      let totalOwnershipRatio = await knex(
        "agm_owner_master"
      )
        .sum("ownershipRatio")
        .where("agmId", payload.agmId)
        .first();

      totalOwnershipRatio = totalOwnershipRatio.sum
        ? totalOwnershipRatio.sum
        : 0;

      console.log(
        `[controllers][agm][getScannedAgendaDetail]: Total Ownership Ratio:`,
        totalOwnershipRatio
      );

      let currentUserOwnerShipRatio = await knex(
        "agm_owner_master"
      )
        .where({
          agmId: payload.agmId,
          id: payload.ownerMasterId,
        })
        .first();

      currentUserOwnerShipRatio =
        currentUserOwnerShipRatio.ownershipRatio;
      console.log(
        `[controllers][agm][getScannedAgendaDetail]: Current User Ownership Ratio:`,
        currentUserOwnerShipRatio
      );

      let votingPower = (
        (currentUserOwnerShipRatio / totalOwnershipRatio) *
        100
      ).toFixed(3);
      console.log(
        `[controllers][agm][getScannedAgendaDetail]: Calculated Voting Power:`,
        votingPower
      );
      console.log(
        `[controllers][agm][getScannedAgendaDetail]: Voting Power (From Frontend Calc):`,
        payload.votingPower
      );

      // console.log("total agm ratio count====>>>>",totalRatioSum)

      return res.status(200).json({
        data: {
          agendaChoiceData: agendaChoiceData,
          totalOwnershipRatio,
          currentUserOwnerShipRatio,
          votingPower,
        },
      });
    } catch (err) {
      return res.status(500).json({
        errors: [
          {
            code: "UNKNOWN_SERVER_ERROR",
            message: err.message,
          },
        ],
      });
    }
  },

  saveVotingData: async (req, res) => {
    try {
      let payload = req.body;
      let insertVotingResult;

      const schema = new Joi.object().keys({
        agmId: Joi.number().required(),
        ownerMasterId: Joi.number().required(),
        agendaId: Joi.number().required(),
        votingPower: Joi.string().required(),
        selectedChoiceId: Joi.number().required(),
      });
      const result = Joi.validate(payload, schema);
      if (
        result &&
        result.hasOwnProperty("error") &&
        result.error
      ) {
        return res.status(400).json({
          errors: [
            {
              code: "VALIDATION_ERROR",
              message: result.error.message,
            },
          ],
        });
      }

      let totalOwnershipRatio = await knex(
        "agm_owner_master"
      )
        .sum("ownershipRatio")
        .where("agmId", payload.agmId)
        .first();

      totalOwnershipRatio = totalOwnershipRatio.sum
        ? totalOwnershipRatio.sum
        : 0;

      console.log(
        `[controllers][agm][saveVotingData]: Total Ownership Ratio:`,
        totalOwnershipRatio
      );

      let currentUserOwnerShipRatio = await knex(
        "agm_owner_master"
      )
        .where({
          agmId: payload.agmId,
          id: payload.ownerMasterId,
        })
        .first();

      currentUserOwnerShipRatio =
        currentUserOwnerShipRatio.ownershipRatio;
      console.log(
        `[controllers][agm][saveVotingData]: Current User Ownership Ratio:`,
        currentUserOwnerShipRatio
      );

      let votingPower = (
        (currentUserOwnerShipRatio / totalOwnershipRatio) *
        100
      ).toFixed(3);
      console.log(
        `[controllers][agm][saveVotingData]: Calculated Voting Power:`,
        votingPower
      );
      console.log(
        `[controllers][agm][saveVotingData]: Voting Power (From Frontend Calc):`,
        payload.votingPower
      );

      payload.votingPower = payload.votingPower;

      let currentTime = new Date().getTime();

      let insertVotingData = {
        agmId: payload.agmId,
        ownerMasterId: payload.ownerMasterId,
        agendaId: payload.agendaId,
        votingPower: payload.votingPower,
        selectedChoiceId: payload.selectedChoiceId,
        createdAt: currentTime,
        updatedAt: currentTime,
        orgId: req.orgId,
      };

      try {
        insertVotingResult = await knex
          .insert(insertVotingData)
          .returning(["*"])
          .into("agm_voting");
      } catch (err) {
        let uniqueErrorMsg = `duplicate key value violates unique constraint`;
        if (err.message.includes(uniqueErrorMsg)) {
          console.warn(
            "Unique Constraint Error, We will have to perform an update............"
          );
          insertVotingResult = await knex
            .update({
              votingPower: payload.votingPower,
              selectedChoiceId: payload.selectedChoiceId,
              updatedAt: currentTime,
            })
            .where({
              agmId: payload.agmId,
              ownerMasterId: payload.ownerMasterId,
              agendaId: payload.agendaId,
            })
            .returning(["*"])
            .into("agm_voting");
        }
      }

      return res.status(200).json({
        data: insertVotingResult,
        message: "Vote data added successfully!",
      });
    } catch (err) {
      return res.status(500).json({
        errors: [
          {
            code: "UNKNOWN_SERVER_ERROR",
            message: err.message,
          },
        ],
      });
    }
  },
  getOwnerRegistrationList: async (req, res) => {
    try {
      let columns = [];

      let payload = req.query;

      console.log("payload value", payload);

      let agmDetails = await knex("agm_master")
        .leftJoin(
          "companies",
          "agm_master.companyId",
          "companies.id"
        )
        .leftJoin(
          "projects",
          "agm_master.projectId",
          "projects.id"
        )
        .select([
          "agm_master.*",
          "companies.companyId as companyCode",
          "companies.companyName",
          "projects.project as projectCode",
          "projects.projectName",
        ])
        .where({
          "agm_master.id": payload.agmId,
        });

      agmDetails.map((r, i) => {
        console.log("-- agm --", r);
        // const date = new Date(r.createdAt);
        // agmDetails[i].createdAt = date.getFullYear();
        const timezone = "Asia/Bangkok";
        moment.tz.setDefault(timezone);
        agmDetails[i].createdAt = moment(
          +r.createdAt
        ).format("MMMM d, YYYY");
        agmDetails[i].startTime = moment(
          +r.startTime
        ).format("h:mm A");
        agmDetails[i].endTime = moment(+r.endTime).format(
          "h:mm A"
        );
      });

      let ownerRegistrationList = await knex
        .from("agm_owner_master")
        .leftJoin(
          "property_units",
          "agm_owner_master.unitId",
          "property_units.id"
        )
        .select([
          "agm_owner_master.*",
          "property_units.unitNumber",
          "property_units.description as unitDescription",
        ])
        .where({
          "agm_owner_master.agmId": payload.agmId,
        })
        .where((qb) => {
          if (payload.type == 1) {
          }
          if (payload.type == 2) {
            qb.where(
              "agm_owner_master.registrationType",
              1
            );
          }
          if (payload.type == 3) {
            qb.orWhere(
              "agm_owner_master.registrationType",
              2
            );
          }
          if (payload.type == 4) {
            qb.where(
              "agm_owner_master.registrationType",
              1
            );
            qb.orWhere(
              "agm_owner_master.registrationType",
              2
            );
          }

          if (payload.agmId) {
            qb.where(
              "agm_owner_master.agmId",
              payload.agmId
            );
          }
        })
        .orderBy("property_units.unitNumber","asc");

      const Parallel = require("async-parallel");

      ownerRegistrationList = await Parallel.map(
        ownerRegistrationList,
        async (pd) => {
          let proxyData = await knex
            .from("agm_proxy_documents")
            .select(["agm_proxy_documents.proxyName"])
            .where(
              "agm_proxy_documents.ownerMasterId",
              pd.id
            )
            .first();

          return { ...pd, proxyData };
        }
      );

      ownerRegistrationList = _.uniqBy(
        ownerRegistrationList,
        "id"
      );

      columns = req.query.columns.split(",");
      console.log("columns", columns);

      console.log(
        "ownerRegistrationList====>>>",
        ownerRegistrationList
      );
      console.log("agmDetails====>>>", agmDetails);
      const path = require("path");
      // Read HTML Template
      const templatePath = path.join(
        __dirname,
        "..",
        "pdf-templates",
        "registration.ejs"
      );
      res.render(templatePath, {
        title: "Registration",
        columns: columns,
        data: ownerRegistrationList,
        agmDetails: agmDetails,
      });
      // return {
      //   data:ownerRegistrationList
      // }
    } catch (err) {
      console.log("error==", err);
    }
  },

  getDashboardBasicData: async (req, res) => {
    try {
      const agmId = req.params.id;

      if (!agmId) {
        return res.status(400).json({
          errors: [
            {
              code: "VALIDATION_ERROR",
              message: "Please send valid AGM Id",
            },
          ],
        });
      }

      let agmDetails = await knex("agm_master")
        .leftJoin(
          "companies",
          "agm_master.companyId",
          "companies.id"
        )
        .leftJoin(
          "projects",
          "agm_master.projectId",
          "projects.id"
        )
        .select([
          "agm_master.*",
          "companies.companyId as companyCode",
          "companies.companyName",
          "projects.project as projectCode",
          "projects.projectName",
        ])
        .where({
          "agm_master.id": agmId,
          "agm_master.orgId": req.orgId,
        })
        .first();

      let agendas = await knex("agenda_master").where({
        agmId,
      });

      const Parallel = require("async-parallel");
      agendas = await Parallel.map(
        agendas,
        async (agenda) => {
          let choices = await knex("agenda_choice").where({
            agendaId: agenda.id,
          });
          choices = await Parallel.map(
            choices,
            async (ch) => {
              let voting = await knex("agm_voting")
                .where({
                  agendaId: agenda.id,
                  selectedChoiceId: ch.id,
                })
                .sum("votingPower as vp")
                .count("*")
                .select(["selectedChoiceId"])
                .groupBy("selectedChoiceId")
                .first();
              ch.voting = voting;
              return ch;
            }
          );
          agenda.choices = choices;
          return agenda;
        }
      );

      let stats = {};

      [
        invitedOwners,
        registeredOwners,
        totalOwnershipRatio,
        totalUnits,
        registeredOwnerShipRatio,
        registeredOwnersSelf,
        registeredOwnersProxy,
      ] = await Promise.all([
        knex("agm_owner_master")
          .count("*")
          .where({ agmId })
          .first(),
        knex("agm_owner_master")
          .count("*")
          .where({ agmId })
          .whereNotNull("signatureAt")
          .first(),
        knex("agm_owner_master")
          .sum("ownershipRatio")
          .where({ agmId })
          .first(),
        knex("agm_owner_master")
          .count("*")
          .where({ agmId })
          .first(),
        knex("agm_owner_master")
          .sum("ownershipRatio")
          .where({ agmId })
          .whereNotNull("signatureAt")
          .first(),
        knex("agm_owner_master")
          .count("*")
          .where({ agmId, registrationType: 1 })
          .whereNotNull("signatureAt")
          .first(),
        knex("agm_owner_master")
          .count("*")
          .where({ agmId, registrationType: 2 })
          .whereNotNull("signatureAt")
          .first(),
      ]);

      stats.invitedOwners = invitedOwners.count
        ? invitedOwners.count
        : 0;
      stats.registeredOwners = registeredOwners.count
        ? registeredOwners.count
        : 0;
      stats.totalOwnershipRatio = totalOwnershipRatio.sum
        ? totalOwnershipRatio.sum
        : 0;
      stats.totalUnits = totalUnits.count
        ? totalUnits.count
        : 0;
      stats.registeredOwnerShipRatio = registeredOwnerShipRatio.sum
        ? registeredOwnerShipRatio.sum
        : 0;
      if (stats.totalOwnershipRatio) {
        stats.registeredOwnerShipRatioPerentage = (
          (stats.registeredOwnerShipRatio /
            stats.totalOwnershipRatio) *
          100
        ).toFixed(2);
      }
      stats.registeredOwnersSelf = registeredOwnersSelf.count
        ? registeredOwnersSelf.count
        : 0;
      stats.registeredOwnersProxy = registeredOwnersProxy.count
        ? registeredOwnersProxy.count
        : 0;

      stats.coOwnerPercentage = (
        (stats.registeredOwnersSelf /
          stats.registeredOwners) *
        100
      ).toFixed(2);
      stats.proxyPercentage = (
        (stats.registeredOwnersProxy /
          stats.registeredOwners) *
        100
      ).toFixed(2);

      let resData = {
        agmDetails,
        agendas,
        stats,
      };

      return res.status(200).json({
        data: resData,
        message: "Success!",
      });
    } catch (err) {
      return res.status(500).json({
        errors: [
          {
            code: "UNKNOWN SERVER ERROR",
            message: err.message,
          },
        ],
      });
    }
  },

  getAgendaVoteSummary: async (req, res) => {
    try {
      let payload = req.body;
      let total, sum, choices;

      const schema = new Joi.object().keys({
        agmId: Joi.number().required(),
        agendaId: Joi.number().required(),
      });
      const result = Joi.validate(payload, schema);
      if (
        result &&
        result.hasOwnProperty("error") &&
        result.error
      ) {
        return res.status(400).json({
          errors: [
            {
              code: "VALIDATION_ERROR",
              message: result.error.message,
            },
          ],
        });
      }

      let voteSummary = await knex
        .select(["agm_voting.selectedChoiceId"])
        .count("* as count")
        .sum("votingPower as vp")
        .from("agm_voting")
        .where({
          agendaId: payload.agendaId,
          orgId: req.orgId,
          agmId: payload.agmId,
        })
        .groupBy(["agm_voting.selectedChoiceId"]);

      const Parallel = require("async-parallel");

      voteSummary = await Parallel.map(
        voteSummary,
        async (pd) => {
          let choices = await knex
            .from("agenda_choice")
            .select([
              "agenda_choice.choiceValue",
              "agenda_choice.choiceValueThai",
            ])
            .where("agenda_choice.id", pd.selectedChoiceId)
            .first();

          return { ...pd, choices };
        }
      );

      return res.status(200).json({
        data: {
          voteSummary,
        },
        message: "Agenda Summary Result",
      });
    } catch (err) {
      return res.status(500).json({
        errors: [
          {
            code: "UNKNOWN_SERVER_ERROR",
            message: err.message,
          },
        ],
      });
    }
  },

  getRegistrationStatus: async (req, res) => {
    try {
      let payload = req.body;
      let votingStatus;

      const schema = new Joi.object().keys({
        unitId: Joi.number().required(),
        agmId: Joi.number().required(),
        agendaId: Joi.number().required(),
        ownerMasterId: Joi.number().required(),
        choiceId : Joi.number().required()
      });
      const result = Joi.validate(payload, schema);
      if (
        result &&
        result.hasOwnProperty("error") &&
        result.error
      ) {
        return res.status(400).json({
          errors: [
            {
              code: "VALIDATION_ERROR",
              message: result.error.message,
            },
          ],
        });
      }

      let ownerRegistrationStatus = await knex(
        "agm_owner_master"
      )
        .select(["registrationType", "ownerName"])
        .where({
          unitId: payload.unitId,
          agmId: payload.agmId,
          orgId: req.orgId,
        })
        .first();

      if (ownerRegistrationStatus.registrationType) {
        votingStatus = await knex.from("agm_voting").where({
          agmId: payload.agmId,
          ownerMasterId: payload.ownerMasterId,
          agendaId: payload.agendaId,
        });
      }
      //  else {
      //   return { message: "USER_NOT_REGISTERED" };
      // }

      let agendaChoiceData = await knex
        .from("agenda_choice")
        .leftJoin(
          "agenda_master",
          "agenda_choice.agendaId",
          "agenda_master.id"
        )
        .select([
          "agenda_choice.choiceValue",
          "agenda_master.agendaName",
          "agenda_master.isMultiSelect"
        ])
        .where({
          "agenda_choice.agendaId": payload.agendaId,
          "agenda_choice.id": payload.choiceId,
        });

        let totalOwnershipRatio = await knex(
          "agm_owner_master"
        )
          .sum("ownershipRatio")
          .where("agmId", payload.agmId)
          .first();
  
        totalOwnershipRatio = totalOwnershipRatio.sum
          ? totalOwnershipRatio.sum
          : 0;
  
        console.log(
          `[controllers][agm][getScannedAgendaDetail]: Total Ownership Ratio:`,
          totalOwnershipRatio
        );
  
        let currentUserOwnerShipRatio = await knex(
          "agm_owner_master"
        )
          .where({
            agmId: payload.agmId,
            id: payload.ownerMasterId,
          })
          .first();
  
        currentUserOwnerShipRatio =
          currentUserOwnerShipRatio.ownershipRatio;
        console.log(
          `[controllers][agm][getScannedAgendaDetail]: Current User Ownership Ratio:`,
          currentUserOwnerShipRatio
        );
  
        let votingPower = (
          (currentUserOwnerShipRatio / totalOwnershipRatio) *
          100
        ).toFixed(3);
        console.log(
          `[controllers][agm][getScannedAgendaDetail]: Calculated Voting Power:`,
          votingPower
        );
        console.log(
          `[controllers][agm][getScannedAgendaDetail]: Voting Power (From Frontend Calc):`,
          payload.votingPower
        );
  



      console.log(
        "owner registration status",
        ownerRegistrationStatus
      );

      return res.status(200).json({
        data: {
          ownerRegistrationStatus,
          votingStatus,
          agendaChoiceData: agendaChoiceData,
          totalOwnershipRatio,
          currentUserOwnerShipRatio,
          votingPower
        },
        message: "Owner registration status",
      });
    } catch (err) {
      return res.status(500).json({
        errors: [
          {
            code: "UNKNOWN_SERVER_ERROR",
            message: err.message,
          },
        ],
      });
    }
  },

  getVotingResultList: async (req, res) => {
    try {
      let payload = req.body;

      console.log("payload of vote", payload);
      let reqData = req.query;
      let total, rows;

      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;

      let votingId;
      if (payload.unitId) {
        console.log("voting id", votingId);

        votingId = await knex("property_units")
          .leftJoin(
            "agm_owner_master",
            "property_units.id",
            "agm_owner_master.unitId"
          )
          .leftJoin(
            "agenda_master",
            "agm_owner_master.agmId",
            "agenda_master.agmId"
          )
          .leftJoin(
            "agm_voting",
            "agenda_master.id",
            "agm_voting.agendaId"
          )
          .select(["agm_voting.id"])
          .where("property_units.id", payload.unitId)
          .where({
            "agm_owner_master.agmId": payload.agmId,
            "agm_owner_master.orgId": req.orgId,
            "agenda_master.id": payload.agendaId,
          })
          .first();

        console.log("voting id2", votingId);
      }

      [total, rows] = await Promise.all([
        knex
          .count("* as count")
          .from("agm_voting")
          .where({
            "agm_voting.agmId": payload.agmId,
            "agm_voting.agendaId": payload.agendaId,
            "agm_voting.orgId": req.orgId,
          })
          .where((qb) => {
            if (payload.unitId) {
              qb.where("agm_voting.id", votingId.id);
            }
          })
          .first(),
        knex
          .from("agm_voting")
          .select([
            "agm_voting.ownerMasterId",
            "agm_voting.selectedChoiceId",
            "agm_voting.votingPower",
            "agm_voting.id",
          ])
          .where({
            "agm_voting.agmId": payload.agmId,
            "agm_voting.agendaId": payload.agendaId,
            "agm_voting.orgId": req.orgId,
          })
          .where((qb) => {
            if (payload.unitId) {
              qb.where("agm_voting.id", votingId.id);
            }
          })
          .offset(offset)
          .limit(per_page),
        // .orderBy("agm_owner_master.unitNumber", "asc"),
      ]);

      const Parallel = require("async-parallel");

      rows = await Parallel.map(rows, async (pd) => {
        let ownerData = await knex
          .from("agm_owner_master")
          .select([
            "agm_owner_master.unitNumber",
            "agm_owner_master.houseId",
            "agm_owner_master.ownershipRatio",
            "agm_owner_master.ownerName",
            "agm_owner_master.joinOwnerName",
            "agm_owner_master.registrationType",
          ])
          .where("agm_owner_master.id", pd.ownerMasterId)
          .first();

        return { ...pd, ...ownerData };
      });

      rows = await Parallel.map(rows, async (pd) => {
        let choiceValue = await knex
          .from("agenda_choice")
          .select([
            "agenda_choice.choiceValue",
            "agenda_choice.choiceValueThai",
          ])
          .where({
            "agenda_choice.id": pd.selectedChoiceId,
          })
          .first();

        return { ...pd, ...choiceValue };
      });

      let count = total.count;
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
          ownerList: pagination,
        },
        message: "Owner list successfully !",
      });
    } catch (err) {
      return res.status(500).json({
        errors: [
          {
            code: "UNKNOWN SERVER ERROR",
            message: err.message,
          },
        ],
      });
    }
  },
  getOwnerListbyId: async (req, res) => {
    try {
      let payload = req.body;

      console.log("owners id", payload);

      let ownerList = await knex("agm_owner_master")
        .leftJoin(
          "property_units",
          "agm_owner_master.unitId",
          "property_units.id"
        )
        .select([
          "agm_owner_master.*",
          "property_units.unitNumber",
          "property_units.description as unitDescription",
        ])
        .where({
          "agm_owner_master.orgId": req.orgId,
          "agm_owner_master.agmId": payload.agmId,
        })
        .whereIn("agm_owner_master.id", payload.ownerId);

      return res.status(200).json({
        data: {
          ownerList,
        },
        message: "Owner list successfully !",
      });
    } catch (err) {
      return res.status(500).json({
        errors: [
          {
            code: "UNKNOWN SERVER ERROR",
            message: err.message,
          },
        ],
      });
    }
  },
  getUnitListForVotingResult: async (req, res) => {
    try {
      let payload = req.body;

      let unitList = await knex("property_units")
        .leftJoin(
          "agm_owner_master",
          "property_units.id",
          "agm_owner_master.unitId"
        )
        .leftJoin(
          "agenda_master",
          "agm_owner_master.agmId",
          "agenda_master.agmId"
        )
        .select([
          "property_units.id",
          "property_units.unitNumber",
        ])
        .where(
          "property_units.unitNumber",
          "iLIKE",
          `%${payload.unitNumber}%`
        )
        .where({
          "agm_owner_master.agmId": payload.agmId,
          "agm_owner_master.orgId": req.orgId,
          "agenda_master.id": payload.agendaId,
        })
        .orderBy("property_units.unitNumber");

      unitList = _.uniqBy(unitList, "id");

      return res.status(200).json({
        data: {
          unitList,
        },
        message: "Unit list successfully !",
      });
    } catch (err) {
      return res.status(500).json({
        errors: [
          {
            code: "UNKNOWN SERVER ERROR",
            message: err.message,
          },
        ],
      });
    }
  },
  agmVoteDetail: async (req, res) => {
    try {
      let payload = req.body;

      let votingDetail = await knex("agm_voting")
        .leftJoin(
          "agm_owner_master",
          "agm_voting.ownerMasterId",
          "agm_owner_master.id"
        )
        .leftJoin(
          "agenda_choice",
          "agm_voting.selectedChoiceId",
          "agenda_choice.id"
        )
        .leftJoin(
          "agenda_master",
          "agenda_choice.agendaId",
          "agenda_master.id"
        )
        .select([
          "agm_voting.ownerMasterId",
          "agm_voting.selectedChoiceId",
          "agm_voting.votingPower",
          "agm_voting.id",
          "agm_owner_master.unitNumber",
          "agm_owner_master.houseId",
          "agm_owner_master.ownershipRatio",
          "agm_owner_master.ownerName",
          "agm_owner_master.joinOwnerName",
          "agm_owner_master.registrationType",
          "agenda_choice.choiceValue",
          "agenda_choice.choiceValueThai",
          "agenda_master.isMultiSelect",
        ])
        .where({
          "agm_voting.id": payload.votingId,
          "agm_voting.orgId": req.orgId,
        })
        .first();

      return res.status(200).json({
        data: {
          votingDetail,
        },
        message: "Voting Detail Result !",
      });
    } catch (err) {
      return res.status(500).json({
        errors: [
          {
            code: "UNKNOWN SERVER ERROR",
            message: err.message,
          },
        ],
      });
    }
  },
  agmAgendaChoice: async (req, res) => {
    try {
      const { agendaId, agmId } = req.body;

      console.log("agenda choice data", req.body);

      let agendaChoice = await knex("agenda_choice")
        // .leftJoin("agenda_master","agenda_choice.agendaId","agenda_master.id")
        .select([
          "agenda_choice.*",
          // "agenda_master.isMultiSelect"
        ])
        .where({
          "agenda_choice.agendaId": agendaId,
          "agenda_choice.orgId": req.orgId,
        });

      return res.status(200).json({
        data: {
          agendaChoice,
        },
        message: "Agenda Choice Result !",
      });
    } catch (err) {
      return res.status(500).json({
        errors: [
          {
            code: "UNKNOWN SERVER ERROR",
            message: err.message,
          },
        ],
      });
    }
  },
  // updateAGMVoting : async(req,res) =>{
  //   try {
  //     let payload = req.body;

  //     let updateVoteResult = await knex("agm_voting")
  //     .update({
  //       selectedChoiceId :
  //     })
  //   } catch (err) {

  //   }
  // }
};

module.exports = agmController;
