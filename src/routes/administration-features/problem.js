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

/**IMPORT PROBLEM SUB CATEGORY DATA */
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
        cb( null, 'ProblemSubcategoryData-'+time+ext);
        }else{
            return false
        }
	}
});
var upload = multer( { storage: storage } );
router.post('/import-problem-subcategory-data',upload.single('file'), authMiddleware.isAuthenticated, problemController.importProblemSubCategoryData)
router.post('/toggle-problem-status',authMiddleware.isAuthenticated,problemController.deleteProblem)

module.exports = router;