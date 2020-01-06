const Joi = require("@hapi/joi");
const _ = require("lodash");
const XLSX = require("xlsx");
const knex = require("../db/knex");
const fs = require('fs');
const path = require('path')
const request = require("request");



const chargeController = {
  addCharge: async (req, res) => {
    try {
      let chargeData = null;
      const userId = req.me.id;

      await knex.transaction(async trx => {
        let chargePayload = req.body;
        const schema = Joi.object().keys({
          chargeCode: Joi.string().required(),
          descriptionThai: Joi.string().allow("").optional(),
          descriptionEng: Joi.string().allow("").optional(),
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


        /*CHECK DUPLICATE VALUES OPEN */
        let existValue = await knex('charge_master')
          .where({ chargeCode: chargePayload.chargeCode, orgId: req.orgId });
        if (existValue && existValue.length) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: "Charge code already exist!!" }
            ]
          });
        }
        /*CHECK DUPLICATE VALUES CLOSE */


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
          descriptionThai: Joi.string().allow("").optional(),
          descriptionEng: Joi.string().allow("").optional(),
          calculationUnit: Joi.string().required(),
          rate: Joi.string().required(),
          vatRate: Joi.string().required(),
          vatId: Joi.string().required(),
          whtId: Joi.string().allow("").optional(),
          whtRate: Joi.string().allow("").optional(),
          glAccountCode: Joi.allow("").optional()
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
            "charge_master.chargeCode as chargeCode",
            "charge_master.calculationUnit as Calculation Unit",
            "charge_master.calculationUnit as calculationUnit",
            "charge_master.rate as Cost",
            "charge_master.rate as rate",
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
          chargeId: Joi.string().required(),
          status: Joi.string().required(),
          totalHours: Joi.number().required(),
          cost: Joi.number().required()
        });
        console.log("payload", payload);
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
          status: payload.status,
          totalHours: payload.totalHours,
          rate: payload.cost,
          entityType: "quotations",
          updatedAt: currentTime,
          createdAt: currentTime,
          orgId: req.orgId
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
          chargeId: Joi.string().required(),
          status: Joi.string().required(),
          totalHours: Joi.number().required()
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
          status: payload.status,
          totalHours: payload.totalHours,
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
  // exportCharge: async (req, res) => {
  //   try {
  //     let reqData = req.query;
  //     let total = null;
  //     let rows = null;
  //     let pagination = {};
  //     let per_page = reqData.per_page || 10;
  //     let page = reqData.current_page || 1;
  //     if (page < 1) page = 1;
  //     let offset = (page - 1) * per_page;

  //     [total, rows] = await Promise.all([
  //       knex
  //         .count("* as count")
  //         .from("charge_master")
  //         .first(),
  //       knex
  //         .select("*")
  //         .from("charge_master")
  //         .offset(offset)
  //         .limit(per_page)
  //     ]);

  //     var wb = XLSX.utils.book_new({ sheet: "Sheet JS" });
  //     var ws = XLSX.utils.json_to_sheet(rows);
  //     XLSX.utils.book_append_sheet(wb, ws, "pres");
  //     XLSX.write(wb, { bookType: "csv", bookSST: true, type: "base64" });
  //     let filename = "uploads/ChargesData-" + Date.now() + ".csv";
  //     let check = XLSX.writeFile(wb, filename);

  //     res.status(200).json({
  //       data: rows,
  //       message: "Charges Data Export Successfully!"
  //     });
  //   } catch (err) {
  //     console.log("[controllers][charge][getcharges] :  Error", err);
  //     //trx.rollback
  //     res.status(500).json({
  //       errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
  //     });
  //   }
  // },
  getVatCodeList: async (req, res) => {
    try {
      let rows = null;
      let pagination = {};
      let orgId = req.orgId;

      [rows] = await Promise.all([
        knex("taxes").select(["id as vatId", "taxCode", "taxPercentage"]).where({ orgId: orgId })
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
      let orgId = req.orgId;

      [rows] = await Promise.all([
        knex("wht_master").select(["id as whtId", "whtCode", "taxPercentage"]).where({ orgId: orgId })
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
          .where({
            "charge_master.id": payload.id,
            "charge_master.orgId": req.orgId
          })
          .select("charge_master.*", "taxes.taxCode", "wht_master.whtCode");
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
  },
  exportCharge: async (req, res) => {
    try {
      let orgId = req.orgId;
      let reqData = req.query;
      let rows = null;

      [rows] = await Promise.all([
        knex("charge_master")
          .leftJoin("taxes", "charge_master.vatId", "taxes.id")
          .leftJoin(
            "wht_master",
            "charge_master.whtId",
            "wht_master.id"
          )
          .where({ "charge_master.orgId": orgId })
          .select([
            "charge_master.chargeCode as CHARGE_CODE",
            "charge_master.descriptionEng as DESCRIPTION",
            "charge_master.descriptionEng as DESCRIPTIONTH",
            "taxes.taxPercentage as VAT",
            "taxes.taxCode as VAT_CODE",
            "wht_master.taxPercentage as WHT_RATE",
            "wht_master.whtCode as WHT_CODE"
          ])
      ]);

      let tempraryDirectory = null;
      let bucketName = null;
      if (process.env.IS_OFFLINE) {
        bucketName = "sls-app-resources-bucket";
        tempraryDirectory = "tmp/";
      } else {
        tempraryDirectory = "/tmp/";
        bucketName = process.env.S3_BUCKET_NAME;
      }

      var wb = XLSX.utils.book_new({ sheet: "Sheet JS" });


      var ws;

      if (rows && rows.length) {
        ws = XLSX.utils.json_to_sheet(rows);
      } else {
        ws = XLSX.utils.json_to_sheet([
          {
            CHARGE_CODE: "",
            DESCRIPTION: "",
            DESCRIPTIONTH: "",
            VAT: "",
            VAT_CODE: "",
            WHT_RATE: "",
            WHT_CODE: "",
          }
        ]);
      }

      //var ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "pres");
      XLSX.write(wb, { bookType: "csv", bookSST: true, type: "base64" });
      let filename = "ChargeData-" + Date.now() + ".csv";
      let filepath = tempraryDirectory + filename;
      let check = XLSX.writeFile(wb, filepath);
      const AWS = require("aws-sdk");
      fs.readFile(filepath, function (err, file_buffer) {
        var s3 = new AWS.S3();
        var params = {
          Bucket: bucketName,
          Key: "Export/Charge/" + filename,
          Body: file_buffer,
          ACL: "public-read"
        };
        s3.putObject(params, function (err, data) {
          if (err) {
            console.log("Error at uploadCSVFileOnS3Bucket function", err);
            //next(err);
          } else {
            console.log("File uploaded Successfully");
            //next(null, filePath);
            let url =
              "https://sls-app-resources-bucket.s3.us-east-2.amazonaws.com/Export/Charge/" +
              filename;

            return res.status(200).json({
              data: {
                buildingPhases: rows
              },
              message: "Charge Data Export Successfully!",
              url: url
            });
          }
        });
      });
      let deleteFile = await fs.unlink(filepath, err => {
        console.log("File Deleting Error " + err);
      });

    } catch (err) {
      console.log(
        "[controllers][generalsetup][viewbuildingPhase] : Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  importChargeData: async (req, res) => {
    try {
      if (req.file) {
        console.log(req.file);
        let tempraryDirectory = null;
        if (process.env.IS_OFFLINE) {
          tempraryDirectory = "tmp/";
        } else {
          tempraryDirectory = "/tmp/";
        }
        let resultData = null;
        let file_path = tempraryDirectory + req.file.filename;
        let wb = XLSX.readFile(file_path, { type: "binary" });
        let ws = wb.Sheets[wb.SheetNames[0]];
        let data = XLSX.utils.sheet_to_json(ws, {
          type: "string",
          header: "A",
          raw: false
        });
        //data         = JSON.stringify(data);
        console.log("============", data, "=============")
        let result = null;
        let currentTime = new Date().getTime();
        //console.log('DATA: ',data)
        let totalData = data.length - 1;
        let fail = 0;
        let success = 0;

        if (
          data[0].A == "Ã¯Â»Â¿CHARGE_CODE" ||
          (data[0].A == "CHARGE_CODE" &&
            data[0].B == "DESCRIPTION" &&
            data[0].C == "DESCRIPTIONTH" &&
            data[0].D == "VAT" &&
            data[0].E == "VAT_CODE" &&
            data[0].F == "WHT_RATE" &&
            data[0].G == "WHT_CODE")
        ) {
          if (data.length > 0) {
            let i = 0;
            console.log("Data[0]", data[0]);
            for (let chargesData of data) {
              // Find Company primary key
              let vatId = null;
              let whtId = null;

              let taxesIdResult = await knex("taxes")
                .select("id")
                .where({ taxCode: chargesData.E, orgId: req.orgId });
              console.log("TaxIdResult", taxesIdResult);
              if (!chargesData.F && !chargesData.G) {
                whtId = null;
                whtRate = null;
                console.log("wht id not found: ", whtId);
              } else {
                let whtIdResult = await knex("wht_master")
                  .select("id")
                  .where({ whtCode: chargesData.G, orgId: req.orgId });
                if (whtIdResult && whtIdResult.length) {
                  whtId = whtIdResult[0].id;
                  whtRate = chargesData.F;
                  console.log("wht id found: ", whtId);
                }
                console.log("WhtIdResult", whtIdResult);
              }

              if (taxesIdResult && taxesIdResult.length) {
                vatId = taxesIdResult[0].id;
                console.log("vat id found: ", vatId);
              }
              if (!vatId) {
                fail++;
                console.log("breaking due to vat id: ", vatId);
                continue;

              }

              // if (!whtId) {
              //   console.log("breaking due to wht id: ", whtId);
              //   continue;
              // }

              i++;

              if (i > 1) {
                let checkExist = await knex("charge_master")
                  .select("chargeCode")
                  .where({
                    chargeCode: chargesData.A,
                    orgId: req.orgId
                  });
                if (checkExist.length < 1) {
                  let insertData = {
                    orgId: req.orgId,
                    chargeCode: chargesData.A,
                    descriptionThai: chargesData.B,
                    descriptionEng: chargesData.C,
                    vatRate: chargesData.D,
                    vatId: vatId,
                    whtRate: whtRate,
                    whtId: whtId,
                    isActive: true,
                    createdBy: req.me.id,
                    createdAt: currentTime
                  };

                  resultData = await knex
                    .insert(insertData)
                    .returning(["*"])
                    .into("charge_master");
                    if (resultData && resultData.length) {
                      success++;
                    }
                }else{
                  fail++;
                }
              }
            }

            let deleteFile = await fs.unlink(file_path, err => {
              console.log("File Deleting Error " + err);
            });
            let message = null;
            if (totalData == success) {
              message =
                "System has processed processed ( " +
                totalData +
                " ) entries and added them successfully!";
            } else {
              message =
                "System has processed processed ( " +
                totalData +
                " ) entries out of which only ( " +
                success +
                " ) are added and others are failed ( " +
                fail +
                " ) due to validation!";
            }
            return res.status(200).json({
              message: message
            });
          }
        } else {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: "Please Choose valid File!" }
            ]
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
      console.log(
        "[controllers][propertysetup][importCompanyData] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getQuotationAssignedCharges: async (req, res) => {
    try {
      let reqData = req.query;
      let total, rows;

      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;

      let { quotationId } = req.body;


      [total, rows] = await Promise.all([
        knex("charge_master")
          .innerJoin(
            "assigned_service_charges",
            "charge_master.id",
            "assigned_service_charges.chargeId"
          )
          .select([
            "charge_master.chargeCode as chargeCode",
            "charge_master.id as id",
            "charge_master.calculationUnit as calculationUnit",
            "assigned_service_charges.rate as rate",
            "assigned_service_charges.totalHours as totalHours"
          ])
          .where({
            entityId: quotationId,
            entityType: "quotations"
          }),
        knex("charge_master")
          .innerJoin(
            "assigned_service_charges",
            "charge_master.id",
            "assigned_service_charges.chargeId"
          )
          .select([
            "charge_master.chargeCode as chargeCode",
            "charge_master.id as id",
            "charge_master.calculationUnit as calculationUnit",
            "assigned_service_charges.rate as rate",
            "assigned_service_charges.totalHours as totalHours"
          ])
          .where({
            entityId: quotationId,
            entityType: "quotations"
          })
          .offset(offset)
          .limit(per_page)
      ]);


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
          assignedCharges: pagination
        }
      })


    } catch (err) {
      return res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  }
};

module.exports = chargeController;
