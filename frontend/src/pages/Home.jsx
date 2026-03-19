import { useState, useRef } from 'react';
import { Download, Search, ChevronRight, Award, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import PublicationsTable from '../components/data/PublicationsTable';
import LoginModal from '../components/auth/LoginModal';
import { useAuth } from '../context/AuthContext';
import { getBaseUrl } from '../api/axios';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const Home = () => {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const tableRef = useRef();

  const handleScrollToPatents = () => {
    const patentsSection = document.getElementById('patents');
    const header = document.querySelector('header');

    if (patentsSection && header) {
      const headerHeight = header.offsetHeight;
      const elementPosition = patentsSection.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - headerHeight - 20;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const handleRefresh = async () => {
    if (!tableRef.current || isRefreshing) return;

    setIsRefreshing(true);
    try {
      await tableRef.current.refresh();
    } catch (error) {
      console.error('Failed to refresh:', error);
      toast.error('Failed to refresh data');
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      // Get current filters from the table
      const currentFilters = tableRef.current?.getFilters() || {};
      const hasActiveFilters = Object.values(currentFilters).some(v => v && String(v).trim().length > 0);

      // Build query params
      const params = {};
      if (hasActiveFilters) {
        params.filters = JSON.stringify(currentFilters);
      }

      const response = await api.get("/form/downloadExcel", {
        params,
        responseType: "arraybuffer",
      });

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const filename = hasActiveFilters ? "patents-filtered.xlsx" : "patents.xlsx";
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      if (hasActiveFilters) {
        toast.success("Filtered data exported successfully");
      } else {
        toast.success("All data exported successfully");
      }
    } catch (err) {
      console.error("Export failed", err);
      toast.error("Failed to export data");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFD]">
      <Header />

      <main className="flex-grow">
        {/* HERO — Compact institutional banner */}
        <section className="relative bg-[#1B2845] text-white overflow-hidden">
          {/* Subtle pattern overlay */}
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '32px 32px'
          }}></div>

          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              {/* Institution link */}
              <a
                href="https://nriit.edu.in"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/8 border border-white/12 text-[#C8A96E] text-sm font-medium hover:bg-white/12 transition-all mb-6"
              >
                <Award size={15} />
                <span>NRI Institute of Technology</span>
                <ChevronRight size={14} className="opacity-50" />
              </a>

              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight tracking-tight">
                Publications & Patents
                <span className="block text-[#C8A96E] mt-1 text-2xl md:text-3xl lg:text-4xl font-semibold">Repository</span>
              </h1>

              <p className="text-slate-300 text-base md:text-lg max-w-xl mx-auto leading-relaxed mb-8">
                A digital archive of intellectual property and research contributions from our faculty and scholars.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={handleScrollToPatents}
                  className="group px-6 py-3 bg-[#C8A96E] hover:bg-[#B8994E] text-[#1B2845] rounded-lg font-semibold transition-all flex items-center gap-2"
                >
                  <Search size={18} />
                  Browse Repository
                  <ChevronRight size={16} className="opacity-60 group-hover:translate-x-0.5 transition-transform" />
                </button>

                {isAuthenticated && (
                  <button
                    onClick={() => navigate('/upload')}
                    className="px-6 py-3 bg-white/10 hover:bg-white/15 border border-white/15 text-white rounded-lg font-semibold transition-all flex items-center gap-2"
                  >
                    Submit Patent
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* PATENTS TABLE SECTION */}
        <section id="patents" className="py-10 md:py-14">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">

            {/* Table card */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
              {/* Toolbar */}
              <div className="border-b border-slate-100 px-5 md:px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Patent Database</h2>
                  <p className="text-sm text-slate-400 mt-0.5">Institutional repository records</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium transition-all active:scale-95 flex items-center gap-1.5"
                  >
                    <span className={isRefreshing ? 'animate-spin' : ''}>↻</span>
                    Refresh
                  </button>
                  <button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="px-4 py-2 bg-[#1B2845] hover:bg-[#243656] text-white rounded-lg text-sm font-medium transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-60"
                    title="Exports current view. Apply column filters to export specific data."
                    aria-label="Export data to Excel"
                  >
                    {isExporting ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Download size={15} />
                    )}
                    {isExporting ? 'Exporting...' : 'Export'}
                  </button>
                </div>
              </div>

              <p className="px-5 md:px-6 pt-3 pb-1 text-xs text-slate-400 flex items-center gap-1">
                <Filter size={12} />
                Use column filters below to narrow results, then click Export to download filtered data as Excel.
              </p>

              {/* Table */}
              <div className="p-0">
                <PublicationsTable ref={tableRef} />
              </div>
            </div>

          </div>
        </section>
      </main>

      <Footer />
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </div>
  );
};

export default Home;