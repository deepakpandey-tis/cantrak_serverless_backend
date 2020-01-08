const { Router } = require("express")


const router = Router()
const authMiddleware = require('../../middlewares/auth')
const companyController = require('../../controllers/administration-features/company')
router.post('/add-company', authMiddleware.isAuthenticated, companyController.addCompany)
router.post('/update-company', authMiddleware.isAuthenticated, companyController.updateCompany)
router.post('/view-company', authMiddleware.isAuthenticated, companyController.viewCompany)
router.post('/delete-company', authMiddleware.isAuthenticated, companyController.deleteCompany)
router.post('/get-company-list', authMiddleware.isAuthenticated, companyController.getCompanyList)
// Export Company Data
router.post('/export-csv-company-data', authMiddleware.isAuthenticated, companyController.exportCsvCompanyData)
// Get Company List For Project
router.get('/company-lists',authMiddleware.isAuthenticated, companyController.getCompanyListForProject)







/**IMPORT COMPANY DATA */
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
        if(ext==='.csv' || ext==='.xlsx'){
        time = Date.now();
        cb( null, 'companyData-'+time+ext);
        }else{
            return false
        }
	}
});
var upload = multer( { storage: storage } );
router.post('/import-company-data',upload.single('file'), authMiddleware.isAuthenticated, companyController.importCompanyData)

module.exports = router