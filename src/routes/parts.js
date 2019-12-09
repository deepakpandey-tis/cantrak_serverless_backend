const { Router } = require("express")
const authMiddleware = require('../middlewares/auth');
const multer  = require('multer');
const path    = require('path');
const router = Router()

const partsController = require(
    '../controllers/parts'
)

// router.gdet('/get-parts', authMiddleware.isAuthenticated, partsController.getParts)
router.post('/get-parts', authMiddleware.isAuthenticated, partsController.getParts)
router.post('/add-parts', authMiddleware.isAuthenticated, partsController.addParts)
router.post('/update-part-details', authMiddleware.isAuthenticated, partsController.updatePartDetails)
router.post('/get-part-details', authMiddleware.isAuthenticated, partsController.getPartDetails)
router.post('/add-part-stock', authMiddleware.isAuthenticated, partsController.addPartStock)
router.get('/search-part', authMiddleware.isAuthenticated, partsController.searchParts)
router.post('/export-part', authMiddleware.isAuthenticated, partsController.exportPart)
router.get('/part-list', authMiddleware.isAuthenticated, partsController.partList)
router.get('/part-code-exist',authMiddleware.isAuthenticated,partsController.partCodeExist)
router.get('/get-part-detail-by-id',authMiddleware.isAuthenticated,partsController.getPartDetailById)
router.get('/check-order-work-id/:id',authMiddleware.isAuthenticated,partsController.checkOrderWorkId)
router.post('/part-requisition-log-list',authMiddleware.isAuthenticated,partsController.partRequisitionLogList)
//FOR DROP DOWN ADJUST TYPE LIST
router.get('/adjust-type-list',authMiddleware.isAuthenticated,partsController.adjustTypeList)

// var storage = multer.diskStorage({
// 	destination: './src/uploads',
// 	filename: function ( req, file, cb ) {
//         let ext = path.extname(file.originalname)
//         time = Date.now();
// 		cb( null, 'part-details'+time+path.extname(file.originalname));
// 	}
// });
// var upload = multer( { storage: storage } );
// router.post('/import-part-details',upload.single('file'),authMiddleware.isAuthenticated,partsController.importPartDetails)
router.post('/delete-part',authMiddleware.isAuthenticated,partsController.deletePart)
module.exports = router;