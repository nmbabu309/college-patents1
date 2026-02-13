import { useState } from 'react';
import { Code, ArrowUp } from 'lucide-react';
import DeveloperModal from './DeveloperModal';

const Footer = () => {
  const [isDevOpen, setIsDevOpen] = useState(false);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentYear = new Date().getFullYear();

  return (
    <>
      <footer className="bg-[#0f172a] text-white mt-auto font-sans relative z-10 border-t border-slate-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">

            {/* Logo & Copyright */}
            <div className="flex flex-col gap-1 text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center p-0.5 overflow-hidden">
                  <img src="/NRI-logo.png" alt="NRI Logo" className="w-full h-full object-contain" />
                </div>
                <h3 className="text-lg font-bold tracking-wide text-white">NRI INSTITUTE OF TECHNOLOGY</h3>
              </div>
              <p className="text-xs text-slate-400 pl-[3.25rem]">&copy; {currentYear} All rights reserved.</p>
            </div>

            {/* Contact Info */}
            <div className="flex items-center gap-8 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-full border border-slate-700">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                </div>
                <span>Eluru Dist, AP</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-full border border-slate-700">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                </div>
                <a href="mailto:contact@nriit.edu.in" className="hover:text-white transition-colors">contact@nriit.edu.in</a>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={scrollToTop}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
              >
                <ArrowUp size={18} />
              </button>
              <button
                onClick={() => setIsDevOpen(true)}
                className="px-4 py-2.5 bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-xl font-medium text-sm transition-all flex items-center gap-2 shadow-lg shadow-indigo-900/20"
              >
                <Code size={16} />
                <span>Developer</span>
              </button>
            </div>

          </div>
        </div>
      </footer>

      <DeveloperModal isOpen={isDevOpen} onClose={() => setIsDevOpen(false)} />
    </>
  );
};

export default Footer;
