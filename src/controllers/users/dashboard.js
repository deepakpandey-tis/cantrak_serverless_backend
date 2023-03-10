const knex = require("../../db/knex");
const knexReader = require("../../db/knex-reader");
const Joi = require("@hapi/joi");
const moment = require("moment-timezone");

const _ = require("lodash");

const dashboardController = {
  getDashboardData: async (req, res) => {
    try {
      console.log("customerInfo", req.me.id);
      console.log("customerHouseInfo", req.me.houseIds);
      let houseIds = req.me.houseIds;

      let orgId = req.orgId;
      // let accessibleProjects = req.userPlantationResources[0].plantations

      let prioritySeq = await knex("incident_priority")
        .max("sequenceNo")
        .where({ orgId: orgId });
      let priority;
      let priorityValue = null;
      if (prioritySeq.length) {
        let maxSeq = prioritySeq[0].max;
        priority = await knex("incident_priority")
          .where({ sequenceNo: maxSeq, orgId: orgId })
          .groupBy([
            "incident_priority.incidentPriorityCode",
            "incident_priority.id",
          ])
          .first();
        priorityValue = priority.incidentPriorityCode;
      }

      let getServiceRequests = await knex(
        "service_requests"
      )
        .select("id")
        .where({
          "service_requests.serviceStatusCode": "A",
          "service_requests.orgId": orgId,
        })
        .whereIn("service_requests.houseId", houseIds)
        .orWhere("service_requests.createdBy", req.me.id);

      console.log(
        "service request list",
        getServiceRequests
      );

      let srIds = getServiceRequests.map((v) => v.id); // Get all service request Ids where status = O (Open)

      let getServiceRequestsPriority = await knex(
        "service_requests"
      )
        .select("id")
        .where({
          "service_requests.serviceStatusCode": "A",
          "service_requests.priority": priorityValue,
          "service_requests.orgId": orgId,
        })
        .whereIn("service_requests.houseId", houseIds)
        .orWhere("service_requests.createdBy", req.me.id);

      console.log(
        "service request by priority list",
        getServiceRequestsPriority
      );

      let srIdP = getServiceRequestsPriority.map(
        (v) => v.id
      ); // Get all service request Ids where status = O (Open)

      const [openRequests, openOrders, srhp, sohp] =
        await Promise.all([
          knex
            .from("service_requests")
            .select(
              "service_requests.serviceStatusCode as status"
            )
            .where({ serviceStatusCode: "O", orgId })
            .whereIn("service_requests.houseId", houseIds)
            .orWhere(
              "service_requests.createdBy",
              req.me.id
            )
            .distinct("service_requests.id"),
          knex
            .from("service_orders")
            .innerJoin(
              "service_requests",
              "service_orders.serviceRequestId",
              "service_requests.id"
            )
            .whereIn(
              "service_orders.serviceRequestId",
              srIds
            )
            .distinct("service_orders.id"),

          knex
            .from("service_requests")
            .select(
              "service_requests.serviceStatusCode as status"
            )
            .where({
              serviceStatusCode: "O",
              orgId,
              priority: priorityValue,
            })
            .whereIn("service_requests.houseId", houseIds)
            .orWhere(
              "service_requests.createdBy",
              req.me.id
            )
            .distinct("service_requests.id"),

          knex
            .from("service_orders")
            .innerJoin(
              "service_requests",
              "service_orders.serviceRequestId",
              "service_requests.id"
            )
            .distinct("service_orders.id")
            .whereIn(
              "service_orders.serviceRequestId",
              srIdP
            ),
        ]);

      let open_service_requests = openRequests.length
        ? openRequests.length
        : 0;
      let open_service_orders = openOrders.length
        ? openOrders.length
        : 0;
      let open_service_requests_high_priority = srhp.length
        ? srhp.length
        : 0;
      let open_service_orders_high_priority = sohp.length
        ? sohp.length
        : 0;

      return res.status(200).json({
        data: {
          open_service_requests,
          open_service_orders,
          open_service_requests_high_priority,
          open_service_orders_high_priority,
          priorityValue,
        },
        message: "Dashboard data",
      });
    } catch (err) {
      console.log(
        "[controllers][dashboard][getDashboardData] :  Error",
        err
      );
      res.status(500).json({
        errors: [
          {
            code: "UNKNOWN_SERVER_ERROR",
            message: err.message,
          },
        ],
      });
    }
  },

  getBannerList: async (req, res) => {
    try {
      let bannersImg;

      bannersImg = await knex
        .from("banners_master")
        .where({
          "banners_master.orgId": req.orgId,
          "banners_master.isActive": true,
        })
        .select(
          "banners_master.title as titles",
          "banners_master.s3Url as banners"
        )
        .orderBy("banners_master.id", "desc")
        .limit(6);

      return res.status(200).json({
        data: {
          banners: bannersImg,
        },
        message: "Banners List!",
      });
    } catch (err) {
      console.log(
        "[controllers][banners][getBanners],Error",
        err
      );
    }
  },

  getAnnouncementList: async (req, res) => {
    try {
      let announcement;
      let img;
      let announcementTitle;
      let approvalUrl;

      // console.log("houseId====>>>>",req.me)
      let projectId = await knex
        .from("property_units")
        .select("property_units.projectId")
        .whereIn("property_units.id", req.me.houseIds)
        .first();

      // console.log("project id=======>>>>>>>>>",projectId)

      announcement = await knex
        .from("announcement_master")
        .leftJoin(
          "announcement_user_master",
          "announcement_master.id",
          "announcement_user_master.announcementId"
        )
        .where({
          "announcement_master.savedStatus": 2,
          "announcement_user_master.orgId": req.orgId,
          "announcement_user_master.userId": req.me.id,
          "announcement_master.status": true,
          "announcement_master.userType": 2,
        })
        .orWhere({
          "announcement_master.savedStatus": 2,
          "announcement_user_master.orgId": req.orgId,
          "announcement_master.status": true,
          "announcement_master.userType": 2,
          "announcement_master.isGeneral": true,
        })
        .havingNotNull("announcement_master.title")
        .whereRaw(
          '? = ANY("announcement_master"."projectId")',
          [projectId.projectId]
        )
        .select(
          "announcement_master.id as Id",
          "announcement_master.title as titles",
          "announcement_master.url as Url",
          "announcement_master.description as details",
          "announcement_master.createdAt as announcementDate"
        )
        .groupBy(["announcement_master.id"])
        .orderBy("announcement_master.id", "desc")
        .limit(10);

      const Parallel = require("async-parallel");
      announcement = await Parallel.map(
        announcement,
        async (pp) => {
          if (pp.titles) {
            var yourString = pp.titles; //replace with your string.
            var yourStringLength = pp.titles.length;
            var maxLength = 110; // maximum number of characters to extract
            var trimmedString = yourString.substr(
              0,
              maxLength
            );
            // console.log("yourString",yourString);
            //console.log("trimmedString",trimmedString);
            //Trim and re-trim only when necessary (prevent re-trim when string is shorted than maxLength, it causes last word cut)
            if (yourString.length > trimmedString.length) {
              //trim the string to the maximum length
              //re-trim if we are in the middle of a word and
              trimmedString = trimmedString.substr(
                0,
                Math.min(
                  trimmedString.length,
                  trimmedString.lastIndexOf(" ")
                )
              );
              //  console.log("If trimmedString", trimmedString);
            }

            if (yourStringLength > maxLength) {
              trimmedString = trimmedString + "...";
            }

            let imageResult = await knex
              .from("images")
              .select("s3Url", "title", "name")
              .where({
                entityId: pp.Id,
                entityType: "announcement_image",
              })
              .first();

            console.log("imagesResult", imageResult);

            if (
              req.orgId === "56" &&
              process.env.SITE_URL ==
                "https://d3lw11mvhjp3jm.cloudfront.net"
            ) {
              approvalUrl =
                "https://cbreconnect.servicemind.asia";
            } else if (
              req.orgId === "89" &&
              process.env.SITE_URL ==
                "https://d3lw11mvhjp3jm.cloudfront.net"
            ) {
              approvalUrl =
                "https://senses.servicemind.asia";
            } else {
              approvalUrl = process.env.SITE_URL;
            }

            return {
              ...pp,
              titles: trimmedString,
              titleLength: yourStringLength,
              maxLength: maxLength,
              img: imageResult,
              URL: approvalUrl,
            };
          }
        }
      );

      return res.status(200).json({
        data: {
          announcement: announcement,
        },
        message: "Announcement List!",
      });
    } catch (err) {
      console.log(
        "[controllers][Announcement][getAnnouncementList],Error",
        err
      );
    }
  },

  getThemeSetting: async (req, res) => {
    try {
      let themes;
      let themeValue;
      themes = await knex
        .from("theme_master")
        .where({ "theme_master.orgId": req.orgId })
        .select("theme_master.theme as theme")
        .first();

      if (themes) {
        themeValue = themes.theme;
      } else {
        themeValue = "1";
      }

      return res.status(200).json({
        data: {
          result: themeValue,
        },
        message: "Theme Settings!",
      });
    } catch (err) {
      console.log(
        "[controllers][dashboard][getThemes],Error",
        err
      );
    }
  },

  getAnnouncementDetails: async (req, res) => {
    try {
      let id = req.me.id;
      let { announcementId } = req.body;
      let resultData;

      resultData = await knex
        .from("announcement_user_master")
        .innerJoin(
          "announcement_master",
          "announcement_user_master.announcementId",
          "announcement_master.id"
        )
        .select([
          "announcement_master.title as titles",
          "announcement_master.url as Url",
          "announcement_master.description as details",
          "announcement_master.createdAt as announcementDate",
        ])
        .where({
          "announcement_user_master.orgId": req.orgId,
        })
        .where({
          "announcement_user_master.announcementId":
            announcementId,
        })
        .first();

      console.log("...resultData", resultData);

      let imageResult = await knex
        .from("images")
        .select("s3Url", "title", "name")
        .where({
          entityId: announcementId,
          entityType: "announcement_image",
        });

      res.status(200).json({
        data: {
          announcementDetails: {
            ...resultData,
            imageResult,
          },
        },
        message: "Announcement details successfully!",
      });
    } catch (err) {
      return res.status(500).json({
        errors: [
          {
            code: "UNKNOWN_SERVER_ERROR",
            message: err.message,
          },
        ],
      });
    }
  },
  getBuildingList: async (req, res) => {
    try {
      console.log("customerInfo", req.me.id);
      console.log("customerHouseInfo", req.me.houseIds);

      userHouseResult = await knex
        .from("user_house_allocation")
        .where({ userId: req.me.id, orgId: req.orgId })
        .whereIn("houseId", req.me.houseIds);

      let houseIdArray = userHouseResult.map(
        (v) => v.houseId
      );

      propertyUnitFinalResult = await knex
        .from("property_units")
        .where({ orgId: req.orgId })
        .whereIn("id", houseIdArray);

      let buildingArray = _.uniqBy(
        propertyUnitFinalResult,
        "buildingPhaseId"
      ).map((v) => v);

      let buildingInfo = [];

      for (let b of buildingArray) {
        buildingInfoData = await knex
          .from("building_info")
          .innerJoin(
            "buildings_and_phases",
            "building_info.buildingId",
            "buildings_and_phases.id"
          )
          .where({
            "building_info.orgId": req.orgId,
            "building_info.isActive": true,
          })
          // .whereIn("building_info.buildingId", buildingArray)
          .where("building_info.buildingId", b.buildingPhaseId)
          .select(
            "building_info.id as Id",
            "building_info.title as titles",
            "building_info.description as details",
            "building_info.buildingId"
          )
          .orderBy("building_info.id", "asc");

          let propertyDetails = await knex.from("property_units")
          .leftJoin("floor_and_zones","property_units.floorZoneId","floor_and_zones.id")
          .leftJoin("buildings_and_phases","property_units.buildingPhaseId","buildings_and_phases.id")
          .leftJoin("projects","property_units.projectId","projects.id")
          .select([
            "property_units.unitNumber",
            "property_units.description",
            "floor_and_zones.floorZoneCode",
            "buildings_and_phases.buildingPhaseCode",
            "projects.projectName"
          ])
          .where({
            "property_units.buildingPhaseId":b.buildingPhaseId,
            "property_units.id":b.id
          });

        buildingInfo.push({ info: buildingInfoData ,propertyDetails});
      }

      const Parallel = require("async-parallel");

      buildingInfo = await Parallel.map(
        buildingInfo,
        async (b) => {
          console.log(
            "building ids===",
            b.info[0].buildingId
          );
          let images = await knex("images")
            .select("s3Url", "title", "name")
            .where({
              entityType: "building_info",
              entityId: b.info[0].buildingId,
            })
            .first();

          return { ...b, images };
        }
      );

      //   let imageResult = await knex
      //     .from("images")
      //     .select("s3Url", "title", "name")
      //     .where({
      //       entityType: "building_info",
      //     })
      //     .whereIn("images.entityId", buildingArray);

      return res.status(200).json({
        data: {
          buildingData: {
            buildingInfo,
            // imageResult,
          },
        },
        message: "Building Information!",
      });
    } catch (err) {
      console.log(
        "[controllers][Building][getBuildingList],Error",
        err
      );
    }
  },
  getContactList: async (req, res) => {
    try {
      console.log("customerInfo", req.me.id);
      console.log("customerHouseInfo", req.me.houseIds);

      userHouseResult = await knex
        .from("user_house_allocation")
        .where({ userId: req.me.id, orgId: req.orgId })
        .whereIn("houseId", req.me.houseIds);

      let houseIdArray = userHouseResult.map(
        (v) => v.houseId
      );

      propertyUnitFinalResult = await knex
        .from("property_units")
        .where({ orgId: req.orgId })
        .whereIn("id", houseIdArray);

      let buildingArray = _.uniqBy(
        propertyUnitFinalResult,
        "buildingPhaseId"
      ).map((v) => v);

      let contactInfo;
      let faxInfo;
      let emailInfo;
      let descriptionInfo;
      let telInfo;
      let lineInfo;

      let contact = [];

      for (let b of buildingArray) {

        // console.log("value of B",b)
        contactInfo = await knex
          .from("contact_info")
          .innerJoin(
            "buildings_and_phases",
            "contact_info.buildingId",
            "buildings_and_phases.id"
          )
          .where({
            "contact_info.orgId": req.orgId,
            "contact_info.contactId": 1,
            "contact_info.isActive": true,
          })
          .where("contact_info.buildingId", b.buildingPhaseId)
          .select(
            "contact_info.contactId as Id",
            "contact_info.contactValue as contactValue"
          )
          .orderBy("contact_info.id", "desc");

        faxInfo = await knex
          .from("contact_info")
          .innerJoin(
            "buildings_and_phases",
            "contact_info.buildingId",
            "buildings_and_phases.id"
          )
          .where({
            "contact_info.orgId": req.orgId,
            "contact_info.contactId": 2,
            "contact_info.isActive": true,
          })
          .where("contact_info.buildingId", b.buildingPhaseId)
          .select(
            "contact_info.contactId as Id",
            "contact_info.contactValue as contactValue"
          )
          .orderBy("contact_info.id", "desc");

        emailInfo = await knex
          .from("contact_info")
          .innerJoin(
            "buildings_and_phases",
            "contact_info.buildingId",
            "buildings_and_phases.id"
          )
          .where({
            "contact_info.orgId": req.orgId,
            "contact_info.isActive": true,
            "contact_info.contactId": 3,
          })
          .where("contact_info.buildingId", b.buildingPhaseId)
          .select(
            "contact_info.contactId as Id",
            "contact_info.contactValue as contactValue"
          )
          .orderBy("contact_info.id", "desc");

        telInfo = await knex
          .from("contact_info")
          .innerJoin(
            "buildings_and_phases",
            "contact_info.buildingId",
            "buildings_and_phases.id"
          )
          .where({
            "contact_info.orgId": req.orgId,
            "contact_info.isActive": true,
            "contact_info.contactId": 4,
          })
          .where("contact_info.buildingId", b.buildingPhaseId)
          .select(
            "contact_info.contactId as Id",
            "contact_info.contactValue as contactValue"
          )
          .orderBy("contact_info.id", "desc");

        lineInfo = await knex
          .from("contact_info")
          .innerJoin(
            "buildings_and_phases",
            "contact_info.buildingId",
            "buildings_and_phases.id"
          )
          .where({
            "contact_info.orgId": req.orgId,
            "contact_info.isActive": true,
            "contact_info.contactId": 5,
          })
          .where("contact_info.buildingId", b.buildingPhaseId)
          .select(
            "contact_info.contactId as Id",
            "contact_info.contactValue as contactValue"
          )
          .orderBy("contact_info.id", "desc");

        descriptionInfo = await knex
          .from("contact_info")
          .innerJoin(
            "buildings_and_phases",
            "contact_info.buildingId",
            "buildings_and_phases.id"
          )
          .where({
            "contact_info.orgId": req.orgId,
            "contact_info.isActive": true,
            "contact_info.contactId": 0,
          })
          .where("contact_info.buildingId", b.buildingPhaseId)
          .select(
            "contact_info.contactId as Id",
            "contact_info.contactValue as contactValue"
          )
          .orderBy("contact_info.id", "desc");

        let imageResult = await knex
          .from("images")
          .select("s3Url", "title", "name")
          .where({
            entityType: "contact_info",
          })
          .where("images.entityId", b.buildingPhaseId);

        let propertyDetails = await knex.from("property_units")
        .leftJoin("floor_and_zones","property_units.floorZoneId","floor_and_zones.id")
        .leftJoin("buildings_and_phases","property_units.buildingPhaseId","buildings_and_phases.id")
        .leftJoin("projects","property_units.projectId","projects.id")
        .select([
          "property_units.unitNumber",
          "property_units.description",
          "floor_and_zones.floorZoneCode",
          "buildings_and_phases.buildingPhaseCode",
          "projects.projectName"
        ])
        .where({
          "property_units.buildingPhaseId":b.buildingPhaseId,
          "property_units.id":b.id
        });

        contact.push({
          phoneData: contactInfo,
          faxData: faxInfo,
          emailData: emailInfo,
          description: descriptionInfo,
          telData: telInfo,
          lineData: lineInfo,
          imageResult,
          propertyDetails
        });
      }

      return res.status(200).json({
        data: {
          contact,
        },
        message: "Contact Information!",
      });
    } catch (err) {
      console.log(
        "[controllers][Contact][getContactList],Error",
        err
      );
    }
  },
  getUsersInfo: async (req, res) => {
    try {
      console.log("customerInfo", req.me.id);
      console.log("customerHouseInfo", req.me.houseIds);

      userHouseResult = await knex
        .from("user_house_allocation")
        .where({ userId: req.me.id, orgId: req.orgId })
        .whereIn("houseId", req.me.houseIds);

      let houseIdArray = userHouseResult.map(
        (v) => v.houseId
      );

      propertyUnitFinalResult = await knex
        .from("property_units")
        .where({ orgId: req.orgId })
        .whereIn("id", houseIdArray);

      let projectArray = _.uniqBy(
        propertyUnitFinalResult,
        "projectId"
      ).map((v) => v.projectId);

      let userInfo;

      userInfo = await knex("projects")
        .select("projects.projectName")
        .where({
          "projects.orgId": req.orgId,
        })
        .whereIn("projects.id", projectArray);

      console.log(
        "[controllers][Dashboard][getUserInfo]: View Data",
        userInfo
      );

      return res.status(200).json({
        data: {
          userInfo,
        },
        message: "User Information!",
      });
    } catch (err) {
      console.log(
        "[controllers][Dashboard][getUserInfo],Error",
        err
      );
    }
  },

  /* GET ORGANISATION DETAILS FOR USER */
  getUsersAccessControls: async (req, res) => {
    try {
      let orgId = req.orgId;

      let resourcesArr = [];
      let resourceResult = await knex(
        "organisation_resources_master"
      )
        .leftJoin(
          "resources",
          "organisation_resources_master.resourceId",
          "resources.id"
        )
        .where({
          "organisation_resources_master.orgId": orgId,
          "organisation_resources_master.userStatus": true,
        });

      for (resource of resourceResult) {
        resourcesArr.push(resource.resourceId);
      }

      return res.status(200).json({
        data: {
          userAccessControl: {
            resources: resourcesArr,
            resourceDetail: resourceResult,
          },
        },
        message: "Access Control Details!.",
      });
    } catch (err) {
      res.status(500).json({
        errors: [
          {
            code: "UNKNOWN_SERVER_ERROR",
            message: err.message,
          },
        ],
      });
    }
  },

  /* GET ORGANISATION DETAILS FOR ADMIN */
  getOrganisationDetailsForTheme: async (req, res) => {

    try {

      let id = req.orgId || parseInt(req.query.id);

      let domain = req.query.domain;
      console.log(req.query);
      console.log("******** res **********",req);

      let result;

      if (domain) {
        result = await knexReader("organisations")
          .select([
            'organisations.id', 'organisations.organisationName', 'organisations.domainName', 'organisations.themeConfig'
          ])
          .where({ 'organisations.domainName': domain }).first();
      } else {
        result = await knexReader("organisations")
          .select([
            'organisations.id', 'organisations.organisationName', 'organisations.domainName', 'organisations.themeConfig'
          ])
          .where({ 'organisations.id': id }).first();
      }

      if (!result?.themeConfig || result.themeConfig == '' || Object.keys(result.themeConfig).length <= 0) {
        result = await knexReader("organisations")
          .select([
            'organisations.id', 'organisations.organisationName', 'organisations.domainName', 'organisations.themeConfig'
          ])
          .where({ 'organisations.id': 1 }).first();
      }

      return res.status(200).json({
        data: {
          organisationDetails: { ...result }
        },
        message: "Organisation Details!."
      });

    } catch (err) {
      console.error("[controllers][dashboard][getOrganisationDetailsForTheme] :  Error",err);
      return res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
};

module.exports = dashboardController;
