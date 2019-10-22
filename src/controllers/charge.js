const Joi = require("@hapi/joi");
const _ = require("lodash");
const XLSX = require('xlsx');
const knex = require("../db/knex");

//const trx = knex.transaction();

const chargeController = {
  addCharge: async (req, res) => {
    try {
      let chargeData = null;
      await knex.transaction(async trx => {
        let chargePayload = req.body;
        const schema = Joi.object().keys({
          chargeCode: Joi.string().required(),
          chargeName: Joi.string().required(),
          descriptionThai: Joi.string().required(),
          descriptionEng: Joi.string().required(),
          vat: Joi.string().required(),
          vatCode: Joi.string().required(),
          whtCode: Joi.string().required(),
          calculationUnit: Joi.string().required(),
          glAccountCode: Joi.string().required(),
          whtRate: Joi.string().required(),
          rate: Joi.string().required(),
          isActive: Joi.string().required()
        });

        let result = Joi.validate(chargePayload, schema);
        console.log("[controllers][charge][addCharge]: JOi Result", result);

        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }

        let currentTime = new Date().getTime();
        // Insert into charge codes
        let insertData = {
          ...chargePayload,
          updatedAt: currentTime,
          createdAt: currentTime
        };
        let chargeResult = await knex
          .insert(insertData)
          .returning(["*"])
          .transacting(trx)
          .into("charge_master");
        chargeData = chargeResult[0];

        trx.commit;
      });
      return res.status(200).json({
        data: {
          charge: chargeData
        },
        message: "Charge added successfully"
      });
    } catch (err) {
      console.log("[controllers][charge] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  updateCharge: async (req, res) => {
    try {
      let chargeData = null;
      await knex.transaction(async trx => {
        let chargePayload = req.body;
        const schema = Joi.object().keys({
          id: Joi.number().required(),
          chargeCode: Joi.string().required(),
          chargeName: Joi.string().required(),
          descriptionThai: Joi.string().required(),
          descriptionEng: Joi.string().required(),
          vat: Joi.string().required(),
          vatCode: Joi.string().required(),
          whtCode: Joi.string().required(),
          calculationUnit: Joi.string().required(),
          glAccountCode: Joi.string().required(),
          whtRate: Joi.string().required(),
          rate: Joi.string().required()
        });

        let result = Joi.validate(chargePayload, schema);
        console.log("[controllers][charge][updateCharge]: JOi Result", result);

        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }

        const existChargesCode = await knex("charge_master")
          .where({ chargeCode: chargePayload.chargeCode.toUpperCase() })
          .whereNot({ id: chargePayload.id });

        console.log(
          "[controllers][charge][updateCharge]: Charges Code",
          existChargesCode
        );

        // Return error when charges exist

        if (existChargesCode && existChargesCode.length) {
          return res.status(400).json({
            errors: [
              {
                code: "CHARGE_CODE_EXIST_ERROR",
                message: "Charges Code already exist !"
              }
            ]
          });
        }

        // Insert in charges table,
        const currentTime = new Date().getTime();

        const updateChargesResult = await knex
          .update({
            chargeCode: chargePayload.chargeCode.toUpperCase(),
            chargeName: chargePayload.chargeName,
            descriptionEng: chargePayload.descriptionEng,
            descriptionThai: chargePayload.descriptionThai,
            vat: chargePayload.vat,
            vatCode: chargePayload.vatCode,
            whtRate: chargePayload.whtRate,
            whtCode: chargePayload.whtCode,
            calculationUnit: chargePayload.calculationUnit,
            glAccountCode: chargePayload.glAccountCode,
            rate: chargePayload.rate,
            updatedAt: currentTime
          })
          .where({
            id: chargePayload.id
          })
          .returning(["*"])
          .transacting(trx)
          .into("charge_master");

        // const updateData = { ...incidentTypePayload, typeCode: incidentTypePayload.typeCode.toUpperCase(), isActive: 'true', createdAt: currentTime, updatedAt: currentTime };

        console.log(
          "[controllers][charge][updatecharge]: Update Data",
          updateChargesResult
        );


        //const incidentResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('incident_type');
        
        chargeData = updateChargesResult[0];

        trx.commit;
      });
      return res.status(200).json({
        data: {
          charge: chargeData
        },
        message: "Charge updated successfully"
      });
    } catch (err) {
      console.log("[controllers][charge][updatecharge] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getChargesList: async (req, res) => {
    try {
      let reqData = req.query;
      let total = null;
      let rows = null;
      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;

      [total, rows] = await Promise.all([
        knex
          .count("* as count")
          .from("charge_master")
          .first(),
        knex
          .select("*")
          .from("charge_master")
          .offset(offset)
          .limit(per_page)
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
          chargeLists: pagination
        },
        message: "Charges list successfully !"
      });
    } catch (err) {
      console.log("[controllers][charge][getcharges] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  // Delete Charges  //
  deleteCharges: async (req, res) => {
    try {
      let delChargesPayload = null;

      await knex.transaction(async trx => {
        let chargesPaylaod = req.body;

        const schema = Joi.object().keys({
          id: Joi.number().required()
        });

        const result = Joi.validate(chargesPaylaod, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }

        const validChargesId = await knex("charge_master").where({
          id: chargesPaylaod.id
        });

        console.log("[controllers][charge][deleteCharge]: Charge Code",
        validChargesId);

        // Return error when username exist

        if (validChargesId && validChargesId.length) {
          // Insert in users table,
          const currentTime = new Date().getTime();
          //console.log('[controllers][entrance][signup]: Expiry Time', tokenExpiryTime);

          //const updateDataResult = await knex.table('incident_type').where({ id: incidentTypePayload.id }).update({ ...incidentTypePayload }).transacting(trx);
          const updateDataResult = await knex
            .update({
              isActive: "false",
              updatedAt: currentTime
            })
            .where({
              id: chargesPaylaod.id
            })
            .returning(["*"])
            .transacting(trx)
            .into("charge_master");

          console.log("[controllers][charge][deletecharge]: Delete Data",updateDataResult);

          //const incidentResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('incident_type');

          updateChargesPayload = updateDataResult[0];
        } else {
          return res.status(400).json({
            errors: [
              {
                code: "CHARGE_DOES_NOT_EXIST_ERROR",
                message: "Id does not exist!!"
              }
            ]
          });
        }
        trx.commit;
      });

      res.status(200).json({
        data: {
          charges: updateChargesPayload
        },
        message: "Charges deleted successfully !"
      });
    } catch (err) {
      console.log("[controllers][charge][deletefaction] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  addServiceOrderFixCharge: async (req, res) => {
    try {
      let charge = null;
      await knex.transaction(async trx => {
        const payload = req.body;
        const schema = Joi.object().keys({
          serviceOrderId: Joi.string().required(),
          chargeId: Joi.string().required()
        });

        let result = Joi.validate(payload, schema);
        console.log(
          "[controllers][charge][addServiceOrderFixCharge]: JOi Result",
          result
        );

        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }
        let currentTime = new Date().getTime();
        let insertData = {
          chargeId: payload.chargeId,
          entityId: payload.serviceOrderId,
          entityType: "service_orders",
          updatedAt: currentTime,
          createdAt: currentTime
        };
        let chargeResult = await knex
          .insert(insertData)
          .returning(["*"])
          .transacting(trx)
          .into("assigned_service_charges");
        charge = chargeResult[0];

        trx.commit;
      });

      return res.status(200).json({
        data: {
          charge: charge
        },
        message: "Charge added to service order"
      });
    } catch (err) {
      console.log("[controllers][charge][addServiceFixCharge] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  addQuotationFixCharge: async (req, res) => {
    try {
      let charge = null;
      await knex.transaction(async trx => {
        const payload = req.body;
        const schema = Joi.object().keys({
          quotationId: Joi.string().required(),
          chargeId: Joi.string().required()
        });

        let result = Joi.validate(payload, schema);
        console.log(
          "[controllers][charge][addQuotationFixCharge]: JOi Result",
          result
        );

        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }
        let currentTime = new Date().getTime();
        let insertData = {
          chargeId: payload.chargeId,
          entityId: payload.quotationId,
          entityType: "quotations",
          updatedAt: currentTime,
          createdAt: currentTime
        };
        let chargeResult = await knex
          .insert(insertData)
          .returning(["*"])
          .transacting(trx)
          .into("assigned_service_charges");
        charge = chargeResult[0];

        trx.commit;
      });

      return res.status(200).json({
        data: {
          charge: charge
        },
        message: "Charge added to quotation"
      });
    } catch (err) {
      console.log("[controllers][charge][addQuotationFixCharge] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  addServiceRequestFixCharge: async (req, res) => {
    try {
      let charge = null;
      await knex.transaction(async trx => {
        const payload = req.body;
        const schema = Joi.object().keys({
          serviceRequestId: Joi.string().required(),
          chargeId: Joi.string().required()
        });

        let result = Joi.validate(payload, schema);
        console.log(
          "[controllers][charge][addServiceRequestFixCharge]: JOi Result",
          result
        );

        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }
        let currentTime = new Date().getTime();
        let insertData = {
          chargeId: payload.chargeId,
          entityId: payload.serviceRequestId,
          entityType: "service_requests",
          updatedAt: currentTime,
          createdAt: currentTime
        };
        let chargeResult = await knex
          .insert(insertData)
          .returning(["*"])
          .transacting(trx)
          .into("assigned_service_charges");
        charge = chargeResult[0];

        trx.commit;
      });

      return res.status(200).json({
        data: {
          charge: charge
        },
        message: "Charge added to service request"
      });
    } catch (err) {
      console.log(
        "[controllers][charge][addServiceRequestFixCharge] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },exportCharge: async (req,res)=>{
    try {
      let reqData = req.query;
      let total = null;
      let rows = null;
      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;

      [total, rows] = await Promise.all([
        knex
          .count("* as count")
          .from("charge_master")
          .first(),
        knex
          .select("*")
          .from("charge_master")
          .offset(offset)
          .limit(per_page)
      ]);


      var wb = XLSX.utils.book_new({sheet:"Sheet JS"});
            var ws = XLSX.utils.json_to_sheet(rows);
            XLSX.utils.book_append_sheet(wb, ws, "pres");
            XLSX.write(wb, {bookType:"csv", bookSST:true, type: 'base64'})
            let filename = "uploads/ChargesData-"+Date.now()+".csv";
            let  check = XLSX.writeFile(wb,filename);
      
      res.status(200).json({
        data:rows,
        message: "Charges Data Export Successfully!"
      });

    } catch (err) {
      console.log("[controllers][charge][getcharges] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  }
};

module.exports = chargeController;
