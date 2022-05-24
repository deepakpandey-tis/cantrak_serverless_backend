const { Router } = require("express")
const path = require("path")
const router = Router()
const authMiddleware = require('../middlewares/auth')
const roleMiddleware = require('../middlewares/role')
const resourceAccessMiddleware = require('../middlewares/resourceAccessMiddleware');
const userActivitiesController = require('../controllers/user-activities');


router.post('/get-user-activities',
  authMiddleware.isAuthenticated,
//   roleMiddleware.parseUserPermission,
//   resourceAccessMiddleware.isAccessible,
  userActivitiesController.getUserActivities
);

router.post('/get-user-activity-list',
  authMiddleware.isAuthenticated,
//   roleMiddleware.parseUserPermission,
//   resourceAccessMiddleware.isAccessible,
  userActivitiesController.getUserActivityList
);


router.get('/get-companies',
  authMiddleware.isAuthenticated,
  // roleMiddleware.parseUserPermission,
  // resourceAccessMiddleware.isAccessible,
  userActivitiesController.getCompanies
);

router.get('/get-users',
  authMiddleware.isAuthenticated,
  // roleMiddleware.parseUserPermission,
  // resourceAccessMiddleware.isAccessible,
  userActivitiesController.getUsers
);

module.exports = router;
