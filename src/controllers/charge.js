const Joi = require("@hapi/joi");
const _ = require("lodash");
const XLSX = require("xlsx");
const knex = require("../db/knex");

//const trx = knex.transaction();

const chargeController = {
  addCharge: async (req, res) => {
    try {
      let chargeData = null;
      const userId = req.me.id;

      await knex.transaction(async trx => {
        let chargePayload = req.body;
        const schema = Joi.object().keys({
          chargeCode: Joi.string().required(),
          descriptionThai: Joi.string().required(),
          descriptionEng: Joi.string().required(),
          calculationUnit: Joi.string().required(),
          rate: Joi.string().required(),
          vatRate: Joi.string().required(),
          vatId: Joi.string().required(),
          whtId: Joi.string()
            .allow("")
            .optional(),
          whtRate: Joi.string()
            .allow("")
            .optional(),
          glAccountCode: Joi.string()
            .allow("")
            .optional()
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
          createdBy: userId,
          orgId: req.orgId,
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
      const userId = req.me.id;

      await knex.transaction(async trx => {
        let chargePayload = req.body;
        const schema = Joi.object().keys({
          id: Joi.number().required(),
          chargeCode: Joi.string().required(),
          descriptionThai: Joi.string().required(),
          descriptionEng: Joi.string().required(),
          calculationUnit: Joi.string().required(),
          rate: Joi.string().required(),
          vatRate: Joi.string().required(),
          vatId: Joi.string().required(),
          whtId: Joi.string().allow("").optional(),
          whtRate: Joi.string().allow("").optional(),
          glAccountCode: Joi.string().allow("").optional()
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
            id: chargePayload.id,
            createdBy: userId,
            orgId: req.orgId
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
          .leftJoin("users", "users.id", "charge_master.createdBy")
          .where({ "charge_master.orgId": req.orgId })
          .first(),
        knex("charge_master")
          .leftJoin("users", "users.id", "charge_master.createdBy")
          .where({ "charge_master.orgId": req.orgId })
          .select([
            "charge_master.id",
            "charge_master.chargeCode as Charges Code",
            "charge_master.calculationUnit as Calculation Unit",
            "charge_master.rate as Cost",
            "charge_master.isActive as Status",
            "users.name as Created By",
            "charge_master.createdAt as Date Created"
          ])
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

        console.log(
          "[controllers][charge][deleteCharge]: Charge Code",
          validChargesId
        );

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

          console.log(
            "[controllers][charge][deletecharge]: Delete Data",
            updateDataResult
          );

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
  },
  exportCharge: async (req, res) => {
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

      var wb = XLSX.utils.book_new({ sheet: "Sheet JS" });
      var ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "pres");
      XLSX.write(wb, { bookType: "csv", bookSST: true, type: "base64" });
      let filename = "uploads/ChargesData-" + Date.now() + ".csv";
      let check = XLSX.writeFile(wb, filename);

      res.status(200).json({
        data: rows,
        message: "Charges Data Export Successfully!"
      });
    } catch (err) {
      console.log("[controllers][charge][getcharges] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getVatCodeList: async (req, res) => {
    try {
      let rows = null;
      let pagination = {};

      [rows] = await Promise.all([
        knex("taxes").select(["id as vatId", "taxCode", "taxPercentage"])
      ]);

      pagination.data = rows;

      res.status(200).json({
        data: {
          vatList: pagination
        },
        message: "Vat Code lists !!"
      });
    } catch (err) {
      console.log("[controllers][charge][vatList] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getWhtCodeList: async (req, res) => {
    try {
      let rows = null;
      let pagination = {};

      [rows] = await Promise.all([
        knex("wht_master").select(["id as whtId", "whtCode", "taxPercentage"])
      ]);

      pagination.data = rows;

      res.status(200).json({
        data: {
          whtList: pagination
        },
        message: "WHT Code lists !!"
      });
    } catch (err) {
      console.log("[controllers][whht][whtList] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getChargesDetails: async (req, res) => {
    try {
      let chargeDetail = null;
      await knex.transaction(async trx => {
        let payload = req.body;
        const schema = Joi.object().keys({
          id: Joi.string().required()
        });
        const result = Joi.validate(payload, schema);

        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }

        let current = new Date().getTime();
        let chargesResult = await knex("charge_master")
          .leftJoin("taxes", "charge_master.vatId", "taxes.id")
          .leftJoin("wht_master", "charge_master.whtId", "wht_master.id")
          .where({ "charge_master.id": payload.id, "charge_master.orgId": req.orgId })
          .select("charge_master.*","taxes.taxCode","wht_master.whtCode");        
        chargeDetail = _.omit(chargesResult[0], [
          "charge_master.createdAt",
          "charge_master.updatedAt",
          "charge_master.isActive"
        ]);
        trx.commit;
      });

      return res.status(200).json({
        data: {
          chargesDetails: chargeDetail
        },
        message: "Charges details"
      });
    } catch (err) {
      console.log("[controllers][generalsetup][viewtax] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  }
};

module.exports = chargeController;
