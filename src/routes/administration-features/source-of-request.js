const { Router } = require("express")

const router = Router()
const authMiddleware = require('../../middlewares/auth')
const sourceofRequestController = require('../../controllers/administration-features/source-of-request')

router.post('/add-source-of-request', authMiddleware.isAuthenticated, sourceofRequestController.addsourceofRequest)
router.post('/update-source-of-request', authMiddleware.isAuthenticated, sourceofRequestController.updatesourceofRequest)
router.post('/delete-source-of-request', authMiddleware.isAuthenticated, sourceofRequestController.deletesourceofRequest)
router.get('/get-source-of-request-list', authMiddleware.isAuthenticated, sourceofRequestController.getsourceofRequestList)
 //Export Source of Request
router.get('/export-source-of-request', authMiddleware.isAuthenticated, sourceofRequestController.exportSourceOfRequest)
router.post('/source-of-request-details', authMiddleware.isAuthenticated, sourceofRequestController.sourceofRequestDetails)




/**IMPORT SourceOfRequestData DATA */
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
        cb( null, 'SourceOfRequestData-'+time+ext);
        }else{
            return false
        }
	}
});
var upload = multer( { storage: storage } );
router.post('/import-source-of-request-data',upload.single('file'), authMiddleware.isAuthenticated, sourceofRequestController.importSourceOfRequest)

module.exports = router