const { Router } = require("express");

const signupController = require("../controllers/signup");

const router = Router()

router.get('/get-companies-list', signupController.getCompanyList)

module.exports = router;