// HRDLogin.jsx - Premium GSAP Enabled HRD Login
import React, { useState, useEffect, useRef } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, BriefcaseBusiness, Loader2, Warehouse } from 'lucide-react';
import axios from 'axios';
import gsap from 'gsap';
import ParticleBackground from '../../components/ParticleBackground';

// Reusing the exact Input component from App.jsx for consistency
const Input = ({ icon: Icon, className = '', type = 'text', ...props }) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
        <div className="relative group">
            {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-400 transition-colors" />}
            <input
                {...props}
                type={inputType}
                className={`w-full bg-slate-800/50 backdrop-blur-xl text-white placeholder-gray-500 border border-white/10 rounded-xl py-3.5 ${Icon ? 'pl-12' : 'px-4'} ${isPassword ? 'pr-12' : 'pr-4'} focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition duration-300 hover:bg-slate-800/80 ${className}`}
            />
            {isPassword && (
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
            )}
        </div>
    );
};

const HRDLogin = ({ setToken, setPage, setUserRole }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Animation Refs
    const containerRef = useRef(null);
    const formRef = useRef(null);
    const titleRef = useRef(null);

    // Initial GSAP Animation
    useEffect(() => {
        const tl = gsap.timeline();

        // Match the "Buttery Smooth" feel
        tl.fromTo(containerRef.current,
            { opacity: 0, scale: 0.95 },
            { opacity: 1, scale: 1, duration: 0.8, ease: "power3.out" }
        )
            .fromTo(titleRef.current,
                { opacity: 0, y: -20 },
                { opacity: 1, y: 0, duration: 0.6, ease: "back.out(1.7)" },
                "-=0.4"
            )
            .fromTo(formRef.current.children,
                { opacity: 0, x: -20 },
                { opacity: 1, x: 0, stagger: 0.1, duration: 0.5, ease: "power2.out" },
                "-=0.4"
            );

    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Using relative path which now works via Vite Proxy
            const response = await axios.post('/hrd/login', { email, password });

            if (response.data.success) {
                const token = response.data.token;
                const user = response.data.user;

                // Store token and user info
                localStorage.setItem('noteorbit_token', token);
                localStorage.setItem('noteorbit_user', JSON.stringify(user));

                // Success Animation before transition
                gsap.to(containerRef.current, {
                    scale: 1.05,
                    opacity: 0,
                    duration: 0.4,
                    ease: "power2.in",
                    onComplete: () => {
                        setToken(token);
                        setUserRole('HRD');
                        setPage('hrd-dashboard');
                    }
                });
            } else {
                setError(response.data.message || 'Login failed');
                // Shake animation on error
                gsap.fromTo(containerRef.current,
                    { x: -10 },
                    { x: 10, duration: 0.1, repeat: 5, yoyo: true, ease: "none", onComplete: () => gsap.set(containerRef.current, { x: 0 }) }
                );
            }
        } catch (err) {
            console.error("Login Error:", err);
            setError(err.response?.data?.message || 'Connection failed. Please check backend.');
            gsap.fromTo(containerRef.current,
                { x: -10 },
                { x: 10, duration: 0.1, repeat: 5, yoyo: true, ease: "none", onComplete: () => gsap.set(containerRef.current, { x: 0 }) }
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden py-8 px-4 font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
            {/* 1. Global Background */}
            <ParticleBackground />

            {/* 2. Ambient Glows (Matches other portals) */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] opacity-20 animate-pulse" />
                <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px] opacity-20" />
            </div>

            {/* Back Button */}
            <button
                onClick={() => { setPage('user_type'); setUserRole(null); }}
                className="absolute top-6 left-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors z-50 group"
            >
                <div className="p-2 bg-white/5 rounded-full group-hover:bg-white/10 transition-colors">
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                </div>
                <span className="text-sm font-medium">Back to Portal</span>
            </button>

            {/* Main Login Card */}
            <div ref={containerRef} className="relative w-full max-w-md z-10 mx-auto">
                <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                    {/* Glass Shine Effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

                    {/* Header */}
                    <div ref={titleRef} className="text-center mb-10 relative z-10">
                        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/30 transform rotate-3 hover:rotate-6 transition-transform duration-500">
                            <BriefcaseBusiness className="w-10 h-10 text-white" />
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">HRD Portal</h2>
                        <p className="text-slate-400 text-sm">Placement & Career Services</p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            {error}
                        </div>
                    )}

                    {/* Login Form */}
                    <form ref={formRef} onSubmit={handleLogin} className="space-y-6 relative z-10">

                        <Input
                            icon={Mail}
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Official HRD Email"
                            required
                        />

                        <Input
                            icon={Lock}
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Secure Password"
                            required
                        />

                        {/* Login Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold py-4 rounded-xl hover:shadow-lg hover:shadow-indigo-500/30 transition-all duration-300 transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Authenticating...</span>
                                </>
                            ) : (
                                <span>Sign In to Dashboard</span>
                            )}
                        </button>
                    </form>

                    {/* Footer / Demo Credentials */}
                    <div className="mt-8 pt-6 border-t border-white/5 text-center">
                        <p className="text-xs text-slate-500 mb-4">Authorized Personnel Only</p>

                        <div className="inline-block px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                            <p className="text-xs text-indigo-300 font-medium">Demo: hrd@noteorbit.edu / hrdsnpsu123</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HRDLogin;
