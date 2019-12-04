const express = require('express');
const router = express.Router();

const authMiddleware = require('../middlewares/auth');

const usersController = require('../controllers/users');


/* GET users listing. */
router.get('/', authMiddleware.isAuthenticated, authMiddleware.isSuperAdmin, usersController.list);
router.get('/get-user-details', authMiddleware.isAuthenticated, authMiddleware.isSuperAdmin, usersController.getUserDetails);
router.post('/update-user-details', authMiddleware.isAuthenticated, authMiddleware.isSuperAdmin, usersController.updateUserDetails)
router.get('/get-all-users',authMiddleware.isAuthenticated,usersController.getAllUsers)

module.exports = router;
