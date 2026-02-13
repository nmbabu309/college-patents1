import { Router } from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import { requireSuperAdmin, requireAnyAdmin } from "../middleware/authorization.js";
import { db } from "../db.js";
import bcrypt from "bcryptjs";

const router = Router();

// Helper function to log actions
const logAction = async (userEmail, action, details) => {
  try {
    await db.query(
      "INSERT INTO audit_logs (user_email, action, details) VALUES (?, ?, ?)",
      [userEmail, action, details]
    );
  } catch (err) {
    console.error("Failed to log action:", err);
  }
};

// Get current user info
router.get("/me", verifyToken, requireAnyAdmin, async (req, res) => {
  try {
    const [admins] = await db.query(
      "SELECT id, email, role, department, created_at FROM admins WHERE email = ?",
      [req.user.userEmail]
    );

    if (admins.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(admins[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch user info" });
  }
});

// Get all admins (super admin only)
router.get("/admins", verifyToken, requireSuperAdmin, async (req, res) => {
  try {
    const [admins] = await db.query(
      `SELECT id, email, role, department, created_at, 
       (SELECT email FROM admins AS creator WHERE creator.id = admins.created_by) AS created_by_email
       FROM admins 
       ORDER BY role DESC, created_at ASC`
    );
    return res.status(200).json(admins);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch admins" });
  }
});

// Add super admin (super admin only)
router.post("/super-admin", verifyToken, requireSuperAdmin, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Check if email already exists
    const [existing] = await db.query("SELECT id FROM admins WHERE email = ?", [email.toLowerCase().trim()]);
    if (existing.length > 0) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 10);

    // Insert new super admin
    await db.query(
      "INSERT INTO admins (email, password_hash, role, department, created_by) VALUES (?, ?, ?, ?, ?)",
      [email.toLowerCase().trim(), passwordHash, 'super_admin', null, req.user.adminId]
    );

    await logAction(req.user.userEmail, "CREATE_SUPER_ADMIN", `Created super admin: ${email}`);

    return res.status(200).json({ message: "Super admin created successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to create super admin" });
  }
});

// Add sub admin (super admin only)
router.post("/sub-admin", verifyToken, requireSuperAdmin, async (req, res) => {
  try {
    const { email, password, department } = req.body;

    if (!email || !password || !department) {
      return res.status(400).json({ message: "Email, password, and department are required" });
    }

    // Check if email already exists
    const [existing] = await db.query("SELECT id FROM admins WHERE email = ?", [email.toLowerCase().trim()]);
    if (existing.length > 0) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 10);

    // Insert new sub admin
    await db.query(
      "INSERT INTO admins (email, password_hash, role, department, created_by) VALUES (?, ?, ?, ?, ?)",
      [email.toLowerCase().trim(), passwordHash, 'sub_admin', department, req.user.adminId]
    );

    await logAction(req.user.userEmail, "CREATE_SUB_ADMIN", `Created sub admin for ${department}: ${email}`);

    return res.status(200).json({ message: "Sub admin created successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to create sub admin" });
  }
});

// Update admin password (super admin can update any, users can update own)
router.put("/:id/password", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ message: "New password is required" });
    }

    // Get target admin
    const [targetAdmins] = await db.query("SELECT id, email, role FROM admins WHERE id = ?", [id]);
    if (targetAdmins.length === 0) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const targetAdmin = targetAdmins[0];

    // Check permissions
    const isSelf = req.user.adminId === parseInt(id);
    const isSuper = req.user.role === 'super_admin';

    if (!isSelf && !isSuper) {
      return res.status(403).json({ message: "You can only change your own password" });
    }

    // Super admins cannot change other super admins' passwords (except their own)
    if (!isSelf && targetAdmin.role === 'super_admin') {
      return res.status(403).json({ message: "Cannot change another super admin's password" });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS) || 10);

    // Update password
    await db.query("UPDATE admins SET password_hash = ?, updated_at = NOW() WHERE id = ?", [passwordHash, id]);

    const actionDetail = isSelf
      ? "Changed own password"
      : `Reset password for ${targetAdmin.email}`;

    await logAction(req.user.userEmail, "PASSWORD_CHANGE", actionDetail);

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to update password" });
  }
});

// Change own password
router.put("/my-password", verifyToken, requireAnyAdmin, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new password are required" });
    }

    // Get current user
    const [admins] = await db.query(
      "SELECT id, email, password_hash FROM admins WHERE id = ?",
      [req.user.adminId]
    );

    if (admins.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const admin = admins[0];

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, admin.password_hash);
    if (!isValid) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS) || 10);

    // Update password
    await db.query("UPDATE admins SET password_hash = ?, updated_at = NOW() WHERE id = ?", [passwordHash, admin.id]);

    await logAction(req.user.userEmail, "PASSWORD_CHANGE", "Changed own password");

    return res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to change password" });
  }
});

// Delete admin (super admin only)
router.delete("/:id", verifyToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent self-deletion
    if (req.user.adminId === parseInt(id)) {
      return res.status(400).json({ message: "You cannot delete yourself" });
    }

    // Get admin info before deletion
    const [admins] = await db.query("SELECT email, role FROM admins WHERE id = ?", [id]);
    if (admins.length === 0) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const deletedAdmin = admins[0];

    // Delete admin
    await db.query("DELETE FROM admins WHERE id = ?", [id]);

    await logAction(
      req.user.userEmail,
      "DELETE_ADMIN",
      `Deleted ${deletedAdmin.role}: ${deletedAdmin.email}`
    );

    return res.status(200).json({ message: "Admin deleted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to delete admin" });
  }
});

// Update sub admin department (super admin only)
router.put("/:id/department", verifyToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { department } = req.body;

    if (!department) {
      return res.status(400).json({ message: "Department is required" });
    }

    // Get target admin
    const [targetAdmins] = await db.query("SELECT id, email, role FROM admins WHERE id = ?", [id]);
    if (targetAdmins.length === 0) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const targetAdmin = targetAdmins[0];

    // Cannot change super admin department
    if (targetAdmin.role === 'super_admin') {
      return res.status(400).json({ message: "Cannot assign department to super admin" });
    }

    // Update department
    await db.query("UPDATE admins SET department = ?, updated_at = NOW() WHERE id = ?", [department, id]);

    await logAction(
      req.user.userEmail,
      "UPDATE_DEPARTMENT",
      `Changed department for ${targetAdmin.email} to ${department}`
    );

    return res.status(200).json({ message: "Department updated successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to update department" });
  }
});

// Get audit logs (filtered by department for sub-admins)
router.get("/logs", verifyToken, requireAnyAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    let query = "SELECT * FROM audit_logs";
    let countQuery = "SELECT COUNT(*) as count FROM audit_logs";
    const params = [];

    // Sub-admins can only see logs related to their department
    if (req.user.role === 'sub_admin') {
      query += " WHERE details LIKE ?";
      countQuery += " WHERE details LIKE ?";
      params.push(`%${req.user.department}%`);
    }

    query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const [logs] = await db.query(query, params);
    const [countResult] = await db.query(countQuery, params.slice(0, params.length - 2));
    const totalLogs = countResult[0].count;

    return res.json({
      logs,
      total: totalLogs,
      page,
      totalPages: Math.ceil(totalLogs / limit)
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to fetch logs" });
  }
});

// Delete all patents (super admin only)
router.post("/deleteAll", verifyToken, requireSuperAdmin, async (req, res) => {
  try {
    await db.query("DELETE FROM patents");
    await logAction(req.user.userEmail, "DELETE_ALL", "Deleted all patents");
    return res.status(200).json({ message: "All patents deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to delete all" });
  }
});

// Get list of available departments
router.get("/departments", verifyToken, requireAnyAdmin, async (req, res) => {
  try {
    // Get distinct departments from patents table
    const [departments] = await db.query(
      "SELECT DISTINCT department FROM patents WHERE department IS NOT NULL AND department != '' ORDER BY department"
    );

    // Also get departments from sub-admins
    const [adminDepts] = await db.query(
      "SELECT DISTINCT department FROM admins WHERE role = 'sub_admin' AND department IS NOT NULL ORDER BY department"
    );

    // Combine and deduplicate
    const deptSet = new Set();
    departments.forEach(d => deptSet.add(d.department));
    adminDepts.forEach(d => deptSet.add(d.department));

    const allDepartments = Array.from(deptSet).sort();

    return res.status(200).json(allDepartments);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch departments" });
  }
});

// Dashboard stats
router.get("/stats", verifyToken, requireAnyAdmin, async (req, res) => {
  try {
    const isSuperAdmin = req.user.role === 'super_admin';
    const dept = req.user.department;

    // Patent count (filtered by department for sub-admins)
    let patentQuery = "SELECT COUNT(*) as count FROM patents";
    let patentParams = [];
    if (!isSuperAdmin && dept) {
      patentQuery += " WHERE department = ?";
      patentParams = [dept];
    }
    const [[{ count: totalPatents }]] = await db.query(patentQuery, patentParams);

    // Admin count (super-admin only)
    let totalAdmins = 0;
    if (isSuperAdmin) {
      const [[{ count }]] = await db.query("SELECT COUNT(*) as count FROM admins");
      totalAdmins = count;
    }

    // Log count
    let logQuery = "SELECT COUNT(*) as count FROM audit_logs";
    let logParams = [];
    if (!isSuperAdmin && dept) {
      logQuery += " WHERE details LIKE ?";
      logParams = [`%${dept}%`];
    }
    const [[{ count: totalLogs }]] = await db.query(logQuery, logParams);

    // Department count (super-admin only)
    let totalDepartments = 0;
    if (isSuperAdmin) {
      const [[{ count: deptCount }]] = await db.query(
        "SELECT COUNT(DISTINCT department) as count FROM patents WHERE department IS NOT NULL AND department != ''"
      );
      totalDepartments = deptCount;
    }

    return res.status(200).json({
      totalPatents,
      totalAdmins,
      totalLogs,
      totalDepartments,
      department: dept || null
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch stats" });
  }
});

export default router;
