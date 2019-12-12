const express = require('express');
const router = express.Router();

const statusController = require('../../controllers/administration-features/status');

const authMiddleware = require('../../middlewares/auth');


/* GET users listing. */

router.post('/add-status', authMiddleware.isAuthenticated,  statusController.addStatus);
router.post('/update-status', authMiddleware.isAuthenticated,  statusController.updateStatus);
router.get('/get-status-list', authMiddleware.isAuthenticated,  statusController.getStatusList);
router.post('/delete-status', authMiddleware.isAuthenticated,  statusController.deleteStatus);
// Export Status Data
router.get('/export-status', authMiddleware.isAuthenticated,  statusController.exportStatus);
router.post('/status-details', authMiddleware.isAuthenticated,  statusController.statusDetails);


module.exports = router;
 