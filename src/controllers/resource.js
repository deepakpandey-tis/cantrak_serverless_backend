const knex = require('../db/knex');


const resourceController = {
    getResourceList: async (req,res) => {
        try {
            let resources = null;
            if(req.me.id === '59'){
                resources = await knex('resources').select('*')                
            } else {
                resources = await knex("resources")
                  .innerJoin(
                    "organisation_resources_master",
                    "resources.id",
                    "organisation_resources_master.resourceId"
                  )
                  .select([
                    "resources.*",
                    "organisation_resources_master.resourceId as resourceId",
                    "organisation_resources_master.orgId as orgId",
                    "organisation_resources_master.adminStatus as adminStatus",
                    "organisation_resources_master.userStatus as userStatus",
                  ])
                  .where({ 'organisation_resources_master.orgId': req.orgId });
            }
            return res.status(200).json({
                data: {
                    resources
                },
                message: 'Resource list'
            })
        } catch(err) {
            console.log(
              "[controllers][serviceOrder][addServiceOrder] :  Error",
              err
            );
            //trx.rollback
            res.status(500).json({
              errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    }
}

module.exports = resourceController