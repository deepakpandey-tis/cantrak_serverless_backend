const knexReader = require('../../db/knex-reader');

const getPlantLotListOriginalLocation = async (req, res) => {
    try {
        let orgId = req.me.orgId;

        let payload = req.body;
        let sortCol = payload.sortBy;
        let sortOrder = payload.orderBy;

        let reqData = req.query;
        let pageSize = reqData.per_page || 10;
        let pageNumber = reqData.current_page || 1;

        let { companyId, lotNo, name, locationId, subLocationId, strainId, licenseId, fromDate, toDate } = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        // Setting default values, if not passed
        if(!sortCol || sortCol === ''){
            sortCol = `"lotNo" desc`;
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

        //  plant lot list using original locations (planted location)
        sqlStr = `WITH plant_lot_list_summary AS (
        SELECT pl.id, pl."lotNo", pl."name", count(p."isActive") "plantsCount", sum(p."isWaste"::int) "wastePlants"
        FROM plant_lots pl, plants p
        WHERE pl."orgId" = ${orgId}
        `;
        if(companyId){
            sqlStr += ` AND pl."companyId" = ${companyId}`;
        }
        if(strainId){
            sqlStr += ` AND pl."strainId" = ${strainId}`;
        }
        if(licenseId){
            sqlStr += ` AND pl."licenseId" = ${licenseId}`;
        }
        if(lotNo){
            sqlStr += ` AND pl."lotNo" iLIKE '%${lotNo}%'`;
        }
        if(name){
            sqlStr += ` AND pl."name" iLIKE '%${name}%'`;
        }
        if(fromDate){
            sqlStr += ` AND pl."plantedOn" >= ${new Date(fromDate).getTime()}`;
        }
        if(toDate){
            sqlStr += ` AND pl."plantedOn" <= ${new Date(toDate).getTime()}`;
        }
        if(locationId){
            sqlStr += ` AND pl."locationId" = ${locationId}`;
        }
        if(subLocationId){
            sqlStr += ` AND pl."subLocationId" = ${subLocationId}`;
        }

        sqlStr += `AND pl.id = p."plantLotId" AND pl."locationId" IN (${req.GROWINGLOCATION})
        GROUP BY pl.id, pl."lotNo"
        ), plant_lot_list as
        (select plls.*, pl2."plantedOn", pl2."refCode", pl2."companyId", s.name "strainName", s2.name "specieName", lic.number "licenseNo", c."companyName", u."name" "createdByName"
        from plant_lot_list_summary plls, strains s, species s2, companies c, users u, plant_lots pl2
        LEFT JOIN licenses lic ON pl2."licenseId" = lic.id
        where plls.id = pl2.id and pl2."strainId" = s.id and pl2."specieId" = s2.id and pl2."companyId" = c.id  AND pl2."createdBy" = u.id
        ), Count_CTE AS (SELECT COUNT(*) AS "total" FROM plant_lot_list)
        SELECT * FROM plant_lot_list, Count_CTE ORDER BY ${sortCol} ${sortOrder} OFFSET ((${pageNumber} - 1) * ${pageSize}) ROWS FETCH NEXT ${pageSize} ROWS ONLY;
        `;

        console.log('getPlantLotListOriginalLocation: ', sqlStr);
        
        var selectedRecs = await knexReader.raw(sqlStr);
        //console.log('selectedRecs: ', selectedRecs);

          const result = {
            data: {
                list: selectedRecs.rows,
                message: "Plant lot list using original planted location!"
            }
        }
        //console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][plants][getPlantLotList] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getPlantLotListOriginalLocation;

/**
 */
