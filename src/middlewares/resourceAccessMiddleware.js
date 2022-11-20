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

    console.log("==== userGrowingLocationsResources ===", req.userGrowingLocationsResources);

    let uriData = req.originalUrl.split('/');

    console.log("=== uri ===", uriData);

    let code;

    if(uriData?.length > 1){
      code = uriData[1];
    }

    if(code && code != ''){

      console.log("=== code ===", code);

      let keys = req.userGrowingLocationsResources.map(v => v.code);
      if (keys.includes(code)) {
        let GROWINGLOCATION = req.userGrowingLocationsResources.filter(v => v.code == code)[0]?.locations;
        console.log('[middleware][resourceAccessMiddleware]: isAccessible: ', true);
        setAccessibleProjects(req, 1);

        if(GROWINGLOCATION.length <= 0){
          //  growinglocations not entered?: since id cannot be 0;
          //  setting one entry as '0' to avoid syntax error in subsequent sql calls 'id in ()' instead of 'id in (0)'
          GROWINGLOCATION = ['0'];
        }

        console.log("==== GROWINGLOCATION ====", GROWINGLOCATION);
        req.GROWINGLOCATION = GROWINGLOCATION;
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
  }

};

module.exports = resourceAccessMiddleware;