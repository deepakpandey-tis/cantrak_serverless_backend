const express = require('express');
const router = express.Router();

const propertySubCategoryController = require('../../controllers/administration-features/property-subcategory');

const authMiddleware = require('../../middlewares/auth');


/* GET Property SubCategory listing. */

router.post('/add-subcategory', authMiddleware.isAuthenticated, authMiddleware.isAdmin, propertySubCategoryController.addSubCategory);

router.post('/update-subcategory', authMiddleware.isAuthenticated, authMiddleware.isAdmin, propertySubCategoryController.updateSubCategory);

router.post('/delete-subcategory', authMiddleware.isAuthenticated, authMiddleware.isAdmin, propertySubCategoryController.deleteSubCategory);

router.get('/subcategory-list', authMiddleware.isAuthenticated, authMiddleware.isAdmin, propertySubCategoryController.subCategoryList);

module.exports = router;
 