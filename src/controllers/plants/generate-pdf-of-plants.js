const knexReader = require('../../db/knex-reader');
const redisHelper = require('../../helpers/redis');

const generatePdfOfPlants = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let { id, pdfType } = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere;

        sqlSelect = `SELECT pl.*, c."companyName", s.name "strainName", s2.name "specieName", lic.number "licenseNo", l.name "locationName", sl.name "subLocationName"`;
        sqlFrom = ` FROM plant_lots pl, companies c, strains s, species s2, locations l, sub_locations sl, licenses lic`;
        sqlWhere = ` WHERE pl.id = ${id} AND pl."orgId" = ${orgId} `;
        sqlWhere += ` AND pl."locationId" = l.id AND pl."subLocationId" = sl.id AND pl."companyId" = c.id AND pl."strainId" = s.id and pl."specieId" = s2.id AND pl."licenseId" = lic.id`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere;

        var selectedRecs = await knexReader.raw(sqlStr);
        //console.log('selectedRecs: ', selectedRecs);

        await redisHelper.removeKey(`plant-${selectedRecs.rows[0].id}-lot-${selectedRecs.rows[0].lotNo}-qr-docs-link`);

        const queueHelper = require("../../helpers/queue");
        await queueHelper.addToQueue(
          {
            plantId: id,
            pdfType,
            data: {
              plantsLot: selectedRecs.rows,
            },
            orgId: req.orgId,
            requestedBy: req.me,
          },
          "long-jobs",
          "PLANT_TO_SCAN"
        );

        //   const result = {
        //     data: {
        //         list: selectedRecs.rows,
        //         message: "Lot Plants list!"
        //     }
        // }
        //console.log(result.data)

        return res.status(200).json({
            data: selectedRecs.rows[0],
            message:
              "We are preparing QR Code for this Plant`s Lot. Please wait for few minutes. Once generated we will notify you via App Notification & Email",
        });
    } catch (err) {
        console.log("[controllers][plants][getLotPlantList] :  Error", err);
        return res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
    });
    
    }

}

module.exports = generatePdfOfPlants;

/**
 */
