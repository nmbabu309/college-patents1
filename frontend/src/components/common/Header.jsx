import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, LogOut, Upload, Menu, X, User, Building2, Phone, Mail, MapPin, Award, GraduationCap, ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import LoginModal from '../auth/LoginModal';
import { AnimatePresence, motion } from 'framer-motion';

const Header = () => {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { user, isAuthenticated, logout, isAnyAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* MAIN HEADER - Fixed */}
      <header className="fixed top-0 left-0 right-0 bg-white border-b-4 border-[#d4a574] shadow-lg z-50">


        {/* MAIN NAV */}
        <div className="w-full py-3">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">

            {/* Logo Section */}
            <Link to="/" className="flex items-center gap-3 group relative z-10">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-white rounded-lg shadow-md border border-[#1e3a5f]/10 flex items-center justify-center p-1.5 transition-transform group-hover:scale-105 duration-300">
                <img src="/NRI-logo.png" alt="NRI Logo" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base md:text-xl leading-tight text-[#1e3a5f] tracking-tight">
                  NRI Institute of Technology
                </span>
                <span className="text-xs text-gray-500 font-medium">
                  Publications & Patents
                </span>
              </div>
            </Link>



            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-3">
              {isAuthenticated ? (
                <>
                  {isAnyAdmin() && (
                    <Link to="/admin-dashboard" className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#1e3a5f] hover:bg-[#1e3a5f]/10 rounded-lg transition-colors">
                      <Building2 size={16} />
                      <span>Admin</span>
                    </Link>
                  )}

                  <Link to="/upload" className="flex items-center gap-2 px-4 py-2 bg-[#d4a574] hover:bg-[#c49a6e] text-white text-sm font-semibold rounded-lg shadow-md transition-all">
                    <Upload size={16} />
                    <span>Submit Patent</span>
                  </Link>

                  <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors" title="Logout">
                    <LogOut size={18} />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsLoginOpen(true)}
                  className="flex items-center gap-2 px-5 py-2 bg-[#1e3a5f] hover:bg-[#152a45] text-white text-sm font-semibold rounded-lg shadow-md transition-all"
                >
                  <LogIn size={18} />
                  <span>Login</span>
                </button>
              )}
            </nav>



            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 text-gray-600 hover:bg-gray-100/50 rounded-lg transition-colors z-20"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full left-0 w-full bg-white border-b-4 border-[#d4a574] shadow-xl md:hidden"
            >
              <div className="p-4 space-y-2">
                {isAuthenticated ? (
                  <>
                    {isAnyAdmin() && (
                      <Link to="/admin-dashboard" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 p-3 text-[#1e3a5f] hover:bg-[#1e3a5f]/5 rounded-xl font-medium">
                        <Building2 size={20} />
                        Admin
                      </Link>
                    )}

                    <Link to="/upload" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 p-3 bg-[#d4a574] text-white rounded-xl font-medium">
                      <Upload size={20} />
                      Submit Patent
                    </Link>

                    <button onClick={handleLogout} className="flex items-center gap-3 w-full p-3 text-red-600 hover:bg-red-50 rounded-xl font-medium">
                      <LogOut size={20} />
                      Logout
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setIsLoginOpen(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-3 w-full p-4 bg-[#1e3a5f] text-white rounded-xl font-semibold shadow-md"
                  >
                    <LogIn size={20} />
                    Login
                  </button>
                )}
              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </header>

      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </>
  );
};

export default Header;
