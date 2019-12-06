const knex = require("../db/knex");
const Joi = require("@hapi/joi");
const roleController = {
    test: async(req,res) => {
        res.status(200).json({ok:true})
    },
    assignRoleToResources: async (req,res) => {
        try {
            let payload = req.body;
            const schema = Joi.object().keys({
                roleId:Joi.string().required(),
                resourceId:Joi.string().required()
            })
            const result = Joi.validate(schema,payload)
            if (result && result.hasOwnProperty("error") && result.error) {
              return res.status(400).json({
                errors: [
                  { code: "VALIDATION_ERROR", message: result.error.message }
                ]
              });
            }
            let currentTime = new Date().getTime()
            const insertPaload = payload.map(e => ({...e,updatedAt:currentTime,createdAt:currentTime}))
            const insertedResults = await knex("role_resource_master").insert(insertPaload).returning(['*'])
            return res.status(200).json({
                data: {
                    insertedResults
                },
                message:'Roles are assigned resources'
            })
        } catch(err) {
            console.log("[controllers][entrance][signup] :  Error", err);
            res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    /* ROLE SETUP*/
    roleSetup:async (req,res)=>{
        try{
          let role     = null;
          let resource = null;
          let orgId    = req.orgId;
            await knex.transaction(async trx=>{

             let {roleName,resourceIds} = req.body;
             let payload                 = req.body;
             const schema = Joi.object().keys({
                 roleName     : Joi.string().required(),
                 resourceIds : Joi.array().items(Joi.string().required()).strict().required(),
             })

            const result = Joi.validate(payload ,schema);
              console.log("[controllers][role][roleSetup]: JOi Result",result);
        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }
        let currentTime = new Date().getTime();
            /*ROLE INSERT OPEN */
            let insertRole  = {
                       name:roleName,
                       orgId:orgId,
                       createdAt:currentTime,
                       updatedAt:currentTime
                             }
           let roleResult = await knex.insert(insertRole)
                                  .returning(['*'])
                                  .transacting(trx)
                                  .into('organisation_roles');

            role          = roleResult[0];
            /*ROLE INSERT CLOSE */           

            if(resourceIds.length>0){

              for(let resourceId of resourceIds) {

              let insertData = {
                               roleId:role.id,
                               resourceId:resourceId,
                               orgId :orgId,
                               createdAt:currentTime,
                               updatedAt:currentTime
                               } 
              let resourceResult = await knex.insert(insertData).returning(['*'])
               .transacting(trx).into('role_resource_master');               
              resource       = resourceResult[0]
                              }
           
            }
            })
             
            return res.status(200).json({
              data: {
                roleResultData: {...role,...resource}
              },
              message: "Role Setup successfully!."
            });

        }catch(err){
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
                });
        }
    },
    /*ROLE DETAILS */
    roleDetails:async (req,res)=>{
      try{
        let role     = null;
        let resource = null;
        let payload  = req.body; 
        const schema = Joi.object().keys({
          id    : Joi.string().required()
      })
     const result = Joi.validate(payload ,schema);
       console.log("[controllers][role][roleSetup]: JOi Result",result);
        if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [
            { code: "VALIDATION_ERROR", message: result.error.message }
          ]
        });
        }

        let roleresult = await knex.from('organisation_roles')
                        .leftJoin('organisations','organisation_roles.orgId','organisations.id')
                        .where({'organisation_roles.id':payload.id})
                         .select([
                           'organisation_roles.id',
                           'organisation_roles.name as roleName',
                           'organisations.organisationName',
                           'organisation_roles.createdAt'
                         ])
          role  = roleresult[0]

          let resourceResult = await knex.from('role_resource_master')
                                     .leftJoin('resources','role_resource_master.resourceId','resources.id')                    
                                     .where({'role_resource_master.roleId':payload.id})
                                      .select([
                                        'role_resource_master.resourceId as resourceIds',
                                        'role_resource_master.roleId',
                                        'resources.resourceName'
                                      ])
              resource  =    resourceResult;
          return res.status(200).json({
          data: {
            roleDetails: {...role, resourceData:resource}
          },
          message: "Role Details successfully!."
        });

      }catch(err){
        res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
          });
      }
    },
    /*ROLE LIST*/
    getOrgRoleList: async (req, res) => {
      try {
        let reqData    = req.query;
        let total,rows;
        let pagination = {};
        let per_page   = reqData.per_page || 10;
        let page       = reqData.current_page || 1;
        if (page < 1) page = 1;
        let offset = (page - 1) * per_page;
  
         [total, rows] = await Promise.all([
           knex
             .count("* as count")
             .from("organisation_roles")
             .leftJoin(
               "organisations",
               "organisation_roles.orgId",
               "organisations.id"
             )
             .where({ "organisation_roles.orgId": req.orgId })
             .first(),
           knex("organisation_roles")
             .leftJoin(
               "organisations",
               "organisation_roles.orgId",
               "organisations.id"
             )
             .where({ "organisation_roles.orgId": req.orgId })
             .select(["organisation_roles.*", "organisations.organisationName"])
             .orderBy("organisation_roles.createdAt", "desc")
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
        return res.status(200).json({
          data: {
            organisations: pagination
          },
          message: "Organisation role List!"
        });
      } catch (err) {
        console.log("[controllers][role][getOrganisationList] :  Error", err);
        //trx.rollback
        res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
      }
    },
      /* GET UPDATE ROLE DETAILS */
      getUpdateRoleDetails:async (req,res)=>{
        try{
          let role     = null;
          let resource = null;
          let payload  = req.body; 
          const schema = Joi.object().keys({
            id    : Joi.string().required()
        })
       const result = Joi.validate(payload ,schema);
         console.log("[controllers][role][roleSetup]: JOi Result",result);
          if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
          }
  
          let roleresult = await knex.from('organisation_roles')
                          .leftJoin('organisations','organisation_roles.orgId','organisations.id')
                          .where({'organisation_roles.id':payload.id})
                           .select([
                             'organisation_roles.id',
                             'organisation_roles.name as roleName',
                             'organisations.organisationName',
                             'organisation_roles.createdAt'
                           ])
            role  = roleresult[0]
  
            let resourcearr   = [];
            let resourceResult = await knex.from('role_resource_master')                                       
                                       .where({'role_resource_master.roleId':payload.id})
                                        .select([
                                          'role_resource_master.resourceId'
                                        ])
              for(resources of resourceResult){ 
          
                         resourcearr.push(resources.resourceId)
              }


            return res.status(200).json({
            data: {
              roleDetails: {...role, resourceIds:resourcearr}
            },
            message: "Role Details successfully!."
          });
  
        }catch(err){
          res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
      },
      /**UPDATE ORG ROLE */
      updateOrgRole:async (req,res)=>{

        try{
          let role     = null;
          let resource = null;
          let orgId    = req.orgId;
            await knex.transaction(async trx=>{

             let {roleName,resourceIds} = req.body;
             let payload                 = req.body;
             const schema = Joi.object().keys({
                 id          : Joi.string().required(),
                 roleName    : Joi.string().required(),
                 resourceIds : Joi.array().items(Joi.string().required()).strict().required(),
             })

            const result = Joi.validate(payload ,schema);
              console.log("[controllers][role][roleSetup]: JOi Result",result);
        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }
        let currentTime = new Date().getTime();
            /*ROLE UPDATE OPEN */
            let insertRole  = {
                       name:roleName,
                       updatedAt:currentTime
                             }
           let roleResult = await knex.update(insertRole)
                                  .returning(['*'])
                                  .transacting(trx)
                                  .into('organisation_roles')
                                  .where({'id':payload.id});

            role          = roleResult[0];
            /*ROLE UPDATE CLOSE */           

            if(resourceIds.length>0){

              let delData = await knex('role_resource_master').where({roleId:role.id}).del();
              for(let resourceId of resourceIds) {              
              let insertData = {
                               roleId:role.id,
                               resourceId:resourceId,
                               orgId :orgId,
                               createdAt:currentTime,
                               updatedAt:currentTime
                               } 
              let resourceResult = await knex.insert(insertData).returning(['*'])
               .transacting(trx).into('role_resource_master');               
              resource       = resourceResult[0]
                              }                
            }
            })
             
            return res.status(200).json({
              data: {
                roleResultData: {...role,...resource}
              },
              message: "Role Update successfully!."
            });

        }catch(err){
          res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }

      },
      /**DELETE ORG ROLE */
      deleteOrgRole : async (req,res)=>{
        try{

          let id   = req.body.id
          let role = null;

          let delData = await knex.update({isActive:false})
                             .into('organisation_roles')
                             .returning(['*'])
                             .where({id:id})
              role       = delData[0];

              return res.status(200).json({
                data: {
                  roleResultData: {role}
                },
                message: "Role Delete successfully!."
              });
        }catch(err){
          res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
      },
      /**GET ORG ROLE ALL LIST */
      getOrgRoleAllList: async(req,res)=>{
        try{
          let result = await knex("organisation_roles").where({orgId:req.orgId})
          
          return res.status(200).json({
            data: {
              roles: result
            },
            message: "Organisation role all List!"
          });

          }catch(err){
            res.status(500).json({
              errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
              });
          }
      }

    }

module.exports = roleController