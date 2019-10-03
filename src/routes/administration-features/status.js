const express = require('express');
const router = express.Router();

const statusController = require('../../controllers/administration-features/status');

const authMiddleware = require('../../middlewares/auth');


/* GET users listing. */

router.post('/add-status', authMiddleware.isAuthenticated, authMiddleware.isAdmin, statusController.addStatus);
router.post('/update-status', authMiddleware.isAuthenticated, authMiddleware.isAdmin, statusController.updateStatus);
router.get('/get-status-list', authMiddleware.isAuthenticated, authMiddleware.isAdmin, statusController.getStatusList);
router.post('/delete-status', authMiddleware.isAuthenticated, authMiddleware.isAdmin, statusController.deleteStatus);


module.exports = router;
 