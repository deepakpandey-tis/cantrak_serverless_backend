const knexReader = require('../../db/knex-reader');

const getLocationTxnList = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;
        let sortCol = payload.sortBy;
        let sortOrder = payload.orderBy;

        let reqData = req.query;
        let pageSize = reqData.per_page || 10;
        let pageNumber = reqData.current_page || 1;

        let { companyId, lotNo, fromLocationId, toLocationId, strainId, fromDate, toDate, trackingNumber, growthStageId} = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        if(pageNumber < 1){
            pageNumber = 1;
        }

        if(pageSize < 0){
            pageSize = 10;
        }

        sqlSelect = `SELECT plt.*, pl."lotNo", l.name "fromLocationName", l2.name "toLocationName", gs.name "growthStageName"
        , s."name" "strainName", s2."name" "specieName", c."companyName"
        `;

        sqlFrom = ` FROM plant_location_txns plt, plant_lots pl, locations l, locations l2, growth_stages gs
        , strains s, species s2, companies c
        `;

        sqlWhere = ` WHERE plt."orgId" = ${orgId}`;
        sqlWhere += ` AND plt."plantLotId" = pl.id AND plt."fromLocationId" = l.id AND plt."toLocationId" = l2.id`;
        sqlWhere += ` AND plt."growthStageId" = gs.id AND pl."strainId" = s.id AND pl."specieId" = s2.id and pl."companyId" = c.id `;
        if(trackingNumber){
            sqlWhere += ` AND plt."id" = ${trackingNumber}`;
        }
        if(companyId){
            sqlWhere += ` AND pl."companyId" = ${companyId}`;
        }
        if(strainId){
            sqlWhere += ` AND pl."strainId" = ${strainId}`;
        }
        if(fromLocationId){
            sqlWhere += ` AND plt."fromLocationId" = ${fromLocationId}`;
        }
        if(toLocationId){
            sqlWhere += ` AND plt."toLocationId" = ${toLocationId}`;
        }
        if(lotNo){
            sqlWhere += ` AND pl."lotNo" iLIKE '%${lotNo}%'`;
        }
        if(fromDate){
            sqlWhere += ` AND plt."date" >= ${new Date(fromDate).getTime()}`;
        }
        if(toDate){
            sqlWhere += ` AND plt."date" <= ${new Date(toDate).getTime()}`;
        }
        if(growthStageId){
            sqlWhere += ` AND plt."growthStageId" = ${growthStageId}`;
        }

        sqlOrderBy = ` ORDER BY id desc`;
        //console.log('getLocationTxnList sql: ', sqlSelect + sqlFrom + sqlWhere);

        sqlStr  = `WITH Main_CTE AS (`;
        sqlStr += sqlSelect + sqlFrom + sqlWhere + `)`;
        sqlStr += `, Count_CTE AS (SELECT COUNT(*) AS "total" FROM Main_CTE)`;     // To get the total number of records
        sqlStr += ` SELECT * FROM Main_CTE, Count_CTE`;
        sqlStr += sqlOrderBy;
        sqlStr += ` OFFSET ((${pageNumber} - 1) * ${pageSize}) ROWS`
        sqlStr += ` FETCH NEXT ${pageSize} ROWS ONLY;`;

        //console.log('getLocationTxnList: ', sqlStr);
        
        var selectedRecs = await knexReader.raw(sqlStr);
        //console.log('selectedRecs: ', selectedRecs);

          const result = {
            data: {
                list: selectedRecs.rows,
                message: "Location Txn list!"
            }
        }
        //console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][plants][getLocationTxnList] :  Error", err);
        return res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
    });
    
    }

}

module.exports = getLocationTxnList;

/**
 */
