const { Router } = require("express")

const router = Router()
const imageRekognitionController = require("../controllers/image-rekognition")
const authMiddleware = require('../middlewares/auth')

router.post('/add-image-rekognition', authMiddleware.isAuthenticated, imageRekognitionController.addImageRekognition)

module.exports = router;