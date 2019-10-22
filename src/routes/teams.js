const express = require('express');
const router = express.Router();

const teamsController = require('../controllers/teams');

const authMiddleware = require('../middlewares/auth');


/* Teams Routers Function. */

router.post('/add-teams', authMiddleware.isAuthenticated, teamsController.addNewTeams);
router.post('/update-teams', authMiddleware.isAuthenticated, teamsController.updateTeams);
router.get('/get-team-list', authMiddleware.isAuthenticated, teamsController.getTeamList);
router.post('/add-team-users', authMiddleware.isAuthenticated, teamsController.addTeamUsers);
router.get('/get-assigned-teams', authMiddleware.isAuthenticated, teamsController.getAssignedTeams);
// Export Team Data
router.get('/export-teams', authMiddleware.isAuthenticated, teamsController.exportTeams);


module.exports = router;
