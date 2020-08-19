const express = require('express');
const router = express.Router();

const entranceController = require('../controllers/entrance');

const authMiddleware = require('../middlewares/auth');


/* GET users listing. */
router.post('/login', entranceController.login);

router.post('/sign-up', entranceController.signUp);

router.post('/forgot-password', entranceController.forgotPassword);

router.post('/verify-user', entranceController.verifyUser);

router.get('/me', authMiddleware.isAuthenticated, entranceController.me);

router.post('/change-password', authMiddleware.isAuthenticated, entranceController.changePassword);

router.post('/authorize-line-account', authMiddleware.isAuthenticated, entranceController.authorizeLineAccount);

router.get('/remove-line-account', authMiddleware.isAuthenticated, entranceController.removeLineAccount);


module.exports = router;
