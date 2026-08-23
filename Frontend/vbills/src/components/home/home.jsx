import React from 'react';
import { useNavigate } from 'react-router-dom';

// Icons for the cards and navigation
const CreateBillIcon = () => (
  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const ViewBillIcon = () => (
  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
);

const LogoutIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

const Home = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Clear local storage and return to login
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#e9ece4] font-sans">
      
      {/* Top Navigation Bar */}
      <nav className="bg-[#143d30] border-b-4 border-[#b9935a] shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            
            {/* Branding & Logo */}
            <div className="flex items-center gap-4">
              {/* Logo Image - Pulls from your public folder */}
              <div className="w-12 h-12 bg-white rounded-full p-0.5 border-2 border-[#b9935a] shadow-md overflow-hidden flex items-center justify-center">
                <img 
                  src="/vaishan.png" 
                  alt="Logo" 
                  className="w-full h-full object-cover rounded-full"
                  onError={(e) => {
                    // Fallback if the image doesn't load
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<span class="text-[#143d30] font-serif font-bold text-xl">V&J</span>';
                  }}
                />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-2xl font-serif text-[#e9ece4] tracking-widest uppercase leading-none mt-1">
                  Vaishan & J
                </h1>
                <p className="text-[#b9935a] tracking-[0.2em] text-[0.65rem] uppercase font-semibold mt-1">
                  Vintage Fashion
                </p>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-[#e9ece4] hover:text-[#b9935a] transition-colors font-semibold text-sm tracking-wider uppercase focus:outline-none"
            >
              <span className="hidden sm:inline">Logout</span>
              <LogoutIcon />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-6 py-12 sm:py-20">
        
        {/* Page Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-serif text-[#143d30] mb-4">
            Dashboard
          </h2>
          <div className="flex items-center justify-center gap-3">
            <div className="h-px bg-[#b9935a] w-12 sm:w-24"></div>
            <span className="text-[#b9935a] tracking-[0.15em] text-xs sm:text-sm uppercase font-semibold">
              Select an action below
            </span>
            <div className="h-px bg-[#b9935a] w-12 sm:w-24"></div>
          </div>
        </div>

        {/* Action Cards Grid */}
        <div className="grid sm:grid-cols-2 gap-8 max-w-4xl mx-auto">
          
          {/* Create Bills Card */}
          <button 
            onClick={() => navigate('/create-bill')}
            className="group relative bg-[#fdfdfc] p-8 sm:p-10 rounded-sm shadow-xl border border-[#b9935a]/30 hover:border-[#b9935a] hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 text-left flex flex-col items-center text-center overflow-hidden"
          >
            {/* Decorative Corner Borders */}
            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#b9935a]/40 group-hover:border-[#b9935a] transition-colors m-2"></div>
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#b9935a]/40 group-hover:border-[#b9935a] transition-colors m-2"></div>

            <div className="w-20 h-20 bg-[#143d30]/5 text-[#143d30] rounded-full flex items-center justify-center mb-6 group-hover:bg-[#143d30] group-hover:text-[#b9935a] transition-colors duration-300">
              <CreateBillIcon />
            </div>
            <h3 className="text-2xl font-serif text-[#143d30] mb-3">Create Bills</h3>
            <p className="text-[#143d30]/70 text-sm leading-relaxed">
              Generate new invoices for vintage fashion purchases. Add items, calculate totals, and issue official receipts to your customers.
            </p>
            <div className="mt-8 text-[#b9935a] font-bold text-sm tracking-widest uppercase flex items-center gap-2 group-hover:gap-4 transition-all">
              Proceed <span>&rarr;</span>
            </div>
          </button>

          {/* View Bills Card */}
          <button 
            onClick={() => navigate('/view-bills')}
            className="group relative bg-[#fdfdfc] p-8 sm:p-10 rounded-sm shadow-xl border border-[#b9935a]/30 hover:border-[#b9935a] hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 text-left flex flex-col items-center text-center overflow-hidden"
          >
            {/* Decorative Corner Borders */}
            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#b9935a]/40 group-hover:border-[#b9935a] transition-colors m-2"></div>
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#b9935a]/40 group-hover:border-[#b9935a] transition-colors m-2"></div>

            <div className="w-20 h-20 bg-[#143d30]/5 text-[#143d30] rounded-full flex items-center justify-center mb-6 group-hover:bg-[#143d30] group-hover:text-[#b9935a] transition-colors duration-300">
              <ViewBillIcon />
            </div>
            <h3 className="text-2xl font-serif text-[#143d30] mb-3">View Bills</h3>
            <p className="text-[#143d30]/70 text-sm leading-relaxed">
              Access the billing archive. Search, filter, and review historical invoices and transaction records for all previous sales.
            </p>
            <div className="mt-8 text-[#b9935a] font-bold text-sm tracking-widest uppercase flex items-center gap-2 group-hover:gap-4 transition-all">
              Proceed <span>&rarr;</span>
            </div>
          </button>

        </div>
      </main>
    </div>
  );
};

export default Home;