const knexReader = require('../../db/knex-reader');

const getPlantList = async (req, res) => {
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

        let { fromDate, endDate, plantSerial, specieId, strainId, growthStageId, companyId, plantLotId, plantationId, plantationPhaseId, plantationGroupId} = req.body;

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
        sqlSelect = `SELECT p2.*, plt.name "plantLotName", plt.description "plantLotDescription", pgs."startDate" "growthStageDate"
        , u2."name" "createdByName", c."companyName", p.name "plantationName", pp.description "plantationPhaseName"
        , pg.description "plantationGroupName", l."primaryHolder", l."subHolder", l."number", s2.name "specieName", s.name "strainName"
        , ct."descriptionEng" "containerTypeName", splr.name "supplierName", gs.id "growthStageId", gs.name_en "growthStage_en", gs.name_th "growthStage_th"
        `;

        sqlFrom = ` FROM plant_lots plt, plants p2, plant_locations pl, plant_growth_stages pgs, users u2, companies c, plantations p, plantation_phases pp, plantation_groups pg
        , licenses l, species s2, strains s, container_types ct, suppliers splr, growth_stages gs
        `;

        sqlWhere = ` WHERE p2."orgId" = ${orgId} AND p2."plantLotId" = plt.id AND p2."isActive" AND NOT p2."isWaste"`;
        sqlWhere += ` AND p2.id = pl."plantId" AND pl.id = (select id from plant_locations pl2 where pl2."plantId" = p2.id order by id desc limit 1)`;
        sqlWhere += ` AND p2.id = pgs."plantId" AND pgs.id = (select id from plant_growth_stages pgs2 where pgs2."plantId" = p2.id order by id desc limit 1)`;
        if(specieId){
            sqlWhere += ` AND plt."specieId" = ${specieId}`;
        }
        if(plantLotId){
            sqlWhere += ` AND p2."plantLotId" = ${plantLotId}`;
        }

        sqlWhere += ` AND p2."createdBy" = u2.id AND pl."companyId" = c.id AND pl."plantationId" = p.id 
        AND pl."plantationPhaseId" = pp.id AND pl."plantationGroupId" = pg.id AND p2."licenseId" = l.id
        AND plt."specieId" = s2.id AND plt."strainId" = s.id AND p2."containerTypeId" = ct.id AND p2."supplierId" = splr.id
        AND pgs."growthStageId" = gs.id
        `;

        if(fromDate && fromDate != ''){
            sdt = new Date(fromDate).getTime()
            sqlWhere += ` AND p2."plantedOn" >= ${sdt}`;
        }

        if(endDate && endDate != ''){
            edt = new Date(endDate).getTime()
            sqlWhere += ` AND p2."plantedOn" <= ${edt}`;
        }

        if(plantSerial && plantSerial != ''){
            sqlWhere += ` AND p2."plantSerial" iLIKE '%${plantSerial}%'`;
        }

        if(strainId && strainId != ''){
            sqlWhere += ` AND p2."strainId" = ${strainId}`;
        }

        if(growthStageId && growthStageId != ''){
            sqlWhere += ` AND pgs."growthStageId" = ${growthStageId}`;
        }

        if(companyId && companyId != ''){
            sqlWhere += ` AND pl."companyId" = ${companyId}`;
        }

        if(plantationId && plantationId != ''){
            sqlWhere += ` AND pl."plantationId" = ${plantationId}`;
        }

        if(plantationPhaseId && plantationPhaseId != ''){
            sqlWhere += ` AND pl."plantationPhaseId" = ${plantationPhaseId}`;
        }

        if(plantationGroupId && plantationGroupId != ''){
            sqlWhere += ` AND pl."plantationGroupId" = ${plantationGroupId}`;
        }

        sqlOrderBy = ` ORDER BY "${sortCol}" ${sortOrder}`;
        //console.log('getPlantList sql: ', sqlSelect + sqlFrom + sqlWhere);

        sqlStr  = `WITH Main_CTE AS (`;
        sqlStr += sqlSelect + sqlFrom + sqlWhere + `)`;
        sqlStr += `, Count_CTE AS (SELECT COUNT(*) AS "total" FROM Main_CTE)`;     // To get the total number of records
        sqlStr += ` SELECT * FROM Main_CTE, Count_CTE`;
        sqlStr += sqlOrderBy;
        sqlStr += ` OFFSET ((${pageNumber} - 1) * ${pageSize}) ROWS`
        sqlStr += ` FETCH NEXT ${pageSize} ROWS ONLY;`;

        //console.log('getPlantList: ', sqlStr);
        
        var selectedRecs = await knexReader.raw(sqlStr);
        //console.log('selectedRecs: ', selectedRecs);

          const result = {
            data: {
                list: selectedRecs.rows,
                message: "Plants list!"
            }
        }
        //console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][plants][getPlantList] :  Error", err);
        return res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
    });
    
    }

}

module.exports = getPlantList;

/**
 */
