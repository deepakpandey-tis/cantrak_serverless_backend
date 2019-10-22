const { Router } = require("express")

const router = Router()
const authMiddleware = require("../../middlewares/auth")
const problemController = require("../../controllers/administration-features/problem")

router.get('/get-problem-list', authMiddleware.isAuthenticated, problemController.getProblems)
// Export  Problem Data
router.get('/export-problem', authMiddleware.isAuthenticated, problemController.exportProblem)

module.exports = router;