const {Router} = require('express');
const router = Router();
const authMiddleware = require('../../middlewares/auth')
const roleMiddleware = require('../../middlewares/role')
const resourceAccessMiddleware = require('../../middlewares/resourceAccessMiddleware')
const allUsersController = require('../../controllers/administration-features/all-users');


/* GET ALL USERS LIST */
router.post('/users-list',
authMiddleware.isAuthenticated,
authMiddleware.isSuperAdmin,
allUsersController.usersList);

/*GET ALL ROLE LIST */
router.get('/get-all-role-list',
authMiddleware.isAuthenticated,
allUsersController.getAllRoleList);

/*USER DETAILS*/
router.post('/user-details',
authMiddleware.isAuthenticated,
allUsersController.userDetails);

/* LOGIN AS USER */
router.post('/login-as-user',
authMiddleware.isAuthenticated,
authMiddleware.isSuperAdmin,
allUsersController.loginAsUser);


module.exports = router;