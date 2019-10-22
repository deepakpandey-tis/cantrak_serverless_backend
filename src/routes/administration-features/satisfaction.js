const express = require('express');
const router = express.Router();

const satisfactionController = require('../../controllers/administration-features/satisfaction');

const authMiddleware = require('../../middlewares/auth');


/* GET users listing. */

router.post('/add-satisfaction', authMiddleware.isAuthenticated, authMiddleware.isAdmin, satisfactionController.addSatisfaction);
router.post('/update-satisfaction', authMiddleware.isAuthenticated, authMiddleware.isAdmin, satisfactionController.updateSatisfaction);
router.get('/get-satisfaction-list', authMiddleware.isAuthenticated, authMiddleware.isAdmin, satisfactionController.getSatisfactionList);
router.post('/delete-satisfaction', authMiddleware.isAuthenticated, authMiddleware.isAdmin, satisfactionController.deleteSatisfaction);
// Export Satisfaction Data
router.get('/export-satisfaction', authMiddleware.isAuthenticated, authMiddleware.isAdmin, satisfactionController.exportSatisfaction);



module.exports = router;
 