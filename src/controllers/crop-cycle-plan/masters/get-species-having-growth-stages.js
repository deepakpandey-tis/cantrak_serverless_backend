const knexReader = require('../../../db/knex-reader');

const getSpeciesHavingGrowthStages = async (req, res) => {
    try {
        let result;
        let orgId = req.me.orgId;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;
 
        sqlSelect = `SELECT DISTINCT s."id", s."name"
        `;

        sqlFrom = ` FROM species s, growth_stages gs`;

        sqlWhere = ` WHERE s."orgId" = ${orgId} AND s."isActive" AND s."id" = gs."specieId"`;

        sqlOrderBy = ` ORDER BY s.name asc`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;
        
        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                records: selectedRecs.rows
            },
            message: "Species having growth stages!"
        });

    } catch (err) {
        console.log("[controllers][crop-cycle-plan][masters][getSpeciesHavingGrowthStages] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getSpeciesHavingGrowthStages;

/**
 */
