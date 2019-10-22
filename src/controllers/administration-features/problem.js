const Joi = require('@hapi/joi');
const moment = require('moment');
const uuidv4 = require('uuid/v4');
var jwt = require('jsonwebtoken');
const _ = require('lodash');
const XLSX  = require('xlsx');


const knex = require('../../db/knex');

const bcrypt = require('bcrypt');
const saltRounds = 10;
//const trx = knex.transaction();

const problemController = {
  getProblems: async (req, res) => {
    // List with filter and pagination
    try {

      let reqData = req.query;
      let filters = req.body;
      let total, rows

      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;

      if (_.isEmpty(filters)) {
        [total, rows] = await Promise.all([
          knex.count('* as count').from("incident_sub_categories")
          .innerJoin('incident_categories','incident_sub_categories.incidentCategoryId','incident_categories.id'),
          knex("incident_sub_categories")
          .innerJoin('incident_categories','incident_sub_categories.incidentCategoryId','incident_categories.id')
          .select([
            'incident_categories.categoryCode as Problem Code',
            'incident_sub_categories.descriptionEng as Description(Eng)',
            'incident_sub_categories.descriptionThai as Description(Thai)',
            'incident_categories.descriptionEng as Category',
            'incident_sub_categories.isActive as Status',
            'incident_sub_categories.createdAt as Date Created',

          ])
          .offset(offset).limit(per_page)
        ])
      } else {
        filters = _.omitBy(filters, val => val === '' || _.isNull(val) || _.isUndefined(val) || _.isEmpty(val) ? true : false)
        try {
          [total, rows] = await Promise.all([
            knex.count('* as count').from("incident_sub_categories")
            .innerJoin('incident_categories','incident_sub_categories.incidentCategoryId','incident_categories.id')
            .where(filters).offset(offset).limit(per_page),
            knex("incident_sub_categories")
            .innerJoin('incident_categories','incident_sub_categories.incidentCategoryId','incident_categories.id')
            .select([
              'incident_categories.categoryCode as Problem Code',
              'incident_sub_categories.descriptionEng as Description(Eng)',
              'incident_sub_categories.descriptionThai as Description(Thai)',
              'incident_categories.descriptionEng as Category',
              'incident_sub_categories.isActive as Status',
              'incident_sub_categories.createdAt as Date Created',
  
            ])
            .where(filters).offset(offset).limit(per_page)
          ])
        } catch (e) {
          // Error
          console.log('Error: ' + e.message)
        }
      }

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
          problems: pagination
        },
        message: 'Problems List!'
      })
    } catch (err) {
      console.log('[controllers][quotation][list] :  Error', err);
      return res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
    // Export Problem Data
  },exportProblem:async (req,res)=>{
    try {

      let reqData = req.query;
      let filters = req.body;
      let total, rows

      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;

      if (_.isEmpty(filters)) {
        [total, rows] = await Promise.all([
          knex.count('* as count').from("incident_sub_categories")
          .innerJoin('incident_categories','incident_sub_categories.incidentCategoryId','incident_categories.id'),
          knex("incident_sub_categories")
          .innerJoin('incident_categories','incident_sub_categories.incidentCategoryId','incident_categories.id')
          .select([
            'incident_categories.categoryCode as Problem Code',
            'incident_sub_categories.descriptionEng as Description(Eng)',
            'incident_sub_categories.descriptionThai as Description(Thai)',
            'incident_categories.descriptionEng as Category',
            'incident_sub_categories.isActive as Status',
            'incident_sub_categories.createdAt as Date Created',

          ])
          .offset(offset).limit(per_page)
        ])
      } else {
        filters = _.omitBy(filters, val => val === '' || _.isNull(val) || _.isUndefined(val) || _.isEmpty(val) ? true : false)
        try {
          [total, rows] = await Promise.all([
            knex.count('* as count').from("incident_sub_categories")
            .innerJoin('incident_categories','incident_sub_categories.incidentCategoryId','incident_categories.id')
            .where(filters).offset(offset).limit(per_page),
            knex("incident_sub_categories")
            .innerJoin('incident_categories','incident_sub_categories.incidentCategoryId','incident_categories.id')
            .select([
              'incident_categories.categoryCode as Problem Code',
              'incident_sub_categories.descriptionEng as Description(Eng)',
              'incident_sub_categories.descriptionThai as Description(Thai)',
              'incident_categories.descriptionEng as Category',
              'incident_sub_categories.isActive as Status',
              'incident_sub_categories.createdAt as Date Created',
  
            ])
            .where(filters).offset(offset).limit(per_page)
          ])
        } catch (e) {
          // Error
          console.log('Error: ' + e.message)
        }
      }

      
      
      var wb = XLSX.utils.book_new({sheet:"Sheet JS"});
      var ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "pres");
      XLSX.write(wb, {bookType:"csv", bookSST:true, type: 'base64'})
      let filename = "uploads/ProblemData-"+Date.now()+".csv";
      let  check = XLSX.writeFile(wb,filename);

      return res.status(200).json({
        data: rows,
        message: 'Problem Data Export Successfully!'
      })
    } catch (err) {
      console.log('[controllers][quotation][list] :  Error', err);
      return res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
    
  }
}

module.exports = problemController