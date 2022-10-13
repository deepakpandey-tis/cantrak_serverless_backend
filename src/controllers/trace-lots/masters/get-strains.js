const knexReader = require('../../../db/knex-reader');

const getStrains = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let payload = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        sqlSelect = `SELECT s.*, s2."name" "specieName"
        `;

        sqlFrom = ` FROM strains s, species s2`;

        sqlWhere = ` WHERE s."orgId" = ${orgId} AND s."isActive" AND s."specieId" = s2.id AND s2."isActive"`;

        sqlOrderBy = ` ORDER BY s.name asc`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;
        
        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                records: selectedRecs.rows
            },
            message: "Strains!"
        });
    } catch (err) {
        console.log("[controllers][trace-lots][masters][getStrains] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getStrains;

/**
 */
