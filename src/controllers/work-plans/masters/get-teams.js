const knexReader = require('../../../db/knex-reader');

const getTeams = async (req, res) => {
    try {
        let orgId = req.me.orgId;

        let payload = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;
        let sqlStrTeamUsers;

        sqlSelect = `SELECT DISTINCT t.*`;

        sqlStrTeamUsers = `, (SELECT jsonb_agg(row_to_json(usrs.*)) "users"`;
        sqlStrTeamUsers += ` FROM (SELECT tu.id "teamUserId", tu."userId", u."name" FROM team_users tu, users u WHERE t."teamId" = tu."teamId" AND tu."userId" = u.id ORDER BY u."userName") usrs)`;

        sqlFrom = ` FROM teams t, team_roles_project_master trpm, organisation_roles or2`;

        sqlWhere = ` WHERE t."orgId" = ${orgId} AND t."isActive"`;
        sqlWhere += ` AND t."teamId" = trpm."teamId" AND trpm."roleId" = or2.id AND or2."isActive"`;
        sqlWhere += ` AND trpm."locationId" IN (${req.GROWINGLOCATION})`;

        sqlOrderBy = ` ORDER BY t."teamName" asc`;

        sqlStr = sqlSelect + sqlStrTeamUsers + sqlFrom + sqlWhere + sqlOrderBy;
        
        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                records: selectedRecs.rows
            },
            message: "Teams!"
        });
    } catch (err) {
        console.log("[controllers][work-plans][masters][getTeams] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getTeams;

/**
 */
