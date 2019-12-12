const express = require('express');
const router = express.Router();

const satisfactionController = require('../../controllers/administration-features/satisfaction');

const authMiddleware = require('../../middlewares/auth');


/* GET users listing. */

router.post('/add-satisfaction', authMiddleware.isAuthenticated,  satisfactionController.addSatisfaction);
router.post('/update-satisfaction', authMiddleware.isAuthenticated,  satisfactionController.updateSatisfaction);
router.get('/get-satisfaction-list', authMiddleware.isAuthenticated,  satisfactionController.getSatisfactionList);
router.post('/delete-satisfaction', authMiddleware.isAuthenticated,  satisfactionController.deleteSatisfaction);
// Export Satisfaction Data
router.get('/export-satisfaction', authMiddleware.isAuthenticated,  satisfactionController.exportSatisfaction);
router.post('/satisfaction-details', authMiddleware.isAuthenticated,  satisfactionController.satisfactionDetails);



module.exports = router;
 