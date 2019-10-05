const {Router} = require("express")


const router = Router()
const authMiddleware = require('../middlewares/auth')
const pmController = require("../controllers/preventive-maintenance")

router.post('/create-pm-task-schedule', authMiddleware.isAuthenticated, authMiddleware.isAdmin, pmController.createPmTaskSchedule)


module.exports = router