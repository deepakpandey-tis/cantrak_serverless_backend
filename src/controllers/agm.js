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

  addAGMPreparation: async (req, res) => {
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

      let data = req.body;
      console.log("+++++++++++++", data[0], "=========");
      let totalData = data.length - 1;
      let fail = 0;
      let success = 0;
      let result = null;
      let userId = req.me.id;
      let errors = [];
      let header = Object.values(data[0]);
      header.unshift('Error');
      errors.push(header)

      if (data[0].A === 'UNIT_NO' &&
        data[0].B === 'OWNER_NAME' &&
        data[0].C === 'OWNERSHIP_RATIO' &&
        data[0].D === 'ELIGIBILITY_TOGGLE'
      ) {
        if (data.length > 0) {

          let i = 0;
          for (let ownerData of data) {
            i++;
            if (i > 1) {

              if (!ownerData.A) {
                let values = _.values(ownerData)
                values.unshift('Unit no. can not empty!')
                errors.push(values);
                fail++;
                continue;
              }

              if (!ownerData.B) {
                let values = _.values(ownerData)
                values.unshift('Owner name can not empty!')
                errors.push(values);
                fail++;
                continue;
              }

              if (!ownerData.C) {
                let values = _.values(ownerData)
                values.unshift('Ownership ratio can not empty!')
                errors.push(values);
                fail++;
                continue;
              }

              if (!ownerData.D) {
                let values = _.values(ownerData)
                values.unshift('Eligibility can not empty!')
                errors.push(values);
                fail++;
                continue;
              }
              let unitId;
              let checkExist = await knex("property_units")
                .select("id")
                .where({
                  orgId: req.orgId,
                  unitNumber: ownerData.A.toUpperCase(),
                });

              if (checkExist.length > 0) {
                unitId = checkExist[0].id;
              } else {
                let values = _.values(ownerData);
                values.unshift('Unit Number Does not exist!')
                errors.push(values);
                fail++;
                continue;
              }


              let insertData = {
                agmId: 10,
                unitId: unitId,
                ownerName: ownerData.B,
                ownerershipRatio: ownerData.C,
                eligibility: ownerData.D,
                orgId: req.orgId,
                isActive: true,
                createdAt: new Date().getTime(),
                updatedAt: new Date().getTime(),
                importedBy: req.me.id,
                displayId: 1,
                createdBy: req.me.id
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
            errors
          });
        }

      } else {
        return res.status(400).json({
          errors: [
            { code: "VALIDATION_ERROR", message: "Please Choose valid File!" }
          ]
        });
      }

    } catch (err) {

      return res.status(500).json({
        errors: [
          { code: 'UNKNOWN SERVER ERROR', message: err.message }
        ]
      })
    }


  },



  // Get AGM Preparation List

  // GetAGMPreparationList : async(req,res)=>{
  //   try {
  //     let payload = req.body;
  //     console.log("payloadData++++++++", payload);

  //     let total,rows ;

  //     let pagination = {};
  //     let per_page = reqData.per_page || 10;
  //     let page = reqData.current_page || 1;
  //     if (page < 1) page = 1;
  //     let offset = (page - 1) * per_page;
  //     let agmId ;

  //     let {name , company , project, meetingDate , createdDate} = req.body

  //   } catch (error) {
      
  //   }
  // }


  /*ADD OWNER*/
  addOwner: async (req, res) => {

    try {
      let payload = req.body;
      let resultData;
      await knex.transaction(async (trx) => {

        const schema = Joi.object().keys({
          agmId: Joi.string().required(),
          unitId: Joi.string().required(),
          ownerName: Joi.string().required(),
          ownerershipRatio: Joi.string().required(),
          eligibilityToggle: Joi.string().required(),
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
          agmId: 10,
          unitId: payload.unitId,
          ownerName: payload.ownerName,
          ownerershipRatio: payload.ownerershipRatio,
          eligibility: payload.eligibilityToggle,
          orgId: req.orgId,
          isActive: true,
          createdAt: new Date().getTime(),
          updatedAt: new Date().getTime(),
          displayId: 1,
          createdBy: req.me.id
        };

        resultData = await knex
          .insert(insertData)
          .returning(["*"])
          .into("agm_owner_master");
        trx.commit;
      })
      return res.status(200).json({
        data: resultData,
        message: "Owner added successfully!"
      })
    } catch (err) {
      return res.status(500).json({
        errors: [{ code: "UNKNOWN SERVER ERROR", message: err.message }],
      });
    }

  }
  ,
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
          errors: [
            { code: "VALIDATION_ERROR", message: result.error.message },
          ],
        });
      }
      let delResult = await knex('agm_owner_master').where({ id: payload.id, orgId: req.orgId }).del().returning(["*"]);
      return res.status(200).json({
        data: delResult,
        message: "Owner deleted successfully!"
      });

    } catch (err) {
      return res.status(500).json({
        errors: [{ code: "UNKNOWN SERVER ERROR", message: err.message }]
      })
    }

  },

  /*UPDATE ELIGIBILITY */
  updateEligibility: async (req, res) => {

    try {

      let payload = req.body;

      const schema = new Joi.object().keys({
        id: Joi.string().required(),
        eligibility: Joi.string().required()
      })

      const result = Joi.validate(payload, schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [
            { code: "VALIDATION_ERROR", message: result.error.message },
          ],
        });
      }

      let updateData = {
        eligibility: payload.eligibility
      }

      let updateResult = await knex('agm_owner_master').update(updateData).where({ id: payload.id, orgId: req.orgId }).returning(["*"]);

      return res.status(200).json({
        data: updateResult,
        message: "Eligibility updated successfully!"
      })


    } catch (err) {

      return res.status(500).json({
        errors: [{ code: "UNKNOWN SERVER ERROR", message: err.message }]
      });

    }

  },

  /*GET AGM LIST */
  getAgmList: async (req, res) => {

    try {

      let payload = req.body;
      const schema = new Joi.object().keys({
        id: Joi.string().required(),
        eligibility: Joi.string().required()
      })

      const result = Joi.validate(payload, schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [
            { code: "VALIDATION_ERROR", message: result.error.message },
          ],
        });
      }

      let updateData = {
        eligibility: payload.eligibility
      }

      let updateResult = await knex('agm_owner_master').update(updateData).where({ id: payload.id, orgId: req.orgId }).returning(["*"]);

      return res.status(200).json({
        data: updateResult,
        message: "Eligibility updated successfully!"
      })


    } catch (err) {

      return res.status(500).json({
        errors: [{ code: "UNKNOWN SERVER ERROR", message: err.message }]
      });

    }

  },

  /*GET OWNER LIST  */
  getOwnerList: async (req, res) => {

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
          .from("agm_owner_master")
          .leftJoin('property_units', 'agm_owner_master.unitId', 'property_units.id')
          .where(qb => {
            qb.where('agm_owner_master.orgId', req.orgId);
            if (payload.agmId) {
              qb.where('agm_owner_master.agmId', payload.agmId);
            }
            if (payload.unitId) {
              qb.where('agm_owner_master.unitId', payload.unitId);
            }
            if (payload.ownerName) {
              qb.where('agm_owner_master.ownerName', 'iLIKE', `%${payload.ownerName}%`);
            }
          }).first(),
        knex.from('agm_owner_master')
          .leftJoin('property_units', 'agm_owner_master.unitId', 'property_units.id')
          .select([
            "agm_owner_master.*",
            "property_units.unitNumber",
            "property_units.description as unitDescription",
          ])
          .where(qb => {
            qb.where('agm_owner_master.orgId', req.orgId);
            qb.where('agm_owner_master.orgId', req.orgId);
            if (payload.agmId) {
              qb.where('agm_owner_master.agmId', payload.agmId);
            }
            if (payload.unitId) {
              qb.where('agm_owner_master.unitId', payload.unitId);
            }
            if (payload.ownerName) {
              qb.where('agm_owner_master.ownerName', 'iLIKE', `%${payload.ownerName}%`);
            }
          })
          .offset(offset)
          .limit(per_page)
      ])

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
          ownerList: pagination
        },
        message: "Owner list successfully !"
      });

    } catch (err) {
      return res.status(500).json({
        errors: [{ code: "UNKNOWN SERVER ERROR", message: err.message }]
      })
    }
  },


  /*GET AGM DETAILS */
  getAgmDetails: async (req, res) => {

    try {

      let payload = req.body;
      const schema = new Joi.object().keys({
        id: Joi.string().required()
      })

      const result = Joi.validate(payload, schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [
            { code: "VALIDATION_ERROR", message: result.error.message },
          ],
        });
      }

      let agmDetails = await knex('agm_master')
        .leftJoin('companies', 'agm_master.companyId', 'companies.id')
        .leftJoin('projects', 'agm_master.projectId', 'projects.id')
        .select([
          "agm_master.*",
          "companies.companyId as companyCode",
          "companies.companyName",
          "projects.project as projectCode",
          "projects.projectName"
        ])
        .where({ 'agm_master.id': payload.id, 'agm_master.orgId': req.orgId });

      return res.status(200).json({
        data: agmDetails,
        message: "Agm Details Successfully!"
      })
    } catch (err) {
      return res.status(500).json({
        errors: [{ code: "UNKNOWN SERVER ERROR", message: err.message }]
      });

    }
  },

  /*OWNER PROXY REGISTRATION*/
  ownerProxyRegistration: async (req, res) => {

    try {
      let payload = req.body;
      const schema = new Joi.object().keys({
        // proxyName: Joi.string().required(),
        agmId: Joi.string().required(),
        ownerName: Joi.string().required(),
      })

      const result = Joi.validate(payload, schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [
            { code: "VALIDATION_ERROR", message: result.error.message },
          ],
        });
      }

      let insertData = {
        //  proxyName: payload.proxyName,
        agmId: payload.agmId,
        ownerName: payload.ownerName,
        orgId: req.orgId
      }

      let insertResult = await knex('agm_owner_master').insert(insertData).returning(["*"]);
      return res.status(200).json({
        data: insertResult,
        message: "Proxy added successfully!"
      })

    } catch (err) {

      return res.status(500).json({
        errors: [{ code: "UNKNOWN SERVER ERROR", message: err.message }]
      });

    }
  },
  /*GET AGENDA LIST */
  getAgendaList: async (req, res) => {

    try {

      let payload = req.body;
      let agendaLists;
      const schema = new Joi.object().keys({
         agmId: Joi.number().required()
      })

      const result = Joi.validate(payload, schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [
            { code: "VALIDATION_ERROR", message: result.error.message },
          ],
        });
      }

      agendaLists = await knex('agenda_master').where({ 'agenda_master.agmId': payload.agmId })
        .select([
          'agenda_master.*'
        ])

      // let updateResult = await knex('agm_owner_master').update(updateData).where({ id: payload.id, orgId: req.orgId }).returning(["*"]);

      return res.status(200).json({
        data: agendaLists,
        message: "Get Agenda Lists!"
      })

    } catch (err) {

      return res.status(500).json({
        errors: [{ code: "UNKNOWN SERVER ERROR", message: err.message }]
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
        agmId: Joi.number().required()
      })

      const result = Joi.validate(payload, schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [
            { code: "VALIDATION_ERROR", message: result.error.message },
          ],
        });
      }

      ownerDetails = await knex('agm_owner_master').where({ 'agm_owner_master.id': payload.ownerId, 'orgId': req.orgId })
        .select([
          'agm_owner_master.*'
        ])

      return res.status(200).json({
        data: ownerDetails,
        message: "Get Owner Details!"
      })

    } catch (err) {

      return res.status(500).json({
        errors: [{ code: "UNKNOWN SERVER ERROR", message: err.message }]
      });

    }
  },
   /*GET AGENDA LIST */
  getAgendaList: async (req, res) => {

    try {

      let payload = req.body;
      let agendaLists;
      const schema = new Joi.object().keys({
         agmId: Joi.number().required()
      })

      const result = Joi.validate(payload, schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [
            { code: "VALIDATION_ERROR", message: result.error.message },
          ],
        });
      }

      agendaLists = await knex('agenda_master').where({ 'agenda_master.agmId': payload.agmId })
        .select([
          'agenda_master.*'
        ])

      // let updateResult = await knex('agm_owner_master').update(updateData).where({ id: payload.id, orgId: req.orgId }).returning(["*"]);

      return res.status(200).json({
        data: agendaLists,
        message: "Get Agenda Lists!"
      })

    } catch (err) {

      return res.status(500).json({
        errors: [{ code: "UNKNOWN SERVER ERROR", message: err.message }]
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
      })

      const result = Joi.validate(payload, schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [
            { code: "VALIDATION_ERROR", message: result.error.message },
          ],
        });
      }

      let updateData = {
        eligibility: payload.eligibility,
        ownerName: payload.ownerName,
        unitId: payload.unitId     
      }
     
      updateOwner = await knex('agm_owner_master').update(updateData).where({ id: payload.ownerId, orgId: req.orgId, agmId: payload.agmId }).returning(["*"]);

      return res.status(200).json({
        data: updateOwner,
        message: "Owner updated successfully!"
      })

    } catch (err) {

      return res.status(500).json({
        errors: [{ code: "UNKNOWN SERVER ERROR", message: err.message }]
      });
    }
  },
};

module.exports = agmController;




