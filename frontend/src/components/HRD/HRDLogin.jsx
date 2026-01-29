// HRDLogin.jsx - Exact Replica of Student Login Card for HRD
import React, { useState, useEffect, useRef } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, Loader2, BriefcaseBusiness } from 'lucide-react';
import { api } from '../../api'; // Use configured API instance
import gsap from 'gsap';
import ParticleBackground from '../../components/ParticleBackground';

// Exact Input Component from App.jsx
const Input = ({ icon: Icon, className = '', type = 'text', ...props }) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
        <div className="relative group">
            {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-purple-400 transition-colors" />}
            <input
                {...props}
                type={inputType}
                className={`w-full bg-slate-800/50 backdrop-blur-xl text-white placeholder-gray-500 border border-white/10 rounded-xl py-3.5 ${Icon ? 'pl-12' : 'px-4'} ${isPassword ? 'pr-12' : 'pr-4'} focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 outline-none transition duration-300 hover:bg-slate-800/80 ${className}`}
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
    const cardRef = useRef(null);

    // Initial GSAP Animation (Card Flip/Persp Effect base)
    useEffect(() => {
        if (cardRef.current) {
            gsap.fromTo(cardRef.current,
                { opacity: 0, y: 20, rotationX: 10 },
                { opacity: 1, y: 0, rotationX: 0, duration: 0.8, ease: "power3.out" }
            );
        }
    }, []);

    const handleLogin = async () => {
        if (!email || !password) {
            setError("Please enter email and password.");
            return;
        }

        setError('');
        setLoading(true);

        try {
            // Using correct api instance
            const response = await api.post('/hrd/login', { email, password });

            if (response.data.success) {
                const token = response.data.token;
                const user = response.data.user;

                localStorage.setItem('noteorbit_token', token);
                localStorage.setItem('noteorbit_user', JSON.stringify(user));

                // Success transition
                gsap.to(cardRef.current, {
                    scale: 1.05,
                    opacity: 0,
                    duration: 0.3,
                    onComplete: () => {
                        setToken(token);
                        setUserRole('HRD');
                        setPage('hrd-dashboard');
                    }
                });
            } else {
                setError(response.data.message || 'Login failed');
                // Shake on error
                gsap.fromTo(cardRef.current, { x: -5 }, { x: 5, duration: 0.1, repeat: 5, yoyo: true });
            }
        } catch (err) {
            console.error("Login Error:", err);
            setError(err.response?.data?.message || 'Connection failed. Please check backend.');
            // Shake on error
            gsap.fromTo(cardRef.current, { x: -5 }, { x: 5, duration: 0.1, repeat: 5, yoyo: true });
        } finally {
            setLoading(false);
        }
    };

    // Button Classes from App.jsx
    const buttonClass = "w-full flex items-center justify-center px-4 py-3 font-semibold rounded-full shadow-md transition duration-200";
    const primaryButtonClass = "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"; // HRD Theme

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden py-8 px-4 font-sans selection:bg-purple-500/30 selection:text-purple-200">
            {/* Global Background */}
            <ParticleBackground />

            {/* Ambient Glows */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] opacity-20" />
            </div>

            {/* Container with Perspective - Exact match to CredentialsView container */}
            <div style={{ perspective: "1000px" }} className="w-full max-w-md mx-auto relative z-10">
                <div ref={cardRef} className="relative w-full transition-all duration-500" style={{ transformStyle: "preserve-3d" }}>

                    {/* FRONT FACE (Login) - Copied structure from CredentialsView */}
                    <div className="relative w-full bg-black/20 md:bg-slate-900/60 backdrop-blur-2xl p-8 rounded-3xl shadow-2xl border border-white/10 overflow-hidden"
                        style={{ backfaceVisibility: "hidden" }}>

                        {/* Top Gradient Bar */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50" />

                        <div className="flex justify-center mb-6">
                            <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl border border-white/5">
                                <BriefcaseBusiness className="w-8 h-8 text-purple-400" />
                            </div>
                        </div>

                        <h3 className="text-3xl font-bold mb-8 text-white text-center tracking-tight">HRD Portal</h3>

                        {/* Error Display */}
                        {error && (
                            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
                                {error}
                            </div>
                        )}

                        <div className="space-y-5">
                            <Input
                                icon={Mail}
                                type="email"
                                placeholder="HRD Email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                            <div>
                                <Input
                                    icon={Lock}
                                    type="password"
                                    placeholder="Password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                />
                                <div className="text-right mt-2">
                                    <button className="text-xs text-purple-400 hover:text-purple-300 disabled:opacity-50" disabled>
                                        Forgot Password?
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    className={`${buttonClass} flex-1 bg-slate-800 text-slate-300 hover:bg-slate-700`}
                                    onClick={() => { setPage('user_type'); setUserRole(null); }}
                                    disabled={loading}
                                >
                                    <ArrowLeft className="w-5 h-5 mr-1" /> Back
                                </button>
                                <button
                                    className={`${buttonClass} flex-1 ${primaryButtonClass}`}
                                    onClick={handleLogin}
                                    disabled={loading}
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Sign In"}
                                </button>
                            </div>
                        </div>

                        {/* Demo Creds Footer */}
                        <div className="mt-8 pt-4 border-t border-white/5 text-center">
                            <p className="text-xs text-slate-500">Demo: hrd@noteorbit.edu / hrdsnpsu123</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HRDLogin;
