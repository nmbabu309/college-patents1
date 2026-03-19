# 🚀 How To Run: College Publications & Patents

This guide provides instructions on how to set up, run, and deploy the College Publications & Patents application.

---

## 📋 Prerequisites
Before you begin, ensure you have the following installed on your system:
*   **Node.js**: `v18.0.0` or higher.
*   **MySQL Server**: `8.0` or higher.
*   **Git** (for version control).

---

## 🛠️ Local Development Setup

To run the project locally, you need to run both the Node.js backend server and the React frontend server simultaneously.

### 1. Database Setup
1.  Open MySQL Command Line or a UI tool like MySQL Workbench.
2.  You don't need to manually create the tables! Just ensure you have the credentials to an empty (or non-existing) database instance. The application applies migrations automatically on startup via `db.js`.

### 2. Backend Setup
The backend manages the API, database connection, and file uploads.
1.  Navigate to the `backend` directory:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env` file in the `backend` directory based on the `.env.example` file (or set the following variables):
    ```env
    PORT=3000
    DB_HOST=localhost
    DB_USER=root
    DB_PASSWORD=your_mysql_password
    DB_NAME=patent_portal
    JWT_SECRET=super_secret_jwt_key
    SUPER_ADMIN_EMAIL=admin@nriit.edu.in
    SUPER_ADMIN_PASSWORD=Admin@123
    ```
    *(Note: Ensure you change `SUPER_ADMIN_PASSWORD` in production!)*
4.  Start the development server:
    ```bash
    npm run dev
    ```
    *The backend should default to running on `http://localhost:3000`.*

### 3. Frontend Setup
The frontend is built with React and Vite.
1.  Open a **new** terminal and navigate to the `frontend` directory:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the Vite development server:
    ```bash
    npm run dev
    ```
    *The frontend will typically run on `http://localhost:5173`.*

---

## 🌍 Production Deployment Guide

Deploying to a live server requires serving the statically built React files through the Node.js Express server or a reverse proxy like NGINX.

### Step 1: Build the Frontend
1.  Navigate to the `frontend` directory.
2.  Run the build command:
    ```bash
    npm run build
    ```
    *This generates a `dist` folder natively. The backend `index.js` will automatically detect this folder and host the contents automatically!*

### Step 2: Serve the Build (Integrated approach)
The backend `index.js` is already configured to serve the `frontend/dist` folder statically in production mode.
1.  Navigate to the `backend` folder.
2.  Ensure dependencies are installed (`npm install --production`).
3.  Start the Express server using a process manager like PM2:
    ```bash
    npm install -g pm2
    pm2 start index.js --name "patent-portal"
    ```
4.  PM2 will keep your app running in the background and restart it if it crashes.

### Step 3: NGINX Config (Optional but Recommended)
For a robust production environment, use NGINX as your web server/reverse proxy pointing to your PM2 managed Node app (typically port `3000`).

```nginx
server {
    listen 80;
    server_name patents.yourcollege.edu;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 10M; # Necessary for PDF uploads
    }
}
```

---

## 🔒 Post-Installation Steps

**CRITICAL SECURITY MEASURES:**
1.  **Change Super Admin Password**: Log in with `admin@nriit.edu.in` / `Admin@123` via the UI immediately and change the password or edit the DB record directly.
2.  **Backup Strategy**: Schedule daily `.sql` dumps (e.g., via cron utilizing `mysqldump`) for the `patents` and `admins` tables to ensure data safety.
3.  **Uploads Folder**: Ensure regular backups of the `backend/uploads/` directory, as this contains all the uploaded PDF proofs.

---

## ✨ New System Features

The codebase has recently been upgraded with several robust features to enhance security, usability, and operability:

### 1. Smart Filtered Exports
The Excel Export button dynamically respects the current state of the datatable. If you filter the table by a specific specific Department or Faculty Name, clicking **Export** will output an Excel file containing *only* those filtered rows.

### 2. Startup Validation & `/health` Endpoint 
If you forget to provide `JWT_SECRET` or mandatory DB credentials in your `.env` file, the backend server will immediately crash with a descriptive error upon startup. Once running, you can monitor system stability by querying `GET /health`, which actively pings the MySQL instance.

### 3. Joi Payload Validation
All incoming patent payload submissions (`POST /form/formEntry`) are strictly verified via `joi` schemas. If data is malformed, missing, or an incorrect department is supplied, the API elegantly rejects the request with a detailed HTTP 400 response and cleans up any prematurely uploaded PDF files.

### 4. Admin Pagination
The Super Admin dashboard features built-in server-side pagination for tracking administrators, preventing UI sluggishness in installations with dozens of sub-admins.

### 5. Audit Log Retention Management
Audit logs are crucial for security but can bloat the database over time. Super Admins can manually invoke `POST /admin/logs/cleanup` to purge logs older than a configurable number of months (default: 6), keeping the system lean.

### 6. Automated Full-System Backups
The backend uses `node-cron` to automatically trigger a full system backup every 3 days at 03:00 AM. This backup explicitly dumps the MySQL database (`.sql`) and zips the entire `uploads/` directory into a secure timestamped `.zip` archive located in `/backend/backups/`. 

### 7. Core Database Auto-Recovery
The `db.js` initialization script features an exponential backoff loop. If the MySQL server crashes or is unavailable during the Node process boot, the app will gracefully sleep and retry up to 10 times to prevent the Node server from fatally crashing.

### 8. Single-Server Deployment
The React application's API endpoints dynamically scan `window.location.host`. This allows the exact same compiled `/dist` bundle to be securely served over a local IP, an external NGINX reverse-proxy, or a public Ngrok tunnel without editing any `.env` files.
