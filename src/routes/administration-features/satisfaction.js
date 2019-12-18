const express = require('express');
const router = express.Router();

const satisfactionController = require('../../controllers/administration-features/satisfaction');

const authMiddleware = require('../../middlewares/auth');


/* GET users listing. */

router.post('/add-satisfaction', authMiddleware.isAuthenticated,  satisfactionController.addSatisfaction);
router.post('/update-satisfaction', authMiddleware.isAuthenticated,  satisfactionController.updateSatisfaction);
router.get('/get-satisfaction-list', authMiddleware.isAuthenticated,  satisfactionController.getSatisfactionList);
router.post('/delete-satisfaction', authMiddleware.isAuthenticated,  satisfactionController.deleteSatisfaction);
// Export Satisfaction Data
router.get('/export-satisfaction', authMiddleware.isAuthenticated,  satisfactionController.exportSatisfaction);
router.post('/satisfaction-details', authMiddleware.isAuthenticated,  satisfactionController.satisfactionDetails);

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
        cb( null, 'SatisfactionData-'+time+ext);
        }else{
            return false
        }
	}
});
var upload = multer( { storage: storage } );
router.post('/import-satisfaction-data',upload.single('file'), authMiddleware.isAuthenticated, satisfactionController.importSatisfactionData)


module.exports = router;
 