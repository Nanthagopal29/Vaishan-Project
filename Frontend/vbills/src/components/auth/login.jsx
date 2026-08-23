import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const UserIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const MailIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
  </svg>
);

const LockIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const RoleIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const readApiResponse = async (response) => {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [authMode, setAuthMode] = useState('login');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'User', // Default role
  });
  const [resetData, setResetData] = useState({
    identifier: '',
    otp: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({
    type: location.state?.authMessage ? 'error' : '',
    text: location.state?.authMessage || '',
  });
  const isLogin = authMode === 'login';
  const isRegister = authMode === 'register';
  const isForgotPassword = authMode === 'forgot-password';
  const isResetPassword = authMode === 'reset-password';
  const apiBaseUrl = (
    import.meta.env.VITE_API_BASE_URL || 'http://192.168.1.8:7600/invoice'
  ).replace(/\/$/, '');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleResetChange = (e) => {
    setResetData({ ...resetData, [e.target.name]: e.target.value });
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    // API Routing
    const endpoint = isLogin ? `${apiBaseUrl}/login/` : `${apiBaseUrl}/users/`;

    // Map fields properly to your Django model fields
    const payload = isLogin
      ? { 
          username: formData.username, 
          password: formData.password 
        }
      : { 
          username: formData.username, 
          email: formData.email, 
          password: formData.password,
          role: formData.role 
        };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(data.message || (isLogin ? 'Authentication failed.' : 'Registration failed.'));
      }

      const loggedInUser = data.data?.user || data.user;

      if (data.data?.token) {
        localStorage.setItem('authToken', data.data.token);
      }

      if (loggedInUser) {
        localStorage.setItem('authUser', JSON.stringify(loggedInUser));
      }

      setMessage({
        type: 'success',
        text: isLogin ? 'Authentication successful.' : 'Account created successfully.',
      });

      if (!isLogin) {
        setFormData({ username: '', email: '', password: '', role: 'User' });
        navigate('/home');
      } else {
        console.log('Token/Data:', data);
        navigate('/home');
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch(`${apiBaseUrl}/users/forgot-password/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: resetData.identifier, email: resetData.identifier }),
      });

      const data = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(data.message || 'Could not send OTP.');
      }

      setMessage({ type: 'success', text: data.message || 'OTP sent to your email.' });
      setAuthMode('reset-password');
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch(`${apiBaseUrl}/users/reset-password/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: resetData.identifier,
          email: resetData.identifier,
          otp: resetData.otp,
          password: resetData.password,
        }),
      });

      const data = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(data.message || 'Could not reset password.');
      }

      if (data.data?.token) {
        localStorage.setItem('authToken', data.data.token);
        localStorage.setItem('authUser', JSON.stringify(data.data.user));
      }

      setMessage({ type: 'success', text: 'Password reset successful.' });
      setResetData({ identifier: '', otp: '', password: '' });
      navigate('/home');
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setAuthMode(isLogin ? 'register' : 'login');
    setMessage({ type: '', text: '' });
    // Reset form when switching modes
    setFormData({ username: '', email: '', password: '', role: 'User' });
    setResetData({ identifier: '', otp: '', password: '' });
  };

  const showLogin = () => {
    setAuthMode('login');
    setMessage({ type: '', text: '' });
    setResetData({ identifier: '', otp: '', password: '' });
  };

  return (
    <div className="min-h-screen flex font-sans bg-[#e9ece4]">
      
      {/* Left Panel - Branding/Visual (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#143d30] items-center justify-center overflow-hidden border-r-4 border-[#b9935a]">
        {/* Elegant Vintage Background Pattern (Optional CSS overlay) */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#b9935a 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
        
        <div className="relative z-10 p-12 max-w-lg text-center flex flex-col items-center">
          {/* Logo Mark */}
          <div className="mb-6 relative">
            <span className="text-8xl font-serif text-[#b9935a] italic leading-none drop-shadow-lg">V</span>
            <span className="text-4xl font-serif text-[#e9ece4] italic absolute bottom-0 right-[-15px]">& J</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-serif text-[#e9ece4] tracking-widest mb-4 mt-4 uppercase">
            Vaishan & J
          </h1>
          
          {/* Divider */}
          <div className="flex items-center gap-4 mb-6 w-full justify-center">
            <div className="h-px bg-[#b9935a] w-16"></div>
            <span className="text-[#b9935a] tracking-[0.2em] text-sm uppercase font-semibold">Vintage Fashion</span>
            <div className="h-px bg-[#b9935a] w-16"></div>
          </div>
          
          <p className="text-lg text-[#e9ece4]/80 leading-relaxed font-light px-8">
            Curated collections of timeless, sustainable fashion. Elegant style for the modern era.
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-16 relative">
        <div className="max-w-md w-full bg-[#fdfdfc] lg:bg-transparent p-8 sm:p-10 rounded-sm shadow-2xl lg:shadow-none border border-[#b9935a]/20 lg:border-none relative">
          
          {/* Decorative Corners for Mobile Card */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#b9935a] lg:hidden"></div>
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#b9935a] lg:hidden"></div>
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#b9935a] lg:hidden"></div>
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#b9935a] lg:hidden"></div>

          {/* Mobile Header (Visible only on small screens) */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-3xl font-serif text-[#143d30] tracking-widest uppercase mb-2">
              Vaishan & J
            </h1>
            <div className="flex items-center gap-2 justify-center">
              <div className="h-px bg-[#b9935a] w-8"></div>
              <span className="text-[#b9935a] tracking-[0.1em] text-xs uppercase font-semibold">Vintage Fashion</span>
              <div className="h-px bg-[#b9935a] w-8"></div>
            </div>
          </div>

          {/* Form Header */}
          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-2xl lg:text-3xl font-serif text-[#143d30] mb-2 tracking-tight">
              {isLogin && 'Welcome back'}
              {isRegister && 'Create an account'}
              {isForgotPassword && 'Reset your password'}
              {isResetPassword && 'Enter verification code'}
            </h2>
            <p className="text-[#143d30]/60 text-sm">
              {isLogin && 'Please enter your credentials to sign in.'}
              {isRegister && 'Join us today! Fill in your details to get started.'}
              {isForgotPassword && 'Enter your username or email and we will send an OTP.'}
              {isResetPassword && 'Check your email for the OTP and choose a new password.'}
            </p>
          </div>

          {/* Status Messages */}
          {message.text && (
            <div
              className={`mb-6 p-4 rounded-sm text-sm font-medium flex items-center gap-3 transition-all ${
                message.type === 'error'
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-[#143d30]/10 text-[#143d30] border border-[#143d30]/20'
              }`}
            >
              {message.type === 'error' ? (
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              ) : (
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              )}
              <span className="flex-1">{message.text}</span>
            </div>
          )}

          {isForgotPassword && (
            <form className="space-y-5" onSubmit={handleForgotPassword}>
              <div>
                <label htmlFor="identifier" className="block text-sm font-semibold text-[#143d30] mb-1.5 ml-1">
                  Username or Email
                </label>
                <div className="relative">
                  <input
                    id="identifier"
                    name="identifier"
                    type="text"
                    autoComplete="username"
                    required
                    value={resetData.identifier}
                    onChange={handleResetChange}
                    className="peer block w-full pl-11 pr-4 py-3 text-[#143d30] bg-[#e9ece4]/50 border border-[#b9935a]/50 rounded-sm focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#143d30] focus:border-[#143d30] transition-all sm:text-sm"
                    placeholder="Enter username or email"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#b9935a] peer-focus:text-[#143d30] transition-colors">
                    <MailIcon />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="relative w-full flex justify-center items-center py-3.5 px-4 border border-transparent text-sm font-bold tracking-wider uppercase rounded-sm text-[#e9ece4] bg-[#143d30] hover:bg-[#0f2e24] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#143d30] disabled:opacity-70 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all duration-200 active:scale-[0.98]"
                >
                  {loading ? 'Sending OTP...' : 'Send OTP'}
                </button>
              </div>
            </form>
          )}

          {isResetPassword && (
            <form className="space-y-5" onSubmit={handleResetPassword}>
              <div>
                <label htmlFor="otp" className="block text-sm font-semibold text-[#143d30] mb-1.5 ml-1">
                  OTP
                </label>
                <input
                  id="otp"
                  name="otp"
                  type="text"
                  inputMode="numeric"
                  maxLength="6"
                  required
                  value={resetData.otp}
                  onChange={handleResetChange}
                  className="block w-full px-4 py-3 text-[#143d30] bg-[#e9ece4]/50 border border-[#b9935a]/50 rounded-sm focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#143d30] focus:border-[#143d30] transition-all sm:text-sm"
                  placeholder="Enter 6 digit OTP"
                />
              </div>

              <div>
                <label htmlFor="reset-password" className="block text-sm font-semibold text-[#143d30] mb-1.5 ml-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="reset-password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={resetData.password}
                    onChange={handleResetChange}
                    className="peer block w-full pl-11 pr-4 py-3 text-[#143d30] bg-[#e9ece4]/50 border border-[#b9935a]/50 rounded-sm focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#143d30] focus:border-[#143d30] transition-all sm:text-sm"
                    placeholder="New password"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#b9935a] peer-focus:text-[#143d30] transition-colors">
                    <LockIcon />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="relative w-full flex justify-center items-center py-3.5 px-4 border border-transparent text-sm font-bold tracking-wider uppercase rounded-sm text-[#e9ece4] bg-[#143d30] hover:bg-[#0f2e24] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#143d30] disabled:opacity-70 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all duration-200 active:scale-[0.98]"
                >
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          )}

          {/* Form Section */}
          {(isLogin || isRegister) && (
          <form className="space-y-5" onSubmit={handleSubmit}>
            
            {/* Username Field (Always Visible) */}
            <div>
              <label htmlFor="username" className="block text-sm font-semibold text-[#143d30] mb-1.5 ml-1">
                Username
              </label>
              <div className="relative">
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  className="peer block w-full pl-11 pr-4 py-3 text-[#143d30] bg-[#e9ece4]/50 border border-[#b9935a]/50 rounded-sm focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#143d30] focus:border-[#143d30] transition-all sm:text-sm"
                  placeholder="Enter your username"
                />
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#b9935a] peer-focus:text-[#143d30] transition-colors">
                  <UserIcon />
                </div>
              </div>
            </div>

            {/* Registration Specific Fields (Email & Role) */}
            {!isLogin && (
              <>
                {/* Email Field */}
                <div className="animate-fade-in-up">
                  <label htmlFor="email" className="block text-sm font-semibold text-[#143d30] mb-1.5 ml-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required={isRegister}
                      value={formData.email}
                      onChange={handleChange}
                      className="peer block w-full pl-11 pr-4 py-3 text-[#143d30] bg-[#e9ece4]/50 border border-[#b9935a]/50 rounded-sm focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#143d30] focus:border-[#143d30] transition-all sm:text-sm"
                      placeholder="you@example.com"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#b9935a] peer-focus:text-[#143d30] transition-colors">
                      <MailIcon />
                    </div>
                  </div>
                </div>

                {/* Role Field */}
                <div className="animate-fade-in-up" style={{ animationDelay: '50ms' }}>
                  <label htmlFor="role" className="block text-sm font-semibold text-[#143d30] mb-1.5 ml-1">
                    Account Role
                  </label>
                  <div className="relative">
                    <select
                      id="role"
                      name="role"
                      required={isRegister}
                      value={formData.role}
                      onChange={handleChange}
                      className="peer block w-full pl-11 pr-10 py-3 text-[#143d30] bg-[#e9ece4]/50 border border-[#b9935a]/50 rounded-sm focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#143d30] focus:border-[#143d30] transition-all sm:text-sm appearance-none cursor-pointer"
                    >
                      <option value="User">Standard User</option>
                      <option value="Admin">Administrator</option>
                      <option value="Manager">Manager</option>
                    </select>
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#b9935a] peer-focus:text-[#143d30] transition-colors">
                      <RoleIcon />
                    </div>
                    {/* Custom Dropdown Arrow */}
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-[#b9935a]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Password Field (Always Visible) */}
            <div className={!isLogin ? "animate-fade-in-up" : ""} style={{ animationDelay: !isLogin ? '100ms' : '0ms' }}>
              <div className="flex items-center justify-between mb-1.5 ml-1">
                <label htmlFor="password" className="block text-sm font-semibold text-[#143d30]">
                  Password
                </label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('forgot-password');
                      setMessage({ type: '', text: '' });
                      setResetData({ identifier: formData.username, otp: '', password: '' });
                    }}
                    className="text-sm font-semibold text-[#b9935a] hover:text-[#9d7c49] transition-colors"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="peer block w-full pl-11 pr-4 py-3 text-[#143d30] bg-[#e9ece4]/50 border border-[#b9935a]/50 rounded-sm focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#143d30] focus:border-[#143d30] transition-all sm:text-sm"
                  placeholder="••••••••"
                />
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#b9935a] peer-focus:text-[#143d30] transition-colors">
                  <LockIcon />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="relative w-full flex justify-center items-center py-3.5 px-4 border border-[#b9935a] text-sm font-bold tracking-wider uppercase rounded-sm text-[#e9ece4] bg-[#143d30] hover:bg-[#0f2e24] hover:text-[#b9935a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#143d30] disabled:opacity-70 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all duration-300 active:scale-[0.98]"
              >
                {loading ? 'Processing...' : (
                  isLogin ? 'Sign In' : 'Create Account'
                )}
              </button>
            </div>
          </form>
          )}

          {/* Toggle Login/Register */}
          <div className="text-center mt-8">
            {(isLogin || isRegister) ? (
              <p className="text-sm text-[#143d30]/70">
                {isLogin ? "Don't have an account? " : 'Already have an account? '}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="font-bold text-[#b9935a] hover:text-[#9d7c49] transition-colors focus:outline-none"
                >
                  {isLogin ? 'Sign up' : 'Log in'}
                </button>
              </p>
            ) : (
              <button
                type="button"
                onClick={showLogin}
                className="font-bold text-[#b9935a] hover:text-[#9d7c49] transition-colors focus:outline-none"
              >
                Back to log in
              </button>
            )}
          </div>
          
        </div>
      </div>
      
      {/* Optional: Simple inline CSS for fade-in animations on the new fields */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default Login;
