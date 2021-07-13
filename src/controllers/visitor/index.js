const getUserUnits = require('./get-user-units');
const getAdminPropertyUnits = require('./get-admin-property-units');
const getUnitTenants = require('./get-unit-tenants');
const getInvitation = require('./get-invitation');
const getVisitorList = require('./get-visitor-list');
const getCheckinVisitors = require('./get-checkin-visitors');
const getCheckoutVisitors = require('./get-checkout-visitors');
const getVisitors = require('./get-visitors');
const getVisitorsCount = require('./get-visitors-count');
const hasAnyVisitor = require('./has-any-visitor');
const addInvitation = require('./add-invitation');
const checkinVisitor = require('./checkin-visitor');
const checkoutVisitor = require('./checkout-visitor');
const organisationHasVisitorModule = require('./organisation-has-visitor-module');
const getSelfRegistrationPropertyUnits = require('./get-self-registration-property-units');
const addSelfRegistration = require('./add-self-registration');
const cancelRegistration = require('./cancel-registration');
const getCalendarCount = require('./get-calendar-count');
const getCompanyList = require('./get-company-list');

module.exports = {
    getUserUnits,
    getAdminPropertyUnits,
    getUnitTenants,
    getInvitation,
    getVisitorList,
    getCheckinVisitors,
    getCheckoutVisitors,
    getVisitors,
    getVisitorsCount,
    hasAnyVisitor,
    addInvitation,
    checkinVisitor,
    checkoutVisitor,
    organisationHasVisitorModule,
    getSelfRegistrationPropertyUnits,
    addSelfRegistration,
    cancelRegistration,
    getCalendarCount,
    getCompanyList,
};
