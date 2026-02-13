# College Publications & Patents Management System

## 🚀 Overview
A comprehensive faculty research management platform designed to track, manage, and publicly showcase academic publications and patents.

**Key Features:**
*   **Public Access**: Browse and search publications without login.
*   **Admin Portal**: Secure management for adding/editing data.
*   **PDF Previews**: View documents directly in the browser (no auto-download).
*   **Cross-Device Support**: Works seamlessly on local networks (mobile/tablet testing).
*   **Excel Integration**: Bulk import/export capabilities.
*   **Modern UI**: Built with React, Tailwind CSS, and Framer Motion.

## 🛠 Project Structure
- `frontend`: React + Vite application (Dynamic Base URL)
- `backend`: Express + Node.js application (Filesystem Uploads)

## 📋 Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn
- MySQL Database

## ⚙️ Setup & Installation

### Backend
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables (`.env`):
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=patent_portal
   JWT_SECRET=your_secret_key
   PORT=3000
   FRONTEND_URL=http://localhost:5173 
   ```
4. Start the server:
   ```bash
   npm run dev
   ```

### Frontend
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Development Mode (Auto-detects backend URL):
   ```bash
   npm run dev
   ```
   *Note: You can access the app from other devices on the same network (e.g., `http://192.168.1.5:5173`).*

## 📦 Production Deployment

### Backend
1. Use a process manager like PM2:
   ```bash
   pm2 start index.js --name patent-api
   ```
2. Ensure `drectory/uploads` exists and is writable.

### Frontend
1. Build the application:
   ```bash
   npm run build
   ```
2. Serve the `dist` folder using Nginx, Apache, or a static file server.

## 🔒 Security
- **JWT Authentication**: Stateless admin sessions.
- **CORS**: Configured to allow strictly specific origins (Localhost, Local Network, Production Domain).
- **Helmet**: Enforces security headers.
- **File Security**: PDFs served with `Content-Disposition: inline` to prevent script execution via download.
