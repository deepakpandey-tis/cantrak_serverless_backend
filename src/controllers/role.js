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

             let {roleName,resourceName} = req.body;
             let payload                 = req.body;
             const schema = Joi.object().keys({
                 roleName     : Joi.string().required(),
                 resourceName : Joi.array().items(Joi.string().required()).strict().required(),
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

            if(resourceName.length>0){


              for(let resourceId of resourceName) {

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
    }
}

module.exports = roleController