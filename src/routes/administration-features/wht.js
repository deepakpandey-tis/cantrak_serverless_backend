const express = require('express');
const router = express.Router();
const path = require("path");

const whtController = require('../../controllers/administration-features/wht');

const authMiddleware = require('../../middlewares/auth');


/* GET wht listing. */

router.post('/add-wht', authMiddleware.isAuthenticated,  whtController.addWht);
router.post('/update-wht', authMiddleware.isAuthenticated,  whtController.updateWht);
router.get('/get-wht-list', authMiddleware.isAuthenticated,  whtController.getWhtList);
router.post('/delete-wht', authMiddleware.isAuthenticated,  whtController.deleteWht);
router.post('/get-wht-details', authMiddleware.isAuthenticated,  whtController.viewWhtDetails);
router.get(
  "/export-wht-data",
  authMiddleware.isAuthenticated,
  whtController.exportWhtData
);



/**IMPORT Building DATA */
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
        cb( null, 'whtData-'+time+ext);
        }else{
            return false
        }
	}
});
var upload = multer( { storage: storage } );
router.post(
  "/import-wht-data",
  upload.single("file"),
  authMiddleware.isAuthenticated,
  whtController.importWhtData
);
module.exports = router;
 