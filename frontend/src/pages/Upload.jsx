import { useState, useRef } from "react";
import { Download, Upload as UploadIcon, FileSpreadsheet, ChevronLeft, RefreshCw, FileText, Database, Share2, Info } from "lucide-react";
import toast from 'react-hot-toast';
import { motion } from "framer-motion";
import Header from "../components/common/Header";
import Footer from "../components/common/Footer";
import UploadForm from "../components/forms/UploadForm";
import BulkImport from "../components/forms/BulkImport";
import PublicationsTable from "../components/data/PublicationsTable";
import SidePanel from "../components/common/SidePanel";
import api from "../api/axios";

const Upload = () => {

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

  // Side Panel State
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [searchFilters, setSearchFilters] = useState({});

  const tableRef = useRef();

  const handleSuccess = () => {
    // Trigger table refresh
    setRefreshTrigger((prev) => prev + 1);
  };

  const onFormChange = (formattedData) => {
    // This callback receives cleaned data from the form
    // We only want to trigger the side panel if significant fields have data
    const filters = {};
    let hasSearchable = false;

    if (formattedData.patentTitle && formattedData.patentTitle.length > 0) {
      filters.patentTitle = formattedData.patentTitle;
      hasSearchable = true;
    }
    if (formattedData.patentId && formattedData.patentId.length > 0) {
      filters.patentId = formattedData.patentId;
      hasSearchable = true;
    }

    if (formattedData.facultyName && formattedData.facultyName.length > 0) {
      filters.facultyName = formattedData.facultyName;
      hasSearchable = true;
    }

    if (formattedData.email && formattedData.email.length > 0) {
      filters.email = formattedData.email;
      hasSearchable = true;
    }

    if (formattedData.designation && formattedData.designation.length > 0) {
      filters.designation = formattedData.designation;
      // Allow designation to trigger if it's selected
      if (formattedData.designation !== "Select Designation") {
        hasSearchable = true;
      }
    }

    if (formattedData.department && formattedData.department.length > 0) {
      filters.department = formattedData.department;
      if (formattedData.department !== "Select Department") {
        hasSearchable = true;
      }
    }

    if (hasSearchable) {
      setSearchFilters(filters);
      setIsPanelOpen(true);
    } else if (Object.keys(filters).length > 0 && isPanelOpen) {
      setSearchFilters(filters);
    }
  };

  const handleClearPanel = () => {
    setSearchFilters({});
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get("/form/downloadTemplate", {
        responseType: "arraybuffer",
      });

      const excelMimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      const blob = new Blob([response.data], { type: excelMimeType });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "patents_template.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed", err);
      toast.error("Failed to download template");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] font-sans">
      <Header />

      <main className="flex-grow container mx-auto px-4 pt-32 pb-8 lg:pb-12 max-w-[1600px]">



        {/* Header Action Area */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 font-heading tracking-tight">
              Submit Patent Entry
            </h1>
            <p className="text-slate-500 mt-2 text-lg">
              Enter details for a new patent or publication record.
            </p>
          </div>

          <button
            onClick={() => window.location.href = '/'}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-all shadow-sm"
          >
            <ChevronLeft size={18} />
            Back to Home
          </button>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">

          {/* Main Form Area */}
          <div className="lg:col-span-8 space-y-6">
            <UploadForm onSuccess={handleSuccess} onFormChange={onFormChange} />
          </div>

          {/* Sidebar Actions */}
          <div className="lg:col-span-4 space-y-6 sticky top-8 h-fit">

            {/* Quick Actions Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Database size={20} />
                </div>
                <h3 className="font-bold text-slate-800">
                  Bulk Operations
                </h3>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => setIsBulkImportOpen(true)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50 hover:shadow-sm transition-all group text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-white text-indigo-600 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                    <UploadIcon size={18} />
                  </div>
                  <div>
                    <span className="block font-bold text-slate-800 text-sm">Bulk Import</span>
                    <span className="text-xs text-slate-500 group-hover:text-indigo-600">Upload via Excel file</span>
                  </div>
                </button>

                <button
                  onClick={handleDownloadTemplate}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-teal-200 hover:bg-teal-50/50 hover:shadow-sm transition-all group text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-white text-teal-600 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                    <FileSpreadsheet size={18} />
                  </div>
                  <div>
                    <span className="block font-bold text-slate-800 text-sm">Download Template</span>
                    <span className="text-xs text-slate-500 group-hover:text-teal-600">Get standard Excel format</span>
                  </div>
                </button>

                <div className="my-2 border-t border-slate-100" />

                <a
                  href="/form/downloadExcel"
                  target="_blank"
                  download
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/50 hover:shadow-sm transition-all group text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-white text-emerald-600 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                    <Download size={18} />
                  </div>
                  <div>
                    <span className="block font-bold text-slate-800 text-sm">Export Database</span>
                    <span className="text-xs text-slate-500 group-hover:text-emerald-600">Download all records (CSV)</span>
                  </div>
                </a>
              </div>
            </motion.div>

            {/* Help / Info Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-2xl text-white shadow-lg relative overflow-hidden"
            >
              {/* Decorative circles */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full blur-2xl -mr-10 -mt-10"></div>

              <div className="flex items-center gap-2 mb-3 relative z-10">
                <Info size={18} className="text-blue-300" />
                <h3 className="font-bold text-base">Submission Guide</h3>
              </div>

              <p className="text-slate-300 text-sm leading-relaxed mb-4 relative z-10">
                Please complete all fields marked with an asterisk (*). To avoid duplicates, check the side panel which activates automatically as you type.
              </p>

              <div className="text-xs font-semibold bg-white/10 backdrop-blur-md rounded-lg p-3 border border-white/10 relative z-10 flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1 shrink-0"></div>
                Use "Bulk Import" for uploading historical data from previous academic years.
              </div>
            </motion.div>

          </div>
        </div>

      </main>

      <Footer />

      <BulkImport
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onSuccess={handleSuccess}
      />

      <SidePanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        title="Duplicate Check"
        onClear={handleClearPanel}
      >
        <div className="mb-4 text-sm text-slate-600 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 flex gap-3 items-center">
          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
          <span>Real-time checking for similar entries...</span>
        </div>
        <PublicationsTable
          ref={tableRef}
          key={refreshTrigger}
          showActions={false}
          externalFilters={searchFilters}
        />
      </SidePanel>
    </div>
  );
};

export default Upload;
