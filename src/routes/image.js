const { Router } = require("express")

const router = Router()
const imageController = require("../controllers/image")
const authMiddleware = require('../middlewares/auth')

router.post('/delete-image', authMiddleware.isAuthenticated, imageController.deleteImage)

module.exports = router;