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

router.post(
    "/get-admin-property-units"
    , authMiddleware.isAuthenticated
    , roleMiddleware.parseUserPermission
    , resourceAccessMiddleware.isAccessible
    , visitorController.getAdminPropertyUnits)

router.post(
    "/get-unit-tenants"
    , authMiddleware.isAuthenticated
    , roleMiddleware.parseUserPermission
    , resourceAccessMiddleware.isAccessible
    , visitorController.getUnitTenants)


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
    , resourceAccessMiddleware.isAccessible
    , visitorController.getVisitorList
);

router.get(
    "/get-checkin-visitors"
    , authMiddleware.isAuthenticated
    , roleMiddleware.parseUserPermission
    , resourceAccessMiddleware.isAccessible
    , visitorController.getCheckinVisitors
);

router.get(
    "/get-checkout-visitors"
    , authMiddleware.isAuthenticated
    , roleMiddleware.parseUserPermission
    , resourceAccessMiddleware.isAccessible
    , visitorController.getCheckoutVisitors
);

router.post(
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
    "/cancel-registration"
    , authMiddleware.isAuthenticated
    , roleMiddleware.parseUserPermission
    , visitorController.cancelRegistration
);

router.post(
    "/checkin-visitor"
    , authMiddleware.isAuthenticated
    , roleMiddleware.parseUserPermission
    , resourceAccessMiddleware.isAccessible
    , visitorController.checkinVisitor
);

router.post(
    "/checkout-visitor"
    , authMiddleware.isAuthenticated
    , roleMiddleware.parseUserPermission
    , resourceAccessMiddleware.isAccessible
    , visitorController.checkoutVisitor
);

router.get(
    "/organisation-has-visitor-module"
    , visitorController.organisationHasVisitorModule
);

router.post(
    "/get-self-registration-property-units"
    , visitorController.getSelfRegistrationPropertyUnits
);

router.post(
    "/add-self-registration"
    , visitorController.addSelfRegistration
);

router.post(
    "/get-calendar-count"
    , authMiddleware.isAuthenticated
    , roleMiddleware.parseUserPermission
    , resourceAccessMiddleware.isAccessible
    , visitorController.getCalendarCount
);

router.get(
    "/get-company-list"
    , authMiddleware.isAuthenticated
    , roleMiddleware.parseUserPermission
    , resourceAccessMiddleware.isAccessible
    , visitorController.getCompanyList
);

router.post(
    "/get-calendar-visitor-list"
    , authMiddleware.isAuthenticated
    , roleMiddleware.parseUserPermission
    , resourceAccessMiddleware.isAccessible
    , visitorController.getCalendarVisitorList
);

router.post(
    "/get-tenant-visitor-list"
    , authMiddleware.isAuthenticated
    //, roleMiddleware.parseUserPermission
    //, resourceAccessMiddleware.isAccessible
    , visitorController.getTenantVisitorList
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
