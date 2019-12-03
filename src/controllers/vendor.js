const knex = require('../db/knex');

const vendorController = {
    getVendors: async (req, res) => {
        const vendors = await knex.select().from('vendor_master');
        res.status(200).json({
            data: {
                vendors: vendors,
            }
        });
    },
};

module.exports = vendorController;