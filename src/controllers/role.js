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
                                  .into('roles');

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

        let roleresult = await knex('roles').where({id:payload.id}).returning(['*'])
                         .select([
                           'id',
                           'roles.name as roleName',
                           'createdAt'
                         ])
          role  = roleresult[0]

          let resourceResult = await knex('role_resource_master').where({roleId:payload.id})
                               .returning(['*'])
                               .select([
                                 'resourceId as resourceIds',
                                 'roleId'
                                ])
              resource  =    resourceResult;
          return res.status(200).json({
          data: {
            roleDetails: {...role,...resource}
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
    roleList: async (req, res) => {
      try {
        let reqData    = req.query;
        let total,rows;
        let {organisationName,userName,email} = req.body;
        let pagination = {};
        let per_page   = reqData.per_page || 10;
        let page       = reqData.current_page || 1;
        if (page < 1) page = 1;
        let offset = (page - 1) * per_page;
  
  
       if(organisationName || userName || email){
  
         [total, rows] = await Promise.all([
          knex
            .count("* as count")
            .from("organisations")
            .leftJoin('users','organisations.id','users.orgId')
            .where(qb=>{
              if(organisationName){
              qb.where('organisations.organisationName','like',`%${organisationName}%`)
              }
              if(userName){
                qb.where('users.name','like',`%${userName}%`)
                }
                if(email){
                  qb.where('users.email','like',`%${email}%`)
                  }
  
            })
            .first(),
          knex("organisations")
            .leftJoin('users','organisations.id','users.orgId')
            .select([
              'organisations.*',
              'users.name',
              'users.email',
              'users.mobileNo'
            ])
            .where(qb=>{
              if(organisationName){
              qb.where('organisations.organisationName','like',`%${organisationName}%`)
              }
              if(userName){
                qb.where('users.name','like',`%${userName}%`)
                }
                if(email){
                  qb.where('users.email','like',`%${email}%`)
                  }
  
            })
            .orderBy('organisations.createdAt','desc')
            .offset(offset)
            .limit(per_page)
        ]);
  
       } else {
  
         [total, rows] = await Promise.all([
          knex
            .count("* as count")
            .from("organisations")
            .leftJoin('users','organisations.id','users.orgId')
            .first(),
          knex("organisations")
            .leftJoin('users','organisations.id','users.orgId')
            .select([
              'organisations.*',
              'users.name',
              'users.email',
              'users.mobileNo'
            ])
            .orderBy('organisations.createdAt','desc')
            .offset(offset)
            .limit(per_page)
        ]);
  
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
            organisations: pagination
          },
          message: "Organisation List!"
        });
      } catch (err) {
        console.log("[controllers][organisation][getOrganisationList] :  Error", err);
        //trx.rollback
        res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
      }
    }
}

module.exports = roleController