# PDF Opening Issue - Fix Applied

## Problem Identified
PDF files uploaded through the patent management system were not opening when clicked.

## Root Causes Found

### 1. **Path Mismatch** (Primary Issue)
- **Upload Path**: Files were uploaded to `backend/uploads/` (relative to `formHandling.js`)
- **Serve Path**: Files were being served from `uploads/` in project root (relative to `index.js`)
- **Result**: Server was looking for PDFs in wrong directory

### 2. **Missing MIME Type Headers**
- PDF files weren't being served with proper `Content-Type: application/pdf` header
- Browsers couldn't determine how to handle the file

### 3. **Restrictive Security Headers**
- Helmet's default `crossOriginEmbedderPolicy` was blocking PDF embedding
- Content Security Policy was too restrictive for PDF viewing

## Fixes Applied

### ✅ Fix 1: Corrected Upload Directory Path
**File**: `backend/index.js`
```javascript
// BEFORE (incorrect)
const uploadsDir = path.join(process.cwd(), 'uploads');

// AFTER (correct)
const uploadsDir = path.join(__dirname, 'uploads');
```

### ✅ Fix 2: Added Proper PDF MIME Type Handling
**File**: `backend/index.js`
```javascript
// Serve PDF files with proper MIME type
app.use('/uploads', (req, res, next) => {
  if (req.path.endsWith('.pdf')) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="' + path.basename(req.path) + '"');
  }
  express.static(uploadsDir)(req, res, next);
});
```

### ✅ Fix 3: Configured Helmet for PDF Support
**File**: `backend/index.js`
```javascript
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      objectSrc: ["'self'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'"]
    }
  }
}));
```

## ✅ Fix 4: Dynamic Base URL for Cross-Device Access [NEW]
**File**: `frontend/src/api/axios.js`
*   **Problem**: Links were defaulting to `localhost`, breaking access on other devices in the network.
*   **Fix**: Implemented `getBaseUrl()` helper to dynamically detect if the app is running on `localhost` or a network IP (e.g., `192.168.x.x`) and construct the backend URL accordingly.

## ✅ Fix 5: Force Inline Preview (Anti-Download) [NEW]
**File**: `backend/index.js`
*   **Problem**: IDM or browsers were auto-downloading PDFs.
*   **Fix**: Updated `express.static` with specific `setHeaders` callback.
```javascript
res.setHeader('Content-Disposition', 'inline; filename="' + filename + '"');
```
*   **Result**: Forces the browser to render the PDF in a new tab instead of triggering the "Save As" dialog or download manager.

## How It Works Now

1.  **File Upload**: PDFs are uploaded to `backend/uploads/` directory
2.  **File Storage**: Database stores path as `/uploads/filename.pdf`
3.  **File Serving**: When accessing `/uploads/filename.pdf`:
    -   Server sets `Content-Type: application/pdf`
    -   Server sets `Content-Disposition: inline`
    -   Frontend prepends correct Backend URL (e.g., `http://192.168.1.5:3000`)
4.  **Security**: Helmet allows PDF embedding with proper CSP

## Files Modified
- `backend/index.js` - Fixed path, MIME types, Cache headers, CORS.
- `frontend/src/api/axios.js` - Added dynamic URL detection.
- `frontend/src/components/data/PublicationsTable.jsx` - Updated "View" button to use absolute URLs.

## Expected Result
✅ PDF files open in new tab (Preview Mode) on all devices.
✅ No "Page Not Found" errors on mobile/tablet.
✅ No auto-download prompts.
