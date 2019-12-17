const { Router } = require("express")

const router = Router()
const authMiddleware = require("../../middlewares/auth")
const problemController = require("../../controllers/administration-features/problem")

router.get('/get-problem-list', authMiddleware.isAuthenticated, problemController.getProblems)
// Export SUBCATEGORY Problem Data
router.get('/export-problem-subcategory', authMiddleware.isAuthenticated, problemController.exportProblem)

router.get('/get-category-list',authMiddleware.isAuthenticated,problemController.getIncidentCategories)
router.post('/get-subcategories-by-category',authMiddleware.isAuthenticated,problemController.getSubcategories)
router.get('/get-problem-details', authMiddleware.isAuthenticated, problemController.getProblemDetails)

module.exports = router;