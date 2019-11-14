const express = require('express');
const router = express.Router();

const propertyCategoryController = require('../../controllers/administration-features/property-category');

const authMiddleware = require('../../middlewares/auth');


/* GET users listing. */

router.post('/add-category', authMiddleware.isAuthenticated, authMiddleware.isAdmin, propertyCategoryController.addCategory);

router.post('/update-category', authMiddleware.isAuthenticated, authMiddleware.isAdmin, propertyCategoryController.updateCategory);

router.post('/delete-category', authMiddleware.isAuthenticated, authMiddleware.isAdmin, propertyCategoryController.deleteCategory);

router.get('/property-category-list', authMiddleware.isAuthenticated, authMiddleware.isAdmin, propertyCategoryController.propertyCategoryList);
router.get('/category-list', authMiddleware.isAuthenticated, authMiddleware.isAdmin, propertyCategoryController.categoryList);

router.post('/get-category-details',authMiddleware.isAuthenticated, authMiddleware.isAdmin, propertyCategoryController.getCategoryDetails);

//Export Property  Category Data
router.get('/export-property-category', authMiddleware.isAuthenticated, authMiddleware.isAdmin, propertyCategoryController.exportPropertyCategory);
//Export Category Data
router.get('/export-category', authMiddleware.isAuthenticated, authMiddleware.isAdmin, propertyCategoryController.exportCategory);

router.get('/asset-category-list', authMiddleware.isAuthenticated, propertyCategoryController.assetCategoryList);

module.exports = router;
