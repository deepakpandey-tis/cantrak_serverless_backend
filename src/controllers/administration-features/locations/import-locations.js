const Joi = require("@hapi/joi");
const knex = require('../../../db/knex');

const importLocations = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const {data} = req.body;

/*         for(let rec of data){
            console.log('rec: ', rec);
        }
 */
        let insertedRecord = [];
        let insertedRecNo = 0;

        await knex.transaction(async (trx) => {

            let currentTime = new Date().getTime();

            let insertData;

            insertedRecNo = 0;
            for(let rec of data){
                insertData = {
                    orgId: orgId,
                    companyId: rec.companyId,
                    name: rec.name,
                    description: rec.description,
                    createdBy: userId,
                    createdAt: currentTime,
                    updatedBy: userId,
                    updatedAt: currentTime,
                };
                console.log('location insert record: ', insertData);

                const insertResult = await knex
                    .insert(insertData)
                    .returning(["*"])
                    .transacting(trx)
                    .into("locations");

                insertedRecord[insertedRecNo] = insertResult[0];
                insertedRecNo += 1;
            }

            trx.commit;
        });

        return res.status(200).json({
            data: {
                // items: insertedRecord,
            },
            message: `${insertedRecNo} growing locations imported successfully.`
        });
    } catch (err) {
        console.log("[controllers][locations][importLocations] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = importLocations;
