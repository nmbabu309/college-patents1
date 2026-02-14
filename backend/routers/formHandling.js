import { Router } from "express";

import { verifyToken } from "../middleware/verifyToken.js";
import { requireAnyAdmin, isSuperAdmin } from "../middleware/authorization.js";
import { db } from "../db.js";
import ExcelJS from "exceljs";
import path from "path";
import { fileURLToPath } from "url";
import multer from 'multer';
import fs from 'fs';
import jwt from 'jsonwebtoken';

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for local disk uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\.\-]/g, '');
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    // Only allow PDFs
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'));
  }
});

// Accept two file fields: published doc (mandatory) + grant doc (optional)
const uploadFields = upload.fields([
  { name: 'documentFile', maxCount: 1 },
  { name: 'grantDocumentFile', maxCount: 1 }
]);



// Helper functions removed - role is now in JWT token

const logAction = async (userEmail, action, details) => {
  try {
    await db.query("INSERT INTO audit_logs (user_email, action, details) VALUES (?, ?, ?)", [userEmail, action, details]);
  } catch (err) {
    console.error("Failed to log action:", err);
  }
};

// Helper function to format date for MySQL
const formatDateForMySQL = (dateString) => {
  if (!dateString) return null;

  try {
    // Handle different date formats
    let date;

    // Check if it's a number (Excel serial date)
    if (typeof dateString === 'number') {
      // Excel serial date (days since 1899-12-30)
      date = new Date((dateString - 25569) * 86400 * 1000);
    }
    // Check for DD.MM.YYYY format (European)
    else if (typeof dateString === 'string' && /^\d{1,2}\.\d{1,2}\.\d{4}$/.test(dateString.trim())) {
      const [day, month, year] = dateString.trim().split('.');
      date = new Date(year, month - 1, day);
    }
    // Check for DD/MM/YYYY format
    else if (typeof dateString === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString.trim())) {
      const [day, month, year] = dateString.trim().split('/');
      date = new Date(year, month - 1, day);
    }
    // Check for YYYY-MM-DD format (ISO)
    else if (typeof dateString === 'string' && /^\d{4}-\d{1,2}-\d{1,2}/.test(dateString.trim())) {
      date = new Date(dateString.trim());
    }
    // Default: try parsing as-is
    else {
      date = new Date(dateString);
    }

    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.error('Invalid date:', dateString);
      return null;
    }

    // Convert to YYYY-MM-DD format
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  } catch (err) {
    console.error("Date formatting error:", err, "Input:", dateString);
    return null;
  }
};

// Validate date requirements based on patent type
const validatePatentDates = (patentType, filingDate, grantingDate, publishingDate) => {
  if (!patentType || (patentType !== 'Utility' && patentType !== 'Design')) {
    return { valid: false, message: "Patent type must be either 'Utility' or 'Design'" };
  }

  if (patentType === 'Utility') {
    if (!filingDate || !formatDateForMySQL(filingDate)) {
      return { valid: false, message: "Filing date is required for Utility patents" };
    }
    if (!grantingDate || !formatDateForMySQL(grantingDate)) {
      return { valid: false, message: "Granting date is required for Utility patents" };
    }
    // publishingDate is optional for Utility patents
  } else if (patentType === 'Design') {
    if (!filingDate || !formatDateForMySQL(filingDate)) {
      return { valid: false, message: "Filing date is required for Design patents" };
    }
    if (!grantingDate || !formatDateForMySQL(grantingDate)) {
      return { valid: false, message: "Granting date is required for Design patents" };
    }
    if (!publishingDate || !formatDateForMySQL(publishingDate)) {
      return { valid: false, message: "Publishing date is required for Design patents" };
    }
  }

  return { valid: true };
};



router.post("/formEntry", verifyToken, requireAnyAdmin, uploadFields, async (req, res) => {
  const {
    email,
    facultyName,
    designation,
    department,
    caste,
    coApplicants,
    patentId,
    patentTitle,
    patentType,
    approvalType,
    filingDate,
    grantingDate,
    publishingDate,
    authors,
  } = req.body;

  // Require uploaded PDF for published document (mandatory for manual, optional if link provided in body for bulk)
  const docFile = req.files?.documentFile?.[0];
  const grantFile = req.files?.grantDocumentFile?.[0];

  let finalDocumentLink = req.body.documentLink || null;
  let finalGrantDocLink = req.body.grantDocumentLink || null;

  if (docFile) {
    finalDocumentLink = `/uploads/${docFile.filename}`;
  }

  if (grantFile) {
    finalGrantDocLink = `/uploads/${grantFile.filename}`;
  }

  // if (!finalDocumentLink) {
  //   return res.status(400).json({ message: "Proof of Publish (PDF or Link) is required." });
  // }

  // Default patentType to 'Utility' if not provided (backward compatibility)
  const finalPatentType = patentType || 'Utility';

  // Check department access for sub-admins
  if (req.user.role === 'sub_admin') {
    console.log(`[FormEntry Check] Role: ${req.user.role}, UserDept: '${req.user.department}', PayloadDept: '${department}'`);
    if (department !== req.user.department) {
      console.warn(`[FormEntry Blocked] Mismatch: '${department}' !== '${req.user.department}'`);
      return res.status(403).json({
        message: `You can only add patents for your department (${req.user.department})`
      });
    }
  }

  // Validate date requirements based on patent type
  const dateValidation = validatePatentDates(finalPatentType, filingDate, grantingDate, publishingDate);
  if (!dateValidation.valid) {
    return res.status(400).json({ message: dateValidation.message });
  }

  try {
    // Check for duplicate combination of patentId + email (same person, same patent)
    const [existingRows] = await db.query(
      "SELECT 1 FROM patents WHERE patentId = ? AND email = ?",
      [patentId, email]
    );
    if (existingRows.length > 0) {
      return res.status(409).json({ message: "Duplicate entry: You have already submitted this patent." });
    }

    await db.query(
      `INSERT INTO patents 
  (email, facultyName, designation, department, caste, coApplicants, patentId, patentTitle, patentType, approvalType, filingDate, grantingDate, publishingDate, documentLink, grantDocumentLink, authors)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        email,
        facultyName,
        designation,
        department,
        caste || null,
        coApplicants,
        patentId,
        patentTitle,
        finalPatentType,
        approvalType || 'Published', // Default to Published if not provided
        formatDateForMySQL(filingDate),
        formatDateForMySQL(grantingDate),
        formatDateForMySQL(publishingDate),
        finalDocumentLink,
        finalGrantDocLink,
        authors
      ]
    );

    await logAction(req.user.userEmail, "CREATE", `Created patent: ${patentTitle}`);

    return res.status(200).json({ message: "Patent submitted successfully" });
  } catch (e) {
    console.error('❌ Error in /formEntry:', e);
    // Multer/file validation errors -> respond 400
    if (e instanceof multer.MulterError || e?.message === 'Only PDF files are allowed') {
      return res.status(400).json({ message: e.message || 'File upload error' });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.put("/formEntryBatchUpdate", verifyToken, requireAnyAdmin, async (req, res) => {
  // Only super admins can perform batch updates
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ message: "Only super admins can perform batch updates." });
  }

  const updates = req.body; // expecting array of updates

  if (!Array.isArray(updates)) {
    return res.status(400).json({ message: "Array expected" });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const query = `
      UPDATE patents
      SET 
        email = COALESCE(?, email),
        facultyName = COALESCE(?, facultyName),
        designation = COALESCE(?, designation),
        department = COALESCE(?, department),
        caste = COALESCE(?, caste),
        coApplicants = COALESCE(?, coApplicants),
        patentId = COALESCE(?, patentId),
        patentTitle = COALESCE(?, patentTitle),
        patentType = COALESCE(?, patentType),
        approvalType = COALESCE(?, approvalType),
        filingDate = COALESCE(?, filingDate),
        grantingDate = COALESCE(?, grantingDate),
        publishingDate = COALESCE(?, publishingDate),
        documentLink = COALESCE(?, documentLink),
        grantDocumentLink = COALESCE(?, grantDocumentLink),
        authors = COALESCE(?, authors)
      WHERE id = ?
    `;

    const rejectedEntries = [];
    const successfulUpdates = [];

    for (const row of updates) {
      // Check if entry exists and get owner email
      const [existingEntry] = await connection.query(
        "SELECT email, patentType FROM patents WHERE id = ?",
        [row.id]
      );

      if (!existingEntry || existingEntry.length === 0) {
        rejectedEntries.push({
          id: row.id,
          reason: "Entry not found"
        });
        continue;
      }

      // Validate date requirements if patentType is provided
      const patentType = row.patentType || existingEntry[0].patentType || 'Utility';
      const dateValidation = validatePatentDates(patentType, row.filingDate, row.grantingDate, row.publishingDate);
      if (!dateValidation.valid) {
        rejectedEntries.push({
          id: row.id,
          reason: dateValidation.message
        });
        continue;
      }

      // Proceed with update
      await connection.query(query, [
        row.email ?? null,
        row.facultyName ?? null,
        row.designation ?? null,
        row.department ?? null,
        row.caste ?? null,
        row.coApplicants ?? null,
        row.patentId ?? null,
        row.patentTitle ?? null,
        patentType ?? null,
        row.approvalType ?? null,
        formatDateForMySQL(row.filingDate ?? null),
        formatDateForMySQL(row.grantingDate ?? null),
        formatDateForMySQL(row.publishingDate ?? null),
        row.documentLink ?? null,
        row.grantDocumentLink ?? null,
        row.authors ?? null,
        row.id
      ]);

      successfulUpdates.push(row.id);
    }

    await connection.commit();

    await logAction(
      req.user.userEmail,
      "BATCH_UPDATE",
      `Batch update: ${successfulUpdates.length} successful, ${rejectedEntries.length} rejected`
    );

    return res.status(200).json({
      message: "Batch update completed",
      successful: successfulUpdates.length,
      rejected: rejectedEntries.length,
      rejectedEntries: rejectedEntries.length > 0 ? rejectedEntries : undefined
    });

  } catch (err) {
    await connection.rollback();
    console.error("Batch update error:", err);
    return res.status(500).json({ message: "Batch update failed" });
  } finally {
    connection.release();
  }
});

router.put("/formEntryUpdate", verifyToken, requireAnyAdmin, uploadFields, async (req, res) => {
  console.log("--- DEBUG: formEntryUpdate Called ---");
  console.log("Body:", JSON.stringify(req.body, null, 2));
  console.log("Files:", req.files ? Object.keys(req.files) : "No files");
  
  const {
    id,
    email,
    facultyName,
    designation,
    department,
    caste,
    coApplicants,
    patentId,
    patentTitle,
    patentType,
    approvalType,
    filingDate,
    grantingDate,
    publishingDate,
    documentLink,
    grantDocumentLink,
    authors,
  } = req.body;

  console.log("Updating ID:", id);

  if (!id) {
    console.warn("DEBUG: Patent ID is missing in request body");
    return res.status(400).json({ message: "Patent ID is required" });
  }

  const userEmail = req.user.userEmail;

  try {
    // Fetch existing entry
    const [rows] = await db.query("SELECT * FROM patents WHERE id = ?", [id]);
    const entry = rows[0];

    if (!entry) {
      console.log("DEBUG: Patent not found for ID:", id);
      return res.status(404).json({ message: "Patent not found" });
    }

    // Check department access for sub-admins
    if (req.user.role === 'sub_admin') {
      if (entry.department !== req.user.department) {
        return res.status(403).json({
          message: `You can only edit patents from your department (${req.user.department})`
        });
      }
    }

    // Sanitize inputs: Convert empty strings to null to ensure COALESCE works as intended
    const sanitize = (val) => (val === '' ? null : val);

    const emailSanitized = sanitize(email);
    const facultyNameSanitized = sanitize(facultyName);
    const designationSanitized = sanitize(designation);
    const departmentSanitized = sanitize(department);
    const casteSanitized = sanitize(caste);
    const coApplicantsSanitized = sanitize(coApplicants);
    const patentIdSanitized = sanitize(patentId);
    const patentTitleSanitized = sanitize(patentTitle);
    const patentTypeSanitized = sanitize(patentType);
    const approvalTypeSanitized = sanitize(approvalType);
    const filingDateSanitized = sanitize(filingDate);
    const grantingDateSanitized = sanitize(grantingDate);
    const publishingDateSanitized = sanitize(publishingDate);
    const authorsSanitized = sanitize(authors);

    // Prepare merged state for validation (New Value -> Existing Value -> Default)
    // Use sanitized values here if provided
    const finalPatentType = patentTypeSanitized || entry.patentType || 'Utility';
    const finalFilingDate = filingDateSanitized !== undefined ? filingDateSanitized : entry.filingDate;
    const finalGrantingDate = grantingDateSanitized !== undefined ? grantingDateSanitized : entry.grantingDate;
    const finalPublishingDate = publishingDateSanitized !== undefined ? publishingDateSanitized : entry.publishingDate;

    // Validate date requirements check against the FINAL state of the record
    const dateValidation = validatePatentDates(finalPatentType, finalFilingDate, finalGrantingDate, finalPublishingDate);
    if (!dateValidation.valid) {
      console.log("DEBUG: Date validation failed:", dateValidation.message);
      return res.status(400).json({ message: dateValidation.message });
    }

    // Determine final documentLink
    const docFile = req.files?.documentFile?.[0];
    let finalDocumentLink = entry.documentLink; 

    if (docFile) {
      finalDocumentLink = `/uploads/${docFile.filename}`;
      // Clean up old local file if replacing
      try {
        if (entry.documentLink?.startsWith('/uploads/')) {
          const oldPath = path.join(__dirname, '..', entry.documentLink.replace(/^\/+/, ''));
          await fs.promises.unlink(oldPath).catch(() => { });
        }
      } catch (err) {
        console.error('Failed to remove old published doc:', err);
      }
    } else if (documentLink !== undefined) {
      finalDocumentLink = documentLink; // Could be empty string if clearing, but usually handled by frontend logic
    }

    // Determine final grantDocumentLink
    const grantFile = req.files?.grantDocumentFile?.[0];
    let finalGrantDocLink = entry.grantDocumentLink;

    if (grantFile) {
      finalGrantDocLink = `/uploads/${grantFile.filename}`;
      try {
        if (entry.grantDocumentLink?.startsWith('/uploads/')) {
          const oldPath = path.join(__dirname, '..', entry.grantDocumentLink.replace(/^\/+/, ''));
          await fs.promises.unlink(oldPath).catch(() => { });
        }
      } catch (err) {
        console.error('Failed to remove old grant doc:', err);
      }
    } else if (grantDocumentLink !== undefined) {
       finalGrantDocLink = grantDocumentLink;
    }

    const queryParams = [
        emailSanitized ?? null,
        facultyNameSanitized ?? null,
        designationSanitized ?? null,
        departmentSanitized ?? null,
        casteSanitized ?? null,
        coApplicantsSanitized ?? null,
        patentIdSanitized ?? null,
        patentTitleSanitized ?? null,
        finalPatentType ?? null,
        approvalTypeSanitized ?? null,
        formatDateForMySQL(filingDateSanitized ?? null),
        formatDateForMySQL(grantingDateSanitized ?? null),
        formatDateForMySQL(publishingDateSanitized ?? null),
        finalDocumentLink ?? null,
        finalGrantDocLink ?? null,
        authorsSanitized ?? null,
        id
      ];

    console.log("DEBUG: Running UPDATE query with params:", queryParams);

    const updateQuery = `UPDATE patents 
      SET 
        email = COALESCE(?, email),
        facultyName = COALESCE(?, facultyName),
        designation = COALESCE(?, designation),
        department = COALESCE(?, department),
        caste = COALESCE(?, caste),
        coApplicants = COALESCE(?, coApplicants),
        patentId = COALESCE(?, patentId),
        patentTitle = COALESCE(?, patentTitle),
        patentType = COALESCE(?, patentType),
        approvalType = COALESCE(?, approvalType),
        filingDate = COALESCE(?, filingDate),
        grantingDate = COALESCE(?, grantingDate),
        publishingDate = COALESCE(?, publishingDate),
        documentLink = ?,
        grantDocumentLink = ?,
        authors = COALESCE(?, authors)
      WHERE id = ?`;

    await db.query(updateQuery, queryParams);

    await logAction(userEmail, "UPDATE", `Updated patent ID: ${id} - ${patentTitle || entry.patentTitle}`);
    return res.status(200).json({ message: "Patent updated successfully" });

  } catch (e) {
    console.error("Update error STACK:", e);
    if (e instanceof multer.MulterError || e?.message === 'Only PDF files are allowed') {
      return res.status(400).json({ message: e.message || 'File upload error' });
    }
    // Return actual error message for debugging
    return res.status(500).json({ 
        message: "Internal server error", 
        error: e.message,
        stack: process.env.NODE_ENV === 'development' ? e.stack : undefined
    });
  }
});

router.delete("/deleteEntry/:id", verifyToken, requireAnyAdmin, async (req, res) => {
  const { id } = req.params;
  const userEmail = req.user.userEmail;
  try {
    // Check ownership
    const [rows] = await db.query("SELECT email, documentLink, grantDocumentLink, department FROM patents WHERE id = ?", [id]);
    const entry = rows[0];

    if (!entry) {
      return res.status(404).json({ message: "Patent not found" });
    }

    const isSuperUser = req.user.role === 'super_admin';

    // Check department access for sub-admins
    if (req.user.role === 'sub_admin' && entry.department !== req.user.department) {
      return res.status(403).json({
        message: `You can only delete patents from your department (${req.user.department})`
      });
    }

    // 2. Delete
    // If files stored locally, remove them
    try {
      if (entry.documentLink?.startsWith('/uploads/')) {
        const filePath = path.join(__dirname, '..', entry.documentLink.replace(/^\/+/, ''));
        await fs.promises.unlink(filePath).catch(() => { });
      }
      if (entry.grantDocumentLink?.startsWith('/uploads/')) {
        const filePath = path.join(__dirname, '..', entry.grantDocumentLink.replace(/^\/+/, ''));
        await fs.promises.unlink(filePath).catch(() => { });
      }
    } catch (err) {
      console.error('Failed to remove file on delete:', err);
    }

    await db.query("DELETE FROM patents WHERE id = ?", [id]);

    await logAction(userEmail, "DELETE", `Deleted patent ID: ${id}`);

    return res
      .status(200)
      .json({ message: "Patent deleted successfully" });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// GET route - Public access (no auth required)
// Sub-admins with valid token see only their department's data; everyone else sees all.
router.get("/formGet", async (req, res) => {
  try {
    // Pagination parameters
    const pageParam = req.query.page;
    const limitParam = req.query.limit;
    const search = req.query.search || '';

    const page = pageParam ? parseInt(pageParam, 10) : null;
    const limit = limitParam ? parseInt(limitParam, 10) : null;

    // Soft Authentication
    let user = null;
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
      try {
        // Verify token to identify sub-admins
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        user = decoded;
      } catch (err) {
        // Ignore invalid tokens for public view
      }
    }

    console.log('📊 /formGet called:', {
      page, limit, search,
      userRole: user?.role || 'public',
      userDept: user?.department || 'N/A'
    });

    let searchCondition = '';
    let searchParams = [];

    // DEPARTMENT FILTERING FOR SUB-ADMINS ONLY
    if (user && user.role === 'sub_admin') {
      searchCondition = 'WHERE department = ?';
      searchParams.push(user.department);

      if (search) {
        searchCondition += ` AND (
          facultyName LIKE ? OR
          email LIKE ? OR
          patentTitle LIKE ? OR
          patentId LIKE ?)`;
        const searchTerm = `%${search}%`;
        searchParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }
    } else {
      // Public Users & Super Admins -> Show All
      if (search) {
        searchCondition = `WHERE 
          facultyName LIKE ? OR
          email LIKE ? OR
          department LIKE ? OR
          patentTitle LIKE ? OR
          patentId LIKE ?`;
        const searchTerm = `%${search}%`;
        searchParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
      }
    }

    // Pagination Logic
    if (page && limit && !isNaN(page) && !isNaN(limit) && page > 0 && limit > 0) {
      const offset = (page - 1) * limit;

      // Get total count
      const [countResult] = await db.query(
        `SELECT COUNT(*) as total FROM patents ${searchCondition}`,
        searchParams
      );
      const total = countResult[0].total;

      // Get paginated data
      const [rows] = await db.query(
        `SELECT * FROM patents ${searchCondition} ORDER BY id DESC LIMIT ? OFFSET ?`,
        [...searchParams, limit, offset]
      );

      return res.json({
        data: rows,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      });
    } else {
      // No pagination - return all (filtered)
      const [rows] = await db.query(`SELECT * FROM patents ${searchCondition} ORDER BY id DESC`, searchParams);
      return res.json(rows);
    }
  } catch (e) {
    console.error("Error in /formGet:", e);
    return res.status(500).json({ message: "error reading database", error: e.message });
  }
});


// Excel download - requires authentication; sub-admins get department-filtered data
router.get("/downloadExcel", verifyToken, async (req, res) => {
  try {
    // Filter by department for sub-admins only
    let query = "SELECT * FROM patents";
    let params = [];

    if (req.user && req.user.role === 'sub_admin') {
      query += " WHERE department = ?";
      params.push(req.user.department);
    }

    const [rows] = await db.query(query, params);

    // Determine base URL for file links
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const baseUrl = `${protocol}://${host}`;

    // Convert relative paths to absolute URLs
    rows.forEach(row => {
      if (row.documentLink) {
        if (row.documentLink === 'https://example.com/grant/3') {
          row.documentLink = '';
        } else if (row.documentLink.startsWith('/')) {
          row.documentLink = `${baseUrl}${row.documentLink}`;
        }
      }
      
      if (row.grantDocumentLink) {
        if (row.grantDocumentLink === 'https://example.com/grant/3') {
          row.grantDocumentLink = '';
        } else if (row.grantDocumentLink.startsWith('/')) {
          row.grantDocumentLink = `${baseUrl}${row.grantDocumentLink}`;
        }
      }
    });

    // Create workbook + sheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Patents");

    // 1. Add Title Row
    worksheet.mergeCells("A1:Q1");
    const titleRow = worksheet.getRow(1);
    titleRow.getCell(1).value = "FACULTY PATENTS";
    titleRow.getCell(1).font = {
      name: "Arial",
      family: 4,
      size: 16,
      bold: true,
    };
    titleRow.getCell(1).alignment = { vertical: "middle", horizontal: "center" };
    titleRow.height = 30;

    // 2. Define Headers & Widths manually
    const columns = [
      { header: "ID", key: "id", width: 10 },
      { header: "Email", key: "email", width: 30 },
      { header: "Faculty Name", key: "facultyName", width: 25 },
      { header: "Department", key: "department", width: 20 },
      { header: "Designation", key: "designation", width: 25 },
      { header: "Caste", key: "caste", width: 10 },
      { header: "Patent ID", key: "patentId", width: 20 },
      { header: "Patent Title", key: "patentTitle", width: 40 },
      { header: "Authors", key: "authors", width: 25 },
      { header: "Co-Applicants", key: "coApplicants", width: 30 },
      { header: "Patent Type", key: "patentType", width: 15 },
      { header: "Approval Type", key: "approvalType", width: 15 },
      { header: "Filing Date", key: "filingDate", width: 20 },
      { header: "Publishing Date", key: "publishingDate", width: 20 },
      { header: "Granting Date", key: "grantingDate", width: 20 },
      { header: "Proof of Publish", key: "documentLink", width: 40 },
      { header: "Proof of Grant", key: "grantDocumentLink", width: 40 },
    ];

    // Set widths
    columns.forEach((col, index) => {
      worksheet.getColumn(index + 1).width = col.width;
    });

    // Add Header Row at Row 2
    const headerRow = worksheet.addRow(columns.map((c) => c.header));

    // Style Header Row
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } }; // White text
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4CAF50" }, // Green background
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    });
    headerRow.height = 25; // Header height

    // 3. Add Data Rows
    rows.forEach((row) => {
      const rowData = columns.map((col) => row[col.key]);
      const newRow = worksheet.addRow(rowData);

      // Style Data Cells: Alignment and Wrap Text for readability
      newRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
    });



    // Response headers for browser download
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=patents.xlsx"
    );

    // Write workbook to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Excel generation error:", err);
    res.status(500).json({ message: "Failed to generate Excel file" });
  }
});

router.get("/downloadTemplate", async (req, res) => {
  try {
    // Generate a new workbook for the template
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Patents");

    // 1. Add Title Row
    worksheet.mergeCells("A1:P1");
    const titleRow = worksheet.getRow(1);
    titleRow.getCell(1).value = "FACULTY PATENTS";
    titleRow.getCell(1).font = {
      name: "Arial",
      family: 4,
      size: 16,
      bold: true,
    };
    titleRow.getCell(1).alignment = { vertical: "middle", horizontal: "center" };
    titleRow.height = 30;

    // 2. Define Headers & Widths manually with helpful hints
    const columns = [
      { header: "Email (faculty@domain.com)", width: 35 },
      { header: "Faculty Name (Dr. John Doe)", width: 30 },
      { header: "Department (CSE/ECE/EEE/MECH/CIVIL/IT/AIML/CSD/CSM/FED/MBA)", width: 60 },
      { header: "Designation (Professor/Associate Professor/etc)", width: 40 },
      { header: "Caste (SC/ST/OC/OBC/BC)", width: 25 },
      { header: "Patent ID (e.g. US1234567)", width: 25 },
      { header: "Patent Title", width: 45 },
      { header: "Authors (1st Author/2nd Author/3rd Author/4th Author/5th Author/Others)", width: 60 },
      { header: "Co-Applicants (Name1, Name2, Name3)", width: 35 },
      { header: "Patent Type (Utility or Design)", width: 30 },
      { header: "Approval Type (Granted or Published)", width: 30 },
      { header: "Filing Date (YYYY-MM-DD) - REQUIRED", width: 40 },
      { header: "Publishing Date (YYYY-MM-DD)", width: 60 },
      { header: "Granting Date (YYYY-MM-DD)", width: 40 },
      { header: "Proof of Publish Link (https://...)", width: 45 },
      { header: "Proof of Grant Link (https://...)", width: 45 },
    ];

    // Set widths
    columns.forEach((col, index) => {
      worksheet.getColumn(index + 1).width = col.width;
    });

    // Add Header Row at Row 2
    const headerRow = worksheet.addRow(columns.map((c) => c.header));

    // Style Header Row
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } }; // White text
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4CAF50" }, // Green background
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    });
    headerRow.height = 25; // Header height

    // Response headers for browser download
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=patents_template.xlsx"
    );

    // Write workbook to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (e) {
    console.error("Template download error:", e);
    res.status(500).json({ message: "Server error", error: e.message });
  }
});

export default router;
