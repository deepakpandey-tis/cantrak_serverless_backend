const express = require('express');
const router = express.Router();

const statusController = require('../../controllers/administration-features/status');

const authMiddleware = require('../../middlewares/auth');


/* GET users listing. */

router.post('/add-status', authMiddleware.isAuthenticated,  statusController.addStatus);
router.post('/update-status', authMiddleware.isAuthenticated,  statusController.updateStatus);
router.get('/get-status-list', authMiddleware.isAuthenticated,  statusController.getStatusList);
router.post('/delete-status', authMiddleware.isAuthenticated,  statusController.deleteStatus);
// Export Status Data
router.get('/export-status', authMiddleware.isAuthenticated,  statusController.exportStatus);
router.post('/status-details', authMiddleware.isAuthenticated,  statusController.statusDetails);

/**IMPORT STATUS DATA */
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
        cb( null, 'ServiceStatusData-'+time+ext);
        }else{
            return false
        }
	}
});
var upload = multer( { storage: storage } );
router.post('/import-service-status-data',upload.single('file'), authMiddleware.isAuthenticated, statusController.importServiceStatusData)

module.exports = router;
 