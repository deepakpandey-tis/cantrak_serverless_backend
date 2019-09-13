const {Router} = require("express")
const peopleController = require('../controllers/people')
const authMiddleware = require('../middlewares/auth')

const router = Router()

router.post('/add-people', authMiddleware.isAuthenticated, peopleController.addPeople)
router.post('/update-people-details', authMiddleware.isAuthenticated, peopleController.updatePeopleDetails)
router.get('/get-people-list', authMiddleware.isAuthenticated, peopleController.getPeopleList);
router.post('/get-people-details', authMiddleware.isAuthenticated, peopleController.getPeopleDetails)
router.post('/remove-people', authMiddleware.isAuthenticated, authMiddleware.isAdmin, peopleController.removePeople)
module.exports = router;