const express = require('express');
const router = express.Router();

const propertyCategoryController = require('../../controllers/administration-features/property-category');

const authMiddleware = require('../../middlewares/auth');


/* GET users listing. */

router.post('/add-category', authMiddleware.isAuthenticated,  propertyCategoryController.addCategory);

router.post('/update-category', authMiddleware.isAuthenticated,  propertyCategoryController.updateCategory);

router.post('/delete-category', authMiddleware.isAuthenticated,  propertyCategoryController.deleteCategory);

router.get('/property-category-list', authMiddleware.isAuthenticated,  propertyCategoryController.propertyCategoryList);
router.get('/category-list', authMiddleware.isAuthenticated,  propertyCategoryController.categoryList);

router.post('/get-category-details',authMiddleware.isAuthenticated,  propertyCategoryController.getCategoryDetails);

//Export Property  Category Data
router.get('/export-property-category', authMiddleware.isAuthenticated,  propertyCategoryController.exportPropertyCategory);
//Export Problem Category Data
router.get('/export-category', authMiddleware.isAuthenticated,  propertyCategoryController.exportCategory);
//DROP DOWN ASSET LIST
router.get('/asset-category-list', authMiddleware.isAuthenticated, propertyCategoryController.assetCategoryList);

//DROP DOWN PART CATEGORY LIST
router.get('/part-category-list', authMiddleware.isAuthenticated, propertyCategoryController.partCategoryList);

/**IMPORT PROBLEM CATEGORY DATA */
const path       = require('path');
let tempraryDirectory = null;
        if (process.env.IS_OFFLINE) {
           tempraryDirectory = 'tmp/';
         } else {
           tempraryDirectory = '/tmp/';  
         }
var multer  = require('multer');
var storage = multer.diskStorage({
	destination: tempraryDirectory,
	filename: function ( req, file, cb ) {
        let ext =  path.extname(file.originalname)
        if(ext=='.csv'){
        time = Date.now();
        cb( null, 'ProblemCategoryData-'+time+ext);
        }else{
            return false
        }
	}
});
var upload = multer( { storage: storage } );
router.post('/import-problem-category-data',upload.single('file'), authMiddleware.isAuthenticated, propertyCategoryController.importProblemCategoryData)



module.exports = router;
