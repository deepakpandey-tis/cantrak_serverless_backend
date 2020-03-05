const express = require('express');
const router = express.Router();

const propertySubCategoryController = require('../../controllers/administration-features/property-subcategory');

const authMiddleware = require('../../middlewares/auth');
const roleMiddleware = require('../../middlewares/role')
const resourceAccessMiddleware = require('../../middlewares/resourceAccessMiddleware')

/* GET Property SubCategory listing. */

router.post('/add-subcategory', authMiddleware.isAuthenticated, propertySubCategoryController.addSubCategory);

router.post('/update-subcategory',
    authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isCMAccessible,
    propertySubCategoryController.updateSubCategory);

router.post('/delete-subcategory', authMiddleware.isAuthenticated, propertySubCategoryController.deleteSubCategory);

router.get('/subcategory-list', authMiddleware.isAuthenticated, propertySubCategoryController.subCategoryList);

router.post('/get-subcategories-by-category', authMiddleware.isAuthenticated, propertySubCategoryController.getSubCategoryByCategoryId)

/*GET PROBLEM TYPE ALL LIST FOR DROP DOWN */
router.get('/get-problem-type-all-list', authMiddleware.isAuthenticated, propertySubCategoryController.getProblemTypeAllList);
module.exports = router;
