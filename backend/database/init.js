const sqlite3 = require('sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../database.sqlite');

// Delete existing database if it exists
if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('Existing database deleted');
}

const db = new sqlite3.Database(dbPath);

// Initialize database tables
db.serialize(() => {
    // Users table with userServices as JSON field
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL,
            services TEXT DEFAULT '[]',  -- JSON array of service IDs or names
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Accounts table
    db.run(`
        CREATE TABLE IF NOT EXISTS accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            account_name TEXT UNIQUE NOT NULL,
            account_type TEXT NOT NULL,
            description TEXT,
            created_by TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Services table
    db.run(`
        CREATE TABLE IF NOT EXISTS services (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            service_name TEXT UNIQUE NOT NULL,
            category TEXT,
            description TEXT, 
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // User Services junction table (for relational integrity)
    db.run(`
        CREATE TABLE IF NOT EXISTS user_services (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            service_id INTEGER,
            assigned_by TEXT,
            assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
            UNIQUE(user_id, service_id)
        )
    `);

    // Invoices table
    db.run(`
        CREATE TABLE IF NOT EXISTS invoices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_name TEXT NOT NULL,
            gcr_number TEXT NOT NULL,
            account_id INTEGER,
            account_type TEXT,
            price REAL NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_by TEXT,
            FOREIGN KEY (account_id) REFERENCES accounts(id)
        )
    `);

    // Invoice services table
    db.run(`
        CREATE TABLE IF NOT EXISTS invoice_services (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_id INTEGER,
            service_id INTEGER,
            service_name TEXT,
            price REAL,
            FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
            FOREIGN KEY (service_id) REFERENCES services(id)
        )
    `);

    // Activity log table
    db.run(`
        CREATE TABLE IF NOT EXISTS activity_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user TEXT NOT NULL,
            action TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);


    // Create trigger to automatically update services JSON when user_services changes
    // Drop existing triggers
    db.run(`DROP TRIGGER IF EXISTS update_user_services_after_insert`);
    db.run(`DROP TRIGGER IF EXISTS update_user_services_after_delete`);

    // Create triggers with correct column name
    db.run(`
        CREATE TRIGGER IF NOT EXISTS update_user_services_after_insert
        AFTER INSERT ON user_services
        BEGIN
            UPDATE users 
            SET services = (
                SELECT json_group_array(service_id) 
                FROM user_services 
                WHERE user_id = NEW.user_id
            )
            WHERE id = NEW.user_id;
        END
    `);

    db.run(`
        CREATE TRIGGER IF NOT EXISTS update_user_services_after_delete
        AFTER DELETE ON user_services
        BEGIN
            UPDATE users 
            SET services = (
                SELECT json_group_array(service_id) 
                FROM user_services 
                WHERE user_id = OLD.user_id
            )
            WHERE id = OLD.user_id;
        END
    `);


    // Insert default users
    db.run(`INSERT OR IGNORE INTO users (username, password, role, services) VALUES (?, ?, ?, ?)`, 
        ['admin', 'admin123', 'admin', '[]']);
    db.run(`INSERT OR IGNORE INTO users (username, password, role, services) VALUES (?, ?, ?, ?)`, 
        ['user', 'user123', 'user', '[]']);

    // Insert default accounts
    db.run(`INSERT OR IGNORE INTO accounts (account_name, account_type, description) VALUES (?, ?, ?)`,
        ['Drugs Account', 'drugs', 'Pharmaceutical and medication services']);
    db.run(`INSERT OR IGNORE INTO accounts (account_name, account_type, description) VALUES (?, ?, ?)`,
        ['Non-Drugs Account', 'nondrugs', 'Non-medication medical services']);

    // Insert default services with prices in dollars
    const services = [
        'Eye', 'Dental', 'Dressing', 'Physio', 'Blood Bank', 'Peadics', 
        'OBS', 'GYE', 'A & E', 'ENT', 'L/W', 'Scan', 'Theature', 'X-Ray'
    ];
    
    // Track completion of service insertions
    let servicesInserted = 0;
    const totalServices = services.length;
    
    services.forEach((service, index) => {
        db.run(`INSERT OR IGNORE INTO services (service_name, category) VALUES (?,  ?)`,
            [service, 'Medical Service'], (err) => {
            if (err) {
                console.error(`Error inserting service ${service}:`, err);
            }
            servicesInserted++;
            
            // After all services are inserted, assign services to user
            if (servicesInserted === totalServices) {
                console.log('All services inserted');
                
                // Get user ID for 'user'
                db.get("SELECT id FROM users WHERE username = 'user'", (err, userRow) => {
                    if (err) {
                        console.error('Error getting user:', err);
                        return;
                    }
                    
                    if (userRow) {
                        console.log('Found user ID:', userRow.id);
                        
                        // Get services to assign
                        const serviceNames = ['Eye', 'Dental'];
                        let processed = 0;
                        const assignedServices = [];
                        
                        serviceNames.forEach(serviceName => {
                            db.get("SELECT id FROM services WHERE service_name = ?", [serviceName], (err, serviceRow) => {
                                if (err) {
                                    console.error(`Error getting service ${serviceName}:`, err);
                                    processed++;
                                    return;
                                }
                                
                                if (serviceRow) {
                                    assignedServices.push(serviceRow.id);
                                    db.run(`INSERT OR IGNORE INTO user_services (user_id, service_id, assigned_by) VALUES (?, ?, ?)`,
                                        [userRow.id, serviceRow.id, 'admin'], (err) => {
                                        if (err) {
                                            console.error(`Error assigning service ${serviceName}:`, err);
                                        } else {
                                            console.log(`Assigned service: ${serviceName} to user`);
                                        }
                                        processed++;
                                        
                                        // Check if all assignments are done
                                        if (processed === serviceNames.length) {
                                            // Update the userServices JSON field with the assigned services
                                            const servicesJson = JSON.stringify(assignedServices);
                                            db.run(`UPDATE users SET services = ? WHERE id = ?`, 
                                                [servicesJson, userRow.id], (err) => {
                                                if (err) {
                                                    console.error('Error updating userServices JSON:', err);
                                                } else {
                                                    console.log('Updated userServices JSON field');
                                                }
                                            });
                                            
                                            console.log('✅ Database initialized successfully with user-service assignments!');
                                            
                                            // Verify and show summary
                                            db.get("SELECT COUNT(*) as count FROM users", (err, userCount) => {
                                                db.get("SELECT COUNT(*) as count FROM services", (err, serviceCount) => {
                                                    db.get("SELECT COUNT(*) as count FROM user_services", (err, userServiceCount) => {
                                                        // Get user with their services JSON
                                                        db.get("SELECT id, username, role, services FROM users WHERE username = 'user'", (err, userWithServices) => {
                                                            console.log('\n=== Database Summary ===');
                                                            console.log(`Users: ${userCount?.count || 0}`);
                                                            console.log(`Services: ${serviceCount?.count || 0}`);
                                                            console.log(`User-Service Assignments: ${userServiceCount?.count || 0}`);
                                                            if (userWithServices) {
                                                                console.log(`User '${userWithServices.username}' services: ${userWithServices.services}`);
                                                            }
                                                            console.log('========================\n');
                                                            db.close();
                                                        });
                                                    });
                                                });
                                            });
                                        }
                                    });
                                } else {
                                    console.log(`Service ${serviceName} not found`);
                                    processed++;
                                }
                            });
                        });
                    } else {
                        console.log('User not found, skipping service assignment');
                        db.close();
                    }
                });
            }
        });
    });
});