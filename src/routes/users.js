const express = require('express');
const router = express.Router();

const authMiddleware = require('../middlewares/auth');

const usersController = require('../controllers/users');


/* GET users listing. */
router.get('/', authMiddleware.isAuthenticated, authMiddleware.isSuperAdmin, usersController.list);
router.get('/get-user-details', authMiddleware.isAuthenticated, authMiddleware.isSuperAdmin, usersController.getUserDetails);

module.exports = router;
