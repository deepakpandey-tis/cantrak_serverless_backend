const knex = require("../../db/knex");
const Joi = require("@hapi/joi");
const moment = require("moment-timezone");
// const momentWithTZ = require("moment");
const _ = require("lodash");
 

var arrayCompare = require("array-compare");

const parcelsController = {

    /*GET USER FACILITY LIST */

    getUserParcelList: async (req, res) => {

        try {
            let id = req.me.id;
            let propertyUnitFinalResult = null;
            //let resourceProject = req.userProjectResources[0].projects;
            let { listType } = req.body;
            let resultData;
            console.log("listType", listType);

            console.log("customerHouseInfo", req.me.houseIds);
            let houseIdArray = req.me.houseIds;

            propertyUnitFinalResult = await knex.from('property_units')
                .where({ orgId: req.orgId })
                .whereIn('id', houseIdArray);

            let projectArray = _.uniqBy(propertyUnitFinalResult, 'projectId').map(v => v.projectId)


            resultData = await knex.from('parcel_management')
                .leftJoin(
                    "parcel_user_tis",
                    "parcel_management.id",
                    "parcel_user_tis.parcelId"
                )
                .leftJoin(
                    "parcel_user_non_tis",
                    "parcel_management.id",
                    "parcel_user_non_tis.parcelId"
                )
                .leftJoin(
                    "property_units",
                    "parcel_user_tis.unitId",
                    "property_units.id"
                )
                .leftJoin("users", "parcel_user_tis.tenantId", "users.id")
                .select([
                    "parcel_management.id",
                    "parcel_user_tis.unitId",
                    "parcel_management.trackingNumber",
                    "parcel_management.parcelStatus",
                    "users.name as tenant",
                    "parcel_management.createdAt",
                    "parcel_management.pickedUpType",
                ])

                .where({ 'parcel_management.orgId': req.orgId, 'parcel_management.moderationStatus': true, 'parcel_management.status': true })
                .whereIn('parcel_management.projectId', projectArray)
                .orderBy('parcel_management.id', 'desc')
                .groupBy('parcel_management.id', 'companies.id', 'projects.id', 'buildings_and_phases.id', 'floor_and_zones.id')
                .distinct('parcel_management.id')



            const Parallel = require('async-parallel');
            resultData = await Parallel.map(resultData, async pd => {

                let imageResult = await knex.from('images').select('s3Url', 'title', 'name')
                    .where({ "entityId": pd.id, "entityType": 'parcel_management' })

                return {
                    ...pd,
                    uploadedImages: imageResult,
                    sortBy
                }

            })

            res.status(200).json({
                data: {
                    facilityData: _.orderBy(resultData, 'sortBy', 'desc')
                },
                message: "Parcel list successfully!"
            })

        } catch (err) {

            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });

        }

    },

}



module.exports = parcelsController;