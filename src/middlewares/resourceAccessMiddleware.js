const createError = require('http-errors')

const resourceAccessMiddleware = {
  isPMAccessible: async (req, res, next) => {
    if (req.superAdmin) {
      return next();
    }
    let keys = req.userProjectResources.map(v => v.id);
    if (keys.includes(1) || keys.includes("1")) {
      console.log('[middleware][resourceAccessMiddleware]: isPMAccessible: ', true);
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
      next();
    } else {
      console.log('[middleware][resourceAccessMiddleware]: isAssetAccessible: ', false);
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
      next();
    } else {
      console.log('[middleware][resourceAccessMiddleware]: isPropertySetupAccessible: ', false);
      next(createError(403));
    }
  }
};

module.exports = resourceAccessMiddleware;