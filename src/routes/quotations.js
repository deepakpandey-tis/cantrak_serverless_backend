const express = require("express");
const router = express.Router();

const quotationController = require("../controllers/quotations");

const authMiddleware = require("../middlewares/auth");
const roleMiddleware = require("../middlewares/role");
const resourceAccessMiddleware = require("../middlewares/resourceAccessMiddleware");

/* GET users listing. */

router.get(
  "/generate-quotations-id",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  quotationController.generateQuotationId
);

router.post(
  "/update-quotations",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  quotationController.updateQuotations
);

router.post(
  "/get-quotation-details",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  quotationController.getQuotationDetails
);

// router.post('/upload-images', authMiddleware.isAuthenticated, serviceRequestController.updateImages);

// router.post('/upload-image-url', authMiddleware.isAuthenticated, serviceRequestController.getImageUploadUrl);
router.post(
  "/add-quotation-part",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  quotationController.addQuotationPart
);
router.post(
  "/add-quotation-asset",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  quotationController.addQuotationAsset
);
router.post(
  "/get-quotation-list",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  quotationController.getQuotationList
);
// Quotation Data Export
router.post(
  "/export-quotation",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  quotationController.exportQuotation
);

router.post(
  "/update-quotation-notes",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  quotationController.updateQuotationNotes
);
router.post(
  "/get-quotation-notes-list",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  quotationController.getQuotationNoteList
);
router.post(
  "/delete-quotation-remark",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  quotationController.deleteQuotationRemark
);
router.post(
  "/get-quotation-assigned-assets",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  quotationController.getQuotationAssignedAssets
);
router.post(
  "/approve-quotations",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  quotationController.approveQuotation
);
router.post(
  "/get-quotation-invoice",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  quotationController.getQuotationInvoice
);
router.post(
  "/update-quotations-invoice",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  quotationController.updateQuotationsInvoice
);
router.post(
  "/delete-quotation",
  authMiddleware.isAuthenticated,
  quotationController.deleteQuotation
);

router.post(
  "/update-quotation-status",
  authMiddleware.isAuthenticated,
  quotationController.updateQuotationsStatus
);

router.post(
  "/get-tags-quotation",
  authMiddleware.isAuthenticated,
  quotationController.getTagsQuotation
);

router.post(
  "/get-quotation-cost-report",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  quotationController.getQuotationCostReport
);

router.post(
  "/get-quotation-register-report",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  quotationController.getQuotationRegisterReport
);

module.exports = router;
