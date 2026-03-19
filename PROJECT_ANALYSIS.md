# 🏗️ Project Analysis: College Publications & Patents

This document provides a deep dive into the architecture, data models, and request flow of the College Publications & Patents Portal. It is intended for incoming developers and maintainers.

---

## 1. High-Level Architecture
The project follows a standard decoupled Client-Server architecture.

*   **Frontend**: Built with **React** (via Vite). Uses `TailwindCSS` for styling, `Framer Motion` for animations, and `react-router-dom` for navigation.
*   **Backend**: A **Node.js** + **Express.js** API.
*   **Database**: **MySQL**.
*   **File Storage**: Local filesystem (`/backend/uploads/`).
*   **Authentication**: Stateless **JSON Web Tokens (JWT)**.

---

## 2. Data Models (Database Schema)

The MySQL database contains three primary tables:

### 2.1. `patents` (The Core Data Table)
Stores all publication and patent records.
*   **Primary Key**: `id` (INT, Auto Increment)
*   **Faculty Info**: `facultyName`, `email`, `department` (Indexed), `designation`, `caste`.
*   **Patent Details**: `patentId`, `patentTitle`, `authors`, `coApplicants`.
*   **Classification**:
    *   `patentType`: ENUM ('Utility', 'Design').
    *   `approvalType`: TEXT (e.g., 'Published', 'Granted').
*   **Key Dates**:
    *   `filingDate`: DATE (**Required**).
    *   `publishingDate`: DATE (**Required**).
    *   `grantingDate`: DATE (Optional, required if status is 'Granted').
*   **Files**:
    *   `documentLink`: TEXT (Path to Proof of Publish PDF).
    *   `grantDocumentLink`: TEXT (Path to Proof of Grant PDF).

### 2.2. `admins` (The Auth Table)
Stores user credentials and roles.
*   **Primary Key**: `id` (INT)
*   **Credentials**: `email` (Unique), `password_hash` (Bcrypt).
*   **Role Management**:
    *   `role`: ENUM ('super_admin', 'sub_admin').
    *   `department`: VARCHAR. (If role is `sub_admin`, they are restricted to this department).

### 2.3. `audit_logs` (The Tracking Table)
Immutable log of all administrative actions (Login, Create, Update, Delete, Batch Import) for accountability.

---

## 3. Security & Access Control Model

The application employs Role-Based Access Control (RBAC) enforced via JWT middleware.

1.  **Public Access**: Unauthenticated users can view the homepage, search the paginated table (`/formGet`), and export the public data to Excel. They cannot add, edit, or delete.
2.  **Sub-Admin (Department Admin)**:
    *   Must log in to receive a JWT containing their `role` and `department`.
    *   **Restriction**: Can ONLY create, edit, or delete records where the `department` matches their assigned department. The backend `authorization.js` middleware enforces this hard check.
3.  **Super Admin**:
    *   Can perform full CRUD operations across *any* department.
    *   Can execute **Batch Import** (Excel bulk upload).
    *   Can view full system `audit_logs`.

---

## 4. API Request Flow & File Handling

### Single Patent Upload (POST `/form/formEntry`)
1.  **Client**: Sends `multipart/form-data` containing text fields and PDF files.
2.  **Middleware (`multer`)**: Intercepts the request. Validates that files are `<5MB` and `application/pdf`. Saves them temporarily to disk.
3.  **Middleware (`verifyToken` & `authorization`)**: Validates JWT and asserts department ownership if the user is a `sub_admin`.
4.  **Controller**:
    *   Checks for duplicates (`patentId` + `email`).
    *   Validates mandatory fields (e.g., `filingDate`).
    *   Inserts the record into MySQL.
    *   *Self-Healing*: If the database insertion fails (e.g., SQL error), the controller immediately unlinks (deletes) the uploaded files from the disk to prevent orphaned files accumulating.

### Bulk Import (POST `/form/bulkImport`)
Designed exclusively for Super Admins to upload legacy data.
*   **Client**: Parses an Excel file locally using `exceljs`, converts it to a JSON array, and sends it to the backend.
*   **Backend**: Loops through the array, validating each entry individually. Documents are passed as URLs rather than physical file uploads during batch imports. Converts Excel serial dates into standard MySQL `YYYY-MM-DD` formats seamlessly.

---

## 5. Potential Bottlenecks & Considerations
*   **Local File Storage**: Currently, PDFs are saved directly to `backend/uploads/`. If this project scales across multiple servers (horizontal scaling), local storage will fail (a load balancer might route a request to Server B for a file uploaded to Server A). Migrating to AWS S3/Cloud Storage would be required for horizontal scaling.
*   **Hard Deletes**: Currently, deleting a patent removes the row from the database permanently (`DELETE FROM patents`). To maintain a perfect historical record, implementing "Soft Deletes" (`is_active = false`) is recommended in the future.
