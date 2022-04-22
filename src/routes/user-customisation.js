const { Router } = require("express")
const path = require("path")
const router = Router()
const authMiddleware = require('../middlewares/auth')
// const roleMiddleware = require('../middlewares/role')
// const resourceAccessMiddleware = require('../middlewares/resourceAccessMiddleware');
const userCustomisationController = require('../controllers/user-customisation');


router.get('/get-list-component-columns-templates',
  authMiddleware.isAuthenticated,
//   roleMiddleware.parseUserPermission,
//   resourceAccessMiddleware.isAccessible,
  userCustomisationController.getListComponentColumnsTemplates
);

router.post('/add-list-component-columns-template',
  authMiddleware.isAuthenticated,
//   roleMiddleware.parseUserPermission,
//   resourceAccessMiddleware.isAccessible,
  userCustomisationController.addListComponentColumnsTemplate
);

router.get('/get-user-list-component-columns',
  authMiddleware.isAuthenticated,
//   roleMiddleware.parseUserPermission,
//   resourceAccessMiddleware.isAccessible,
  userCustomisationController.getUserListComponentColumns
);

router.post('/add-user-list-component-columns',
  authMiddleware.isAuthenticated,
//   roleMiddleware.parseUserPermission,
//   resourceAccessMiddleware.isAccessible,
  userCustomisationController.addUserListComponentColumns
);

router.post('/update-user-list-component-columns',
  authMiddleware.isAuthenticated,
//   roleMiddleware.parseUserPermission,
//   resourceAccessMiddleware.isAccessible,
  userCustomisationController.updateUserListComponentColumns
);

router.post('/add-user-chart-prefrences',
  authMiddleware.isAuthenticated,
  userCustomisationController.addUserChartPrefresences
);

router.get('/get-user-chart-prefrence-details/:companyId',
  authMiddleware.isAuthenticated,
  userCustomisationController.getUserChartPrefrenceDetails
);

module.exports = router;
