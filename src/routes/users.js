const express = require('express');
const router = express.Router();

const authMiddleware = require('../middlewares/auth');

const usersController = require('../controllers/users');


/* GET users listing. */
router.get('/', authMiddleware.isAuthenticated, authMiddleware.isAdmin, usersController.list);

module.exports = router;
