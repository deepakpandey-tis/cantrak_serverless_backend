const { Router } = require("express")

const router = Router()
const authMiddleware = require('../../middlewares/auth')
const plantationTypeController = require('../../controllers/administration-features/plantation-type')

router.post('/add-plantation-type', authMiddleware.isAuthenticated, plantationTypeController.addPlantationType)
router.post('/update-plantation-type', authMiddleware.isAuthenticated, plantationTypeController.updatePlantationType)
router.post('/delete-plantation-type', authMiddleware.isAuthenticated, plantationTypeController.deletePlantationType)
router.post('/get-plantation-type-list', authMiddleware.isAuthenticated, plantationTypeController.getPlantationTypeList)
// Export
router.get('/export-plantation-type', authMiddleware.isAuthenticated, plantationTypeController.exportPlantationType)
router.post('/get-plantation-type-details', authMiddleware.isAuthenticated, plantationTypeController.getPlantationTypeDetails)
router.get('/get-all-plantation-type', authMiddleware.isAuthenticated, plantationTypeController.getAllPlantationTypeList)
/**IMPORT */
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
        cb( null, 'PlantationTypeData-'+time+ext);
        }else{
            return false
        }
	}
});
var upload = multer( { storage: storage } );
router.post('/import-plantation-type-data',upload.single('file'), authMiddleware.isAuthenticated, plantationTypeController.importPlantationTypeData)

module.exports = router