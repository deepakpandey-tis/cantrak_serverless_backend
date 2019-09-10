const {Router} = require("express")
const authMiddleware = require('../middlewares/auth');

const router = Router()

const partsController = require(
    '../controllers/parts'
)

router.get('/get-parts', authMiddleware.isAuthenticated, partsController.getParts)
router.post('/add-parts', authMiddleware.isAuthenticated, partsController.addParts)

module.exports = router;