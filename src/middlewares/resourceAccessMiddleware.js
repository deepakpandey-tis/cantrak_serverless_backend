const createError = require('http-errors');
const _ = require('lodash');


const setAccessibleProjects = (req, resourceId) => {
  // Set Projects (Only Related to this Resource) to req object....
  let allProjectsWithResources = req.userPlantationResources;
  allProjectsWithResources = allProjectsWithResources.find(pfp => pfp.id == resourceId);
  let accessibleProjects = allProjectsWithResources?.projects;
  accessibleProjects = _.uniqBy(accessibleProjects);
  req.accessibleProjects = accessibleProjects;
}

const resourceAccessMiddleware = {


  isAccessible: async (req, res, next) => {
    if (req.superAdmin) {
      return next();
    }

    console.log("==== userPlantationResources ===", req.userPlantationResources);

    let uriData = req.originalUrl.split('/');

    console.log("=== uri ===", uriData);

    let code;

    if(uriData?.length > 1){
      code = uriData[1];
    }

    if(code && code != ''){

      console.log("=== code ===", code);

      let keys = req.userPlantationResources.map(v => v.code);
      if (keys.includes(code)) {
        console.log('[middleware][resourceAccessMiddleware]: isAccessible: ', true);
        setAccessibleProjects(req, 1);
        return next();
      } else {
        console.log('[middleware][resourceAccessMiddleware]: isAccessible: ', false);
        return next(createError(403));
      }
    }
    else {
      console.log('[middleware][resourceAccessMiddleware]: isAccessible: ', false);
      return next(createError(403));
    }
  },

  isPMAccessible: async (req, res, next) => {
    if (req.superAdmin) {
      return next();
    }
    let keys = req.userPlantationResources.map(v => v.code);
    if (keys.includes("PMA")) {
      console.log('[middleware][resourceAccessMiddleware]: isPMAccessible: ', true);
      setAccessibleProjects(req, 1);
      return next();
    } else {
      console.log('[middleware][resourceAccessMiddleware]: isPMAccessible: ', false);
      return next(createError(403));
    }
  },


  isCMAccessible: async (req, res, next) => {
    if (req.superAdmin) {
      return next();
    }
    let keys = req.userPlantationResources.map(v => v.code);
    if (keys.includes("CMA")) {
      console.log('[middleware][resourceAccessMiddleware]: isCMAccessible: ', true);
      setAccessibleProjects(req, 2);
      next();
    } else {
      console.log('[middleware][resourceAccessMiddleware]: isCMAccessible: ', false);
      next(createError(403));
    }
  },


  isPartAccessible: async (req, res, next) => {
    if (req.superAdmin) {
      return next();
    }
    let keys = req.userPlantationResources.map(v => v.code);
    if (keys.includes("part")) {
      console.log('[middleware][resourceAccessMiddleware]: isPartAccessible: ', true);
      setAccessibleProjects(req, 3);
      next();
    } else {
      console.log('[middleware][resourceAccessMiddleware]: isPartAccessible: ', false);
      next(createError(403));
    }
  },


  isAssetAccessible: async (req, res, next) => {
    if (req.superAdmin) {
      return next();
    }
    let keys = req.userPlantationResources.map(v => v.code);
    if (keys.includes("work-plans")) {
      console.log('[middleware][resourceAccessMiddleware]: isAssetAccessible: ', true);
      setAccessibleProjects(req, 4);
      next();
    } else {
      console.log('[middleware][resourceAccessMiddleware]: isAssetAccessible: ', false);
      next(createError(403));
    }
  },


  isPurchaseRequest: async (req, res, next) => {
    if (req.superAdmin) {
      return next();
    }
    let keys = req.userPlantationResources.map(v => v.code);
    if (keys.includes("purchase")) {
      console.log('[middleware][resourceAccessMiddleware]: isPurchaseRequest: ', true);
      setAccessibleProjects(req, 5);
      next();
    } else {
      console.log('[middleware][resourceAccessMiddleware]: isPurchaseRequest: ', false);
      next(createError(403));
    }
  },


  isBillingAccessible: async (req, res, next) => {
    if (req.superAdmin) {
      return next();
    }
    let keys = req.userPlantationResources.map(v => v.code);
    if (keys.includes("billing")) {
      console.log('[middleware][resourceAccessMiddleware]: isBillingAccessible: ', true);
      setAccessibleProjects(req, 6);
      next();
    } else {
      console.log('[middleware][resourceAccessMiddleware]: isBillingAccessible: ', false);
      next(createError(403));
    }
  },


  isPropertySetupAccessible: async (req, res, next) => {
    if (req.superAdmin) {
      return next();
    }
    let keys = req.userPlantationResources.map(v => v.code);
    if (keys.includes("propertySetup")) {
      console.log('[middleware][resourceAccessMiddleware]: isPropertySetupAccessible: ', true);
      setAccessibleProjects(req, 7);
      next();
    } else {
      console.log('[middleware][resourceAccessMiddleware]: isPropertySetupAccessible: ', false);
      next(createError(403));
    }
  },


  isTeamRolesSetupAccessible: async (req, res, next) => {
    if (req.superAdmin) {
      return next();
    }
    let keys = req.userPlantationResources.map(v => v.code);
    if (keys.includes("teamRolesSetup")) {
      console.log('[middleware][resourceAccessMiddleware]: isTeamRolesSetupAccessible: ', true);
      setAccessibleProjects(req, 8);
      next();
    } else {
      console.log('[middleware][resourceAccessMiddleware]: isTeamRolesSetupAccessible: ', false);
      next(createError(403));
    }
  },


  isFacilityManagementAccessible: async (req, res, next) => {
    if (req.superAdmin) {
      return next();
    }
    let keys = req.userPlantationResources.map(v => v.code);
    if (keys.includes("facilityManagement")) {
      console.log('[middleware][resourceAccessMiddleware]: isFacilityManagementAccessible: ', true);
      setAccessibleProjects(req, 9);
      next();
    } else {
      console.log('[middleware][resourceAccessMiddleware]: isFacilityManagementAccessible: ', false);
      next(createError(403));
    }
  },


  isParcelManagementAccessible: async (req, res, next) => {
    if (req.superAdmin) {
      return next();
    }
    let keys = req.userPlantationResources.map(v => v.code);
    if (keys.includes("parcelManagement")) {
      console.log('[middleware][resourceAccessMiddleware]: isParcelManagementAccessible: ', true);
      setAccessibleProjects(req, 10);
      next();
    } else {
      console.log('[middleware][resourceAccessMiddleware]: isParcelManagementAccessible: ', false);
      next(createError(403));
    }
  },

  isAnnouncementAccessible: async (req, res, next) => {
    if (req.superAdmin) {
      return next();
    }
    let keys = req.userPlantationResources.map(v => v.code);
    if (keys.includes("announcement")) {
      console.log('[middleware][resourceAccessMiddleware]: isAnnouncementtAccessible: ', true);
      setAccessibleProjects(req, 11);
      next();
    } else {
      console.log('[middleware][resourceAccessMiddleware]:isAnnouncementtAccessible: ', false);
      next(createError(403));
    }
  },

  isAGMAccessible: async (req, res, next) => {
    if (req.superAdmin) {
      return next();
    }
    let keys = req.userPlantationResources.map(v => v.code);
    if (keys.includes("AGM")) {
      console.log('[middleware][resourceAccessMiddleware]: isAGMAccessible: ', true);
      setAccessibleProjects(req, 14);
      next();
    } else {
      console.log('[middleware][resourceAccessMiddleware]:isAGMAccessible: ', false);
      next(createError(403));
    }
  },

  isVisitorManagementAccessible: async (req, res, next) => {
    if (req.superAdmin) {
      return next();
    }
    let keys = req.userPlantationResources.map(v => v.code);
    if (keys.includes("visitorManagement")) {
      console.log('[middleware][resourceAccessMiddleware]: isVisitorManagementAccessible: ', true);
      setAccessibleProjects(req, 15);
      next();
    } else {
      console.log('[middleware][resourceAccessMiddleware]: isVisitorManagementAccessible: ', false);
      next(createError(403));
    }
  },

  isMeterManagementAccessible: async (req, res, next) => {
    if (req.superAdmin) {
      return next();
    }
    let keys = req.userPlantationResources.map(v => v.code);
    if (keys.includes("meterManagement")) {
      console.log('[middleware][resourceAccessMiddleware]: isMeterManagementAccessible: ', true);
      setAccessibleProjects(req, 16);
      next();
    } else {
      console.log('[middleware][resourceAccessMiddleware]: isMeterManagementAccessible: ', false);
      next(createError(403));
    }
  }

};

module.exports = resourceAccessMiddleware;