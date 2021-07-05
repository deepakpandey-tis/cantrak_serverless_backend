const createError = require('http-errors');
const _ = require('lodash');


const setAccessibleProjects = (req, resourceId) => {
  // Set Projects (Only Related to this Resource) to req object....
  let allProjectsWithResources = req.userProjectResources;
  allProjectsWithResources = allProjectsWithResources.find(pfp => pfp.id == resourceId);
  let accessibleProjects = allProjectsWithResources.projects;
  accessibleProjects = _.uniqBy(accessibleProjects);
  req.accessibleProjects = accessibleProjects;
}

const resourceAccessMiddleware = {

  isPMAccessible: async (req, res, next) => {
    if (req.superAdmin) {
      return next();
    }
    let keys = req.userProjectResources.map(v => v.id);
    if (keys.includes(1) || keys.includes("1")) {
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
    let keys = req.userProjectResources.map(v => v.id);
    if (keys.includes(2) || keys.includes("2")) {
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
    let keys = req.userProjectResources.map(v => v.id);
    if (keys.includes(3) || keys.includes("3")) {
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
    let keys = req.userProjectResources.map(v => v.id);
    if (keys.includes(4) || keys.includes("4")) {
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
    let keys = req.userProjectResources.map(v => v.id);
    if (keys.includes(5) || keys.includes("5")) {
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
    let keys = req.userProjectResources.map(v => v.id);
    if (keys.includes(6) || keys.includes("6")) {
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
    let keys = req.userProjectResources.map(v => v.id);
    if (keys.includes(7) || keys.includes("7")) {
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
    let keys = req.userProjectResources.map(v => v.id);
    if (keys.includes(8) || keys.includes("8")) {
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
    let keys = req.userProjectResources.map(v => v.id);
    if (keys.includes(9) || keys.includes("9")) {
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
    let keys = req.userProjectResources.map(v => v.id);
    if (keys.includes(10) || keys.includes("10")) {
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
    let keys = req.userProjectResources.map(v => v.id);
    if (keys.includes(11) || keys.includes("11")) {
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
    let keys = req.userProjectResources.map(v => v.id);
    if (keys.includes(14) || keys.includes("14")) {
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
    let keys = req.userProjectResources.map(v => v.id);
    if (keys.includes(15) || keys.includes("15")) {
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
    let keys = req.userProjectResources.map(v => v.id);
    if (keys.includes(16) || keys.includes("16")) {
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