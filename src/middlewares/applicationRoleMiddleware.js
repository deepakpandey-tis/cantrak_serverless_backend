const createError = require("http-errors");

const applicationRoleMiddleware = {
  isSuperAdmin: async (req, res, next) => {
    console.log('Inside app role middleware: ',{me:req.me})
    let user = req.me;
    if(user.id === '59'){
        next()
        return;
    }
    return next(createError(403))
  }
};

module.exports = applicationRoleMiddleware;
