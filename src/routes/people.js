const {Router} = require("express")
const peopleController = require('../controllers/people')

const router = Router()

router.post('/add-people', peopleController.addPeople)

module.exports = router;