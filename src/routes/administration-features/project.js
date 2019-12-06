const { Router } = require("express")

const router = Router()
const authMiddleware = require('../../middlewares/auth')
const projectController = require('../../controllers/administration-features/project')

router.post('/add-project', authMiddleware.isAuthenticated, projectController.addProject)
router.post('/update-project', authMiddleware.isAuthenticated, projectController.updateProject)
router.post('/view-project', authMiddleware.isAuthenticated, projectController.viewProject)
router.post('/delete-project', authMiddleware.isAuthenticated, projectController.deleteProject)
router.get('/get-project-list', authMiddleware.isAuthenticated, projectController.getProjectList)
/// Export Project Data 
router.get('/export-project', authMiddleware.isAuthenticated, projectController.exportProject)
router.get('/get-project-by-companies', projectController.getProjectByCompany)
router.get('/get-project-all-list',authMiddleware.isAuthenticated,projectController.getProjectAllList)

module.exports = router