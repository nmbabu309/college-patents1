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
import { logAction } from "../utils/logger.js";
import Joi from 'joi';

const router = Router();

// ── Joi validation schemas ──
const ALLOWED_DEPARTMENTS = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AIML', 'CSD', 'CSM', 'FED', 'MBA'];

const patentSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  facultyName: Joi.string().min(1).max(255).required().messages({
    'any.required': 'Faculty name is required'
  }),
  department: Joi.string().valid(...ALLOWED_DEPARTMENTS).required().messages({
    'any.only': `Department must be one of: ${ALLOWED_DEPARTMENTS.join(', ')}`,
    'any.required': 'Department is required'
  }),
  designation: Joi.string().min(1).max(255).required().messages({
    'any.required': 'Designation is required'
  }),
  caste: Joi.string().allow('', null).optional(),
  patentId: Joi.string().min(1).max(255).required().messages({
    'any.required': 'Patent ID is required'
  }),
  patentTitle: Joi.string().min(1).max(1000).required().messages({
    'any.required': 'Patent title is required'
  }),
  patentType: Joi.string().valid('Utility', 'Design').default('Utility'),
  approvalType: Joi.string().valid('Published', 'Granted').default('Published'),
  authors: Joi.string().allow('', null).optional(),
  coApplicants: Joi.string().allow('', null).optional(),
  filingDate: Joi.string().min(1).required().messages({
    'any.required': 'Filing date is required'
  }),
  publishingDate: Joi.string().min(1).required().messages({
    'any.required': 'Publishing date is required'
  }),
  grantingDate: Joi.string().allow('', null).optional(),
}).options({ stripUnknown: true });

// Validation middleware factory
const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const messages = error.details.map(d => d.message).join('; ');
    return res.status(400).json({ message: messages });
  }
  req.validatedBody = value;
  next();
};
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for local disk uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let subfolder = '';
    if (file.fieldname === 'documentFile') {
      subfolder = 'proof_of_publish';
    } else if (file.fieldname === 'grantDocumentFile') {
      subfolder = 'proof_of_grant';
    }

    const uploadPath = path.join(__dirname, '../uploads', subfolder);
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Attempt to extract values from req.body (depends on frontend appending them BEFORE files)
    const rawPatentId = req.body.patentId || 'Unknown-Patent';
    const rawEmail = req.body.email || 'Unknown-Email';

    // Sanitize to prevent directory traversal or filesystem issues
    const safePatentId = rawPatentId.replace(/[^a-zA-Z0-9-]/g, '');
    const cleanEmail = rawEmail.split('@')[0].replace(/[^a-zA-Z0-9.\-]/g, ''); // Extract just the username piece

    // Determine document type
    const typeLabel = file.fieldname === 'documentFile' ? 'publish' : 'grant';

    // Format: [Patent ID]_[User Email]_[Type].pdf
    // Append a tiny random string if needed, but uniqueness is naturally guaranteed per user per patent.
    const finalName = `${safePatentId}_${cleanEmail}_${typeLabel}.pdf`;
    
    cb(null, finalName);
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

// Validate date requirements - Filing and Publishing are required, Granting is optional
const validatePatentDates = (patentType, filingDate, grantingDate, publishingDate) => {
  if (!patentType || (patentType !== 'Utility' && patentType !== 'Design')) {
    return { valid: false, message: "Patent type must be either 'Utility' or 'Design'" };
  }

  // Filing date is required for all patent types
  if (!filingDate || !formatDateForMySQL(filingDate)) {
    return { valid: false, message: "Filing date is required" };
  }

  // Publishing date is required for all patent types
  if (!publishingDate || !formatDateForMySQL(publishingDate)) {
    return { valid: false, message: "Publishing date is required" };
  }

  // Granting date is optional for all patent types

  return { valid: true };
};



router.post("/formEntry", verifyToken, requireAnyAdmin, uploadFields, async (req, res) => {
  // Validate request body with Joi schema
  const { error: validationError, value: validatedData } = patentSchema.validate(req.body, { abortEarly: false });
  if (validationError) {
    // Clean up any uploaded files since validation failed
    try {
      if (req.files?.documentFile?.[0]?.path) fs.unlinkSync(req.files.documentFile[0].path);
      if (req.files?.grantDocumentFile?.[0]?.path) fs.unlinkSync(req.files.grantDocumentFile[0].path);
    } catch (cleanupErr) { /* ignore cleanup errors */ }

    const messages = validationError.details.map(d => d.message).join('; ');
    return res.status(400).json({ message: messages });
  }

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
  } = validatedData;

  // Require uploaded PDF for published document (mandatory)
  const docFile = req.files?.documentFile?.[0];
  const grantFile = req.files?.grantDocumentFile?.[0];

  if (!docFile) {
    return res.status(400).json({ message: "Proof of Publish (PDF) is required." });
  }

  const finalDocumentLink = docFile ? `/uploads/proof_of_publish/${docFile.filename}` : null;
  const finalGrantDocLink = grantFile ? `/uploads/proof_of_grant/${grantFile.filename}` : null;

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

    // Clean up uploaded files on failure
    try {
      if (docFile && docFile.path) {
        fs.unlinkSync(docFile.path);
        console.log('Cleaned up document file after failure:', docFile.path);
      }
      if (grantFile && grantFile.path) {
        fs.unlinkSync(grantFile.path);
        console.log('Cleaned up grant file after failure:', grantFile.path);
      }
    } catch (cleanupErr) {
      console.error('Failed to clean up files:', cleanupErr);
    }

    // Multer/file validation errors -> respond 400
    if (e instanceof multer.MulterError || e?.message === 'Only PDF files are allowed') {
      return res.status(400).json({ message: e.message || 'File upload error' });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Bulk import endpoint - accepts URL-based document links (no file upload required)
router.post("/bulkImport", verifyToken, requireAnyAdmin, async (req, res) => {
  const entries = req.body;

  if (!Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ message: "Array of patent entries required" });
  }

  const results = {
    successful: [],
    failed: [],
    total: entries.length
  };

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const rowNumber = i + 2; // Excel row number (1-indexed + header)

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
      documentLink,
      grantDocumentLink
    } = entry;

    try {
      // Validate required fields
      if (!email || !facultyName || !department || !patentId || !patentTitle) {
        throw new Error("Missing required fields: email, facultyName, department, patentId, patentTitle");
      }

      // Validate patent type
      const finalPatentType = patentType || 'Utility';
      if (finalPatentType !== 'Utility' && finalPatentType !== 'Design') {
        throw new Error(`Invalid patent type: ${finalPatentType}. Must be 'Utility' or 'Design'`);
      }

      // Validate dates
      const dateValidation = validatePatentDates(finalPatentType, filingDate, grantingDate, publishingDate);
      if (!dateValidation.valid) {
        throw new Error(dateValidation.message);
      }

      // Check department access for sub-admins
      if (req.user.role === 'sub_admin' && department !== req.user.department) {
        throw new Error(`You can only add patents for your department (${req.user.department})`);
      }

      // Check for duplicates
      const [existingRows] = await db.query(
        "SELECT 1 FROM patents WHERE patentId = ? AND email = ?",
        [patentId, email]
      );
      if (existingRows.length > 0) {
        throw new Error("Duplicate entry: This patent already exists for this email");
      }

      // Insert into database
      await db.query(
        `INSERT INTO patents 
        (email, facultyName, designation, department, caste, coApplicants, patentId, patentTitle, patentType, approvalType, filingDate, grantingDate, publishingDate, documentLink, grantDocumentLink, authors)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          email,
          facultyName,
          designation || null,
          department,
          caste || null,
          coApplicants || null,
          patentId,
          patentTitle,
          finalPatentType,
          approvalType || 'Published',
          formatDateForMySQL(filingDate),
          formatDateForMySQL(grantingDate),
          formatDateForMySQL(publishingDate),
          documentLink || null,
          grantDocumentLink || null,
          authors || null
        ]
      );

      results.successful.push({ rowNumber, patentId, patentTitle });

    } catch (err) {
      results.failed.push({
        rowNumber,
        patentId: patentId || 'N/A',
        patentTitle: patentTitle || 'N/A',
        error: err.message
      });
    }
  }

  await logAction(
    req.user.userEmail,
    "BULK_IMPORT",
    `Bulk import: ${results.successful.length} successful, ${results.failed.length} failed`
  );

  return res.status(200).json({
    message: "Bulk import completed",
    ...results
  });
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
    authors,
  } = req.body;

  const userEmail = req.user.userEmail;

  try {
    // Fetch existing entry
    const [rows] = await db.query("SELECT email, documentLink, grantDocumentLink, patentType, department FROM patents WHERE id = ?", [id]);
    const entry = rows[0];

    if (!entry) {
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

    // Use provided patentType or keep existing one
    const finalPatentType = patentType || entry.patentType || 'Utility';

    // Validate date requirements based on patent type
    const dateValidation = validatePatentDates(finalPatentType, filingDate, grantingDate, publishingDate);
    if (!dateValidation.valid) {
      return res.status(400).json({ message: dateValidation.message });
    }

    // Determine final documentLink: prefer uploaded file, otherwise keep existing
    const docFile = req.files?.documentFile?.[0];
    let finalDocumentLink = entry.documentLink;
    if (docFile) {
      finalDocumentLink = `/uploads/proof_of_publish/${docFile.filename}`;
      try {
        if (entry.documentLink?.startsWith('/uploads/')) {
          const oldPath = path.join(__dirname, '..', entry.documentLink.replace(/^\/+/, ''));
          await fs.promises.unlink(oldPath).catch(() => { });
        }
      } catch (err) {
        console.error('Failed to remove old published doc:', err);
      }
    }

    // Determine final grantDocumentLink
    const grantFile = req.files?.grantDocumentFile?.[0];
    let finalGrantDocLink = entry.grantDocumentLink;
    if (grantFile) {
      finalGrantDocLink = `/uploads/proof_of_grant/${grantFile.filename}`;
      try {
        if (entry.grantDocumentLink?.startsWith('/uploads/')) {
          const oldPath = path.join(__dirname, '..', entry.grantDocumentLink.replace(/^\/+/, ''));
          await fs.promises.unlink(oldPath).catch(() => { });
        }
      } catch (err) {
        console.error('Failed to remove old grant doc:', err);
      }
    }

    await db.query(
      `UPDATE patents 
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
    `,
      [
        email ?? null,
        facultyName ?? null,
        designation ?? null,
        department ?? null,
        caste ?? null,
        coApplicants ?? null,
        patentId ?? null,
        patentTitle ?? null,
        finalPatentType ?? null,
        approvalType ?? null,
        formatDateForMySQL(filingDate ?? null),
        formatDateForMySQL(grantingDate ?? null),
        formatDateForMySQL(publishingDate ?? null),
        finalDocumentLink ?? null,
        finalGrantDocLink ?? null,
        authors ?? null,
        id
      ]
    );

    await logAction(userEmail, "UPDATE", `Updated patent ID: ${id} - ${patentTitle}`);
    return res.status(200).json({ message: "Patent updated successfully" });

  } catch (e) {
    console.error("Update error:", e);
    if (e instanceof multer.MulterError || e?.message === 'Only PDF files are allowed') {
      return res.status(400).json({ message: e.message || 'File upload error' });
    }
    return res.status(500).json({ message: "Internal server error" });
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
    // If files stored locally, strictly try to delete them
    try {
      if (entry.documentLink?.startsWith('/uploads/')) {
        const filePath = path.join(__dirname, '..', entry.documentLink.replace(/^\/+/, ''));
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath);
          console.log(`[Delete] Removed physical file: ${filePath}`);
        }
      }
      if (entry.grantDocumentLink?.startsWith('/uploads/')) {
        const filePath = path.join(__dirname, '..', entry.grantDocumentLink.replace(/^\/+/, ''));
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath);
          console.log(`[Delete] Removed physical file: ${filePath}`);
        }
      }
    } catch (err) {
      console.error('[Delete] Failed to physically remove file on delete (it might already be missing):', err);
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
    const filtersParam = req.query.filters;
    const sortKeyParam = req.query.sortKey;
    const sortDirectionParam = req.query.sortDirection;

    const page = pageParam ? parseInt(pageParam, 10) : null;
    const limit = limitParam ? parseInt(limitParam, 10) : null;
    
    let filters = {};
    if (filtersParam) {
      try { filters = JSON.parse(filtersParam); } catch (e) {}
    }

    // Soft Authentication
    let user = null;
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        user = decoded;
      } catch (err) {}
    }

    console.log('📊 /formGet called:', {
      page, limit, filters, sortKeyParam, sortDirectionParam,
      userRole: user?.role || 'public',
      userDept: user?.department || 'N/A'
    });

    let conditions = [];
    let searchParams = [];

    // DEPARTMENT FILTERING FOR SUB-ADMINS ONLY
    if (user && user.role === 'sub_admin') {
      conditions.push('department = ?');
      searchParams.push(user.department);
    }

    // Process dynamic filters
    const allowedColumns = ['facultyName', 'email', 'department', 'designation', 'caste', 'patentId', 'patentTitle', 'authors', 'coApplicants', 'patentType', 'approvalType', 'filingDate', 'publishingDate', 'grantingDate'];
    for (const [key, value] of Object.entries(filters)) {
      if (value && allowedColumns.includes(key)) {
        conditions.push(`${key} LIKE ?`);
        searchParams.push(`%${value}%`);
      }
    }

    const searchCondition = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    // Secure sorting
    const safeSortKey = allowedColumns.includes(sortKeyParam) ? sortKeyParam : 'id';
    const safeSortDirection = sortDirectionParam === 'desc' ? 'DESC' : 'ASC';
    
    // For id, we originally defaulted to DESC, let's keep that default if no sortKey provided
    const finalSortDirection = (!sortKeyParam) ? 'DESC' : safeSortDirection;
    const orderClause = `ORDER BY \`${safeSortKey}\` ${finalSortDirection}`;

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
        `SELECT * FROM patents ${searchCondition} ${orderClause} LIMIT ? OFFSET ?`,
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
      const [rows] = await db.query(`SELECT * FROM patents ${searchCondition} ${orderClause}`, searchParams);
      return res.json(rows);
    }
  } catch (e) {
    console.error("Error in /formGet:", e);
    return res.status(500).json({ message: "error reading database", error: e.message });
  }
});


// Excel download - Public access (no auth required) — supports optional filters
router.get("/downloadExcel", async (req, res) => {
  try {
    // Build filter conditions (same logic as /formGet)
    const filtersParam = req.query.filters;
    const filters = filtersParam ? JSON.parse(filtersParam) : {};
    const allowedFilterColumns = ['facultyName', 'email', 'department', 'designation', 'caste', 'patentId', 'patentTitle', 'authors', 'coApplicants', 'patentType', 'approvalType', 'filingDate', 'publishingDate', 'grantingDate'];

    let conditions = [];
    let searchParams = [];

    for (const [key, value] of Object.entries(filters)) {
      if (value && allowedFilterColumns.includes(key)) {
        conditions.push(`\`${key}\` LIKE ?`);
        searchParams.push(`%${value}%`);
      }
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const query = `SELECT * FROM patents ${whereClause} ORDER BY id DESC`;
    const [rows] = await db.query(query, searchParams);

    // Construct base URL for document links
    const baseUrl = `${req.protocol}://${req.get('host')}`;

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
      { header: "Proof of Publish Link", key: "documentLink", width: 50 },
      { header: "Proof of Grant Link", key: "grantDocumentLink", width: 50 },
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
      // Process document links to be absolute URLs
      let docLink = row.documentLink;
      if (docLink && docLink.startsWith('/uploads/')) {
        docLink = `${baseUrl}${docLink}`;
      }

      let grantLink = row.grantDocumentLink;
      if (grantLink && grantLink.startsWith('/uploads/')) {
        grantLink = `${baseUrl}${grantLink}`;
      }

      const rowData = columns.map((col) => {
        if (col.key === 'documentLink') return docLink;
        if (col.key === 'grantDocumentLink') return grantLink;
        return row[col.key];
      });

      const newRow = worksheet.addRow(rowData);

      // Style Data Cells
      newRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };

        // Add Hyperlink logic for document columns (16 and 17 are the link columns based on array index + 1)
        if ((colNumber === 16 || colNumber === 17) && cell.value && cell.value.toString().startsWith('http')) {
          cell.value = {
            text: cell.value,
            hyperlink: cell.value,
            tooltip: 'Click to open document'
          };
          cell.font = { color: { argb: 'FF0000FF' }, underline: true };
        }
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
    worksheet.mergeCells("A1:O1");
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
