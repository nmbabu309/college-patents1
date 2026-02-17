import { useState, useEffect, useRef } from 'react';
import { Save, User, Mail, Building2, Users, FileText, Calendar, CheckCircle2, Sparkles, Award, GraduationCap, ArrowRight, Upload, X, File } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { isValidEmailDomain, getEmailDomainError, ALLOWED_EMAIL_DOMAINS } from '../../config/constants';
import api from '../../api/axios';
import CustomDatePicker from '../common/CustomDatePicker';
import { useAuth } from '../../context/AuthContext';

const UploadForm = ({ onSuccess, initialData = null, onClose, hideSuccessPopup = false, onFormChange }) => {
    const { user, isSubAdmin } = useAuth();
    const [loading, setLoading] = useState(false);
    const formRef = useRef(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedGrantFile, setSelectedGrantFile] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const [dragActiveGrant, setDragActiveGrant] = useState(false);
    const fileInputRef = useRef(null);
    const grantFileInputRef = useRef(null);
    const dragCounter = useRef(0);
    const grantDragCounter = useRef(0);

    const initialForm = {
        facultyName: '',
        email: '',
        department: '',
        designation: '',
        customDesignation: '',
        caste: '',
        patentId: '',
        patentTitle: '',
        authors: '',
        customRole: '',
        coApplicants: '',
        patentType: 'Utility',
        approvalType: 'Published',
        filingDate: '',
        publishingDate: '',
        grantingDate: ''
    };

    const [formData, setFormData] = useState(initialForm);
    const [showOtherDesignation, setShowOtherDesignation] = useState(false);
    const [showOtherAuthors, setShowOtherAuthors] = useState(false);
    const [validationErrors, setValidationErrors] = useState({ email: '' });

    // Validate email domain
    const validateEmail = (email) => {
        if (!email || email.trim() === '') return '';
        if (!isValidEmailDomain(email)) {
            return getEmailDomainError();
        }
        return '';
    };

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialForm,
                ...initialData,
                approvalType: initialData.approvalType || 'Published'
            });

            // Handle custom designation
            const standardDesignations = ['Professor', 'Associate Professor', 'Assistant Professor', 'Research Scholar', ''];
            if (!standardDesignations.includes(initialData.designation)) {
                setShowOtherDesignation(true);
                setFormData(prev => ({ ...prev, customDesignation: initialData.designation, designation: 'Other' }));
            }

            // Handle custom authors
            const standardAuthors = ['1st Author', '2nd Author', '3rd Author', '4th Author', '5th Author', '6th Author', '7th Author', '8th Author'];
            if (initialData.authors && !standardAuthors.includes(initialData.authors)) {
                setShowOtherAuthors(true);
                setFormData(prev => ({ ...prev, customRole: initialData.authors, authors: 'Others' }));
            }
        } else if (isSubAdmin() && user?.department) {
            setFormData(prev => ({ ...prev, department: user.department }));
        }
    }, [initialData, user]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === 'facultyName' && value && !/^[a-zA-Z0-9\s.]*$/.test(value)) return;
        if (name === 'coApplicants' && value && !/^[a-zA-Z0-9\s.,]*$/.test(value)) return;

        if (name === 'designation') {
            if (value === 'Other') {
                setShowOtherDesignation(true);
                setFormData(prev => ({ ...prev, designation: 'Other', customDesignation: '' }));
                return;
            } else {
                setShowOtherDesignation(false);
                setFormData(prev => ({ ...prev, designation: value, customDesignation: '' }));
                return;
            }
        }

        if (name === 'authors') {
            if (value === 'Others') {
                setShowOtherAuthors(true);
                setFormData(prev => ({ ...prev, authors: 'Others', customRole: '' }));
                return;
            } else {
                setShowOtherAuthors(false);
                setFormData(prev => ({ ...prev, authors: value, customRole: '' }));
                return;
            }
        }

        if (name === 'email') {
            setValidationErrors(prev => ({ ...prev, email: validateEmail(value) }));
        }

        const newFormData = { ...formData, [name]: value };
        setFormData(newFormData);
        if (onFormChange) onFormChange(true);
    };

    const handleDateChange = (name, date) => {
        if (date) {
            const offsetDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
            const formattedDate = offsetDate.toISOString().split('T')[0];
            setFormData(prev => ({ ...prev, [name]: formattedDate }));
        } else {
            setFormData(prev => ({ ...prev, [name]: '' }));
        }
        if (onFormChange) onFormChange(true);
    };

    // Helper to validate and set a PDF file
    const handlePdfSelect = (file, setter) => {
        if (!file) { setter(null); return false; }
        if (file.type !== 'application/pdf') {
            toast.error('Only PDF files are allowed.');
            setter(null);
            return false;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error('File size must be 5MB or less.');
            setter(null);
            return false;
        }
        setter(file);
        if (onFormChange) onFormChange(true);
        return true;
    };

    const removeFile = (type) => {
        if (type === 'grant') {
            setSelectedGrantFile(null);
            if (grantFileInputRef.current) grantFileInputRef.current.value = '';
        } else {
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
        if (onFormChange) onFormChange(true);
    };

    const handleSubmit = async (e) => {
        // Handle explicit submit or form submit event
        if (e) e.preventDefault();

        if (formRef.current && !formRef.current.reportValidity()) {
            return;
        }

        setLoading(true);

        const emailError = validateEmail(formData.email);
        if (emailError) {
            setValidationErrors({ email: emailError });
            toast.error('Please fix validation errors before submitting.');
            setLoading(false);
            return;
        }

        // Validate date & file requirements based on approval type
        if (!formData.filingDate) {
            toast.error('Filing date is required.');
            setLoading(false);
            return;
        }

        if (formData.approvalType === 'Published') {
            if (!formData.publishingDate) {
                toast.error('Publishing Date is required for Published patents.');
                setLoading(false);
                return;
            }
            if (!selectedFile && !initialData?.documentLink) {
                toast.error('Proof of Publish (PDF) is required for Published patents.');
                setLoading(false);
                return;
            }
        }
        else if (formData.approvalType === 'Granted') {
            if (!formData.grantingDate) {
                toast.error('Granting Date is required for Granted patents.');
                setLoading(false);
                return;
            }
            if (!selectedGrantFile && !initialData?.grantDocumentLink) {
                toast.error('Proof of Grant (PDF) is required for Granted patents.');
                setLoading(false);
                return;
            }
        }

        try {
            let submitData = {
                ...formData,
                designation: showOtherDesignation ? formData.customDesignation : formData.designation,
                authors: showOtherAuthors ? formData.customRole : formData.authors
            };

            // Smart Merging: If updating, only send changed fields
            if (initialData) {
                const dirtyData = {};
                let hasChanges = false;

                Object.keys(submitData).forEach(key => {
                    // Normalize values for comparison
                    let originalVal = initialData[key];
                    let newVal = submitData[key];

                    // Handle Dates (DB ISO vs Form YYYY-MM-DD)
                    if (originalVal && (key.includes('Date') || typeof originalVal === 'string') && originalVal.includes('T')) {
                        originalVal = originalVal.split('T')[0];
                    }

                    // Handle null/undefined vs empty string
                    const nDesc = (val) => val === null || val === undefined ? '' : String(val).trim();

                    if (nDesc(originalVal) !== nDesc(newVal)) {
                        dirtyData[key] = newVal;
                        hasChanges = true;
                    }
                });

                // Files are always changes if selected
                if (selectedFile || selectedGrantFile) {
                    hasChanges = true;
                }

                if (!hasChanges) {
                    toast.success('No changes detected');
                    setLoading(false);
                    if (onClose) onClose();
                    return;
                }

                // Replace submitData with only dirty fields
                submitData = dirtyData;
            }

            const form = new FormData();
            // Exclude 'id', 'customDesignation', 'customRole' from spread to avoid duplicates
            // basic keys are effectively filtered by dirtyData in update mode, or full in create mode
            // We still need to exclude internal helpers if they leaked into dirtyData (unlikely but safe to keep)
            const excludeKeys = ['id', 'customDesignation', 'customRole'];
            Object.entries(submitData).forEach(([k, v]) => {
                if (v !== undefined && v !== null && !excludeKeys.includes(k)) form.append(k, v);
            });
            if (selectedFile) form.append('documentFile', selectedFile);
            if (selectedGrantFile) form.append('grantDocumentFile', selectedGrantFile);
            if (initialData?.id) form.append('id', initialData.id);

            const url = initialData ? '/form/formEntryUpdate' : '/form/formEntry';
            const method = initialData ? 'put' : 'post';

            await api[method](url, form);

            if (!hideSuccessPopup) {
                toast.success(initialData ? 'Patent updated successfully!' : 'Patent submitted successfully!');
            }

            if (!initialData) {
                setFormData(initialForm);
                setShowOtherDesignation(false);
                setShowOtherAuthors(false);
                setSelectedFile(null);
                setSelectedGrantFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
                if (grantFileInputRef.current) grantFileInputRef.current.value = '';
            }

            if (onSuccess) onSuccess();
            if (onClose) onClose();

        } catch (error) {
            console.error(error);
            const message = error.response?.data?.message || (initialData ? 'Update failed' : 'Submission failed');
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    // Premium Input Styles
    const inputWrapperClass = "relative group";
    const inputClass = "w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-all font-medium text-slate-700 placeholder:text-slate-400 hover:border-slate-300";
    const iconClass = "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-600 transition-colors";
    const labelClass = "block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 ml-1";

    // Section Container
    const sectionClass = "p-8 bg-white rounded-2xl border border-slate-200/80 shadow-sm relative";
    const backgroundContainerClass = "absolute inset-0 overflow-hidden rounded-2xl pointer-events-none";
    const sectionHeaderClass = "flex items-center gap-3 mb-6 relative z-10";

    // Reusable file upload zone
    const FileUploadZone = ({ label, required, file, setFile, inputRef, dragActiveState, setDragActiveState, counterRef, existingLink }) => (
        <div className={inputWrapperClass}>
            <label className={labelClass}>{label} {required && <span className="text-red-500">*</span>}</label>
            <input
                ref={inputRef}
                type="file"
                accept=".pdf"
                onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    if (!handlePdfSelect(f, setFile)) {
                        e.target.value = '';
                    }
                }}
                className="hidden"
            />
            <div
                className={`relative border-2 border-dashed rounded-xl p-6 transition-all flex flex-col items-center justify-center ${dragActiveState
                    ? 'border-slate-400 bg-slate-50'
                    : file
                        ? 'border-emerald-200 bg-emerald-50/30'
                        : existingLink
                            ? 'border-slate-300 bg-slate-50/50'
                            : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-50'
                    } cursor-pointer group`}
                onDragEnter={(e) => {
                    e.preventDefault(); e.stopPropagation();
                    counterRef.current++;
                    setDragActiveState(true);
                }}
                onDragLeave={(e) => {
                    e.preventDefault(); e.stopPropagation();
                    counterRef.current--;
                    if (counterRef.current === 0) setDragActiveState(false);
                }}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                    e.preventDefault(); e.stopPropagation();
                    counterRef.current = 0;
                    setDragActiveState(false);
                    const f = e.dataTransfer.files?.[0] || null;
                    handlePdfSelect(f, setFile);
                }}
                onClick={() => inputRef.current?.click()}
            >
                {file ? (
                    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full">
                        <div className="flex items-center gap-4 p-3 bg-white rounded-lg border border-emerald-200 shadow-sm">
                            <div className="flex-shrink-0 w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                                <File size={20} className="text-emerald-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-800 truncate">{file.name}</p>
                                <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setFile(null);
                                    if (inputRef.current) inputRef.current.value = '';
                                    if (onFormChange) onFormChange(true);
                                }}
                                className="flex-shrink-0 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                            className="mt-2 w-full py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-colors"
                        >
                            Change File
                        </button>
                    </motion.div>
                ) : existingLink ? (
                    <div className="text-center">
                        <div className="w-12 h-12 mx-auto mb-3 bg-blue-100 rounded-xl flex items-center justify-center">
                            <File size={24} className="text-blue-600" />
                        </div>
                        <p className="text-sm font-medium text-slate-600 mb-1">Current document on file</p>
                        <p className="text-xs text-slate-400 mb-3">Click or drag to replace</p>
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-800 transition-all text-sm">
                            <Upload size={14} />
                            Replace File
                        </div>
                    </div>
                ) : (
                    <div className="text-center">
                        <div className="w-14 h-14 mx-auto mb-3 bg-slate-100 rounded-xl flex items-center justify-center group-hover:bg-slate-200 transition-all">
                            <Upload size={28} className="text-slate-500" />
                        </div>
                        <p className="text-sm font-semibold text-slate-700 mb-1">Drag & drop or click to browse</p>
                        <p className="text-xs text-slate-400">PDF only • Max 5MB</p>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className={sectionClass}>
                <div className={backgroundContainerClass}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-100 rounded-full blur-3xl -mr-16 -mt-16 opacity-40"></div>
                </div>
                <div className={sectionHeaderClass}>
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 border border-slate-200 shadow-sm">
                        <GraduationCap size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 font-heading">Faculty Details</h3>
                        <p className="text-xs text-slate-400 font-medium">Primary researcher information</p>
                    </div>
                </div>

                <div className="space-y-6 relative z-10">
                    {/* 1. Faculty Name */}
                    <div className={inputWrapperClass}>
                        <label className={labelClass}>Faculty Name *</label>
                        <div className="relative">
                            <User size={18} className={iconClass} />
                            <input required name="facultyName" value={formData.facultyName || ''} onChange={handleChange} className={inputClass} placeholder="e.g. Dr. Jane Smith" />
                        </div>
                    </div>

                    {/* 2. Email */}
                    <div className={inputWrapperClass}>
                        <label className={labelClass}>Email Address *</label>
                        <div className="relative">
                            <Mail size={18} className={iconClass} />
                            <input required type="email" name="email" value={formData.email || ''} onChange={handleChange} className={`${inputClass} ${validationErrors.email ? 'border-red-500 focus:ring-red-500/20' : ''}`} placeholder={ALLOWED_EMAIL_DOMAINS.length > 0 ? `name@${ALLOWED_EMAIL_DOMAINS[0]}` : "email@example.com"} />
                        </div>
                        {validationErrors.email && <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1 font-medium"><span className="w-1 h-1 rounded-full bg-red-600"></span> {validationErrors.email}</p>}
                    </div>

                    {/* 3. Department & 4. Designation */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className={inputWrapperClass}>
                            <label className={labelClass}>Department *</label>
                            <div className="relative">
                                <Building2 size={18} className={iconClass} />
                                <select required name="department" value={formData.department || ''} onChange={handleChange} disabled={isSubAdmin()} className={`${inputClass} appearance-none cursor-pointer disabled:opacity-70 disabled:bg-slate-100 disabled:cursor-not-allowed`}>
                                    <option value="">Select Department</option>
                                    {['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AIML', 'CSD', 'CSM', 'FED', 'MBA'].map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className={inputWrapperClass}>
                            <label className={labelClass}>Designation *</label>
                            <div className="relative">
                                <Award size={18} className={iconClass} />
                                <select required name="designation" value={showOtherDesignation ? 'Other' : (formData.designation || '')} onChange={handleChange} className={`${inputClass} appearance-none cursor-pointer`}>
                                    <option value="">Select Designation</option>
                                    {['Professor', 'Associate Professor', 'Assistant Professor', 'Research Scholar', 'Other'].map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <AnimatePresence>
                                {showOtherDesignation && (
                                    <motion.div initial={{ opacity: 0, height: 0, marginTop: 0 }} animate={{ opacity: 1, height: 'auto', marginTop: 12 }} exit={{ opacity: 0, height: 0, marginTop: 0 }} className="overflow-hidden">
                                        <div className="relative">
                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                                            <input required={showOtherDesignation} name="customDesignation" value={formData.customDesignation || ''} onChange={handleChange} className={inputClass} placeholder="Enter specific designation" />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* 5. Caste */}
                    <div className={inputWrapperClass}>
                        <label className={labelClass}>Caste *</label>
                        <div className="relative">
                            <Users size={18} className={iconClass} />
                            <select required name="caste" value={formData.caste || ''} onChange={handleChange} className={`${inputClass} appearance-none cursor-pointer`}>
                                <option value="">Select Caste</option>
                                {['SC', 'ST', 'OC', 'BC', 'OBC'].map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className={sectionClass}>
                <div className={backgroundContainerClass}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-40"></div>
                </div>
                <div className={sectionHeaderClass}>
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700 border border-amber-100 shadow-sm">
                        <FileText size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 font-heading">Patent Information</h3>
                        <p className="text-xs text-slate-400 font-medium">Intellectual property details</p>
                    </div>
                </div>

                <div className="space-y-6 relative z-10">
                    {/* 6. Patent ID */}
                    <div className={inputWrapperClass}>
                        <label className={labelClass}>Patent ID Number *</label>
                        <div className="relative">
                            <CheckCircle2 size={18} className={iconClass} />
                            <input required name="patentId" value={formData.patentId || ''} onChange={handleChange} className={inputClass} placeholder="e.g. US1234567" />
                        </div>
                    </div>

                    {/* 7. Patent Title */}
                    <div className={inputWrapperClass}>
                        <label className={labelClass}>Patent Title *</label>
                        <div className="relative">
                            <Sparkles size={18} className={iconClass} />
                            <textarea required rows="2" name="patentTitle" value={formData.patentTitle || ''} onChange={handleChange} className={`${inputClass} resize-none`} placeholder="Full title of the patent/invention" />
                        </div>
                    </div>

                    {/* 8. Authors */}
                    <div className={inputWrapperClass}>
                        <label className={labelClass}>Author Position *</label>
                        <div className="relative">
                            <Users size={18} className={iconClass} />
                            <select required name="authors" value={showOtherAuthors ? 'Others' : (formData.authors || '')} onChange={handleChange} className={`${inputClass} appearance-none cursor-pointer`}>
                                <option value="">Select Position</option>
                                {['1st Author', '2nd Author', '3rd Author', '4th Author', '5th Author', 'Others'].map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>
                        <AnimatePresence>
                            {showOtherAuthors && (
                                <motion.div initial={{ opacity: 0, height: 0, marginTop: 0 }} animate={{ opacity: 1, height: 'auto', marginTop: 12 }} exit={{ opacity: 0, height: 0, marginTop: 0 }} className="overflow-hidden">
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                                        <input required={showOtherAuthors} name="customRole" value={formData.customRole || ''} onChange={handleChange} className={inputClass} placeholder="Specify custom role" />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* 9. Co-Applicants */}
                    <div className={inputWrapperClass}>
                        <label className={labelClass}>Co-Applicants *</label>
                        <div className="relative">
                            <Users size={18} className={iconClass} />
                            <input required name="coApplicants" value={formData.coApplicants || ''} onChange={handleChange} className={inputClass} placeholder="Names separated by commas" />
                        </div>
                    </div>

                    {/* 10. Patent Type & 11. Approval Type */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className={inputWrapperClass}>
                            <label className={labelClass}>Patent Type *</label>
                            <div className="relative">
                                <Award size={18} className={iconClass} />
                                <select required name="patentType" value={formData.patentType || 'Utility'} onChange={handleChange} className={`${inputClass} appearance-none cursor-pointer`}>
                                    <option value="Utility">Utility</option>
                                    <option value="Design">Design</option>
                                </select>
                            </div>
                        </div>
                        <div className={inputWrapperClass}>
                            <label className={labelClass}>Approval Type *</label>
                            <div className="relative">
                                <CheckCircle2 size={18} className={iconClass} />
                                <select required name="approvalType" value={formData.approvalType || 'Published'} onChange={handleChange} className={`${inputClass} appearance-none cursor-pointer`}>
                                    <option value="Published">Published</option>
                                    <option value="Granted">Granted</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* 12. Filing Date */}
                    <div className={inputWrapperClass}>
                        <CustomDatePicker label="Filing Date" required={true} value={formData.filingDate} onChange={(val) => handleDateChange('filingDate', val && new Date(val))} maxDate={new Date().toISOString().split('T')[0]} />
                    </div>

                    {/* 13. Publishing Date */}
                    <div className={inputWrapperClass}>
                        <CustomDatePicker
                            label="Publishing Date"
                            required={formData.approvalType === 'Published'}
                            value={formData.publishingDate}
                            onChange={(val) => handleDateChange('publishingDate', val && new Date(val))}
                            maxDate={new Date().toISOString().split('T')[0]}
                        />
                    </div>

                    {/* 14. Granting Date */}
                    <div className={inputWrapperClass}>
                        <CustomDatePicker
                            label="Granting Date"
                            required={formData.approvalType === 'Granted'}
                            value={formData.grantingDate}
                            onChange={(val) => handleDateChange('grantingDate', val && new Date(val))}
                            maxDate={new Date().toISOString().split('T')[0]}
                        />
                    </div>

                    {/* 15. Proof of Publish */}
                    <FileUploadZone
                        label="Proof of Published (Document)"
                        required={formData.approvalType === 'Published'}
                        file={selectedFile}
                        setFile={setSelectedFile}
                        inputRef={fileInputRef}
                        dragActiveState={dragActive}
                        setDragActiveState={setDragActive}
                        counterRef={dragCounter}
                        existingLink={initialData?.documentLink}
                    />

                    {/* 16. Proof of Grant */}
                    <FileUploadZone
                        label="Proof of Grant (Document)"
                        required={formData.approvalType === 'Granted'}
                        file={selectedGrantFile}
                        setFile={setSelectedGrantFile}
                        inputRef={grantFileInputRef}
                        dragActiveState={dragActiveGrant}
                        setDragActiveState={setDragActiveGrant}
                        counterRef={grantDragCounter}
                        existingLink={initialData?.grantDocumentLink}
                    />
                </div>
            </motion.div>

            {/* Action Bar */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }} className="pt-4">
                <div className="flex gap-4">
                    {initialData && onClose && (
                        <button type="button" onClick={onClose} className="flex-1 py-4 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl shadow-sm hover:bg-slate-50 transition-all">Cancel</button>
                    )}
                    <button type="submit" disabled={loading} className="flex-1 py-4 bg-[#1B2845] hover:bg-[#243656] text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 group">
                        {loading ? 'Processing...' : (
                            <>
                                <Save size={20} className="group-hover:scale-110 transition-transform" />
                                <span>{initialData ? 'Update Patent Record' : 'Submit Patent Record'}</span>
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </form>
    );
};

export default UploadForm;
