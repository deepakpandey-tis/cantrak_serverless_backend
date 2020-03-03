const express = require('express');
const router = express.Router();

const remarksController = require('../controllers/remarks');

const authMiddleware = require('../middlewares/auth');

/* Remarks Controller. */

router.post('/update-remarks-notes', authMiddleware.isAuthenticated, remarksController.updateRemarksNotes)
router.post('/get-remarks-notes-list', authMiddleware.isAuthenticated, remarksController.getRemarksNotesList)
router.post('/delete-remarks-notes', authMiddleware.isAuthenticated, remarksController.deleteRemarksNotes);

module.exports = router;
