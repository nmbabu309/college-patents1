import { useState, useEffect } from "react";
import {
    User, Trash2, Plus, Shield, AlertCircle, CheckCircle2,
    ChevronLeft, ChevronRight, RefreshCw, Activity,
    Users, Database, Lock, Search, Filter, Key, UserPlus,
    UserCog, Building2, Eye, EyeOff
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Header from "../common/Header";
import Footer from "../common/Footer";

// Stat Card Component
const StatCard = ({ title, value, icon: Icon, color, delay }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
        className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group"
    >
        <div className="flex justify-between items-start">
            <div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
                <h3 className="text-2xl font-bold text-slate-800 group-hover:text-primary transition-colors">{value}</h3>
            </div>
            <div className={`p-3 rounded-xl ${color} bg-opacity-10 text-opacity-100`}>
                <Icon size={20} className={`text-${color.split('-')[1]}-600`} />
            </div>
        </div>
    </motion.div>
);

const AdminPage = () => {
    const { user, isSuperAdmin, isAnyAdmin, isAuthenticated, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    const [admins, setAdmins] = useState([]);
    const [logs, setLogs] = useState([]);
    const [logPage, setLogPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Admin Creation States
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [adminType, setAdminType] = useState('sub_admin'); // 'super_admin' or 'sub_admin'
    const [newAdminEmail, setNewAdminEmail] = useState("");
    const [newAdminPassword, setNewAdminPassword] = useState("");
    const [newAdminDepartment, setNewAdminDepartment] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    // Password Reset States
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [selectedAdmin, setSelectedAdmin] = useState(null);
    const [newPassword, setNewPassword] = useState("");
    const [isResetting, setIsResetting] = useState(false);

    // Department Change States
    const [showDepartmentModal, setShowDepartmentModal] = useState(false);
    const [newDepartment, setNewDepartment] = useState("");
    const [isChangingDept, setIsChangingDept] = useState(false);

    const departments = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AIML', 'CSD', 'CSM', 'FED', 'MBA'];

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            navigate("/");
        }
    }, [isAuthenticated, authLoading, navigate]);

    useEffect(() => {
        if (!authLoading && isAnyAdmin()) {
            if (isSuperAdmin()) {
                fetchAdmins();
            }
            fetchLogs();
        }
    }, [authLoading, isAnyAdmin, isSuperAdmin]);

    if (authLoading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
    );

    if (!isAnyAdmin()) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 text-center max-w-md w-full"
                >
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Shield size={40} className="text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-2 font-heading">Access Restricted</h1>
                    <p className="text-slate-500 mb-8 leading-relaxed">
                        This area is reserved for system administrators. Please contact the IT department if you believe this is an error.
                    </p>
                    <button onClick={() => navigate("/")} className="w-full py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors">
                        Return to Home
                    </button>
                </motion.div>
            </div>
        );
    }

    const fetchLogs = async (page = 1, withAnimation = false) => {
        try {
            if (withAnimation) setIsRefreshing(true);
            const response = await api.get(`/admin/logs?page=${page}&limit=10`);
            setLogs(response.data.logs);
            setTotalPages(response.data.totalPages);
            setLogPage(page);
        } catch (err) {
            console.error("Failed to fetch logs", err);
        } finally {
            if (withAnimation) setTimeout(() => setIsRefreshing(false), 800);
        }
    };

    const fetchAdmins = async () => {
        try {
            setLoading(true);
            const response = await api.get("/admin/admins");
            setAdmins(response.data);
        } catch (err) {
            console.error(err);
            toast.error("Failed to fetch admins");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAdmin = async (e) => {
        e.preventDefault();

        if (!newAdminEmail || !newAdminPassword) {
            toast.error("Email and password are required");
            return;
        }

        if (adminType === 'sub_admin' && !newAdminDepartment) {
            toast.error("Department is required for Sub Admin");
            return;
        }

        try {
            setIsCreating(true);
            const endpoint = adminType === 'super_admin' ? '/admin/super-admin' : '/admin/sub-admin';
            const payload = {
                email: newAdminEmail,
                password: newAdminPassword,
                ...(adminType === 'sub_admin' && { department: newAdminDepartment })
            };

            await api.post(endpoint, payload);

            toast.success(`${adminType === 'super_admin' ? 'Super Admin' : 'Sub Admin'} created successfully`);
            setShowCreateModal(false);
            setNewAdminEmail("");
            setNewAdminPassword("");
            setNewAdminDepartment("");
            setAdminType('sub_admin');
            fetchAdmins();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to create admin");
        } finally {
            setIsCreating(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();

        if (!newPassword) {
            toast.error("New password is required");
            return;
        }

        try {
            setIsResetting(true);
            await api.put(`/admin/${selectedAdmin.id}/password`, { newPassword });
            toast.success(`Password reset successfully for ${selectedAdmin.email}`);
            setShowPasswordModal(false);
            setSelectedAdmin(null);
            setNewPassword("");
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to reset password");
        } finally {
            setIsResetting(false);
        }
    };

    const handleChangeDepartment = async (e) => {
        e.preventDefault();

        if (!newDepartment) {
            toast.error("Department is required");
            return;
        }

        try {
            setIsChangingDept(true);
            await api.put(`/admin/${selectedAdmin.id}/department`, { department: newDepartment });
            toast.success(`Department changed to ${newDepartment} for ${selectedAdmin.email}`);
            setShowDepartmentModal(false);
            setSelectedAdmin(null);
            setNewDepartment("");
            fetchAdmins();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to change department");
        } finally {
            setIsChangingDept(false);
        }
    };

    const handleDeleteAdmin = async (admin) => {
        if (!window.confirm(`Are you sure you want to delete ${admin.email}?\n\nThis action cannot be undone.`)) return;

        try {
            await api.delete(`/admin/${admin.id}`);
            toast.success(`Admin ${admin.email} deleted successfully`);
            fetchAdmins();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to delete admin");
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            <Header />
            <div className="h-32"></div> {/* Spacer for fixed header */}

            <main className="max-w-[1600px] mx-auto p-6 lg:p-10 space-y-8">

                {/* Dashboard Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 font-heading tracking-tight sm:text-4xl">
                            System Administration
                        </h1>
                        <p className="text-slate-500 mt-2 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            {isSuperAdmin() ? '👑 Super Admin Access' : '🏢 Sub Admin Access'} • {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/')}
                            className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2"
                        >
                            <ChevronLeft size={18} /> Exit Dashboard
                        </button>
                    </div>
                </header>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        title="Active Administrators"
                        value={admins.length}
                        icon={Users}
                        color="bg-indigo-500"
                        delay={0.1}
                    />
                    <StatCard
                        title="System Events Logged"
                        value={logs.length > 0 ? "2,540+" : "Loading..."}
                        icon={Activity}
                        color="bg-emerald-500"
                        delay={0.2}
                    />
                    <StatCard
                        title="Security Level"
                        value="High"
                        icon={Lock}
                        color="bg-amber-500"
                        delay={0.3}
                    />
                    <StatCard
                        title="Database Status"
                        value="Healthy"
                        icon={Database}
                        color="bg-blue-500"
                        delay={0.4}
                    />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                    {/* Left Column: Admin Management */}
                    <div className="space-y-8 xl:col-span-1">

                        {/* Create Admin Card - Super Admin Only */}
                        {isSuperAdmin() && (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5 }}
                                className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
                            >
                                <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-blue-50">
                                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                        <UserPlus size={20} className="text-indigo-600" />
                                        Admin Management
                                    </h2>
                                </div>
                                <div className="p-6 space-y-3">
                                    <button
                                        onClick={() => { setAdminType('super_admin'); setShowCreateModal(true); }}
                                        className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                                    >
                                        <Shield size={18} />
                                        Create Super Admin
                                    </button>
                                    <button
                                        onClick={() => { setAdminType('sub_admin'); setShowCreateModal(true); }}
                                        className="w-full py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                                    >
                                        <Building2 size={18} />
                                        Create Sub Admin
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* Current Admins List */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.6 }}
                            className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
                        >
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h2 className="text-lg font-bold text-slate-800">Administrators</h2>
                                <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-xs font-bold">{admins.length}</span>
                            </div>
                            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto custom-scrollbar">
                                {loading ? (
                                    [1, 2, 3].map(i => <div key={i} className="p-4 animate-pulse bg-slate-50 h-20 w-full"></div>)
                                ) : (
                                    admins.map(admin => (
                                        <div key={admin.id} className="p-4 hover:bg-slate-50 transition-colors group">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                                    <div className={`w-10 h-10 rounded-full ${admin.role === 'super_admin' ? 'bg-gradient-to-br from-purple-100 to-indigo-200 border-purple-300' : 'bg-gradient-to-br from-slate-100 to-slate-200 border-slate-300'} border-2 flex items-center justify-center text-slate-700 font-bold shadow-inner`}>
                                                        {admin.email.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="flex flex-col min-w-0 flex-1">
                                                        <span className="text-sm font-semibold text-slate-700 truncate">{admin.email}</span>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border ${admin.role === 'super_admin' ? 'bg-purple-50 text-purple-600 border-purple-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
                                                                {admin.role === 'super_admin' ? '👑 Super Admin' : '🏢 Sub Admin'}
                                                            </span>
                                                            {admin.department && (
                                                                <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                                                                    {admin.department}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Action Buttons - Super Admin Only */}
                                                {isSuperAdmin() && admin.email !== user?.userEmail && (
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => { setSelectedAdmin(admin); setShowPasswordModal(true); }}
                                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                            title="Reset Password"
                                                        >
                                                            <Key size={16} />
                                                        </button>
                                                        {admin.role === 'sub_admin' && (
                                                            <button
                                                                onClick={() => { setSelectedAdmin(admin); setNewDepartment(admin.department || ''); setShowDepartmentModal(true); }}
                                                                className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                                                                title="Change Department"
                                                            >
                                                                <Building2 size={16} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDeleteAdmin(admin)}
                                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                            title="Delete Admin"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                )}

                                                {admin.email === user?.userEmail && (
                                                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-600 px-2 py-1 rounded-md border border-emerald-200">YOU</span>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>

                        {/* Danger Zone - Super Admin Only */}
                        {isSuperAdmin() && (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.7 }}
                                className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden group"
                            >
                                <div className="p-6 bg-red-50/50 border-b border-red-100">
                                    <h2 className="text-lg font-bold text-red-900 flex items-center gap-2">
                                        <AlertCircle size={20} className="text-red-500" />
                                        Critical Actions
                                    </h2>
                                </div>
                                <div className="p-6">
                                    <div className="mb-4">
                                        <h4 className="text-sm font-bold text-slate-700">Database Reset</h4>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Permanently wipe all patent entries. Before proceeding, ensure a backup has been exported.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            const confirm = window.prompt("Type 'DELETE' to confirm destructive action:");
                                            if (confirm === "DELETE") {
                                                api.post("/admin/deleteAll")
                                                    .then(() => {
                                                        toast.success("Database reset complete");
                                                        fetchLogs();
                                                    })
                                                    .catch(err => toast.error("Reset failed"));
                                            }
                                        }}
                                        className="w-full py-2.5 bg-white border border-red-200 text-red-600 rounded-xl text-sm font-bold hover:bg-red-50 hover:border-red-300 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Trash2 size={16} />
                                        Reset Database
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* Right Column: Activity Logs */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 }}
                        className="bg-white rounded-3xl shadow-lg shadow-slate-200/50 border border-slate-100 xl:col-span-2 flex flex-col h-full overflow-hidden"
                    >
                        <div className="p-8 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/30">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                                    <Activity size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">Audit Trail</h2>
                                    <p className="text-sm text-slate-500">Real-time system monitoring</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => fetchLogs(1, true)}
                                    disabled={isRefreshing}
                                    className={`p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all ${isRefreshing ? 'opacity-80' : ''}`}
                                >
                                    <RefreshCw size={20} className={isRefreshing ? "animate-spin" : ""} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100">
                                        <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50 w-24">Action</th>
                                        <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50 w-64">User</th>
                                        <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">Details</th>
                                        <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50 w-48 text-right">Timestamp</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {logs.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="px-8 py-16 text-center">
                                                <div className="flex flex-col items-center justify-center gap-3 opacity-50">
                                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                                                        <Search size={32} className="text-slate-400" />
                                                    </div>
                                                    <p className="text-slate-500 font-medium">No activity recorded yet</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        logs.map((log, index) => (
                                            <motion.tr
                                                key={log.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                className="hover:bg-slate-50/80 transition-colors group"
                                            >
                                                <td className="px-8 py-5 align-top">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase border shadow-sm ${log.action === 'DELETE' || log.action === 'DELETE_ALL' ? 'bg-white text-red-600 border-red-100' :
                                                        log.action === 'CREATE' || log.action.includes('CREATE') ? 'bg-white text-emerald-600 border-emerald-100' :
                                                            log.action === 'UPDATE' || log.action === 'BATCH_UPDATE' || log.action.includes('UPDATE') || log.action.includes('PASSWORD') ? 'bg-white text-amber-600 border-amber-100' :
                                                                'bg-white text-indigo-600 border-indigo-100'
                                                        }`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${log.action === 'DELETE' || log.action === 'DELETE_ALL' ? 'bg-red-500' :
                                                            log.action === 'CREATE' || log.action.includes('CREATE') ? 'bg-emerald-500' :
                                                                log.action === 'UPDATE' || log.action === 'BATCH_UPDATE' || log.action.includes('UPDATE') || log.action.includes('PASSWORD') ? 'bg-amber-500' :
                                                                    'bg-indigo-500'
                                                            }`}></span>
                                                        {log.action}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 align-top">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 ring-2 ring-white shadow-sm">
                                                            {log.user_email?.charAt(0).toUpperCase()}
                                                        </div>
                                                        <span className="text-sm font-semibold text-slate-700">{log.user_email}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-sm text-slate-600 leading-relaxed font-medium">
                                                    {log.details}
                                                </td>
                                                <td className="px-8 py-5 text-xs text-slate-400 font-mono text-right whitespace-nowrap">
                                                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    <br />
                                                    <span className="opacity-75">{new Date(log.timestamp).toLocaleDateString()}</span>
                                                </td>
                                            </motion.tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Footer */}
                        <div className="p-6 border-t border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                Page {logPage} of {totalPages}
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => fetchLogs(logPage - 1)}
                                    disabled={logPage === 1}
                                    className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2"
                                >
                                    <ChevronLeft size={16} /> Previous
                                </button>
                                <button
                                    onClick={() => fetchLogs(logPage + 1)}
                                    disabled={logPage === totalPages}
                                    className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2"
                                >
                                    Next <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </main>

            {/* Create Admin Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowCreateModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                {adminType === 'super_admin' ? <Shield className="text-purple-600" /> : <Building2 className="text-blue-600" />}
                                Create {adminType === 'super_admin' ? 'Super Admin' : 'Sub Admin'}
                            </h2>

                            <form onSubmit={handleCreateAdmin} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
                                    <input
                                        type="email"
                                        value={newAdminEmail}
                                        onChange={(e) => setNewAdminEmail(e.target.value)}
                                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="admin@nriit.edu.in"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Password</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={newAdminPassword}
                                            onChange={(e) => setNewAdminPassword(e.target.value)}
                                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-12"
                                            placeholder="Strong password"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        >
                                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    </div>
                                </div>

                                {adminType === 'sub_admin' && (
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Department</label>
                                        <select
                                            value={newAdminDepartment}
                                            onChange={(e) => setNewAdminDepartment(e.target.value)}
                                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            required
                                        >
                                            <option value="">Select Department</option>
                                            {departments.map(dept => (
                                                <option key={dept} value={dept}>{dept}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="flex-1 py-3 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isCreating}
                                        className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50"
                                    >
                                        {isCreating ? "Creating..." : "Create Admin"}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Reset Password Modal */}
            <AnimatePresence>
                {showPasswordModal && selectedAdmin && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowPasswordModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2 className="text-2xl font-bold text-slate-900 mb-2 flex items-center gap-2">
                                <Key className="text-blue-600" />
                                Reset Password
                            </h2>
                            <p className="text-slate-600 mb-6">Resetting password for <span className="font-semibold">{selectedAdmin.email}</span></p>

                            <form onSubmit={handleResetPassword} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">New Password</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Enter new password"
                                        required
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswordModal(false)}
                                        className="flex-1 py-3 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isResetting}
                                        className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50"
                                    >
                                        {isResetting ? "Resetting..." : "Reset Password"}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Change Department Modal */}
            <AnimatePresence>
                {showDepartmentModal && selectedAdmin && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowDepartmentModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2 className="text-2xl font-bold text-slate-900 mb-2 flex items-center gap-2">
                                <Building2 className="text-green-600" />
                                Change Department
                            </h2>
                            <p className="text-slate-600 mb-6">Changing department for <span className="font-semibold">{selectedAdmin.email}</span></p>

                            <form onSubmit={handleChangeDepartment} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">New Department</label>
                                    <select
                                        value={newDepartment}
                                        onChange={(e) => setNewDepartment(e.target.value)}
                                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                                        required
                                    >
                                        <option value="">Select Department</option>
                                        {departments.map(dept => (
                                            <option key={dept} value={dept}>{dept}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowDepartmentModal(false)}
                                        className="flex-1 py-3 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isChangingDept}
                                        className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all disabled:opacity-50"
                                    >
                                        {isChangingDept ? "Updating..." : "Change Department"}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <Footer />
        </div>
    );
};

export default AdminPage;
