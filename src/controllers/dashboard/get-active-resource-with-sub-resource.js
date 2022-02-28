const knexReader = require("../../db/knex-reader");
const Joi = require("@hapi/joi");
const moment = require("moment-timezone");

const _ = require("lodash");

const getActiveResourceWithSubResource = async (req, res) => {

    try {

        let id = req.me.orgId;
        let orderBy1 = Array('r.id', 'desc');
        let orderBy2 = Array('sr.id', 'desc');

        if(req.params?.id){

            id = req.params.id;
        }
        else{
            id = Number(req.me.orgId);
            orderBy1 = Array('orm.orderBy', 'asc');
            orderBy2 = Array('osrm.orderBy', 'asc');
        }
        

        console.log('[controllers][v1][Dashboard][getActiveResourceListWithSubResourceForDashboard]', id);
        
        const resourcesDetails = await knexReader
        .select("orm.id","orm.orderBy","orm.resourceId","r.resourceName","r.resourceNameTh","r.code", "r.uri", "r.iconCode","orm.icon as iconFromOrg","orm.isAuthorized","orm.isShow","orm.isShowDashboard")
        .from('organisation_resources_master as orm')
        .leftJoin("resources as r","r.id","orm.resourceId")
        .where("orm.orgId", id)
        .where("r.isActive", true)
        .where((qb)=>{
            qb.where("orm.isShowDashboard", true)
        })
        .orderBy(...orderBy1);

        let data = resourcesDetails;


        const Parallel = require("async-parallel");
        data = await Parallel.map(
            resourcesDetails,
            async (r) => {

                let isSubResourceData = false;
                let subResource = await knexReader("organisation_sub_resources_master as osrm")
                    .leftJoin("sub_resources as sr", "sr.id","osrm.subResourceId")
                    .select("sr.*","osrm.orderBy" , "osrm.icon as iconFromOrg")
                    .where({ "osrm.orgId": id, "sr.resourceId": r.resourceId, "sr.isActive": true })
                    .orderBy(...orderBy2);

                if(subResource?.length > 0){
                    isSubResourceData = true;
                }

                return {...r, isSubResourceData: isSubResourceData, subResource: subResource}
            }
        );


        return res.status(200).json({data: data});

    } catch (err) {
        console.log('[controllers][v1][Dashboard][getActiveResourceListWithSubResourceForDashboard] :  Error', err);
        res.status(500).json({
            errors: [
                { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
            ],
        });
    }

}

module.exports = getActiveResourceWithSubResource;
