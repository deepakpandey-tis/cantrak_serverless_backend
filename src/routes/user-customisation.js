const { Router } = require("express")
const path = require("path")
const router = Router()
const authMiddleware = require('../middlewares/auth')
// const roleMiddleware = require('../middlewares/role')
// const resourceAccessMiddleware = require('../middlewares/resourceAccessMiddleware');
const userCustomisationController = require('../controllers/user-customisation');


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

module.exports = router;
