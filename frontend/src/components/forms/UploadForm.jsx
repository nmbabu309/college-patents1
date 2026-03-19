
import { useState } from "react";
import {
    Upload, FileText, CheckCircle, X,
    Calendar, User, Building2, Hash, FileCheck,
    Users, BookOpen, Clock, ShieldCheck
} from "lucide-react";
import api from "../../api/axios";
import toast from "react-hot-toast";
import CustomDatePicker from "../common/CustomDatePicker";
import { DEPARTMENTS } from "../../config/constants";

// Extracted Components
const TextField = ({ label, name, icon: Icon, placeholder, required = false, type = "text", value, onChange, error }) => (
    <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
            {Icon && <Icon size={14} className="text-slate-400" />}
            {label}
            {required && <span className="text-red-500">*</span>}
        </label>
        <input
            type={type}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={`w-full px-4 py-2.5 rounded-lg border bg-white focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none ${error ? "border-red-300 bg-red-50/10" : "border-slate-200 hover:border-slate-300"
                }`}
        />
        {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
);

const SelectField = ({ label, name, options, icon: Icon, required = false, value, onChange, error }) => (
    <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
            {Icon && <Icon size={14} className="text-slate-400" />}
            {label}
            {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
            <select
                name={name}
                value={value}
                onChange={onChange}
                className={`w-full px-4 py-2.5 rounded-lg border bg-white focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none appearance-none ${error ? "border-red-300 bg-red-50/10" : "border-slate-200 hover:border-slate-300"
                    }`}
            >
                <option value="">Select {label}</option>
                {options.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>
        </div>
        {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
);

const FileField = ({ label, name, fileState, accept = ".pdf", onChange, onRemove }) => (
    <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
            <FileText size={14} className="text-slate-400" />
            {label}
        </label>
        <div className="relative group">
            <input
                type="file"
                id={name}
                className="hidden"
                accept={accept}
                onChange={(e) => onChange(e, name)}
            />
            <label
                htmlFor={name}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg border border-dashed cursor-pointer transition-all ${fileState
                    ? "border-emerald-200 bg-emerald-50/30 text-emerald-700"
                    : "border-slate-300 hover:border-indigo-400 hover:bg-slate-50 text-slate-500"
                    }`}
            >
                <div className="flex items-center gap-2">
                    {fileState ? <CheckCircle size={16} /> : <Upload size={16} />}
                    <span className="text-sm truncate max-w-[200px]">
                        {fileState ? fileState.name : "Choose PDF file"}
                    </span>
                </div>
                {fileState && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            onRemove(name);
                        }}
                        className="p-1 hover:bg-emerald-100 rounded-full text-emerald-600"
                    >
                        <X size={14} />
                    </button>
                )}
            </label>
        </div>
    </div>
);

const UploadForm = ({ onSuccess, onFormChange }) => {
    const [formData, setFormData] = useState({
        facultyName: "",
        email: "",
        department: "",
        designation: "",
        caste: "",
        patentId: "",
        patentTitle: "",
        patentType: "Utility",
        approvalType: "Published",
        authors: "",
        coApplicants: "",
        filingDate: "",
        publishingDate: "",
        grantingDate: "",
    });

    const [files, setFiles] = useState({
        document: null,
        grantDocument: null
    });

    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        const { name, value } = e.target;
        const newData = { ...formData, [name]: value };
        setFormData(newData);

        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }

        if (onFormChange) {
            onFormChange(newData);
        }
    };

    const handleDateChange = (name, dateValue) => {
        const newData = { ...formData, [name]: dateValue };
        setFormData(newData);

        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }

        if (onFormChange) {
            onFormChange(newData);
        }
    };

    const handleFileChange = (e, type) => {
        const file = e.target.files[0];
        if (file) {
            if (file.type !== "application/pdf") {
                toast.error("Only PDF files are allowed");
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                toast.error("File size must be less than 5MB");
                return;
            }
            setFiles(prev => ({ ...prev, [type]: file }));
        }
    };

    const handleFileRemove = (name) => {
        setFiles(prev => ({ ...prev, [name]: null }));
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.facultyName) newErrors.facultyName = "Faculty name is required";
        if (!formData.email) newErrors.email = "Email is required";
        if (!formData.department) newErrors.department = "Department is required";
        if (!formData.designation) newErrors.designation = "Designation is required";
        if (!formData.patentTitle) newErrors.patentTitle = "Patent title is required";
        if (!formData.patentId) newErrors.patentId = "Patent ID is required";
        if (!formData.filingDate) newErrors.filingDate = "Filing date is required";
        if (!formData.publishingDate) newErrors.publishingDate = "Publishing date is required";

        if (formData.approvalType === "Granted" && !formData.grantingDate) {
            newErrors.grantingDate = "Granting date is required for granted patents";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            toast.error("Please fill in all required fields");
            return;
        }

        setLoading(true);

        try {
            const formPayload = new FormData();

            Object.keys(formData).forEach(key => {
                formPayload.append(key, formData[key]);
            });

            if (files.document) {
                formPayload.append("documentFile", files.document);
            }
            if (files.grantDocument) {
                formPayload.append("grantDocumentFile", files.grantDocument);
            }

            await api.post("/form/formEntry", formPayload, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            toast.success("Patent entry submitted successfully!");
            if (onSuccess) onSuccess();

            setFormData({
                facultyName: "",
                email: "",
                department: "",
                designation: "",
                caste: "",
                patentId: "",
                patentTitle: "",
                patentType: "Utility",
                approvalType: "Published",
                authors: "",
                coApplicants: "",
                filingDate: "",
                publishingDate: "",
                grantingDate: "",
            });
            setFiles({ document: null, grantDocument: null });

        } catch (err) {
            console.error("Submission error:", err);
            toast.error(err.response?.data?.message || "Failed to submit entry");
        } finally {
            setLoading(false);
        }
    };

    // Constants
    const DESIGNATIONS = ['Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer', 'Research Scholar'];
const PATENT_TYPES = ['Utility', 'Design'];
    const APPROVAL_TYPES = ['Published', 'Granted'];
    const CASTES = ['OC', 'BC', 'SC', 'ST', 'Others'];

    return (
        <form onSubmit={handleSubmit} className="space-y-8">

            {/* 1. Faculty Information */}
            <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                <div className="border-b border-slate-100 pb-4 mb-4">
                    <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                        <User className="text-indigo-600" size={20} />
                        Faculty Information
                    </h2>
                    <p className="text-sm text-slate-400">Personal and departmental details</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <TextField
                        label="Faculty Name"
                        name="facultyName"
                        placeholder="Dr. John Doe"
                        required
                        icon={User}
                        value={formData.facultyName}
                        onChange={handleChange}
                        error={errors.facultyName}
                    />
                    <TextField
                        label="Email Address"
                        name="email"
                        type="email"
                        placeholder="faculty@nri.edu.in"
                        required
                        icon={User}
                        value={formData.email}
                        onChange={handleChange}
                        error={errors.email}
                    />
                    <SelectField
                        label="Department"
                        name="department"
                        options={DEPARTMENTS}
                        required
                        icon={Building2}
                        value={formData.department}
                        onChange={handleChange}
                        error={errors.department}
                    />
                    <SelectField
                        label="Designation"
                        name="designation"
                        options={DESIGNATIONS}
                        required
                        icon={User}
                        value={formData.designation}
                        onChange={handleChange}
                        error={errors.designation}
                    />
                    <SelectField
                        label="Caste"
                        name="caste"
                        options={CASTES}
                        icon={Users}
                        value={formData.caste}
                        onChange={handleChange}
                        error={errors.caste}
                    />
                </div>
            </section>

            {/* 2. Patent Documentation */}
            <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                <div className="border-b border-slate-100 pb-4 mb-4">
                    <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                        <BookOpen className="text-indigo-600" size={20} />
                        Patent Documentation
                    </h2>
                    <p className="text-sm text-slate-400">Core details about the patent</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <TextField
                            label="Patent Title"
                            name="patentTitle"
                            placeholder="Enter the full title of the invention"
                            required
                            icon={BookOpen}
                            value={formData.patentTitle}
                            onChange={handleChange}
                            error={errors.patentTitle}
                        />
                    </div>
                    <TextField
                        label="Patent ID / Application No."
                        name="patentId"
                        placeholder="e.g. 202341012345"
                        required
                        icon={Hash}
                        value={formData.patentId}
                        onChange={handleChange}
                        error={errors.patentId}
                    />
                    <TextField
                        label="Authors / Inventors"
                        name="authors"
                        placeholder="Enter all author names"
                        icon={Users}
                        value={formData.authors}
                        onChange={handleChange}
                        error={errors.authors}
                    />
                    <TextField
                        label="Co-Applicants"
                        name="coApplicants"
                        placeholder="Enter co-applicant names"
                        icon={Users}
                        value={formData.coApplicants}
                        onChange={handleChange}
                        error={errors.coApplicants}
                    />
                    <SelectField
                        label="Patent Type"
                        name="patentType"
                        options={PATENT_TYPES}
                        required
                        icon={FileCheck}
                        value={formData.patentType}
                        onChange={handleChange}
                        error={errors.patentType}
                    />
                    <SelectField
                        label="Approval Status"
                        name="approvalType"
                        options={APPROVAL_TYPES}
                        required
                        icon={ShieldCheck}
                        value={formData.approvalType}
                        onChange={handleChange}
                        error={errors.approvalType}
                    />
                </div>
            </section>

            {/* 3. Timeline & Dates */}
            <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                <div className="border-b border-slate-100 pb-4 mb-4">
                    <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                        <Clock className="text-indigo-600" size={20} />
                        Timeline & Dates
                    </h2>
                    <p className="text-sm text-slate-400">Important milestones</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <CustomDatePicker
                        label="Filing Date"
                        required
                        value={formData.filingDate}
                        onChange={(date) => handleDateChange("filingDate", date)}
                        error={errors.filingDate}
                        maxDate={new Date().toISOString().split('T')[0]}
                    />
                    <CustomDatePicker
                        label="Publishing Date"
                        required
                        value={formData.publishingDate}
                        onChange={(date) => handleDateChange("publishingDate", date)}
                        error={errors.publishingDate}
                    />
                    <CustomDatePicker
                        label="Granting Date"
                        value={formData.grantingDate}
                        onChange={(date) => handleDateChange("grantingDate", date)}
                        error={errors.grantingDate}
                    />
                </div>
            </section>

            {/* 4. Supporting Documents */}
            <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                <div className="border-b border-slate-100 pb-4 mb-4">
                    <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                        <FileText className="text-indigo-600" size={20} />
                        Supporting Documents
                    </h2>
                    <p className="text-sm text-slate-400">Upload proofs (PDF only, max 5MB)</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FileField
                        label="Proof of Publication"
                        name="document"
                        fileState={files.document}
                        onChange={handleFileChange}
                        onRemove={handleFileRemove}
                    />
                    <FileField
                        label="Proof of Grant"
                        name="grantDocument"
                        fileState={files.grantDocument}
                        onChange={handleFileChange}
                        onRemove={handleFileRemove}
                    />
                </div>
            </section>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-4 pt-4">
                <button
                    type="button"
                    onClick={() => {
                        setFormData({
                            facultyName: "",
                            email: "",
                            department: "",
                            designation: "",
                            caste: "",
                            patentId: "",
                            patentTitle: "",
                            patentType: "Utility",
                            approvalType: "Published",
                            authors: "",
                            coApplicants: "",
                            filingDate: "",
                            publishingDate: "",
                            grantingDate: "",
                        });
                        setFiles({ document: null, grantDocument: null });
                        setErrors({});
                        if (onFormChange) onFormChange({});
                    }}
                    className="px-6 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-all"
                >
                    Reset Form
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className={`flex items-center gap-2 px-8 py-2.5 rounded-lg bg-[#1B2845] text-[#C8A96E] font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all ${loading ? "opacity-75 cursor-wait" : ""
                        }`}
                >
                    {loading ? "Submitting..." : "Confirm & Publish"}
                    {!loading && <CheckCircle size={18} />}
                </button>
            </div>
        </form>
    );
};

export default UploadForm;
