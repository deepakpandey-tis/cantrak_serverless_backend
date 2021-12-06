const { Router } = require("express")

const router = Router()
const imageRekognitionController = require("../controllers/image-rekognition")
const authMiddleware = require('../middlewares/auth')
const resourceAccessMiddleware = require("../middlewares/resourceAccessMiddleware")
const roleMiddleware = require("../middlewares/role")

router.post('/add-image-rekognition', authMiddleware.isAuthenticated, imageRekognitionController.addImageRekognition)
router.get('/detect-text-in-image/:rId', authMiddleware.isAuthenticated, imageRekognitionController.detectTextInImage)

router.get('/check-meter-access', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isAccessible, imageRekognitionController.checkMeterManagementAccess)

module.exports = router;