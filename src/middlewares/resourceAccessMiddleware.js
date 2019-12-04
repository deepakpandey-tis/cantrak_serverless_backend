const createError = require('http-errors')

const resourceAccessMiddleware = {
  isPMAccessible: async (req, res, next) => {
    let keys = req.userProjectResources.map(v => v.id);
    if (keys.includes("1")) {
      next();
    } else {
      next(createError(401));
    }
  },
  isCMAccessible: async (req, res, next) => {
    let keys = req.userProjectResources.map(v => v.id);
    if (keys.includes("2")) {
      next();
    } else {
      next(createError(401));
    }
  },
  isPartAccessible: async (req, res, next) => {
    let keys = req.userProjectResources.map(v => v.id);
    if (keys.includes("3")) {
      next();
    } else {
      next(createError(401));
    }
  },
  isAssetAccessible: async (req, res, next) => {
    let keys = req.userProjectResources.map(v => v.id);
    if (keys.includes("4")) {
      next();
    } else {
      next(createError(401));
    }
  },
  isBillingAccessible: async (req, res, next) => {
    let keys = req.userProjectResources.map(v => v.id);
    if (keys.includes("6")) {
      next();
    } else {
      next(createError(401));
    }
  }
};

module.exports = resourceAccessMiddleware;