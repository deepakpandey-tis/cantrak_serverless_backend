const express = require('express');
const router = express.Router();

const authMiddleware = require('../middlewares/auth');

const usersController = require('../controllers/users');


/* GET users listing. */
router.get('/', authMiddleware.isAuthenticated, usersController.list);
router.get('/get-user-details', authMiddleware.isAuthenticated, usersController.getUserDetails);
router.post('/update-user-details', authMiddleware.isAuthenticated, usersController.updateUserDetails)
router.get('/get-all-users',authMiddleware.isAuthenticated,usersController.getAllUsers)
router.get('/get-all-requestBy',authMiddleware.isAuthenticated,usersController.getAllRequestBy)

router.get('/get-all-users-for-service-request',authMiddleware.isAuthenticated,usersController.getAllUsersForServiceRequest)


module.exports = router;
