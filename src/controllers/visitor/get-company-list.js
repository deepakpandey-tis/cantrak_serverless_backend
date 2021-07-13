const knex = require('../../db/knex');

const getCompanyList = async (req, res) => {
    try {
        const visitorModule = 15;

        let orgId = req.me.orgId;
        let userId = req.me.id;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        let companyList = null;

        sqlSelect = `SELECT c.id, c."orgId", c."companyName"`;

        sqlFrom = ` FROM companies c`;

        // Active Companies
        sqlWhere = ` WHERE`;
        sqlWhere += ` c."orgId" = ${orgId} and c."isActive"`;
        sqlWhere = ` ORDER BY c."companyName" ASC`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere;
        //console.log('get-checkin-visitors: ', sqlStr);
        var selectedRecs = await knex.raw(sqlStr);

        companyList = selectedRecs.rows;

        const result = {
            data: {
                list: companyList,
                message: "Company list!"
            }
        }
        //console.log(result.data);

        return res.status(200).json({
            data: result.data
        });

    } catch (err) {
        console.log("[controllers][Visitor][getCompanyList] :  Error", err);
        return res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
    });
    
    }

}

module.exports = getCompanyList;
