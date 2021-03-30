// Included in src\routes\index.js

//  CommonJs module
const express = require('express');

const authMiddleware = require('../middlewares/auth');
const roleMiddleware = require('../middlewares/role');
const resourceAccessMiddleware = require('../middlewares/resourceAccessMiddleware');
const visitorController = require('../controllers/visitor');

const router = express.Router();


//router.get("/get-user-houses", getUserHouses)
router.get(
    "/get-user-units"
    , authMiddleware.isAuthenticated
    , visitorController.getUserUnits
);

router.get(
    "/has-any-visitor"
    , authMiddleware.isAuthenticated
    , visitorController.hasAnyVisitor
);

router.get(
    "/get-invitation"
    , authMiddleware.isAuthenticated
    , visitorController.getInvitation
);

router.post(
    "/get-visitor-list"
    , authMiddleware.isAuthenticated
    , roleMiddleware.parseUserPermission
    , resourceAccessMiddleware.isVisitorManagementAccessible
    , visitorController.getVisitorList
);

router.get(
    "/get-checkin-visitors"
    , authMiddleware.isAuthenticated
    , roleMiddleware.parseUserPermission
    , resourceAccessMiddleware.isVisitorManagementAccessible
    , visitorController.getCheckinVisitors
);

router.get(
    "/get-checkout-visitors"
    , authMiddleware.isAuthenticated
    , roleMiddleware.parseUserPermission
    , resourceAccessMiddleware.isVisitorManagementAccessible
    , visitorController.getCheckoutVisitors
);

router.get(
    "/get-visitors"
    , authMiddleware.isAuthenticated
    , visitorController.getVisitors
);

router.get(
    "/get-visitors-count"
    , authMiddleware.isAuthenticated
    , visitorController.getVisitorsCount
);

router.post(
    "/add-invitation"
    , authMiddleware.isAuthenticated
    , visitorController.addInvitation
);

router.post(
    "/checkin-visitor"
    , authMiddleware.isAuthenticated
    , roleMiddleware.parseUserPermission
    , resourceAccessMiddleware.isVisitorManagementAccessible
    , visitorController.checkinVisitor
);

router.post(
    "/checkout-visitor"
    , authMiddleware.isAuthenticated
    , roleMiddleware.parseUserPermission
    , resourceAccessMiddleware.isVisitorManagementAccessible
    , visitorController.checkoutVisitor
);

module.exports = router;

/* ES6 module
import { Router } from 'express';

import { makeExpressCallback } from '../helpers/express-callback';

import { isAuthenticated } from '../middlewares/auth';
import { getUserHouses, addInvitation, notFound } from '../controllers/visitor';

const router = express.Router();


router.get("/get-user-houses", authMiddleware.isAuthenticated, visitorController.getUserHouses)
router.post("/add-visitor-invitation", authMiddleware.isAuthenticated, visitorController.addInvitation)
router.use(visitorController.notFound)

export default router;
*/
