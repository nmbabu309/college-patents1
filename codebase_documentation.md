# Comprehensive Technical Discovery & Codebase Documentation

## 1. System Overview

This application is a **Public Faculty Publication Repository & Management System**. It allows the public to view and search faculty publications while providing a secure, admin-only interface for managing data.

### Tech Stack
-   **Frontend**: React (Vite), TailwindCSS, Framer Motion, Axios (Dynamic URL).
-   **Backend**: Node.js, Express.js, Multer (File Uploads).
-   **Database**: MySQL (via `mysql2`).
-   **Authentication**: JWT (JSON Web Tokens) for Admins.

### High-Level Architecture
1.  **Client (Frontend)**: React SPA. Auto-adapts to `localhost` or Network IP for cross-device usage.
2.  **Server (Backend)**: Express API. Handles public data requests and authenticated admin operations. Serves uploaded PDFs.
3.  **Database**: MySQL `patent_portal`.

---

## 2. Database Schema

### 2.1. `patents` Table
Stores publication details.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | INT | Primary Key. |
| `email` | TEXT | Faculty email. |
| ... | ... | ... |
| `documentLink` | TEXT | **Local Path** (`/uploads/file.pdf`). |

### 2.2. `admins` Table
Stores users with write access.

### 2.3. `audit_logs` Table
Tracks `CREATE`, `UPDATE`, `DELETE`, `LOGIN` events.

---

## 3. Data Flow & Security

### 3.1. Public Access (Read-Only)
*   **Home Page**: Accessible to all.
*   **Search/Filter**: Client-side filtering.
*   **PDF View**: "View" button opens PDF in **Preview Mode** (new tab).
*   **API**:
    *   `GET /form/formGet` -> Returns all data (Public).
    *   `GET /form/downloadExcel` -> Public download.

### 3.2. Admin Access (Write)
*   **Login**: Hidden/Modal based.
*   **Auth**: JWT Token required for `POST`, `PUT`, `DELETE`.
*   **Role Scope**:
    *   **Super Admin**: Manage ALL data.
    *   **Sub Admin**: Manage ONLY department data.

### 3.3. File Handling
*   **Upload**: Files saved to `backend/uploads/` via Multer.
*   **Serving**: Files served via `express.static` with headers forced to `Content-Disposition: inline`. This prevents auto-downloading and forces browser preview.

---

## 4. Backend Architecture

### 4.1. Entry Point: `index.js`
*   **CORS**: Dynamic - accepts Localhost, Private IPs (192.168.x.x), and `FRONTEND_URL`.
*   **Static Files**: Serves `/uploads` with specific headers for PDFs.
*   **Logging**: Logs Request Method, URL, Origin, and **Response Status Code** (e.g., [200], [403]).

### 4.2. Routes
*   **Public**: `/form/formGet`, `/form/downloadExcel`.
*   **Protected**: `/form/formEntry` (POST), `update`, `delete`, `/admin/*`.

---

## 5. Frontend Architecture

### 5.1. Dynamic Configuration (`axios.js`)
*   Automatically detects if app is running on `localhost` or a network IP.
*   Constructs `baseURL` accordingly to ensure API calls work on mobile/tablet devices connected to the same network.

### 5.2. Key Components
*   **`Home.jsx`**: Public landing page.
*   **`PublicationsTable.jsx`**: Displays data. Smart "View" button constructs full backend URL for PDFs.
*   **`LoginModal.jsx`**: Professional, animated login interface.

---

## 6. Deployment
*   **Backend**: Node.js process (PM2 recommended).
*   **Frontend**: Static build (`dist`).
*   **Environment**:
    *   `FRONTEND_URL`: For CORS in production.
    *   `JWT_SECRET`: For session security.


