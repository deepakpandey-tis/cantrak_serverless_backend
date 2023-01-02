const knexReader = require('../../db/knex-reader');
const { ObservationTypes } = require('../../helpers/txn-types');

const getUnhealthyTxnList = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;
        let sortCol = payload.sortBy;
        let sortOrder = payload.orderBy;

        let reqData = req.query;
        let pageSize = reqData.per_page || 10;
        let pageNumber = reqData.current_page || 1;

        let { companyId, lotNo, name, locationId, subLocationId, strainId, fromDate, toDate, trackingNumber, growthStageId} = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        // Setting default values, if not passed
        if(!sortCol || sortCol === ''){
            sortCol = `"id" desc`;
            sortOrder = '';
        }

        // if(!sortOrder || sortOrder === ''){
        //     sortOrder = 'desc';
        // }

        if(pageNumber < 1){
            pageNumber = 1;
        }

        if(pageSize < 0){
            pageSize = 10;
        }

        sqlSelect = `SELECT pot.*, pl."lotNo" "plantLotNo", pl.name "plantLotName"
        , s."name" "strainName", s2."name" "specieName", c."companyName", l.name "locationName", sl.name "subLocationName", gs."name" "growthStageName"
        `;

        sqlFrom = ` FROM plant_observation_txns pot, plant_lots pl, locations l, sub_locations sl
        , strains s, species s2, companies c, growth_stages gs
        `;

        sqlWhere = ` WHERE pot."orgId" = ${orgId} AND pot."observationType" = ${ObservationTypes.Unhealthy}`;
        sqlWhere += ` AND pot."growthStageId" = gs.id`;
        sqlWhere += ` AND pot."plantLotId" = pl.id AND pl."strainId" = s.id AND pl."specieId" = s2.id AND pot."locationId" = l.id AND pot."subLocationId" = sl.id AND pot."companyId" = c.id`;
        if(trackingNumber){
            sqlWhere += ` AND pot."txnId" = ${trackingNumber}`;
        }
        if(companyId){
            sqlWhere += ` AND pot."companyId" = ${companyId}`;
        }
        if(strainId){
            sqlWhere += ` AND pl."strainId" = ${strainId}`;
        }
        if(locationId){
            sqlWhere += ` AND pot."locationId" = ${locationId}`;
        }
        if(subLocationId){
            sqlWhere += ` AND pot."subLocationId" = ${subLocationId}`;
        }
        if(lotNo){
            sqlWhere += ` AND pl."lotNo" iLIKE '%${lotNo}%'`;
        }
        if(name){
            sqlWhere += ` AND pl."name" iLIKE '%${name}%'`;
        }
        if(fromDate){
            sqlWhere += ` AND pot."date" >= ${new Date(fromDate).getTime()}`;
        }
        if(toDate){
            sqlWhere += ` AND pot."date" <= ${new Date(toDate).getTime()}`;
        }
        if(growthStageId){
            sqlWhere += ` AND pot."growthStageId" = ${growthStageId}`;
        }

        sqlWhere += ` AND pot."locationId" IN (${req.GROWINGLOCATION})`;

        sqlOrderBy = ` ORDER BY ${sortCol} ${sortOrder}`;
        //console.log('getUnhealthyTxnList sql: ', sqlSelect + sqlFrom + sqlWhere);

        sqlStr  = `WITH Main_CTE AS (`;
        sqlStr += sqlSelect + sqlFrom + sqlWhere + `)`;
        sqlStr += `, Count_CTE AS (SELECT COUNT(*) AS "total" FROM Main_CTE)`;     // To get the total number of records
        sqlStr += ` SELECT * FROM Main_CTE, Count_CTE`;
        sqlStr += sqlOrderBy;
        sqlStr += ` OFFSET ((${pageNumber} - 1) * ${pageSize}) ROWS`
        sqlStr += ` FETCH NEXT ${pageSize} ROWS ONLY;`;

        //console.log('getUnhealthyTxnList: ', sqlStr);
        
        var selectedRecs = await knexReader.raw(sqlStr);
        //console.log('selectedRecs: ', selectedRecs);

          const result = {
            data: {
                list: selectedRecs.rows,
                message: "Unhealthy Txn list!"
            }
        }
        //console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][plants][getUnhealthyTxnList] :  Error", err);
        return res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
    });
    
    }

}

module.exports = getUnhealthyTxnList;

/**
 */
