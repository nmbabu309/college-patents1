import { useState, useEffect, useRef } from 'react';
import { Save, User, Mail, Building2, Users, FileText, Calendar, Link, CheckCircle2, Sparkles, Award, GraduationCap, ArrowRight, Upload, X, File } from 'lucide-react';
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
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef(null);
    const dragCounter = useRef(0);

    const initialForm = {
        email: '',
        facultyName: '',
        designation: '',
        customDesignation: '',
        department: '',
        coApplicants: '',
        patentId: '',
        patentTitle: '',
        patentType: 'Utility',
        approvalType: '',
        dateOfApproval: '',
        filingDate: '',
        grantingDate: '',
        publishingDate: '',
        authors: '',
        customRole: ''
    };

    const [formData, setFormData] = useState(initialForm);
    const [showOtherDesignation, setShowOtherDesignation] = useState(false);
    const [showOtherAuthors, setShowOtherAuthors] = useState(false);
    const [validationErrors, setValidationErrors] = useState({ email: '' });


    const validateEmail = (email) => {
        if (!email || email.trim() === '') return '';
        if (!isValidEmailDomain(email)) {
            return getEmailDomainError();
        }
        return '';
    };

    useEffect(() => {
        if (initialData) {
            // Merge initialData with defaults to ensure all new fields are present
            setFormData({
                ...initialForm,
                ...initialData,
                patentType: initialData.patentType || 'Utility' // Default to Utility for backward compatibility
            });
            const standardDesignations = ['Professor', 'Associate Professor', 'Assistant Professor', 'Research Scholar', ''];
            if (!standardDesignations.includes(initialData.designation)) {
                setShowOtherDesignation(true);
                setFormData(prev => ({ ...prev, customDesignation: initialData.designation, designation: 'Other' }));
            }
            // Check if authors is a custom role (not in predefined list)
            const standardAuthors = ['1st Author', '2nd Author', '3rd Author', '4th Author', '5th Author', ''];
            if (initialData.authors && !standardAuthors.includes(initialData.authors)) {
                setShowOtherAuthors(true);
                setFormData(prev => ({ ...prev, customRole: initialData.authors, authors: 'Others' }));
            }
        } else if (isSubAdmin() && user?.department) {
            // Pre-fill and lock department for sub-admins
            setFormData(prev => ({ ...prev, department: user.department }));
        }
    }, [initialData, user]);

    const handleChange = (e) => {
        const { name, value } = e.target;



        if (name === 'facultyName') {
            // Allow letters, numbers, spaces, and dots
            if (value && !/^[a-zA-Z0-9\s.]*$/.test(value)) return;
        }

        if (name === 'coApplicants') {
            // Allow letters, numbers, spaces, dots, and commas
            if (value && !/^[a-zA-Z0-9\s.,]*$/.test(value)) return;
        }

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
            const error = validateEmail(value);
            setValidationErrors(prev => ({ ...prev, email: error }));
        }

        const newFormData = { ...formData, [name]: value };
        setFormData(newFormData);

        // Trigger live search for side panel if available
        if (onFormChange && typeof onFormChange === 'function') {
            // Debounce could be added here or in parent
            onFormChange(newFormData);
        }
    };

    const handleSubmit = async () => {
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

        // Validate date requirements based on patent type
        const patentType = formData.patentType || 'Utility';
        if (patentType === 'Utility') {
            if (!formData.filingDate) {
                toast.error('Filing date is required for Utility patents.');
                setLoading(false);
                return;
            }
            if (!formData.grantingDate) {
                toast.error('Granting date is required for Utility patents.');
                setLoading(false);
                return;
            }
            // publishingDate is optional for Utility patents
        } else if (patentType === 'Design') {
            if (!formData.filingDate) {
                toast.error('Filing date is required for Design patents.');
                setLoading(false);
                return;
            }
            if (!formData.grantingDate) {
                toast.error('Granting date is required for Design patents.');
                setLoading(false);
                return;
            }
            if (!formData.publishingDate) {
                toast.error('Publishing date is required for Design patents.');
                setLoading(false);
                return;
            }
        }

        try {
            // Use customDesignation if "Other" is selected, and customRole if "Others" is selected for authors
            const submitData = {
                ...formData,
                designation: showOtherDesignation ? formData.customDesignation : formData.designation,
                authors: showOtherAuthors ? formData.customRole : formData.authors,
                patentType: patentType
            };

            // For create: require an uploaded PDF. For update: file optional.
            if (!initialData && !selectedFile) {
                toast.error('Document PDF is required.');
                setLoading(false);
                return;
            }

            // Always submit as FormData. Append file only if present.
            const form = new FormData();
            // Only append fields we want to store (omit documentLink)
            Object.entries(submitData).forEach(([k, v]) => {
                if (v !== undefined && v !== null) form.append(k, v);
            });
            if (selectedFile) form.append('documentFile', selectedFile);

            if (initialData) {
                await api.put('/form/formEntryUpdate', form);
                toast.success('Patent updated successfully!');
            } else {
                await api.post('/form/formEntry', form);
                toast.success('Patent submitted successfully!');
                setFormData(initialForm);
                setShowOtherDesignation(false);
                setShowOtherAuthors(false);
                setSelectedFile(null);
            }

            setTimeout(() => {
                if (onSuccess) onSuccess();
                if (onClose && !initialData) {
                    onClose();
                }
            }, 1500);

        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Failed to save patent. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Premium Input Styles
    const inputWrapperClass = "relative group";
    const inputClass = "w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-700 placeholder:text-slate-400 hover:border-slate-300";
    const iconClass = "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors";
    const labelClass = "block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1";

    // Section Container
    const sectionClass = "p-8 bg-white rounded-2xl border border-slate-100 shadow-sm relative"; // Removed overflow-hidden
    const backgroundContainerClass = "absolute inset-0 overflow-hidden rounded-2xl pointer-events-none";
    const sectionHeaderClass = "flex items-center gap-3 mb-6 relative z-10";

    return (
        <form ref={formRef} onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
        }} className="space-y-8">

            {/* Faculty Information Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className={sectionClass}
            >
                {/* Decorative background element */}
                <div className={backgroundContainerClass}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50"></div>
                </div>

                <div className={sectionHeaderClass}>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-sm">
                        <GraduationCap size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 font-heading">Faculty Details</h3>
                        <p className="text-xs text-slate-500 font-medium">Primary researcher information</p>
                    </div>
                </div>

                <div className="space-y-6 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className={inputWrapperClass}>
                            <label className={labelClass}>Faculty Name *</label>
                            <div className="relative">
                                <User size={18} className={iconClass} />
                                <input
                                    required
                                    name="facultyName"
                                    value={formData.facultyName || ''}
                                    onChange={handleChange}
                                    className={inputClass}
                                    placeholder="e.g. Dr. Jane Smith"
                                />
                            </div>
                        </div>

                        <div className={inputWrapperClass}>
                            <label className={labelClass}>Email Address *</label>
                            <div className="relative">
                                <Mail size={18} className={iconClass} />
                                <input
                                    required
                                    type="email"
                                    name="email"
                                    value={formData.email || ''}
                                    onChange={handleChange}
                                    className={`${inputClass} ${validationErrors.email ? 'border-red-500 focus:ring-red-500/20' : ''}`}
                                    placeholder={ALLOWED_EMAIL_DOMAINS.length > 0 ? `name@${ALLOWED_EMAIL_DOMAINS[0]}` : "email@example.com"}
                                />
                            </div>
                            {validationErrors.email && (
                                <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1 font-medium">
                                    <span className="w-1 h-1 rounded-full bg-red-600"></span> {validationErrors.email}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className={inputWrapperClass}>
                            <label className={labelClass}>Department *</label>
                            <div className="relative">
                                <Building2 size={18} className={iconClass} />
                                <select
                                    required
                                    name="department"
                                    value={formData.department || ''}
                                    onChange={handleChange}
                                    disabled={isSubAdmin()}
                                    className={`${inputClass} appearance-none cursor-pointer disabled:opacity-70 disabled:bg-slate-100 disabled:cursor-not-allowed`}
                                >
                                    <option value="">Select Department</option>
                                    <option value="CSE">CSE</option>
                                    <option value="ECE">ECE</option>
                                    <option value="EEE">EEE</option>
                                    <option value="MECH">MECH</option>
                                    <option value="CIVIL">CIVIL</option>
                                    <option value="IT">IT</option>
                                    <option value="AIML">AIML</option>
                                    <option value="CSD">CSD</option>
                                    <option value="CSM">CSM</option>
                                    <option value="FED">FED</option>
                                    <option value="MBA">MBA</option>
                                </select>
                            </div>
                        </div>

                        <div className={inputWrapperClass}>
                            <label className={labelClass}>Designation *</label>
                            <div className="relative">
                                <Award size={18} className={iconClass} />
                                <select
                                    required
                                    name="designation"
                                    value={showOtherDesignation ? 'Other' : (formData.designation || '')}
                                    onChange={handleChange}
                                    className={`${inputClass} appearance-none cursor-pointer`}
                                >
                                    <option value="">Select Designation</option>
                                    <option value="Professor">Professor</option>
                                    <option value="Associate Professor">Associate Professor</option>
                                    <option value="Assistant Professor">Assistant Professor</option>
                                    <option value="Research Scholar">Research Scholar</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <AnimatePresence>
                                {showOtherDesignation && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                        animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="relative">
                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                                            <input
                                                required={showOtherDesignation}
                                                name="customDesignation"
                                                value={formData.customDesignation || ''}
                                                onChange={handleChange}
                                                className={inputClass}
                                                placeholder="Enter specific designation"
                                            />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className={inputWrapperClass}>
                            <label className={labelClass}>Co-Applicants</label>
                            <div className="relative">
                                <Users size={18} className={iconClass} />
                                <input
                                    name="coApplicants"
                                    value={formData.coApplicants || ''}
                                    onChange={handleChange}
                                    className={inputClass}
                                    placeholder="Names separated by commas"
                                />
                            </div>
                        </div>

                        <div className={inputWrapperClass}>
                            <label className={labelClass}>Author Position *</label>
                            <div className="relative">
                                <Users size={18} className={iconClass} />
                                <select
                                    required
                                    name="authors"
                                    value={showOtherAuthors ? 'Others' : (formData.authors || '')}
                                    onChange={handleChange}
                                    className={`${inputClass} appearance-none cursor-pointer`}
                                >
                                    <option value="">Select Position</option>
                                    <option value="1st Author">1st Author</option>
                                    <option value="2nd Author">2nd Author</option>
                                    <option value="3rd Author">3rd Author</option>
                                    <option value="4th Author">4th Author</option>
                                    <option value="5th Author">5th Author</option>
                                    <option value="Others">Others</option>
                                </select>
                            </div>
                            <AnimatePresence>
                                {showOtherAuthors && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                        animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="relative">
                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                                            <input
                                                required={showOtherAuthors}
                                                name="customRole"
                                                value={formData.customRole || ''}
                                                onChange={handleChange}
                                                className={inputClass}
                                                placeholder="Specify custom role"
                                            />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Patent Information Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className={sectionClass}
            >
                {/* Decorative background element */}
                <div className={backgroundContainerClass}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50"></div>
                </div>

                <div className={sectionHeaderClass}>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100 shadow-sm">
                        <FileText size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 font-heading">Patent Information</h3>
                        <p className="text-xs text-slate-500 font-medium">Intellectual property details</p>
                    </div>
                </div>

                <div className="space-y-6 relative z-10">
                    <div className={inputWrapperClass}>
                        <label className={labelClass}>Patent Title *</label>
                        <div className="relative">
                            <Sparkles size={18} className={iconClass} />
                            <textarea
                                required
                                rows="2"
                                name="patentTitle"
                                value={formData.patentTitle || ''}
                                onChange={handleChange}
                                className={`${inputClass} resize-none`}
                                placeholder="Full title of the patent/invention"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className={inputWrapperClass}>
                            <label className={labelClass}>Patent Type *</label>
                            <div className="relative">
                                <Award size={18} className={iconClass} />
                                <select
                                    required
                                    name="patentType"
                                    value={formData.patentType || 'Utility'}
                                    onChange={handleChange}
                                    className={`${inputClass} appearance-none cursor-pointer`}
                                >
                                    <option value="Utility">Utility</option>
                                    <option value="Design">Design</option>
                                </select>
                            </div>
                        </div>

                        <div className={inputWrapperClass}>
                            <label className={labelClass}>Patent ID Number *</label>
                            <div className="relative">
                                <CheckCircle2 size={18} className={iconClass} />
                                <input
                                    required
                                    name="patentId"
                                    value={formData.patentId || ''}
                                    onChange={handleChange}
                                    className={inputClass}
                                    placeholder="e.g. US1234567"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className={inputWrapperClass}>
                            <label className={labelClass}>Approval Status *</label>
                            <div className="relative">
                                <Award size={18} className={iconClass} />
                                <select
                                    required
                                    name="approvalType"
                                    value={formData.approvalType || ''}
                                    onChange={handleChange}
                                    className={`${inputClass} appearance-none cursor-pointer`}
                                >
                                    <option value="">Select Status</option>
                                    <option value="Granted">Granted</option>
                                    <option value="Published">Published</option>
                                </select>
                            </div>
                        </div>

                        <div className={inputWrapperClass}>
                            <CustomDatePicker
                                label="Date of Publication/Grant"
                                required={true}
                                value={formData.dateOfApproval}
                                onChange={(val) => setFormData(prev => ({ ...prev, dateOfApproval: val }))}
                                maxDate={new Date().toISOString().split('T')[0]}
                            />
                        </div>
                    </div>

                    {/* Date Fields Based on Patent Type */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className={inputWrapperClass}>
                            <CustomDatePicker
                                label="Filing Date"
                                required={true}
                                value={formData.filingDate}
                                onChange={(val) => setFormData(prev => ({ ...prev, filingDate: val }))}
                                maxDate={new Date().toISOString().split('T')[0]}
                            />
                        </div>

                        <div className={inputWrapperClass}>
                            <CustomDatePicker
                                label="Granting Date"
                                required={true}
                                value={formData.grantingDate}
                                onChange={(val) => setFormData(prev => ({ ...prev, grantingDate: val }))}
                                maxDate={new Date().toISOString().split('T')[0]}
                            />
                        </div>

                        <div className={inputWrapperClass}>
                            <CustomDatePicker
                                label="Publishing Date"
                                required={formData.patentType === 'Design'}
                                value={formData.publishingDate}
                                onChange={(val) => setFormData(prev => ({ ...prev, publishingDate: val }))}
                                maxDate={new Date().toISOString().split('T')[0]}
                            />
                            {formData.patentType === 'Utility' && (
                                <p className="text-xs text-slate-500 mt-1 ml-1">Optional for Utility patents</p>
                            )}
                        </div>
                    </div>

                    {/* Document Upload Section */}
                    <div className={inputWrapperClass}>
                        <label className={labelClass}>Patent Document (PDF) *</label>
                        <input
                            ref={fileInputRef}
                            type="file"
                            name="documentFile"
                            accept=".pdf"
                            onChange={(e) => {
                                const f = e.target.files && e.target.files[0] ? e.target.files[0] : null;
                                if (!f) {
                                    setSelectedFile(null);
                                    return;
                                }
                                if (f.type !== 'application/pdf') {
                                    toast.error('Only PDF files are allowed.');
                                    e.target.value = '';
                                    setSelectedFile(null);
                                    return;
                                }
                                const maxBytes = 5 * 1024 * 1024;
                                if (f.size > maxBytes) {
                                    toast.error('File size must be 5MB or less.');
                                    e.target.value = '';
                                    setSelectedFile(null);
                                    return;
                                }
                                setSelectedFile(f);
                            }}
                            className="hidden"
                        />
                        <div
                            className={`relative border-2 border-dashed rounded-xl p-8 transition-all flex flex-col items-center justify-center ${dragActive
                                ? 'border-indigo-500 bg-indigo-50/50'
                                : selectedFile
                                    ? 'border-emerald-300 bg-emerald-50/50'
                                    : 'border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/30'
                                } cursor-pointer group`}
                            onDragEnter={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                dragCounter.current++;
                                setDragActive(true);
                            }}
                            onDragLeave={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                dragCounter.current--;
                                if (dragCounter.current === 0) {
                                    setDragActive(false);
                                }
                            }}
                            onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                            }}
                            onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                dragCounter.current = 0;
                                setDragActive(false);
                                const f = e.dataTransfer.files && e.dataTransfer.files[0] ? e.dataTransfer.files[0] : null;
                                if (!f) return;
                                if (f.type !== 'application/pdf') {
                                    toast.error('Only PDF files are allowed.');
                                    return;
                                }
                                const maxBytes = 5 * 1024 * 1024;
                                if (f.size > maxBytes) {
                                    toast.error('File size must be 5MB or less.');
                                    return;
                                }
                                setSelectedFile(f);
                            }}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {selectedFile ? (
                                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full">
                                    <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-emerald-200 shadow-sm">
                                        <div className="flex-shrink-0 w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                                            <File size={24} className="text-emerald-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-800 truncate">{selectedFile.name}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedFile(null);
                                                if (fileInputRef.current) fileInputRef.current.value = '';
                                            }}
                                            className="flex-shrink-0 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            fileInputRef.current?.click();
                                        }}
                                        className="mt-3 w-full py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                                    >
                                        Change File
                                    </button>
                                </motion.div>
                            ) : (
                                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
                                    <div className="w-16 h-16 mx-auto mb-4 bg-indigo-100 rounded-xl flex items-center justify-center group-hover:bg-indigo-200 transition-all">
                                        <Upload size={32} className="text-indigo-600" />
                                    </div>
                                    <p className="text-base font-semibold text-slate-800 mb-1">Upload your patent document</p>
                                    <p className="text-sm text-slate-500 mb-4">Drag and drop your PDF here or click to browse</p>
                                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-all">
                                        <Upload size={16} />
                                        Choose PDF File
                                    </div>
                                    <p className="text-xs text-slate-400 mt-3">PDF only • Max 5MB</p>
                                </motion.div>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Action Bar */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="pt-4"
            >
                <div className="flex gap-4">
                    {initialData && onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl shadow-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                        >
                            Cancel
                        </button>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 py-4 bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 text-white font-bold rounded-xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 group"
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white/50"></div>
                                <span>Processing...</span>
                            </>
                        ) : (
                            <>
                                <Save size={20} className="group-hover:scale-110 transition-transform" />
                                <span>{initialData ? 'Update Patent Record' : 'Submit Patent Record'}</span>
                                {!initialData && <ArrowRight size={18} className="opacity-70 group-hover:translate-x-1 transition-transform" />}
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </form>
    );
};

export default UploadForm;
