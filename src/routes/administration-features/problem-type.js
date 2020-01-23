const { Router } = require("express")

const router = Router();
const authMiddleware = require('../../middlewares/auth')
const problemTypeController = require('../../controllers/administration-features/problem-type')

router.post('/add-problem-type', authMiddleware.isAuthenticated, problemTypeController.addProblemType)
router.post('/update-problem-type', authMiddleware.isAuthenticated, problemTypeController.updateProblemType)
router.post('/problem-type-details', authMiddleware.isAuthenticated, problemTypeController.viewProblemType)
// router.post('/delete-project', authMiddleware.isAuthenticated, projectController.deleteProject)
router.get('/get-problem-type-list', authMiddleware.isAuthenticated, problemTypeController.getProblemTypeList)
/**EXPORT PROBLEM TYPE DATA*/
router.get('/export-problem-type-data', authMiddleware.isAuthenticated, problemTypeController.exportProblemTypeData)

/**IMPORT PROBLEM TYPE DATA */
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
        cb( null, 'ProblemTypeData-'+time+ext);
        }else{
            return false
        }
	}
});
var upload = multer( { storage: storage } );
router.post('/import-problem-type-data',upload.single('file'), authMiddleware.isAuthenticated, problemTypeController.importProblemTypeData)
router.post('/toggle-problem-type', authMiddleware.isAuthenticated, problemTypeController.toggleProblemType)
module.exports = router