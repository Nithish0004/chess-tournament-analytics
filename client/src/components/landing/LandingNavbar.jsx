import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Menu, X, ArrowRight } from 'lucide-react';

export const LandingNavbar = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState('home');

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setScrolled(scrollY > 40);

      // Scroll progress
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollY / docHeight) * 100 : 0;
      setScrollProgress(Math.min(100, Math.max(0, progress)));

      // Section spy
      const sections = ['home', 'tournaments', 'performance', 'leaderboard', 'ratings-explainer', 'faq'];
      const scrollPos = scrollY + 120;

      for (const sectionId of sections) {
        const el = document.getElementById(sectionId);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Trigger on mount
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (sectionId) => {
    setActiveSection(sectionId);
    setMobileMenuOpen(false);

    if (sectionId === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const el = document.getElementById(sectionId);
    if (el) {
      const navHeight = scrolled ? 60 : 72;
      const elementPosition = el.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = elementPosition - navHeight;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/tournaments?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchModalOpen(false);
    }
  };

  const navLinks = [
    { id: 'home', label: 'Home' },
    { id: 'tournaments', label: 'Tournaments' },
    { id: 'leaderboard', label: 'Leaderboard' },
    { id: 'ratings-explainer', label: 'Ratings' },
    { id: 'faq', label: 'FAQ' },
  ];

  return (
    <>
      {/* 1. Always Visible Fixed Navbar */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300 ${
          scrolled
            ? 'bg-[#0b0b0c]/90 backdrop-blur-md border-b border-[#e8c27a]/20 shadow-2xl shadow-black/80 py-2.5 sm:py-3'
            : 'bg-transparent border-b border-transparent py-4 sm:py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/"
              className="flex items-center gap-1.5 sm:gap-2.5 group transition-transform duration-200 active:scale-95"
              aria-label="Chess Magic Home"
            >
              <img
                src="/images/logo.png"
                alt="Chess Magic Logo"
                className="w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 object-contain drop-shadow-[0_0_10px_rgba(232,194,122,0.4)] shrink-0"
                onError={(e) => {
                  e.currentTarget.src = '/logo.png';
                }}
              />
              <div className="flex flex-col">
                <span className="font-serif font-bold text-xs sm:text-sm lg:text-base tracking-wider text-white group-hover:text-[#e8c27a] transition-colors leading-tight whitespace-nowrap">
                  CHESS MAGIC
                </span>
                <span className="text-[9px] uppercase tracking-[0.2em] text-[#e8c27a] font-medium font-sans hidden xl:block">
                  Tournament Hub
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Center Links with Scroll-Spy Highlight */}
          <nav className="hidden md:flex items-center gap-5 lg:gap-8" aria-label="Main Navigation">
            {navLinks.map((link) => {
              const isActive = activeSection === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => handleNavClick(link.id)}
                  className={`relative py-1 text-xs lg:text-sm font-medium transition-colors font-sans whitespace-nowrap ${
                    isActive ? 'text-[#e8c27a] font-semibold' : 'text-zinc-300 hover:text-white'
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute -bottom-1 left-0 right-0 h-[2px] bg-gradient-to-r from-[#e8c27a] via-[#f7e0a8] to-[#c9993f] rounded-full shadow-[0_0_8px_rgba(232,194,122,0.8)]" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Search Icon Trigger */}
            <button
              onClick={() => setSearchModalOpen(true)}
              aria-label="Search tournaments and players"
              className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/5 transition-colors focus:outline-none focus:ring-1 focus:ring-[#e8c27a]"
            >
              <Search className="w-4 h-4 text-zinc-300" />
            </button>

            {/* Login Button (Outline) */}
            <button
              onClick={() => navigate('/login')}
              className="hidden sm:inline-flex items-center justify-center px-4 py-1.5 rounded-lg border border-white/20 hover:border-[#e8c27a]/60 text-xs font-semibold text-zinc-200 hover:text-white bg-white/[0.02] hover:bg-white/[0.06] transition-all whitespace-nowrap"
            >
              Login
            </button>

            {/* Get Started Button (Gold Gradient) */}
            <button
              onClick={() => navigate('/register')}
              className="btn-gold px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-xs font-bold tracking-wide shadow-md flex items-center gap-1 group whitespace-nowrap"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform hidden sm:inline" />
            </button>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 focus:outline-none shrink-0"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-[#e8c27a]" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Thin Gold Scroll-Progress Bar */}
        <div
          className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-[#e8c27a] via-[#fce5b2] to-[#c9993f] transition-[width] duration-75 ease-out shadow-[0_0_8px_rgba(232,194,122,0.8)]"
          style={{ width: `${scrollProgress}%` }}
          aria-hidden="true"
        />

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed top-[100%] left-0 right-0 px-4 pt-3 pb-6 border-b border-[#e8c27a]/20 bg-[#0b0b0c]/98 backdrop-blur-2xl shadow-2xl animate-fadeIn space-y-3">
            <nav className="flex flex-col space-y-1">
              {navLinks.map((link) => {
                const isActive = activeSection === link.id;
                return (
                  <button
                    key={link.id}
                    onClick={() => handleNavClick(link.id)}
                    className={`text-left px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[#e8c27a]/15 text-[#e8c27a] font-bold border-l-2 border-[#e8c27a]'
                        : 'text-zinc-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {link.label}
                  </button>
                );
              })}
            </nav>

            <div className="pt-2 border-t border-zinc-800 flex flex-col gap-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/login');
                }}
                className="w-full py-2.5 rounded-lg border border-white/20 text-xs font-semibold text-zinc-200 text-center hover:bg-white/5"
              >
                Login
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/register');
                }}
                className="btn-gold w-full py-2.5 rounded-lg text-xs font-bold text-center"
              >
                Get Started
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Quick Search Modal */}
      {searchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl bg-[#131314] border border-[#e8c27a]/30 p-5 shadow-2xl shadow-black relative">
            <button
              onClick={() => setSearchModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white"
              aria-label="Close search"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-serif text-lg text-white font-medium mb-3">
              Search Tournaments & Players
            </h3>

            <form onSubmit={handleSearchSubmit} className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-[#e8c27a] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  autoFocus
                  placeholder="e.g. Tata Steel Masters, Candidates, Magnus..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#1b1b1d] border border-white/10 rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-[#e8c27a] focus:ring-1 focus:ring-[#e8c27a]/30"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-zinc-400 pt-1">
                <span>Press Enter to search tournaments directory</span>
                <button
                  type="submit"
                  className="btn-gold px-3.5 py-1.5 rounded-lg text-xs font-bold"
                >
                  Search
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default LandingNavbar;
