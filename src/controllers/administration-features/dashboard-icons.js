const Joi = require("@hapi/joi");
const moment = require("moment");
const uuidv4 = require("uuid/v4");
const _ = require("lodash");

const knex = require("../../db/knex");


const dashboardIconsController = {
  getDashboardItemsList : async(req,res) =>{
    try {
        let dashboardItemsList 

        dashboardItemsList = await knex("user_component_master")
        .select([
            "user_component_master.id",
            "user_component_master.componentName"
        ])
        .where("user_component_master.isActive",true)

        return res.status(200).json({
            data : {
                dashboardItemsList
            }
        })
    } catch (err) {
        console.log(
            "[controllers][survey Orders][getSurveyOrders] :  Error",
            err
          );
          res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
          });
        
    }
},
addDashboardIcons : async(req,res) =>{
    try {


        console.log("request for icons",req.body)
        let dashboardIcons = null

        await knex.transaction(async trx =>{

            const payload = _.omit(req.body,'icon')

            const userId = req.me.id;
            let orgId = req.orgId

            const schema = Joi.object().keys({
                componentId:Joi.string().required(),
            })

            const result = Joi.validate(payload, schema);
            console.log(
              "[controllers][administrationFeatures][addCompany]: JOi Result",
              result
            );
    
            if (result && result.hasOwnProperty("error") && result.error) {
              return res.status(400).json({
                errors: [
                  { code: "VALIDATION_ERROR", message: result.error.message }
                ]
              });
            }

            let icon = "";
            if (req.body.icon) {
              for (image of req.body.icon) {
                icon = image.s3Url;
              }
            }

            let currentTime = new Date().getTime();
            let insertdata = {
                ...payload,
                componentId : payload.componentId,
                icon : icon,
                createdBy: userId,
                createdAt: currentTime,
                updatedAt: currentTime,
                orgId: orgId
            }

            let insertResult = await knex
            .insert(insertdata)
            .returning(["*"])
            .transacting(trx)
            .into("components_icon_master");
            dashboardIcons = insertResult[0]

            trx.commit;



        })

        return res.status(200).json({
            data: {
              dashboardIcons: dashboardIcons
            },
            message: "Dashboard Icons added successfully."
          });
        
    } catch (err) {
        console.log("[controllers][dashboardIcons][addDashboardIcons] :  Error", err);
        res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
  });
  
    }
},
getDashboardIconsList : async(req,res)=>{
    try {
        let payload = req.body

        console.log("requested data for dashboard icons",req.body)
        if (!payload.sortBy && !payload.orderBy) {
            payload.sortBy = "componentName";
            payload.orderBy = "asc";
          }
        let reqData = req.query;
        let pagination = {};
        let per_page = reqData.per_page || 10;
        let page = reqData.current_page || 1;
        if (page < 1) page = 1;
        let offset = (page - 1) * per_page;
        let { searchValue } = req.body;
        let orgId = req.query.orgId;
        let total, rows;


         [total,rows] = await Promise.all([
            knex
            .count("* as count")
            .from("components_icon_master")
            .leftJoin("users", "users.id", "components_icon_master.createdBy")
            .leftJoin("user_component_master", "user_component_master.id", "components_icon_master.componentId")
            .leftJoin(
              "resources",
              "user_component_master.resourceId",
              "resources.id"
            )
            .leftJoin(
              "organisation_resources_master",
              "organisation_resources_master.resourceId",
              "resources.id"
            )
            .where({ 
              "components_icon_master.orgId": req.orgId,
              "organisation_resources_master.orgId": req.orgId, 
              "organisation_resources_master.userStatus": true,
              "user_component_master.isActive": true,
              "resources.isActive": true,
            })
            .where((qb=>{
                if(searchValue){
                    qb.where("components_icon_master.componentId",req.body.id)
                }
            }))
            .first(),

            knex
            .from("components_icon_master")
            .leftJoin("users", "users.id", "components_icon_master.createdBy")
            .leftJoin("user_component_master", "user_component_master.id", "components_icon_master.componentId")
            .leftJoin(
              "resources",
              "user_component_master.resourceId",
              "resources.id"
            )
            .leftJoin(
              "organisation_resources_master",
              "organisation_resources_master.resourceId",
              "resources.id"
            )
            .where({ "components_icon_master.orgId": req.orgId,
                    "organisation_resources_master.orgId": req.orgId, 
                    "organisation_resources_master.userStatus": true, 
                    "user_component_master.isActive": true,
                    "resources.isActive": true,
                  })
            .where((qb=>{
                if(searchValue){
                    qb.where("components_icon_master.componentId",req.body.id)
                }
            }))
            .select([
                "components_icon_master.*",
                "user_component_master.componentName",
                "user_component_master.icon as defaultIcon",
                "user_component_master.code",
                "users.name as CreatedBy"
            ])
            .orderBy(payload.sortBy, payload.orderBy)
            .offset(offset)
            .limit(per_page),
            

        ])

        let count = total.count;
        pagination.total = count;
        pagination.per_page = per_page;
        pagination.offset = offset;
        pagination.to = offset + rows.length;
        pagination.last_page = Math.ceil(count / per_page);
        pagination.current_page = page;
        pagination.from = offset;
        pagination.data = rows;

        return res.status(200).json({
            data: {
              dashBoardIcons: pagination,
            },
            message: "Dashboard Icons List!",
          });
    } catch (err) {
        console.log("[controllers][dashboardIcons][addDashboardIcons] :  Error", err);
        res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
  });
    }
},
getDashboardIconByOrg:async(req,res)=>{
    try {
        let dashboardIcon = null


        dashboardIcon = await knex
        .from("components_icon_master")
        .leftJoin("user_component_master", "user_component_master.id", "components_icon_master.componentId")
        .select([
            "components_icon_master.id",
            "user_component_master.componentName",
            "user_component_master.componentNameTh",
            "user_component_master.uri",
            "user_component_master.icon as defaultIcon",
            "components_icon_master.icon",
            "components_icon_master.componentId"
        ])
        .where({ "components_icon_master.orgId": req.orgId })
        .where({"components_icon_master.isActive":true})


        return res.status(200).json({
            data: {
              dashBoardIcons: dashboardIcon,
            },
            message: "Dashboard Icons List!",
          });
    } catch (err) {
        console.log("[controllers][dashboardIcons][addDashboardIcons] :  Error", err);
        res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
  });
        
    }
},
getDashboardIconDetails:async(req,res)=>{
    try {
        let dashboardIconResult = null
        await knex.transaction(async trx=>{
            let payload = req.body
            const schema = Joi.object().keys({
                id: Joi.string().required()
              });

              const result = Joi.validate(payload, schema);
              if (result && result.hasOwnProperty("error") && result.error) {
                return res.status(400).json({
                  errors: [
                    { code: "VALIDATION_ERROR", message: result.error.message }
                  ]
                });
              }

            //   let current = new Date().getTime();
               dashboardIconResult = await knex.select()
              .where({id:payload.id})
              .returning(["*"])
                .transacting(trx)
                .into("components_icon_master");

                 trx.commit;

        })

        return res.status(200).json({
            data: {
              getDashboardIconDetails: dashboardIconResult
            },
            message: "Company details"
          });
    } catch (err) {
        
    }
},

updateDashboardIconDetail: async(req,res) =>{
    try {
        let dashboardIconResult = null
        let orgId = req.orgId

        await knex.transaction(async trx=>{

            const payload = _.omit(req.body, ["icon", "orderBy"]);


            const schema = Joi.object().keys({
                id:Joi.string().required(),
            })
            const result = Joi.validate(payload, schema);
            console.log(
              "[controllers][administrationFeatures][updateCompany]: JOi Result",
              result
            );

            if (result && result.hasOwnProperty("error") && result.error) {
                return res.status(400).json({
                  errors: [
                    { code: "VALIDATION_ERROR", message: result.error.message }
                  ]
                });
              }


    let currentTime = new Date().getTime();
    let icon;
    let orderBy = req.body.orderBy;
    if (req.body.icon) {
      for (image of req.body.icon) {
        icon = image.s3Url;
      }
    }
              let insertData
              if(req.body.icon){
                  insertData = {...payload, orgId, icon : icon, orderBy: orderBy, updatedAt: currentTime}
              }else{
                insertData = {...payload, orgId, orderBy: orderBy, updatedAt: currentTime}
              }

              let insertResult = await knex
      .update(insertData)
      .where({ id: payload.id })
      .returning(["*"])
      .transacting(trx)
      .into("components_icon_master");
    dashboardIconResult = insertResult[0];
    trx.commit;
        })

        return res.status(200).json({
            data: {
              dashboardIcon: dashboardIconResult
            },
            message: "Dashboard Icon details updated successfully."
          });
    } catch (err) {
    }
},
toggleDashboardIconData : async(req,res)=>{
    try {
        let dashboardIcon  = null
        let message 

        await knex.transaction(async trx=>{
            let payload = req.body
            const schema = Joi.object().keys({
                id: Joi.string().required()
              });

              const result = Joi.validate(payload, schema);
    if (result && result.hasOwnProperty("error") && result.error) {
      return res.status(400).json({
        errors: [
          { code: "VALIDATION_ERROR", message: result.error.message }
        ]
      });
    }
    let dashboardIconResult 
    let checkStatus = await knex.from('components_icon_master').where({ id: payload.id }).returning(['*']);

    if(checkStatus.length){
        if(checkStatus[0].isActive == true){
            dashboardIconResult = await knex
            .update({ isActive: false })
            .where({ id: payload.id })
            .returning(["*"])
            .transacting(trx)
            .into("components_icon_master");

            dashboardIcon = dashboardIconResult[0]
            message = "Dashboard Icons Inactive Successfully!"

        }else {
            dashboardIconResult = await knex
            .update({ isActive: true })
            .where({ id: payload.id })
            .returning(["*"])
            .transacting(trx)
            .into("components_icon_master");
            dashboardIcon = dashboardIconResult[0]
            message = "Dashboard Icon Active Successfully!"
        }
    }
    trx.commit;

        })
        return res.status(200).json({
            data: {
              dashboardIcon: dashboardIcon
            },
            message: message
          });
    } catch (err) {
        
    }
},
getManifestData:async(req,res)=>{
  try {
    let manifestData = {
      "name": "ServiceMind",
      "short_name": "ServiceMind",
      "theme_color": "#1976d2",
      "background_color": "#fafafa",
      "display": "standalone",
      "scope": "/",
      "start_url": "/login",
      "icons": [
        {
          "src": "assets/icons/icon-72x72.png",
          "sizes": "72x72",
          "type": "image/png"
        },
        {
          "src": "assets/icons/icon-96x96.png",
          "sizes": "96x96",
          "type": "image/png"
        },
        {
          "src": "assets/icons/icon-128x128.png",
          "sizes": "128x128",
          "type": "image/png"
        },
        {
          "src": "assets/icons/icon-144x144.png",
          "sizes": "144x144",
          "type": "image/png"
        },
        {
          "src": "assets/icons/icon-152x152.png",
          "sizes": "152x152",
          "type": "image/png"
        },
        {
          "src": "assets/icons/icon-192x192.png",
          "sizes": "192x192",
          "type": "image/png"
        },
        {
          "src": "assets/icons/icon-384x384.png",
          "sizes": "384x384",
          "type": "image/png"
        },
        {
          "src": "assets/icons/icon-512x512.png",
          "sizes": "512x512",
          "type": "image/png"
        }
      ]
    }
    return res.status(200).json({
      data: {
        manifestData
      },
      message: message
    });
  } catch (err) {
    console.log(err)
  }

}
    
}
module.exports = dashboardIconsController
