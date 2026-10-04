import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { User, UserRole } from '../types';
import { Lock, User as UserIcon, LogIn, AlertCircle, KeyRound, Zap, ArrowRight, ClipboardList, ShieldCheck, LineChart, LayoutDashboard,
  Layers, ArrowLeft, Clock } from 'lucide-react';
import FastProductCreateModal from '../components/products/FastProductCreateModal';
import WelcomePage from "../components/WelcomePage";
import SystemChecklist from '../components/admin/SystemChecklist';
import { addProduct, getUsers } from '../services/dataService';
import { LoginPage } from '../components/auth/LoginPage';

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
      <>
        <LoginPage
          onLogin={async (u, p) => {
            setError('');
            setSuccessMsg('');
            try {
              const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: u, password: p })
              });
              const data = await res.json();
              if (!res.ok) {
                setError(data.error || 'نام کاربری یا رمز عبور اشتباه است.');
                return;
              }
              if (data.requireOTP) {
                setRequireOTP(true);
                setTempToken(data.tempToken);
                if (data.message) setSuccessMsg(data.message);
              } else {
                signIn(data.user, data.accessToken);
              }
            } catch (err) {
              setError('خطا در برقراری ارتباط با سرور.');
            }
          }}
          onVerifyOTP={async (code) => {
            setError('');
            try {
              const res = await fetch('/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tempToken, otp: code })
              });
              const data = await res.json();
              if (!res.ok) {
                setError(data.error || 'کد ورود نامعتبر است');
                return;
              }
              setRequireOTP(false);
              signIn(data.user, data.accessToken);
            } catch (err) {
              setError('خطا در ارتباط با سرور.');
            }
          }}
          requireOTP={requireOTP}
          setRequireOTP={setRequireOTP}
          error={error}
          setError={setError}
          successMsg={successMsg}
          onBackToWelcome={() => setShowLogin(false)}
          onOpenChecklist={() => setIsChecklistOpen(true)}
          onOpenFastProduct={() => setIsFastProductModalOpen(true)}
        />

        <FastProductCreateModal
          isOpen={isFastProductModalOpen}
          onClose={() => setIsFastProductModalOpen(false)}
          onSave={handleFastSaveProduct}
        />
      </>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, accessToken, signIn, signOut: handleSignOut, checkAuth, refreshUserData }}>
      {children}
    </AuthContext.Provider>
  );
};

