const knex = require('../../db/knex');

const getUserUnits = async (req, res) => {
    try {
        console.log('getUserUnits: ', req.me)
        let userId = req.me.id

        /* using raw query
        let rows = await knex.from('user_house_allocation as uha')
            .select(['uha.id', 'pu.unitNumber'])
            .where({'uha.orgId': req.me.orgId, 'uha.userId': req.me.id})
            .join('property_units as pu', 'uha.houseId', 'pu.id')
        */

        // Returns only active Units ie. user_house_allocation.status = 1 and property_units.isActive
        let rows = await knex.raw(`SELECT uha.id "userHouseAllocationId", pu."unitNumber" 
        FROM user_house_allocation uha , property_units pu 
        WHERE uha."orgId" = ${req.me.orgId} and uha."userId" = ${req.me.id} and uha."status" = '1' and uha."houseId" = pu.id and pu."isActive" `)

        return res.status(200).json({
            data: {
                userUnitNumbers: rows.rows
            },
            message: 'User house list!'
           });
           console.log(data)
         } catch (err) {
        console.log("[controllers][Visitor][getUserUnits] :  Error", err);
        return res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });
    }
    
    /* Sample result
    const result = {
        data: {
            userUnitNumbers: [{userHouseAllocationId: 1, unitNumber: "888/258"}, {userHouseAllocationId: 2, unitNumber: "888/259"}],
            message: "User house list!"
        }
    };
    */
}

module.exports = getUserUnits;
