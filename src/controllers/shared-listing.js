const Joi = require('@hapi/joi');
const _ = require('lodash');

const knex = require('../db/knex');
const XLSX = require('xlsx');
const fs = require('fs')
const request = require("request");
const path = require("path");
const QRCode = require('qrcode')
const uuid = require('uuid/v4')
const moment = require('moment')
const assetController = {


  getAssetList: async (req, res) => {

    res.json("dsfsdfsd")
    // name, model, area, category
    try {

      let reqData = req.query;

      //let filters = {}
      let total, rows
      let {
        assetName,
        assetModel,
        // area,
        category,
      } = req.body;
      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;

      //  if(assetName){
      //   filters['asset_master.assetName'] = assetName
      //  }
      //  if(assetModel){
      //     filters['asset_master.model'] = assetModel
      //  }
      //  if(area){
      //     filters['asset_master.areaName'] = area
      //  }
      //  if(category){
      //     filters['asset_category_master.categoryName'] = category
      //  }


      // if (_.isEmpty(filters)) {
      //     [total, rows] = await Promise.all([
      //         knex.count('* as count').from("asset_master")
      //         .leftJoin('location_tags','asset_master.id','location_tags.entityId')
      //         .leftJoin('location_tags_master','location_tags.locationTagId','location_tags_master.id')
      //         .leftJoin('asset_category_master','asset_master.assetCategoryId','asset_category_master.id')
      //         .first(),

      //         knex("asset_master")
      //         .leftJoin('location_tags','asset_master.id','location_tags.entityId')
      //         .leftJoin('location_tags_master','location_tags.locationTagId','location_tags_master.id')
      //         .leftJoin('asset_category_master','asset_master.assetCategoryId','asset_category_master.id')
      //         .select([
      //             'asset_master.assetName as Name',
      //             'asset_master.id as ID',
      //             'location_tags_master.title as Location',
      //             'asset_master.model as Model',
      //             'asset_master.barcode as Barcode',
      //             'asset_master.areaName as Area',
      //             'asset_category_master.categoryName as Category',
      //             'asset_master.createdAt as Date Created',
      //             'asset_master.unitOfMeasure as Unit Of Measure',

      //         ])
      //         .offset(offset).limit(per_page)
      //     ])
      //} else {
      //filters = _.omitBy(filters, val => val === '' || _.isNull(val) || _.isUndefined(val) || _.isEmpty(val) ? true : false)
      try {
        [total, rows] = await Promise.all([
          knex
            .count("* as count")
            .from("asset_master")
            .leftJoin(
              "location_tags",
              "asset_master.id",
              "location_tags.entityId"
            )
            .leftJoin(
              "location_tags_master",
              "location_tags.locationTagId",
              "location_tags_master.id"
            )
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
            .where(qb => {
              if (assetName) {
                qb.where(
                  "asset_master.assetName",
                  "like",
                  `%${assetName}%`
                );
              }
              if (assetModel) {
                qb.where(
                  "asset_master.model",
                  "like",
                  `%${assetModel}%`
                );
              }
              if (category) {
                qb.where(
                  "asset_category_master.categoryName",
                  "like",
                  `%${category}%`
                );
              }
            })
            .first()
            .where({ 'asset_master.orgId': req.orgId }),
          knex("asset_master")
            .leftJoin(
              "location_tags",
              "asset_master.id",
              "location_tags.entityId"
            )
            .leftJoin(
              "location_tags_master",
              "location_tags.locationTagId",
              "location_tags_master.id"
            )
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
            .select([
              "asset_master.assetName as Name",
              "asset_master.id as ID",
              "location_tags_master.title as Location",
              "asset_master.model as Model",
              "asset_master.barcode as Barcode",
              "asset_master.areaName as Area",
              "asset_category_master.categoryName as Category",
              "asset_master.createdAt as Date Created",
              "asset_master.unitOfMeasure as Unit Of Measure",
              "asset_master.price as Price",
              "companies.companyName"
            ])
            .where({ 'asset_master.orgId': req.orgId })
            .where(qb => {
              if (assetName) {
                qb.where(
                  "asset_master.assetName",
                  "like",
                  `%${assetName}%`
                );
              }
              if (assetModel) {
                qb.where(
                  "asset_master.model",
                  "like",
                  `%${assetModel}%`
                );
              }
              if (category) {
                qb.where(
                  "asset_category_master.categoryName",
                  "like",
                  `%${category}%`
                );
              }
            })
            .orderBy("asset_master.createdAt", "desc")
            .offset(offset)
            .limit(per_page)
        ]);
      } catch (e) {
        // Error
        console.log('Error: ' + e.message)
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

      return res.status(200).json({
        data: {
          asset: pagination
        },
        message: 'Asset List!'
      })


      // let assetData = null;
      // assetData = await knex.select().from('asset_master')

      // console.log('[controllers][asset][getAssetList]: Asset List', assetData);

      // assetData = assetData.map(d => _.omit(d, ['createdAt'], ['updatedAt'], ['isActive']));

      // res.status(200).json({
      //     data: assetData,
      //     message: "Asset List"
      // });


    } catch (err) {
      console.log('[controllers][asset][getAssets] :  Error', err);
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },

  getParts: async (req, res) => {
    try {

      let partData = null;
      let reqData = req.query;
      let total, rows
      let pagination = {};


      let { partName,
        partCode,
        partCategory } = req.body;

      if (partName || partCode || partCategory) {

        let per_page = reqData.per_page || 10;
        let page = reqData.current_page || 1;
        if (page < 1) page = 1;
        let offset = (page - 1) * per_page;
        [total, rows] = await Promise.all([
          knex.from("part_master")
            .leftJoin('part_category_master', 'part_master.partCategory', 'part_category_master.id')
            .where({ 'part_master.orgId': req.orgId, 'part_category_master.orgId': req.orgId })
            .where(qb => {
              if (partName) {
                qb.where('part_master.partName', 'iLIKE', `%${partName}%`)
              }
              if (partCode) {
                qb.where('part_master.partCode', 'iLIKE', `%${partCode}%`)

              }
              if (partCategory) {
                qb.where('part_master.partCategory', partCategory)
              }
            })
            .groupBy(['part_master.id'])
            .distinct('part_master.id'),
          //.first(),
          //.innerJoin('part_master', 'part_ledger.partId', 'part_master.id').first(),
          knex.from('part_master')
            .leftJoin('part_category_master', 'part_master.partCategory', 'part_category_master.id')
            .leftJoin('part_ledger', 'part_master.id', 'part_ledger.partId')
            .select([
              'part_master.id as partId',
              'part_master.partName as Name',
              'part_master.partCode as ID',
              knex.raw('SUM("part_ledger"."quantity") as Quantity'),
              knex.raw('MAX("part_ledger"."unitCost") as Price'),
              'part_master.unitOfMeasure',
              'part_category_master.categoryName as Category',
              'part_master.barcode as Barcode',
              'part_master.createdAt as Date Added',
            ])
            .where({ 'part_master.orgId': req.orgId, 'part_category_master.orgId': req.orgId })
            .where(qb => {
              if (partName) {
                qb.where('part_master.partName', 'iLIKE', `%${partName}%`)
              }
              if (partCode) {
                qb.where('part_master.partCode', 'iLIKE', `%${partCode}%`)

              }
              if (partCategory) {
                qb.where('part_master.partCategory', partCategory)
              }
            })
            .orderBy('part_master.createdAt', 'desc')
            .groupBy(['part_master.id', 'part_category_master.id'])
            .distinct('part_master.id')
            .offset(offset).limit(per_page)
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


      } else {

        let per_page = reqData.per_page || 10;
        let page = reqData.current_page || 1;
        if (page < 1) page = 1;
        let offset = (page - 1) * per_page;

        [total, rows] = await Promise.all([
          knex.from("part_master")
            .leftJoin('part_category_master', 'part_master.partCategory', 'part_category_master.id').where({ 'part_master.orgId': req.orgId, 'part_category_master.orgId': req.orgId })
            .groupBy(['part_master.id'])
            .distinct('part_master.id'),
          //.first(),
          //.innerJoin('part_master', 'part_ledger.partId', 'part_master.id').first(),
          knex.from('part_master')
            .leftJoin('part_category_master', 'part_master.partCategory', 'part_category_master.id')
            .leftJoin('part_ledger', 'part_master.id', 'part_ledger.partId')
            .select([
              'part_master.id as partId',
              'part_master.partName as Name',
              'part_master.partCode as ID',
              knex.raw('SUM("part_ledger"."quantity") as Quantity'),
              knex.raw('MAX("part_ledger"."unitCost") as Price'),
              'part_master.unitOfMeasure',
              'part_category_master.categoryName as Category',
              'part_master.barcode as Barcode',
              'part_master.createdAt as Date Added',
            ])
            .where({ 'part_master.orgId': req.orgId, 'part_category_master.orgId': req.orgId })
            .orderBy('part_master.createdAt', 'desc')
            .groupBy(['part_master.id', 'part_category_master.id'])
            .distinct('part_master.id')
            .offset(offset).limit(per_page)
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

      }

      return res.status(200).json({
        data: {
          parts: pagination
        },
        message: 'Parts List!'
      })

    } catch (err) {
      console.log('[controllers][parts][getParts] :  Error', err);
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
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
      let { chargeCode, calculationUnit, description } = req.body;
      [total, rows] = await Promise.all([
        knex
          .count("* as count")
          .from("charge_master")
          .leftJoin("users", "users.id", "charge_master.createdBy")
          .where({ "charge_master.orgId": req.orgId })
          .where(qb => {
            if (chargeCode) {
              qb.where('charge_master.chargeCode', 'iLIKE', `%${chargeCode}%`)
            }
            if (calculationUnit) {
              qb.where('charge_master.calculationUnit', 'iLIKE', `%${calculationUnit}%`)
            }
            if (description) {
              qb.where('charge_master.descriptionEng', 'iLIKE', `%${description}%`)
            }
          })
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
            "charge_master.createdAt as Date Created",
            "charge_master.descriptionEng",
            "charge_master.descriptionThai",
          ])
          .where(qb => {
            if (chargeCode) {
              qb.where('charge_master.chargeCode', 'iLIKE', `%${chargeCode}%`)
            }
            if (calculationUnit) {
              qb.where('charge_master.calculationUnit', 'iLIKE', `%${calculationUnit}%`)
            }
            if (description) {
              qb.where('charge_master.descriptionEng', 'iLIKE', `%${description}%`)
            }
          })
          .orderBy('charge_master.id', 'desc')
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


}

module.exports = assetController;
