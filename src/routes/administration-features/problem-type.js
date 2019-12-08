const { Router } = require("express")

const router = Router();
const authMiddleware = require('../../middlewares/auth')
const problemTypeController = require('../../controllers/administration-features/problem-type')

router.post('/add-problem-type', authMiddleware.isAuthenticated, problemTypeController.addProblemType)
router.post('/update-problem-type', authMiddleware.isAuthenticated, problemTypeController.updateProblemType)
router.post('/problem-type-details', authMiddleware.isAuthenticated, problemTypeController.viewProblemType)
// router.post('/delete-project', authMiddleware.isAuthenticated, projectController.deleteProject)
router.get('/get-problem-type-list', authMiddleware.isAuthenticated, problemTypeController.getProblemTypeList)
/// Export Project Data 
//router.get('/export-project', authMiddleware.isAuthenticated, projectController.exportProject)

module.exports = router