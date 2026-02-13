# 📘 Complete Project Guide: College Publications & Patents Portal

## 👋 Introduction
**What is this project?**
This is a web application designed for the **NRI Institute of Technology** to manage and showcase the academic achievements of its faculty. Think of it as a digital library where:
1.  **The Public** (Students, Researchers, Guests) can viewing and search for research papers and patents.
2.  **The Faculty/Admins** can securely log in to add, edit, or remove these records.

**Why was it built?**
To replace manual record-keeping with a modern, digital system that allows easy access to research data from anywhere—whether you are on campus or viewing from home.

---

## 🌟 Key Features
*   **🌍 Public Access**: You don't need a password to see the data. Anyone can visit the site and browse the list of publications.
*   **🛡️ Secure Admin Area**: Only authorized staff (Admins) can change the data. They have a hidden login portal protected by secure passwords.
*   **📄 PDF Previews**: Instead of downloading files blindly, you can click "View" to open research papers directly in your browser.
*   **📱 Works Everywhere**: The system is smart! It works on your laptop, and if you are on the same WiFi, you can even test it on your phone.
*   **📊 Excel Support**: Admins can upload hundreds of records at once using an Excel sheet.

---

## 🏗️ How It Works (The Big Picture)
Imagine the system as a restaurant:
1.  **The Frontend (The Menu)**: This is what you see in your browser. It's built with **React**. It visualizes the data beautifully.
2.  **The Backend (The Kitchen)**: This is the server (built with **Node.js**). It handles orders (requests for data), cooks them (processes logic), and serves them up.
3.  **The Database (The Pantry)**: This is where all the raw ingredients (data) are stored. We use **MySQL**.

### The Flow of Data
1.  A user opens the website.
2.  The **Frontend** asks the **Backend**: *"Hey, give me the list of patents."*
3.  The **Backend** checks the **Database**, gets the list, and sends it back.
4.  The **Frontend** displays it as a neat table.

---

## 💻 For Developers: Under the Hood

### 1. The Frontend (`/frontend`)
*   **Technology**: React.js + Vite (for speed).
*   **Styling**: Tailwind CSS (for looking good) + Framer Motion (for smooth animations).
*   **Smart Networking**: We use a file called `axios.js` that automatically figures out where the backend is.
    *   *Running locally?* It connects to `localhost`.
    *   *Running on WiFi?* It connects to your computer's IP address (e.g., `192.168.1.5`), so you can open the site on your phone!

### 2. The Backend (`/backend`)
*   **Technology**: Express.js (Node.js).
*   **Security**:
    *   **Helmet**: A security shield that sets strict rules for the browser.
    *   **CORS**: A bouncer that decides who can talk to the server (we allow Localhost and Local Network).
*   **File Storage**: When an Admin uploads a PDF, it is saved in the `backend/uploads/` folder. We don't save the file inside the database (that makes databases slow); we just save the **link** to the file.

### 3. Database (`MySQL`)
We have three main tables:
*   `patents`: Stores the actual research data (Title, Author, Link to PDF, etc.).
*   `admins`: Stores the list of people who are allowed to log in.
*   `audit_logs`: A diary that records every action. If someone deletes a file, we know who did it and when.

---

## 🚀 Important Workflows

### 👮 Logging In (Admins Only)
*   **The Problem**: We don't want random people trying to log in.
*   **The Solution**: The Login button is hidden or part of a modal. Authenticated admins get a digital "Badge" (called a **JWT Token**).
*   **The Badge**: This token is saved in your browser. Every time you try to delete or add something, the Backend checks for this badge. No badge = Access Denied.

### 📂 Uploading Files
1.  Admin selects a PDF.
2.  Frontend sends it to the Backend.
3.  Backend saves it with a unique name (so files don't overwrite each other) in the `uploads` folder.
4.  Backend tells the Database: *"Hey, this patent's file is located at /uploads/file-123.pdf"*.

### 📱 Viewing PDFs
1.  User clicks "View".
2.  Frontend looks at the link: `/uploads/file-123.pdf`.
3.  Frontend adds the server address: `http://localhost:3000/uploads/file-123.pdf`.
4.  Browser opens it.
    *   *Special Trick*: The Backend adds a special "Inline" tag. This forces the browser to **Show** the PDF instead of **Downloading** it.

---

## 🛠️ How to Run This Project

### Prerequisites
*   **Node.js**: The engine that runs javascript outside the browser.
*   **MySQL**: The database software.

### Step 1: Start the Backend
```bash
cd backend
npm install  # Downloads the "kitchen tools" (dependencies)
npm run dev  # Starts the kitchen!
```

### Step 2: Start the Frontend
```bash
cd frontend
npm install  # Downloads the "menu" designers
npm run dev  # Opens the restaurant!
```

**That's it!** Open the link shown in your terminal (usually `http://localhost:5173`) to see the app.

---

## ❓ Troubleshooting Common Issues

*   **"I can't see the PDFs!"**
    *   Make sure the Backend is running. The frontend needs the backend to serve the files.
*   **"It works on my laptop but not my phone."**
    *   Make sure your phone and laptop are on the same WiFi.
    *   Check if your firewall is blocking connections.
*   **"I see 'Network Error' when logging in."**
    *   This usually means the Backend is crashed or not running. Check your backend terminal for errors.

---

**Maintained by**: NRI IT Engineering Team
**Last Updated**: Feb 2026
