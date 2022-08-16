const Joi = require("@hapi/joi");
const knexReader = require("../../db/knex-reader");

const getObservationList = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;
        let sortCol = payload.sortBy;
        let sortOrder = payload.orderBy;

        let reqData = req.query;
        let pageSize = reqData.per_page || 5;
        let pageNumber = reqData.current_page || 1;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        const schema = Joi.object().keys({
            id: Joi.number().required()
        });
        const result = Joi.validate(payload, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: result.error.message }
                ]
            });
        }

        // Setting default values, if not passed
        if(!sortCol || sortCol === ''){
            sortCol = `"id" desc`;
            sortOrder = '';
        }

        if(pageNumber < 1){
            pageNumber = 1;
        }

        if(pageSize < 0){
            pageSize = 10;
        }

        sqlSelect = `SELECT i.*, it."tagData", u2."name" "tagCreatedByName", it."createdAt" "tagCreatedAt"`;
        sqlFrom = ` FROM images i, image_tags it, users u2`;
        sqlWhere = ` WHERE i."entityId" = ${payload.id} AND i."entityType" = 'plant' AND i."orgId" = ${orgId} AND i."orgId" = it."orgId" AND i.id = it."entityId"`;
        sqlWhere += ` AND it."createdBy" = u2.id`;

        sqlOrderBy = ` ORDER BY ${sortCol} ${sortOrder}`;

        sqlStr  = `WITH Main_CTE AS (`;
        sqlStr += sqlSelect + sqlFrom + sqlWhere + `)`;
        sqlStr += `, Count_CTE AS (SELECT COUNT(*) AS "total" FROM Main_CTE)`;     // To get the total number of records
        sqlStr += ` SELECT * FROM Main_CTE, Count_CTE`;
        sqlStr += sqlOrderBy;
        sqlStr += ` OFFSET ((${pageNumber} - 1) * ${pageSize}) ROWS`
        sqlStr += ` FETCH NEXT ${pageSize} ROWS ONLY;`;

        // sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;

        var selectedRecs = await knexReader.raw(sqlStr);

        //  get diseases from diseases table
        for(rec of selectedRecs.rows){
            const ids = [...rec.tagData.plantCondition.diseases];
            sqlStr = `SELECT d.name FROM diseases d, UNNEST(string_to_array(regexp_replace('[ ${ids} ]', '[\\[ \\]]', '', 'g'), ',')::bigint[]) did WHERE d.id = did`;

            // console.log('sql: ', sqlStr);

            var selectedDiseases = await knexReader.raw(sqlStr);

            // console.log('Diseases: ', selectedDiseases.rows.map(r => r.name));

            rec.tagData.plantCondition.diseases = selectedDiseases.rows.map(r => r.name);
            // console.log('record: ', selectedRecs.rows);
        }

        return res.status(200).json({
            data: {
                list: selectedRecs.rows,
                message: "Plant observation detail!"
            }
        });

    } catch (err) {
        console.log("[controllers][plants][getObservationList] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getObservationList;
