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

// GET TASK GROUP ASSET PMS LIST
router.post('/get-task-group-asset-pms-list',authMiddleware.isAuthenticated,authMiddleware.isAdmin,taskGroupController.getTaskGroupAssetPmsList)

// CREATE TASK TEMPLATE
router.post('/create-task-template',authMiddleware.isAuthenticated,authMiddleware.isAdmin,taskGroupController.createTaskTemplate)
// GET TASK TEMPLATE LIST
router.post('/get-task-template-list',authMiddleware.isAuthenticated,authMiddleware.isAdmin,taskGroupController.getTaskTemplateList)

// GET TASK TEMPLATE COMPLETE DATA
router.post('/get-task-template-complete-list',authMiddleware.isAuthenticated,authMiddleware.isAdmin,taskGroupController.getTaskTemplateComplateList)

// GET TASK GROUP ASSET PM DETAILS
router.post('/get-taskgroup-asset-pm-details',authMiddleware.isAuthenticated,authMiddleware.isAdmin,taskGroupController.getTaskgroupAssetPmDetails)

// GET PM TASK DETAILS
router.post('/get-pm-task-details',authMiddleware.isAuthenticated,authMiddleware.isAdmin,taskGroupController.getPmTaskDetails)

router.post('/create-pm-template',authMiddleware.isAuthenticated,authMiddleware.isAdmin,taskGroupController.createPMTemplate)
router.post('/update-task-status',authMiddleware.isAuthenticated,authMiddleware.isAdmin,taskGroupController.updateTaskStatus)
router.post('/send-feedback-for-task',authMiddleware.isAuthenticated,authMiddleware.isAdmin,taskGroupController.sendFeedbackForTask)




module.exports = router