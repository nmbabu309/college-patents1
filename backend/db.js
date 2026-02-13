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

        // Create admins table with new schema
        await connection.query(`
            CREATE TABLE IF NOT EXISTS admins (
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
        console.log('✅ Admins table created/verified');

        // Create patents table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS patents (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email TEXT,
                facultyName TEXT,
                designation TEXT,
                department VARCHAR(255),
                coApplicants TEXT,
                patentId TEXT,
                patentTitle TEXT,
                patentType ENUM('Utility', 'Design') DEFAULT 'Utility',
                approvalType TEXT,
                dateOfApproval DATE,
                filingDate DATE,
                grantingDate DATE,
                publishingDate DATE,
                documentLink TEXT,
                authors TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_department (department)
            )
        `);
        console.log('✅ Patents table created/verified');

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
            const passwordHash = await bcrypt.hash(superAdminPassword, parseInt(process.env.BCRYPT_ROUNDS) || 10);
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
