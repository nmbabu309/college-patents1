# Project Features Documentation

This document outlines the features currently implemented in the backend logic of the application.

## 1. Authentication System
The project implements a secure, One-Time Password (OTP) based authentication flow.

*   **OTP Generation & Login:**
    *   Endpoint: `POST /login/otpSend`
    *   Functionality: Accepts an email address and generates a 6-digit random OTP.
    *   **Email Delivery:** Uses `nodemailer` to send a professional, HTML-styled email containing the OTP to the user.
    *   **Security:** OTPs are stored temporarily in-memory and expire after 5 minutes.

*   **OTP Verification:**
    *   Endpoint: `POST /login/otpVerify`
    *   Functionality: Verifies the submitted OTP against the stored code for the given email.
    *   **Session Management:** Upon successful verification, generates a **JSON Web Token (JWT)**.
    *   **Token Policy:** The JWT is valid for 30 days and allows access to protected routes.
    *   **Audit Logging:** Logs all login attempts to the audit_logs table.

## 2. Patent Management (Form Handling)
A system to manage faculty patent submissions, backed by a MySQL database.

*   **Database Schema:**
    *   Uses `mysql2` for MySQL connection.
    *   Database: `patent_portal`
    *   Table `patents` stores: `email`, `facultyName`, `designation`, `department`, `coApplicants`, `patentId`, `patentTitle`, `approvalType`, `dateOfApproval`, and `documentLink`.

*   **Submission (Protected):**
    *   Endpoint: `POST /form/formEntry`
    *   **Middleware:** Protected by `verifyToken` middleware. Only authenticated users (with a valid JWT) can submit forms.
    *   Functionality: Inserts patent details into the database.
    *   **Uniqueness:** Checks for duplicate `patentId` before insertion.
    *   **Audit Logging:** Logs all create actions.

*   **Update (Protected):**
    *   Endpoint: `PUT /form/formEntryUpdate`
    *   **Authorization:** Users can only edit their own entries (email-based ownership) or admins can edit any entry.
    *   **Audit Logging:** Logs all update actions.

*   **Delete (Protected):**
    *   Endpoint: `DELETE /form/deleteEntry/:id`
    *   **Authorization:** Users can only delete their own entries or admins can delete any entry.
    *   **Audit Logging:** Logs all delete actions.

*   **Retrieval:**
    *   Endpoint: `GET /form/formGet`
    *   Functionality: API to fetch all stored patent records from the database.
    *   **Pagination:** Client-side pagination currently implemented.

*   **Excel Export:**
    *   Endpoint: `GET /form/downloadExcel`
    *   Functionality: Generates a professionally formatted Excel file of all patent data.
    *   Uses `exceljs` library for Excel generation.

*   **Excel Template:**
    *   Endpoint: `GET /form/downloadTemplate`
    *   Functionality: Downloads a blank Excel template for bulk import.

## 3. Admin Features

*   **Admin Management:**
    *   Endpoint: `GET /admin/allAdmins` - List all admins
    *   Endpoint: `POST /admin/addAdmin` - Add new admin
    *   Endpoint: `POST /admin/deleteAdmin` - Remove admin (cannot remove self)

*   **Audit Logs:**
    *   Endpoint: `GET /admin/logs`
    *   **Pagination:** Supports page and limit query parameters.
    *   Tracks all CREATE, UPDATE, DELETE, LOGIN, and BATCH_UPDATE actions.

*   **Bulk Operations:**
    *   Endpoint: `POST /form/formEntryBatchUpdate` - Admin-only batch update
    *   Endpoint: `POST /admin/deleteAll` - **DANGER**: Delete all patents (admin only)

## 4. Infrastructure & Middleware
*   **Server:** Built with Node.js and Express.js (ES Modules).
*   **Security Middleware:**
    *   `verifyToken`: Intercepts requests, checks for the `Authorization` header, and verifies the validity of the JWT.
    *   `helmet`: Secures HTTP headers.
    *   `compression`: Compresses response bodies for better performance.
*   **CORS:** Cross-Origin Resource Sharing is enabled with configurable allowed origins.
*   **Environment Configuration:** Uses `dotenv` to manage sensitive data like `JWT_SECRET`, `EMAIL_USER`, `EMAIL_PASSWORD`, and database credentials.

## 5. Date Handling

*   **Smart Date Parser:** `formatDateForMySQL` function handles multiple date formats:
    *   Excel serial dates
    *   DD.MM.YYYY format (European)
    *   DD/MM/YYYY format
    *   YYYY-MM-DD format (ISO)
    *   Automatic conversion to MySQL DATE format (YYYY-MM-DD)

