const knex = require('../db/knex');


const resourceController = {
    getResourceList: async (req,res) => {
        try {
            const resources = await knex('resources').select('*')
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