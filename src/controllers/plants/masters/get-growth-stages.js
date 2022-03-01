const knexReader = require('../../../db/knex-reader');

const getGrowthStages = async (req, res) => {
    try {
        let result;
        let orgId = req.me.orgId;
        let { specieId } = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        sqlSelect = `SELECT gs.*`;

        sqlFrom = ` FROM growth_stages gs`;

        sqlWhere = ` WHERE gs."orgId" = ${orgId} AND gs."specieId" = ${specieId} AND gs."isActive"`;

        sqlOrderBy = ` ORDER BY gs."listOrder" asc`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;
        
        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                records: selectedRecs.rows
            },
            message: "Growth Stages!"
        });

/*         result = await knexReader('growth_stages')
            .select("id", "name", "specieId")
            .where({ isActive: true, orgId: orgId, specieId: specieId })
            .orderBy([{ column: 'listOrder', order: 'asc' }])

        return res.status(200).json({
            data: {
                records: result
            },
            message: "Growth Stages List!"
        });
 */
    } catch (err) {
        console.log("[controllers][plants][masters][getGrowthStages] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getGrowthStages;

/**
 */
