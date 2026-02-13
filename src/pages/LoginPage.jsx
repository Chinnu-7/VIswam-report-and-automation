import React, { useState } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';

const LoginPage = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await api.post('/auth/login', { email, password });
            localStorage.setItem('userInfo', JSON.stringify(res.data));
            onLogin(res.data);

            if (res.data.role === 'admin') {
                navigate('/admin');
            } else {
                navigate('/upload');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 overflow-hidden relative">
            {/* Background Animations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary opacity-20 blur-[120px] rounded-full animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600 opacity-20 blur-[120px] rounded-full animate-pulse [animation-delay:2s]"></div>
            </div>

            <div className="w-full max-w-md px-6 z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-2xl mb-6 backdrop-blur-sm border border-primary/20">
                        <span className="text-4xl font-black text-primary">V</span>
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Viswam Portal</h1>
                    <p className="text-slate-400">Enter your credentials to access the portal</p>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl flex items-center gap-3 animate-in shake duration-300">
                                <AlertCircle size={20} />
                                <span className="text-sm font-medium">{error}</span>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-300 ml-1">Email Address</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" size={20} />
                                <input
                                    type="email"
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                                    placeholder="name@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-300 ml-1">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" size={20} />
                                <input
                                    type="password"
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary hover:bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 transition-all transform active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                "Sign In"
                            )}
                        </button>
                    </form>
                </div>

                <div className="text-center mt-8">
                    <p className="text-slate-500 text-sm">
                        Viswam Report Card Automation & Approval System
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
