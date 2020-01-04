const knex = require('../db/knex');

const vendorController = {
    getVendors: async (req, res) => {
        let orgId = req.orgId;
        const vendors = await knex.select().from('vendor_master').where({orgId});
        res.status(200).json({
            data: {
                vendors: vendors,
            }
        });
    },
};

module.exports = vendorController;