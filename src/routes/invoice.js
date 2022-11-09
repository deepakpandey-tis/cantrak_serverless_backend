const { Router } = require("express")
const path = require("path")
const router = Router()
const authMiddleware = require('../middlewares/auth')
const roleMiddleware = require('../middlewares/role')
const resourceAccessMiddleware = require('../middlewares/resourceAccessMiddleware');
const invoiceController = require('../controllers/invoice');


router.post('/add-invoice',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  invoiceController.addInvoice
);

router.post('/update-invoice',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  invoiceController.updateInvoice
);

router.post('/cancel-invoice',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  invoiceController.cancelInvoice
);

router.post('/get-invoice-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  invoiceController.getInvoiceList
);

router.post('/get-invoice',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  invoiceController.getInvoice
);

router.post('/get-cancel-invoice-remark',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  invoiceController.getCancelInvoiceRemark
);

router.post('/get-invoices',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  invoiceController.getInvoices
);

router.post('/get-invoices-detail',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  invoiceController.getInvoicesDetail
);

router.post('/get-invoiced-items',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  invoiceController.getInvoicedItems
);


router.get('/get-companies',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  invoiceController.getCompanies
);

router.get('/get-item-categories',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  invoiceController.getItemCategories
);

router.post('/get-items',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  invoiceController.getItems
);

router.post('/get-storage-locations',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  invoiceController.getStorageLocations
);

router.get('/get-charges',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  invoiceController.getCharges
);

router.get('/get-taxes',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  invoiceController.getTaxes
);

router.get('/get-strains',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  invoiceController.getStrains
);

router.get('/get-customers',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  invoiceController.getCustomers
);

router.post('/get-item-available-lotnos',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  invoiceController.getItemAvailableLotNos
);


router.post('/get-licenses',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  invoiceController.getLicenses
);

module.exports = router;
