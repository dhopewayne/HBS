// const express = require('express');
// const router = express.Router();
// const invoiceController = require('../controllers/invoiceController');

// // Middleware to check admin role
// const checkAdmin = (req, res, next) => { 

//     // console.log('checking role.....')
//     const userRole = req.headers['x-user-role']; 
//     // console.log('user role:' , userRole)
//     if (userRole === 'admin') {
//         next();
//     } else {
//         res.status(403).json({ success: false, error: 'Admin access required' });
//     }
// };

// // Invoice routes
// router.get('/invoices', invoiceController.getAllInvoices);
// router.get('/invoices/:id', invoiceController.getInvoiceById);
// router.post('/invoices', invoiceController.createInvoice);
// router.put('/invoices/:id', checkAdmin, invoiceController.updateInvoice);
// router.delete('/invoices/:id', checkAdmin, invoiceController.deleteInvoice); 

// router.post('/user/login', invoiceController.loginUser);
// router.post('/user/register', invoiceController.registerUser);   
// // router.post('/user/logout', invoiceController.logoutUser); 



// // Account management routes (Admin only)
// router.get('/accounts', invoiceController.getAllAccounts);
// router.post('/accounts', checkAdmin, invoiceController.createAccount);
// router.put('/accounts/:id', checkAdmin, invoiceController.updateAccount);
// router.delete('/accounts/:id', checkAdmin, invoiceController.deleteAccount);

// // Service management routes (Admin only)
// router.get('/services', checkAdmin, invoiceController.getAllServices);
// router.post('/services', checkAdmin, invoiceController.createService);
// router.put('/services/:id', checkAdmin, invoiceController.updateService);
// router.delete('/services/:id', checkAdmin, invoiceController.deleteService);

// // User Service management routes (Admin only)
// router.get('/users/:userId/services', checkAdmin, invoiceController.getUserServices);
// router.post('/users/services/assign', checkAdmin, invoiceController.assignServiceToUser);
// router.delete('/users/:userId/services/:serviceId', checkAdmin, invoiceController.removeUserService);  



// // User management routes (Admin only)
// // router.get('/users', checkAdmin, invoiceController.getUsers);
// // router.post('/users', checkAdmin, invoiceController.createUser);



// // Get services available to current user (filtered by assigned services)
// router.get('/my-services', invoiceController.getAvailableServicesForUser);  

// // Add this route
// router.get('/users/:username/with-services', invoiceController.getUserWithServices);

// // User management routes (Admin only)
// router.get('/users', checkAdmin, invoiceController.getUsers);
// router.post('/users', checkAdmin, invoiceController.createUser);
// router.get('/users/:username/account-totals', invoiceController.getUserAccountTotals);
// router.put('/users/change-username/:userId', checkAdmin, invoiceController.changeUserName);
// router.put('/users/change-password/:userId', checkAdmin, invoiceController.changeUserPassword);
// router.put('/users/block/:userId', checkAdmin, invoiceController.blockUser);
// router.put('/users/unblock/:userId', checkAdmin, invoiceController.unblockUser);
// router.put('/users/suspend/:userId', checkAdmin, invoiceController.suspendUser);
// router.delete('/users/delete/:userId', checkAdmin, invoiceController.deleteUser);
// router.get('/users/status/:userId', checkAdmin, invoiceController.getUserStatus);
// router.get('/users/current', invoiceController.getCurrentUser);   
// router.put('/users/update-profile-username', invoiceController.updateProfileUsername);  
// router.put('/users/update-profile-password', invoiceController.updateProfilePassword);   
// router.put('/users/update-profile-details', invoiceController.updateProfileDetails);



// // Public routes (with role-based filtering)
// router.get('/activity-log', invoiceController.getActivityLog);
// router.get('/summary', invoiceController.getSummary); 

// // User routes with special ID
// router.get('/users/special/:specialId', invoiceController.getUserBySpecialId);

// // Invoice routes with identification number
// router.get('/invoices/identification/:identificationNumber', invoiceController.getInvoiceByIdentificationNumber);

// // Updated create user route
// router.post('/users', invoiceController.createUser);


// module.exports = router;    



const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const roleMiddleware = require('../middleware/roleMiddleware');

// ============= PUBLIC ROUTES (No role required) =============
router.post('/user/login', invoiceController.loginUser);
router.post('/user/register', invoiceController.registerUser);

// ============= USER LEVEL ROUTES (All authenticated users) =============
router.get('/invoices', invoiceController.getAllInvoices);
router.get('/invoices/:id', invoiceController.getInvoiceById);
router.post('/invoices', invoiceController.createInvoice);
router.get('/my-services', invoiceController.getAvailableServicesForUser);
router.get('/summary', invoiceController.getSummary);
router.get('/users/current', invoiceController.getCurrentUser);
router.put('/users/update-profile-username', invoiceController.updateProfileUsername);
router.put('/users/update-profile-password', invoiceController.updateProfilePassword);
// router.put('/users/update-profile-details', invoiceController.updateUserProfile); 
// router.put('/users/update-profile-details', invoiceController.updateProfileDetails); 
// router.post('/users/verify-password/:details' , invoiceController.checkPassWord)  


// NEW: Password verification route
router.post('/users/verify-password', invoiceController.verifyPassword);

// NEW: Update profile details (first name, last name, phone number)
router.put('/users/update-profile-details', invoiceController.updateUserProfileDetails);
router.put('/users/update-profile', invoiceController.updateUserProfile);  




// ============= USER-ADMIN LEVEL ROUTES (user-admin and above) =============
router.put('/invoices/:id', roleMiddleware.checkUserAdmin, invoiceController.updateInvoice);
router.delete('/invoices/:id', roleMiddleware.checkUserAdmin, invoiceController.deleteInvoice);
router.get('/users', roleMiddleware.checkUserAdmin, invoiceController.getUsers);
router.put('/users/change-username/:userId', roleMiddleware.checkUserAdmin, roleMiddleware.canManageUser, invoiceController.changeUserName);
router.put('/users/change-password/:userId', roleMiddleware.checkUserAdmin, roleMiddleware.canManageUser, invoiceController.changeUserPassword);
router.put('/users/block/:userId', roleMiddleware.checkUserAdmin, roleMiddleware.canManageUser, invoiceController.blockUser);
router.put('/users/unblock/:userId', roleMiddleware.checkUserAdmin, roleMiddleware.canManageUser, invoiceController.unblockUser);
router.put('/users/suspend/:userId', roleMiddleware.checkUserAdmin, roleMiddleware.canManageUser, invoiceController.suspendUser);
router.put('/users/unsuspend/:userId', roleMiddleware.checkUserAdmin, roleMiddleware.canManageUser, invoiceController.unsuspendUser);
router.get('/users/status/:userId', roleMiddleware.checkUserAdmin, invoiceController.getUserStatus);
router.get('/activity-log', roleMiddleware.checkUserAdmin, invoiceController.getActivityLog);

// User service management (user-admin and above)
router.get('/users/:userId/services', roleMiddleware.checkUserAdmin, invoiceController.getUserServices);
router.post('/users/services/assign', roleMiddleware.checkUserAdmin, invoiceController.assignServiceToUser);
router.delete('/users/:userId/services/:serviceId', roleMiddleware.checkUserAdmin, invoiceController.removeUserService);       

// router.get('/users/services/assignments/:assignments'  ,invoiceController.getUserAssignments )   
// // Change this:
// router.get('/users/services/assignments/:assignments', invoiceController.getUserAssignments)

// To this:
// router.get('/users/services/assignments/:assignment', invoiceController.getUserAssignments)  
router.get('/users/services/assignments/:assignment', invoiceController.getUserAssignments);

// ============= ADMIN LEVEL ROUTES (admin and master only) =============
router.post('/users', roleMiddleware.checkAdmin, invoiceController.createUser);
router.delete('/users/delete/:userId', roleMiddleware.checkAdmin, roleMiddleware.canManageUser, invoiceController.deleteUser);

// Account management (admin only)
router.get('/accounts', roleMiddleware.checkAdmin, invoiceController.getAllAccounts);
router.post('/accounts', roleMiddleware.checkAdmin, invoiceController.createAccount);
router.put('/accounts/:id', roleMiddleware.checkAdmin, invoiceController.updateAccount);
router.delete('/accounts/:id', roleMiddleware.checkAdmin, invoiceController.deleteAccount);

// Service management (admin only)
router.get('/services', roleMiddleware.checkAdmin, invoiceController.getAllServices);
router.post('/services', roleMiddleware.checkAdmin, invoiceController.createService);
router.put('/services/:id', roleMiddleware.checkAdmin, invoiceController.updateService);
router.delete('/services/:id', roleMiddleware.checkAdmin, invoiceController.deleteService);

// ============= MASTER LEVEL ROUTES (master only) =============
// Master can manage admin accounts
router.put('/users/master/block/:userId', roleMiddleware.checkMaster, invoiceController.blockUser);
router.put('/users/master/suspend/:userId', roleMiddleware.checkMaster, invoiceController.suspendUser);
router.delete('/users/master/delete/:userId', roleMiddleware.checkMaster, invoiceController.deleteUser);

// Master can view all activities including admin activities
// (This is already handled in getActivityLog with master role)

module.exports = router;