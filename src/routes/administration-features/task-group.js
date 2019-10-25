const { Router } = require("express")

const router = Router()
const authMiddleware  = require('../../middlewares/auth')
const taskGroupController = require('../../controllers/administration-features/task-group')
// Create Task Group Template
router.post('/create-task-group-template', authMiddleware.isAuthenticated,authMiddleware.isAdmin, taskGroupController.createTaskGroupTemplate)

// Get List Task Template 
router.post('/get-group-template-list',authMiddleware.isAuthenticated,authMiddleware.isAdmin, taskGroupController.getGroupTemplateList)





module.exports = router