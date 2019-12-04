const Joi = require("@hapi/joi");
const moment = require("moment");
const uuidv4 = require("uuid/v4");
var jwt = require("jsonwebtoken");
const _ = require("lodash");
const XLSX = require("xlsx");

const knex = require("../../db/knex");

const bcrypt = require("bcrypt");
const saltRounds = 10;
//const trx = knex.transaction();

const buildingPhaseController = {

  addBuildingPhase: async (req, res) => {
    try {
      let buildingPhase = null;
      let userId = req.me.id;
      let orgId = req.orgId;

      await knex.transaction(async trx => {
        const payload = req.body;

        const schema = Joi.object().keys({
          companyId: Joi.string().required(),
          projectId: Joi.string().required(),
          propertyTypeId: Joi.string().required(),
          buildingPhaseCode: Joi.string().required(),
          description: Joi.string().required(),
          buildingAddressEng: Joi.string().required(),
          buildingAddressThai: Joi.string().required()
        });

        const result = Joi.validate(payload, schema);
        console.log(
          "[controllers][administrationFeatures][addbuildingPhase]: JOi Result",
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
          ...payload,
          orgId: orgId,
          createdBy: userId,
          createdAt: currentTime,
          updatedAt: currentTime
        };

        let insertResult = await knex
          .insert(insertData)
          .returning(["*"])
          .transacting(trx)
          .into("buildings_and_phases");
        buildingPhase = insertResult[0];
        trx.commit;
      });

      return res.status(200).json({
        data: {
          buildingPhase: buildingPhase
        },
        message: "Building Phase added successfully."
      });
    } catch (err) {
      console.log(
        "[controllers][generalsetup][addbuildingPhase] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  updateBuildingPhase: async (req, res) => {
    try {
      let userId = req.me.id;
      let orgId = req.orgId;

      let buildingPhase = null;
      await knex.transaction(async trx => {
        const payload = req.body;

        const schema = Joi.object().keys({
          id: Joi.string().required(),
          companyId: Joi.string().required(),
          projectId: Joi.string().required(),
          propertyTypeId: Joi.string().required(),
          buildingPhaseCode: Joi.string().required(),
          description: Joi.string().required(),
          buildingAddressEng: Joi.string().required(),
          buildingAddressThai: Joi.string().required()
        });

        const result = Joi.validate(payload, schema);
        console.log(
          "[controllers][administrationFeatures][updatebuildingPhase]: JOi Result",
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
        let insertData = { ...payload, createdBy: userId, updatedAt: currentTime };
        let insertResult = await knex
          .update(insertData)
          .where({ id: payload.id, orgId: orgId })
          .returning(["*"])
          .transacting(trx)
          .into("buildings_and_phases");
        buildingPhase = insertResult[0];

        trx.commit;
      });

      return res.status(200).json({
        data: {
          buildingPhase: buildingPhase
        },
        message: "Building Phase details updated successfully."
      });
    } catch (err) {
      console.log(
        "[controllers][generalsetup][updatebuildingPhase] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  viewBuildingPhase: async (req, res) => {
    try {
      let buildingPhase = null;
      await knex.transaction(async trx => {
        let payload = req.body;
        let orgId = req.orgId;

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

        let buildingPhaseResult = await knex("buildings_and_phases")
          .innerJoin("companies", "buildings_and_phases.companyId", "companies.id")
          .innerJoin("projects", "buildings_and_phases.projectId", "projects.id")
          .innerJoin("property_types", "buildings_and_phases.propertyTypeId", "property_types.id")
          .select("buildings_and_phases.*", "companies.companyName as companyName", "companies.companyId as compId", "companies.id as companyId", "projects.projectName", "property_types.propertyTypeCode")
          .where({ "buildings_and_phases.id": payload.id, "building_and_phases.orgId": orgId })


        buildingPhase = _.omit(buildingPhaseResult[0], [
          "buildings_and_phases.createdAt",
          "buildings_and_phases.updatedAt",
          "buildings_and_phases.isActive"
        ]);

        trx.commit;
      });

      return res.status(200).json({
        data: {
          buildingPhase: buildingPhase
        },
        message: "Building Phase details"
      });
    } catch (err) {
      console.log(
        "[controllers][generalsetup][viewbuildingPhase] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  deleteBuildingPhase: async (req, res) => {
    try {
      let buildingPhase = null;
      await knex.transaction(async trx => {
        let payload = req.body;
        let orgId = req.orgId;

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

        let buildingPhaseResult = await knex
          .update({ isActive: false })
          .where({ id: payload.id, orgId: orgId })
          .returning(["*"])
          .transacting(trx)
          .into("buildings_and_phases");
        buildingPhase = buildingPhaseResult[0];
        trx.commit;
      });

      return res.status(200).json({
        data: {
          buildingPhase: buildingPhase
        },
        message: "Building Phase deleted!"
      });
    } catch (err) {
      console.log(
        "[controllers][generalsetup][viewbuildingPhase] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getBuildingPhaseList: async (req, res) => {
    try {
      let orgId = req.orgId;
      let companyId = req.query.companyId;
      let projectId = req.query.projectId;
      let reqData = req.query;
      let pagination = {};

      if (!companyId && !projectId) {
        let per_page = reqData.per_page || 10;
        let page = reqData.current_page || 1;
        if (page < 1) page = 1;
        let offset = (page - 1) * per_page;

        let [total, rows] = await Promise.all([
          knex
            .count("* as count")
            .from("buildings_and_phases")
            .innerJoin(
              "projects",
              "buildings_and_phases.projectId",
              "projects.id"
            )
            .innerJoin(
              "companies",
              "buildings_and_phases.companyId",
              "companies.id"
            )
            .where({ "orgId": orgId, "buildings_and_phases.isActive": true })
            .first(),

          knex("buildings_and_phases")
            .innerJoin(
              "projects",
              "buildings_and_phases.projectId",
              "projects.id"
            )
            .innerJoin(
              "companies",
              "buildings_and_phases.companyId",
              "companies.id"
            )
            .where({ "buildings_and_phases.isActive": true, "orgId": orgId })
            .select([
              "buildings_and_phases.id as id",
              "buildings_and_phases.buildingPhaseCode as Building/Phase",
              "projects.projectName as Project Name",
              "companies.companyName as Company Name",
              "buildings_and_phases.isActive as Status",
              "buildings_and_phases.createdBy as Created By",
              "buildings_and_phases.createdAt as Date Created"
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
      } else if (companyId && !projectId) {
        let per_page = reqData.per_page || 10;
        let page = reqData.current_page || 1;
        if (page < 1) page = 1;
        let offset = (page - 1) * per_page;

        let [total, rows] = await Promise.all([
          knex
            .count("* as count")
            .from("buildings_and_phases")
            .innerJoin(
              "projects",
              "buildings_and_phases.projectId",
              "projects.id"
            )
            .innerJoin(
              "companies",
              "buildings_and_phases.companyId",
              "companies.id"
            )
            .where({ "buildings_and_phases.isActive": true, "orgId": orgId })
            .first(),
          knex("buildings_and_phases")
            .innerJoin(
              "projects",
              "buildings_and_phases.projectId",
              "projects.id"
            )
            .innerJoin(
              "companies",
              "buildings_and_phases.companyId",
              "companies.id"
            )
            .where({ "buildings_and_phases.isActive": true, "orgId": orgId })
            .select([
              "buildings_and_phases.id as id",
              "buildings_and_phases.buildingPhaseCode as Building/Phase",
              "projects.projectName as Project Name",
              "companies.companyName as Company Name",
              "buildings_and_phases.isActive as Status",
              "buildings_and_phases.createdBy as Created By",
              "buildings_and_phases.createdAt as Date Created"
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
      } else if (companyId && projectId) {
        let per_page = reqData.per_page || 10;
        let page = reqData.current_page || 1;
        if (page < 1) page = 1;
        let offset = (page - 1) * per_page;


        let [total, rows] = await Promise.all([
          knex
            .count("* as count")
            .from("buildings_and_phases")
            .innerJoin(
              "projects",
              "buildings_and_phases.projectId",
              "projects.id"
            )
            .innerJoin(
              "companies",
              "buildings_and_phases.companyId",
              "companies.id"
            )
            .where({
              "buildings_and_phases.isActive": true,
              "projects.id": projectId,
              "companies.id": companyId,
              "orgId": orgId
            })
            .first(),
          knex("buildings_and_phases")
            .innerJoin(
              "projects",
              "buildings_and_phases.projectId",
              "projects.id"
            )
            .innerJoin(
              "companies",
              "buildings_and_phases.companyId",
              "companies.id"
            )
            .where({
              "buildings_and_phases.isActive": true,
              "projects.id": projectId,
              "companies.id": companyId,
              "orgId": orgId
            })
            .select([
              "buildings_and_phases.id as id",
              "buildings_and_phases.buildingPhaseCode as Building/Phase",
              "projects.projectName as Project Name",
              "companies.companyName as Company Name",
              "buildings_and_phases.isActive as Status",
              "buildings_and_phases.createdBy as Created By",
              "buildings_and_phases.createdAt as Date Created"
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
      }

      return res.status(200).json({
        data: {
          buildingPhases: pagination
        },
        message: "Building Phases List!"
      });
    } catch (err) {
      console.log(
        "[controllers][generalsetup][viewbuildingPhase] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
    // Export Building Phase Data
  },
  exportBuildingPhase: async (req, res) => {
    try {
      let orgId = req.orgId;
      let companyId = req.query.companyId;
      let reqData = req.query;
      let pagination = {};

      if (!companyId) {
        let per_page = reqData.per_page || 10;
        let page = reqData.current_page || 1;
        if (page < 1) page = 1;
        let offset = (page - 1) * per_page;

        let [total, rows] = await Promise.all([
          knex
            .count("* as count")
            .from("buildings_and_phases")
            .innerJoin(
              "projects",
              "buildings_and_phases.projectId",
              "projects.id"
            )
            .innerJoin(
              "companies",
              "buildings_and_phases.companyId",
              "companies.id"
            )
            .where({ "buildings_and_phases.isActive": true, "orgId": orgId })
            .first(),
          knex("buildings_and_phases")
            .innerJoin(
              "projects",
              "buildings_and_phases.projectId",
              "projects.id"
            )
            .innerJoin(
              "companies",
              "buildings_and_phases.companyId",
              "companies.id"
            )
            .where({ "buildings_and_phases.isActive": true, "orgId": orgId })
            .select([
              "buildings_and_phases.buildingPhaseCode as Building/Phase",
              "projects.projectName as Project Name",
              "companies.companyName as Company Name",
              "buildings_and_phases.isActive as Status",
              "buildings_and_phases.createdBy as Created By",
              "buildings_and_phases.createdAt as Date Created"
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
      } else {
        let per_page = reqData.per_page || 10;
        let page = reqData.current_page || 1;
        if (page < 1) page = 1;
        let offset = (page - 1) * per_page;

        let [total, rows] = await Promise.all([
          knex
            .count("* as count")
            .from("buildings_and_phases")
            .innerJoin(
              "projects",
              "buildings_and_phases.projectId",
              "projects.id"
            )
            .innerJoin(
              "companies",
              "buildings_and_phases.companyId",
              "companies.id"
            )
            .where({ "buildings_and_phases.isActive": true, "orgId": orgId })
            .first(),
          knex("buildings_and_phases")
            .innerJoin(
              "projects",
              "buildings_and_phases.projectId",
              "projects.id"
            )
            .innerJoin(
              "companies",
              "buildings_and_phases.companyId",
              "companies.id"
            )
            .where({ "buildings_and_phases.isActive": true, "orgId": orgId })
            .select([
              "buildings_and_phases.buildingPhaseCode as Building/Phase",
              "projects.projectName as Project Name",
              "companies.companyName as Company Name",
              "buildings_and_phases.isActive as Status",
              "buildings_and_phases.createdBy as Created By",
              "buildings_and_phases.createdAt as Date Created"
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
      }

      var wb = XLSX.utils.book_new({ sheet: "Sheet JS" });
      var ws = XLSX.utils.json_to_sheet(pagination.data);
      XLSX.utils.book_append_sheet(wb, ws, "pres");
      XLSX.write(wb, { bookType: "csv", bookSST: true, type: "base64" });
      let filename = "uploads/BuildingPhaseData-" + Date.now() + ".csv";
      let check = XLSX.writeFile(wb, filename);

      return res.status(200).json({
        data: {
          buildingPhases: pagination.data
        },
        message: "Building Phases Data Export Successfully!"
      });
    } catch (err) {
      console.log(
        "[controllers][generalsetup][viewbuildingPhase] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getBuildingPhaseAllList: async (req, res) => {
    try {
      let projectId = req.query.projectId;
      let orgId = req.orgId;

      let buildingData = {};

      let [rows] = await Promise.all([
        knex("buildings_and_phases")
          .innerJoin(
            "projects",
            "buildings_and_phases.projectId",
            "projects.id"
          )
          .where({
            "buildings_and_phases.isActive": true,
            "buildings_and_phases.projectId": projectId,
            "orgId": orgId
          })
          .select([
            "buildings_and_phases.id as id",
            "buildings_and_phases.buildingPhaseCode"
          ])
      ]);

      buildingData.data = rows;

      return res.status(200).json({
        data: {
          buildingPhases: buildingData
        },
        message: "Building Phases List!"
      });
    } catch (err) {
      console.log(
        "[controllers][generalsetup][viewbuildingPhase] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getBuildingPhaseListByProjectId: async (req, res) => {
    try {
      const { projectId } = req.body;
      let orgId = req.orgId;

      const buildings = await knex('buildings_and_phases').select('*').where({ projectId, orgId: orgId })
      return res.status(200).json({ data: { buildings }, message: 'Buildings list' })
    } catch (err) {
      console.log(
        "[controllers][generalsetup][viewbuildingPhase] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  }
  
};

module.exports = buildingPhaseController;
