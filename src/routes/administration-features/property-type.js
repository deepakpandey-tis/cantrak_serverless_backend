const { Router } = require("express")

const router = Router()
const authMiddleware = require('../../middlewares/auth')
const propertyTypeController = require('../../controllers/administration-features/property-type')

router.post('/add-property-type', authMiddleware.isAuthenticated, propertyTypeController.addPropertyType)
router.post('/update-property-type', authMiddleware.isAuthenticated, propertyTypeController.updatePropertyType)
router.post('/delete-property-type', authMiddleware.isAuthenticated, propertyTypeController.deletePropertyType)
router.get('/get-property-type-list', authMiddleware.isAuthenticated, propertyTypeController.getPropertyTypeList)
// Export Property Type
router.get('/export-property-type', authMiddleware.isAuthenticated, propertyTypeController.exportPropertyType)
router.post('/view-property-type-details', authMiddleware.isAuthenticated, propertyTypeController.getPropertyDetails)
router.get('/get-all-property-type', authMiddleware.isAuthenticated, propertyTypeController.getAllPropertyTypeList)
/**IMPORT PROPERTY TYPE DATA */
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
        cb( null, 'PropertTypeData-'+time+ext);
        }else{
            return false
        }
	}
});
var upload = multer( { storage: storage } );
router.post('/import-property-type-data',upload.single('file'), authMiddleware.isAuthenticated, propertyTypeController.importPropertyTypeData)

module.exports = router