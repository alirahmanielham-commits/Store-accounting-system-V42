import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { User, UserRole } from '../types';
import { Lock, User as UserIcon, LogIn, AlertCircle, KeyRound, Zap, ArrowRight, ClipboardList, ShieldCheck, LineChart, LayoutDashboard,
  Layers, ArrowLeft, Clock } from 'lucide-react';
import FastProductCreateModal from '../components/products/FastProductCreateModal';
import WelcomePage from "../components/WelcomePage";
import SystemChecklist from '../components/admin/SystemChecklist';
import { addProduct, getUsers } from '../services/dataService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  accessToken: string | null;
  signIn: (u: User, token?: string) => Promise<void>;
  signOut: () => Promise<void>;
  checkAuth: () => void;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
  accessToken: null,
  signIn: async () => {},
  signOut: async () => {},
  checkAuth: () => {},
  refreshUserData: async () => {}
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Inactivity tracking
  const lastActivityRef = useRef<number>(Date.now());

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // OTP state
  const [requireOTP, setRequireOTP] = useState(false);
  const [otp, setOtp] = useState('');
  const [tempToken, setTempToken] = useState('');

  const [isFastProductModalOpen, setIsFastProductModalOpen] = useState(false);
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);

  const checkAuth = useCallback(async () => {
    // Session expiration on browser close:
    // If the browser was closed, sessionStorage is empty.
    const isSessionActive = sessionStorage.getItem('taraz_session_active');
    const storedUserStr = sessionStorage.getItem('auth_user');
    const storedToken = sessionStorage.getItem('access_token');
    
    if (!isSessionActive || !storedUserStr) {
      // Browser was closed or brand new session -> expire any old session
      localStorage.removeItem('auth_user');
      localStorage.removeItem('access_token');
      localStorage.removeItem('taraz_session_active');
      sessionStorage.removeItem('auth_user');
      sessionStorage.removeItem('access_token');
      sessionStorage.removeItem('taraz_session_active');
      sessionStorage.removeItem('taraz_last_activity');
      setUser(null);
      setAccessToken(null);
      setLoading(false);
      return;
    }

    if (storedUserStr) {
      try {
        const parsedUser: User = JSON.parse(storedUserStr);
        setUser(parsedUser);
        if (storedToken) setAccessToken(storedToken);

        // Fetch fresh user data from database to pick up any updated permissions made by admin
        getUsers().then(usersList => {
          if (Array.isArray(usersList)) {
            const freshUser = usersList.find(u => String(u.id) === String(parsedUser.id) || u.username === parsedUser.username);
            if (freshUser && freshUser.isActive !== false) {
              const merged: User = { ...parsedUser, ...freshUser };
              setUser(merged);
              sessionStorage.setItem('auth_user', JSON.stringify(merged));
            } else if (freshUser && freshUser.isActive === false) {
              // User was deactivated by admin
              handleSignOut();
              setError('حساب کاربری شما توسط مدیر غیرفعال شده است.');
              setShowLogin(true);
            }
          }
        }).catch(() => {});
      } catch (e) {
        console.error('Error parsing stored user:', e);
      }
    }
    setLoading(false);
  }, []);

  const refreshUserData = async () => {
    if (!user) return;
    try {
      const usersList = await getUsers();
      if (Array.isArray(usersList)) {
        const freshUser = usersList.find(u => String(u.id) === String(user.id) || u.username === user.username);
        if (freshUser) {
          const merged: User = { ...user, ...freshUser };
          setUser(merged);
          sessionStorage.setItem('auth_user', JSON.stringify(merged));
        }
      }
    } catch (e) {
      console.error('Error refreshing user data:', e);
    }
  };

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const signIn = async (u: User, token?: string) => {
    setUser(u);
    const now = Date.now();
    lastActivityRef.current = now;
    // Mark session active in sessionStorage (cleared automatically when browser is closed)
    sessionStorage.setItem('taraz_session_active', '1');
    sessionStorage.setItem('auth_user', JSON.stringify(u));
    sessionStorage.setItem('taraz_last_activity', now.toString());
    if (token) {
      sessionStorage.setItem('access_token', token);
      setAccessToken(token);
    }
    // Clean up localStorage to ensure session cannot outlive browser closing
    localStorage.removeItem('auth_user');
    localStorage.removeItem('access_token');
    localStorage.removeItem('taraz_session_active');
  };

  const handleSignOut = async () => {
    setUser(null);
    setAccessToken(null);
    sessionStorage.removeItem('taraz_session_active');
    sessionStorage.removeItem('auth_user');
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('taraz_last_activity');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('access_token');
    localStorage.removeItem('taraz_session_active');
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch(e) {}
  };

  // --- Inactivity Timeout Watcher ---
  useEffect(() => {
    if (!user) return;

    // Timeout in minutes set per user by administrator (defaults to 15 mins if not set)
    const timeoutMinutes = (typeof user.autoLogoutMinutes === 'number' && user.autoLogoutMinutes > 0)
      ? user.autoLogoutMinutes
      : 15;
    const timeoutMs = timeoutMinutes * 60 * 1000;

    let lastRecorded = Date.now();
    lastActivityRef.current = lastRecorded;
    sessionStorage.setItem('taraz_last_activity', lastRecorded.toString());

    const handleActivity = () => {
      const now = Date.now();
      // Throttle updating timestamp to once per second
      if (now - lastRecorded > 1000) {
        lastRecorded = now;
        lastActivityRef.current = now;
        sessionStorage.setItem('taraz_last_activity', now.toString());
      }
    };

    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click', 'wheel'];
    activityEvents.forEach(evt => {
      window.addEventListener(evt, handleActivity, { passive: true });
    });

    // Inactivity poll interval every 2.5 seconds
    const interval = setInterval(() => {
      const now = Date.now();
      const storedLast = Number(sessionStorage.getItem('taraz_last_activity')) || lastActivityRef.current;
      const latestActivity = Math.max(lastActivityRef.current, storedLast);
      const elapsed = now - latestActivity;

      if (elapsed >= timeoutMs) {
        console.warn(`User inactive for ${timeoutMinutes} minutes. Automatic logout triggered.`);
        handleSignOut();
        setError(`نشست کاری شما به دلیل عدم فعالیت به مدت ${timeoutMinutes} دقیقه منقضی شد. لطفاً مجدداً وارد شوید.`);
        setShowLogin(true);
      }
    }, 2500);

    return () => {
      activityEvents.forEach(evt => {
        window.removeEventListener(evt, handleActivity);
      });
      clearInterval(interval);
    };
  }, [user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || 'خطا در ورود');
        return;
      }
      
      if (data.requireOTP) {
         setRequireOTP(true);
         setTempToken(data.tempToken);
         if (data.message) setSuccessMsg(data.message); // Demo only: show OTP code
      } else {
         signIn(data.user, data.accessToken);
      }
    } catch(err) {
       setError('خطا در ارتباط با سرور.');
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken, otp })
      });
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || 'کد ورود نامعتبر است');
        return;
      }
      
      setRequireOTP(false);
      signIn(data.user, data.accessToken);
    } catch(err) {
      setError('خطا در ارتباط با سرور.');
    }
  };

  const handleFastSaveProduct = async (productData: any): Promise<boolean> => {
    try {
      await addProduct(productData);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  if (loading) {
     return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 font-bold">در حال بررسی اطلاعات کاربری...</div>;
  }

  if (!user) {
    if (isChecklistOpen) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4 md:p-8" dir="rtl">
          <div className="w-full max-w-5xl mb-6 flex justify-between items-center">
            <h1 className="text-2xl font-black text-slate-900">چک‌لیست راه‌اندازی سیستم</h1>
            <button 
              onClick={() => setIsChecklistOpen(false)}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 bg-white px-5 py-2.5 rounded-xl shadow-sm border border-slate-200 transition-all font-bold group"
            >
              بازگشت به ورود
              <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
            </button>
          </div>
          <div className="w-full max-w-5xl bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
             <SystemChecklist />
          </div>
        </div>
      );
    }


    if (!showLogin) {
      return <WelcomePage onLoginClick={() => setShowLogin(true)} />;
    }

    return (
      <div className="min-h-screen flex w-full bg-slate-50 font-sans" dir="rtl">
        {/* Right Side: Login Form */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 lg:p-12 relative z-10">
          <div className="w-full max-w-md">
            <div className="mb-10 text-center lg:text-right">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-[1.5rem] bg-indigo-600 text-white mb-6 shadow-xl shadow-indigo-600/30 relative overflow-hidden">
                <div className="absolute inset-0 bg-white/20 transform -rotate-45 translate-x-4"></div>
                <Layers className="w-10 h-10 relative z-10" />
              </div>
              <h2 className="text-4xl font-black text-slate-900 mb-2 flex items-center justify-center lg:justify-end gap-3">
                 تراز <span className="text-slate-300 font-light mx-1">|</span> <span className="text-indigo-600 text-2xl tracking-widest">TARAZ</span>
              </h2>
              <p className="text-slate-500 font-medium">جهت دسترسی به پنل مدیریت، اطلاعات خود را وارد کنید.</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-800 text-sm rounded-2xl font-bold flex items-start gap-3 border border-red-100/50 shadow-sm">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{error}</p>
              </div>
            )}
            {successMsg && (
              <div className="mb-6 p-4 bg-emerald-50 text-emerald-800 text-sm rounded-2xl font-bold flex items-start gap-3 border border-emerald-100/50 shadow-sm break-all">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{successMsg}</p>
              </div>
            )}

            <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
              {!requireOTP ? (
                  <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"><UserIcon className="w-4 h-4 text-slate-400"/> نام کاربری</label>
                        <input type="text" value={username} onChange={e=>setUsername(e.target.value)} required className="w-full px-5 py-4 bg-slate-50 hover:bg-slate-100/50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-600 focus:bg-white font-sans text-left transition-all font-semibold placeholder-slate-400" dir="ltr" placeholder="admin" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"><Lock className="w-4 h-4 text-slate-400"/> رمز عبور</label>
                        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required className="w-full px-5 py-4 bg-slate-50 hover:bg-slate-100/50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-600 focus:bg-white font-sans text-left transition-all font-semibold placeholder-slate-400 tracking-[0.2em]" dir="ltr" placeholder="••••••••" />
                    </div>
                    <button type="submit" className="w-full py-4 mt-2 bg-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-600/20 transition-all active:scale-[0.98]">
                        <LogIn className="w-5 h-5"/>
                        ورود به حساب کاربری
                    </button>
                  </form>
              ) : (
                  <form onSubmit={handleVerifyOTP} className="space-y-6 animate-in slide-in-from-right relative">
                    <button type="button" onClick={() => setRequireOTP(false)} className="text-sm text-slate-500 font-bold mb-2 block hover:text-indigo-600 transition-colors flex items-center gap-2"><ArrowRight className="w-4 h-4"/> بازگشت به مرحله قبل</button>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"><KeyRound className="w-4 h-4 text-slate-400"/> کد تایید (OTP)</label>
                        <input type="text" value={otp} onChange={e=>setOtp(e.target.value)} required className="w-full px-5 py-4 bg-slate-50 hover:bg-slate-100/50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-600 focus:bg-white font-mono font-black text-center text-3xl tracking-[0.5em] transition-all" dir="ltr" placeholder="------" maxLength={6} />
                    </div>
                    <button type="submit" className="w-full py-4 mt-2 bg-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-600/20 transition-all active:scale-[0.98]">
                        <Lock className="w-5 h-5"/>
                        تایید و ورود
                    </button>
                  </form>
              )}
            </div>

            <div className="mt-8 flex flex-col gap-4">
              <button
                type="button"
                onClick={() => setIsFastProductModalOpen(true)}
                className="flex items-center justify-between w-full p-4 rounded-2xl bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-700 border border-slate-200 hover:border-amber-200 shadow-sm transition-all group"
              >
                <div className="flex items-center gap-3 font-bold">
                  <div className="p-2 bg-slate-100 text-slate-500 group-hover:bg-amber-100 group-hover:text-amber-600 rounded-xl transition-colors">
                    <Zap className="w-5 h-5" />
                  </div>
                  ثبت سریع کالا (بدون ورود)
                </div>
                <ArrowLeft className="w-5 h-5 opacity-40 group-hover:opacity-100 transition-opacity" />
              </button>
              
              <button
                type="button"
                onClick={() => setIsChecklistOpen(true)}
                className="flex lg:hidden items-center justify-between w-full p-4 rounded-2xl bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200 shadow-sm transition-all group"
              >
                <div className="flex items-center gap-3 font-bold">
                  <div className="p-2 bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 rounded-xl transition-colors">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  مشاهده چک‌لیست راه‌اندازی
                </div>
                <ArrowLeft className="w-5 h-5 opacity-40 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
            
            <p className="text-center text-[10px] text-slate-400 mt-12 font-bold tracking-widest uppercase opacity-60">
              Secure Store Management System
            </p>
          </div>
        </div>

        {/* Left Side: Branding / Info (Hidden on Mobile) */}
        <div className="hidden lg:flex lg:w-1/2 bg-slate-900 relative overflow-hidden flex-col justify-between p-12 lg:p-24 text-white">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-emerald-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
          
          <div className="relative z-10 max-w-lg">
            <h1 className="text-5xl font-black leading-[1.2] mb-6 tracking-tight">
              مدیریت هوشمند،<br/>
              <span className="text-indigo-400">فروش یکپارچه.</span>
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed font-medium mb-12">
              سیستم جامع حسابداری و مدیریت فروشگاه تراز، طراحی شده برای کنترل دقیق منابع، امور مالی و انبار با بالاترین استانداردهای امنیتی.
            </p>

            <div className="space-y-8">
              <div className="flex items-start gap-5">
                <div className="mt-1 p-3 bg-white/5 rounded-2xl border border-white/10 text-emerald-400 shadow-inner">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-xl mb-2 text-white">امنیت و پایداری</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">دسترسی‌های کنترل شده و حفاظت کامل از اطلاعات حساس تجاری شما.</p>
                </div>
              </div>
              <div className="flex items-start gap-5">
                <div className="mt-1 p-3 bg-white/5 rounded-2xl border border-white/10 text-indigo-400 shadow-inner">
                  <LineChart className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-xl mb-2 text-white">گزارشات تحلیلی</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">مشاهده وضعیت لحظه‌ای انبار، بدهکاران، و نمودارهای سود و زیان دقیق.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-12 mt-12 border-t border-white/10">
            <button
                type="button"
                onClick={() => setIsChecklistOpen(true)}
                className="flex items-center justify-between w-full bg-white/5 hover:bg-white/10 border border-white/10 px-8 py-6 rounded-3xl transition-all font-bold text-lg group backdrop-blur-sm"
            >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/10 rounded-2xl">
                    <ClipboardList className="w-6 h-6 text-indigo-300" />
                  </div>
                  <span>چک‌لیست راه‌اندازی سیستم</span>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-indigo-500 transition-colors">
                  <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                </div>
            </button>
          </div>
        </div>

        <FastProductCreateModal
          isOpen={isFastProductModalOpen}
          onClose={() => setIsFastProductModalOpen(false)}
          onSave={handleFastSaveProduct}
        />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, accessToken, signIn, signOut: handleSignOut, checkAuth, refreshUserData }}>
      {children}
    </AuthContext.Provider>
  );
};

