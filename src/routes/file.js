const { Router } = require("express")

const router = Router()
const fileController = require("../controllers/file")
const authMiddleware = require('../middlewares/auth')

router.post('/delete-file', authMiddleware.isAuthenticated, fileController.deleteFile)

module.exports = router;