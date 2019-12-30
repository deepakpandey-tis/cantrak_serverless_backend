const createError = require('http-errors')

const resourceAccessMiddleware = {
  isPMAccessible: async (req, res, next) => {
    if(req.superAdmin) {
      return next();
    }
    let keys = req.userProjectResources.map(v => v.id);
    if (keys.includes("1")) {
      return next();
    } else {
      return next(createError(403));
    }
  },
  isCMAccessible: async (req, res, next) => {
    if(req.superAdmin) {
      return next();
    }
    let keys = req.userProjectResources.map(v => v.id);
    if (keys.includes("2")) {
      next();
    } else {
      next(createError(403));
    }
  },
  isPartAccessible: async (req, res, next) => {
    if(req.superAdmin) {
      return next();
    }
    let keys = req.userProjectResources.map(v => v.id);
    if (keys.includes("3")) {
      next();
    } else {
      next(createError(403));
    }
  },
  isAssetAccessible: async (req, res, next) => {
    if(req.superAdmin) {
      return next();
    }
    let keys = req.userProjectResources.map(v => v.id);
    if (keys.includes("4")) {
      next();
    } else {
      next(createError(403));
    }
  },
  isBillingAccessible: async (req, res, next) => {
    if(req.superAdmin) {
      return next();
    }
    let keys = req.userProjectResources.map(v => v.id);
    if (keys.includes("6")) {
      next();
    } else {
      next(createError(403));
    }
  }
};

module.exports = resourceAccessMiddleware;