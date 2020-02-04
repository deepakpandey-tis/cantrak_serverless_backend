const {Router} = require("express")
const peopleController = require('../controllers/people')
const authMiddleware = require('../middlewares/auth')

const router = Router()

router.post('/add-people', authMiddleware.isAuthenticated, peopleController.addPeople)
router.post('/update-people-details', authMiddleware.isAuthenticated, peopleController.updatePeopleDetails)
router.post('/get-people-list', authMiddleware.isAuthenticated, peopleController.getPeopleList);
router.post('/get-people-details', authMiddleware.isAuthenticated, peopleController.getPeopleDetails)
router.post('/remove-people', authMiddleware.isAuthenticated, authMiddleware.isOrgAdmin, peopleController.removePeople)
router.post('/export-people-data',authMiddleware.isAuthenticated, peopleController.exportPeopleData)

/**IMPORT PEOPLE DATA */
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
        cb( null, 'peopleData-'+time+ext);
        }else{
            return false
        }
	}
});
var upload = multer( { storage: storage } );
router.post('/import-people-data',upload.single('file'), authMiddleware.isAuthenticated, peopleController.importPeopleData)

router.post('/update-people', authMiddleware.isAuthenticated, peopleController.updatePeople)
module.exports = router;