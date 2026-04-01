const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');

// Middleware to check admin role
const checkAdmin = (req, res, next) => { 

    // console.log('checking role.....')
    const userRole = req.headers['x-user-role']; 
    // console.log('user role:' , userRole)
    if (userRole === 'admin') {
        next();
    } else {
        res.status(403).json({ success: false, error: 'Admin access required' });
    }
};

// Invoice routes
router.get('/invoices', invoiceController.getAllInvoices);
router.get('/invoices/:id', invoiceController.getInvoiceById);
router.post('/invoices', invoiceController.createInvoice);
router.put('/invoices/:id', checkAdmin, invoiceController.updateInvoice);
router.delete('/invoices/:id', checkAdmin, invoiceController.deleteInvoice);

// Account management routes (Admin only)
router.get('/accounts', invoiceController.getAllAccounts);
router.post('/accounts', checkAdmin, invoiceController.createAccount);
router.put('/accounts/:id', checkAdmin, invoiceController.updateAccount);
router.delete('/accounts/:id', checkAdmin, invoiceController.deleteAccount);

// Service management routes (Admin only)
router.get('/services', checkAdmin, invoiceController.getAllServices);
router.post('/services', checkAdmin, invoiceController.createService);
router.put('/services/:id', checkAdmin, invoiceController.updateService);
router.delete('/services/:id', checkAdmin, invoiceController.deleteService);

// User Service management routes (Admin only)
router.get('/users/:userId/services', checkAdmin, invoiceController.getUserServices);
router.post('/users/services/assign', checkAdmin, invoiceController.assignServiceToUser);
router.delete('/users/:userId/services/:serviceId', checkAdmin, invoiceController.removeUserService);

// Get services available to current user (filtered by assigned services)
router.get('/my-services', invoiceController.getAvailableServicesForUser);  

// Add this route
router.get('/users/:username/with-services', invoiceController.getUserWithServices);

// User management routes (Admin only)
router.get('/users', checkAdmin, invoiceController.getUsers);
router.post('/users', checkAdmin, invoiceController.createUser);
router.get('/users/:username/account-totals', invoiceController.getUserAccountTotals);

// Public routes (with role-based filtering)
router.get('/activity-log', invoiceController.getActivityLog);
router.get('/summary', invoiceController.getSummary); 

// User routes with special ID
router.get('/users/special/:specialId', invoiceController.getUserBySpecialId);

// Invoice routes with identification number
router.get('/invoices/identification/:identificationNumber', invoiceController.getInvoiceByIdentificationNumber);

// Updated create user route
router.post('/users', invoiceController.createUser);


module.exports = router;