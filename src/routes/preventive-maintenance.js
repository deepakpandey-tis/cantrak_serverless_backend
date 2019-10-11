const { Router } = require("express");

const router = Router();
const authMiddleware = require("../middlewares/auth");
const pmController = require("../controllers/preventive-maintenance");

router.post(
  "/create-pm-task-schedule",authMiddleware.isAuthenticated,authMiddleware.isAdmin,pmController.createPmTaskSchedule
);
router.post(
  "/get-pm-task-schedule-list",authMiddleware.isAuthenticated,authMiddleware.isAdmin,pmController.getPmTaskScheduleList
);
router.post(
  "/get-feedbacks-details",authMiddleware.isAuthenticated,authMiddleware.isAdmin,pmController.viewFeedbacksReport
);
// router.post(
//   "/pm-filterd-task-list",authMiddleware.isAuthenticated,authMiddleware.isAdmin,pmController.getFilterdList
// );

module.exports = router;
