const Joi = require("@hapi/joi");
const knex = require('../../db/knex');

const ItemCategory = {
    RawMaterial: 1,
    Product: 2,
    WasteMaterial: 3,
    FinishedGoods: 4
};

const TxnTypes ={
    ReceiveFromSupplier: 11,
    ReceiveProductFromHarvest: 21,
    ReceiveWasteFromPlantWaste: 22,
    ReceiveFromTxnType: 11,
    ReceiveUptoTxnType: 50,
    IssueForPlantation: 51,
    IssueFromTxnType: 51,
    IssueUptoTxnType: 90,
};

const importWasteMaterial = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const {itemCategoryId, data} = req.body;

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
                    txnType: TxnTypes.ReceiveWaste,
                    date: new Date(rec.date).getTime(),
                    itemCategoryId: itemCategoryId,
                    itemId: rec.itemId,
                    specieId: rec.specieId,
                    strainId: rec.strainId,
                    quantity: rec.quantity,
                    umId: rec.umId,
                    storageLocationId: rec.storageLocationId,
                    lotNo: rec.lotNo,
                    createdBy: userId,
                    createdAt: currentTime,
                    updatedBy: userId,
                    updatedAt: currentTime,
                };
                console.log('txn insert record: ', insertData);

                const insertResult = await knex
                    .insert(insertData)
                    .returning(["*"])
                    .transacting(trx)
                    .into("item_txns");

                insertedRecord[insertedRecNo] = insertResult[0];
                insertedRecNo += 1;
            }

            trx.commit;
        });

        return res.status(200).json({
            data: {
                txn: insertedRecord,
            },
            message: `${insertedRecNo} waste items imported successfully.`
        });
    } catch (err) {
        console.log("[controllers][inventories][importWasteMaterial] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = importWasteMaterial;
