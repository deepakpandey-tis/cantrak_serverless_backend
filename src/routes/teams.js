const express = require('express');
const router = express.Router();

const teamsController = require('../controllers/teams');

const authMiddleware = require('../middlewares/auth');


/* Teams Routers Function. */

router.post('/add-teams', authMiddleware.isAuthenticated, teamsController.addNewTeams);
router.post('/update-teams', authMiddleware.isAuthenticated, teamsController.updateTeams);
router.get('/get-team-list', authMiddleware.isAuthenticated, teamsController.getTeamList);
router.post('/get-team-all-list', authMiddleware.isAuthenticated, teamsController.getTeamAllList);
router.post('/add-team-users', authMiddleware.isAuthenticated, teamsController.addTeamUsers);

router.get('/get-assigned-teams', authMiddleware.isAuthenticated, teamsController.getAssignedTeams);
router.post('/get-assigned-teams-and-users', authMiddleware.isAuthenticated, teamsController.getAssignedTeamAndUsers);

router.get('/get-team-details', authMiddleware.isAuthenticated, teamsController.getTeamDetails);
router.post('/remove-team', authMiddleware.isAuthenticated, teamsController.removeTeam);
// Export Team Data
router.get('/export-teams', authMiddleware.isAuthenticated, teamsController.exportTeams);
router.post('/get-main-and-additional-users-by-teamid', authMiddleware.isAuthenticated, teamsController.getMainAndAdditionalUsersByTeamId)

/**IMPORT PROJECT DATA */
const path       = require('path');
let tempraryDirectory = null;
        if (process.env.IS_OFFLINE) {
           tempraryDirectory = 'tmp/';
         } else {
           tempraryDirectory = '/tmp/';  
         }
var multer  = require('multer');
var storage = multer.diskStorage({
	destination: tempraryDirectory,
	filename: function ( req, file, cb ) {
        let ext =  path.extname(file.originalname)
        if(ext=='.csv'){
        time = Date.now();
        cb( null, 'TeamData-'+time+ext);
        }else{
            return false
        }
	}
});
var upload = multer( { storage: storage } );
router.post('/import-team-data',upload.single('file'), authMiddleware.isAuthenticated, teamsController.importTeamData)
router.post('/get-team-list-by-projectid', authMiddleware.isAuthenticated, teamsController.getTeamListByProject);
router.post('/get-team-by-entity', authMiddleware.isAuthenticated, teamsController.getTeamByEntity)
router.post('/disable-login', authMiddleware.isAuthenticated, teamsController.disableLogin);

module.exports = router;
