const express = require('express');
const router = express.Router();

const userManagementController = require('../controllers/user-management');

const authMiddleware = require('../middlewares/auth');


/* GET users listing. */

router.get('/availabel-roles', authMiddleware.isAuthenticated, userManagementController.roleList);
router.get('/get-role-list', authMiddleware.isAuthenticated, userManagementController.getRoleList);

router.post('/update-user-roles', authMiddleware.isAuthenticated, userManagementController.updateUserRoles);

module.exports = router;
