const {Router} = require("express")
const authMiddleware = require('../middlewares/auth');

const router = Router()

const partsController = require(
    '../controllers/parts'
)

router.get('/get-parts', authMiddleware.isAuthenticated, partsController.getParts)
router.post('/add-parts', authMiddleware.isAuthenticated, partsController.addParts)
router.post('/update-part-details', authMiddleware.isAuthenticated, partsController.updatePartDetails)
router.post('/get-part-details', authMiddleware.isAuthenticated, partsController.getPartDetails)
module.exports = router;