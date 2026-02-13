Complete Codebase Analysis
College Publications & Patents Management System
Last Updated: February 13, 2026
System Type: Public Faculty Publication & Patent Repository with Admin Management
Institution: NRI Institute of Technology

🎯 Executive Summary
This application is a comprehensive faculty research management platform designed to track, manage, and publicly showcase academic publications and patents. It features a modern React frontend with a robust Node.js/Express backend, MySQL database, and a secure JWT-based authentication system for administrators. **The repository is publicly accessible**, allowing anyone to view and export data, while modification rights are strictly reserved for authenticated administrators.

Key Capabilities
✅ **Public Access**: specific patent data is visible to the world without login.
✅ **Secure Admin Portal**: JWT-based authentication for adding/editing data.
✅ **File Management**: Direct PDF uploads with inline preview capabilities.
✅ **Role-Based Access**: Super Admin (all access) vs Sub Admin (department-specific).
✅ **Cross-Device Access**: Dynamic API URL resolution for local network testing.
✅ **Bulk Operations**: Excel import/export logic.
✅ **Modern UI**: Professional aesthetic with TailwindCSS and Framer Motion.

📊 Technology Stack
Backend
Technology	Version	Purpose
Node.js	v18+	Runtime environment
Express.js	v5.2.1	Web framework
MySQL	v3.16.0	Database (mysql2 driver)
JWT	v9.0.3	Token-based authentication
Multer	v1.4.5	File uploads
ExcelJS	v4.4.0	Excel generation/parsing
Helmet	v8.1.0	Security headers
Compression	v1.8.1	Response compression

Frontend
Technology	Version	Purpose
React	v19.2.0	UI framework
Vite	v7.2.4	Build tool & dev server
TailwindCSS	v4.1.18	Styling framework
Framer Motion	v12.23.26	Animations
Axios	v1.13.2	HTTP client (Dynamic URL support)
React Router	v7.10.1	Client-side routing
Lucide React	v0.561.0	Icon library

🗄️ Database Architecture
Database: patent_portal (MySQL)
Table 1: patents
Primary data table storing all publication/patent submissions.

CREATE TABLE patents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email TEXT,                      -- Faculty email (ownership)
    facultyName TEXT,                -- Faculty member's name
    designation TEXT,                -- Academic designation/title
    department TEXT,                 -- Department name
    coApplicants TEXT,               -- Co-authors/co-applicants
    patentId TEXT,                   -- Patent/Publication ID
    patentTitle TEXT,                -- Title of work
    approvalType TEXT,               -- Type of approval received
    dateOfApproval DATE,             -- Approval date (MySQL DATE format)
    documentLink TEXT,               -- Path to uploaded PDF (/uploads/filename.pdf)
    authors TEXT                     -- All authors
);

Table 2: admins
Stores administrative users with elevated privileges.

CREATE TABLE admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    EMAIL VARCHAR(255) UNIQUE NOT NULL,  -- Admin email
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

Table 3: audit_logs
Comprehensive action tracking for security and accountability.

🔐 Authentication & Security
Authentication Flow (Admin Only)
1.  **Login**: User clicks "Login" (hidden/modal key).
2.  **Credentials**: Enter Email/Password.
3.  **Verification**: Backend verifies against `admins` table (or hardcoded/LDAP if configured).
4.  **Token**: JWT issued with `role` (super_admin/sub_admin) and `department`.
5.  **Session**: Stored in localStorage. `AuthContext` updates state.

Public Access Flow
1.  **Home Page**: Accessible to everyone.
2.  **API Requests**: `GET /formGet` and `GET /downloadExcel` check for token.
    *   If **No Token**: Returns ALL data (Public View).
    *   If **Sub Admin Token**: Returns data filtered by their department (Manage View).
    *   If **Super Admin Token**: Returns ALL data (Manage View).

Security Features
*   **JWT-based Sessions**: Stateless authentication.
*   **CORS Protection**:
    *   Allows: localhost, Local Network IPs (192.168.x.x, 10.x.x.x), HTTPS, and configured FRONTEND_URL.
    *   Rejects unknown origins.
*   **Helmet**: Security headers (CSP, HSTS).
*   **PDF Security**: Served with `Content-Disposition: inline` to force browser preview (prevents auto-download/script execution).

🛣️ API Routes & Endpoints
Public Routes
Method	Endpoint	Description
GET	/formGet	Retrieve all publications (Public/Filtered by Role)
GET	/downloadExcel	Export data (Public/Filtered by Role)

Form/Publication Routes (/form) - Protected
Method	Endpoint	Auth	Description
POST	/form/formEntry	✅	Create new publication entry (PDF Upload)
PUT	/form/formEntryUpdate	✅	Update existing entry (PDF Update)
DELETE	/form/deleteEntry/:id	✅	Delete entry (Owner/Admin only)
POST	/form/bulkUpload	✅	Import publications from Excel (Admin only)

Admin Routes (/admin) - Protected
Method	Endpoint	Auth	Description
GET	/admin/allAdmins	✅	List all administrators
POST	/admin/addAdmin	✅	Add new administrator
POST	/admin/deleteAdmin	✅	Remove admin
GET	/admin/logs	✅	View audit logs

🎨 Frontend Architecture
Project Structure
frontend/src/
├── api/
│   └── axios.js                 # Dynamic Base URL detection (Localhost vs Network IP)
├── components/
│   ├── auth/
│   │   └── LoginModal.jsx       # Redesigned Professional Login Modal (Tailwind + Framer)
│   ├── data/
│   │   ├── PublicationsTable.jsx # Public Table with PDF Preview logic
...

Key Components
1. LoginModal (components/auth/LoginModal.jsx)
*   **Redesigned**: Professional academic aesthetic.
*   **Tech**: Tailwind CSS gradients, Framer Motion entrance/exit animations.
*   **Feedback**: Status-coded error messages (e.g., [Error 401]).

2. PublicationsTable (components/data/PublicationsTable.jsx)
*   **Public View**: Actions column hidden for non-admins.
*   **PDF Preview**: "View" button constructs full backend URL for PDFs.
*   **Search**: Client-side filtering across all fields.

3. UploadForm (components/forms/UploadForm.jsx)
*   **File Upload**: Replaced text link with File input (accepts .pdf only).
*   **Department Lock**: Sub-admins verify department matches their assignment.

🚀 Deployment Architecture
Backend (.env)
PORT=3000
JWT_SECRET=...
FRONTEND_URL=http://localhost:5173

Frontend (Dynamic Configuration)
*   **No .env needed for basic local dev**.
*   `axios.js` automatically detects `window.location.hostname`.
    *   If accessing via `localhost`, hits `http://localhost:3000`.
    *   If accessing via `192.168.1.5`, hits `http://192.168.1.5:3000`.
*   This enables **Cross-Device Testing** (e.g., testing on phone while running on laptop).

🔧 Key Features & Workflows
1. PDF Handling (New)
*   **Upload**: Files saved to `backend/uploads/` with unique timestamped names.
*   **Serving**: `express.static` uses `setHeaders` to set `Content-Disposition: inline`.
*   **Result**: PDFs open in a new browser tab (Preview) instead of downloading.

2. Public vs Admin View
*   **Public**: Can see all data, search, export, view PDFs. Cannot Add/Edit/Delete.
*   **Sub Admin**: Can Add/Edit/Delete ONLY for their department.
*   **Super Admin**: Can Add/Edit/Delete ALL data.

3. Network Resilience
*   **Soft Auth**: GET routes don't crash without token; they just default to public view.
*   **Dynamic URL**: Frontend adapts to network environment automatically.
*   **Status Logging**: Backend logs response codes (200, 401, 500) for easier debugging.

🎉 Conclusion
The system has evolved into a user-friendly, public-facing repository while maintaining strict administrative controls. The recent updates (Filesystem uploads, UI redesign, and Network adaptability) make it robust for both campus deployment and general public access.