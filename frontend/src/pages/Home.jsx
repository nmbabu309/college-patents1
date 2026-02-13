import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Download, BookOpen, Search, User, Building2, Award, TrendingUp, Users, FileCheck, ChevronRight, Sparkles, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import PublicationsTable from '../components/data/PublicationsTable';
import LoginModal from '../components/auth/LoginModal';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
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

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      <Header />

      <main className="flex-grow">
        {/* HERO SECTION - Professional College Style */}
        <section className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }}></div>
          </div>

          <div className="container mx-auto px-4 py-16 md:py-24 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              {/* Institution Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="mb-8"
              >
                <a
                  href="https://nriit.edu.in"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white font-semibold text-sm hover:bg-white/20 transition-all group"
                >
                  <Building2 size={18} className="text-blue-300" />
                  <span>NRI INSTITUTE OF TECHNOLOGY</span>
                  <ChevronRight size={16} className="opacity-60 group-hover:translate-x-1 transition-transform" />
                </a>
              </motion.div>

              {/* Main Title */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                  Research & Innovation
                  <span className="block text-blue-300 mt-2">Repository Portal</span>
                </h1>
                <p className="text-lg md:text-xl text-blue-100 max-w-3xl mx-auto leading-relaxed mb-10">
                  A comprehensive digital archive showcasing intellectual property, patents, and research contributions from our distinguished faculty and scholars.
                </p>
              </motion.div>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4"
              >
                <button
                  onClick={handleScrollToPatents}
                  className="group px-8 py-4 bg-white text-slate-900 rounded-xl font-bold shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all flex items-center gap-2"
                >
                  <Search size={20} className="text-blue-600" />
                  Browse Repository
                  <ChevronRight size={18} className="opacity-60 group-hover:translate-x-1 transition-transform" />
                </button>

                {isAuthenticated && (
                  <button
                    onClick={() => navigate('/upload')}
                    className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold shadow-lg transition-all flex items-center gap-2"
                  >
                    <Sparkles size={20} />
                    Submit Patent
                  </button>
                )}
              </motion.div>
            </div>
          </div>

          {/* Bottom Wave */}
          <div className="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
              <path d="M0 0L60 10C120 20 240 40 360 46.7C480 53 600 47 720 43.3C840 40 960 40 1080 46.7C1200 53 1320 67 1380 73.3L1440 80V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0V0Z" fill="rgb(248 250 252)" />
            </svg>
          </div>
        </section>

        {/* STATISTICS SECTION */}
        <section className="py-16 bg-white relative -mt-1">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-white border border-blue-100"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-600 mb-3">
                  <Award size={24} />
                </div>
                <div className="text-3xl font-bold text-slate-800 mb-1">250+</div>
                <div className="text-sm text-slate-600 font-medium">Patents Filed</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-center p-6 rounded-2xl bg-gradient-to-br from-emerald-50 to-white border border-emerald-100"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mb-3">
                  <FileCheck size={24} />
                </div>
                <div className="text-3xl font-bold text-slate-800 mb-1">120+</div>
                <div className="text-sm text-slate-600 font-medium">Granted Patents</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="text-center p-6 rounded-2xl bg-gradient-to-br from-purple-50 to-white border border-purple-100"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 text-purple-600 mb-3">
                  <Users size={24} />
                </div>
                <div className="text-3xl font-bold text-slate-800 mb-1">85+</div>
                <div className="text-sm text-slate-600 font-medium">Faculty Contributors</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="text-center p-6 rounded-2xl bg-gradient-to-br from-amber-50 to-white border border-amber-100"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 text-amber-600 mb-3">
                  <TrendingUp size={24} />
                </div>
                <div className="text-3xl font-bold text-slate-800 mb-1">45%</div>
                <div className="text-sm text-slate-600 font-medium">Year Growth</div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ABOUT SECTION */}
        <section className="py-16 bg-gradient-to-b from-white to-slate-50">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-12"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 mb-6">
                  <BookOpen size={32} />
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
                  About the Repository
                </h2>
                <p className="text-lg text-slate-600 leading-relaxed">
                  This institutional repository serves as the central hub for documenting and showcasing the innovative research output and intellectual property contributions of NRI Institute of Technology. Our platform facilitates transparent tracking, recognition, and accessibility of patents and publications across all departments.
                </p>
              </motion.div>

              <div className="grid md:grid-cols-3 gap-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                    <ShieldCheck size={20} />
                  </div>
                  <h3 className="font-bold text-slate-800 mb-2">Verified Records</h3>
                  <p className="text-sm text-slate-600">All entries are authenticated and verified by department heads ensuring data integrity.</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
                  className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                    <Search size={20} />
                  </div>
                  <h3 className="font-bold text-slate-800 mb-2">Easy Search</h3>
                  <p className="text-sm text-slate-600">Advanced filtering and search capabilities to quickly find relevant patents and publications.</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                  className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
                    <Download size={20} />
                  </div>
                  <h3 className="font-bold text-slate-800 mb-2">Export Data</h3>
                  <p className="text-sm text-slate-600">Download complete datasets in Excel format for reporting and analysis purposes.</p>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* PATENTS TABLE SECTION - Public Access */}
        <section id="patents" className="py-16 bg-slate-50">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-10 text-center"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
                Recent Patent Submissions
              </h2>
              <p className="text-slate-600 max-w-2xl mx-auto">
                Browse through our latest intellectual property filings and granted patents from various departments and research groups.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
            >
              <div className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200 px-6 md:px-8 py-6 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
                    Patent Database
                  </h3>
                  <p className="text-sm text-slate-500 mt-1 ml-3">Real-time institutional repository</p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl font-medium transition-all active:scale-95 flex items-center gap-2 shadow-sm"
                  >
                    <motion.div
                      animate={isRefreshing ? { rotate: 360 } : {}}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <div className={!isRefreshing && "rotate-0"}>↻</div>
                    </motion.div>
                    Refresh
                  </button>
                  <a
                    href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/form/downloadExcel`}
                    target="_blank"
                    download
                    rel="noreferrer"
                    className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-medium shadow-lg shadow-blue-900/20 transition-all active:scale-95 flex items-center gap-2"
                  >
                    <Download size={18} />
                    Export Data
                  </a>
                </div>
              </div>

              <div className="p-0">
                <PublicationsTable ref={tableRef} />
              </div>
            </motion.div>

            {/* Footer Note */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="mt-8 p-6 bg-white rounded-xl border border-blue-100 text-center"
            >
              <p className="text-sm text-slate-600">
                <strong className="text-slate-800">Need Assistance?</strong> For research inquiries or patent filing support, please contact the R&D Cell at the Administrative Block or email{' '}
                <a href="mailto:research@nriit.edu.in" className="text-blue-600 hover:underline font-medium">research@nriit.edu.in</a>
              </p>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </div>
  );
};

export default Home;