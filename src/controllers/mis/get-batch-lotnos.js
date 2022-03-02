const Joi = require("@hapi/joi");
const knexReader = require("../../db/knex-reader");

const ItemCategory = {
    RawMaterial: 1,
    Product: 2,
    WasteMaterial: 3,
    FinishedGoods: 4
};

const BatchTypes ={
    Production: 1,
    Harvest: 2,
    Plants: 3,
    RawMaterial: 4,
};

const getBatchLotNos = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        const { companyId, batchTypeId } = req.body;

        const schema = Joi.object().keys({
            companyId: Joi.number().required(),
            batchTypeId: Joi.number().required()
        });
        const result = Joi.validate(payload, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: result.error.message }
                ]
            });
        }

        sqlSelect = `SELECT DISTINCT "lotNo"`;
        sqlWhere = ` WHERE "orgId" = ${orgId} AND "companyId" = ${companyId}`;
        if(batchTypeId == BatchTypes.Production){
            sqlFrom = ` FROM production_lots pl`;
            sqlWhere += ` AND "isActive"`;
        } else if(batchTypeId == BatchTypes.Harvest){
            sqlFrom = ` FROM harvest_plant_lots hpl`;
            sqlWhere += ` AND "isActive"`;
        } else if(batchTypeId == BatchTypes.Plants){
            sqlFrom = ` FROM plant_lots pl`;
            sqlWhere += ` AND "isActive"`;
        } else {    //  Raw Material
            sqlFrom = ` FROM item_txns it`;
            sqlWhere += ` AND "itemCategoryId" = ${ItemCategory.RawMaterial}`;
        }

        sqlOrderBy  = ` ORDER BY "lotNo" desc`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;

        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                records: selectedRecs.rows,
            },
            message: "Batch Lot Numbers!"
        });

    } catch (err) {
        console.log("[controllers][mis][getBatchLotNos] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getBatchLotNos;
