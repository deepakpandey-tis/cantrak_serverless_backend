const Joi = require("@hapi/joi");
const _ = require("lodash");

const knex = require("../db/knex");
const moment = require("moment");
const { join } = require("lodash");

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
      console.log("[controllers][AGM][generate] :  Error", err);
      return res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },

  /* Add Agm Preparation */
  addAgmPreparation: async (req, res) => {
    try {
      let addedAGMResult = null;
      let agmPrepPayload = req.body;

      console.log("payload for agm===>>>", req.body);
      await knex.transaction(async (trx) => {
        const payload = _.omit(req.body, [
          "agmId",
          "votingAgenda",
          "description",
          "proxyDocumentName",
          "template",
          "waterMarkText",
          "proxyDocument",
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
        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message },
            ],
          });
        }

        let checkUpdate = await knex("agm_master")
          .where({ id: req.body.agmId })
          .first();

        if (checkUpdate && checkUpdate.moderationStatus == true) {
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
            startTime: new Date(payload.startTime).getTime(),
            endTime: new Date(payload.endTime).getTime(),
            waterMarkText: req.body.waterMarkText,
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

        let agendaPayload = req.body.votingAgenda;

        let delAgenda = await knex("agenda_master")
          .where({
            agmId: addedAGMResult.id,
          })
          .del();

        addedAgenda = [];

        for (let agenda of agendaPayload) {
          let eligibility;
          if (agenda.eligibleForVoting == "Yes") {
            eligibility = true;
          } else {
            eligibility = false;
          }
          let addedAgendaResult = await knex("agenda_master")
            .insert({
              agmId: addedAGMResult.id,
              agendaName: agenda.agendaName,
              agendaNo: agenda.agendaNo,
              eligibleForVoting: eligibility,
              updatedAt: currentTime,
              createdAt: currentTime,
              orgId: req.orgId,
            })
            .returning(["*"]);
          addedAgenda.push(addedAgendaResult[0]);
        }

        //insert proxy document

        let proxyDocumentPayload = req.body.proxyDocumentName;

        let delProxyDocument = await knex("proxy_document")
          .where({
            agmId: addedAGMResult.id,
          })
          .del();

        for (let proxy of proxyDocumentPayload) {
          let proxyResult = await knex("proxy_document").insert({
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
        errors: [{ code: "UNKNOWN SERVER ERROR", message: err.message }],
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
        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message },
            ],
          });
        }

        let checkUpdate = await knex("agm_master")
          .where({ id: req.body.agmId })
          .first();

        if (checkUpdate && checkUpdate.moderationStatus == true) {
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
          let addedAgendaResult = await knex("agenda_master")
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

        let proxyDocumentPayload = req.body.proxyDocumentPayload;

        let delProxyDocument = await knex("proxy_document")
          .where({
            entityId: addedAGMResult.id,
          })
          .del();

        trx.commit;
      });
    } catch (err) {
      return res.status(200).json({
        errors: [{ code: "UNKNOWN SERVER ERROR", message: err.message }],
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
        data[0].D === "OWNERSHIP_RATIO" &&
        data[0].E === "CO_OWNER_NAME" &&
        data[0].F === "ELIGIBILITY_TOGGLE" &&
        data[0].G === "ID_NO" &&
        data[0].H === "JOIN_OWNER_NAME"
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
                values.unshift("House Number can not empty!");
                errors.push(values);
                fail++;
                continue;
              }

              if (!ownerData.D) {
                let values = _.values(ownerData);
                values.unshift("Ownership ratio can not empty!");
                errors.push(values);
                fail++;
                continue;
              }

              if (!ownerData.E) {
                let values = _.values(ownerData);
                values.unshift("Co Owner Name can not empty!");
                errors.push(values);
                fail++;
                continue;
              }
              let unitId;
              let checkExist = await knex("property_units").select("id").where({
                orgId: req.orgId,
                unitNumber: ownerData.B.toUpperCase(),
              });

              if (checkExist.length > 0) {
                unitId = checkExist[0].id;
              } else {
                let values = _.values(ownerData);
                values.unshift("Unit Number Does not exist!");
                errors.push(values);
                fail++;
                continue;
              }

              let eligibility;
              console.log("ownerdata h====>>>>>", ownerData.H);
              if (ownerData.F == "Yes") {
                eligibility = true;
              } else {
                eligibility = false;
              }

              let insertData = {
                agmId: req.body.agmId,
                companyId: req.body.companyId,
                projectId: req.body.projectId,
                unitId: unitId,
                houseId: ownerData.C,
                ownerName: ownerData.E,
                joinOwnerName: ownerData.H,
                ownershipRatio: ownerData.D,
                ownerIdNo: ownerData.G,
                eligibility: eligibility,
                orgId: req.orgId,
                isActive: true,
                createdAt: new Date().getTime(),
                updatedAt: new Date().getTime(),
                // importedBy: req.me.id,
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
            { code: "VALIDATION_ERROR", message: "Please Choose valid File!" },
          ],
        });
      }
    } catch (err) {
      return res.status(500).json({
        errors: [{ code: "UNKNOWN SERVER ERROR", message: err.message }],
      });
    }
  },

  /*ADD OWNER*/
  addOwner: async (req, res) => {
    try {
      // let payload = req.body;
      let resultData;
      await knex.transaction(async (trx) => {
        const payload = _.omit(req.body, ["joinOwnerName", "ownerIdNo"]);

        const schema = Joi.object().keys({
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
        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message },
            ],
          });
        }

        let insertData = {
          agmId: payload.agmId,
          unitId: payload.unitNo,
          companyId: payload.companyId,
          projectId: payload.projectId,
          ownerName: payload.ownerName,
          joinOwnerName: payload.joinOwnerName,
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
        errors: [{ code: "UNKNOWN SERVER ERROR", message: err.message }],
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
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }],
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
        errors: [{ code: "UNKNOWN SERVER ERROR", message: err.message }],
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
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }],
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
        errors: [{ code: "UNKNOWN SERVER ERROR", message: err.message }],
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
          .leftJoin("companies", "agm_master.companyId", "companies.id")
          .leftJoin("projects", "agm_master.projectId", "projects.id")
          .where({ "agm_master.orgId": req.orgId })
          .where((qb) => {
            if (payload.agmId) {
              qb.where("agm_master.id", payload.agmId);
            }
            if (payload.companyId) {
              qb.where("agm_master.companyId", payload.companyId);
            }
            if (payload.projectId) {
              qb.where("agm_master.projectId", payload.projectId);
            }
            if (payload.agmDate) {
              qb.where("agm_master.agmDate", payload.agmDate);
            }
          })
          .first(),
        knex
          .from("agm_master")
          .leftJoin("companies", "agm_master.companyId", "companies.id")
          .leftJoin("projects", "agm_master.projectId", "projects.id")
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
              qb.where("agm_master.companyId", payload.companyId);
            }
            if (payload.projectId) {
              qb.where("agm_master.projectId", payload.projectId);
            }
            if (payload.agmDate) {
              qb.where("agm_master.agmDate", payload.agmDate);
            }
          }),
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
        errors: [{ code: "UNKNOWN SERVER ERROR", message: err.message }],
      });
    }
  },

  /*GET OWNER LIST  */
  getOwnerList: async (req, res) => {
    try {
      let payload = req.body;
      console.log("payload value for pages=====>>>>>", payload);
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
          // .where({
          //   "agm_owner_master.companyId": payload.companyId,
          //   "agm_owner_master.projectId": payload.projectId,
          // })
          .where({ "agm_owner_master.agmId": payload.agmId })
          .where((qb) => {
            qb.where("agm_owner_master.orgId", req.orgId);
            if (payload.agmId) {
              qb.where("agm_owner_master.agmId", payload.agmId);
            }
            if (payload.unitId) {
              qb.where("agm_owner_master.unitId", payload.unitId);
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
          .select([
            "agm_owner_master.*",
            "property_units.unitNumber",
            "property_units.description as unitDescription",
          ])
          // .where({
          //   "agm_owner_master.companyId": payload.companyId,
          //   "agm_owner_master.projectId": payload.projectId,
          // })
          .where({ "agm_owner_master.agmId": payload.agmId })
          .where((qb) => {
            // qb.where('agm_owner_master.orgId', req.orgId);
            qb.where("agm_owner_master.orgId", req.orgId);
            if (payload.agmId) {
              qb.where("agm_owner_master.agmId", payload.agmId);
            }
            if (payload.unitId) {
              qb.where("agm_owner_master.unitId", payload.unitId);
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
          .limit(per_page),
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

      res.status(200).json({
        data: {
          ownerList: pagination,
        },
        message: "Owner list successfully !",
      });
    } catch (err) {
      return res.status(500).json({
        errors: [{ code: "UNKNOWN SERVER ERROR", message: err.message }],
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
            qb.whereIn("agm_owner_master.unitId", payload.unitNo);
          }
          if (payload.ownerName) {
            qb.where("agm_owner_master.ownerName", payload.ownerName);
          }
          if (payload.ownerIdNo) {
            qb.where("agm_owner_master.ownerIdNo", payload.ownerIdNo);
          }
        });

      return res.status(200).json({
        data: ownerList,
        message: "get owner list Successfully!",
      });
    } catch (err) {
      return res.status(500).json({
        errors: [{ code: "UNKNOWN SERVER ERROR", message: err.message }],
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
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }],
        });
      }

      let agmDetails = await knex("agm_master")
        .leftJoin("companies", "agm_master.companyId", "companies.id")
        .leftJoin("projects", "agm_master.projectId", "projects.id")
        .select([
          "agm_master.*",
          "companies.companyId as companyCode",
          "companies.companyName",
          "projects.project as projectCode",
          "projects.projectName",
        ])
        .where({ "agm_master.id": payload.id, "agm_master.orgId": req.orgId });

      return res.status(200).json({
        data: agmDetails,
        message: "Agm Details Successfully!",
      });
    } catch (err) {
      return res.status(500).json({
        errors: [{ code: "UNKNOWN SERVER ERROR", message: err.message }],
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
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }],
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
        errors: [{ code: "UNKNOWN SERVER ERROR", message: err.message }],
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
      ]);

      const schema = new Joi.object().keys({
        agmId: Joi.string().required(),
        signature: Joi.string().required(),
        type: Joi.string().required(),
      });

      const result = Joi.validate(payload, schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }],
        });
      }
      let currentTime = new Date().getTime();

      let insertData = {
        signature: payload.signature,
        signatureAt: currentTime,
        registrationType:payload.type
      };

      let insertResult;
      for (let owner of req.body.ownerId) {
        insertResult = await knex
          .update(insertData)
          .where({ agmId: payload.agmId, id: owner })
          .returning(["*"])
          .into("agm_owner_master");
      }

      let insertProxyData = {
        proxyName: req.body.proxyName,
        proxyId: req.body.proxyId,
      };

      let insertProxyResult;
      for (let proxy of req.body.ownerProxyId) {
        insertProxyResult = await knex
          .update(insertProxyData)
          .where({ agmId: payload.agmId, id: proxy })
          .returning(["*"])
          .into("proxy_document");
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
        errors: [{ code: "UNKNOWN SERVER ERROR", message: err.message }],
      });
    }
  },

  /*GET AGENDA LIST */
  getAgendaList: async (req, res) => {
    try {
      let payload = req.body;
      let agendaLists;
      const schema = new Joi.object().keys({
        agmId: Joi.number().required(),
      });

      const result = Joi.validate(payload, schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }],
        });
      }

      agendaLists = await knex("agenda_master")
        .where({ "agenda_master.agmId": payload.agmId })
        .select(["agenda_master.*"]);

      // let updateResult = await knex('agm_owner_master').update(updateData).where({ id: payload.id, orgId: req.orgId }).returning(["*"]);

      return res.status(200).json({
        data: agendaLists,
        message: "Get Agenda Lists!",
      });
    } catch (err) {
      return res.status(500).json({
        errors: [{ code: "UNKNOWN SERVER ERROR", message: err.message }],
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
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }],
        });
      }

      ownerDetails = await knex("agm_owner_master")
        .where({ "agm_owner_master.id": payload.ownerId, orgId: req.orgId })
        .select(["agm_owner_master.*"]);

      return res.status(200).json({
        data: ownerDetails,
        message: "Get Owner Details!",
      });
    } catch (err) {
      return res.status(500).json({
        errors: [{ code: "UNKNOWN SERVER ERROR", message: err.message }],
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
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }],
        });
      }

      ownerSignature = await knex("agm_owner_master")
        .where({ "agm_owner_master.id": payload.ownerId, orgId: req.orgId })
        .select(["agm_owner_master.signature"]);

      return res.status(200).json({
        data: ownerSignature,
        message: "Get Owner Signature!",
      });
    } catch (err) {
      return res.status(500).json({
        errors: [{ code: "UNKNOWN SERVER ERROR", message: err.message }],
      });
    }
  },

  /*UPDATE OWNER DATA */
  updateOwner: async (req, res) => {
    try {
      let payload = req.body;
      let updateOwner;
      const schema = new Joi.object().keys({
        agmId: Joi.number().required(),
        unitNo: Joi.number().required(),
        ownerName: Joi.string().required(),
        eligibility: Joi.number().required(),
        ownerId: Joi.number().required(),
      });

      const result = Joi.validate(payload, schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }],
        });
      }

      let updateData = {
        eligibility: payload.eligibility,
        ownerName: payload.ownerName,
        unitId: payload.unitId,
      };

      updateOwner = await knex("agm_owner_master")
        .update(updateData)
        .where({ id: payload.ownerId, orgId: req.orgId, agmId: payload.agmId })
        .returning(["*"]);

      return res.status(200).json({
        data: updateOwner,
        message: "Owner updated successfully!",
      });
    } catch (err) {
      return res.status(500).json({
        errors: [{ code: "UNKNOWN SERVER ERROR", message: err.message }],
      });
    }
  },

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
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }],
        });
      }

      documentList = await knex("proxy_document")
        .where({ "proxy_document.agmId": payload.agmId })
        .select(["proxy_document.*"]);

      // let updateResult = await knex('agm_owner_master').update(updateData).where({ id: payload.id, orgId: req.orgId }).returning(["*"]);

      return res.status(200).json({
        data: documentList,
        message: "Proxy Document Lists!",
      });
    } catch (err) {
      return res.status(500).json({
        errors: [{ code: "UNKNOWN SERVER ERROR", message: err.message }],
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
        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message },
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
        });

      return res.status(200).json({
        data: {
          propertyData: getPropertyUnits,
        },
      });
    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  getUnitListByCompanyAndProject: async (req, res) => {
    try {
      let id = req.me.id;

      let getPropertyUnits = await knex("property_units").select("*").where({
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
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },

  getProxyDocumentImages: async(req,res)=>{
    try {
      
      let payload = req.body;

      const schema = new Joi.object().keys({
        agmId: Joi.number().required(),
      });
      const result = Joi.validate(payload, schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }],
        });
      }

      let images = await knex
      .from("images")
      .where({entityId: payload.agmId, entityType: "proxy_document" })

      return res.status(200).json({
        data: {
          proxyImages: images,
        },
      });

    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },

  generatePdfOfVotingDocument : async(req, res) => {
    try {
            
          const path = require('path');
          const pdf = require("pdf-creator-node");
          const fs = require("fs");
          
          // Read HTML Template
          const templatePath = path.join(__dirname,'template.html');
          console.log('pdf');
          console.log(templatePath);
          const html = fs.readFileSync(templatePath, "utf8");
          
          let tempraryDirectory = null;
          if (process.env.IS_OFFLINE) {
              tempraryDirectory = "tmp/";
          } else {
              tempraryDirectory = "/tmp/";
          }
          let filename = "Vote-" + Date.now() + ".pdf";
          let filepath = tempraryDirectory + filename;

          const options = {
          format: "A5",
          orientation: "portrait",
          border: "5mm",
          header: {
              height: "1mm",
              contents: ''
              //contents: '<div style="text-align: center;">Author: Shyam Hajare</div>'
          },
          footer: {
              height: "1mm",
              contents: {
                  // first: 'Cover page',
                  // 2: 'Second page', // Any page number is working. 1-based index
                  // default: '<span style="color: #444;">{{page}}</span>/<span>{{pages}}</span>', // fallback value
                  // last: 'Last Page'
              }
          }
          };
          const datas = [
              {
                  pName:'PName',
                  date:'22/03/2021',
                  agenda:'Agenda',
                  unitNo:'',
                  oRatio:'',
              }
          ];
          const listDatas = [
          {
              enText: "Consent",
              thaiText: "เห็นชอบ",
              qrCode:'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/QR_code_for_mobile_English_Wikipedia.svg/1200px-QR_code_for_mobile_English_Wikipedia.svg.png'
          },
          {
              enText: "Dissent",
              thaiText: "ไม่เห็นชอบ",
              qrCode:'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/QR_code_for_mobile_English_Wikipedia.svg/1200px-QR_code_for_mobile_English_Wikipedia.svg.png'
          },
          {
              enText: "Abstention",
              thaiText: "งดออกเสียง",
              qrCode:'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/QR_code_for_mobile_English_Wikipedia.svg/1200px-QR_code_for_mobile_English_Wikipedia.svg.png'
          },
          ];
          const document = {
          html: html,
          data: {
              listDatas: listDatas,
              datas:datas

          },
          path: filepath,
          type: "",
          };

      let success;

      pdf
      .create(document, options)
      .then((results) => {
          //res.json({results:results})
          let bucketName = process.env.S3_BUCKET_NAME;
          const AWS = require("aws-sdk");
          fs.readFile(results.filename, function (err, file_buffer) {
              var s3 = new AWS.S3();
              var params = {
                  Bucket: bucketName,
                  Key: "Export/Asset/" + filename,
                  Body: file_buffer,
                  ACL: "public-read"
              };
              s3.putObject(params, function (err, data) {
                  if (err) {
                      console.log("Error at uploadPDFFileOnS3Bucket function", err);
                      //next(err);
                      return res.status(500).json({
                          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
                      });
                  } else {
                      console.log("File uploaded Successfully");

                      //next(null, filePath);
                      // fs.unlink(filepath, err => {
                      //   console.log("File Deleting Error " + err);
                      // });
                      let url = process.env.S3_BUCKET_URL + "/Export/Asset/" + filename;

                      return res.status(200).json({
                          data: {},
                          message: "Asset Data Export Successfully!",
                          url: url,
                          // assetResult
                      });
                  }
              });
          });
      })
      .catch((error) => {
          console.error(error);
          res.json({error:error})
      });
      //res.send('pdf');

    } catch (err) {
      res.status(200).json({ failed: true, error: err });
    }
  }
};

module.exports = agmController;
