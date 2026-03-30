const { getDatabase } = require('../models/database');

// Get all invoices with details
exports.getAllInvoices = async (req, res) => {
    try {
        const db = await getDatabase();
        const userRole = req.headers['x-user-role'];
        const username = req.headers['x-username'];
        
        let invoices;
        if (userRole === 'admin') {
            // Admin sees all invoices
            invoices = await db.all(`
                SELECT i.*, a.account_name 
                FROM invoices i
                LEFT JOIN accounts a ON i.account_id = a.id
                ORDER BY i.timestamp DESC
            `);
        } else {
            // Regular users only see their own invoices
            invoices = await db.all(`
                SELECT i.*, a.account_name 
                FROM invoices i
                LEFT JOIN accounts a ON i.account_id = a.id
                WHERE i.created_by = ?
                ORDER BY i.timestamp DESC
            `, username);
        }
        
        // Get services for each invoice
        for (let invoice of invoices) {
            const services = await db.all(`
                SELECT service_name, price 
                FROM invoice_services 
                WHERE invoice_id = ?
            `, invoice.id);
            invoice.services = services;
        }
        
        res.json({ success: true, data: invoices });
    } catch (error) {
        console.error('Error fetching invoices:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get single invoice
exports.getInvoiceById = async (req, res) => {
    try {
        const db = await getDatabase();
        const userRole = req.headers['x-user-role'];
        const username = req.headers['x-username'];
        
        const invoice = await db.get(`
            SELECT i.*, a.account_name 
            FROM invoices i
            LEFT JOIN accounts a ON i.account_id = a.id
            WHERE i.id = ?
        `, req.params.id);
        
        if (!invoice) {
            return res.status(404).json({ success: false, error: 'Invoice not found' });
        }
        
        // Check permission
        if (userRole !== 'admin' && invoice.created_by !== username) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }
        
        const services = await db.all(`
            SELECT service_name, price 
            FROM invoice_services 
            WHERE invoice_id = ?
        `, invoice.id);
        invoice.services = services;
        
        res.json({ success: true, data: invoice });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Create new invoice
exports.createInvoice = async (req, res) => {
    const { patientName, gcrNumber, accountId, accountType, amount , services, createdBy } = req.body;
    
    try {
        const db = await getDatabase();
        
        // Validation
        if (!patientName || !gcrNumber || !services || services.length === 0 || !amount || amount <= 0) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }
        
        if (!/^\d{8}$/.test(gcrNumber)) {
            return res.status(400).json({ success: false, error: 'GCR number must be 8 digits' });
        }
        
        // const subtotal = services.reduce((sum, s) => sum + s.price, 0);
        
        // Insert invoice
        const result = await db.run(`
            INSERT INTO invoices (patient_name, gcr_number, account_id, account_type, price, created_by)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [patientName, gcrNumber, accountId, accountType, amount, createdBy || 'system']);
        
        const invoiceId = result.lastID;
        
        // Insert invoice services
        for (const service of services) {
            await db.run(`
                INSERT INTO invoice_services (invoice_id, service_name, price)
                VALUES (?, ?, ?)
            `, [invoiceId, service.name , amount]);
        }
        
        // Log activity
        await logActivity(createdBy || 'system', `Created invoice #${invoiceId} for ${patientName} - $${amount}`);
        
        res.status(201).json({ success: true, data: { id: invoiceId } });
    } catch (error) {
        console.error('Error creating invoice:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Update invoice (Admin only)
exports.updateInvoice = async (req, res) => {
    const id = req.params.id;
    const { patientName, gcrNumber, accountId, accountType, services, subtotal, updatedBy } = req.body;
    
    try {
        const db = await getDatabase();
        
        const invoice = await db.get('SELECT * FROM invoices WHERE id = ?', id);
        if (!invoice) {
            return res.status(404).json({ success: false, error: 'Invoice not found' });
        }
        
        // Update invoice
        await db.run(`
            UPDATE invoices 
            SET patient_name = ?, gcr_number = ?, account_id = ?, account_type = ?, subtotal = ?
            WHERE id = ?
        `, [patientName || invoice.patient_name, gcrNumber || invoice.gcr_number, 
            accountId || invoice.account_id, accountType || invoice.account_type, 
            subtotal || invoice.subtotal, id]);
        
        // Update services if provided
        if (services) {
            await db.run('DELETE FROM invoice_services WHERE invoice_id = ?', id);
            for (const service of services) {
                await db.run(`
                    INSERT INTO invoice_services (invoice_id, service_name, price)
                    VALUES (?, ?, ?)
                `, [id, service.name, service.price]);
            }
        }
        
        await logActivity(updatedBy || 'admin', `Updated invoice #${id}`);
        
        res.json({ success: true, message: 'Invoice updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Delete invoice (Admin only)
exports.deleteInvoice = async (req, res) => {
    const id = req.params.id;
    
    try {
        const db = await getDatabase();
        
        const invoice = await db.get('SELECT * FROM invoices WHERE id = ?', id);
        if (!invoice) {
            return res.status(404).json({ success: false, error: 'Invoice not found' });
        }
        
        await db.run('DELETE FROM invoice_services WHERE invoice_id = ?', id);
        await db.run('DELETE FROM invoices WHERE id = ?', id);
        
        await logActivity(req.body.deletedBy || 'admin', `Deleted invoice #${id} for ${invoice.patient_name}`);
        
        res.json({ success: true, message: 'Invoice deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Account Management (Admin only)
exports.getAllAccounts = async (req, res) => {
    try {
        const db = await getDatabase();
        const accounts = await db.all('SELECT * FROM accounts ORDER BY created_at DESC');
        res.json({ success: true, data: accounts });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.createAccount = async (req, res) => {
    const { accountName, accountType, description, createdBy } = req.body;
    
    try {
        const db = await getDatabase();
        
        if (!accountName || !accountType) {
            return res.status(400).json({ success: false, error: 'Account name and type are required' });
        }
        
        await db.run(`
            INSERT INTO accounts (account_name, account_type, description, created_by)
            VALUES (?, ?, ?, ?)
        `, [accountName, accountType, description, createdBy]);
        
        await logActivity(createdBy, `Created new account: ${accountName} (${accountType})`);
        
        res.status(201).json({ success: true, message: 'Account created successfully' });
    } catch (error) {
        if (error.message.includes('UNIQUE')) {
            res.status(400).json({ success: false, error: 'Account name already exists' });
        } else {
            res.status(500).json({ success: false, error: error.message });
        }
    }
};

exports.updateAccount = async (req, res) => {
    const id = req.params.id;
    const { accountName, accountType, description } = req.body;
    
    try {
        const db = await getDatabase();
        
        await db.run(`
            UPDATE accounts 
            SET account_name = ?, account_type = ?, description = ?
            WHERE id = ?
        `, [accountName, accountType, description, id]);
        
        await logActivity(req.body.updatedBy, `Updated account #${id}`);
        
        res.json({ success: true, message: 'Account updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.deleteAccount = async (req, res) => {
    const id = req.params.id;
    
    try {
        const db = await getDatabase();
        
        // Check if account has invoices
        const invoices = await db.get('SELECT COUNT(*) as count FROM invoices WHERE account_id = ?', id);
        if (invoices.count > 0) {
            return res.status(400).json({ success: false, error: 'Cannot delete account with existing invoices' });
        }
        
        await db.run('DELETE FROM accounts WHERE id = ?', id);
        await logActivity(req.body.deletedBy, `Deleted account #${id}`);
        
        res.json({ success: true, message: 'Account deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Service Management (Admin only)
exports.getAllServices = async (req, res) => {
    try {
        const db = await getDatabase();
        const services = await db.all('SELECT * FROM services ORDER BY service_name');
        res.json({ success: true, data: services });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.createService = async (req, res) => {
    const { serviceName, description } = req.body;
    
    try {
        const db = await getDatabase();
        
        if (!serviceName || !description ) {
            return res.status(400).json({ success: false, error: 'Service name and description are required' });
        }
         
        
        await db.run(`
            INSERT INTO services (service_name, category , description )
            VALUES (?, ?, ?)
        `, [serviceName, 'Medical Service', description]);
        
        await logActivity(req.body.createdBy, `Created new service: ${serviceName}`);
        
        res.status(201).json({ success: true, message: 'Service created successfully' });
    } catch (error) {
        if (error.message.includes('UNIQUE')) {
            res.status(400).json({ success: false, error: 'Service name already exists' });
        } else {
            res.status(500).json({ success: false, error: error.message });
        }
    }
};

exports.updateService = async (req, res) => {
    const id = req.params.id;
    const { serviceName, price, category } = req.body;
    
    try {
        const db = await getDatabase();
        
        await db.run(`
            UPDATE services 
            SET service_name = ?, price = ?, category = ?
            WHERE id = ?
        `, [serviceName, price, category, id]);
        
        await logActivity(req.body.updatedBy, `Updated service #${id}`);
        
        res.json({ success: true, message: 'Service updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.deleteService = async (req, res) => {
    const id = req.params.id;
    
    try {
        const db = await getDatabase();
        
        // Check if service is used in invoices
        const used = await db.get('SELECT COUNT(*) as count FROM invoice_services WHERE service_id = ?', id);
        if (used.count > 0) {
            return res.status(400).json({ success: false, error: 'Cannot delete service used in existing invoices' });
        }
        
        await db.run('DELETE FROM services WHERE id = ?', id);
        await logActivity(req.body.deletedBy, `Deleted service #${id}`);
        
        res.json({ success: true, message: 'Service deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// User Service Management (Admin only)
exports.getUserServices = async (req, res) => {
    try {
        const db = await getDatabase();
        const userId = req.params.userId;
        
        const userServices = await db.all(`
            SELECT s.*, us.assigned_at, us.assigned_by
            FROM user_services us
            JOIN services s ON us.service_id = s.id
            WHERE us.user_id = ?
            ORDER BY s.service_name
        `, userId);
        
        res.json({ success: true, data: userServices });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getActivityLog = async (req, res) => {
    try {
        const db = await getDatabase();
        const userRole = req.headers['x-user-role'];
        const username = req.headers['x-username'];
        
        let logs;
        if (userRole === 'admin') {
            // Admin sees all logs
            logs = await db.all(`
                SELECT * FROM activity_log 
                ORDER BY timestamp DESC 
                LIMIT 200
            `);
        } else {
            // Regular users only see their own logs
            logs = await db.all(`
                SELECT * FROM activity_log 
                WHERE user = ?
                ORDER BY timestamp DESC 
                LIMIT 200
            `, username);
        }
        
        res.json({ success: true, data: logs });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get summary statistics with role-based totals
exports.getSummary = async (req, res) => {
    try {
        const db = await getDatabase();
        const userRole = req.headers['x-user-role'];
        const username = req.headers['x-username'];
        
        let totalInvoices, grandTotal, drugsTotal, nonDrugsTotal;
        
        if (userRole === 'admin') {
            // Admin sees all totals
            totalInvoices = await db.get('SELECT COUNT(*) as count FROM invoices');
            grandTotal = await db.get('SELECT SUM(price) as total FROM invoices');
            drugsTotal = await db.get(`
                SELECT SUM(price) as total 
                FROM invoices 
                WHERE account_id = 1
            `);
            nonDrugsTotal = await db.get(`
                SELECT SUM(price) as total 
                FROM invoices 
                WHERE account_id = 2
            `);
        } else {
            // Regular users only see their own totals
            totalInvoices = await db.get('SELECT COUNT(*) as count FROM invoices WHERE created_by = ?', username);
            grandTotal = await db.get('SELECT SUM(price) as total FROM invoices WHERE created_by = ?', username);
            drugsTotal = await db.get(`
                SELECT SUM(price) as total 
                FROM invoices 
                WHERE account_type = 'drugs' AND created_by = ?
            `, username);
            nonDrugsTotal = await db.get(`
                SELECT SUM(price) as total 
                FROM invoices 
                WHERE account_type = 'nondrugs' AND created_by = ?
            `, username);
        }
        
        res.json({
            success: true,
            data: {
                totalInvoices: totalInvoices.count || 0,
                grandTotal: grandTotal.total || 0,
                drugsTotal: drugsTotal.total || 0,
                nonDrugsTotal: nonDrugsTotal.total || 0,
                averageInvoice: totalInvoices.count > 0 ? (grandTotal.total / totalInvoices.count).toFixed(2) : 0
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Helper function to log activities
async function logActivity(user, action) {
    try {
        const db = await getDatabase();
        await db.run(`
            INSERT INTO activity_log (user, action, timestamp)
            VALUES (?, ?, datetime('now'))
        `, [user, action]);
    } catch (error) {
        console.error('Error logging activity:', error);
    }
}

// Get all users with their details (Admin only)
exports.getUsers = async (req, res) => {
    try {
        const db = await getDatabase();
        const users = await db.all(`
            SELECT u.id, u.username, u.role, u.created_at,
                   COUNT(DISTINCT us.service_id) as assigned_services_count,
                   COUNT(DISTINCT i.id) as invoices_count
            FROM users u
            LEFT JOIN user_services us ON u.id = us.user_id
            LEFT JOIN invoices i ON u.username = i.created_by
            GROUP BY u.id
            ORDER BY u.created_at DESC
        `);
        res.json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Create user with role-based permissions (Admin only)
exports.createUser = async (req, res) => {
    const { username, password, role , userServices } = req.body;
    
    try {
        const db = await getDatabase();
        
        if (!username || !password || !role) {
            return res.status(400).json({ success: false, error: 'All fields are required' });
        }
        
        // Validate role
        if (!['admin', 'user'].includes(role)) {
            return res.status(400).json({ success: false, error: 'Invalid role. Must be admin or user' });
        }
        
        const result = await db.run(`
            INSERT INTO users (username, password, role , services)
            VALUES (?, ?, ? ,?)
        `, [username, password, role , userServices]);
        
        await logActivity(req.body.createdBy, `Created new user: ${username} with :(${role}) permission`);
        
        res.status(201).json({ success: true, message: 'User created successfully', userId: result.lastID });
    } catch (error) {
        if (error.message.includes('UNIQUE')) {
            res.status(400).json({ success: false, error: 'Username already exists' });
        } else {
            res.status(500).json({ success: false, error: error.message });
        }
    }
};

// Get user-specific account totals
exports.getUserAccountTotals = async (req, res) => {
    try {
        const db = await getDatabase();
        const username = req.params.username;
        const requestingUser = req.headers['x-username'];
        const userRole = req.headers['x-user-role'];
        
        // Check permission: only admin or the user themselves can view their totals
        if (userRole !== 'admin' && requestingUser !== username) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }
        
        const drugsTotal = await db.get(`
            SELECT SUM(price) as total 
            FROM invoices 
            WHERE account_type = 'drugs' AND created_by = ?
        `, username);
        
        const nonDrugsTotal = await db.get(`
            SELECT SUM(price) as total 
            FROM invoices 
            WHERE account_type = 'nondrugs' AND created_by = ?
        `, username);
        
        const totalInvoices = await db.get(`
            SELECT COUNT(*) as count 
            FROM invoices 
            WHERE created_by = ?
        `, username);
        
        res.json({
            success: true,
            data: {
                username,
                drugsTotal: drugsTotal.total || 0,
                nonDrugsTotal: nonDrugsTotal.total || 0,
                totalInvoices: totalInvoices.count || 0
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};  

// Add this helper function to get user services from JSON field
async function getUserServicesFromJSON(username) {
    const db = await getDatabase();
    const user = await db.get(`
        SELECT u.id, u.services, u.role
        FROM users u
        WHERE u.username = ?
    `, username);
    
    if (user && user.userServices && user.userServices !== '[]') {
        try {
            const serviceIds = JSON.parse(user.userServices);
            if (serviceIds.length > 0) {
                const placeholders = serviceIds.map(() => '?').join(',');
                const services = await db.all(`
                    SELECT * FROM services 
                    WHERE id IN (${placeholders})
                `, serviceIds);
                return services;
            }
        } catch (e) {
            console.error('Error parsing userServices JSON:', e);
        }
    }
    return [];
}

// Update getAvailableServicesForUser to use JSON field first for performance
exports.getAvailableServicesForUser = async (req, res) => {
    try {
        const db = await getDatabase();
        const username = req.headers['x-username'];
        const userRole = req.headers['x-user-role'];  

        // console.log('Available Services running ...... ')
        
        if (userRole === 'admin') { 
            // console.log('logged in with an admin account ......')
            // Admin sees all services
            const allServices = await db.all('SELECT * FROM services ORDER BY service_name');
            return res.json({ success: true, data: allServices });  
        }
        // console.log('logged in with a user account with username:' , username)
        // Try to get from JSON field first (faster)
        const servicesFromJSON = await getUserServicesFromJSON(username);
        
        if (servicesFromJSON.length > 0) {
            return res.json({ success: true, data: servicesFromJSON });
        }
        
        // Fallback to join query if JSON is empty
        const user = await db.get('SELECT id FROM users WHERE username = ?', username);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }  

        console.log('this is the account username:', user)
        
        const userServices = await db.all(`
            SELECT s.* 
            FROM services s
            JOIN user_services us ON s.id = us.service_id
            WHERE us.user_id = ?
            ORDER BY s.service_name
        `, user.id);
        
        res.json({ success: true, data: userServices });
    } catch (error) {
        console.error('Error getting user services:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};


// Update assignServiceToUser to also update JSON field
exports.assignServiceToUser = async (req, res) => {
    const { userId, serviceId, assignedBy } = req.body;
    
    try {
        const db = await getDatabase();    

        console.log('About to Assign services to user ........')
        
        // Check if user exists
        const user = await db.get('SELECT id, services FROM users WHERE id = ?', userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }    

        console.log('About to assign services to user:', user)
        
        // Check if service exists
        const service = await db.get('SELECT service_name FROM services WHERE id = ?', serviceId);
        if (!service) {
            return res.status(404).json({ success: false, error: 'Service not found' });
        }    

        console.log('About to assign this service to user:', service)
        
        console.log(`insert into user service: ${userId} , ${serviceId} , ${assignedBy}`);    

        // FIXED: Use parameterized query instead of string interpolation
        await db.run(`
            INSERT OR IGNORE INTO user_services (user_id, service_id, assigned_by) 
            VALUES (?, ?, ?)
        `, [userId, serviceId, assignedBy]);
        
        // Update the userServices JSON field
        const userServices = await db.all(`
            SELECT service_id FROM user_services WHERE user_id = ?
        `, userId); 

        console.log('user services:', userServices)
        
        const serviceIds = userServices.map(us => us.service_id);
        const servicesJson = JSON.stringify(serviceIds);
        
        await db.run(`UPDATE users SET services = ? WHERE id = ?`, [servicesJson, userId]);
        
        await logActivity(assignedBy, `Assigned service "${service.service_name}" to user ID ${userId}`);
        
        res.json({ success: true, message: 'Service assigned successfully' });
    } catch (error) {
        console.error('Error assigning service:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Update removeUserService to also update JSON field
exports.removeUserService = async (req, res) => {
    const { userId, serviceId } = req.params;
    
    try {
        const db = await getDatabase();
        
        await db.run('DELETE FROM user_services WHERE user_id = ? AND service_id = ?', [userId, serviceId]);
        
        // Update the userServices JSON field
        const userServices = await db.all(`
            SELECT service_id FROM user_services WHERE user_id = ?
        `, userId);
        
        const serviceIds = userServices.map(us => us.service_id);
        const servicesJson = JSON.stringify(serviceIds);
        
        await db.run(`UPDATE users SET  services = ? WHERE id = ?`, [servicesJson, userId]);
        
        await logActivity(req.body.deletedBy, `Removed service from user ID ${userId}`);
        
        res.json({ success: true, message: 'Service removed successfully' });
    } catch (error) {
        console.error('Error removing service:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Add endpoint to get user with their services JSON
exports.getUserWithServices = async (req, res) => {
    try {
        const db = await getDatabase();
        const username = req.params.username;
        
        const user = await db.get(`
            SELECT id, username, role, userServices, created_at 
            FROM users 
            WHERE username = ?
        `, username);
        
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        // Parse the JSON services
        let services = [];
        if (user.userServices && user.userServices !== '[]') {
            try {
                const serviceIds = JSON.parse(user.userServices);
                if (serviceIds.length > 0) {
                    const placeholders = serviceIds.map(() => '?').join(',');
                    services = await db.all(`
                        SELECT * FROM services 
                        WHERE id IN (${placeholders})
                    `, serviceIds);
                }
            } catch (e) {
                console.error('Error parsing userServices JSON:', e);
            }
        }
        
        res.json({ 
            success: true, 
            data: {
                ...user,
                services
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};