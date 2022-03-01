const knexReader = require('../../../db/knex-reader');

const getCompanies = async (req, res) => {
    try {
        let pagination = {};
        let role = req.me.roles[0];
        let name = req.me.name;
        let result;
        let orgId = req.query.orgId;
        if (role === "superAdmin" && name === "superAdmin") {

            if (orgId) {

                [result] = await Promise.all([
                    knexReader("companies")
                        .select("id", "companyId", "companyName as CompanyName")
                        .where({ isActive: true, orgId: orgId })
                        .orderBy('companies.companyId', 'asc')
                ]);

            } else {
                [result] = await Promise.all([
                    knexReader("companies")
                        .select("id", "companyId", "companyName as CompanyName")
                        .where({ isActive: true })
                        .orderBy('companies.companyId', 'asc')
                ]);
            }
        } else {

            [result] = await Promise.all([
                knexReader("companies")
                    .select("id", "companyId", "companyName as CompanyName")
                    .where({ isActive: true, orgId: req.orgId })
                    .orderBy('companies.companyId', 'asc')
            ]);
        }

        pagination.data = result;
        return res.status(200).json({
            data: {
                companies: pagination
            },
            message: "Companies List!"
        });
    } catch (err) {
        console.log("[controllers][mis][masters][getCompanies] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getCompanies;

/**
 */
