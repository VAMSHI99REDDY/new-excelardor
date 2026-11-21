"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@/utils/supabase/client';

export default function AdminLogin() {
  const [email, setEmail] = useState('excelardor@gmail.com');
  const [password, setPassword] = useState('Excelardor99');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
    } else {
      // Set single-use login ticket to allow the initial entry into the dashboard
      document.cookie = 'admin_login_fresh=1; path=/; max-age=15; SameSite=Lax';

      // Clear any legacy sessionStorage flags
      sessionStorage.clear();

      router.push('/admin');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8 sm:px-6 lg:px-8 font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-100">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Admin Login</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-2">Enter credentials to access the ExcelArdor admin dashboard</p>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#4A6B35] focus:ring-1 focus:ring-[#4A6B35] text-sm sm:text-base text-gray-900 bg-gray-50 focus:bg-white transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#4A6B35] focus:ring-1 focus:ring-[#4A6B35] text-sm sm:text-base text-gray-900 bg-gray-50 focus:bg-white transition-all"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#4A6B35] text-white font-bold uppercase tracking-widest text-xs sm:text-sm py-3.5 sm:py-4 rounded-xl hover:bg-green-800 active:scale-[0.99] transition-all disabled:opacity-50 shadow-md shadow-green-900/10 cursor-pointer"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
