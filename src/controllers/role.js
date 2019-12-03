const knex = require("../db/knex");

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
    }
}

module.exports = roleController