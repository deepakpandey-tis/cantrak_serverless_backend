const Joi = require("@hapi/joi");
const _ = require("lodash");

const knex = require("../db/knex");
const XLSX = require("xlsx");
const fs = require("fs");
const request = require("request");
const path = require("path");
const QRCode = require("qrcode");
const uuid = require("uuid/v4");
const moment = require("moment");
const { into } = require("../db/knex");
const assetController = {
  getAssetCategories: async (req, res) => {
    try {
      let categories;
      let filters = req.body;
      if (filters) {
        categories = await knex("asset_category_master")
          .select()
          .where({
            ...filters,
            orgId: req.orgId,
            isActive: true,
          })
          .orderBy(
            "asset_category_master.categoryName",
            "asc"
          );
      } else {
        categories = await knex("asset_category_master")
          .select()
          .where({ orgId: req.orgId, isActive: true })
          .orderBy(
            "asset_category_master.categoryName",
            "asc"
          );
      }
      res.status(200).json({
        data: {
          categories,
          message: "Categories List",
        },
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

  getAssetCategoryById: async (req, res) => {
    try {
      let categories;
      let id = req.body.id;
      // let filters = req.body;
      categories = await knex("asset_category_master")
        .select()
        .where({ id: id, orgId: req.orgId, isActive: true })
        .orderBy(
          "asset_category_master.categoryName",
          "asc"
        );

      res.status(200).json({
        data: {
          categories,
          message: "Category Detail",
        },
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
  addAsset: async (req, res) => {
    try {
      let asset = null;
      let attribs = [];
      let images = [];
      let files = [];
      let locationData;
      let location = null;

      console.log("data for location",req.body)

      await knex.transaction(async (trx) => {
        let assetPayload = req.body;
        console.log(
          "[controllers][asset][payload]: Asset Payload",
          assetPayload
        );
        assetPayload = _.omit(assetPayload, [
          "additionalAttributes",
          "multiple",
          "images",
          "files",
          "assetCategory",
          "vendorId",
          "additionalVendorId",
          "location_data",
        ]);
        // validate keys
        const schema = Joi.object().keys({
          assetName: Joi.string().required(),
          model: Joi.string().required(),
        });

        let result = Joi.validate(
          {
            assetName: assetPayload.assetName,
            model: assetPayload.model,
          },
          schema
        );
        console.log(
          "[controllers][asset][addAsset]: JOi Result",
          result
        );

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

        let category;
        let assetCategoryId;
        let assetCategory = req.body.assetCategory;
        category = await knex
          .select()
          .where({
            categoryName: assetCategory,
            orgId: req.orgId,
          })
          .returning(["*"])
          .transacting(trx)
          .into("asset_category_master");
        if (category && category.length) {
          assetCategoryId = category[0].id;
        } else {
          category = await knex
            .insert({
              categoryName: assetCategory,
              createdAt: currentTime,
              updatedAt: currentTime,
              orgId: req.orgId,
              createdBy: req.me.id,
            })
            .returning(["*"])
            .transacting(trx)
            .into("asset_category_master"); //.where({orgId:})
          assetCategoryId = category[0].id;
        }

        // Insert in asset_master table,

        let insertData = {
          ...assetPayload,
          assetCategoryId,
          createdAt: currentTime,
          updatedAt: currentTime,
          orgId: req.orgId,
          uuid: uuid(),
        };

        console.log(
          "[controllers][asset][addAsset]: Insert Data",
          insertData
        );
        let multiple = 1;
        if (req.body.multiple) {
          multiple = Number(req.body.multiple);
        }
        let data = Array(multiple).fill(insertData);
        let assetResult = await knex
          .insert(data)
          .returning(["*"])
          .transacting(trx)
          .into("asset_master");
        //.where({ orgId: req.orgId });

        asset = assetResult;

        console.log("req.body.locationdata",req.body.location_data)

          if (req.body.location_data) {
            let location_data = req.body.location_data;
            console.log("location data",location_data)

            locationData = await knex              
            .insert({
                assetId : asset[0].id,
                companyId: location_data.companyId,
                projectId: location_data.projectId,
                buildingId: location_data.buildingPhaseId,
                floorId: location_data.floorZoneId,
                unitId: location_data.unitId,
                houseId: location_data.houseId,
                // houseNo : location_data.houseNo,
                createdAt: currentTime,
                updatedAt: currentTime,
                startDate: currentTime,
                orgId: req.orgId,
              })
              .returning(["*"])
              .into("asset_location");
          }
        // Add asset to a location with help of locationId
        let locationTagPayload = {
          entityId: asset[0].id,
          entityType: "asset",
          locationTagId: Number(req.body.locationId),
          createdAt: currentTime,
          updatedAt: currentTime,
          orgId: req.orgId,
        };
        const locationResult = await knex
          .insert(locationTagPayload)
          .returning(["*"])
          .transacting(trx)
          .into("location_tags");
        //.where({ orgId: req.orgId });
        location = locationResult[0];

        let additionalAttributes =
          req.body.additionalAttributes;
        if (
          additionalAttributes &&
          additionalAttributes.length > 0
        ) {
          for (asset of assetResult) {
            for (attribute of additionalAttributes) {
              if (
                attribute.attributeName &&
                attribute.attributeDescription
              ) {
                let finalAttribute = {
                  ...attribute,
                  assetId: asset.id,
                  createdAt: currentTime,
                  updatedAt: currentTime,
                  orgId: req.orgId,
                };
                let d = await knex
                  .insert(finalAttribute)
                  .returning(["*"])
                  .transacting(trx)
                  .into("asset_attributes");
                //.where({ orgId: req.orgId });
                attribs.push(d[0]);
              }
            }
          }
        }

        // Insert images in images table
        let imagesData = req.body.images;
        if (imagesData && imagesData.length > 0) {
          for (asset of assetResult) {
            for (image of imagesData) {
              let d = await knex
                .insert({
                  entityId: asset.id,
                  ...image,
                  entityType: "asset_master",
                  createdAt: currentTime,
                  updatedAt: currentTime,
                  orgId: req.orgId,
                })
                .returning(["*"])
                .transacting(trx)
                .into("images");
              //   .where({ orgId: req.orgId });
              images.push(d[0]);
            }
          }
        }

        // Insert files in files table
        let filesData = req.body.files;
        if (filesData && filesData.length > 0) {
          for (asset of assetResult) {
            for (file of filesData) {
              let d = await knex
                .insert({
                  entityId: asset.id,
                  ...file,
                  entityType: "asset_master",
                  createdAt: currentTime,
                  updatedAt: currentTime,
                  orgId: req.orgId,
                })
                .returning(["*"])
                .transacting(trx)
                .into("files");
              //.where({ orgId: req.orgId });
              files.push(d[0]);
            }
          }
        }

        // Insert Vendors in Assigned vendors table
        let vendorsPData = req.body.vendorId;
        let vendorsADData = req.body.additionalVendorId;
        if (vendorsPData || vendorsADData) {
          // Insert Primary Vendor Data
          if (vendorsPData) {
            let finalVendors = {
              entityId: asset.id,
              entityType: "assets",
              isPrimaryVendor: true,
              userId: vendorsPData,
              createdAt: currentTime,
              updatedAt: currentTime,
              orgId: req.orgId,
            };
            let d = await knex
              .insert(finalVendors)
              .returning(["*"])
              .transacting(trx)
              .into("assigned_vendors");
            //.where({ orgId: req.orgId });
          }
          // Insert Secondry Vendor Data
          if (vendorsADData) {
            let finalADVendors = {
              entityId: asset.id,
              userId: vendorsADData,
              entityType: "assets",
              isPrimaryVendor: false,
              createdAt: currentTime,
              updatedAt: currentTime,
              orgId: req.orgId,
            };
            let d = await knex
              .insert(finalADVendors)
              .returning(["*"])
              .transacting(trx)
              .into("assigned_vendors");
            //.where({ orgId: req.orgId });
          }
          
        }

        trx.commit;
      });

      attribs = _.uniqBy(attribs, "attributeName");

      const update = await knex("asset_master")
        .update({ isActive: true })
        .where({ orgId: req.orgId, isActive: true })
        .returning(["*"]);

      res.status(200).json({
        data: {
          asset: {
            ...asset,
            attributes: attribs,
            images,
            files,
            location,
            locationData
          },
        },
        message: "Asset added successfully !",
      });
    } catch (err) {
      console.log(
        "[controllers][asset][addAsset] :  Error",
        err
      );
      //trx.rollback
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
  getAllAssetList: async (req, res) => {
    try {
      const assets = await knex("asset_master")
        .select("id", "assetName", "model")
        .where({ orgId: req.orgId });
      return res.status(200).json({
        data: {
          assets,
        },
        message: "All assets list",
      });
    } catch (err) {
      console.log(
        "[controllers][asset][addAsset] :  Error",
        err
      );
      //trx.rollback
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

  getAssetList: async (req, res) => {
    // name, model, area, category
    try {
      let projectIds = req.accessibleProjects;
      console.log("ProjectIds:", projectIds);

      let companyResult = await knex
        .from("projects")
        .select([
          "companyId",
          "projectName",
          "project as projectCode",
        ])
        .whereIn("projects.id", projectIds)
        .where({ orgId: req.orgId });

      let companyIds = companyResult.map(
        (v) => v.companyId
      );

      companyIds = _.uniqBy(companyIds);

      let reqData = req.query;

      //let filters = {}
      let total, rows, rowsWithPm;
      let {
        assetName,
        assetModel,
        assetSerial,
        category,
        company,
        project,
        asNo,
        assetCode,
      } = req.body;
      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;

      try {
        [total, rows] = await Promise.all([
          knex
            .count("* as count")
            .from("asset_master")
            .leftJoin(
              "asset_category_master",
              "asset_master.assetCategoryId",
              "asset_category_master.id"
            )
            .leftJoin(
              "companies",
              "asset_master.companyId",
              "companies.id"
            )
            .leftJoin(
              "projects",
              "asset_master.projectId",
              "projects.id"
            )

            .where((qb) => {
              if (assetName) {
                qb.where(
                  "asset_master.assetName",
                  "iLIKE",
                  `%${assetName}%`
                );
              }

              if (assetSerial) {
                qb.where(
                  "asset_master.assetSerial",
                  "iLIKE",
                  `%${assetSerial}%`
                );
              }
              if (assetModel) {
                qb.where(
                  "asset_master.model",
                  "iLIKE",
                  `%${assetModel}%`
                );
              }
              if (assetCode) {
                qb.where(
                  "asset_master.assetCode",
                  "iLIKE",
                  `%${assetCode}%`
                );
              }
              if (category) {
                qb.where(
                  "asset_category_master.categoryName",
                  "iLIKE",
                  `%${category}%`
                );
              }
              if (asNo) {
                qb.where("asset_master.displayId", asNo);
              }
              if (company) {
                qb.where("asset_master.companyId", company);
              }
              if (project) {
                qb.where("asset_master.projectId", project);
              }
            })
            .whereIn("asset_master.companyId", companyIds)
            .first()
            .where({ "asset_master.orgId": req.orgId }),

          knex("asset_master")
            .leftJoin(
              "asset_category_master",
              "asset_master.assetCategoryId",
              "asset_category_master.id"
            )
            .leftJoin(
              "companies",
              "asset_master.companyId",
              "companies.id"
            )
            .leftJoin(
              "projects",
              "asset_master.projectId",
              "projects.id"
            )

            .select([
              "asset_master.assetName as Name",
              "asset_master.id as ID",
              // "location_tags_master.title as Location",
              "asset_master.model as Model",
              "asset_master.barcode as Barcode",
              "asset_master.assetSerial as assetSerial",
              "asset_master.areaName as Area",
              "asset_category_master.categoryName as Category",
              "asset_master.createdAt as Date Created",
              "asset_master.unitOfMeasure as Unit Of Measure",
              "asset_master.price as Price",
              "companies.companyName",
              "companies.companyId",
              "projects.project",
              "projects.projectName",
              "asset_master.displayId as AsNo",
              "asset_master.assetCode",
              "asset_master.isEngaged",
            ])
            .where({ "asset_master.orgId": req.orgId })
            .where((qb) => {
              if (assetName) {
                qb.where(
                  "asset_master.assetName",
                  "iLIKE",
                  `%${assetName}%`
                );
              }
              if (assetSerial) {
                qb.where(
                  "asset_master.assetSerial",
                  "iLIKE",
                  `%${assetSerial}%`
                );
              }
              if (assetModel) {
                qb.where(
                  "asset_master.model",
                  "iLIKE",
                  `%${assetModel}%`
                );
              }
              if (assetCode) {
                qb.where(
                  "asset_master.assetCode",
                  "iLIKE",
                  `%${assetCode}%`
                );
              }
              if (category) {
                qb.where(
                  "asset_category_master.categoryName",
                  "iLIKE",
                  `%${category}%`
                );
              }
              if (asNo) {
                qb.where("asset_master.displayId", asNo);
              }
              if (company) {
                qb.where("asset_master.companyId", company);
              }
              if (project) {
                qb.where("asset_master.projectId", project);
              }
            })
            .whereIn("asset_master.companyId", companyIds)
            .orderBy("asset_master.id", "desc")
            .offset(offset)
            .limit(per_page),
        ]);
      } catch (e) {
        // Error
        console.log("Error: " + e.message);
      }
      //}

      let count = total.count;
      pagination.total = count;
      pagination.per_page = per_page;
      pagination.offset = offset;
      pagination.to = offset + rows.length;
      pagination.last_page = Math.ceil(count / per_page);
      pagination.current_page = page;
      pagination.from = offset;
      pagination.data = rows;

      const Parallel = require("async-parallel");

      pagination.data = await Parallel.map(
        rows,
        async (pd) => {
          let houseResult = await knex
            .from("asset_location")
            .leftJoin(
              "property_units",
              "asset_location.unitId",
              "property_units.id"
            )
            .select([
              "property_units.unitNumber",
              "property_units.houseId",
              "property_units.description",
              "asset_location.id as locationId",
            ])
            .where({ "asset_location.assetId": pd.ID })
            .first()
            .orderBy("asset_location.id", "desc");

          if (houseResult) {
            return {
              ...pd,
              unitNumber: houseResult.unitNumber,
              unitDescription: houseResult.description,
            };
          } else {
            return {
              ...pd,
              unitNumber: "",
              unitDescription: "",
            };
          }
        }
      );

      pagination.data = await Parallel.map(
        pagination.data,
        async (pd) => {
          let assetAssignedPm = await knex
            .from("task_group_schedule_assign_assets")
            .leftJoin(
              "asset_location",
              "task_group_schedule_assign_assets.assetId",
              "asset_location.assetId"
            )
            .leftJoin(
              "task_group_schedule",
              "task_group_schedule_assign_assets.scheduleId",
              "task_group_schedule.id"
            )
            .leftJoin(
              "pm_master2",
              "task_group_schedule.pmId",
              "pm_master2.id"
            )
            .select([
              "pm_master2.name as pmName",
              "pm_master2.id as pmId",
            ])
            .where({
              "task_group_schedule_assign_assets.assetId":
                pd.ID,
              "pm_master2.isActive": true,
            });
          // .where('asset_location.id',pd.locationId)
          // .limit(1)
          // .first()
          let pmName = [];
          assetAssignedPm = _.uniqBy(
            assetAssignedPm,
            "pmId"
          );

          assetAssignedPm = assetAssignedPm.map((d) => {
            return d.pmName;
          });
          console.log(
            "PM data for assets=====>>>>>",
            assetAssignedPm
          );
          pmName.push(assetAssignedPm);

          return { ...pd, ...pmName };
        }
      );

      // console.log("pagination data====>>>>>", pagination)
      return res.status(200).json({
        data: {
          asset: pagination,
          companyIds,
          companyResult,
          projectIds,
        },
        message: "Asset List!",
      });
    } catch (err) {
      console.log(
        "[controllers][asset][getAssets] :  Error",
        err
      );
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
  getAssetListByCategory: async (req, res) => {
    try {
      let reqData = req.query;
      let total, rows, rowsId;
      let {
        assetCategoryId,
        companyId,
        projectId,
        assetName,
        assetModel,
        assetSerial,
        assetCode,
        floorZone,
        floorZoneCode,
        unitNumber,
        locationId,
        building,
        assetId,
      } = req.body;
      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;

      //let filters = { assetCategoryId}

      // validate keys
      const schema = Joi.object().keys({
        assetCategoryId: Joi.number().required(),
        companyId: Joi.number().required(),
        assetName: Joi.string()
          .allow("")
          .allow(null)
          .optional(),
        assetModel: Joi.string()
          .allow("")
          .allow(null)
          .optional(),
        assetSerial: Joi.string()
          .allow("")
          .allow(null)
          .optional(),
        assetCode: Joi.string()
          .allow("")
          .allow(null)
          .optional(),
      });

      let result = Joi.validate(
        {
          assetCategoryId,
          companyId,
          assetName,
          assetModel,
          assetSerial,
          assetCode,
        },
        schema
      );
      console.log(
        "[controllers][asset][addAsset]: JOi Result",
        result
      );

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

      if (
        (building && building.length > 0) ||
        (floorZone && floorZone.length > 0) ||
        (floorZoneCode && floorZoneCode.length > 0) ||
        (unitNumber && unitNumber.length > 0) ||
        (locationId && locationId.length > 0)
      ) {
        [total, rows, rowsId] = await Promise.all([
          knex
            .count("* as count")
            .from("asset_master")
            .leftJoin(
              "asset_location",
              "asset_master.id",
              "asset_location.assetId"
            )
            .innerJoin(
              "companies",
              "asset_location.companyId",
              "companies.id"
            )
            .leftJoin(
              "projects",
              "asset_location.projectId",
              "projects.id"
            )
            .leftJoin(
              "buildings_and_phases",
              "asset_location.buildingId",
              "buildings_and_phases.id"
            )
            .leftJoin(
              "floor_and_zones",
              "asset_location.floorId",
              "floor_and_zones.id"
            )
            .leftJoin(
              "property_units",
              "asset_location.unitId",
              "property_units.id"
            )
            .where({
              "asset_master.assetCategoryId": assetCategoryId,
              "asset_location.companyId": companyId,
            })
            .first()
            .where({ "asset_master.orgId": req.orgId })
            .where("asset_location.endDate", null)
            .where((qb) => {
              if (building && building.length > 0) {
                qb.whereIn(
                  "buildings_and_phases.id",
                  building
                );
              }

              if (floorZone && floorZone.length > 0) {
                qb.whereIn(
                  "asset_location.floorId",
                  floorZone
                );
              }
              if (
                floorZoneCode &&
                floorZoneCode.length > 0
              ) {
                qb.whereIn(
                  "floor_and_zones.floorZoneCode",
                  floorZoneCode
                );
              }

              if (unitNumber && unitNumber.length > 0) {
                qb.whereIn(
                  "property_units.unitNumber",
                  unitNumber
                );
              }

              if (locationId && locationId.length > 0) {
                qb.whereIn("asset_location.id", locationId);
              }
              if (assetName) {
                console.log("asset name", assetName);
                qb.where(
                  "asset_master.assetName",
                  "iLIKE",
                  `%${assetName}%`
                );
              }
              if (assetSerial) {
                qb.where(
                  "asset_master.assetSerial",
                  "iLIKE",
                  `%${assetSerial}%`
                );
              }
              if (assetModel) {
                qb.where(
                  "asset_master.model",
                  "iLIKE",
                  `%${assetModel}%`
                );
              }
              if (assetCode) {
                qb.where(
                  "asset_master.assetCode",
                  "iLIKE",
                  `%${assetCode}%`
                );
              }
              if (assetId) {
                qb.whereIn("asset_master.id", assetId);
              }
            }),

          knex("asset_master")
            .leftJoin(
              "asset_location",
              "asset_master.id",
              "asset_location.assetId"
            )
            .innerJoin(
              "companies",
              "asset_location.companyId",
              "companies.id"
            )
            .leftJoin(
              "projects",
              "asset_location.projectId",
              "projects.id"
            )
            .leftJoin(
              "buildings_and_phases",
              "asset_location.buildingId",
              "buildings_and_phases.id"
            )
            .leftJoin(
              "floor_and_zones",
              "asset_location.floorId",
              "floor_and_zones.id"
            )
            .leftJoin(
              "property_units",
              "asset_location.unitId",
              "property_units.id"
            )
            .select([
              "asset_master.id",
              "asset_master.assetCode",
              "asset_master.assetName",
              "asset_master.model",
              "asset_master.barcode",
              "asset_master.areaName",
              "assetSerial",
              "asset_master.isEngaged",
              "asset_location.id as locationId",
              "companies.companyName",
              "projects.projectName",
              "buildings_and_phases.buildingPhaseCode",
              "buildings_and_phases.description as building",
              "floor_and_zones.floorZoneCode",
              "property_units.unitNumber",
            ])
            .where({
              "asset_master.assetCategoryId": assetCategoryId,
              "asset_location.companyId": companyId,
            })
            .offset(offset)
            .limit(per_page)
            .where("asset_location.endDate", null)
            .where({ "asset_master.orgId": req.orgId })
            .where((qb) => {
              if (building && building.length > 0) {
                qb.whereIn(
                  "buildings_and_phases.id",
                  building
                );
              }

              if (floorZone && floorZone.length > 0) {
                qb.whereIn(
                  "asset_location.floorId",
                  floorZone
                );
              }

              if (
                floorZoneCode &&
                floorZoneCode.length > 0
              ) {
                qb.whereIn(
                  "floor_and_zones.floorZoneCode",
                  floorZoneCode
                );
              }
              if (unitNumber && unitNumber.length > 0) {
                qb.whereIn(
                  "property_units.unitNumber",
                  unitNumber
                );
              }

              if (locationId && locationId.length > 0) {
                console.log(
                  "location id ======>>>>>",
                  locationId
                );
                qb.whereIn("asset_location.id", locationId);
              }
              if (assetName) {
                qb.where(
                  "asset_master.assetName",
                  "iLIKE",
                  `%${assetName}%`
                );
              }
              if (assetSerial) {
                qb.where(
                  "asset_master.assetSerial",
                  "iLIKE",
                  `%${assetSerial}%`
                );
              }
              if (assetModel) {
                qb.where(
                  "asset_master.model",
                  "iLIKE",
                  `%${assetModel}%`
                );
              }
              if (assetCode) {
                qb.where(
                  "asset_master.assetCode",
                  "iLIKE",
                  `%${assetCode}%`
                );
              }
              if (assetId) {
                qb.whereIn("asset_master.id", assetId);
              }
            }),

          knex("asset_master")
            .leftJoin(
              "asset_location",
              "asset_master.id",
              "asset_location.assetId"
            )
            .innerJoin(
              "companies",
              "asset_location.companyId",
              "companies.id"
            )
            .leftJoin(
              "projects",
              "asset_location.projectId",
              "projects.id"
            )
            .leftJoin(
              "buildings_and_phases",
              "asset_location.buildingId",
              "buildings_and_phases.id"
            )
            .leftJoin(
              "floor_and_zones",
              "asset_location.floorId",
              "floor_and_zones.id"
            )
            .leftJoin(
              "property_units",
              "asset_location.unitId",
              "property_units.id"
            )
            .select([
              "asset_master.id",
              "asset_master.assetName",
              "asset_master.assetSerial",
              "asset_location.id as locationId",
              "floor_and_zones.floorZoneCode",
              "property_units.unitNumber",
            ])
            .where({
              "asset_master.assetCategoryId": assetCategoryId,
              "asset_location.companyId": companyId,
            })
            .where("asset_location.endDate", null)
            .where({ "asset_master.orgId": req.orgId })
            .where((qb) => {
              if (building && building.length > 0) {
                qb.whereIn(
                  "buildings_and_phases.id",
                  building
                );
              }
              if (floorZone && floorZone.length > 0) {
                qb.whereIn(
                  "asset_location.floorId",
                  floorZone
                );
              }
              if (
                floorZoneCode &&
                floorZoneCode.length > 0
              ) {
                qb.whereIn(
                  "floor_and_zones.floorZoneCode",
                  floorZoneCode
                );
              }
              if (unitNumber && unitNumber.length > 0) {
                qb.whereIn(
                  "property_units.unitNumber",
                  unitNumber
                );
              }
              if (locationId && locationId.length > 0) {
                qb.whereIn("asset_location.id", locationId);
              }
              if (assetName) {
                qb.where(
                  "asset_master.assetName",
                  "iLIKE",
                  `%${assetName}%`
                );
              }
              if (assetSerial) {
                qb.where(
                  "asset_master.assetSerial",
                  "iLIKE",
                  `%${assetSerial}%`
                );
              }
              if (assetModel) {
                qb.where(
                  "asset_master.model",
                  "iLIKE",
                  `%${assetModel}%`
                );
              }
              if (assetCode) {
                qb.where(
                  "asset_master.assetCode",
                  "iLIKE",
                  `%${assetCode}%`
                );
              }
              if (assetId) {
                qb.whereIn("asset_master.id", assetId);
              }
            }),
        ]);

        console.log("if building called======>>>>");
        const Parallel = require("async-parallel");
        const rowsWithSelectedAssets = await Parallel.map(
          rows,
          async (row) => {
            let pm = await knex(
              "task_group_schedule_assign_assets"
            )
              .leftJoin(
                "asset_location",
                "task_group_schedule_assign_assets.assetId",
                "asset_location.assetId"
              )
              .leftJoin(
                "task_group_schedule",
                "task_group_schedule_assign_assets.scheduleId",
                "task_group_schedule.id"
              )
              .leftJoin(
                "pm_master2",
                "task_group_schedule.pmId",
                "pm_master2.id"
              )
              .select(["pm_master2.name as pmName"])
              // .where('pm_master2.isActive',)
              .where({
                "task_group_schedule_assign_assets.assetId":
                  row.id,
                "pm_master2.isActive": true,
                "asset_location.id": row.locationId,
              });
            // .where('asset_location.id',row.locationId)
            // .limit(1)
            // .first()
            let pmName = [];
            pm = _.uniqBy(pm, "PmId");
            pm = pm.map((d) => {
              return d.pmName;
            });
            pmName.push(pm);
            console.log("pm data=====>>>>", pmName);
            return { ...row, ...pmName };
          }
        );
        console.log(
          "Value of rows Id=======>>>>>>",
          rowsId
        );
        let count = total.count;
        pagination.total = count;
        pagination.per_page = per_page;
        pagination.offset = offset;
        pagination.to =
          offset + rowsWithSelectedAssets.length;
        // pagination.to = offset + rowsWithLocations.length;
        pagination.last_page = Math.ceil(count / per_page);
        pagination.current_page = page;
        pagination.from = offset;
        // pagination.data = rows;
        pagination.data = rowsWithSelectedAssets;
        // pagination.totalId = rowsIdWithLocations
        pagination.totalId = rowsId;
      } else {
        [total, rows, rowsId] = await Promise.all([
          knex
            .count("* as count")
            .from("asset_master")
            .where({
              "asset_master.assetCategoryId": assetCategoryId,
              "asset_master.companyId": companyId,
            })
            .first()
            .where({ "asset_master.orgId": req.orgId })
            // .where('asset_location.endDate', null)
            .where((qb) => {
              if (assetName) {
                qb.where(
                  "asset_master.assetName",
                  "iLIKE",
                  `%${assetName}%`
                );
              }
              if (assetSerial) {
                qb.where(
                  "asset_master.assetSerial",
                  "iLIKE",
                  `%${assetSerial}%`
                );
              }
              if (assetModel) {
                qb.where(
                  "asset_master.model",
                  "iLIKE",
                  `%${assetModel}%`
                );
              }
              if (assetCode) {
                qb.where(
                  "asset_master.assetCode",
                  "iLIKE",
                  `%${assetCode}%`
                );
              }
              if (assetId) {
                qb.whereIn("asset_master.id", assetId);
              }
            }),

          knex("asset_master")
            .select([
              "asset_master.id",
              "asset_master.assetCode",
              "asset_master.assetName",
              "asset_master.model",
              "asset_master.barcode",
              "asset_master.areaName",
              "assetSerial",
              "asset_master.isEngaged",
            ])

            .where({
              "asset_master.assetCategoryId": assetCategoryId,
              "asset_master.companyId": companyId,
            })
            .offset(offset)
            .limit(per_page)
            .where({ "asset_master.orgId": req.orgId })
            // .where('asset_location.endDate', null)
            .where((qb) => {
              if (assetName) {
                qb.where(
                  "asset_master.assetName",
                  "iLIKE",
                  `%${assetName}%`
                );
              }
              if (assetSerial) {
                qb.where(
                  "asset_master.assetSerial",
                  "iLIKE",
                  `%${assetSerial}%`
                );
              }
              if (assetModel) {
                qb.where(
                  "asset_master.model",
                  "iLIKE",
                  `%${assetModel}%`
                );
              }
              if (assetCode) {
                qb.where(
                  "asset_master.assetCode",
                  "iLIKE",
                  `%${assetCode}%`
                );
              }

              if (assetId) {
                qb.whereIn("asset_master.id", assetId);
              }
            }),
          knex("asset_master")
            .select([
              "asset_master.id",
              "asset_master.assetName",
              "asset_master.assetSerial",
            ])
            .where({
              "asset_master.assetCategoryId": assetCategoryId,
              "asset_master.companyId": companyId,
            })
            .where({ "asset_master.orgId": req.orgId })
            // .where('asset_location.endDate', null)
            .where((qb) => {
              if (assetName) {
                qb.where(
                  "asset_master.assetName",
                  "iLIKE",
                  `%${assetName}%`
                );
              }
              if (assetSerial) {
                qb.where(
                  "asset_master.assetSerial",
                  "iLIKE",
                  `%${assetSerial}%`
                );
              }
              if (assetModel) {
                qb.where(
                  "asset_master.model",
                  "iLIKE",
                  `%${assetModel}%`
                );
              }
              if (assetCode) {
                qb.where(
                  "asset_master.assetCode",
                  "iLIKE",
                  `%${assetCode}%`
                );
              }
              if (assetId) {
                qb.whereIn("asset_master.id", assetId);
              }
            }),
        ]);

        const Parallel = require("async-parallel");
        const rowsWithLocations = await Parallel.map(
          rows,
          async (row) => {
            const location = await knex("asset_location")
              .innerJoin(
                "companies",
                "asset_location.companyId",
                "companies.id"
              )
              .leftJoin(
                "projects",
                "asset_location.projectId",
                "projects.id"
              )
              .leftJoin(
                "buildings_and_phases",
                "asset_location.buildingId",
                "buildings_and_phases.id"
              )
              .leftJoin(
                "floor_and_zones",
                "asset_location.floorId",
                "floor_and_zones.id"
              )
              .leftJoin(
                "property_units",
                "asset_location.unitId",
                "property_units.id"
              )
              .select([
                "companies.companyName",
                "projects.projectName",
                "buildings_and_phases.buildingPhaseCode",
                "buildings_and_phases.description as building",
                "floor_and_zones.floorZoneCode",
                "property_units.unitNumber",
                "asset_location.id as locationId",
                // 'asset_location.isSelected',
              ])
              .where({ "asset_location.assetId": row.id })
              // .where(qb => {
              //     if (building && building.length) {
              //         qb.where('buildings_and_phases.id', building)
              //     }

              //     if (floorZone && floorZone.length) {
              //         qb.where('floor_and_zones.id', floorZone)
              //     }
              // })
              .orderBy("asset_location.id", "desc")
              .limit(1)
              .first();
            // ]).max('asset_location.updatedAt').first()
            return { ...row, ...location };
          }
        );

        const rowsIdWithLocations = await Parallel.map(
          rowsId,
          async (row) => {
            const location = await knex("asset_location")
              .innerJoin(
                "companies",
                "asset_location.companyId",
                "companies.id"
              )
              .leftJoin(
                "projects",
                "asset_location.projectId",
                "projects.id"
              )
              .leftJoin(
                "buildings_and_phases",
                "asset_location.buildingId",
                "buildings_and_phases.id"
              )
              .leftJoin(
                "floor_and_zones",
                "asset_location.floorId",
                "floor_and_zones.id"
              )
              .leftJoin(
                "property_units",
                "asset_location.unitId",
                "property_units.id"
              )
              .select([
                "floor_and_zones.floorZoneCode",
                "property_units.unitNumber",
                "asset_location.id as locationId",
              ])
              .where({ "asset_location.assetId": row.id })
              // .where(qb => {
              //     if (building) {
              //         qb.where('buildings_and_phases.id', building)
              //     }

              //     if (floorZone) {
              //         qb.where('floor_and_zones.id', floorZone)
              //     }
              // })
              .orderBy("asset_location.id", "desc")
              .limit(1)
              .first();

            return { ...row, ...location };
          }
        );

        const rowsWithSelectedAssets = await Parallel.map(
          rowsWithLocations,
          async (row) => {
            let pm = await knex(
              "task_group_schedule_assign_assets"
            )
              .leftJoin(
                "asset_location",
                "task_group_schedule_assign_assets.assetId",
                "asset_location.assetId"
              )
              .leftJoin(
                "task_group_schedule",
                "task_group_schedule_assign_assets.scheduleId",
                "task_group_schedule.id"
              )
              .leftJoin(
                "pm_master2",
                "task_group_schedule.pmId",
                "pm_master2.id"
              )
              .select([
                "pm_master2.name as pmName",
                "pm_master2.id as PmId",
              ])
              .where({
                "task_group_schedule_assign_assets.assetId":
                  row.id,
                "asset_location.id": row.locationId,
                "pm_master2.isActive": true,
              });
            // .where('asset_location.id',row.locationId)
            // .limit(1)
            // .first()
            let pmName = [];
            pm = _.uniqBy(pm, "PmId");
            pm = pm.map((d) => {
              return d.pmName;
            });
            pmName.push(pm);
            console.log("pm data=====>>>>", pmName);
            return { ...row, ...pmName };
          }
        );

        let count = total.count;
        pagination.total = count;
        pagination.per_page = per_page;
        pagination.offset = offset;
        pagination.to =
          offset + rowsWithSelectedAssets.length;
        pagination.last_page = Math.ceil(count / per_page);
        pagination.current_page = page;
        pagination.from = offset;
        pagination.data = rowsWithSelectedAssets;
        pagination.totalId = rowsIdWithLocations;
      }

      return res.status(200).json({
        data: {
          asset: pagination,
          // totalId:rowsId
        },
        message: "Asset List!",
      });
    } catch (err) {
      console.log(
        "[controllers][asset][getAssets] :  Error",
        err
      );
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
  getAssetDetails1111: async (req, res) => {
    try {
      let assetData = null;
      let additionalAttributes = null;
      let files = null;
      let images = null;
      let id = req.body.id;
      let qrcode = "";

      qrcode = await QRCode.toDataURL(
        "org-" + req.orgId + "-asset-" + id
      );

      assetData = await knex("asset_master")
        .where({ "asset_master.id": id })
        .leftJoin(
          "asset_category_master",
          "asset_master.assetCategoryId",
          "asset_category_master.id"
        )
        //.leftJoin('part_master','asset_master.partId','part_master.id')
        //.leftJoin('vendor_master','asset_master.assignedVendors','vendor_master.id')
        //.leftJoin('companies','asset_master.companyId','companies.id')
        .select([
          "asset_master.*",
          "asset_category_master.categoryName",
          //  'part_master.partCode',
          //'part_master.partName'
          //  'vendor_master.name as assignedVendor'
        ])
        .first();
      let assetDataResult = assetData;

      // Get part data
      let partData = null;
      console.log(
        "*(&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&",
        assetDataResult
      );
      if (
        assetDataResult &&
        assetDataResult.partId &&
        assetDataResult.partId == ""
      ) {
        partData = await knex("part_master")
          .select("*")
          .where({ id: assetDataResult.partId })
          .first();
      }

      let team;
      let user;
      if (
        assetDataResult.assignedTeams &&
        assetDataResult.assignedUsers
      ) {
        team = await knex("teams")
          .select("teamName")
          .where({ teamId: assetDataResult.assignedTeams })
          .first();
        user = await knex("users")
          .select("name")
          .where({ id: assetDataResult.assignedUsers })
          .first();
      }

      // let assetData = null;
      // assetData = await knex.select().from('asset_master')

      // console.log('[controllers][asset][getAssetList]: Asset List', assetData);

      // assetData = assetData.map(d => _.omit(d, ['createdAt'], ['updatedAt'], ['isActive']));

      // res.status(200).json({
      //     data: assetData,
      //     message: "Asset List"
      // });
    } catch (err) {
      console.log(
        "[controllers][asset][getAssets] :  Error",
        err
      );
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
  getAssetDetails: async (req, res) => {
    try {
      let assetData = null;
      let additionalAttributes = null;
      let files = null;
      let images = null;
      let id = req.body.id;
      let qrcode = "";

      qrcode = await QRCode.toDataURL(
        "org-" + req.orgId + "-asset-" + id
      );

      assetData = await knex("asset_master")
        .where({ "asset_master.id": id })
        .leftJoin(
          "asset_category_master",
          "asset_master.assetCategoryId",
          "asset_category_master.id"
        )
        .leftJoin(
          "asset_master as pA",
          "asset_master.parentAssetId",
          "pA.id"
        )
        //.leftJoin('part_master','asset_master.partId','part_master.id')
        //.leftJoin('vendor_master','asset_master.assignedVendors','vendor_master.id')
        //.leftJoin('companies','asset_master.companyId','companies.id')
        .select([
          "asset_master.*",
          "asset_category_master.categoryName",
          "pA.displayId as parentNo",
          //  'part_master.partCode',
          //'part_master.partName'
          //  'vendor_master.name as assignedVendor'
        ]);
      let assetDataResult = assetData[0];

      // Get part data
      let partData = null;
      if (assetDataResult && assetDataResult.partId) {
        partData = await knex("part_master")
          .select("*")
          .where({ id: assetDataResult.partId })
          .first();
      }

      let team;
      let user;
      if (
        assetDataResult.assignedTeams &&
        assetDataResult.assignedUsers
      ) {
        team = await knex("teams")
          .select("teamName")
          .where({ teamId: assetDataResult.assignedTeams })
          .first();
        user = await knex("users")
          .select("name")
          .where({ id: assetDataResult.assignedUsers })
          .first();
      }

      let omitedAssetDataResult = _.omit(
        assetDataResult,
        ["createdAt"],
        ["updatedAt"],
        ["isActive"]
      );
      additionalAttributes = await knex("asset_attributes")
        .where({ assetId: id, orgId: req.orgId })
        .select();
      //   .where({  });

      files = await knex("files")
        .where({
          entityId: id,
          entityType: "asset_master",
          orgId: req.orgId,
        })
        .select();
      //   .where({ orgId: req.orgId });
      images = await knex("images")
        .where({
          entityId: id,
          entityType: "asset_master",
          orgId: req.orgId,
        })
        .select();
      //   .where({ orgId: req.orgId });

      console.log(
        "[controllers][asset][getAssetDetails]: Asset Details",
        assetData
      );
      // Get asset location
      const assetLocation = await knex("asset_location")
        .leftJoin(
          "companies",
          "asset_location.companyId",
          "companies.id"
        )
        .leftJoin(
          "projects",
          "asset_location.projectId",
          "projects.id"
        )
        .leftJoin(
          "buildings_and_phases",
          "asset_location.buildingId",
          "buildings_and_phases.id"
        )
        .leftJoin(
          "floor_and_zones",
          "asset_location.floorId",
          "floor_and_zones.id"
        )
        .leftJoin(
          "property_units",
          "asset_location.unitId",
          "property_units.id"
        )
        // .leftJoin(
        //   'property_units',
        //   'asset_location.commonAreaId',
        //   'property_units.id'
        // )
        .select([
          "companies.companyName as companyName",
          "projects.projectName as projectName",
          "buildings_and_phases.description as building",
          "buildings_and_phases.buildingPhaseCode as buildingPhaseCode",
          "floor_and_zones.description as floorZone",
          "floor_and_zones.floorZoneCode as floorZoneCode",
          "property_units.description as propertyUnit",
          "companies.id as companyId",
          "projects.id as projectId",
          "buildings_and_phases.id as buildingId",
          "floor_and_zones.id as floorId",
          "property_units.id as unitId",
          "property_units.unitNumber",
          "property_units.id as commonAreaId",
          "property_units.type as type",
          "property_units.unitNumber as commonAreaCode",
          "asset_location.startDate as startDate",
          "asset_location.endDate as endDate",
          "asset_location.id as assetLocationId",
          "asset_location.houseId as houseId",
          "companies.companyId as companyCode",
          "projects.project as projectCode",
        ])
        .where({
          assetId: id,
          "asset_location.orgId": req.orgId,
        })
        .orderBy("asset_location.startDate", "desc");
      //   .where({ orgId: req.orgId });

      // Get all service orders
      const service_orders = await knex("assigned_assets")
        .leftJoin(
          "service_requests",
          "assigned_assets.entityId",
          "service_requests.id"
        )
        .leftJoin(
          "service_orders",
          "service_requests.id",
          "service_orders.serviceRequestId"
        )
        .leftJoin(
          "service_problems",
          "service_requests.id",
          "service_problems.serviceRequestId"
        )
        .leftJoin(
          "incident_categories",
          "service_problems.categoryId",
          "incident_categories.id"
        )
        .leftJoin(
          "assigned_service_team",
          "service_requests.id",
          "assigned_service_team.entityId"
        )
        .leftJoin(
          "users",
          "assigned_service_team.userId",
          "users.id"
        )
        .leftJoin(
          "service_status AS status",
          "service_requests.serviceStatusCode",
          "status.statusCode"
        )
        .leftJoin(
          "users AS u",
          "service_requests.createdBy",
          "u.id"
        )
        .leftJoin(
          "teams",
          "assigned_service_team.teamId",
          "teams.teamId"
        )
        .leftJoin(
          "property_units",
          "service_requests.houseId",
          "property_units.id"
        )
        .leftJoin(
          "buildings_and_phases",
          "property_units.buildingPhaseId",
          "buildings_and_phases.id"
        )
        .leftJoin(
          "requested_by",
          "service_requests.requestedBy",
          "requested_by.id"
        )

        .select([
          "service_orders.id as So Id",
          "service_requests.description as Description",
          "service_requests.location as Location",
          "service_requests.id as Sr Id",
          "incident_categories.descriptionEng as Problem",
          "priority as Priority",
          "orderDueDate as Due Date",
          "u.name as Created By",
          "status.descriptionEng as Status",
          "service_orders.createdAt as Date Created",
          "service_requests.houseId as houseId",
          "buildings_and_phases.description as Building Name",
          "users.userName as Assigned Main User",
          "teams.teamName as Team Name",
          "requested_by.name as Requested By",
          "property_units.unitNumber as Unit Number",
          "service_requests.displayId as srDisplayId",
          "service_orders.displayId as soDisplayId",
        ])
        // .distinct('assigned_assets.assetId')
        .where({
          "assigned_assets.entityType": "service_requests",
          "assigned_assets.orgId": req.orgId,
          "assigned_assets.assetId": id,
        });

      // if(service_orders && service_orders.length){
      //   for(let serviceOrder of service_orders){

      //   }serviceOrders
      // }
      res.status(200).json({
        data: {
          asset: {
            ...omitedAssetDataResult,
            additionalAttributes,
            files,
            partData,
            images,
            assetLocation,
            qrcode,
            serviceOrders: service_orders,
            teamName: team ? team.teamName : "",
            UserName: user ? user.name : "",
          },
        },
        message: "Asset Details",
      });
    } catch (err) {
      console.log(
        "[controllers][asset][getAssetDetails] :  Error",
        err
      );
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
  updateAssetDetails: async (req, res) => {
    try {
      let asset = null;
      let attribs = [];
      let insertedImages = [];
      let insertedFiles = [];

      await knex.transaction(async (trx) => {
        let assetPayload = req.body;
        let id = req.body.id;
        console.log(
          "[controllers][asset][payload]: Update Asset Payload",
          assetPayload
        );
        assetPayload = _.omit(assetPayload, [
          "additionalAttributes",
          "id",
          "assetCategory",
          "images",
          "files",
          "vendorId",
          "additionalVendorId",
          "location_data"
        ]);
        // validate keys
        const schema = Joi.object().keys({
          // parentAssetId: Joi.string(),
          // subAssetId: Joi.string(),
          // partId: Joi.string(),
          assetName: Joi.string().required(),
          model: Joi.string().required(),
          // barcode: Joi.string(),
          // areaName: Joi.string(),
          // description: Joi.string(),
          //assetCategory: Joi.string().required(),
          // price: Joi.string(),
          // installationDate: Joi.string(),
          // warrentyExpiration: Joi.string(),
          // locationId: Joi.string(),
          // assignedUsers: Joi.string(),
          // assignedTeams: Joi.string(),
          // assignedVendors: Joi.string(),
          // additionalInformation: Joi.string()
        });

        let currentTime = new Date().getTime();

        let result = Joi.validate(
          {
            assetName: assetPayload.assetName,
            model: assetPayload.model,
          },
          schema
        );
        console.log(
          "[controllers][asset][addAsset]: JOi Result",
          result
        );

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

        let assetCategoryId;
        let category;
        let assetCategory = req.body.assetCategory;
        category = await knex
          .select()
          .where({ categoryName: assetCategory })
          .returning(["*"])
          .transacting(trx)
          .into("asset_category_master")
          .where({ orgId: req.orgId });
        if (category && category.length) {
          assetCategoryId = category[0].id;
        } else {
          category = await knex
            .insert({
              categoryName: assetCategory,
              createdAt: currentTime,
              updatedAt: currentTime,
              orgId: req.orgId,
            })
            .returning(["*"])
            .transacting(trx)
            .into("asset_category_master");
          //   .where({ orgId: req.orgId });
          assetCategoryId = category[0].id;
        }

        // Insert in images
        if (req.body.images && req.body.images.length) {
          for (let image of req.body.images) {
            let insertedImageResult = await knex(
              "images"
            ).insert({
              ...image,
              entityId: id,
              entityType: "asset_master",
              createdAt: currentTime,
              updatedAt: currentTime,
              orgId: req.orgId,
            });
            //   .where({ orgId: req.orgId });
            insertedImages.push(insertedImageResult[0]);
          }
        }
        //Insert In Files
        if (req.body.files && req.body.files.length) {
          for (let file of req.body.files) {
            let insertedFileResult = await knex(
              "files"
            ).insert({
              ...file,
              entityId: id,
              entityType: "asset_master",
              createdAt: currentTime,
              updatedAt: currentTime,
              orgId: req.orgId,
            });
            //   .where({ orgId: req.orgId });
            insertedFiles.push(insertedFileResult[0]);
          }
        }

        // Update in asset_master table,

        let insertData = {
          ...assetPayload,
          assetCategoryId,
          updatedAt: currentTime,
          isActive: true,
          //   orgId: req.orgId
        };

        console.log(
          "[controllers][asset][updateAssetDetails]: Update Asset Insert Data",
          insertData
        );

        console.log("DATTAA ", insertData);
        let assetResult = await knex
          .update(insertData)
          .where({ id: id, orgId: req.orgId })
          .returning(["*"])
          .transacting(trx)
          .into("asset_master");
        //   .where({ orgId: req.orgId });

        asset = assetResult[0];

        if (req.body.location_data) {
          let location_data = req.body.location_data;
          console.log("location data",location_data)

          locationData = await knex              
          .update({
              companyId: location_data.companyId,
              projectId: location_data.projectId,
              buildingId: location_data.buildingPhaseId,
              floorId: location_data.floorZoneId,
              unitId: location_data.unitId,
              houseId: location_data.houseId,
              updatedAt: currentTime,
              startDate: currentTime,
            })
            .where({ assetId: id, orgId: req.orgId })
            .returning(["*"])
            .into("asset_location");
        }


        let additionalAttributes =
          req.body.additionalAttributes;

        if (
          req.body.additionalAttributes &&
          req.body.additionalAttributes.length
        ) {
          let delAttr = await knex("asset_attributes")
            .where({ assetId: id, orgId: req.orgId })
            .del();
        }

        if (additionalAttributes.length > 0) {
          for (attribute of additionalAttributes) {
            // if (attribute.id) {

            //   let finalAttribute = {...attribute, assetId: Number(id), updatedAt: currentTime }
            // let d = await knex
            //   .update(finalAttribute)
            // .where({ id: attribute.id, orgId: req.orgId })
            //.returning(["*"])
            //.transacting(trx)
            //.into("asset_attributes");
            //   .where({ orgId: req.orgId });
            //attribs.push(d[0])
            // } else {
            let d = await knex
              .insert({
                attributeName: attribute.attributeName,
                attributeDescription:
                  attribute.attributeDescription,
                assetId: Number(id),
                orgId: req.orgId,
              })
              .returning(["*"])
              .transacting(trx)
              .into("asset_attributes");
            //   .where({ orgId: req.orgId });
            attribs.push(d[0]);

            //}
          }
        }

        // Insert Vendors in Assigned vendors table
        let vendorsPData = req.body.vendorId;
        let vendorsADData = req.body.additionalVendorId;

        if (vendorsPData || vendorsADData) {
          // Insert Primary Vendor Data
          if (vendorsPData) {
            getPrimaryVendorExist = await knex(
              "assigned_vendors"
            )
              .where({
                entityId: asset.id,
                entityType: "assets",
                orgId: req.orgId,
                isPrimaryVendor: true,
              })
              .select("*");
            console.log(
              "assignedVendors",
              getPrimaryVendorExist
            );

            if (getPrimaryVendorExist) {
              let finalVendors = {
                entityId: asset.id,
                entityType: "assets",
                isPrimaryVendor: true,
                userId: vendorsPData,
                createdAt: currentTime,
                updatedAt: currentTime,
                orgId: req.orgId,
              };

              let d = await knex
                .update(finalVendors)
                .where({
                  entityId: asset.id,
                  entityType: "assets",
                  orgId: req.orgId,
                  isPrimaryVendor: true,
                })
                .returning(["*"])
                .transacting(trx)
                .into("assigned_vendors");
            } else {
              let finalVendors = {
                entityId: asset.id,
                entityType: "assets",
                isPrimaryVendor: true,
                userId: vendorsPData,
                createdAt: currentTime,
                updatedAt: currentTime,
                orgId: req.orgId,
              };

              let d = await knex
                .insert(finalVendors)
                .returning(["*"])
                .transacting(trx)
                .into("assigned_vendors");
              //.where({ orgId: req.orgId });
            }
          }

          // Insert Secondary Vendor Data
          if (vendorsADData) {
            getAdditionalVendorExist = await knex(
              "assigned_vendors"
            )
              .where({
                entityId: asset.id,
                entityType: "assets",
                orgId: req.orgId,
                isPrimaryVendor: false,
              })
              .select("*");

            if (getAdditionalVendorExist) {
              let finalADVendors = {
                entityId: asset.id,
                entityType: "assets",
                isPrimaryVendor: false,
                userId: vendorsADData,
                createdAt: currentTime,
                updatedAt: currentTime,
                orgId: req.orgId,
              };

              let d = await knex
                .update(finalADVendors)
                .where({
                  entityId: asset.id,
                  entityType: "assets",
                  orgId: req.orgId,
                  isPrimaryVendor: false,
                })
                .returning(["*"])
                .transacting(trx)
                .into("assigned_vendors");
            } else {
              let finalADVendors = {
                entityId: asset.id,
                userId: vendorsADData,
                entityType: "assets",
                isPrimaryVendor: false,
                createdAt: currentTime,
                updatedAt: currentTime,
                orgId: req.orgId,
              };
              let d = await knex
                .insert(finalADVendors)
                .returning(["*"])
                .transacting(trx)
                .into("assigned_vendors");
              //.where({ orgId: req.orgId });
            }
          }
        }

        trx.commit;
      });

      res.status(200).json({
        data: {
          asset: {
            ...asset,
            attributes: attribs,
            insertedImages,
            insertedFiles,
          },
        },
        message: "Asset updated successfully !",
      });
    } catch (err) {
      console.log(
        "[controllers][asset][addAsset] :  Error",
        err
      );
      //trx.rollback
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
  addServiceOrderReplaceAsset: async (req, res) => {
    //if newAset exists in the table for this oldasset that we gonna replace with some other newasset add end date to that previous entry if end date blank
    try {
      let asset = null;
      let updated = null;
      await knex.transaction(async (trx) => {
        let payload = req.body;
        const schema = Joi.object().keys({
          OldAssetId: Joi.string().required(),
          newAssetId: Joi.string().required(),
          serviceOrderId: Joi.string().required(),
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
        //let currentDate = new Date().getDate()
        let ommitedPayload = _.omit(payload, [
          "serviceOrderId",
        ]);

        // Now first check whether this oldAssetId exists as the newAssetId for any previous entry where endDate is null
        let entry = await knex
          .select()
          .where({
            newAssetId: payload.OldAssetId,
            endDate: null,
            entityType: "service_orders",
            orgId: req.orgId,
          })
          .returning(["*"])
          .transacting(trx)
          .into("replaced_assets");
        //   .where({ orgId: req.orgId });

        if (entry.length > 0) {
          // Update endDate of previous entry with today's date and insert new entry
          let updatedEntry = await knex
            .update({ endDate: currentTime })
            .where({
              newAssetId: payload.OldAssetId,
              entityType: "service_orders",
              orgId: req.orgId,
            })
            .returning(["*"])
            .transacting(trx)
            .into("replaced_assets");
          //   .where({ orgId: req.orgId });

          updated = updatedEntry[0];

          let insertData = {
            startDate: currentTime,
            endDate: null,
            createdAt: currentTime,
            updatedAt: currentTime,
            entityId: payload.serviceOrderId,
            entityType: "service_orders",
            ...ommitedPayload,
            orgId: req.orgId,
          };
          let assetResult = await knex
            .insert(insertData)
            .returning(["*"])
            .transacting(trx)
            .into("replaced_assets");
          //   .where({ orgId: req.orgId });
          asset = assetResult[0];
        } else {
          let insertData = {
            startDate: currentTime,
            endDate: null,
            createdAt: currentTime,
            updatedAt: currentTime,
            entityId: payload.serviceOrderId,
            entityType: "service_orders",
            ...ommitedPayload,
            orgId: req.orgId,
          };
          let assetResult = await knex
            .insert(insertData)
            .returning(["*"])
            .transacting(trx)
            .into("replaced_assets");
          //   .where({ orgId: req.orgId });
          asset = assetResult[0];
        }
        trx.commit;
      });
      return res.status(200).json({
        data: {
          asset: asset,
          updatedEntry: updated,
        },
        message: "Asset replaced successfully",
      });
    } catch (err) {
      console.log(
        "[controllers][asset][addServiceOrderReplaceAsset] :  Error",
        err
      );
      //trx.rollback
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
  addServiceRequestReplaceAsset: async (req, res) => {
    try {
      let asset = null;
      let updated = null;
      await knex.transaction(async (trx) => {
        let payload = req.body;
        const schema = Joi.object().keys({
          OldAssetId: Joi.string().required(),
          newAssetId: Joi.string().required(),
          serviceRequestId: Joi.string().required(),
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
        let ommitedPayload = _.omit(payload, [
          "serviceRequestId",
        ]);

        // Now first check whether this oldAssetId exists as the newAssetId for any previous entry where endDate is null
        let entry = await knex
          .select()
          .where({
            entityType: "service_requests",
            newAssetId: payload.OldAssetId,
            endDate: null,
            orgId: req.orgId,
          })
          .returning(["*"])
          .transacting(trx)
          .into("replaced_assets");
        //   .where({ orgId: req.orgId });

        if (entry.length > 0) {
          // Update endDate of previous entry with today's date and insert new entry
          let updatedEntry = await knex
            .update({ endDate: currentTime })
            .where({
              newAssetId: payload.OldAssetId,
              entityType: "service_requests",
              orgId: req.orgId,
            })
            .returning(["*"])
            .transacting(trx)
            .into("replaced_assets");
          //   .where({ orgId: req.orgId });

          updated = updatedEntry[0];

          let insertData = {
            startDate: currentTime,
            endDate: null,
            createdAt: currentTime,
            updatedAt: currentTime,
            entityId: payload.serviceRequestId,
            entityType: "service_requests",
            ...ommitedPayload,
            orgId: req.orgId,
          };
          let assetResult = await knex
            .insert(insertData)
            .returning(["*"])
            .transacting(trx)
            .into("replaced_assets");
          //   .where({ orgId: req.orgId });
          asset = assetResult[0];
        } else {
          let insertData = {
            startDate: currentTime,
            endDate: null,
            createdAt: currentTime,
            updatedAt: currentTime,
            entityId: payload.serviceRequestId,
            entityType: "service_requests",
            ...ommitedPayload,
            orgId: req.orgId,
          };
          let assetResult = await knex
            .insert(insertData)
            .returning(["*"])
            .transacting(trx)
            .into("replaced_assets");
          //   .where({ orgId: req.orgId });
          asset = assetResult[0];
        }
        trx.commit;
      });
      return res.status(200).json({
        data: {
          asset: asset,
          updatedEntry: updated,
        },
        message: "Asset replaced successfully",
      });
    } catch (err) {
      console.log(
        "[controllers][asset][addServiceRequestReplaceAsset] :  Error",
        err
      );
      //trx.rollback
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
  addServiceOrderRelocateAsset: async (req, res) => {
    try {
      let updatedEntry = null;
      let insertedEntry = null;
      await knex.transaction(async (trx) => {
        let payload = req.body;
        const schema = Joi.object().keys({
          assetId: Joi.string().required(),
          locationId: Joi.string().required(),
          serviceOrderId: Joi.string().required(),
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
        // Check whether this asset is already relocated once or this is the first time
        let entryCheck = await knex
          .select()
          .where({
            assetId: payload.assetId,
            entityType: "service_orders",
            endDate: null,
            orgId: req.orgId,
          })
          .returning(["*"])
          .transacting(trx)
          .into("relocated_assets");
        //   .where({ orgId: req.orgId });
        if (entryCheck.length > 0) {
          let updateEntry = await knex
            .update({
              endDate: currentTime,
              assetId: payload.assetId,
              entityType: "service_orders",
              entityId: payload.serviceOrderId,
            })
            .returning(["*"])
            .transacting(trx)
            .into("relocated_assets")
            .where({ orgId: req.orgId });
          updatedEntry = updateEntry[0];

          // Now insert new entry
          let insertEntry = await knex
            .insert({
              assetId: payload.assetId,
              locationId: payload.locationId,
              entityId: payload.serviceOrderId,
              entityType: "service_orders",
              startDate: currentTime,
              createdAt: currentTime,
              updatedAt: currentTime,
              orgId: req.orgId,
            })
            .returning(["*"])
            .transacting(trx)
            .into("relocated_assets");
          //   .where({ orgId: req.orgId });
          insertedEntry = insertEntry[0];
        } else {
          // Insert new entry with endDate equal to null
          let insertEntry = await knex
            .insert({
              assetId: payload.assetId,
              locationId: payload.locationId,
              entityId: payload.serviceOrderId,
              entityType: "service_orders",
              startDate: currentTime,
              createdAt: currentTime,
              updatedAt: currentTime,
              orgId: req.orgId,
            })
            .returning(["*"])
            .transacting(trx)
            .into("relocated_assets");
          //   .where({ orgId: req.orgId });
          insertedEntry = insertEntry[0];
        }

        trx.commit;
      });

      res.status(200).json({
        data: {
          relocatedEntry: insertedEntry,
          updatedEntry: updatedEntry,
        },
        message: "Asset relocated successfully.",
      });
    } catch (err) {
      console.log(
        "[controllers][asset][addServiceOrderRelocateAsset] :  Error",
        err
      );
      //trx.rollback
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
  addServiceRequestRelocateAsset: async (req, res) => {
    try {
      let updatedEntry = null;
      let insertedEntry = null;
      await knex.transaction(async (trx) => {
        let payload = req.body;
        const schema = Joi.object().keys({
          assetId: Joi.string().required(),
          locationId: Joi.string().required(),
          serviceRequestId: Joi.string().required(),
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
        // Check whether this asset is already relocated once or this is the first time
        let entryCheck = await knex
          .select()
          .where({
            assetId: payload.assetId,
            entityType: "service_requests",
            endDate: null,
          })
          .returning(["*"])
          .transacting(trx)
          .into("relocated_assets")
          .where({ orgId: req.orgId });
        if (entryCheck.length > 0) {
          let updateEntry = await knex
            .update({
              endDate: currentTime,
              assetId: payload.assetId,
              entityType: "service_requests",
              entityId: payload.serviceRequestId,
            })
            .returning(["*"])
            .transacting(trx)
            .into("relocated_assets")
            .where({ orgId: req.orgId });
          updatedEntry = updateEntry[0];

          // Now insert new entry
          let insertEntry = await knex
            .insert({
              assetId: payload.assetId,
              locationId: payload.locationId,
              entityId: payload.serviceRequestId,
              entityType: "service_requests",
              startDate: currentTime,
              createdAt: currentTime,
              updatedAt: currentTime,
              orgId: req.orgId,
            })
            .returning(["*"])
            .transacting(trx)
            .into("relocated_assets");
          //   .where({ orgId: req.orgId });
          insertedEntry = insertEntry[0];
        } else {
          // Insert new entry with endDate equal to null
          let insertEntry = await knex
            .insert({
              assetId: payload.assetId,
              locationId: payload.locationId,
              entityId: payload.serviceRequestId,
              entityType: "service_requests",
              startDate: currentTime,
              createdAt: currentTime,
              updatedAt: currentTime,
              orgId: req.orgId,
            })
            .returning(["*"])
            .transacting(trx)
            .into("relocated_assets");
          //   .where({ orgId: req.orgId });
          insertedEntry = insertEntry[0];
        }

        trx.commit;
      });

      res.status(200).json({
        data: {
          relocatedEntry: insertedEntry,
          updatedEntry: updatedEntry,
        },
        message: "Asset relocated successfully.",
      });
    } catch (err) {
      console.log(
        "[controllers][asset][addServiceOrderRelocateAsset] :  Error",
        err
      );
      //trx.rollback
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
  assetSearch: async (req, res) => {
    try {
      let query = decodeURI(req.query.query).trim();

      const getFilteredItems = (searchTerm) =>
        knex("asset_master").where((qb) => {
          qb.where({ "asset_master.orgId": req.orgId });
          qb.where(
            "asset_master.assetName",
            "like",
            `%${searchTerm}%`
          );

          qb.orWhere(
            "asset_master.barcode",
            "like",
            `%${searchTerm}%`
          );

          qb.orWhere(
            "asset_master.areaName",
            "like",
            `%${searchTerm}%`
          );
          qb.orWhere(
            "asset_master.assetCategory",
            "like",
            `%${searchTerm}%`
          );
          qb.orWhere(
            "asset_master.price",
            "like",
            `%${searchTerm}%`
          );
          qb.orWhere(
            "asset_master.additionalInformation",
            "like",
            `%${searchTerm}%`
          );
          qb.orWhere(
            "asset_master.description",
            "like",
            `%${searchTerm}%`
          );
          qb.orWhere(
            "asset_master.model",
            "like",
            `%${searchTerm}%`
          );
        });
      // .where({ orgId: req.orgId });
      const assets = await getFilteredItems(query);
      return res.status(200).json({
        data: {
          assets: assets,
        },
        message: "Search results for: " + query,
      });
    } catch (err) {
      console.log(
        "[controllers][asset][addServiceOrderRelocateAsset] :  Error",
        err
      );
      //trx.rollback
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
  // exportAsset: async(req,res)=>{
  //     try {

  //         let reqData = req.query;
  //         let filters = {}
  //         let total, rows
  //         let {
  //             assetName,
  //             assetModel,
  //             area,
  //             category
  //             } = req.body;

  //             let pagination = {};
  //             let per_page = reqData.per_page || 10;
  //             let page = reqData.current_page || 1;
  //             if (page < 1) page = 1;
  //             let offset = (page - 1) * per_page;

  //             if(assetName){
  //                 filters['asset_master.assetName'] = assetName
  //                }
  //                if(assetModel){
  //                   filters['asset_master.model'] = assetModel
  //                }
  //                if(area){
  //                   filters['asset_master.areaName'] = area
  //                }
  //                if(category){
  //                   filters['asset_category_master.categoryName'] = category
  //                }

  //               if (_.isEmpty(filters)) {
  //                   [total, rows] = await Promise.all([
  //                     knex
  //                       .count("* as count")
  //                       .from("asset_master")
  //                       .innerJoin(
  //                         "location_tags",
  //                         "asset_master.id",
  //                         "location_tags.entityId"
  //                       )
  //                       .innerJoin(
  //                         "location_tags_master",
  //                         "location_tags.locationTagId",
  //                         "location_tags_master.id"
  //                       )
  //                       .innerJoin(
  //                         "asset_category_master",
  //                         "asset_master.assetCategoryId",
  //                         "asset_category_master.id"
  //                       )
  //                       .first(),

  //                     knex("asset_master")
  //                       .innerJoin(
  //                         "location_tags",
  //                         "asset_master.id",
  //                         "location_tags.entityId"
  //                       )
  //                       .innerJoin(
  //                         "location_tags_master",
  //                         "location_tags.locationTagId",
  //                         "location_tags_master.id"
  //                       )
  //                       .innerJoin(
  //                         "asset_category_master",
  //                         "asset_master.assetCategoryId",
  //                         "asset_category_master.id"
  //                       )
  //                       .select([
  //                         "asset_master.assetName as Name",
  //                         "asset_master.id as ID",
  //                         "location_tags_master.title as Location",
  //                         "asset_master.model as Model",
  //                         "asset_master.barcode as Barcode",
  //                         "asset_master.areaName as Area",
  //                         "asset_category_master.categoryName as Category",
  //                         "asset_master.createdAt as Date Created"
  //                       ])
  //                       .offset(offset)
  //                       .limit(per_page)
  //                       .where({ 'asset_master.orgId': req.orgId })
  //                   ]);
  //               } else {
  //                   filters = _.omitBy(filters, val => val === '' || _.isNull(val) || _.isUndefined(val) || _.isEmpty(val) ? true : false)
  //                   try {
  //                       [total, rows] = await Promise.all([
  //                         knex
  //                           .count("* as count")
  //                           .from("asset_master")
  //                           .innerJoin(
  //                             "location_tags",
  //                             "asset_master.id",
  //                             "location_tags.entityId"
  //                           )
  //                           .innerJoin(
  //                             "location_tags_master",
  //                             "location_tags.locationTagId",
  //                             "location_tags_master.id"
  //                           )
  //                           .innerJoin(
  //                             "asset_category_master",
  //                             "asset_master.assetCategoryId",
  //                             "asset_category_master.id"
  //                           )
  //                           .where(filters)
  //                           .offset(offset)
  //                           .limit(per_page)
  //                           .first(),
  //                         knex("asset_master")
  //                           .innerJoin(
  //                             "location_tags",
  //                             "asset_master.id",
  //                             "location_tags.entityId"
  //                           )
  //                           .innerJoin(
  //                             "location_tags_master",
  //                             "location_tags.locationTagId",
  //                             "location_tags_master.id"
  //                           )
  //                           .innerJoin(
  //                             "asset_category_master",
  //                             "asset_master.assetCategoryId",
  //                             "asset_category_master.id"
  //                           )
  //                           .select([
  //                             "asset_master.assetName as Name",
  //                             "asset_master.id as ID",
  //                             "location_tags_master.title as Location",
  //                             "asset_master.model as Model",
  //                             "asset_master.barcode as Barcode",
  //                             "asset_master.areaName as Area",
  //                             "asset_category_master.categoryName as Category",
  //                             "asset_master.createdAt as Date Created"
  //                           ])
  //                           .where(filters)
  //                           .offset(offset)
  //                           .limit(per_page)
  //                           .where({ 'asset_master.orgId': req.orgId })
  //                       ]);
  //                   } catch (e) {
  //                       // Error
  //                       console.log('Error: ' + e.message)
  //                   }
  //               }

  //               var wb = XLSX.utils.book_new({sheet:"Sheet JS"});
  //               var ws = XLSX.utils.json_to_sheet(rows);
  //               XLSX.utils.book_append_sheet(wb, ws, "pres");
  //               XLSX.write(wb, {bookType:"csv", bookSST:true, type: 'base64'})
  //               let filename = "uploads/AssetData-"+Date.now()+".csv";
  //               let  check = XLSX.writeFile(wb,filename);

  //               return res.status(200).json({
  //                   data:rows,
  //                   message:"Asset Data Export Successfully!"
  //               })

  //           } catch (err) {
  //               console.log('[controllers][asset][getAssets] :  Error', err);
  //               res.status(500).json({
  //                 errors: [
  //                     { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
  //                 ],
  //             });
  //         }
  // },
  // DEPRECATED API
  getAssetListByLocation: async (req, res) => {
    try {
      let reqData = req.query;

      let filters = _.pickBy(req.body, (v) => v);
      let total, rows;

      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;

      let buildingId;
      let floorId;
      let projectId;
      let companyId;
      let assetCategoryId = filters.assetCategoryId;

      if (filters.buildingPhaseCode) {
        // go extract buildingId
        let buildingIdResult = await knex(
          "buildings_and_phases"
        )
          .select("id")
          .where((qb) => {
            qb.where({ orgId: req.orgId });
            qb.where(
              "buildingPhaseCode",
              "like",
              `%${filters.buildingPhaseCode}%`
            );
          });
        // .where({ orgId: req.orgId });
        if (buildingIdResult && buildingIdResult.length) {
          buildingId = buildingIdResult[0].id;
        }
      }

      if (filters.companyName) {
        let buildingIdResult = await knex("companies")
          .select("id")
          .where((qb) => {
            qb.where({ orgId: req.orgId });
            qb.where(
              "companyName",
              "like",
              `%${filters.companyName}%`
            );
          });
        //  .where({ orgId: req.orgId });
        if (buildingIdResult && buildingIdResult.length) {
          companyId = buildingIdResult[0].id;
        }
      }
      if (filters.floorZoneCode) {
        let buildingIdResult = await knex("floor_and_zones")
          .select("id")
          .where((qb) => {
            qb.where({ orgId: req.orgId });
            qb.where(
              "floorZoneCode",
              "like",
              `%${filters.floorZoneCode}%`
            );
          });
        //  .where({ orgId: req.orgId });
        if (buildingIdResult && buildingIdResult.length) {
          floorId = buildingIdResult[0].id;
        }
      }
      if (filters.projectName) {
        let buildingIdResult = await knex("projects")
          .select("id")
          .where((qb) => {
            qb.where({ orgId: req.orgId });
            qb.where(
              "projectName",
              "like",
              `%${filters.projectName}%`
            );
          });
        //  .where({ orgId: req.orgId });
        if (buildingIdResult && buildingIdResult.length) {
          projectId = buildingIdResult[0].id;
        }
      }

      let condition = {};
      if (buildingId) {
        condition["asset_location.buildingId"] = buildingId;
      }
      if (floorId) {
        condition["asset_location.floorId"] = floorId;
      }
      if (companyId) {
        condition["asset_location.companyId"] = companyId;
      }
      if (projectId) {
        condition["asset_location.projectId"] = projectId;
      }
      if (assetCategoryId) {
        condition[
          "asset_master.assetCategoryId"
        ] = assetCategoryId;
      }

      //console.log('Condition: ',JSON.stringify(condition))

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
            "assetName",
            "model",
            "barcode",
            "areaName",
          ])
          .where(condition)
          .where({ "asset_master.orgId": req.orgId })
          // .where({ orgId: req.orgId })
          .groupBy([
            "asset_master.id",
            "asset_location.id",
          ]),
        knex
          .from("asset_master")
          .innerJoin(
            "asset_location",
            "asset_master.id",
            "asset_location.assetId"
          )
          .select([
            "asset_master.id as id",
            "assetName",
            "model",
            "barcode",
            "areaName",
          ])
          .where({ "asset_master.orgId": req.orgId })
          .where(condition)
          .offset(offset)
          .limit(per_page),
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
          asset: pagination,
        },
        message: "Asset List!",
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

    console.log(
      "[controllers][asset][addServiceOrderRelocateAsset] :  Error",
      err
    );
  },
  updateAssetLocation: async (req, res) => {
    try {
      const payload = _.omit(req.body, [
        "previousLocationId",
        "houseNo",
      ]);
      let currentTime = new Date().getTime();

      /*
              { assetId: '1655',
                companyId: '112',
                buildingId: '156',
                projectId: '48',
                unitId: '11',
                houseId: '9922',
                floorId: '165' }
              */
      if (req.body.previousLocationId) {
        // Check Current Location is Exits

        let currentLocation = await knex("asset_location")
          .select("*")
          .where({
            assetId: payload.assetId,
            unitId: payload.unitId,
          });
        console.log("currentLocation", currentLocation);
        if (currentLocation.length > 0) {
          // await knex('asset_location')
          //   .update({
          //     ...payload,
          //     createdAt: currentTime,
          //     updatedAt: currentTime,
          //     startDate: currentTime,
          //     orgId: req.orgId
          //   })
          //   .where({ assetId: payload.assetId, unitId: payload.unitId })

          await knex("asset_location")
            .update({ endDate: currentTime })
            .where({
              assetId: payload.assetId,
              id: req.body.previousLocationId,
            });

          // return res.status(200).json({

          //   message: 'Asset location updated'
          // })
          // return res.status(400).json({
          //   data: {},
          //   message: 'Asset location already exist'
          // })
        }

        await knex("asset_location")
          .update({ endDate: currentTime })
          .where({
            assetId: payload.assetId,
            id: req.body.previousLocationId,
          });
      }
      console.log(
        "***********************ASSET LOCATION:***********************",
        req.body
      );
      // Deprecated
      let updatedLastLocationEndDate;
      // if (req.body.previousLocationId) {

      //   updatedLastLocationEndDate = await knex("asset_location")
      //     .update({ updatedAt: currentTime })
      //     .where({ id: req.body.previousLocationId })
      //     .where({ orgId: req.orgId });
      // }

      // Deprecation end

      const updatedAsset = await knex("asset_location")
        .insert({
          ...payload,
          createdAt: currentTime,
          updatedAt: currentTime,
          startDate: currentTime,
          orgId: req.orgId,
        })
        .returning(["*"]);
      //   .where({ orgId: req.orgId });

      // UPDATE ASSET LOCATION

      return res.status(200).json({
        data: {
          updatedAsset,
          updatedLastLocationEndDate,
        },
        message: "Asset location updated",
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
  exportAssetData: async (req, res) => {
    try {
      // let projectIds = [];
      // const accessibleProjects = req.userProjectResources;

      // if (accessibleProjects.length) {
      //     for (let pro of accessibleProjects) {

      //         if (pro.projects.length) {

      //             for (let projectId of pro.projects) {
      //                 console.log("project=========", pro.projects, "====================")

      //                 projectIds.push(projectId);
      //             }
      //         }
      //     }
      // }

      // projectIds = _.uniqBy(projectIds);

      let projectIds = [];
      let projectsForAssets = req.userProjectResources;
      projectsForAssets = projectsForAssets.find(
        (pfp) => pfp.id == 4
      ); // 3 means assets ...
      let accessibleProjects = projectsForAssets.projects;
      console.log(
        "Project For Assets:",
        accessibleProjects
      );
      projectIds = _.uniqBy(accessibleProjects);
      console.log("ProjectIds:", projectIds);

      let companyResult = await knex
        .from("projects")
        .select(["companyId"])
        .whereIn("projects.id", projectIds)
        .where({ orgId: req.orgId });

      let companyIds = companyResult.map(
        (v) => v.companyId
      );
      companyIds = _.uniqBy(companyIds);

      let {
        assetName,
        assetModel,
        assetSerial,
        category,
        company,
        project,
        asNo,
        assetCode,
      } = req.body;

      let subQuery1 = knex("asset_master")
        .leftJoin(
          "asset_category_master",
          "asset_master.assetCategoryId",
          "asset_category_master.id"
        )
        .leftJoin(
          "companies",
          "asset_master.companyId",
          "companies.id"
        )
        .leftJoin(
          "asset_master as asset2",
          "asset_master.parentAssetId",
          "asset2.id"
        )
        .leftJoin(
          "teams",
          "asset_master.assignedTeams",
          "teams.teamId"
        )
        .leftJoin(
          "location_tags_master",
          "asset_master.locationId",
          "location_tags_master.id"
        )
        .joinRaw(
          'left join asset_location al on al."assetId" = "asset_master".id and al.id = (select max(id) from asset_location al2 where al2."assetId" = "asset_master"."id")'
        )
        .select([
          "asset_master.assetCode as ASSET_CODE",
          "asset_master.assetName as ASSET_NAME",
          "asset_master.unitOfMeasure as UNIT_OF_MEASURE",
          "asset_master.model as MODEL_CODE",
          "asset_category_master.categoryName as ASSET_CATEGORY_NAME",
          "companies.companyId as COMPANY",
          "asset_master.price as PRICE",
          "asset_master.assetSerial as ASSET_SERIAL_NO",
          "asset_master.installationDate as INSTALMENT_DATE",
          "asset_master.warrentyExpiration as WARRANTY_DATE",
          "asset_master.barcode AS BARCODE",
          "asset2.assetCode as PARENT_ASSET_CODE",
          "location_tags_master.title as LOCATION",
          "asset_master.assignedUsers as ASSIGN_USER",
          "teams.teamCode as ASSIGN_TEAM",
          "asset_master.assignedVendors as ASSIGN_VENDOR",
          "asset_master.additionalInformation as ASSIGN_INFORMATION",
          "asset_master.id as ID",
          "al.unitId",
        ])
        .where({ "asset_master.orgId": req.orgId })
        .where((qb) => {
          if (assetName) {
            qb.where(
              "asset_master.assetName",
              "iLIKE",
              `%${assetName}%`
            );
          }
          if (assetSerial) {
            qb.where(
              "asset_master.assetSerial",
              "iLIKE",
              `%${assetSerial}%`
            );
          }
          if (assetModel) {
            qb.where(
              "asset_master.model",
              "iLIKE",
              `%${assetModel}%`
            );
          }
          if (assetCode) {
            qb.where(
              "asset_master.assetCode",
              "iLIKE",
              `%${assetCode}%`
            );
          }
          if (category) {
            qb.where(
              "asset_category_master.categoryName",
              "iLIKE",
              `%${category}%`
            );
          }
          if (asNo) {
            qb.where("asset_master.displayId", asNo);
          }
          if (company) {
            qb.where("asset_master.companyId", company);
          }
          if (project) {
            qb.where("asset_master.projectId", project);
          }
        })
        .whereIn("asset_master.companyId", companyIds);

      let assets = await knex
        .select([
          "asset.*",
          "pu.unitNumber as UNIT_NUMBER",
          "faz.floorZoneCode as FLOOR_CODE",
          "bap.buildingPhaseCode as BUILDING_CODE",
          "p2.project as PROJECT_CODE",
          "c2.companyId as COMPANY_CODE",
        ])
        .from(subQuery1.as("asset"))
        .leftJoin(
          "property_units AS pu",
          "asset.unitId",
          "pu.id"
        )
        .leftJoin(
          "floor_and_zones AS faz",
          "pu.floorZoneId",
          "faz.id"
        )
        .leftJoin(
          "buildings_and_phases AS bap",
          "pu.buildingPhaseId",
          "bap.id"
        )
        .leftJoin("projects AS p2", "pu.projectId", "p2.id")
        .leftJoin(
          "companies AS c2",
          "pu.companyId",
          "c2.id"
        );

      console.log(
        "Queried Asset Data: Result Count",
        assets.length
      );

      assets = assets.map((a) => {
        delete a.unitId;
        return a;
      });

      let tempraryDirectory = null;
      if (process.env.IS_OFFLINE) {
        tempraryDirectory = "tmp/";
      } else {
        tempraryDirectory = "/tmp/";
      }
      let bucketName = process.env.S3_BUCKET_NAME;

      var wb = XLSX.utils.book_new({ sheet: "Sheet JS" });

      var ws;

      if (assets && assets.length) {
        ws = XLSX.utils.json_to_sheet(assets);
      } else {
        ws = XLSX.utils.json_to_sheet([
          {
            ASSET_CODE: "",
            ASSET_NAME: "",
            UNIT_OF_MEASURE: "",
            MODEL_CODE: "",
            ASSET_CATEGORY_NAME: "",
            COMPANY: "",
            PRICE: "",
            ASSET_SERIAL_NO: "",
            INSTALMENT_DATE: "",
            WARRANTY_DATE: "",
            BARCODE: "",
            PARENT_ASSET_CODE: "",
            LOCATION: "",
            ASSIGN_USER: "",
            ASSIGN_TEAM: "",
            ASSIGN_VENDOR: "",
            ASSIGN_INFORMATION: "",
            COMPANY_CODE: "",
            PROJECT_CODE: "",
            BUILDING_CODE: "",
            FLOOR_CODE: "",
            UNIT_NUMBER: "",
          },
        ]);
      }

      XLSX.utils.book_append_sheet(wb, ws, "pres");
      XLSX.write(wb, {
        bookType: "csv",
        bookSST: true,
        type: "base64",
      });
      let filename = "AssetData-" + Date.now() + ".csv";
      let filepath = tempraryDirectory + filename;
      let check = XLSX.writeFile(wb, filepath);

      const AWS = require("aws-sdk");
      fs.readFile(filepath, function (err, file_buffer) {
        var s3 = new AWS.S3();
        var params = {
          Bucket: bucketName,
          Key: "Export/Asset/" + filename,
          Body: file_buffer,
          ACL: "public-read",
        };
        s3.putObject(params, function (err, data) {
          if (err) {
            console.log(
              "Error at uploadCSVFileOnS3Bucket function",
              err
            );
            //next(err);
            return res.status(500).json({
              errors: [
                {
                  code: "UNKNOWN_SERVER_ERROR",
                  message: err.message,
                },
              ],
            });
          } else {
            console.log("File uploaded Successfully");

            //next(null, filePath);
            // fs.unlink(filepath, err => {
            //   console.log("File Deleting Error " + err);
            // });
            let url =
              process.env.S3_BUCKET_URL +
              "/Export/Asset/" +
              filename;

            return res.status(200).json({
              data: {},
              message: "Asset Data Export Successfully!",
              url: url,
              // assetResult
            });
          }
        });
      });
    } catch (err) {
      console.log(err);
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
  importAssetData: async (req, res) => {
    try {
      // if (req.file) {
      // console.log(req.file)
      // let tempraryDirectory = null;
      // if (process.env.IS_OFFLINE) {
      //   tempraryDirectory = 'tmp/';
      // } else {
      //   tempraryDirectory = '/tmp/';
      // }
      //  let resultData = null;
      //    let file_path = tempraryDirectory + req.file.filename;
      //  let wb = XLSX.readFile(file_path, { type: "base64", cellDates: true });
      //  let ws = wb.Sheets[wb.SheetNames[0]];
      //  let data = XLSX.utils.sheet_to_json(ws, { type: 'string', header: 'A', raw: false });
      //data         = JSON.stringify(data);
      ///   console.log("+++++++++++++", data, "=========")
      let data = req.body;
      let totalData = data.length - 1;
      let fail = 0;
      let success = 0;
      let result = null;
      let errors = [];
      let header = Object.values(data[0]);
      header.unshift("Error");
      errors.push(header);

      if (
        data[0].A == "ASSET_CODE" ||
        (data[0].A == "Ã¯Â»Â¿ASSET_CODE" &&
          data[0].B == "ASSET_NAME" &&
          data[0].C == "UNIT_OF_MEASURE" &&
          data[0].D == "MODEL_CODE" &&
          data[0].E == "ASSET_CATEGORY_NAME" &&
          data[0].F == "COMPANY" &&
          data[0].G == "PRICE" &&
          data[0].H == "ASSET_SERIAL_NO" &&
          data[0].I == "INSTALMENT_DATE" &&
          data[0].J == "WARRANTY_DATE" &&
          data[0].K == "BARCODE" &&
          data[0].L == "PARENT_ASSET_CODE" &&
          data[0].M == "LOCATION" &&
          data[0].N == "ASSIGN_USER" &&
          data[0].O == "ASSIGN_TEAM" &&
          data[0].P == "ASSIGN_VENDOR" &&
          data[0].Q == "ASSIGN_INFORMATION")
      ) {
        if (data.length > 0) {
          let i = 0;
          for (let assetData of data) {
            i++;

            console.log(
              "ASSET DATA:**************************************",
              assetData
            );

            if (i > 1) {
              let companyId = "";
              if (assetData.F) {
                let companyResult = await knex("companies")
                  .select("id")
                  .where({
                    companyId: assetData.F,
                    orgId: req.orgId,
                  })
                  .first();
                if (companyResult && companyResult.id) {
                  companyId = companyResult.id;
                } else {
                  fail++;
                  let values = _.values(assetData);
                  values.unshift(
                    "Company ID does not exists."
                  );
                  errors.push(values);
                  continue;
                }
              } else {
                continue;
              }
              let projectId = "" ;
              if(assetData.S){
                let projectResult = await knex('projects')
                .select("id")
                .where({
                  project : assetData.s,
                  orgId : req.orgId
                })
                .first();
                if(projectResult && projectResult.id){
                  projectId = projectResult.id
                }else{
                  fail++;
                  let values = _.values(assetData);
                  values.unshift(
                    "Project ID does not exists."
                  );
                  errors.push(values);
                  continue;
                }

              }else{
                continue;
              }

              let buildingId = "";
              if(assetData.T){
                let buildingResult = await knex("buildings_and_phases")
                .select("id")
                .where({
                  buildingPhaseCode : assetData.T,
                  orgId : req.orgId
                })
                .first();
                if(buildingResult && buildingResult.id){
                  buildingId = buildingResult.id
                }else{
                  fail++;
                  let values = _.values(assetData);
                  values.unshift(
                    "Building ID does not exists."
                  );
                  errors.push(values);
                  continue;
                }
              }else{
                continue;
              }

              let floorZoneId = "";
              if(assetData.U){
                let floorZoneResult = await knex('floor_and_zones')
                .select("id")
                .where({
                  floorZoneCode : assetData.U,
                  orgId : req.orgId
                })
                .first();
                if(floorZoneResult && floorZoneResult.id){
                  floorZoneId = floorZoneResult.id
                }else{
                  fail++;
                  let values = _.values(assetData);
                  values.unshift(
                    "Floor Zone ID does not exists."
                  );
                  errors.push(values);
                  continue;
                }
              }else{
                continue;
              }

              let propertyUnitId = "";
              if(assetData.V){
                let propertyUnitResult = await knex('property_units')
                .select("id")
                .where({
                  unitNumber : assetData.V,
                  orgId : req.orgId
                })
                .first();
                if(propertyUnitResult && propertyUnitResult.id){
                  propertyUnitId = propertyUnitResult.id
                }else{
                  fail++;
                  let values = _.values(assetData);
                  values.unshift(
                    "Unit Number does not exists."
                  );
                  errors.push(values);
                  continue;
                }
              }else{
                continue;
              }

              let assetCategoryId = "";
              const cat = await knex(
                "asset_category_master"
              )
                .where({
                  categoryName: assetData.E,
                  orgId: req.orgId,
                })
                .select("id");
              if (cat && cat.length) {
                assetCategoryId = cat[0].id;
              } else {
                const catResult = await knex(
                  "asset_category_master"
                )
                  .insert({
                    categoryName: assetData.E,
                    orgId: req.orgId,
                  })
                  .returning(["id"]);
                assetCategoryId = catResult[0].id;
              }
              let price = 0;
              if (assetData.G) {
                price = assetData.G;
              }

              /*GET TEAM ID TO TEAM CODE OPEN */
              let teamId = null;
              if (assetData.O) {
                let teamResult = await knex("teams")
                  .where({
                    teamCode: assetData.O,
                    orgId: req.orgId,
                  })
                  .select("teamId");
                if (!teamResult.length) {
                  fail++;
                  let values = _.values(assetData);
                  values.unshift(
                    "Team ID does not exists."
                  );
                  errors.push(values);
                  continue;
                }

                if (teamResult.length) {
                  teamId = teamResult[0].teamId;
                }
              }
              /*GET TEAM ID TO TEAM CODE CLOSE */

              /*GET PARENT ID TO PARENT ASSET CODE OPEN */

              let parentId = null;
              if (assetData.L) {
                let parentResult = await knex(
                  "asset_master"
                )
                  .where({
                    assetCode: assetData.L,
                    orgId: req.orgId,
                  })
                  .select("id");
                if (!parentResult.length) {
                  fail++;
                  let values = _.values(assetData);
                  values.unshift(
                    "Parent asset id does not exists."
                  );
                  errors.push(values);
                  continue;
                }

                if (parentResult.length) {
                  parentId = parentResult[0].id;
                }
              }
              /*GET PARENT ID TO PARENT CODE CLOSE */

              /*GET LOCATION ID BY LOCATION CODE OPEN */

              let locationId = null;
              if (assetData.M) {
                let locationResult = await knex(
                  "location_tags_master"
                )
                  .where({
                    title: assetData.M,
                    orgId: req.orgId,
                  })
                  .select("id");
                // if (!locationResult.length) {
                //   fail++;
                //   let values = _.values(assetData);
                //   values.unshift(
                //     "Location Tag does not exists."
                //   );
                //   errors.push(values);
                //   continue;
                // }

                
                if (locationResult && locationResult.length) {
                  locationId = locationResult[0].id;
                }else{
                  const locationData = await knex('location_tags_master')
                  .insert({
                    title: assetData.M,
                    descriptionEng : assetData.M,
                    orgId: req.orgId,
                  })
                  .returning(["id"]);
                  locationId = locationData[0].id;

                }
              }
              /*GET LOCATION ID BY LOCATION CODE CLOSE */

              let checkExist = await knex("asset_master")
                .select("id")
                .where({
                  assetCode: assetData.A,
                  assetName: assetData.B,
                  orgId: req.orgId,
                });

              // if (checkExist.length < 1) {

              let currentTime = new Date().getTime();

              let installDate = "";
              let expireDate = "";
              if (assetData.I) {
                installDate = moment(assetData.I).format();
              }
              if (assetData.J) {
                expireDate = moment(assetData.J).format();
              }

              let insertData = {
                orgId: req.orgId,
                assetCode: assetData.A,
                assetName: assetData.B,
                unitOfMeasure: assetData.C,
                model: assetData.D,
                price: assetData.G,
                companyId: companyId,
                projectId : projectId,
                assetCategoryId,
                createdAt: currentTime,
                updatedAt: currentTime,
                assignedTeams: teamId,
                parentAssetId: parentId,
                assetSerial: assetData.H,
                installationDate: installDate,
                warrentyExpiration: expireDate,
                barcode: assetData.K,
                locationId: locationId,
                assignedUsers: assetData.N,
                assignedVendors: assetData.P,
                additionalInformation: assetData.Q,
              };

              resultData = await knex
                .insert(insertData)
                .returning(["*"])
                .into("asset_master");

              if (resultData && resultData.length) {
                success++;
              }

              console.log("[asset result data]===",resultData)

              let houseResult = await knex("property_units")
              .select("id")
              .where({ floorZoneId, orgId: orgId, isActive: true});
              let houseId = houseResult.find(v => v.id === propertyUnitId).id;


              console.log("[HouseId]",houseId);

             let assetLocationResult = await knex
             .insert({
               assetId : resultData[0].id,
               houseId : houseId,
               floorId: floorZoneId,
               unitId : propertyUnitId,
               buildingId : buildingId,
               projectId:projectId,
               companyId : companyId

             })
             .returning(["*"])
             .into("asset_location");

             console.log("[AssetLocation][HouseId]",assetLocationResult)

              // } else {
              //   fail++;
              //   let values = _.values(assetData)
              //   values.unshift('Asset name with corresponding asset code already exists.')
              //   errors.push(values);
              // }
            }
          }
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
          //let deleteFile = await fs.unlink(file_path, (err) => { console.log("File Deleting Error " + err) })

          const update = await knex("asset_master")
            .update({ isActive: true })
            .where({ orgId: req.orgId, isActive: true })
            .returning(["*"]);

            console.log("[update][asset]",update)

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
      // } else {

      // return res.status(400).json({
      //   errors: [
      //     { code: "VALIDATION_ERROR", message: "Please Choose valid File!" }
      //   ]
      // });

      // }
    } catch (err) {
      console.log(
        "[controllers][propertysetup][importCompanyData] :  Error",
        err
      );
      //trx.rollback
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
  getAssetListByHouseId: async (req, res) => {
    try {
      let houseId = req.body.houseId;
      let reqData = req.query;
      let total, rows;
      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;

      [total, rows] = await Promise.all([
        knex("asset_location")
          .leftJoin(
            "asset_master",
            "asset_location.assetId",
            "asset_master.id"
          )
          .leftJoin(
            "companies",
            "asset_location.companyId",
            "companies.id"
          )
          .leftJoin(
            "projects",
            "asset_location.projectId",
            "projects.id"
          )
          .leftJoin(
            "buildings_and_phases",
            "asset_location.buildingId",
            "buildings_and_phases.id"
          )
          .leftJoin(
            "floor_and_zones",
            "asset_location.floorId",
            "floor_and_zones.id"
          )
          .leftJoin(
            "property_units",
            "asset_location.unitId",
            "property_units.id"
          )
          .select([
            "asset_master.assetName as assetName",
            "asset_master.id as id",
            "companies.companyName",
            "companies.id as companyId",
            "projects.projectName as projectName",
            "projects.id as projectId",
            "buildings_and_phases.buildingPhaseCode as buildingPhaseCode",
            "buildings_and_phases.id as buildingId",
            "floor_and_zones.floorZoneCode as floorZoneCode",
            "floor_and_zones.id as floorId",
            "property_units.unitNumber as unitNumber",
            "property_units.id as unitId",
            "property_units.houseId as houseId",
            "asset_master.displayId",
          ])
          .where({
            "asset_location.houseId": houseId,
            "asset_master.orgId": req.orgId,
            "asset_location.endDate": null,
          }),
        knex("asset_location")
          .leftJoin(
            "asset_master",
            "asset_location.assetId",
            "asset_master.id"
          )
          .leftJoin(
            "companies",
            "asset_location.companyId",
            "companies.id"
          )
          .leftJoin(
            "projects",
            "asset_location.projectId",
            "projects.id"
          )
          .leftJoin(
            "buildings_and_phases",
            "asset_location.buildingId",
            "buildings_and_phases.id"
          )
          .leftJoin(
            "floor_and_zones",
            "asset_location.floorId",
            "floor_and_zones.id"
          )
          .leftJoin(
            "property_units",
            "asset_location.unitId",
            "property_units.id"
          )
          .select([
            "asset_master.assetName as assetName",
            "asset_master.id as id",
            "companies.companyName",
            "companies.id as companyId",
            "projects.projectName as projectName",
            "projects.id as projectId",
            "buildings_and_phases.buildingPhaseCode as buildingPhaseCode",
            "buildings_and_phases.id as buildingId",
            "floor_and_zones.floorZoneCode as floorZoneCode",
            "floor_and_zones.id as floorId",
            "property_units.unitNumber as unitNumber",
            "property_units.id as unitId",
            "property_units.houseId as houseId",
            "asset_master.displayId",
          ])
          .where({
            "asset_location.houseId": houseId,
            "asset_master.orgId": req.orgId,
            "asset_location.endDate": null,
          })
          .offset(offset)
          .limit(per_page),
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
          asset: pagination,
        },
        message: "Asset locations",
      });
    } catch (err) {
      console.log(
        "[controllers][propertysetup][importCompanyData] :  Error",
        err
      );
      //trx.rollback
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
  getServiceRequestRelocatedAssets: async (req, res) => {
    try {
      const { serviceRequestId } = req.body;

      let assets = await knex("asset_location")
        .innerJoin(
          "asset_master",
          "asset_location.assetId",
          "asset_master.id"
        )
        .innerJoin(
          "companies",
          "asset_location.companyId",
          "companies.id"
        )
        .innerJoin(
          "projects",
          "asset_location.projectId",
          "projects.id"
        )
        .innerJoin(
          "buildings_and_phases",
          "asset_location.buildingId",
          "buildings_and_phases.id"
        )
        .innerJoin(
          "property_units",
          "asset_location.unitId",
          "property_units.id"
        )
        .select([
          "asset_master.id as id",
          "asset_master.assetName as assetName",
          "companies.companyName as companyName",
          "projects.projectName as projectName",
          "buildings_and_phases.buildingPhaseCode as buildingPhaseCode",
          "property_units.unitNumber as unitNumber",
          "property_units.houseId as houseId",
          "asset_location.createdAt as createdAt",
          "asset_location.updatedAt as updatedAt",
          "asset_master.displayId",
        ])
        .where({ serviceRequestId })
        .orderBy("asset_location.createdAt", "desc");

      return res.status(200).json({ data: { assets } });
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
  replaceAsset: async (req, res) => {
    try {
      let replaced;
      let location_update;
      let {
        oldAssetId,
        newAssetId,
        serviceRequestId,
        newAssetLocation,
      } = req.body;
      let currentTime = new Date().getTime();
      await Promise.all([
        knex("asset_location")
          .update({
            endDate: currentTime,
            serviceRequestId,
          })
          .where({ assetId: oldAssetId, orgId: req.orgId }),
        knex("asset_location").insert({
          assetId: oldAssetId,
          startDate: currentTime,
          orgId: req.orgId,
        }),
      ]);

      replaced = await knex("replaced_assets").insert({
        oldAssetId,
        newAssetId,
        startDate: currentTime,
        // endDate: currentTime,
        entityId: serviceRequestId,
        entityType: "service_requests",
        orgId: req.orgId,
        createdAt: currentTime,
        updatedAt: currentTime,
      });
      location_update = await knex(
        "asset_location"
      ).insert({
        ...newAssetLocation,
        assetId: newAssetId,
        createdAt: currentTime,
        updatedAt: currentTime,
        serviceRequestId,
        startDate: currentTime,
        orgId: req.orgId,
        serviceRequestId,
      });
      // Change the old asset location to null

      return res.status(200).json({
        data: {
          replaced,
          location_update,
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
  getReplacedAssetList: async (req, res) => {
    try {
      let { serviceRequestId } = req.body;
      let replacedAssetList;

      replacedAssetList = await knex("replaced_assets")
        .select([
          "oldAssetId",
          "newAssetId",
          "startDate",
          "endDate",
        ])
        .where({
          "replaced_assets.entityId": serviceRequestId,
          "replaced_assets.entityType": "service_requests",
        });

      const Parallel = require("async-parallel");
      const assetNames = await Parallel.map(
        replacedAssetList,
        async (item) => {
          let { oldAssetId, newAssetId } = item;
          let old = await knex("asset_master")
            .select("assetName")
            .where({ id: oldAssetId })
            .first();
          let newa = await knex("asset_master")
            .select("assetName")
            .where({ id: newAssetId })
            .first();
          return {
            oldAssetName: old.assetName,
            newAssetName: newa.assetName,
            ...item,
          };
        }
      );

      return res.status(200).json({
        data: {
          replacedAssetList: assetNames,
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
  getAssetListForReplace: async (req, res) => {
    try {
      let reqData = req.query;
      let total, rows;
      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;

      [total, rows] = await Promise.all([
        knex("asset_master")
          .leftJoin(
            "asset_location",
            "asset_location.assetId",
            "asset_master.id"
          )
          .leftJoin(
            "companies",
            "asset_location.companyId",
            "companies.id"
          )
          .leftJoin(
            "projects",
            "asset_location.projectId",
            "projects.id"
          )
          .leftJoin(
            "buildings_and_phases",
            "asset_location.buildingId",
            "buildings_and_phases.id"
          )
          .leftJoin(
            "floor_and_zones",
            "asset_location.floorId",
            "floor_and_zones.id"
          )
          .leftJoin(
            "property_units",
            "asset_location.unitId",
            "property_units.id"
          )
          .select([
            "asset_master.id as id",
            "asset_master.assetName",
            "companies.companyName",
            "companies.id as companyId",
            "projects.projectName as projectName",
            "projects.id as projectId",
            "buildings_and_phases.buildingPhaseCode as buildingPhaseCode",
            "buildings_and_phases.id as buildingId",
            "floor_and_zones.floorZoneCode as floorZoneCode",
            "floor_and_zones.id as floorId",
            "property_units.unitNumber as unitNumber",
            "property_units.id as unitId",
            "property_units.houseId as houseId",
            "asset_master.displayId",
          ])
          .distinct(["asset_location.assetId"])
          .where({ "asset_master.orgId": req.orgId }),
        knex("asset_master")
          .leftJoin(
            "asset_location",
            "asset_location.assetId",
            "asset_master.id"
          )
          .leftJoin(
            "companies",
            "asset_location.companyId",
            "companies.id"
          )
          .leftJoin(
            "projects",
            "asset_location.projectId",
            "projects.id"
          )
          .leftJoin(
            "buildings_and_phases",
            "asset_location.buildingId",
            "buildings_and_phases.id"
          )
          .leftJoin(
            "floor_and_zones",
            "asset_location.floorId",
            "floor_and_zones.id"
          )
          .leftJoin(
            "property_units",
            "asset_location.unitId",
            "property_units.id"
          )
          .select([
            "asset_master.id as id",
            "asset_master.assetName",
            "companies.companyName",
            "projects.projectName as projectName",
            "buildings_and_phases.buildingPhaseCode as buildingPhaseCode",
            "floor_and_zones.floorZoneCode as floorZoneCode",
            "property_units.unitNumber as unitNumber",
            "property_units.houseId as houseId",
            "asset_master.displayId",
          ])
          .distinct(["asset_location.assetId"])
          .where({ "asset_master.orgId": req.orgId })
          .offset(offset)
          .limit(per_page),
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
          assets: pagination,
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
  deleteServiceAssignedAsset: async (req, res) => {
    try {
      const id = req.body.id;
      // deleteRow = filtered;
      const deletedRow = await knex("assigned_assets")
        .where({ id, entityType: "service_requests" })
        .del()
        .returning(["*"]);
      let resultData = deletedRow.rows;
      return res.status(200).json({
        data: {
          resultData,
          message: "Deleted row successfully!",
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
  removePartFromAsset: async (req, res) => {
    try {
      const data = req.body;
      if (data.assetId) {
        await knex("asset_master")
          .update({ partId: null })
          .where({ id: data.assetId });
        return res
          .status(200)
          .json({ message: "Part removed succesfully" });
      } else {
        return res
          .status(200)
          .json({
            message:
              "Something went wrong while removing part. Make sure you send partId and assetId in the body request.",
          });
      }
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
  getUnitDetailsByUnitNumber: async (req, res) => {
    try {
      //   let projectIds = [];
      //   let projectsForPracel = req.userProjectResources
      //   projectsForPracel = projectsForPracel.find(pfp => pfp.id == 10)
      //   console.log('Project For Parcel:', projectsForPracel);
      //   let accessibleProjects = projectsForPracel.projects;
      //   console.log('Project For Parcel:', accessibleProjects);
      //   projectIds =  _.uniqBy(accessibleProjects);
      //   console.log('ProjectIds:', projectIds);

      let payload = req.body;

      console.log("data in payload", payload);

      let units = await knex
        .from("property_units")
        .leftJoin(
          "companies",
          "property_units.companyId",
          "companies.id"
        )
        .leftJoin(
          "projects",
          "property_units.projectId",
          "projects.id"
        )
        .leftJoin(
          "buildings_and_phases",
          "property_units.buildingPhaseId",
          "buildings_and_phases.id"
        )
        .innerJoin(
          "floor_and_zones",
          "property_units.floorZoneId",
          "floor_and_zones.id"
        )
        .select([
          "property_units.companyId as companyId",
          "companies.companyName as companyName",
          "property_units.projectId as projectId",
          "projects.projectName as projectName",
          "property_units.buildingPhaseId as buildingPhaseId",
          "buildings_and_phases.buildingPhaseCode as buildingPhaseCode",
          "buildings_and_phases.description as buildingDescription",
          "property_units.floorZoneId as floorZoneId",
          "floor_and_zones.floorZoneCode as floorZoneCode",
          "floor_and_zones.description",
          "property_units.unitNumber as unitNumber",
          "property_units.id as unitId",
          "property_units.houseId"
        ])
        .where({
          "property_units.isActive": true,
          "property_units.orgId": req.orgId,
        })
        .where(
          "property_units.unitNumber",
          "iLIKE",
          `%${payload.unitNumber}%`
        )
        .where(
          "property_units.companyId",
          payload.companyId
        ).where(
            "property_units.type",payload.type
        );
      //   .whereIn("property_units.projectId",projectIds);

      return res.status(200).json({
        data: {
          units,
        },
        message: "Property units data",
      });
    } catch (error) {
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
};

module.exports = assetController;
