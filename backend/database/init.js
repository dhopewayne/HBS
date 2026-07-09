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

// Helper function to generate unique number
async function generateUniqueNumber(table, column, prefix, length = 8) {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 10;
        
        function tryGenerate() {
            const min = Math.pow(10, length - 1);
            const max = Math.pow(10, length) - 1;
            const randomNum = Math.floor(Math.random() * (max - min + 1) + min);
            const formattedNum = randomNum.toString().padStart(length, '0');
            
            db.get(`SELECT 1 FROM ${table} WHERE ${column} = ?`, [`${prefix}-${formattedNum}-WGMH`], (err, row) => {
                if (err) {
                    reject(err);
                } else if (!row) {
                    resolve(`${prefix}-${formattedNum}-WGMH`);
                } else if (attempts < maxAttempts) {
                    attempts++;
                    tryGenerate();
                } else {
                    // Fallback to timestamp
                    const timestamp = Date.now().toString().slice(-length);
                    resolve(`${prefix}-${timestamp}-WGMH`);
                }
            });
        }
        
        tryGenerate();
    });
}

// Helper function to generate user special ID based on role
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
        case 'user':
            prefix = 'UUBMA';
            break;
        default:
            prefix = 'CHBMA';
    }
    
    const uniqueNumber = await generateUniqueNumber('users', 'special_id', prefix, 8);
    return `${uniqueNumber}`;
}

// Initialize database tables
db.serialize(() => {
    // Users table with userServices as JSON field
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            first_name TEXT , 
            middle_name TEXT , 
            last_name TEXT , 
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            pass_hint TEXT ,
            role TEXT NOT NULL,
            special_id TEXT UNIQUE, 
            sex TEXT , 
            phone_number TEXT,  
            date_of_birth TEXT, 
            status TEXT DEFAULT 'active' ,
            services TEXT DEFAULT '[]', 
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP , 
            updated_at DATETIME ,  
            suspended_until DATETIME 
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

    // User Services junction table
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
            identification_number TEXT UNIQUE,
            patient_name TEXT NOT NULL,
            gcr_number TEXT UNIQUE NOT NULL,
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
    db.run(`
        CREATE TABLE IF NOT EXISTS userNamesChanges (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user TEXT NOT NULL, 
            new_username TEXT NOT NULL,
            old_username TEXT NOT NULL,  
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `); 
    db.run(`
        CREATE TABLE IF NOT EXISTS accountNameChanges (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user TEXT NOT NULL, 
            new_account_first_name TEXT NOT NULL,
            old_account_first_name TEXT NOT NULL,  
            new_account_Middle_name TEXT NOT NULL,
            old_account_Middle_name TEXT NOT NULL,  
            new_account_last_name TEXT NOT NULL,
            old_account_last_name TEXT NOT NULL,  
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `); 
    db.run(`
        CREATE TABLE IF NOT EXISTS deletedAccounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user TEXT NOT NULL, 
            account_first_name TEXT NOT NULL,
            account_Middle_name TEXT NOT NULL,  
            account_last_name TEXT NOT NULL, 
            account_type TEXT NOT NULL,
            account_sex TEXT NOT NULL, 
            account_age INTEGER NOT NULL,
            account_gcr_number TEXT NOT NULL,
            account_phone_number TEXT NOT NULL,
            account_address TEXT NOT NULL,
            account_description TEXT,   
            account_service_details TEXT,
            account_deleted_by TEXT,
            account_created_by TEXT,
            account_created_at DATETIME,
            account_deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
          

    db.run(`
        CREATE TABLE IF NOT EXISTS passwordChanges (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user TEXT NOT NULL,
            new_password TEXT NOT NULL,
            password_hint TEXT,
            old_password TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `); 

    //  user_agent, ip_address, location, timestamp
    db.run(`
        CREATE TABLE IF NOT EXISTS user_logins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            user_agent TEXT NOT NULL,
            ip_address TEXT NOT NULL,
            location TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    // Password attempts table
    db.run(`
        CREATE TABLE IF NOT EXISTS password_attempts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user TEXT NOT NULL,  
            attempt_count INTEGER DEFAULT 1,
            attempt_time DATETIME DEFAULT CURRENT_TIMESTAMP,
            action TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create triggers
    db.run(`DROP TRIGGER IF EXISTS update_user_services_after_insert`);
    db.run(`DROP TRIGGER IF EXISTS update_user_services_after_delete`);

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

    // Insert default accounts first
    db.run(`INSERT OR IGNORE INTO accounts (account_name, account_type, description) VALUES (?, ?, ?)`,
        ['Drugs Account', 'drugs', 'Pharmaceutical and medication services']);
    db.run(`INSERT OR IGNORE INTO accounts (account_name, account_type, description) VALUES (?, ?, ?)`,
        ['Non-Drugs Account', 'nondrugs', 'Non-medication medical services']);

    // Insert default services
    const services = [
        'Eye', 'Dental', 'Dressing', 'Physio', 'Blood Bank', 'Peadics', 
        'OBS', 'GYE', 'A & E', 'ENT', 'L/W', 'Scan', 'Theature', 'X-Ray'
    ];
    
    let servicesInserted = 0;
    const totalServices = services.length;
    
    services.forEach((service, index) => {
        db.run(`INSERT OR IGNORE INTO services (service_name, category) VALUES (?, ?)`,
            [service, 'Medical Service'], (err) => {
            if (err) {
                console.error(`Error inserting service ${service}:`, err);
            }
            servicesInserted++;
            
            // After all services are inserted, insert users and assign services
            if (servicesInserted === totalServices) {
                console.log('All services inserted');
                
                // Insert default users with special IDs
                (async () => {
                    try {
                        // Generate special IDs
                        const masterSpecialId = await generateUserSpecialId('master');
                        const userSpecialId = await generateUserSpecialId('user');
                        
                        // Insert admin user
                        db.run(`INSERT OR IGNORE INTO users (first_name , middle_name , last_name , username, password, role, sex, special_id, services) VALUES (?,?,?,?, ?, ?, ?, ?, ?)`, 
                            ['NII' , 'Monique','owusu','nii', 'admin123', 'master', 'Male', masterSpecialId, '[]'], (err) => {
                            if (err) {
                                console.error('Error inserting admin user:', err);
                            } else {
                                console.log('Admin user inserted with ID:', masterSpecialId);
                            }
                        });
                        
                        // Insert regular user
                        db.run(`INSERT OR IGNORE INTO users ( first_name , middle_name , last_name , username, password, role, sex , special_id, services) VALUES (?, ?,?,?,?, ?, ?, ? ,?)`, 
                            ['Mannuel' , 'entwi','prempreh','mannuel', 'user123', 'user', 'Male', userSpecialId, '[]'], (err) => {
                            if (err) {
                                console.error('Error inserting user:', err);
                            } else {
                                console.log('Regular user inserted with ID:', userSpecialId);
                                
                                // Get user ID for 'user' and assign services
                                db.get("SELECT id FROM users WHERE username = 'user'", (err, userRow) => {
                                    if (err) {
                                        console.error('Error getting user:', err);
                                        return;
                                    }
                                    
                                    if (userRow) {
                                        console.log('Found user ID:', userRow.id);
                                        
                                        // Services to assign to regular user
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
                                                        [userRow.id, serviceRow.id, 'master'], (err) => {
                                                        if (err) {
                                                            console.error(`Error assigning service ${serviceName}:`, err);
                                                        } else {
                                                            console.log(`Assigned service: ${serviceName} to user`);
                                                        }
                                                        processed++;
                                                        
                                                        // Check if all assignments are done
                                                        if (processed === serviceNames.length) {
                                                            // Update the services JSON field
                                                            const servicesJson = JSON.stringify(assignedServices);
                                                            db.run(`UPDATE users SET services = ? WHERE id = ?`, 
                                                                [servicesJson, userRow.id], (err) => {
                                                                if (err) {
                                                                    console.error('Error updating services JSON:', err);
                                                                } else {
                                                                    console.log('Updated services JSON field');
                                                                }
                                                            });
                                                            
                                                            // Show summary
                                                            showDatabaseSummary();
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
                                        showDatabaseSummary();
                                    }
                                });
                            }
                        });
                    } catch (error) {
                        console.error('Error generating special IDs:', error);
                        showDatabaseSummary();
                    }
                })();
            }
        });
    });
});

function showDatabaseSummary() {
    setTimeout(() => {
        db.get("SELECT COUNT(*) as count FROM users", (err, userCount) => {
            db.get("SELECT COUNT(*) as count FROM services", (err, serviceCount) => {
                db.get("SELECT COUNT(*) as count FROM user_services", (err, userServiceCount) => {
                    // Get users with their special IDs
                    db.all("SELECT id, username, role, special_id FROM users", (err, users) => {
                        console.log('\n=== Database Summary ===');
                        console.log(`Users: ${userCount?.count || 0}`);
                        console.log(`Services: ${serviceCount?.count || 0}`);
                        console.log(`User-Service Assignments: ${userServiceCount?.count || 0}`);
                        console.log('\nUsers:');
                        if (users) {
                            users.forEach(user => {
                                console.log(`  - ${user.username} (${user.role}): ${user.special_id || 'No ID'}`);
                            });
                        }
                        console.log('========================\n');
                        db.close();
                    });
                });
            });
        });
    }, 500);
}   


 

   // Check if column exists before adding
function addColumnIfNotExists(tableName, columnName, columnType) {
    db.get(`PRAGMA table_info(${tableName})`, (err, rows) => {
        if (err) {
            console.error('Error checking table schema:', err);
            return;
        }
        
        // For better compatibility, we need to get all rows
        db.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
            if (err) {
                console.error('Error getting columns:', err);
                return;
            }
            
            const columnExists = columns.some(col => col.name === columnName);
            
            if (!columnExists) {
                db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`, (err) => {
                    if (err) {
                        console.error(`Error adding ${columnName}:`, err);
                    } else {
                        console.log(`Added ${columnName} column to ${tableName}`);
                    }
                });
            } else {
                console.log(`Column ${columnName} already exists`);
            }
        });
    });
}

// Usage
addColumnIfNotExists('users', 'sex', "TEXT DEFAULT 'other'");
addColumnIfNotExists('users', 'date_of_birth', 'TEXT');
addColumnIfNotExists('users', 'phone_number', 'TEXT'); 
addColumnIfNotExists('users','updated_at' , 'DATETIME'); 
    
// addColumnIfNotExists('users','suspended_until' , 'DATETIME'); 
    
