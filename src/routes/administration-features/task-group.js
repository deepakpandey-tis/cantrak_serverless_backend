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

//CREATE PM TASK GROUP SCHEDULE
router.post('/create-pm-taskgroup-schedule',authMiddleware.isAuthenticated,authMiddleware.isAdmin, taskGroupController.createPmTaskgroupSchedule)

// GET TASK GROUP SCHEDULE LIST
router.post('/get-taskgroup-schedule-list',authMiddleware.isAuthenticated,authMiddleware.isAdmin, taskGroupController.getTaskGroupScheduleList)

router.get('/get-pm-list',authMiddleware.isAuthenticated,authMiddleware.isAdmin,taskGroupController.getPmList)


router.post('/create-brand-new-pm',authMiddleware.isAuthenticated,authMiddleware.isAdmin,taskGroupController.createBrandNewPm)


module.exports = router