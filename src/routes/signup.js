const { Router } = require("express");

const signupController = require("../controllers/signup");

const router = Router()

router.get('/get-companies-list', signupController.getCompaniesList)
router.get('/get-projects-list-by-company', signupController.getProjectsByCompany)
router.get('/get-buildings-list-by-project', signupController.getBuildingsByProject)
router.get('/get-floor-list-by-building', signupController.getFloorByBuilding)
router.get('/get-unit-list-by-floor', signupController.getUnitByFloor)

module.exports = router;