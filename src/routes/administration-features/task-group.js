const { Router } = require("express")

const router = Router()
const authMiddleware  = require('../../middlewares/auth')
const taskGroupController = require('../../controllers/administration-features/task-group')

// CREATE TASK GROUP TEMPLATE
router.post('/create-task-group-template', authMiddleware.isAuthenticated,authMiddleware.isAdmin, taskGroupController.createTaskGroupTemplate)
 
// GET LIST TASK TEMPLATE
router.post('/get-group-template-list',authMiddleware.isAuthenticated,authMiddleware.isAdmin, taskGroupController.getGroupTemplateList)

// GET GROUP TASK LIST
router.post('/get-group-task-list',authMiddleware.isAuthenticated,authMiddleware.isAdmin, taskGroupController.getGroupTaskList)

//ASSIGN PM TASK GROUP TEAM
router.post('/assign-pm-taskgroup-team',authMiddleware.isAuthenticated,authMiddleware.isAdmin, taskGroupController.assignPmTaskGroupTeam)






module.exports = router