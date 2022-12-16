const { Router } = require("express");

const authMiddleware = require('../../middlewares/auth');
const calendarController = require('../../controllers/administration-features/calendar');

const router = Router();

router.get('/events', authMiddleware.isAuthenticated, calendarController.getEvents);
router.post('/events/create', authMiddleware.isAuthenticated, calendarController.createEvent);
router.put('/events/:id/update', authMiddleware.isAuthenticated, calendarController.updateEvent);
router.delete('/events/:id/delete', authMiddleware.isAuthenticated, calendarController.deleteEvent);

module.exports = router;
