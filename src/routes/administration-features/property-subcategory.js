const express = require('express');
const router = express.Router();

const propertySubCategoryController = require('../../controllers/administration-features/property-subcategory');

const authMiddleware = require('../../middlewares/auth');


/* GET Property SubCategory listing. */

router.post('/add-subcategory', authMiddleware.isAuthenticated,  propertySubCategoryController.addSubCategory);

router.post('/update-subcategory', authMiddleware.isAuthenticated,  propertySubCategoryController.updateSubCategory);

router.post('/delete-subcategory', authMiddleware.isAuthenticated,  propertySubCategoryController.deleteSubCategory);

router.get('/subcategory-list', authMiddleware.isAuthenticated,  propertySubCategoryController.subCategoryList);

router.post('/get-subcategories-by-category',authMiddleware.isAuthenticated,propertySubCategoryController.getSubCategoryByCategoryId)

module.exports = router;
 