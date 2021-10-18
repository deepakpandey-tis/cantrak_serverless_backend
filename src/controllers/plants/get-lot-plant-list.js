const knexReader = require('../../db/knex-reader');

const getLotPlantList = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;
        let sdt, edt;

        let payload = req.body;
        let sortCol = payload.sortBy;
        let sortOrder = payload.orderBy;

        let reqData = req.query;
        let pageSize = reqData.per_page || 10;
        let pageNumber = reqData.current_page || 1;

        let { id, locationId, plantSerial } = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        // Setting default values, if not passed
        if(!sortCol || sortCol === ''){
            sortCol = 'plantSerial';
        }

        if(!sortOrder || sortOrder === ''){
            sortOrder = 'desc';
        }

        if(pageNumber < 1){
            pageNumber = 1;
        }

        if(pageSize < 0){
            pageSize = 10;
        }
        
        // Using CTE (Common Table Expressions 'SELECT in WITH' for pageSize retrieval)
        sqlSelect = `SELECT pl.*, p.id "plantId", p."plantSerial", p."isActive" "plantIsActive", p."isWaste" "plantIsWaste", p."isDestroy" "plantIsDestroy", p."isEndOfLife" "plantIsEndOfLife"
        , ploc.id "plantLocationId", l.name "plantLocationName", pgs."growthStageId" "plantGrowthStageId", pgs."startDate" "plantGrowthStageDate", gs.name "plantGrowthStageName"
        , s.name "strainName", s2.name "specieName"
        `;

        sqlFrom = ` FROM plant_lots pl, plants p, plant_locations ploc, plant_growth_stages pgs, locations l, growth_stages gs
        , strains s, species s2
        `;

        sqlWhere = ` WHERE pl.id = ${id} AND pl."orgId" = ${orgId} AND pl.id = p."plantLotId" AND p."isActive" AND NOT p."isWaste"`;
        sqlWhere += ` AND p.id = ploc."plantId" AND ploc.id = (select id from plant_locations ploc2 where ploc2."plantId" = p.id order by id desc limit 1)`;
        sqlWhere += ` AND p.id = pgs."plantId" AND pgs.id = (select id from plant_growth_stages pgs2 where pgs2."plantId" = p.id order by id desc limit 1)`;
        sqlWhere += ` AND ploc."locationId" = l.id AND pgs."growthStageId" = gs.id`;
        sqlWhere += ` AND pl."strainId" = s.id AND pl."specieId" = s2.id`;

        if(locationId && locationId != ''){
            sqlWhere += ` AND ploc."locationId" = ${locationId}`;
        }

        if(plantSerial && plantSerial != ''){
            sqlWhere += ` AND p."plantSerial" iLIKE '%${plantSerial}%'`;
        }

/*         if(fromDate && fromDate != ''){
            sdt = new Date(fromDate).getTime()
            sqlWhere += ` AND p2."plantedOn" >= ${sdt}`;
        }

        if(endDate && endDate != ''){
            edt = new Date(endDate).getTime()
            sqlWhere += ` AND p2."plantedOn" <= ${edt}`;
        }
 */
        sqlOrderBy = ` ORDER BY "${sortCol}" ${sortOrder}`;
        //console.log('getLotPlantList sql: ', sqlSelect + sqlFrom + sqlWhere);

        sqlStr  = `WITH Main_CTE AS (`;
        sqlStr += sqlSelect + sqlFrom + sqlWhere + `)`;
        sqlStr += `, Count_CTE AS (SELECT COUNT(*) AS "total" FROM Main_CTE)`;     // To get the total number of records
        sqlStr += ` SELECT * FROM Main_CTE, Count_CTE`;
        sqlStr += sqlOrderBy;
        sqlStr += ` OFFSET ((${pageNumber} - 1) * ${pageSize}) ROWS`
        sqlStr += ` FETCH NEXT ${pageSize} ROWS ONLY;`;

        //console.log('getLotPlantList: ', sqlStr);
        
        var selectedRecs = await knexReader.raw(sqlStr);
        //console.log('selectedRecs: ', selectedRecs);

          const result = {
            data: {
                list: selectedRecs.rows,
                message: "Lot Plants list!"
            }
        }
        //console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][plants][getLotPlantList] :  Error", err);
        return res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
    });
    
    }

}

module.exports = getLotPlantList;

/**
 */
