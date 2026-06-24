const { json } = require('body-parser');
const { getDatabase } = require('../models/database');

// Cache for user special IDs to reduce database calls
const userSpecialIdCache = new Map();
const userSpecialIdByIdCache = new Map();

// Helper function to get user's special_id by username with caching
async function getUserSpecialId(username) {
    try {
        if (!username || username === 'undefined' || username === 'null') {
            console.log(`Invalid username provided: ${username}`);
            return 'Unknown User';
        }
        
        // Check cache first
        if (userSpecialIdCache.has(username)) {
            return userSpecialIdCache.get(username);
        }
        
        const db = await getDatabase();
        const user = await db.get('SELECT special_id FROM users WHERE username = ?', username);
        
        let result = user ? user.special_id : 'Unknown User';
        
        // Cache the result
        userSpecialIdCache.set(username, result);
        
        return result;
    } catch (error) {
        console.error('Error getting user special_id:', error);
        return 'Unknown User';
    }
}

// Helper function to get user's special_id by user_id with caching
async function getUserSpecialIdById(userId) {
    try {
        if (!userId || userId === 'undefined' || userId === 'null') {
            return 'Unknown User';
        }
        
        // Check cache first
        if (userSpecialIdByIdCache.has(userId)) {
            return userSpecialIdByIdCache.get(userId);
        }
        
        const db = await getDatabase();
        const user = await db.get('SELECT special_id FROM users WHERE id = ?', userId);
        
        let result = user ? user.special_id : 'Unknown User';
        
        // Cache the result
        userSpecialIdByIdCache.set(userId, result);
        
        return result;
    } catch (error) {
        console.error('Error getting user special_id by id:', error);
        return 'Unknown User';
    }
}

// Helper function to clear cache
function clearUserSpecialIdCache(username) {
    if (username) {
        userSpecialIdCache.delete(username);
        console.log(`Cache cleared for username: ${username}`);
    } else {
        userSpecialIdCache.clear();
        userSpecialIdByIdCache.clear();
        console.log('All user special ID caches cleared');
    }
}

// Helper function to log username changes
async function logUsernameChange(userId, oldUsername, newUsername, changedBy) {
    try {
        const db = await getDatabase();
        const userSpecialId = await getUserSpecialIdById(userId);
        
        await db.run(`
            INSERT INTO userNamesChanges (user, new_username, old_username, timestamp)
            VALUES (?, ?, ?, datetime('now'))
        `, [userSpecialId, newUsername, oldUsername]);
        
        // Clear cache for the old username
        clearUserSpecialIdCache(oldUsername);
    } catch (error) {
        console.error('Error logging username change:', error);
    }
}

// Helper function to log password changes
async function logPasswordChange(userId, oldPassword, newPassword, passwordHint, changedBy) {
    try {
        const db = await getDatabase();
        const userSpecialId = await getUserSpecialIdById(userId);
        
        await db.run(`
            INSERT INTO passwordChanges (user, new_password, password_hint, old_password, timestamp)
            VALUES (?, ?, ?, ?, datetime('now'))
        `, [userSpecialId, newPassword, passwordHint, oldPassword]);
    } catch (error) {
        console.error('Error logging password change:', error);
    }
}

// Helper function to log password attempts
async function logPasswordAttempt(username, action) {
    try {
        const userSpecialId = await getUserSpecialId(username);
        
        if (userSpecialId === 'Unknown User') {
            return;
        }
        
        const db = await getDatabase();
        
        const recentAttempt = await db.get(`
            SELECT id, attempt_count FROM password_attempts 
            WHERE user = ? AND action = ? AND datetime(attempt_time) > datetime('now', '-1 minute')
            ORDER BY attempt_time DESC LIMIT 1
        `, [userSpecialId, action]);
        
        if (recentAttempt) {
            await db.run(`
                UPDATE password_attempts 
                SET attempt_count = attempt_count + 1, attempt_time = datetime('now')
                WHERE id = ?
            `, [recentAttempt.id]);
        } else {
            await db.run(`
                INSERT INTO password_attempts (user, attempt_count, action, attempt_time)
                VALUES (?, 1, ?, datetime('now'))
            `, [userSpecialId, action]);
        }
    } catch (error) {
        console.error('Error logging password attempt:', error);
    }
}

// Helper function to check password attempts
async function checkPasswordAttempts(username, action, maxAttempts = 5) {
    try {
        const userSpecialId = await getUserSpecialId(username);
        
        if (userSpecialId === 'Unknown User') {
            return false;
        }
        
        const db = await getDatabase();
        
        const attempts = await db.get(`
            SELECT SUM(attempt_count) as total_attempts 
            FROM password_attempts 
            WHERE user = ? AND action = ? AND datetime(attempt_time) > datetime('now', '-15 minutes')
        `, [userSpecialId, action]);
        
        return (attempts?.total_attempts || 0) >= maxAttempts;
    } catch (error) {
        console.error('Error checking password attempts:', error);
        return false;
    }
}

// Helper function to log account name changes
async function logAccountNameChange(userSpecialId, oldFirstName, newFirstName, oldMiddleName, newMiddleName, oldLastName, newLastName) {
    try {
        const db = await getDatabase();
        await db.run(`
            INSERT INTO accountNameChanges (
                user, 
                new_account_first_name, old_account_first_name,
                new_account_Middle_name, old_account_Middle_name,
                new_account_last_name, old_account_last_name,
                timestamp
            ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `, [userSpecialId, newFirstName, oldFirstName, newMiddleName, oldMiddleName, newLastName, oldLastName]);
    } catch (error) {
        console.error('Error logging account name change:', error);
    }
}

// Helper function to log deleted accounts
async function logDeletedAccount(accountData, deletedBy) {
    try {
        const db = await getDatabase();
        const deletedBySpecialId = await getUserSpecialId(deletedBy);
        
        await db.run(`
            INSERT INTO deletedAccounts (
                user, account_first_name, account_Middle_name, account_last_name,
                account_type, account_sex, account_age, account_gcr_number,
                account_phone_number, account_address, account_description,
                account_service_details, account_deleted_by, account_created_by,
                account_created_at, account_deleted_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `, [
            accountData.user, accountData.first_name, accountData.middle_name, accountData.last_name,
            accountData.account_type, accountData.sex, accountData.age, accountData.gcr_number,
            accountData.phone_number, accountData.address, accountData.description,
            accountData.service_details, deletedBySpecialId, accountData.created_by,
            accountData.created_at
        ]);
    } catch (error) {
        console.error('Error logging deleted account:', error);
    }
}

// Helper function to log user login with device info
async function logUserLoginDetails(username, req) {
    try {
        const userSpecialId = await getUserSpecialId(username);
        
        if (userSpecialId === 'Unknown User') {
            return null;
        }
        
        const db = await getDatabase();
        const userAgent = req.headers['user-agent'] || 'Unknown';
        const ipAddress = req.ip || req.connection.remoteAddress || 'Unknown';
        const location = req.headers['x-location'] || 'Unknown';
        
        await db.run(`
            INSERT INTO user_logins (username, user_agent, ip_address, location, timestamp)
            VALUES (?, ?, ?, ?, datetime('now'))
        `, [userSpecialId, userAgent, ipAddress, location]);
        
        return { userAgent, ipAddress, location, timestamp: new Date().toISOString() };
    } catch (error) {
        console.error('Error logging user login details:', error);
        return null;
    }
}

// Helper function to get user's last login
async function getUserLastLogin(username) {
    try {
        const userSpecialId = await getUserSpecialId(username);
        
        if (userSpecialId === 'Unknown User') {
            return null;
        }
        
        const db = await getDatabase();
        
        const lastLogin = await db.get(`
            SELECT user_agent, ip_address, location, timestamp 
            FROM user_logins 
            WHERE username = ?
            ORDER BY timestamp DESC 
            LIMIT 1
        `, userSpecialId);
        return lastLogin;
    } catch (error) {
        console.error('Error getting user last login:', error);
        return null;
    }
}

// Helper function to get user login history
async function getUserLoginHistory(username, limit = 10) {
    try {
        const userSpecialId = await getUserSpecialId(username);
        
        if (userSpecialId === 'Unknown User') {
            return [];
        }
        
        const db = await getDatabase();
        
        const history = await db.all(`
            SELECT user_agent, ip_address, location, timestamp 
            FROM user_logins 
            WHERE username = ?
            ORDER BY timestamp DESC 
            LIMIT ?
        `, [userSpecialId, limit]);
        return history;
    } catch (error) {
        console.error('Error getting user login history:', error);
        return [];
    }
}

// Helper function to log activities
async function logActivity(username, action) {
    try {
        const userSpecialId = await getUserSpecialId(username);
        
        if (userSpecialId === 'Unknown User') {
            return;
        }
        
        const db = await getDatabase();
        
        await db.run(`
            INSERT INTO activity_log (user, action, timestamp)
            VALUES (?, ?, datetime('now'))
        `, [userSpecialId, action]);
    } catch (error) {
        console.error('Error logging activity:', error);
    }
}

// Helper functions for generating unique IDs
async function generateUniqueNumber(table, column, prefix, length = 8) {
    const db = await getDatabase();
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
        const min = Math.pow(10, length - 1);
        const max = Math.pow(10, length) - 1;
        const randomNum = Math.floor(Math.random() * (max - min + 1) + min);
        const formattedNum = randomNum.toString().padStart(length, '0');
        
        const exists = await db.get(
            `SELECT 1 FROM ${table} WHERE ${column} LIKE ?`,
            [`%${formattedNum}%`]
        );
        
        if (!exists) {
            return formattedNum;
        }
        attempts++;
    }
    
    const timestamp = Date.now().toString().slice(-length);
    return timestamp.padStart(length, '0');
}

async function generateUniqueInvoiceNumber() {
    const db = await getDatabase();
    let attempts = 0;
    const maxAttempts = 10;
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    while (attempts < maxAttempts) {
        const random10Digit = Math.floor(Math.random() * 9000000000 + 1000000000).toString();
        const identificationNumber = `INV-${random10Digit}-${dateStr}-WGMH`;
        
        const exists = await db.get(
            `SELECT 1 FROM invoices WHERE identification_number = ?`,
            [identificationNumber]
        );
        
        if (!exists) {
            return identificationNumber;
        }
        attempts++;
    }
    
    const timestamp = Date.now().toString();
    const random10Digit = timestamp.slice(-10).padStart(10, '0');
    return `SIN-${random10Digit}-${dateStr}-WGMH`;
}

async function generateUserSpecialId(role) {
    let prefix;
    switch(role) {
        case 'admin':
            prefix = 'AABMA';
            break;
        case 'master':
            prefix = 'MABMA';
            break;
        case 'user-admin':
            prefix = 'UABMA';
            break;
        default:
            prefix = 'CHBMA';
    }
    
    const uniqueNumber = await generateUniqueNumber('users', 'special_id', prefix, 8);
    const db = await getDatabase();
    const specialId = `${prefix}-${uniqueNumber}-WGMH`;
    
    const exists = await db.get(`SELECT 1 FROM users WHERE special_id = ?`, [specialId]);
    if (exists) {
        return generateUserSpecialId(role);
    }
    return specialId;
} 

// Helper function to check if password is correct for a given username
async function checkPassWord(username, password) {
    try {
        const db = await getDatabase();
        
        // Validate input parameters
        if (!username || !password) {
            console.log('Invalid input: username or password missing');
            return false;
        }
        
        // Query the user from database
        const user = await db.get(
            'SELECT id, username, password, status FROM users WHERE username = ?',
            username
        );
        
        // Check if user exists
        if (!user) {
            console.log(`User not found: ${username}`);
            return false;
        }
        
        // Check if account is blocked or suspended
        if (user.status === 'blocked') {
            console.log(`Account blocked: ${username}`);
            return false;
        }
        
        if (user.status === 'suspended') {
            // Check if suspension period has expired
            const suspendedUser = await db.get(
                'SELECT suspended_until FROM users WHERE username = ?',
                username
            );
            
            if (suspendedUser && suspendedUser.suspended_until) {
                const suspendedUntil = new Date(suspendedUser.suspended_until);
                if (suspendedUntil > new Date()) {
                    console.log(`Account suspended until: ${suspendedUntil}`);
                    return false;
                }
            }
        }
        
        // Compare passwords (assuming plain text for now - you should use hashing in production)
        const isPasswordCorrect = (user.password === password);
        
        // Log the password attempt for security monitoring
        if (!isPasswordCorrect) {
            await logPasswordAttempt(username, 'password_check');
            console.log(`Incorrect password attempt for user: ${username}`);
        } else {
            console.log(`Successful password verification for user: ${username}`);
        }
        
        return isPasswordCorrect;
        
    } catch (error) {
        console.error('Error checking password:', error);
        return false;
    }
}
// ============= INVOICE CONTROLLER EXPORTS =============

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

// Update invoice (Admin only)
exports.updateInvoice = async (req, res) => {
    const id = req.params.id;
    const { patientName, gcrNumber, accountId, accountType, services, amount, updatedBy } = req.body;
    
    try {
        const db = await getDatabase();
        
        const invoice = await db.get('SELECT * FROM invoices WHERE id = ?', id);
        if (!invoice) {
            return res.status(404).json({ success: false, error: 'Invoice not found' });
        }
        
        await db.run(`
            UPDATE invoices 
            SET patient_name = ?, gcr_number = ?, account_id = ?, account_type = ?, price = ?
            WHERE id = ?
        `, [patientName || invoice.patient_name, gcrNumber || invoice.gcr_number, 
            accountId || invoice.account_id, accountType || invoice.account_type, 
            amount || invoice.price, id]);
        
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
        
        const userSpecialId = await getUserSpecialId(invoice.created_by);
        
        await logDeletedAccount({
            user: userSpecialId,
            first_name: invoice.patient_name,
            middle_name: '',
            last_name: '',
            account_type: invoice.account_type,
            sex: 'N/A',
            age: 0,
            gcr_number: invoice.gcr_number,
            phone_number: 'N/A',
            address: 'N/A',
            description: `Invoice #${id} deleted`,
            service_details: JSON.stringify(invoice),
            created_by: userSpecialId,
            created_at: invoice.timestamp
        }, req.body.deletedBy || 'admin');
        
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

    // console.log('About to create account:', accountName , accountType)
    
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
        
        const account = await db.get('SELECT * FROM accounts WHERE id = ?', id);
        if (!account) {
            return res.status(404).json({ success: false, error: 'Account not found' });
        }
        
        const invoices = await db.get('SELECT COUNT(*) as count FROM invoices WHERE account_id = ?', id);
        if (invoices.count > 0) {
            return res.status(400).json({ success: false, error: 'Cannot delete account with existing invoices' });
        }
        
        await logDeletedAccount({
            user: await getUserSpecialId(req.body.deletedBy || 'admin'),
            first_name: account.account_name,
            middle_name: '',
            last_name: '',
            account_type: account.account_type,
            sex: 'N/A',
            age: 0,
            gcr_number: 'N/A',
            phone_number: 'N/A',
            address: 'N/A',
            description: account.description || 'No description',
            service_details: 'Account deleted',
            created_by: account.created_by || 'system',
            created_at: account.created_at
        }, req.body.deletedBy || 'admin');
        
        await db.run('DELETE FROM accounts WHERE id = ?', id);
        await logActivity(req.body.deletedBy, `Deleted account #${id}: ${account.account_name}`);
        
        res.json({ success: true, message: 'Account deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Service Management (Admin only)
exports.getAllServices = async (req, res) => {
    try {
        const db = await getDatabase();
        
        // Fix the JOIN syntax - get all services with their assigned prices
        const services = await db.all(`
            SELECT 
                s.id,
                s.service_name,
                s.description,
                s.category, 
                us.price as assigned_price
            FROM services s
            LEFT JOIN invoice_services us ON s.id = us.service_id
            WHERE us.id IS NULL OR us.id IN (
                SELECT MAX(id) 
                FROM invoice_services 
                GROUP BY service_id
            )
            ORDER BY s.service_name
        `);
        
        // Group services by ID and get the latest price if multiple assignments exist
        const groupedServices = {};
        
        for (const service of services) {
            const serviceId = service.id;
            
            if (!groupedServices[serviceId]) {
                groupedServices[serviceId] = {
                    id: service.id,
                    service_name: service.service_name,
                    description: service.description,
                    category: service.category,
                    default_price: service.default_price,
                    is_active: service.is_active,
                    prices: [] // Array to store all assigned prices
                };
            }
            
            // Add price if exists
            if (service.assigned_price) {
                groupedServices[serviceId].prices.push({
                    price: service.assigned_price,
                    assigned_by: service.assigned_by,
                    assigned_date: service.assigned_date
                });
            }
        }
        
        // Convert grouped object back to array
        const result = Object.values(groupedServices).map(service => ({
            ...service,
            current_price: service.prices.length > 0 ? 
                service.prices[service.prices.length - 1].price : 
                service.default_price,
            price_history: service.prices
        }));
        
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error fetching services:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.createService = async (req, res) => {
    const { serviceName, description } = req.body;
    
    try {
        const db = await getDatabase();
        
        if (!serviceName || !description) {
            return res.status(400).json({ success: false, error: 'Service name and description are required' });
        }
        
        await db.run(`
            INSERT INTO services (service_name, category, description)
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

        const user = await db.get('SELECT * FROM users WHERE id = ?', userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        } 
        
        // return all services if user is master, otherwise return assigned services
        if (user.role === 'master') {

            const services = await db.all('SELECT * FROM services ORDER BY service_name');
            return res.json({ success: true, data: services });
        }
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

// Get activity log with role-based filtering
exports.getActivityLog = async (req, res) => {
    try {
        const db = await getDatabase();
        const userRole = req.headers['x-user-role'];
        const username = req.headers['x-username'];
        
        let logs;
        
        if (userRole === 'master') {
            // Master sees all activity logs
            logs = await db.all(`
                SELECT * FROM activity_log 
                ORDER BY timestamp DESC 
                LIMIT 200
            `);
        } else if (userRole === 'admin') {
            // Admin sees all logs except other admin activities
            logs = await db.all(`
                SELECT * FROM activity_log 
                WHERE user NOT IN (
                    SELECT special_id FROM users WHERE role IN ('admin', 'master')
                )
                ORDER BY timestamp DESC 
                LIMIT 200
            `);
        } else if (userRole === 'user-admin') {
            // User-admin sees only regular user activities
            logs = await db.all(`
                SELECT * FROM activity_log 
                WHERE user IN (
                    SELECT special_id FROM users WHERE role = 'user'
                )
                ORDER BY timestamp DESC 
                LIMIT 200
            `);
        } else {
            // Regular users see only their own activities
            const userSpecialId = await getUserSpecialId(username);
            logs = await db.all(`
                SELECT * FROM activity_log 
                WHERE user = ?
                ORDER BY timestamp DESC 
                LIMIT 200
            `, userSpecialId);
        }
        
        res.json({ success: true, data: logs });
    } catch (error) {
        console.error('Error getting activity log:', error);
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

// Get user-specific account totals
exports.getUserAccountTotals = async (req, res) => {
    try {
        const db = await getDatabase();
        const username = req.params.username;
        const requestingUser = req.headers['x-username'];
        const userRole = req.headers['x-user-role'];
        
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

// Helper function to get user services from JSON field
async function getUserServicesFromJSON(username) {
    const db = await getDatabase();
    const user = await db.get(`
        SELECT u.id, u.services, u.role
        FROM users u
        WHERE u.username = ?
    `, username);
    
    if (user && user.services && user.services !== '[]') {
        try {
            const serviceIds = JSON.parse(user.services);
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

exports.getAvailableServicesForUser = async (req, res) => {
    try {
        const db = await getDatabase();
        const username = req.headers['x-username'];
        const userRole = req.headers['x-user-role']; 
        const specialId = req.headers['x-user-special-id'];
        
        if (userRole === 'master') {
            const allServices = await db.all('SELECT * FROM services ORDER BY service_name');
            return res.json({ success: true, data: allServices });
        }
        
        const servicesFromJSON = await getUserServicesFromJSON(username);
        
        if (servicesFromJSON.length > 0) {
            return res.json({ success: true, data: servicesFromJSON });
        }
        
        const user = await db.get('SELECT id FROM users WHERE special_id = ?', specialId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
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

exports.assignServiceToUser = async (req, res) => {
    const { userId, serviceId, assignedBy } = req.body;
    
    try {
        const db = await getDatabase();
        
        const user = await db.get('SELECT id, services FROM users WHERE id = ?', userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        const service = await db.get('SELECT service_name FROM services WHERE id = ?', serviceId);
        if (!service) {
            return res.status(404).json({ success: false, error: 'Service not found' });
        }
        
        await db.run(`
            INSERT OR IGNORE INTO user_services (user_id, service_id, assigned_by) 
            VALUES (?, ?, ?)
        `, [userId, serviceId, assignedBy]);
        
        const userServices = await db.all(`
            SELECT service_id FROM user_services WHERE user_id = ?
        `, userId);
        
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

exports.removeUserService = async (req, res) => {
    const { userId, serviceId } = req.params;
    
    try {
        const db = await getDatabase();
        
        await db.run('DELETE FROM user_services WHERE user_id = ? AND service_id = ?', [userId, serviceId]);
        
        const userServices = await db.all(`
            SELECT service_id FROM user_services WHERE user_id = ?
        `, userId);
        
        const serviceIds = userServices.map(us => us.service_id);
        const servicesJson = JSON.stringify(serviceIds);
        
        await db.run(`UPDATE users SET services = ? WHERE id = ?`, [servicesJson, userId]);
        
        await logActivity(req.body.deletedBy, `Removed service from user ID ${userId}`);
        
        res.json({ success: true, message: 'Service removed successfully' });
    } catch (error) {
        console.error('Error removing service:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getUserWithServices = async (req, res) => {
    try {
        const db = await getDatabase();
        const username = req.params.username;
        
        const user = await db.get(`
            SELECT id, username, role, services, created_at 
            FROM users 
            WHERE username = ?
        `, username);
        
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        let services = [];
        if (user.services && user.services !== '[]') {
            try {
                const serviceIds = JSON.parse(user.services);
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

exports.createUser = async (req, res) => {
    const { firstName, middleName, lastName, Sex, DOB, phone, username, password, role, userServices, passwordHint } = req.body;
    const creatorRole = req.headers['x-user-role'];
    
    try {
        const db = await getDatabase();
        
        if (!firstName || !lastName || !username || !password || !role) {
            return res.status(400).json({ success: false, error: 'Fill all required fields!' });
        }
        
        // Role creation permissions
        const validRoles = ['user', 'user-admin', 'admin'];
        
        // Master can create any role except other master
        if (creatorRole === 'master') {
            validRoles.push('master');
        }
        // Admin can create user and user-admin only
        else if (creatorRole === 'admin') {
            if (role === 'admin' || role === 'master') {
                return res.status(403).json({ 
                    success: false, 
                    error: 'Admins cannot create admin or master accounts' 
                });
            }
        }
        // User-admin can only create regular users
        else if (creatorRole === 'user-admin') {
            if (role !== 'user') {
                return res.status(403).json({ 
                    success: false, 
                    error: 'User admins can only create regular user accounts' 
                });
            }
        }
        // Regular users cannot create accounts
        else {
            return res.status(403).json({ 
                success: false, 
                error: 'Insufficient permissions to create users' 
            });
        }
        
        if (!validRoles.includes(role)) {
            return res.status(400).json({ 
                success: false, 
                error: `Invalid role. Must be one of: ${validRoles.join(', ')}` 
            });
        }
        
        // Service assignment based on role
        let serviceIds = [];
        if (userServices && Array.isArray(userServices) && userServices.length > 0) {
            // Users and user-admins can have services
            if (role === 'user' || role === 'user-admin') {
                serviceIds = userServices;
            } else {
                // Admins and masters cannot be assigned services
                console.log(`Warning: ${role} account cannot be assigned services. Ignoring service assignments.`);
            }
        }
        
        const servicesJson = JSON.stringify(serviceIds);
        const specialId = await generateUserSpecialId(role);
        
        const result = await db.run(`
            INSERT INTO users (
                first_name, middle_name, last_name, sex, phone_number, date_of_birth, 
                username, password, role, special_id, services, pass_hint
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [firstName, middleName, lastName, Sex, phone, DOB, username, password, role, specialId, servicesJson, passwordHint]);
        
        const userId = result.lastID;
        
        // Insert into user_services only for users and user-admins
        if ((role === 'user' || role === 'user-admin') && serviceIds.length > 0) {
            for (const serviceId of serviceIds) {
                try {
                    await db.run(`
                        INSERT OR IGNORE INTO user_services (user_id, service_id, assigned_by) 
                        VALUES (?, ?, ?)
                    `, [userId, serviceId, req.body.createdBy || username]);
                } catch (err) {
                    console.error(`Error assigning service ${serviceId}:`, err);
                }
            }
        }
        
        await logActivity(req.body.createdBy || username, `Created new user: ${username} with role: ${role} and ID: ${specialId}`);
        
        res.status(201).json({ 
            success: true, 
            message: 'User created successfully', 
            userId: userId,
            specialId: specialId,
            assignedServices: (role === 'user' || role === 'user-admin') ? serviceIds.length : 0
        });
        
    } catch (error) {
        if (error.message.includes('UNIQUE')) {
            if (error.message.includes('special_id')) {
                res.status(400).json({ success: false, error: 'Failed to generate unique user ID. Please try again.' });
            } else {
                res.status(400).json({ success: false, error: 'Username already exists' });
            }
        } else {
            console.error('Error creating user:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
};

exports.getUsers = async (req, res) => {
    try {
        const db = await getDatabase();
        const userRole = req.headers['x-user-role'];
        const requestingUsername = req.headers['x-username'];
        
        let query = `
            SELECT u.id, u.username, u.role, u.special_id, u.status, u.created_at,
                   u.first_name, u.last_name, u.middle_name, 
                   u.sex, u.phone_number, u.date_of_birth,
                   u.services, 
                   COUNT(DISTINCT us.service_id) as assigned_services_count,
                   COUNT(DISTINCT i.id) as invoices_count
            FROM users u
            LEFT JOIN user_services us ON u.id = us.user_id
            LEFT JOIN invoices i ON u.username = i.created_by
        `;
        
        let whereClause = '';
        let params = [];
        
        // Role-based filtering
        if (userRole === 'master') {
            // Master sees all except other masters
            whereClause = ' WHERE u.role != ?';
            params = ['master'];
        } else if (userRole === 'admin') {
            // Admin sees users and user-admins, not other admins or masters
            whereClause = ' WHERE u.role IN (?, ?)';
            params = ['user', 'user-admin'];
        } else if (userRole === 'user-admin') {
            // User-admin only sees regular users
            whereClause = ' WHERE u.role = ?';
            params = ['user'];
        } else {
            // Regular users see only themselves
            whereClause = ' WHERE u.username = ?';
            params = [requestingUsername];
        }
        
        query += whereClause;
        query += ' GROUP BY u.id ORDER BY u.created_at DESC';
        
        const users = await db.all(query, params);
        
        res.json({ success: true, data: users });
    } catch (error) {
        console.error('Error getting users:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};



exports.createInvoice = async (req, res) => {
    const { patientName, gcrNumber, accountId, accountType, amount, services, createdBy } = req.body;
    
    try {
        const db = await getDatabase();
        
        if (!patientName || !gcrNumber || !services || services.length === 0 || !amount || amount <= 0) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }
        
        if (gcrNumber) {
            if (!/^\d{8}$/.test(gcrNumber)) {
                return res.status(400).json({ success: false, error: 'GCR number must be 8 digits' });
            }
            const check = await db.get(`SELECT identification_number FROM invoices WHERE gcr_number = ?`, gcrNumber);
            if (check) {
                return res.status(400).json({ success: false, error: 'GCR number can only be used once' });
            }
        }
        
        const identificationNumber = await generateUniqueInvoiceNumber();
        
        const result = await db.run(`
            INSERT INTO invoices (patient_name, gcr_number, account_id, account_type, price, identification_number, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [patientName, gcrNumber, accountId, accountType, amount, identificationNumber, createdBy || 'system']);
        
        const invoiceId = result.lastID; 

        // FIX: Don't overwrite the services parameter - use a different variable name
        const availableServices = await db.all('SELECT * FROM services');
        
        // Create a map for quick lookup of service details
        const serviceMap = new Map();
        availableServices.forEach(service => {
            serviceMap.set(service.service_name, service);
        });
        
        // Insert each service from the request
        for (const service of services) {
            // Get the full service details from the map
            const serviceDetails = serviceMap.get(service.name); 


            // console.log('services Print:' ,service)
            
            if (!serviceDetails) {
                console.warn(`Service "${service.name}" not found in database`);
                continue; // Skip if service doesn't exist
            }
            
            await db.run(`
                INSERT INTO invoice_services (invoice_id, service_id, service_name, price)
                VALUES (?, ?, ?, ?)
            `, [invoiceId, serviceDetails.id, service.name, service.price || amount]);
        }
        
        await logActivity(createdBy || 'system', `Created invoice #${invoiceId} (${identificationNumber}) for ${patientName} - GH¢${amount}`);
        
        res.status(201).json({ 
            success: true, 
            data: { 
                id: invoiceId,
                identificationNumber: identificationNumber 
            } 
        });
    } catch (error) {
        console.error('Error creating invoice:', error);
        
        if (error.message.includes('UNIQUE') && error.message.includes('identification_number')) {
            return res.status(409).json({ 
                success: false, 
                error: 'Identification number conflict. Please try again.' 
            });
        }
        
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getAllInvoices = async (req, res) => {
    try {
        const db = await getDatabase();
        const userRole = req.headers['x-user-role'];
        const username = req.headers['x-username'];
        
        let invoices;
        if (userRole === 'admin') {
            invoices = await db.all(`
                SELECT i.*, a.account_name 
                FROM invoices i
                LEFT JOIN accounts a ON i.account_id = a.id
                ORDER BY i.timestamp DESC
            `);
        } else {
            invoices = await db.all(`
                SELECT i.*, a.account_name 
                FROM invoices i
                LEFT JOIN accounts a ON i.account_id = a.id
                WHERE i.created_by = ?
                ORDER BY i.timestamp DESC
            `, username);
        }
        
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

exports.getUserBySpecialId = async (req, res) => {
    try {
        const db = await getDatabase();
        const specialId = req.params.specialId;
        
        const user = await db.get(`
            SELECT id, username, role, special_id, status, created_at 
            FROM users 
            WHERE special_id = ?
        `, specialId);
        
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getInvoiceByIdentificationNumber = async (req, res) => {
    try {
        const db = await getDatabase();
        const identificationNumber = req.params.identificationNumber;
        const userRole = req.headers['x-user-role'];
        const username = req.headers['x-username'];
        
        const invoice = await db.get(`
            SELECT i.*, a.account_name 
            FROM invoices i
            LEFT JOIN accounts a ON i.account_id = a.id
            WHERE i.identification_number = ?
        `, identificationNumber);
        
        if (!invoice) {
            return res.status(404).json({ success: false, error: 'Invoice not found' });
        }
        
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

// Change username
exports.changeUserName = async (req, res) => {
    const { userId } = req.params;
    const { newUsername, changedBy } = req.body;
    
    try {
        const db = await getDatabase();
        
        if (!newUsername || newUsername.trim() === '') {
            return res.status(400).json({ success: false, error: 'New username is required' });
        }
        
        const user = await db.get('SELECT * FROM users WHERE special_id = ?', userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        const isBlocked = await checkPasswordAttempts(changedBy || req.headers['x-username'], 'username_change');
        if (isBlocked) {
            return res.status(429).json({ success: false, error: 'Too many attempts. Please try again later.' });
        }
        
        const existingUser = await db.get('SELECT id FROM users WHERE username = ? AND special_id != ?', [newUsername, userId]);
        if (existingUser) {
            await logPasswordAttempt(changedBy || req.headers['x-username'], 'username_change');
            return res.status(400).json({ success: false, error: 'Username already exists' });
        }
        
        const oldUsername = user.username;
        await db.run('UPDATE users SET username = ? WHERE special_id = ?', [newUsername, userId]);
        
        await logUsernameChange(user.id, oldUsername, newUsername, changedBy || req.headers['x-username']);
        await logActivity(changedBy || req.headers['x-username'], `Changed username for user ${userId} from ${oldUsername} to ${newUsername}`);
        
        // Clear cache for both old and new username
        clearUserSpecialIdCache(oldUsername);
        
        res.json({ success: true, message: 'Username changed successfully' });
    } catch (error) {
        console.error('Error changing username:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Change password
exports.changeUserPassword = async (req, res) => {
    const { userId } = req.params;
    const { newPassword, changedBy, passwordHint } = req.body;
    
    try {
        const db = await getDatabase();
        
        if (!newPassword || newPassword.trim() === '') {
            return res.status(400).json({ success: false, error: 'New password is required' });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
        }
        
        const user = await db.get('SELECT * FROM users WHERE special_id = ?', userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        const isBlocked = await checkPasswordAttempts(changedBy || req.headers['x-username'], 'password_change');
        if (isBlocked) {
            return res.status(429).json({ success: false, error: 'Too many attempts. Please try again later.' });
        }
        
        const oldPassword = user.password;
        await db.run('UPDATE users SET password = ?, pass_hint = ? WHERE special_id = ?', [newPassword, passwordHint || null, userId]);
        
        await logPasswordChange(user.id, oldPassword, newPassword, passwordHint, changedBy || req.headers['x-username']);
        await logActivity(changedBy || req.headers['x-username'], `Changed password for user ${userId}`);
        
        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Block user with role validation
exports.blockUser = async (req, res) => {
    const { userId } = req.params;
    const { blockedBy } = req.body;
    const userRole = req.headers['x-user-role'];
    
    try {
        const db = await getDatabase();
        
        const user = await db.get('SELECT * FROM users WHERE special_id = ?', userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        // Role-based blocking permissions
        if (userRole === 'master') {
            // Master can block anyone except other masters
            if (user.role === 'master') {
                return res.status(403).json({ 
                    success: false, 
                    error: 'Master accounts cannot block other master accounts' 
                });
            }
        } else if (userRole === 'admin') {
            // Admin can block users and user-admins, not other admins or masters
            if (user.role === 'admin') {
                return res.status(403).json({ 
                    success: false, 
                    error: 'Admins cannot block other admin accounts' 
                });
            }
            if (user.role === 'master') {
                return res.status(403).json({ 
                    success: false, 
                    error: 'Admins cannot block master accounts' 
                });
            }
        } else if (userRole === 'user-admin') {
            // User-admin can only block regular users
            if (user.role !== 'user') {
                return res.status(403).json({ 
                    success: false, 
                    error: 'User admins can only block regular user accounts' 
                });
            }
        } else {
            return res.status(403).json({ 
                success: false, 
                error: 'Insufficient permissions to block users' 
            });
        }
        
        await db.run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'`);
        await db.run('UPDATE users SET status = ? WHERE special_id = ?', ['blocked', userId]);
        
        await logActivity(blockedBy || req.headers['x-username'], `Blocked user ${userId} (${user.username})`);
        
        res.json({ success: true, message: 'User blocked successfully' });
    } catch (error) {
        console.error('Error blocking user:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Unblock user account
exports.unblockUser = async (req, res) => {
    const { userId } = req.params;
    const { unblockedBy } = req.body;
    
    try {
        const db = await getDatabase();
        
        const user = await db.get('SELECT * FROM users WHERE special_id = ?', userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        await db.run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'`);
        await db.run('UPDATE users SET status = ? WHERE special_id = ?', ['active', userId]);
        
        await logActivity(unblockedBy || req.headers['x-username'], `Unblocked user ${userId} (${user.username})`);
        
        res.json({ success: true, message: 'User unblocked successfully' });
    } catch (error) {
        console.error('Error unblocking user:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Suspend user account
exports.suspendUser = async (req, res) => {
    const { userId } = req.params;
    const { suspendedBy, days } = req.body;
    
    try {
        const db = await getDatabase();
        
        const user = await db.get('SELECT * FROM users WHERE special_id = ?', userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        if (user.role === 'admin') {
            return res.status(400).json({ success: false, error: 'Cannot suspend admin user' });
        }
        
        const suspendDays = days || 7;
        const suspendedUntil = new Date();
        suspendedUntil.setDate(suspendedUntil.getDate() + suspendDays);
        
        await db.run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'`);
        await db.run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_until DATETIME`);
        
        await db.run('UPDATE users SET status = ?, suspended_until = ? WHERE special_id = ?', 
            ['suspended', suspendedUntil.toISOString(), userId]);
        
        await logActivity(suspendedBy || req.headers['x-username'], `Suspended user ${userId} (${user.username}) for ${suspendDays} days`);
        
        res.json({ success: true, message: `User suspended for ${suspendDays} days` });
    } catch (error) {
        console.error('Error suspending user:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Delete user with role validation
exports.deleteUser = async (req, res) => {
    const { userId } = req.params;
    const { deletedBy } = req.body;
    const userRole = req.headers['x-user-role'];
    
    try {
        const db = await getDatabase();
        
        const user = await db.get('SELECT * FROM users WHERE special_id = ?', userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        // Role-based deletion permissions
        if (userRole === 'master') {
            if (user.role === 'master') {
                return res.status(403).json({ 
                    success: false, 
                    error: 'Master accounts cannot delete other master accounts' 
                });
            }
        } else if (userRole === 'admin') {
            if (user.role === 'admin') {
                return res.status(403).json({ 
                    success: false, 
                    error: 'Admins cannot delete other admin accounts' 
                });
            }
            if (user.role === 'master') {
                return res.status(403).json({ 
                    success: false, 
                    error: 'Admins cannot delete master accounts' 
                });
            }
        } else if (userRole === 'user-admin') {
            if (user.role !== 'user') {
                return res.status(403).json({ 
                    success: false, 
                    error: 'User admins can only delete regular user accounts' 
                });
            }
        } else {
            return res.status(403).json({ 
                success: false, 
                error: 'Insufficient permissions to delete users' 
            });
        }
        
        await logDeletedAccount({
            user: userId,
            first_name: user.username,
            middle_name: '',
            last_name: '',
            account_type: user.role,
            sex: 'N/A',
            age: 0,
            gcr_number: 'N/A',
            phone_number: 'N/A',
            address: 'N/A',
            description: 'User account deleted',
            service_details: user.services || '[]',
            created_by: user.created_by || 'system',
            created_at: user.created_at
        }, deletedBy || req.headers['x-username']);
        
        await db.run('DELETE FROM user_services WHERE user_id = (SELECT id FROM users WHERE special_id = ?)', userId);
        await db.run('DELETE FROM users WHERE special_id = ?', userId);
        
        await logActivity(deletedBy || req.headers['x-username'], `Deleted user ${userId} (${user.username})`);
        
        clearUserSpecialIdCache(user.username);
        
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get user status
exports.getUserStatus = async (req, res) => {
    const { userId } = req.params;
    
    try {
        const db = await getDatabase();
        
        const user = await db.get(`
            SELECT special_id, username, role, status, suspended_until, created_at 
            FROM users 
            WHERE special_id = ?
        `, userId);
        
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        res.json({ success: true, data: user });
    } catch (error) {
        console.error('Error getting user status:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get current user profile with login info
exports.getCurrentUser = async (req, res) => {
    try {
        const db = await getDatabase();
        const username = req.headers['x-username'];
        
        const user = await db.get(`
            SELECT id, username, role, special_id, first_name, middle_name, last_name, 
                   phone_number, sex, date_of_birth, status, created_at, updated_at
            FROM users 
            WHERE username = ?
        `, username);
        
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        const lastLogin = await getUserLastLogin(username);
        
        res.json({ 
            success: true, 
            data: {
                ...user,
                last_login: lastLogin?.timestamp || null,
                last_login_device: lastLogin?.user_agent || null,
                last_login_ip: lastLogin?.ip_address || null,
                last_login_location: lastLogin?.location || null
            }
        });
    } catch (error) {
        console.error('Error getting current user:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Add update profile details endpoint
exports.updateProfileDetails = async (req, res) => {
    const { firstName, middleName, lastName, sex, phoneNumber, dateOfBirth, password } = req.body;
    
    try {
        const db = await getDatabase();
        const currentUsername = req.headers['x-username'];
        
        // Verify password
        const user = await db.get('SELECT * FROM users WHERE username = ?', currentUsername);
        if (!user || user.password !== password) {
            return res.status(401).json({ success: false, error: 'Invalid password' });
        }
        
        const updates = [];
        const values = [];
        
        if (firstName !== undefined) {
            updates.push('first_name = ?');
            values.push(firstName);
        }
        if (middleName !== undefined) {
            updates.push('middle_name = ?');
            values.push(middleName);
        }
        if (lastName !== undefined) {
            updates.push('last_name = ?');
            values.push(lastName);
        }
        if (sex !== undefined) {
            updates.push('sex = ?');
            values.push(sex);
        }
        if (phoneNumber !== undefined) {
            updates.push('phone_number = ?');
            values.push(phoneNumber);
        }
        if (dateOfBirth !== undefined) {
            updates.push('date_of_birth = ?');
            values.push(dateOfBirth);
        }
        
        updates.push('updated_at = datetime("now")');
        values.push(currentUsername);
        
        await db.run(`
            UPDATE users SET ${updates.join(', ')} WHERE username = ?
        `, values);
        
        await logActivity(currentUsername, 'Updated profile details');
        
        res.json({ success: true, message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Error updating profile details:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Update user profile details (first name, last name, sex, phone, etc.)
exports.updateUserProfile = async (req, res) => {
    const { userId } = req.params;
    const { firstName, middleName, lastName, sex, phoneNumber, dateOfBirth, updatedBy } = req.body;
    
    try {
        const db = await getDatabase();
        
        const user = await db.get('SELECT * FROM users WHERE special_id = ?', userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        const updates = [];
        const values = [];
        
        if (firstName !== undefined) {
            updates.push('first_name = ?');
            values.push(firstName);
        }
        if (middleName !== undefined) {
            updates.push('middle_name = ?');
            values.push(middleName);
        }
        if (lastName !== undefined) {
            updates.push('last_name = ?');
            values.push(lastName);
        }
        if (sex !== undefined) {
            updates.push('sex = ?');
            values.push(sex);
        }
        if (phoneNumber !== undefined) {
            updates.push('phone_number = ?');
            values.push(phoneNumber);
        }
        if (dateOfBirth !== undefined) {
            updates.push('date_of_birth = ?');
            values.push(dateOfBirth);
        }
        
        updates.push('updated_at = datetime("now")');
        
        if (updates.length === 1) { // Only updated_at
            return res.status(400).json({ success: false, error: 'No fields to update' });
        }
        
        values.push(userId);
        
        await db.run(`
            UPDATE users 
            SET ${updates.join(', ')}
            WHERE special_id = ?
        `, values);
        
        await logActivity(updatedBy || req.headers['x-username'], `Updated profile for user ${userId}`);
        
        res.json({ success: true, message: 'User profile updated successfully' });
    } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
// Update profile username with logging
exports.updateProfileUsername = async (req, res) => {
    const { newUsername, password } = req.body;
    
    try {
        const db = await getDatabase();
        const currentUsername = req.headers['x-username'];
        
        if (!newUsername || newUsername.trim() === '') {
            return res.status(400).json({ success: false, error: 'New username is required' });
        }
        
        if (newUsername.length < 3) {
            return res.status(400).json({ success: false, error: 'Username must be at least 3 characters' });
        }
        
        const user = await db.get('SELECT * FROM users WHERE username = ?', currentUsername);
        if (!user || user.password !== password) {
            await logPasswordAttempt(currentUsername, 'profile_username_change');
            return res.status(401).json({ success: false, error: 'Invalid password' });
        }
        
        const isBlocked = await checkPasswordAttempts(currentUsername, 'profile_username_change');
        if (isBlocked) {
            return res.status(429).json({ success: false, error: 'Too many attempts. Please try again later.' });
        }
        
        const existingUser = await db.get('SELECT id FROM users WHERE username = ? AND username != ?', [newUsername, currentUsername]);
        if (existingUser) {
            return res.status(400).json({ success: false, error: 'Username already exists' });
        }
        
        const oldUsername = currentUsername;
        await db.run('UPDATE users SET username = ? WHERE username = ?', [newUsername, currentUsername]);
        
        await logUsernameChange(user.id, oldUsername, newUsername, currentUsername);
        await logActivity(currentUsername, `Changed profile username from ${oldUsername} to ${newUsername}`);
        
        // Clear cache for both old and new username
        clearUserSpecialIdCache(oldUsername);
        
        res.json({ success: true, message: 'Username updated successfully' });
    } catch (error) {
        console.error('Error updating profile username:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Update profile password with logging
exports.updateProfilePassword = async (req, res) => {
    const { currentPassword, newPassword, passwordHint } = req.body;
    
    try {
        const db = await getDatabase();
        const currentUsername = req.headers['x-username'];
        
        if (!currentPassword) {
            return res.status(400).json({ success: false, error: 'Current password is required' });
        }
        
        if (!newPassword || newPassword.trim() === '') {
            return res.status(400).json({ success: false, error: 'New password is required' });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
        }
        
        const user = await db.get('SELECT * FROM users WHERE username = ?', currentUsername);
        if (!user || user.password !== currentPassword) {
            await logPasswordAttempt(currentUsername, 'profile_password_change');
            return res.status(401).json({ success: false, error: 'Current password is incorrect' });
        }
        
        const isBlocked = await checkPasswordAttempts(currentUsername, 'profile_password_change');
        if (isBlocked) {
            return res.status(429).json({ success: false, error: 'Too many attempts. Please try again later.' });
        }
        
        const oldPassword = user.password;
        await db.run('UPDATE users SET password = ?, pass_hint = ? WHERE username = ?', [newPassword, passwordHint || null, currentUsername]);
        
        await logPasswordChange(user.id, oldPassword, newPassword, passwordHint, currentUsername);
        await logActivity(currentUsername, `Changed profile password`);
        
        res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        console.error('Error updating profile password:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Login user with device info
exports.loginUser = async (req, res) => {
    const { username, password } = req.body;
    
    try {
        const db = await getDatabase();
        
        const user = await db.get('SELECT * FROM users WHERE username = ?', username);
        if (user) {
            if (user.status === 'blocked') {
                return res.status(403).json({ success: false, error: 'Account is blocked. Contact admin.' });
            }
            if (user.status === 'suspended') {
                const suspendedUntil = new Date(user.suspended_until);
                if (suspendedUntil > new Date()) {
                    return res.status(403).json({ success: false, error: `Account suspended until ${suspendedUntil.toLocaleDateString()}` });
                } else {
                    await db.run('UPDATE users SET status = ? WHERE username = ?', ['active', username]);
                }
            }
        }
        
        const isBlocked = await checkPasswordAttempts(username, 'login');
        if (isBlocked) {
            return res.status(429).json({ success: false, error: 'Too many failed login attempts. Please try again later.' });
        }
        
        const validUser = await db.get('SELECT id, username, special_id, role, status FROM users WHERE username = ? AND password = ?', [username, password]);
        
        if (!validUser) {
            await logPasswordAttempt(username, 'login');
            return res.status(401).json({ success: false, error: 'Invalid username or password' });
        }
        
        await logActivity(username, 'User logged in');
        const loginInfo = await logUserLoginDetails(username, req);
        
        res.json({ 
            success: true, 
            data: validUser, 
            loginInfo 
        });
    } catch (error) {
        console.error('Error logging in user:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Register user
exports.registerUser = async (req, res) => {
    const { username, password, role } = req.body;
    
    try {
        const db = await getDatabase();
        
        if (!username || !password || !role) {
            return res.status(400).json({ success: false, error: 'All fields are required' });
        }
        
        const validRoles = ['admin', 'user', 'user-admin', 'master'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ success: false, error: 'Invalid role. Must be admin, user, user-admin, or master' });
        }
        
        const specialId = await generateUserSpecialId(role);
        const result = await db.run('INSERT INTO users (username, password, role, special_id, services) VALUES (?, ?, ?, ?, ?)', 
            [username, password, role, specialId, '[]']);
        
        await logActivity(username, `Registered new user with role: ${role} and ID: ${specialId}`);
        
        res.status(201).json({ 
            success: true, 
            message: 'User registered successfully', 
            userId: result.lastID, 
            specialId: specialId 
        });
    } catch (error) {
        if (error.message.includes('UNIQUE')) {
            if (error.message.includes('special_id')) {
                res.status(400).json({ success: false, error: 'Failed to generate unique user ID. Please try again.' });
            } else {
                res.status(400).json({ success: false, error: 'Username already exists' });
            }
        } else {
            console.error('Error registering user:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
};

// Get user login history
exports.getUserLoginHistory = async (req, res) => {
    try {
        const username = req.params.username || req.headers['x-username'];
        const userRole = req.headers['x-user-role'];
        const requestingUser = req.headers['x-username'];
        
        if (userRole !== 'admin' && username !== requestingUser) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }
        
        const history = await getUserLoginHistory(username);
        res.json({ success: true, data: history });
    } catch (error) {
        console.error('Error getting user login history:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get username change history
exports.getUsernameChangeHistory = async (req, res) => {
    try {
        const db = await getDatabase();
        const userId = req.params.userId;
        const userRole = req.headers['x-user-role'];
        
        if (userRole !== 'admin') {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }
        
        const history = await db.all(`
            SELECT * FROM userNamesChanges 
            WHERE user = ?
            ORDER BY timestamp DESC
        `, userId);
        
        res.json({ success: true, data: history });
    } catch (error) {
        console.error('Error getting username change history:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get password change history
exports.getPasswordChangeHistory = async (req, res) => {
    try {
        const db = await getDatabase();
        const userId = req.params.userId;
        const userRole = req.headers['x-user-role'];
        
        if (userRole !== 'admin') {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }
        
        const history = await db.all(`
            SELECT user, timestamp 
            FROM passwordChanges 
            WHERE user = ?
            ORDER BY timestamp DESC
        `, userId);
        
        res.json({ success: true, data: history });
    } catch (error) {
        console.error('Error getting password change history:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};  

// Add this to your invoiceController.js - Unsuspend user
exports.unsuspendUser = async (req, res) => {
    const { userId } = req.params;
    const { unsuspendedBy } = req.body;
    
    try {
        const db = await getDatabase();
        
        const user = await db.get('SELECT * FROM users WHERE special_id = ?', userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        await db.run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'`);
        await db.run('UPDATE users SET status = ?, suspended_until = NULL WHERE special_id = ?', 
            ['active', userId]);
        
        await logActivity(unsuspendedBy || req.headers['x-username'], `Unsuspended user ${userId} (${user.username})`);
        
        res.json({ success: true, message: 'User unsuspended successfully' });
    } catch (error) {
        console.error('Error unsuspending user:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}; 

// Make sure updateUserProfile exists
exports.updateUserProfile = async (req, res) => {
    const { userId , username } = req.params;
    const { firstName, middleName, lastName, sex, phoneNumber, dateOfBirth, updatedBy , password } = req.body;  

    console.log('UserName:' , username)
     
    try {
        const db = await getDatabase();
        
        const user = await db.get('SELECT * FROM users WHERE special_id = ?', userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }     

        
        
        const updates = [];
        const values = [];
        
        if (firstName !== undefined) {
            updates.push('first_name = ?');
            values.push(firstName);
        }
        if (middleName !== undefined) {
            updates.push('middle_name = ?');
            values.push(middleName);
        }
        if (lastName !== undefined) {
            updates.push('last_name = ?');
            values.push(lastName);
        }
        if (sex !== undefined) {
            updates.push('sex = ?');
            values.push(sex);
        }
        if (phoneNumber !== undefined) {
            updates.push('phone_number = ?');
            values.push(phoneNumber);
        }
        if (dateOfBirth !== undefined) {
            updates.push('date_of_birth = ?');
            values.push(dateOfBirth);
        }
        
        if (updates.length === 0) {
            return res.status(400).json({ success: false, error: 'No fields to update' });
        }
        
        updates.push('updated_at = datetime("now")');
        values.push(userId);
        
        await db.run(`
            UPDATE users 
            SET ${updates.join(', ')}
            WHERE special_id = ?
        `, values);
        
        await logActivity(updatedBy || req.headers['x-username'], `Updated profile for user ${userId}`);
        
        res.json({ success: true, message: 'User profile updated successfully' });
    } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};  


// ============= PASSWORD VERIFICATION ROUTE =============
// Verify password for current user
exports.verifyPassword = async (req, res) => {
    const { username, password } = req.body;
    
    try {
        if (!username || !password) {
            return res.status(400).json({ 
                success: false, 
                valid: false,
                error: 'Username and password are required' 
            });
        }
        
        const db = await getDatabase();
        
        // Get user from database
        const user = await db.get(
            'SELECT id, username, password, status FROM users WHERE username = ?',
            username
        );
        
        // Check if user exists
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                valid: false,
                error: 'Invalid username or password' 
            });
        }
        
        // Check account status
        if (user.status === 'blocked') {
            return res.status(403).json({ 
                success: false, 
                valid: false,
                error: 'Account is blocked. Contact admin.' 
            });
        }
        
        if (user.status === 'suspended') {
            const suspendedUser = await db.get(
                'SELECT suspended_until FROM users WHERE username = ?',
                username
            );
            
            if (suspendedUser && suspendedUser.suspended_until) {
                const suspendedUntil = new Date(suspendedUser.suspended_until);
                if (suspendedUntil > new Date()) {
                    return res.status(403).json({ 
                        success: false, 
                        valid: false,
                        error: `Account suspended until ${suspendedUntil.toLocaleDateString()}` 
                    });
                }
            }
        }
        
        // Check password
        const isPasswordValid = (user.password === password);
        
        if (!isPasswordValid) {
            await logPasswordAttempt(username, 'verify_password');
            return res.status(401).json({ 
                success: false, 
                valid: false,
                error: 'Invalid username or password' 
            });
        }
        
        // Password is correct
        res.json({ 
            success: true, 
            valid: true,
            message: 'Password verified successfully' 
        });
        
    } catch (error) {
        console.error('Error verifying password:', error);
        res.status(500).json({ 
            success: false, 
            valid: false,
            error: error.message 
        });
    }
};

// Update user profile details (first name, last name, phone number, etc.) with password verification
exports.updateUserProfileDetails = async (req, res) => {
    const { firstName, middleName, lastName, phoneNumber, password } = req.body;
    const currentUsername = req.headers['x-username']; 
    console.log('update profile hit !!!') ; 
    
    try {
        const db = await getDatabase(); 


        
        // First verify password
        if (!password) {
            return res.status(401).json({ 
                success: false, 
                error: 'Password is required to update profile' 
            });
        }
        
        const user = await db.get('SELECT * FROM users WHERE username = ?', currentUsername);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        // Verify password
        if (user.password !== password) {
            await logPasswordAttempt(currentUsername, 'profile_update');
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid password' 
            });
        }
        
        // Build update query
        const updates = [];
        const values = [];
        
        if (firstName !== undefined && firstName !== null) {
            updates.push('first_name = ?');
            values.push(firstName);
        }
        if (middleName !== undefined) {
            updates.push('middle_name = ?');
            values.push(middleName || null);
        }
        if (lastName !== undefined && lastName !== null) {
            updates.push('last_name = ?');
            values.push(lastName);
        }
        if (phoneNumber !== undefined && phoneNumber !== null) {
            updates.push('phone_number = ?');
            values.push(phoneNumber);
        }
        
        if (updates.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'No fields to update' 
            });
        }
        
        updates.push('updated_at = datetime("now")');
        values.push(currentUsername);
        
        await db.run(`
            UPDATE users 
            SET ${updates.join(', ')} 
            WHERE username = ?
        `, values);
        
        await logActivity(currentUsername, `Updated profile details (${updates.map(u => u.split('=')[0]).join(', ')})`);
        
        res.json({ 
            success: true, 
            message: 'Profile updated successfully' 
        });
        
    } catch (error) {
        console.error('Error updating profile details:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};  

exports.getUserAssignments = async(req, res) => {    
    const { assignments } = req.params;  // Change from 'assignment' to 'assignments'
    
    console.log("assignment:", assignments);
    
    try {
        // Your logic here
        
        res.status(200).json({
            success: true,
            data: assignments
        });
        
    } catch (error) {
        console.error('Error getting user assignments:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
} 

// Export cache clearing function
exports.clearUserCache = clearUserSpecialIdCache;   
// Export the function for use in other modules
exports.checkPassword = checkPassWord;

