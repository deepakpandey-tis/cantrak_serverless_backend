const knex = require('../../db/knex');

// It is a copy of facility_booking.getTenantByUnit()
const getUnitTenants = async (req, res) => {
    try {
        const { unitId } = req.body;

        let getTenants = await knex
            .from("user_house_allocation")
            .leftJoin("users", "user_house_allocation.userId", "users.id")
            .select(["users.name", "users.id", "user_house_allocation.id as userHouseAllocationId"])
            .where({ "user_house_allocation.houseId": unitId, "users.isActive": true });
        // console.log("getTenants", getTenants);
        return res.status(200).json({
            data: {
                tenants: getTenants,
            },
        });
    } catch (err) {
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });
    }
}

module.exports = getUnitTenants;
