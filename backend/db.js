import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

// First, create a connection without specifying a database to check/create it
const createDatabaseIfNotExists = async () => {
    try {
        // Connect without specifying database
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD
        });

        const dbName = process.env.DB_NAME || 'patent_portal';

        // Create database if it doesn't exist
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
        console.log(`✅ Database '${dbName}' is ready`);

        await connection.end();
    } catch (error) {
        console.error('❌ Error creating database:', error.message);
        throw error;
    }
};

// Create database first, then create pool
await createDatabaseIfNotExists();

export const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'patent_portal',
    waitForConnections: true,
    connectionLimit: 100,
    queueLimit: 0
});

const initDb = async () => {
    let connection;
    try {
        connection = await db.getConnection();
        console.log('✅ Connected to MySQL database');

        // Check if admins table exists
        const [tables] = await connection.query("SHOW TABLES LIKE 'admins'");
        const adminsTableExists = tables.length > 0;

        // Create admins table if it doesn't exist
        if (!adminsTableExists) {
            await connection.query(`
                CREATE TABLE admins (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    role ENUM('super_admin', 'sub_admin') NOT NULL,
                    department VARCHAR(255) DEFAULT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    created_by INT DEFAULT NULL,
                    FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL,
                    INDEX idx_email (email),
                    INDEX idx_role (role),
                    INDEX idx_department (department)
                )
            `);
            console.log('✅ Admins table created');
        }

        // Check if patents table exists
        const [patentTables] = await connection.query("SHOW TABLES LIKE 'patents'");
        const patentsTableExists = patentTables.length > 0;

        if (!patentsTableExists) {
            // Create patents table with strict field order
            await connection.query(`
                CREATE TABLE patents (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    facultyName TEXT,
                    email TEXT,
                    department VARCHAR(255),
                    designation TEXT,
                    caste VARCHAR(10),
                    patentId TEXT,
                    patentTitle TEXT,
                    authors TEXT,
                    coApplicants TEXT,
                    patentType ENUM('Utility', 'Design') DEFAULT 'Utility',
                    approvalType TEXT,
                    filingDate DATE,
                    publishingDate DATE,
                    grantingDate DATE,
                    documentLink TEXT,
                    grantDocumentLink TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_department (department)
                )
            `);
            console.log('✅ Patents table created with strict field order');
        } else {
            // If table exists, ensure all columns exist (Migrations)
            console.log('ℹ️ Patents table exists, checking for missing columns...');

            const migrations = [
                // Add columns if they don't exist, attempting to place them in logical order relative to others if possible
                // Note: accurate reordering of existing columns requires complex ALTER TABLE CHANGE/MODIFY calls which are risky on live data without backups.
                // We will ensure columns EXIST.
                "ALTER TABLE patents ADD COLUMN IF NOT EXISTS facultyName TEXT",
                "ALTER TABLE patents ADD COLUMN IF NOT EXISTS email TEXT",
                "ALTER TABLE patents ADD COLUMN IF NOT EXISTS department VARCHAR(255)",
                "ALTER TABLE patents ADD COLUMN IF NOT EXISTS designation TEXT",
                "ALTER TABLE patents ADD COLUMN IF NOT EXISTS caste VARCHAR(10)",
                "ALTER TABLE patents ADD COLUMN IF NOT EXISTS patentId TEXT",
                "ALTER TABLE patents ADD COLUMN IF NOT EXISTS patentTitle TEXT",
                "ALTER TABLE patents ADD COLUMN IF NOT EXISTS authors TEXT",
                "ALTER TABLE patents ADD COLUMN IF NOT EXISTS coApplicants TEXT",
                "ALTER TABLE patents ADD COLUMN IF NOT EXISTS patentType ENUM('Utility', 'Design') DEFAULT 'Utility'",
                "ALTER TABLE patents ADD COLUMN IF NOT EXISTS approvalType TEXT",
                "ALTER TABLE patents ADD COLUMN IF NOT EXISTS filingDate DATE",
                "ALTER TABLE patents ADD COLUMN IF NOT EXISTS publishingDate DATE",
                "ALTER TABLE patents ADD COLUMN IF NOT EXISTS grantingDate DATE",
                "ALTER TABLE patents ADD COLUMN IF NOT EXISTS documentLink TEXT",
                "ALTER TABLE patents ADD COLUMN IF NOT EXISTS grantDocumentLink TEXT"
            ];

            for (const sql of migrations) {
                try {
                    await connection.query(sql);
                } catch (e) {
                    console.warn(`Migration notice: ${e.message}`);
                }
            }
            console.log('✅ Patent table schema verified');
        }

        // Create audit_logs table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_email TEXT,
                action TEXT,
                details TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_timestamp (timestamp)
            )
        `);
        console.log('✅ Audit logs table created/verified');

        // Seed super admin if not exists
        const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@nriit.edu.in';
        const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'Admin@123';

        const [existingAdmin] = await connection.query(
            'SELECT id FROM admins WHERE email = ? AND role = ?',
            [superAdminEmail, 'super_admin']
        );

        if (existingAdmin.length === 0) {
            const passwordHash = await bcrypt.hash(superAdminPassword, 10);
            await connection.query(
                'INSERT INTO admins (email, password_hash, role, department, created_by) VALUES (?, ?, ?, ?, ?)',
                [superAdminEmail, passwordHash, 'super_admin', null, null]
            );
            console.log(`✅ Super admin created: ${superAdminEmail}`);
            console.log(`⚠️  CHANGE DEFAULT PASSWORD AFTER FIRST LOGIN!`);
        } else {
            console.log(`✅ Super admin exists: ${superAdminEmail}`);
        }

        console.log('✅ Database initialization complete');
    } catch (error) {
        console.error('❌ Error initializing database:', error.message);
        throw error;
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

// Export the initialization promise
export const dbReady = initDb();
