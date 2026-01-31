// NoteOrbitStudentHostel.jsx (FINAL IMPLEMENTATION - Including Live Hostel Complaint Tracking)
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import axios from 'axios';
import gsap from 'gsap';
import {
    LogIn, UserPlus, LogOut, ArrowLeft, ArrowRight, Loader2, CheckCircle, XCircle, ChevronDown,
    Book, Bell, Settings, Briefcase, User, Mail, Lock, GraduationCap, ClipboardList,
    BriefcaseBusiness, IndianRupee, Award, MessageSquare, Upload, RefreshCw,
    Trash2, Save, Home, Search, Download, Check, Atom, Star, Sparkles, Plus, Filter, Eye, EyeOff, Edit,
    BrainCircuit, AlertTriangle, Target, Lightbulb, Send as SendIcon, Paperclip, Menu, History, Bot, BarChart3
} from 'lucide-react';

// --- COMPONENTS IMPORT ---
import { api, setAuthToken, sendOtp, verifyOtp, resetPassword, registerWithOtp } from "./api";
import ParticleBackground from './components/ParticleBackground';
import HRDLogin from './components/HRD/HRDLogin';
import HRDDashboard from './components/HRD/HRDDashboard';
import PlacementAssist from './components/Student/PlacementAssist';

// Compatibility shims for existing code
// note: api.js handles tokens via interceptors automatically
const auth = () => api;
const unauth = () => api;


function useCatalogs() {
    const [degrees, setDegrees] = useState([]);
    const [sections, setSections] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [loaded, setLoaded] = useState(false);

    const fetchBasics = useCallback(async () => {
        try {
            // Using unauth() for public catalog lists
            const [deg] = await Promise.all([
                unauth().get("/admin/degrees"),
            ]);
            setDegrees(deg.data.degrees || []);
            // Sections now depend on context, don't fetch globally
        } catch (e) {
            console.error("Failed to fetch basics from backend:", e);
            setDegrees([]);
        } finally {
            setLoaded(true);
        }
    }, []);

    const fetchSubjects = useCallback(async (degree, semester) => {
        if (!degree || !semester) {
            setSubjects([]);
            return [];
        }
        try {
            // Using unauth() for public catalog lists
            const res = await unauth().get("/admin/subjects", { params: { degree, semester } });
            const subjNames = (res.data.subjects || []).map(s => s.name);
            setSubjects(subjNames);
            return subjNames;
        } catch (e) {
            console.error("Failed to fetch subjects:", e);
            setSubjects([]);
            return [];
        }
    }, []);

    const fetchSections = useCallback(async (degree, semester) => {
        if (!degree || !semester) {
            setSections([]);
            return [];
        }
        try {
            const res = await unauth().get("/admin/sections", { params: { degree, semester } });
            const secNames = res.data.sections || [];
            setSections(secNames);
            return secNames;
        } catch (e) {
            console.error("Failed to fetch sections:", e);
            setSections([]);
            return [];
        }
    }, []);

    useEffect(() => { fetchBasics(); }, [fetchBasics]);
    return { degrees, sections, subjects, fetchSubjects, fetchSections, loaded, fetchBasics };
}

function useLocalUser() {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const loadUser = useCallback(() => {
        const raw = localStorage.getItem("noteorbit_user");
        const token = localStorage.getItem("noteorbit_token");

        if (raw && token) {
            try {
                const parsedUser = JSON.parse(raw);
                setUser(parsedUser);
                setAuthToken(token);
            } catch (e) {
                console.error("Corrupted user data in localStorage", e);
                setAuthToken(null);
                localStorage.removeItem("noteorbit_user");
                setUser(null);
            }
        }
        setIsLoading(false);
    }, []);

    useEffect(() => { loadUser(); }, [loadUser]);

    return [user, setUser, isLoading];
}

// --- UI COMPONENTS (Praman Style) ---
const OrbitLogo = () => {
    return (
        <div className="flex items-center gap-3 cursor-pointer select-none">
            <div className="relative flex items-center justify-center w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20 ring-1 ring-white/10">
                <Book className="w-5 h-5 text-white stroke-[2.5]" />
                <div className="absolute top-0 right-0 -mr-1 -mt-1 w-3 h-3 bg-amber-400 rounded-full border-2 border-slate-950" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">
                Note<span className="font-light text-blue-200">Orbit</span>
            </span>
        </div>
    )
}

// --- COMPONENTS IMPORT ---
// --- COMPONENTS IMPORT (Helpers imported above) ---

const BACKEND_BASE_URL = "https://dozens-replace-revenue-legendary.trycloudflare.com"; // Defined for payment redirection


// --- UTILS ---
const cents_to_rupees_str = (c) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(c / 100);

// --- UI COMPONENTS (Modern Dark Glass) ---
const Input = ({ icon: Icon, className = '', type = 'text', ...props }) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
        <div className="relative group">
            {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-400 transition-colors" />}
            <input
                {...props}
                type={inputType}
                className={`w-full bg-slate-800/50 backdrop-blur-xl text-white placeholder-gray-500 border border-white/10 rounded-xl py-3.5 ${Icon ? 'pl-12' : 'px-4'} ${isPassword ? 'pr-12' : 'pr-4'} focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition duration-300 hover:bg-slate-800/80 ${className}`}
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

const Select = ({ icon: Icon, className = '', children, ...props }) => (
    <div className="relative group">
        {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-400 pointer-events-none transition-colors" />}
        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        <select
            {...props}
            className={`w-full bg-slate-800/50 backdrop-blur-xl text-white border border-white/10 rounded-xl py-3.5 ${Icon ? 'pl-12 pr-10' : 'px-4'} appearance-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition duration-300 hover:bg-slate-800/80 cursor-pointer ${className}`}
        >
            {children}
        </select>
    </div>
);

const MessageBar = ({ message, type, onClose }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [displayMessage, setDisplayMessage] = useState(null);
    const [displayType, setDisplayType] = useState(null);
    const barRef = useRef(null);

    useEffect(() => {
        if (message) {
            setDisplayMessage(message);
            setDisplayType(type);
            setIsVisible(true);

            // Animate In
            if (barRef.current) {
                gsap.killTweensOf(barRef.current);
                gsap.fromTo(barRef.current,
                    { y: -20, opacity: 0, scale: 0.95 },
                    { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: "elastic.out(1, 0.75)" }
                );
            }
        } else {
            // Animate Out
            if (barRef.current && isVisible) {
                gsap.to(barRef.current, {
                    y: -20,
                    opacity: 0,
                    scale: 0.95,
                    duration: 0.3,
                    ease: "power2.in",
                    onComplete: () => {
                        setIsVisible(false);
                        setDisplayMessage(null);
                    }
                });
            }
        }
    }, [message, type]);

    if (!isVisible && !message) return null;

    const isSuccess = (displayType || type) === 'success';
    // Removed "animate-in" classes as GSAP handles it now for buttery smoothness
    const baseClasses = "fixed top-6 left-1/2 -translate-x-1/2 w-full max-w-md p-4 rounded-2xl shadow-2xl border backdrop-blur-xl text-sm flex items-start z-[9999]";
    const classes = isSuccess
        ? "bg-slate-900/90 border-emerald-500/30 text-emerald-200 shadow-emerald-500/10"
        : "bg-slate-900/90 border-red-500/30 text-red-200 shadow-red-500/10";
    const Icon = isSuccess ? CheckCircle : XCircle;

    return (
        <div ref={barRef} className={`${baseClasses} ${classes}`}>
            {/* Glow Effect */}
            <div className={`absolute inset-0 rounded-2xl opacity-20 ${isSuccess ? 'bg-gradient-to-r from-emerald-500/0 via-emerald-500 to-emerald-500/0' : 'bg-gradient-to-r from-red-500/0 via-red-500 to-red-500/0'}`} />

            <Icon className={`w-5 h-5 mr-3 mt-0.5 flex-shrink-0 relative z-10 ${isSuccess ? 'text-emerald-400' : 'text-red-400'}`} />
            <div className="flex-1 whitespace-pre-wrap font-medium relative z-10">{displayMessage || message}</div>
            {onClose && (
                <button onClick={() => {
                    // Trigger exit animation immediately on click
                    if (barRef.current) {
                        gsap.to(barRef.current, {
                            y: -20, opacity: 0, scale: 0.95, duration: 0.3, ease: "power2.in",
                            onComplete: onClose // Call parent onClose to clear logic
                        });
                    }
                }} className={`ml-4 relative z-10 ${isSuccess ? 'text-emerald-400 hover:text-emerald-200' : 'text-red-400 hover:text-red-200'} transition-colors`}>
                    <XCircle className="w-5 h-5" />
                </button>
            )}
        </div>
    );
};

// --- NEW COMPONENT: Welcome Loader Overlay (Enhanced) ---
const WelcomeLoader = () => (
    <div className="fixed inset-0 z-[5000] bg-slate-950/90 backdrop-blur-2xl flex flex-col items-center justify-center animate-in fade-in duration-500">
        <div className="relative flex items-center justify-center">
            {/* Ambient Glow */}
            <div className="absolute w-[200px] h-[200px] bg-blue-500/20 rounded-full blur-[80px] animate-pulse"></div>

            {/* Orbital Rings Grid */}
            <div className="w-24 h-24 border-4 border-blue-500/10 rounded-full animate-[spin_8s_linear_infinite]"></div>
            <div className="absolute w-20 h-20 border-t-4 border-l-4 border-blue-400/80 rounded-full animate-[spin_3s_linear_infinite]"></div>
            <div className="absolute w-16 h-16 border-r-4 border-b-4 border-purple-500/80 rounded-full animate-[spin_3s_linear_infinite_reverse]"></div>

            {/* Central Core */}
            <div className="absolute bg-white p-2 rounded-full shadow-[0_0_15px_rgba(255,255,255,0.5)] animate-bounce-slight">
                <Loader2 className="w-6 h-6 text-slate-900 animate-spin" />
            </div>
        </div>

        <h2 className="mt-8 text-3xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 animate-pulse">
            Authenticating...
        </h2>
        <p className="mt-2 text-slate-400 text-sm font-medium tracking-wide animate-in slide-in-from-bottom-2 duration-700 delay-150">
            Accessing Secure Dashboard
        </p>
    </div>
);

// ----------------------------------------------
// --- AUTH COMPONENTS ---
// ----------------------------------------------
// --- AUTH COMPONENTS ---
// --- REBUILT WELCOME SCREEN (3D CAROUSEL + SWIPE + HEADER) ---
// --- REBUILT WELCOME SCREEN (GSAP CAROUSEL) ---
function UserTypeSelection({ setUserRole, setPage }) {
    const [activeIndex, setActiveIndex] = useState(0);
    const containerRef = useRef(null);
    const cardRefs = useRef([]); // Refs for individual cards
    const touchStart = useRef(null);
    const touchEnd = useRef(null);

    const roles = [
        { ui: 'Student', icon: GraduationCap, subtitle: 'Access notes, results & more', gradient: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-500/30', border: 'border-blue-500/50', btnText: 'Sign In / Sign Up' },
        { ui: 'Faculty', icon: ClipboardList, subtitle: 'Manage classes & attendance', gradient: 'from-emerald-500 to-emerald-600', shadow: 'shadow-emerald-500/30', border: 'border-emerald-500/50', btnText: 'Sign In' },
        { ui: 'Parent', icon: Home, subtitle: 'Track your ward\'s progress', gradient: 'from-pink-500 to-pink-600', shadow: 'shadow-pink-500/30', border: 'border-pink-500/50', btnText: 'Sign In' },
        { ui: 'Admin', icon: BriefcaseBusiness, subtitle: 'System configuration', gradient: 'from-amber-500 to-amber-600', shadow: 'shadow-amber-500/30', border: 'border-amber-500/50', btnText: 'Sign In' },
        { ui: 'HRD', icon: BriefcaseBusiness, subtitle: 'Placement & Career Services', gradient: 'from-indigo-500 to-purple-600', shadow: 'shadow-indigo-500/30', border: 'border-indigo-500/50', btnText: 'Sign In' },
    ];

    // GSAP ANIMATION LOGIC
    useEffect(() => {
        roles.forEach((_, index) => {
            const offset = index - activeIndex;
            const isActive = index === activeIndex;

            // Calculate properties
            // Reduce travel distance on desktop (340 -> 300) to keep stack tighter
            const xTrans = offset * (window.innerWidth < 768 ? 260 : 300);
            const scale = isActive ? 1.05 : 0.85;

            // Progressive Opacity Decay: 1 (Active) -> 0.6 (Next) -> 0.2 (Far) -> 0 (Invisible)
            // This prevents "overlapping" visual artifacts with the text on the left
            const opacity = isActive ? 1 : Math.max(0, 1 - Math.abs(offset) * 0.4);

            const zIndex = isActive ? 50 : 10 - Math.abs(offset);
            const rotateY = offset * -15;

            // Animate using GSAP with Hardware Acceleration
            gsap.to(cardRefs.current[index], {
                x: xTrans,
                scale: scale,
                opacity: opacity,
                zIndex: zIndex,
                rotateY: rotateY,
                duration: 0.5, // Slightly faster for snappier feel
                ease: "power2.out", // Snappier easing
                overwrite: "auto",
                force3D: true // Force GPU acceleration
            });
        });
    }, [activeIndex]);

    // Swipe Handlers
    const onTouchStart = (e) => { touchEnd.current = null; touchStart.current = e.targetTouches[0].clientX; }
    const onTouchMove = (e) => { touchEnd.current = e.targetTouches[0].clientX; }
    const onTouchEnd = () => {
        if (!touchStart.current || !touchEnd.current) return;
        const distance = touchStart.current - touchEnd.current;
        const isLeftSwipe = distance > 50;
        const isRightSwipe = distance < -50;
        if (isLeftSwipe && activeIndex < roles.length - 1) setActiveIndex(prev => prev + 1);
        if (isRightSwipe && activeIndex > 0) setActiveIndex(prev => prev - 1);
    }

    const nextRole = () => { if (activeIndex < roles.length - 1) setActiveIndex(prev => prev + 1); }
    const prevRole = () => { if (activeIndex > 0) setActiveIndex(prev => prev - 1); }

    const handleContinue = (role) => {
        gsap.to(containerRef.current, {
            opacity: 0, scale: 0.95, duration: 0.3, onComplete: () => {
                setUserRole(role.ui);
                setPage('credentials');
                window.scrollTo({ top: 0, behavior: 'auto' });
            }
        });
    };

    return (

        <div ref={containerRef} className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden py-6 md:py-10"
            onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>

            {/* Centered Hero Header */}
            <div className="text-center space-y-4 mb-2 md:mb-12 z-10 animate-in fade-in slide-in-from-top-4 duration-700 px-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/30 border border-blue-500/30 text-blue-300 text-xs font-bold uppercase tracking-widest backdrop-blur-md mb-2">
                    <Sparkles className="w-3 h-3" /> NoteOrbit v2.3 Pre_Release
                </div>
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white tracking-tight leading-tight">
                    Academic <br className="hidden md:block" />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">Intelligence.</span>
                </h1>
                <p className="text-sm md:text-lg text-slate-400 max-w-xl mx-auto leading-relaxed">
                    Where Imagination is Redefined! Select your portal to begin.
                </p>
            </div>

            {/* 3D Carousel Area */}
            <div className="relative w-full max-w-6xl h-[400px] md:h-[450px] flex items-center justify-center perspective-1000 z-10">

                {/* Left Nav Button */}
                <button
                    onClick={prevRole}
                    className={`absolute left-0 md:left-10 z-50 p-4 text-white/80 hover:text-white transition-all active:scale-95 animate-pulse ${activeIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'opacity-100 hover:scale-110'}`}
                    disabled={activeIndex === 0}
                >
                    <ArrowLeft className="w-8 h-8 md:w-10 md:h-10 drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]" />
                </button>

                {/* Right Nav Button */}
                <button
                    onClick={nextRole}
                    className={`absolute right-0 md:right-10 z-50 p-4 text-white/80 hover:text-white transition-all active:scale-95 animate-pulse ${activeIndex === roles.length - 1 ? 'opacity-30 cursor-not-allowed' : 'opacity-100 hover:scale-110'}`}
                    disabled={activeIndex === roles.length - 1}
                >
                    <ArrowRight className="w-8 h-8 md:w-10 md:h-10 drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]" />
                </button>

                {roles.map((role, index) => {
                    const isActive = index === activeIndex;

                    return (
                        <div
                            key={role.ui}
                            ref={el => cardRefs.current[index] = el}
                            onClick={() => setActiveIndex(index)}
                            className="absolute w-[260px] md:w-[320px] cursor-pointer will-change-transform"
                            style={{
                                left: '50%',
                                marginLeft: window.innerWidth < 768 ? -130 : -160,
                                // Initial transform for SSR/First paint, GSAP takes over immediately
                                transform: 'perspective(1000px)'
                            }}
                        >
                            <div className={`p-6 md:p-8 rounded-3xl border transition-all duration-300 relative overflow-hidden flex flex-col items-center text-center h-[360px] md:h-[400px] justify-center shadow-xl
                                ${isActive
                                    ? `bg-slate-900/90 ${role.border} ring-1 ring-white/10 ${role.shadow}`
                                    : 'bg-slate-900/60 border-white/5'}`}
                            >
                                {isActive && <div className={`absolute inset-0 bg-gradient-to-br ${role.gradient} opacity-20 blur-xl rounded-full transform scale-150 transition-opacity duration-500`} />}

                                <div className={`w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center mb-6 md:mb-8 relative z-10
                                    bg-gradient-to-br ${role.gradient} shadow-lg`}
                                >
                                    <role.icon className="w-8 h-8 md:w-10 md:h-10 text-white" />
                                </div>

                                <h3 className="text-2xl md:text-3xl font-bold text-white mb-2 md:mb-3 relative z-10">{role.ui}</h3>
                                <p className="text-xs md:text-sm text-slate-400 font-medium relative z-10 px-2">{role.subtitle}</p>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation(); // Prevent card click
                                        if (isActive) handleContinue(role);
                                        else setActiveIndex(index);
                                    }}
                                    className={`mt-6 md:mt-8 px-6 py-3 rounded-xl font-bold text-sm tracking-wide transition-all z-10 shadow-lg transform active:scale-95
                                    ${isActive
                                            ? 'bg-white text-slate-900 hover:bg-slate-100'
                                            : 'bg-white/5 text-slate-500 cursor-default'}`}
                                >
                                    {role.btnText} {isActive && <ArrowRight className="w-4 h-4 inline-block ml-1" />}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Navigation Dots */}
            <div className="flex gap-2 md:gap-3 mt-4 md:mt-8 z-10">
                {roles.map((role, idx) => (
                    <button
                        key={idx}
                        onClick={() => setActiveIndex(idx)}
                        className={`h-1.5 md:h-2 rounded-full transition-all duration-300 ${idx === activeIndex ? `w-6 md:w-8 bg-gradient-to-r ${role.gradient}` : 'w-1.5 md:w-2 bg-slate-700 hover:bg-slate-600'
                            }`}
                    />
                ))}
            </div>

            <div className="mt-auto pt-8 pb-4 text-center z-10">
                <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">v2.3 Pre_Release • LeafCore Labs</p>
            </div>
        </div>
    );
}

const ForgotPasswordModal = ({ onClose, showMessage, primaryButtonClass, buttonClass, userRole }) => {
    // Steps: 
    // 1: Enter ID (Faculty) or Email (Student) -> Lookup/Direct Send
    // 1.5: (Faculty Only) Confirm Masked Email
    // 2: Enter OTP, New Pass, Confirm Pass
    const [step, setStep] = useState(1);
    const [identifier, setIdentifier] = useState("");
    const [resolvedEmail, setResolvedEmail] = useState("");
    const [maskedEmail, setMaskedEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const isFaculty = userRole === 'Faculty';
    const isParent = userRole === 'Parent';

    const handleLookup = async () => {
        if (!identifier.trim()) return showMessage("Please enter your ID.", "error");
        setLoading(true);
        try {
            // Include role_type for parent lookup to fetch correctly
            const payload = { identifier };
            if (isParent) {
                // For parents, identifier is Ward's SRN, but we need to tell backend to look up student and return parent email
                // Actually the backend `lookup_parent_endpoint` handles strict SRN lookup. 
                // We can use the generic lookup-user or separate logic.
                // Backend has `/auth/lookup-parent` specifically for this.
                const res = await auth().post("/auth/lookup-parent", { srn: identifier });
                setMaskedEmail(res.data.masked_email);
                setStep(1.5);
                return;
            }

            const res = await auth().post("/auth/lookup-user", payload);
            setMaskedEmail(res.data.masked_email);
            setStep(1.5); // Move to confirmation step
        } catch (e) {
            showMessage(e.response?.data?.message || "User not found.", "error");
        } finally { setLoading(false); }
    };

    const handleSendOtp = async () => {
        setLoading(true);
        try {
            // Parent OTP Mode
            let mode = "forgot_password";
            if (isParent) mode = "parent_forgot";

            const res = await sendOtp(identifier, mode);
            const masked = res.data.masked_email || identifier;
            showMessage(`OTP sent to ${masked}`, "success");

            // Should capture the REAL email to use for reset (for Parents, identifier is SRN, so resolvedEmail is irrelevant for resetPassword call if we handle it right, but let's see)
            setResolvedEmail(res.data.email || identifier);
            setMaskedEmail(masked);
            setStep(2);
        } catch (e) {
            showMessage(e.response?.data?.message || "Failed to send OTP.", "error");
        } finally { setLoading(false); }
    };

    const handleReset = async () => {
        if (newPassword !== confirmPassword) {
            return showMessage("Passwords do not match.", "error");
        }
        setLoading(true);
        try {
            // For parent, role_type='parent'
            // For parent, identifier (first arg) should be the SRN or Email?
            // Backend reset_password: user = User.query.filter_by(email=email).first()
            // Wait, if mode was 'parent_forgot', send_otp sent to parent_email.
            // verifying otp uses email.
            // reset_password uses email.
            // So we need the parent's email (resolvedEmail) here!
            // sendOtp returns 'email' in response.

            await resetPassword(resolvedEmail || identifier, otp, newPassword, isParent ? 'parent' : 'user');
            showMessage("Password reset successfully. Please login.", "success");
            onClose();
        } catch (e) {
            showMessage(e.response?.data?.message || "Failed to reset password.", "error");
        } finally { setLoading(false); }
    };

    const renderStep1 = () => (
        <div className="space-y-4">
            <p className="text-slate-400 text-sm">
                {isFaculty ? "Enter your Employee ID to find your account." :
                    isParent ? "Enter your Ward's SRN to find account." :
                        "Enter your Email Address."}
            </p>
            <Input
                icon={isFaculty ? User : isParent ? User : Mail}
                placeholder={isFaculty ? "Employee ID" : isParent ? "Ward's SRN (e.g. SRN001)" : "Email Address"}
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
            />

            {isFaculty || isParent ? (
                <button disabled={loading} onClick={handleLookup} className={`w-full ${primaryButtonClass} ${loading ? 'opacity-50' : ''} py-3 text-sm rounded-xl`}>
                    {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Find Account"}
                </button>
            ) : (
                <button disabled={loading} onClick={handleSendOtp} className={`w-full ${primaryButtonClass} ${loading ? 'opacity-50' : ''} py-3 text-sm rounded-xl`}>
                    {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Send Verification Code"}
                </button>
            )}
        </div>
    );

    const renderStep1Point5 = () => (
        <div className="space-y-4 animate-in slide-in-from-right-8 duration-300">
            <div className="bg-slate-800/50 p-4 rounded-xl border border-white/10 text-center">
                <p className="text-slate-400 text-sm mb-2">We found an account linked to:</p>
                <p className="text-lg font-mono text-blue-400 font-bold tracking-wide">{maskedEmail}</p>
            </div>
            <button disabled={loading} onClick={handleSendOtp} className={`w-full ${primaryButtonClass} ${loading ? 'opacity-50' : ''} py-3 text-sm rounded-xl`}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Send OTP"}
            </button>
            <button onClick={() => setStep(1)} className="w-full text-slate-400 hover:text-white text-sm">Back</button>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-300">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white"><XCircle className="w-6 h-6" /></button>
                <h3 className="text-xl font-bold text-white mb-4">Reset Password</h3>

                {step === 1 && renderStep1()}
                {step === 1.5 && renderStep1Point5()}
                {step === 2 && (
                    <div className="space-y-4 animate-in slide-in-from-right-8 duration-300">
                        <p className="text-slate-400 text-sm">Enter the code sent to <b className="text-blue-400">{maskedEmail}</b>.</p>
                        <Input placeholder="Enter 6-digit OTP" value={otp} onChange={e => setOtp(e.target.value)} maxLength={6} className="text-center tracking-widest font-mono text-lg" />
                        <Input icon={Lock} type="password" placeholder="New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                        <Input icon={Lock} type="password" placeholder="Confirm Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                        <button disabled={loading} onClick={handleReset} className={`w-full ${primaryButtonClass} ${loading ? 'opacity-50' : ''} py-3 text-sm rounded-xl`}>
                            {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Reset Password"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

function CredentialsView({ onLogin, onRegister, showMessage, userRole, setPage, catalogs, primaryButtonClass, successButtonClass, buttonClass, authMode, setAuthMode }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showForgot, setShowForgot] = useState(false);

    // Registration States
    const { degrees, sections, loaded } = catalogs;
    const [regStep, setRegStep] = useState(1); // 1: Email/OTP, 2: Details
    const [srn, setSrn] = useState("");
    const [name, setName] = useState("");
    const [regEmail, setRegEmail] = useState("");
    const [regPassword, setRegPassword] = useState("");
    const [regConfirmPassword, setRegConfirmPassword] = useState(""); // NEW
    const [otp, setOtp] = useState("");
    const [isOtpSent, setIsOtpSent] = useState(false);
    const [isVerified, setIsVerified] = useState(false);
    const [degree, setDegree] = useState("");
    const [semester, setSemester] = useState("1");
    const [section, setSection] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const isStudent = userRole === 'Student';
    const isParent = userRole === 'Parent';

    // Refs for Animation
    const cardRef = useRef(null);
    const titleRef = useRef(null);
    const formRef = useRef(null);

    // GSAP Entrance Animation (Exact Replica of HRD)
    useEffect(() => {
        // Reset check for re-mounting
        const ctx = gsap.context(() => {
            const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

            // Card entrance with 3D rotation
            tl.fromTo(cardRef.current,
                { opacity: 0, y: 30, rotationX: 15, scale: 0.9 },
                { opacity: 1, y: 0, rotationX: 0, scale: 1, duration: 0.8, force3D: true }
            )
                // Title slide in
                .fromTo(titleRef.current,
                    { opacity: 0, y: 20 },
                    { opacity: 1, y: 0, duration: 0.5 },
                    "-=0.4"
                )
                // Stagger form inputs (children of form container)
                .fromTo(formRef.current?.children || [],
                    { opacity: 0, x: -20 },
                    { opacity: 1, x: 0, stagger: 0.1, duration: 0.5 },
                    "-=0.3"
                );
        });

        return () => ctx.revert();
    }, [authMode]); // Re-run on authMode toggle (Login <-> Register)

    // Flip Animation Effect (existing but refined)
    useEffect(() => {
        if (cardRef.current) {
            gsap.to(cardRef.current, {
                rotationY: authMode === 'register' ? 180 : 0,
                duration: 0.6,
                ease: "power2.inOut"
            });
        }
        if (authMode === 'login') {
            setRegStep(1); setIsOtpSent(false); setIsVerified(false);
        }
    }, [authMode]);

    // FETCH SECTIONS WHEN DEGREE/SEMESTER CHANGES
    useEffect(() => {
        if (degree && semester && catalogs.fetchSections) {
            catalogs.fetchSections(degree, semester);
            setSection(""); // Reset section selection
        }
    }, [degree, semester, catalogs.fetchSections]);

    const handleSendSignupOtp = async () => {
        if (!regEmail || !regEmail.trim()) return showMessage("Email is required.", "error");
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(regEmail)) return showMessage("Please enter a valid email address.", "error");
        setIsLoading(true);
        try {
            const res = await sendOtp(regEmail, "signup");
            showMessage(res.data.message || "OTP sent successfully", "success");
            setIsOtpSent(true);
        } catch (e) { showMessage(e.response?.data?.message || "Failed to send OTP", "error"); }
        finally { setIsLoading(false); }
    };

    const handleVerifySignupOtp = async () => {
        if (!otp || otp.length !== 6) return showMessage("Please enter a valid 6-digit OTP.", "error");
        setIsLoading(true);
        try {
            await verifyOtp(regEmail, otp);
            showMessage("Email verified!", "success");
            setIsVerified(true);
            setRegStep(2); // Move to details
        } catch (e) { showMessage(e.response?.data?.message || "Invalid OTP", "error"); }
        finally { setIsLoading(false); }
    };

    // Password validation function
    const validatePassword = (password) => {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

        return {
            isValid: password.length >= minLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar,
            errors: {
                minLength: password.length >= minLength,
                hasUpperCase,
                hasLowerCase,
                hasNumber,
                hasSpecialChar
            }
        };
    };

    const handleRegisterSubmit = async () => {
        // Validate all required fields
        if (!srn.trim()) return showMessage("SRN is required.", "error");
        if (!name.trim()) return showMessage("Full Name is required.", "error");
        if (!regPassword) return showMessage("Password is required.", "error");
        if (!regConfirmPassword) return showMessage("Please confirm your password.", "error");
        if (!degree) return showMessage("Please select a degree.", "error");
        if (!semester) return showMessage("Please select a semester.", "error");
        if (!section) return showMessage("Please select a section.", "error");

        // Validate password format
        const passwordValidation = validatePassword(regPassword);
        if (!passwordValidation.isValid) {
            return showMessage("Password must contain: at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character.", "error");
        }

        // Validate password match
        if (regPassword !== regConfirmPassword) return showMessage("Passwords do not match.", "error");

        // Prepare payload with OTP for backend re-verification
        onRegister({ srn, name, email: regEmail, password: regPassword, degree, semester: parseInt(semester), section, otp, role: userRole.toLowerCase() });
    };

    // Enhanced Handle Login with Animations
    const handleLogin = async () => {
        if (!email || !password) {
            // Shake animation on empty input
            gsap.fromTo(cardRef.current,
                { x: -10 },
                { x: 10, duration: 0.08, repeat: 6, yoyo: true, ease: "none", clearProps: "x" }
            );
            return showMessage("Please enter email and password.", "error");
        }
        setIsLoading(true);
        try {
            await onLogin(email, password);
            // Success Animation (if handled here, but usually parent unmounts)
            gsap.to(cardRef.current, {
                scale: 1.05, opacity: 0, rotationY: 10, duration: 0.4, ease: "power2.in",
            });
        } catch (e) {
            setIsLoading(false);
            // Shake animation on error
            gsap.fromTo(cardRef.current,
                { x: -10 },
                { x: 10, duration: 0.08, repeat: 6, yoyo: true, ease: "none", clearProps: "x" }
            );
        }
    };

    return (
        <div style={{ perspective: "1000px" }} className="w-full max-w-md mx-auto">
            <div ref={cardRef} className="relative w-full transition-all duration-500" style={{ transformStyle: "preserve-3d" }}>

                {/* BACK FACE (Register) */}
                <div className={`${authMode === 'register' ? 'relative' : 'absolute inset-0'} w-full min-h-[400px] bg-slate-900/40 md:bg-slate-900/80 backdrop-blur-2xl p-8 rounded-3xl shadow-2xl border border-white/10 overflow-hidden`}
                    style={{ transform: "rotateY(180deg)", backfaceVisibility: "hidden" }}>

                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50" />
                    <h3 className="text-3xl font-bold mb-6 text-white text-center tracking-tight">Join NoteOrbit</h3>

                    {/* Reuse Switcher for visual consistency, but functional inside back face */}
                    <div className="flex justify-center mb-6">
                        <button onClick={() => setAuthMode('login')} className="text-slate-400 hover:text-white text-sm flex items-center gap-2">
                            <ArrowLeft className="w-4 h-4" /> Back to Sign In
                        </button>
                    </div>

                    <div className="space-y-4">
                        {isStudent ? (
                            <>
                                {regStep === 1 && (
                                    <div className="space-y-4">
                                        <div className="text-center text-sm text-slate-400 mb-2">Step 1: Verify your email</div>
                                        <Input type="email" placeholder="Email Address *" value={regEmail} onChange={e => setRegEmail(e.target.value)} disabled={isOtpSent} required />
                                        {!isOtpSent ? (
                                            <button disabled={isLoading || !regEmail.trim()} onClick={handleSendSignupOtp} className={`w-full ${primaryButtonClass} rounded-xl py-3 ${!regEmail.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}>{isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Send Verification Code"}</button>
                                        ) : (
                                            <div className="space-y-3">
                                                <Input placeholder="Enter 6-digit OTP *" value={otp} onChange={e => setOtp(e.target.value)} maxLength={6} className="text-center tracking-widest font-mono" required />
                                                <button disabled={isLoading || otp.length !== 6} onClick={handleVerifySignupOtp} className={`w-full ${successButtonClass} rounded-xl py-3 ${otp.length !== 6 ? 'opacity-50 cursor-not-allowed' : ''}`}>{isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Verify & Continue"}</button>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {regStep === 2 && (
                                    <div className="space-y-4">
                                        <Input placeholder="SRN *" value={srn} onChange={e => setSrn(e.target.value)} required />
                                        <Input placeholder="Full Name *" value={name} onChange={e => setName(e.target.value)} required />
                                        <div>
                                            <Input type="password" placeholder="Password *" value={regPassword} onChange={e => setRegPassword(e.target.value)} required />
                                            {regPassword && (
                                                <div className="mt-2 p-3 bg-slate-800/50 rounded-lg border border-white/10 text-xs text-slate-300">
                                                    <div className="font-semibold mb-2 text-slate-200">Password must contain:</div>
                                                    <div className="space-y-1">
                                                        <div className={`flex items-center ${regPassword.length >= 8 ? 'text-green-400' : 'text-slate-400'}`}>
                                                            {regPassword.length >= 8 ? '✓' : '○'} At least 8 characters
                                                        </div>
                                                        <div className={`flex items-center ${/[A-Z]/.test(regPassword) ? 'text-green-400' : 'text-slate-400'}`}>
                                                            {/[A-Z]/.test(regPassword) ? '✓' : '○'} One uppercase letter (A-Z)
                                                        </div>
                                                        <div className={`flex items-center ${/[a-z]/.test(regPassword) ? 'text-green-400' : 'text-slate-400'}`}>
                                                            {/[a-z]/.test(regPassword) ? '✓' : '○'} One lowercase letter (a-z)
                                                        </div>
                                                        <div className={`flex items-center ${/[0-9]/.test(regPassword) ? 'text-green-400' : 'text-slate-400'}`}>
                                                            {/[0-9]/.test(regPassword) ? '✓' : '○'} One number (0-9)
                                                        </div>
                                                        <div className={`flex items-center ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(regPassword) ? 'text-green-400' : 'text-slate-400'}`}>
                                                            {/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(regPassword) ? '✓' : '○'} One special character (!@#$%^&*...)
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <Input type="password" placeholder="Confirm Password *" value={regConfirmPassword} onChange={e => setRegConfirmPassword(e.target.value)} required />
                                        <div className="grid grid-cols-3 gap-2">
                                            <Select value={degree} onChange={e => setDegree(e.target.value)} required>
                                                <option value="" className="text-gray-900">Degree *</option>
                                                {(degrees || []).map(d => <option key={d} value={d} className="text-gray-900">{d}</option>)}
                                            </Select>
                                            <Select value={semester} onChange={e => setSemester(e.target.value)} required>
                                                <option value="" className="text-gray-900">Sem *</option>
                                                {Array.from({ length: 8 }, (_, i) => i + 1).map(s => <option key={s} value={s} className="text-gray-900">Sem {s}</option>)}
                                            </Select>
                                            <Select value={section} onChange={e => setSection(e.target.value)} required disabled={!sections || sections.length === 0}>
                                                <option value="" className="text-gray-900">Section *</option>
                                                {(sections || []).map(s => <option key={s} value={s} className="text-gray-900">Sec {s}</option>)}
                                            </Select>
                                        </div>
                                        <button onClick={handleRegisterSubmit} className={`w-full ${successButtonClass} rounded-xl py-3`}>Complete Registration</button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center text-slate-400">Admin/Faculty registration is restricted. Contact IT.</div>
                        )}
                    </div>
                </div>

                {/* FRONT FACE (Login) */}
                <div className={`${authMode === 'login' ? 'relative' : 'absolute inset-0'} w-full bg-black/20 md:bg-slate-900/60 backdrop-blur-2xl p-8 rounded-3xl shadow-2xl border border-white/10 overflow-hidden`}
                    style={{ backfaceVisibility: "hidden" }}>

                    {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} showMessage={showMessage} primaryButtonClass={primaryButtonClass} userRole={userRole} />}

                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50" />
                    <h3 ref={titleRef} className="text-3xl font-bold mb-8 text-white text-center tracking-tight">{userRole} Portal</h3>

                    {isStudent && (
                        <div className="flex justify-center mb-8">
                            <div className="flex space-x-1 bg-slate-950/50 p-1.5 rounded-full shadow-inner border border-white/5">
                                <button onClick={() => setAuthMode('login')} className={`px-8 py-2.5 rounded-full font-bold text-sm bg-blue-600 text-white shadow-lg shadow-blue-500/25`}>Sign In</button>
                                <button onClick={() => setAuthMode('register')} className={`px-8 py-2.5 rounded-full font-bold text-sm text-slate-400 hover:text-white hover:bg-white/5`}>Sign Up</button>
                            </div>
                        </div>
                    )}

                    <div ref={formRef} className="space-y-5">
                        <Input icon={isParent ? User : Mail} placeholder={isParent ? "Ward's SRN" : "Email Address"} value={email} onChange={e => setEmail(e.target.value)} />
                        <div>
                            <Input icon={Lock} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
                            <div className="text-right mt-2"><button onClick={() => setShowForgot(true)} className="text-xs text-blue-400 hover:text-blue-300">Forgot Password?</button></div>
                        </div>
                        <div className="flex gap-4 pt-4">
                            <button className={`${buttonClass} flex-1 bg-slate-800 text-slate-300`} onClick={() => setPage('user_type')} disabled={isLoading}><ArrowLeft className="w-5 h-5 mr-1" /> Back</button>
                            <button className={`${buttonClass} flex-1 ${primaryButtonClass} bg-gradient-to-r from-blue-600 to-indigo-600`} onClick={handleLogin} disabled={isLoading}>
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Sign In"}
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

// ----------------------------------------------
// --- STUDENT MODULES ---

// --- NEW COMPONENT: Student Feedback ---
function StudentFeedback({ showMessage }) {
    const [feedback, setFeedback] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchFeedback = useCallback(async () => {
        setIsLoading(true);
        try {
            // This is the functional endpoint already defined in app.py
            const res = await auth().get("/student/feedback");
            setFeedback(res.data.feedback || []);
        } catch (e) {
            if (e.response && e.response.status !== 401) {
                showMessage(e.response?.data?.message || "Failed to fetch faculty feedback.", 'error');
            }
            setFeedback([]);
        } finally {
            setIsLoading(false);
        }
    }, [showMessage]);

    useEffect(() => { fetchFeedback(); }, [fetchFeedback]);

    if (isLoading) {
        return <div className="text-center p-10"><Loader2 className="animate-spin w-8 h-8 mx-auto text-yellow-500" /></div>;
    }

    return (
        <div className="space-y-6">
            <h4 className="text-2xl font-bold text-yellow-500 flex items-center"><MessageSquare className="w-6 h-6 mr-2" /> Faculty Feedback Report</h4>

            {feedback.length === 0 && <div className="p-4 bg-slate-900/40 border border-white/10 rounded-xl text-slate-400">No personalized feedback has been sent by faculty yet.</div>}

            <div className="space-y-4">
                {feedback.map((f, index) => (
                    <div key={index} className="bg-yellow-900/20 p-5 rounded-xl shadow-lg border-l-4 border-yellow-500 backdrop-blur-sm">
                        <div className="font-bold text-lg text-yellow-100 mb-2">Subject: {f.subject}</div>

                        <p className="text-slate-300 whitespace-pre-wrap border-l-2 border-yellow-500/30 pl-3 py-1 text-[0.95rem]">{f.text}</p>

                        <div className="text-xs text-yellow-500/60 mt-3 pt-2 border-t border-yellow-500/20">
                            Sent by Faculty ID: {f.faculty_id} on {new Date(f.created_at).toLocaleDateString()}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function StudentNotesNotices({ user, showMessage, catalogs, primaryButtonClass, buttonClass }) {
    const { fetchSubjects, subjects } = catalogs;
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedDocType, setSelectedDocType] = useState('');
    const [notes, setNotes] = useState([]);
    const [notices, setNotices] = useState([]);
    const [isFetching, setIsFetching] = useState(false);

    const availableDocTypes = useMemo(() => {
        const types = (notes || [])
            .map(n => (n?.document_type || '').trim())
            .filter(Boolean);
        return Array.from(new Set(types)).sort((a, b) => a.localeCompare(b));
    }, [notes]);

    const filteredNotes = useMemo(() => {
        if (!Array.isArray(notes)) return [];
        if (!selectedDocType || selectedDocType.trim() === '') return [];
        return notes.filter(n => (n?.document_type || '').trim() === selectedDocType);
    }, [notes, selectedDocType]);

    const fetchContent = useCallback(async (subjectToFetch) => {
        if (!subjectToFetch || !user.degree || !user.semester) {
            setNotes([]); setNotices([]); return;
        }
        setIsFetching(true);
        try {
            // Using auth()
            const [notesRes, noticesRes] = await Promise.all([
                auth().get("/notes", { params: { degree: user.degree, semester: user.semester, subject: subjectToFetch } }),
                auth().get("/notices", { params: { subject: subjectToFetch } })
            ]);
            setNotes(notesRes.data.notes || []);
            setNotices(noticesRes.data.notices || []);
        } catch (e) {
            // Only show general error if not 401 (401 handled by auth interceptor)
            if (e.response && e.response.status !== 401) {
                showMessage("Failed to load content.", 'error');
            }
            setNotes([]); setNotices([]);
        } finally {
            setIsFetching(false);
        }
    }, [user.degree, user.semester, showMessage]);

    useEffect(() => {
        if (user && user.degree && user.semester) { fetchSubjects(user.degree, user.semester); } else { fetchSubjects(null, null); }
    }, [user.degree, user.semester, fetchSubjects]);

    useEffect(() => {
        let subjectToUse = selectedSubject;
        if (Array.isArray(subjects) && subjects.length > 0) {
            if (!subjectToUse || !subjects.includes(subjectToUse)) {
                subjectToUse = subjects[0];
                setSelectedSubject(subjectToUse);
            }
        } else {
            setSelectedSubject('');
            subjectToUse = null;
        }
        if (subjectToUse) { fetchContent(subjectToUse); } else { setNotes([]); setNotices([]); }
    }, [subjects, selectedSubject, fetchContent]);

    const handleRefresh = () => {
        if (selectedSubject) fetchContent(selectedSubject);
    };

    if (!user.degree || !user.semester) {
        return <div className="text-center p-10 bg-white rounded-xl shadow-md text-gray-500">Student profile missing degree/semester information. Please contact admin.</div>;
    }
    if (!subjects || subjects.length === 0) {
        return <div className="text-center p-10 bg-white rounded-xl shadow-md text-gray-500">No subjects are currently defined for {user.degree} Sem {user.semester}.</div>;
    }

    return (
        <div className="space-y-8">
            <div className="bg-blue-900/20 p-6 rounded-xl border border-blue-500/20 shadow-inner backdrop-blur-sm">
                <strong className="text-xl text-blue-400 block mb-1">Content Context</strong>
                <div className="text-sm text-blue-200">{user.degree} (Semester {user.semester} / Section {user.section})</div>
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center pt-4">
                    <label className="text-base text-blue-100 font-bold flex-shrink-0">Filter Subject:</label>
                    <Select className="flex-1 max-w-xs" value={selectedSubject || ''} onChange={e => setSelectedSubject(e.target.value)} disabled={!subjects.length || isFetching}>
                        {Array.isArray(subjects) && subjects.map(s => <option key={s} value={s} className="text-slate-900">{s}</option>)}
                    </Select>
                    <Select className="flex-1 max-w-xs" value={selectedDocType} onChange={e => setSelectedDocType(e.target.value)} disabled={isFetching || notes.length === 0}>
                        <option value="" className="text-slate-900">Choose Resource Type</option>
                        {availableDocTypes.map(t => <option key={t} value={t} className="text-slate-900">{t}</option>)}
                    </Select>
                    <button className={`${buttonClass} bg-slate-700 hover:bg-slate-600 text-white text-sm sm:w-48 py-2.5`} onClick={handleRefresh} disabled={isFetching || !selectedSubject}>
                        {isFetching ? <Loader2 className="animate-spin w-5 h-5 mr-1" /> : <RefreshCw className="w-5 h-5 mr-1" />}
                        {isFetching ? 'Refreshing...' : 'Refresh Content'}
                    </button>
                </div>
            </div>

            <div>
                <h4 className="text-xl font-bold mt-4 mb-4 text-blue-400 flex items-center"><Book className="w-5 h-5 mr-2" /> Notes for "{selectedSubject || '...'}"</h4>
                {isFetching && <div className="text-center p-4"><Loader2 className="animate-spin w-5 h-5 mx-auto text-blue-500" /></div>}
                {!isFetching && !selectedDocType && (
                    <div className="p-4 bg-slate-900/40 border border-white/10 rounded-xl text-slate-300 text-sm text-center">
                        Please select a document type (Notes, Question Bank, or Reference Book) to view documents.
                    </div>
                )}
                {!isFetching && selectedDocType && notes.length === 0 && (
                    <div className="p-4 bg-slate-900/40 border border-white/10 rounded-xl text-slate-500 text-sm">No notes uploaded for {selectedSubject} yet.</div>
                )}
                {!isFetching && selectedDocType && notes.length > 0 && filteredNotes.length === 0 && (
                    <div className="p-4 bg-slate-900/40 border border-white/10 rounded-xl text-slate-500 text-sm">
                        No documents found for <b className="text-slate-200">{selectedDocType}</b>.
                    </div>
                )}
                {!isFetching && selectedDocType && filteredNotes.length > 0 && (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredNotes.map(n => (
                            <div key={n.id} className="p-4 rounded-xl shadow-md border-l-4 border-blue-500 bg-slate-800 hover:bg-slate-700 transition duration-200">
                                <div className="font-bold text-lg text-white truncate">{n.title} <span className="text-xs text-blue-400">({n.document_type})</span></div>
                                <div className="flex items-center gap-2 mt-1">
                                    {n.uploader_role === 'admin' ? (
                                        <span className="bg-red-500/20 text-red-300 text-[10px] px-2 py-0.5 rounded border border-red-500/30">Uploaded by Admin</span>
                                    ) : n.uploader_role === 'professor' ? (
                                        <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded border border-emerald-500/30">Uploaded by Faculty</span>
                                    ) : null}
                                    <div className="text-xs text-slate-400">{n.subject} | {new Date(n.timestamp).toLocaleDateString()}</div>
                                </div>
                                <div className="mt-3">
                                    {n.file_url && <a className={`py-1.5 px-4 text-sm font-semibold rounded-full inline-flex items-center ${primaryButtonClass}`} href={n.file_url} target="_blank" rel="noopener noreferrer">View</a>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div>
                <h4 className="text-xl font-bold mt-8 mb-4 text-red-400 flex items-center"><Bell className="w-5 h-5 mr-2" /> Notices for "{selectedSubject || '...'}"</h4>
                {!isFetching && notices.length === 0 && <div className="p-4 bg-slate-900/40 border border-white/10 rounded-xl text-slate-500 text-sm">No recent notices for {selectedSubject} matching your context.</div>}
                <div className="space-y-4">
                    {notices.map(n => (
                        <div key={n.id} className="p-4 bg-red-900/20 border-l-4 border-red-500 rounded-xl shadow-md backdrop-blur-sm">
                            <div className="font-bold text-xl text-red-400">{n.title}</div>
                            <div className="text-xs text-slate-400 mt-1">
                                Subject: {n.subject} | Target: {n.degree} Sem {n.semester} Sec {n.section}
                            </div>
                            <p className="mt-2 text-slate-200 text-[0.95rem]">{n.message}</p>
                            <div className="flex justify-between items-center mt-3 pt-2 border-t border-red-500/20">
                                <div className="text-xs text-slate-500">
                                    Posted by: {n.professor_name} on {new Date(n.created_at).toLocaleDateString()}
                                    {n.deadline && <span className="font-bold text-red-400 block mt-1">Deadline: {new Date(n.deadline).toLocaleDateString()}</span>}
                                </div>
                                {n.attachment_url && <a href={n.attachment_url} className={`py-1.5 px-4 text-sm font-semibold rounded-full inline-flex items-center bg-red-600 hover:bg-red-700 text-white`} target="_blank" rel="noopener noreferrer">Attachment</a>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function StudentFees({ user, showMessage, primaryButtonClass, buttonClass }) {
    const [fees, setFees] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchFees = useCallback(async () => {
        setIsLoading(true);
        try {
            // Using auth()
            const res = await auth().get("/fees/list");
            setFees(res.data.fees || []);
        } catch (e) {
            if (e.response && e.response.status !== 401) {
                showMessage("Failed to fetch fee list.", 'error');
            }
            setFees([]);
        } finally {
            setIsLoading(false);
        }
    }, [showMessage]);

    useEffect(() => { fetchFees(); }, [fetchFees]);

    const handlePay = async (targetId) => {
        try {
            // Using auth()
            const res = await auth().post("/fees/pay", { target_id: targetId });
            const { order_id } = res.data;
            // The backend returns an order_id which is used to redirect to the demo payment page
            window.location.href = `${BACKEND_BASE_URL}/demo/checkout/${order_id}`;
        } catch (e) {
            if (e.response && e.response.status !== 401) {
                showMessage(e.response?.data?.message || "Payment initiation failed.", 'error');
            }
        }
    };

    const handleReceipt = async (paymentId) => {
        try {
            // paymentId here is the ft.order_id which is set to the Payment ID after checkout
            // Using auth()
            const res = await auth().get(`/fees/receipt/${paymentId}`);
            window.open(res.data.receipt_url, '_blank');
        } catch (e) {
            if (e.response && e.response.status !== 401) {
                showMessage(e.response?.data?.message || "Failed to get receipt URL. It may have expired.", 'error');
            }
        }
    };

    if (isLoading) {
        return <div className="text-center p-10"><Loader2 className="animate-spin w-8 h-8 mx-auto text-blue-500" /></div>;
    }

    return (
        <div className="space-y-6">
            <h4 className="text-2xl font-bold text-blue-400 flex items-center"><IndianRupee className="w-6 h-6 mr-2" /> Fee Payment History</h4>
            {fees.length === 0 && <div className="p-4 bg-slate-900/40 border border-white/10 rounded-xl text-slate-500">No fee notifications found for your account.</div>}

            <div className="space-y-4">
                {fees.map(f => (
                    <div key={f.target_id} className={`p-4 rounded-xl shadow-lg transition duration-200 ${f.status === 'paid'
                        ? 'bg-green-900/20 border-l-4 border-green-500'
                        : 'bg-red-900/20 border-l-4 border-red-500'
                        }`}>
                        <div className="flex justify-between items-center">
                            <div className="flex-1">
                                <div className="font-bold text-lg text-white">{f.title} <span className="text-xs font-normal text-slate-400">({f.category})</span></div>
                                <div className="text-sm text-slate-300 mt-1">Amount: <strong className="text-white">₹{f.amount}</strong> | Due: {f.due_date ? new Date(f.due_date).toLocaleDateString() : 'N/A'}</div>
                            </div>
                            <div className="flex-shrink-0 ml-4">
                                {f.status === 'pending' && (
                                    <button
                                        className={`${buttonClass} w-32 py-2.5 ${primaryButtonClass}`}
                                        onClick={() => handlePay(f.target_id)}
                                    >
                                        Pay Now
                                    </button>
                                )}
                                {f.status === 'paid' && (
                                    <button
                                        className={`${buttonClass} w-32 py-2.5 bg-green-600 hover:bg-green-700 text-white`}
                                        onClick={() => handleReceipt(f.payment_id)}
                                    >
                                        Receipt
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="text-xs text-slate-500 mt-2 border-t border-white/10 pt-1">Status: **{f.status.toUpperCase()}** {f.paid_at && `on ${new Date(f.paid_at).toLocaleDateString()}`}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function StudentMarks({ showMessage }) {
    const [marks, setMarks] = useState({});
    const [isLoading, setIsLoading] = useState(true);

    const fetchMarks = useCallback(async () => {
        setIsLoading(true);
        try {
            // Using auth()
            const res = await auth().get("/student/marks");
            // API returns marks grouped by subject
            setMarks(res.data.marks || {});
        } catch (e) {
            if (e.response && e.response.status !== 401) {
                showMessage(e.response?.data?.message || "Failed to fetch marks data.", 'error');
            }
            setMarks({});
        } finally {
            setIsLoading(false);
        }
    }, [showMessage]);

    useEffect(() => { fetchMarks(); }, [fetchMarks]);

    const calculateSubjectSummary = (subjectMarks) => {
        if (!subjectMarks || subjectMarks.length === 0) return { obtained: 0, max: 0, percent: 0 };
        // Ensure values are numbers for calculation
        const totalObtained = subjectMarks.reduce((sum, m) => sum + (parseFloat(m.marks_obtained) || 0), 0);
        const totalMax = subjectMarks.reduce((sum, m) => sum + (parseFloat(m.max_marks) || 0), 0);
        const percentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(1) : 0;
        return { obtained: totalObtained.toFixed(1), max: totalMax.toFixed(1), percent: percentage };
    };

    if (isLoading) {
        return <div className="text-center p-10"><Loader2 className="animate-spin w-8 h-8 mx-auto text-blue-500" /></div>;
    }

    const subjectNames = Object.keys(marks);

    return (
        <div className="space-y-6">
            <h4 className="text-2xl font-bold text-blue-400 flex items-center"><Award className="w-6 h-6 mr-2" /> Academic Marks Report</h4>
            {subjectNames.length === 0 && <div className="p-4 bg-slate-900/40 border border-white/10 rounded-xl text-slate-500">No marks have been recorded for your subjects yet.</div>}

            <div className="space-y-6">
                {subjectNames.map(subject => {
                    const summary = calculateSubjectSummary(marks[subject]);
                    return (
                        <div key={subject} className="bg-slate-900/60 backdrop-blur-xl p-5 rounded-xl shadow-lg border-l-4 border-yellow-500">
                            <div className="flex justify-between items-center pb-2 border-b border-white/10">
                                <h5 className="text-xl font-bold text-white">{subject}</h5>
                                <div className={`text-lg font-semibold px-3 py-1 rounded-full ${summary.percent >= 75 ? 'bg-green-900/40 text-green-300' : 'bg-yellow-900/40 text-yellow-300'}`}>
                                    {summary.percent}% Overall
                                </div>
                            </div>
                            <div className="pt-3 space-y-2">
                                {marks[subject].map((m, index) => (
                                    <div key={index} className="flex justify-between text-sm text-slate-300 border-b border-dashed border-white/10 last:border-b-0 py-1">
                                        <span className="font-medium capitalize">{m.exam_type}:</span>
                                        <span className="font-semibold text-white">{m.marks_obtained} / {m.max_marks}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 pt-3 border-t border-white/10 text-sm font-semibold text-white flex justify-between">
                                <span>Total:</span>
                                <span>{summary.obtained} / {summary.max}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// --- NEW COMPONENT: Complaint Audit Trail Renderer ---
const ComplaintAuditTimeline = ({ auditTrail }) => {
    // Sort history by timestamp (newest first for display)
    const sortedHistory = [...auditTrail].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return (
        <div className="mt-4 p-4 bg-slate-900 border border-red-500/20 rounded-lg">
            <h3 className="text-md font-semibold text-slate-300 mb-3">
                Tracking History
            </h3>
            <div className="relative border-l border-red-500/50 pl-4 space-y-3">
                {sortedHistory.map((entry, index) => (
                    <div key={index} className="relative">
                        <div className="absolute w-3 h-3 bg-red-500 rounded-full mt-1 -left-[18px] border-4 border-slate-900"></div>
                        <p className="text-sm font-medium text-slate-200">
                            Status: <span className="font-bold text-red-400">{entry.status}</span>
                        </p>
                        {entry.note && <p className="text-xs text-slate-400 italic">Note: {entry.note}</p>}
                        <p className="text-xs text-slate-500 italic mt-0.5">
                            {new Date(entry.timestamp).toLocaleString()} by {entry.by}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- STUDENT MODULE: Hostel Complaints (MODIFIED FOR LIVE TRACKING) ---
function HostelComplaints({ showMessage, primaryButtonClass, buttonClass }) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [attachment, setAttachment] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [userComplaints, setUserComplaints] = useState([]);
    const [isFetching, setIsFetching] = useState(true);
    const [hostelStatus, setHostelStatus] = useState('checking'); // 'allowed', 'not_allowed', 'error', 'checking'

    // This function attempts to fetch complaints and infers allocation status.
    const fetchUserComplaints = useCallback(async () => {
        setIsFetching(true);
        setHostelStatus('checking');

        try {
            // GET /student/hostel/complaints is the new endpoint
            const res = await auth().get("/student/hostel/complaints");
            setUserComplaints(res.data.complaints || []);
            setHostelStatus('allowed');

        } catch (e) {
            if (e.response) {
                if (e.response.status === 403 || (e.response.data.message && e.response.data.message.includes('not allowed'))) {
                    setHostelStatus('not_allowed');
                } else if (e.response.status !== 401) {
                    showMessage(e.response?.data?.message || "Failed to load complaint history.", 'error');
                    setHostelStatus('error');
                }
            }
            setUserComplaints([]);
        } finally {
            setIsFetching(false);
        }
    }, [showMessage]);

    useEffect(() => { fetchUserComplaints(); }, [fetchUserComplaints]);

    const handleSubmit = async () => {
        if (!title || !description) {
            return showMessage("Title and description are required.", 'error');
        }

        setIsLoading(true);
        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        if (attachment) formData.append('attachment', attachment);

        try {
            const res = await auth().post("/hostel/complaints", formData);
            showMessage(res.data.message, 'success');
            setTitle(''); setDescription(''); setAttachment(null);
            if (document.getElementById('complaintAttachment')) document.getElementById('complaintAttachment').value = '';

            // Refresh the list immediately after submission
            fetchUserComplaints();

        } catch (e) {
            const msg = e.response?.data?.message || "Failed to submit complaint. Check allocation status.";
            if (e.response && e.response.status === 403) {
                setHostelStatus('not_allowed'); // Explicitly block if 403
            }
            showMessage(msg, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    if (isFetching && hostelStatus === 'checking') {
        return <div className="text-center p-10"><Loader2 className="animate-spin w-8 h-8 mx-auto text-red-500" /></div>;
    }

    if (hostelStatus === 'not_allowed') {
        return (
            <div className="text-center p-10 bg-red-900/20 rounded-xl shadow-md border border-red-500/30">
                <XCircle className="w-10 h-10 mx-auto text-red-500 mb-4" />
                <h4 className="text-2xl font-bold text-red-400">Complaint Submission Blocked</h4>
                <p className="text-lg text-red-300 mt-2">**Not allowed for complaining as no hostel is allotted for you.**</p>
                <p className="text-sm text-slate-400 mt-4">Please contact the administration if you believe this is an error.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-xl shadow-lg border border-red-500/20 space-y-4">
                <h4 className="text-2xl font-bold mb-4 text-red-400 flex items-center"><Home className="w-6 h-6 mr-2" /> Raise Hostel Complaint</h4>
                <Input placeholder="Complaint Title (e.g., Water leakage in Room 101)" value={title} onChange={e => setTitle(e.target.value)} disabled={isLoading} />
                <textarea className="w-full bg-slate-800/50 backdrop-blur-xl text-white placeholder-slate-500 border border-white/10 rounded-xl py-3 px-4 focus:ring-2 focus:ring-red-500/50 outline-none transition duration-200 h-32" placeholder="Detailed description of the issue..." value={description} onChange={e => setDescription(e.target.value)} disabled={isLoading} />
                <label className="block text-sm text-slate-300 font-medium pt-2">Attach Image/File (Optional):</label>
                <input id="complaintAttachment" type="file" onChange={e => setAttachment(e.target.files[0])} className="w-full text-slate-300 bg-slate-800/50 rounded-lg p-3 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-600 file:text-white hover:file:bg-red-700 transition duration-200" disabled={isLoading} />
                <button className={`${buttonClass} ${primaryButtonClass} bg-red-600 hover:bg-red-700 text-white w-full`} onClick={handleSubmit} disabled={isLoading || !title || !description}>
                    {isLoading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Mail className="w-5 h-5 mr-2" />}
                    {isLoading ? 'Submitting...' : 'Submit Complaint'}
                </button>
            </div>

            <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-xl shadow-lg border border-white/10">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-xl font-bold text-red-400 flex items-center"><ClipboardList className="w-5 h-5 mr-2" /> Your Complaint History ({userComplaints.length})</h4>
                    <button onClick={fetchUserComplaints} className="p-2 bg-slate-700 rounded-full hover:bg-slate-600 transition" disabled={isFetching}><RefreshCw className="w-5 h-5 text-slate-300" /></button>
                </div>

                {isFetching ? (
                    <div className="text-center p-4"><Loader2 className="animate-spin w-5 h-5 mx-auto text-red-500" /></div>
                ) : userComplaints.length === 0 ? (
                    <div className="p-4 text-slate-500 text-center">You have no active or historical complaints.</div>
                ) : (
                    <div className="space-y-6">
                        {userComplaints.map(c => (
                            <div key={c.id} className={`p-4 rounded-xl shadow-md border-l-4 ${c.status === 'Resolved' || c.status === 'Closed' ? 'border-green-500 bg-green-900/20' : c.status.includes('Progress') || c.status.includes('Review') ? 'border-orange-500 bg-orange-900/20' : 'border-red-500 bg-red-900/20'}`}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="font-bold text-lg text-white">{c.title}</div>
                                        <div className="text-sm text-slate-400 mt-1">Room: {c.room_number} in {c.hostel_name}</div>
                                    </div>
                                    <div className={`text-sm px-3 py-1 rounded-full font-semibold ${c.status === 'Resolved' || c.status === 'Closed' ? 'bg-green-900/40 text-green-300' : 'bg-red-900/40 text-red-300'}`}>
                                        {c.status}
                                    </div>
                                </div>
                                <ComplaintAuditTimeline auditTrail={c.audit_trail || []} />
                                {c.file_url && <a href={c.file_url} className="mt-3 inline-flex items-center text-xs text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">View Attachment</a>}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function UnifiedLibrarySearch({ showMessage, primaryButtonClass, buttonClass }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchSource, setSearchSource] = useState('internal'); // 'internal' or 'openlibrary'
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const performSearch = useCallback(async () => {
        if (!searchTerm.trim()) {
            setResults([]);
            return;
        }

        setIsLoading(true);
        const query = encodeURIComponent(searchTerm.trim());

        try {
            // Use the unified backend endpoint /api/library/search
            const res = await auth().get(`/api/library/search?q=${query}&source=${searchSource}`);

            // The backend is responsible for formatting, so we take results directly
            setResults(res.data.books || []);

        } catch (e) {
            if (e.response && e.response.status !== 401) {
                showMessage(e.response?.data?.message || `Search failed against ${searchSource} library.`, 'error');
            }
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    }, [searchTerm, searchSource, showMessage]);

    // Calculate total results based on state
    const allResults = results;

    return (
        <div className="space-y-6">
            <h4 className="text-2xl font-bold text-blue-400 flex items-center"><Book className="w-6 h-6 mr-2" /> Unified Library Search</h4>

            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                <Select className="sm:w-40 flex-shrink-0" value={searchSource} onChange={e => setSearchSource(e.target.value)} disabled={isLoading}>
                    <option value="internal" className="text-slate-900">Internal Library</option>
                    <option value="openlibrary" className="text-slate-900">OpenLibrary API</option>
                </Select>
                <Input
                    icon={Search}
                    className="flex-grow py-3 px-4 rounded-full"
                    placeholder="Search for book title, author, or ISBN..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') performSearch(); }}
                    disabled={isLoading}
                />
                <button
                    className={`${buttonClass} w-32 py-3 ${primaryButtonClass}`}
                    onClick={performSearch}
                    disabled={isLoading || !searchTerm.trim()}
                >
                    {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Search'}
                </button>
            </div>

            {isLoading && <div className="text-center p-4"><Loader2 className="animate-spin w-6 h-6 mx-auto text-blue-500" /></div>}

            {!isLoading && searchTerm.trim() && allResults.length === 0 && (
                <div className="p-4 bg-slate-900/40 border border-white/10 rounded-xl text-slate-500">
                    No results found for "{searchTerm}" in the {searchSource} library.
                </div>
            )}

            {!isLoading && allResults.length > 0 && (
                <div className="space-y-4">
                    <div className="text-sm text-slate-500 font-semibold">{allResults.length} result(s) found.</div>
                    {allResults.map((book, index) => (
                        <div key={book.id || index} className={`p-4 rounded-xl shadow-md ${book.source === 'Internal' ? 'bg-green-900/20 border-l-4 border-green-500' : 'bg-slate-900/60 border-l-4 border-slate-500'}`}>
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="font-bold text-lg text-white">{book.title}</div>
                                    <div className="text-sm text-slate-400 mt-1">
                                        Author: **{book.author}** | ISBN: {book.isbn || 'N/A'}
                                    </div>
                                    <div className="text-xs mt-1 text-slate-500">Source: {book.source}</div>
                                </div>
                                <div className="ml-4 flex-shrink-0">
                                    {book.source === 'Internal' && book.file_url ? (
                                        <a href={book.file_url} target="_blank" rel="noopener noreferrer" className={`py-1.5 px-4 text-sm font-semibold rounded-full inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white`}>
                                            <Eye className="w-4 h-4 mr-1" /> View
                                        </a>
                                    ) : book.cover_url ? (
                                        <a href={`https://openlibrary.org/search?q=${book.isbn || book.title}`} target="_blank" rel="noopener noreferrer">
                                            <img src={book.cover_url} onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/50x70/E0E0E0/505050?text=No+Cover'; }} className="w-12 h-16 object-cover rounded shadow-md" alt="Cover" />
                                        </a>
                                    ) : (
                                        <span className="text-xs text-slate-500 bg-slate-800 p-2 rounded-full">No View</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}


function AIChat({ showMessage, primaryButtonClass, buttonClass }) {
    const [question, setQuestion] = useState("");
    const [history, setHistory] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const fileInputRef = useRef(null);
    const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);

    const WELCOME_MSG = { role: "ai", text: "Hello! I am Orbit Bot, your academic assistant. Ask me anything about your studies, or upload notes for me to analyze." };

    // Fetch Sessions on Mount
    useEffect(() => {
        loadSessions();
        // Set initial view to empty/welcome
        setHistory([WELCOME_MSG]);
    }, []);

    const loadSessions = async () => {
        try {
            const res = await auth().get("/ai/sessions");
            setSessions(res.data.sessions || []);
        } catch (e) {
            console.error(e);
        }
    };

    const loadSession = async (sessionId) => {
        if (currentSessionId === sessionId) return;
        setIsLoading(true);
        setCurrentSessionId(sessionId);
        try {
            const res = await auth().get(`/ai/session/${sessionId}`);
            setHistory(res.data.messages || []);
        } catch (e) {
            showMessage("Failed to retrieve chat history", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const startNewChat = () => {
        setCurrentSessionId(null);
        setHistory([WELCOME_MSG]);
        setQuestion("");
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const deleteSession = async (e, sessionId) => {
        e.stopPropagation();
        e.preventDefault();
        console.log("Attempting to delete session:", sessionId);

        // Removed window.confirm as it was blocking execution in some environments
        // if (!window.confirm("Are you sure you want to delete this chat history?")) return;

        try {
            console.log("Sending DELETE request...");
            await auth().delete(`/ai/session/${sessionId}`);
            console.log("Delete success");
            setSessions(prev => prev.filter(s => s.id !== sessionId));
            if (currentSessionId === sessionId) startNewChat();
        } catch (e) {
            console.error("Delete Session Failed:", e);
            showMessage(`Failed to delete session: ${e.response?.data?.message || e.message}`, "error");
        }
    };

    // Auto-scroll logic
    useEffect(() => {
        const chatContainer = document.getElementById('chat-history');
        if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
    }, [history]);

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const askQuestion = async () => {
        if ((!question.trim() && !selectedFile) || isLoading) return;

        // Message to display
        const userMsgText = selectedFile ? `${question} [Attached: ${selectedFile.name}]` : question;
        const tempHistory = [...history, { role: "user", text: userMsgText }];
        setHistory(tempHistory);
        setQuestion("");
        setIsLoading(true);

        try {
            let res;
            const formData = new FormData();
            formData.append("question", question);
            if (currentSessionId) formData.append("session_id", currentSessionId);
            if (selectedFile) formData.append("file", selectedFile);

            // Using Multipart for everything to support file if present.
            // If no file, we can still use multipart, or switch to JSON. 
            // Previous code handled both. Let's send FormData always for simplicity now.

            res = await auth().post("/chat", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            // Update Session ID if new
            if (res.data.session_id && res.data.session_id !== currentSessionId) {
                setCurrentSessionId(res.data.session_id);
                loadSessions(); // Refresh list to show new title
            } else {
                // If existing session, just refresh list to update timestamp? Optional.
                loadSessions();
            }

            setHistory(h => [...h, { role: "ai", text: res.data.answer }]);
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";

        } catch (err) {
            if (err.response && err.response.status !== 401) {
                showMessage(`Chat failed: ${err.response?.data?.message || "Could not connect to AI service."}`, 'error');
            }
            setHistory(h => [...h, { role: "ai", text: "I'm sorry, I couldn't connect to the AI service." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !isLoading) askQuestion();
    };

    return (
        <div className="flex h-[600px] gap-4 relative isolate overflow-hidden">
            {/* Sidebar (History) - Mobile Drawer / Desktop Static */}
            <div className={`
                absolute inset-y-0 left-0 z-50 h-full w-3/4 max-w-xs bg-slate-900/95 backdrop-blur-2xl border-r border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-transform duration-300 ease-out
                md:static md:w-1/4 md:bg-slate-900/60 md:shadow-none md:translate-x-0 md:backdrop-blur-xl md:border md:rounded-xl md:flex md:flex-col
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:w-0 md:border-0 md:p-0'}
            `}>
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-slate-900 to-slate-800/50">
                    <h5 className="font-bold text-slate-200 flex items-center gap-2">
                        <History className="w-4 h-4 text-blue-400" /> History
                    </h5>
                    <div className="flex items-center gap-2">
                        {/* Mobile Close Button */}
                        <button onClick={() => setSidebarOpen(false)} className="md:hidden p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <button onClick={startNewChat} className="p-1.5 px-3 bg-blue-600 rounded-lg text-xs font-semibold text-white hover:bg-blue-500 flex items-center shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
                            <Plus className="w-3.5 h-3.5 mr-1.5" /> New
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-slate-900/50">
                    {sessions.map(s => (
                        <div
                            key={s.id}
                            onClick={() => { loadSession(s.id); setSidebarOpen(false); }}
                            className={`p-3 rounded-xl text-sm cursor-pointer flex justify-between items-center group transition-all border border-transparent ${currentSessionId === s.id
                                ? "bg-blue-600/20 text-blue-100 border-blue-500/30 shadow-sm"
                                : "text-slate-400 hover:bg-white/5 hover:text-slate-200"}`}
                        >
                            <div className="truncate pr-2 flex-grow font-medium">{s.title}</div>
                            <button
                                onClick={(e) => deleteSession(e, s.id)}
                                className="text-slate-500 hover:text-red-400 p-1.5 hover:bg-white/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 mobile-visible"
                                title="Delete Chat"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    {sessions.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-500 gap-2">
                            <MessageSquare className="w-8 h-8 opacity-20" />
                            <span className="text-xs">No recent chats</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile Overlay for Sidebar */}
            {sidebarOpen && (
                <div
                    className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Main Chat Area */}
            <div className="flex-1 w-full flex flex-col bg-slate-900/60 backdrop-blur-xl border border-white/10 md:border-blue-500/20 rounded-xl overflow-hidden relative shadow-2xl">
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-800/40 backdrop-blur-md z-10">
                    <div className="flex items-center text-blue-400 font-bold text-lg">
                        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="mr-3 p-1 rounded-lg hover:bg-white/5 transition-colors">
                            <Menu className="w-6 h-6" />
                        </button>
                        <div className="flex flex-col leading-none">
                            <span className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-blue-400" />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Orbit Bot</span>
                            </span>
                            <span className="text-[10px] font-normal text-slate-500 mt-1 hidden md:block">Powered by Llama 3.3</span>
                        </div>
                    </div>
                    <div className="text-xs font-medium px-3 py-1 bg-blue-500/10 text-blue-300 rounded-full border border-blue-500/20">
                        {currentSessionId ? "Active Session" : "New Chat"}
                    </div>
                </div>

                {/* Messages */}
                <div id="chat-history" className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/30 scroll-smooth">
                    {history.length === 0 && !isLoading && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-60">
                            <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
                                <Bot className="w-8 h-8 text-blue-400" />
                            </div>
                            <p className="text-sm font-medium">How can I help you today?</p>
                        </div>
                    )}
                    {history.map((msg, index) => (
                        <div key={index} className={`flex ${msg.role === "ai" ? "justify-start" : "justify-end"}`}>
                            <div className={`max-w-[85%] md:max-w-[75%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-md ${msg.role === "ai"
                                ? "bg-slate-800 text-slate-200 border border-white/5 rounded-tl-none"
                                : "bg-gradient-to-br from-blue-600 to-blue-700 text-white border border-blue-500/20 rounded-tr-none"
                                }`}>
                                <div className="markdown-prose">
                                    {msg.text}
                                </div>
                                <div className={`text-[10px] mt-1 opacity-50 ${msg.role === "ai" ? "text-slate-400" : "text-blue-100 text-right"}`}>
                                    {msg.role === "ai" ? "Orbit AI" : "You"}
                                </div>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-slate-800/80 p-3 rounded-2xl rounded-tl-none text-sm text-blue-300 flex items-center border border-white/5 shadow-sm">
                                <Loader2 className="animate-spin w-4 h-4 mr-2.5" />
                                <span className="font-medium animate-pulse">Thinking...</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area - Pinned Bottom */}
                <div className="p-3 md:p-4 bg-slate-900 border-t border-white/10 z-20">
                    <div className="flex flex-col space-y-2 max-w-4xl mx-auto">
                        {selectedFile && (
                            <div className="flex items-center justify-between bg-blue-900/20 border border-blue-500/30 px-3 py-2 rounded-lg animate-in slide-in-from-bottom-2">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <div className="bg-blue-600/20 p-1.5 rounded text-blue-400">
                                        <Paperclip className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="text-xs font-medium text-blue-200 truncate">{selectedFile.name}</span>
                                </div>
                                <button
                                    onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                                    className="text-slate-400 hover:text-red-400 p-1 rounded-full hover:bg-white/5"
                                >
                                    <XCircle className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        <div className="flex items-end gap-2 bg-slate-800/50 p-1.5 rounded-2xl border border-white/10 focus-within:ring-2 focus-within:ring-blue-500/50 focus-within:border-blue-500/50 transition-all shadow-sm">
                            <button
                                className="p-3 rounded-xl text-slate-400 hover:text-blue-400 hover:bg-slate-700/50 transition-colors"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isLoading}
                            >
                                <Paperclip className="w-5 h-5" />
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                className="hidden"
                                accept=".pdf,.txt,.md,.py,.js,.html,.css,.json,.docx,.doc,.pptx,.ppt"
                            />

                            <div className="relative flex-grow">
                                <Input
                                    className="w-full py-3 px-2 bg-transparent border-none focus:ring-0 text-slate-200 placeholder:text-slate-500 text-base"
                                    placeholder={selectedFile ? "Add a message..." : "Ask something..."}
                                    value={question}
                                    onChange={e => setQuestion(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    disabled={isLoading}
                                    autoComplete="off"
                                />
                            </div>

                            <button
                                className={`p-3 rounded-xl transition-all duration-200 ${!question.trim() && !selectedFile
                                    ? "bg-slate-700/50 text-slate-500 cursor-not-allowed"
                                    : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 active:scale-95"
                                    }`}
                                onClick={askQuestion}
                                disabled={isLoading || (!question.trim() && !selectedFile)}
                            >
                                {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <SendIcon className="w-5 h-5" />}
                            </button>
                        </div>

                        <div className="text-[10px] text-center text-slate-600 font-medium">
                            Powered by Llama 3.3
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ----------------------------------------------
// --- PROFESSOR MODULES ---

// --- PROFESSOR MODULE: Marks Upload (MODIFIED to use form fields) ---
function ProfessorMarksUpload({ showMessage, primaryButtonClass, buttonClass, catalogs, user }) {
    const { subjects, fetchSubjects } = catalogs;
    const [subject, setSubject] = useState("");
    const [examType, setExamType] = useState("internal");

    // New fields for single mark entry
    const [srn, setSrn] = useState("");
    const [marksObtained, setMarksObtained] = useState("");
    const [maxMarks, setMaxMarks] = useState("");

    const [isLoading, setIsLoading] = useState(false);

    // --- Allocation Logic & Filters ---
    const [allocations, setAllocations] = useState([]);

    // Selection States
    const [selDegree, setSelDegree] = useState("");
    const [selSemester, setSelSemester] = useState("");
    const [selSection, setSelSection] = useState("");

    // Derived Lists
    const [availableDegrees, setAvailableDegrees] = useState([]);
    const [availableSemesters, setAvailableSemesters] = useState([]);
    const [availableSections, setAvailableSections] = useState([]);
    const [availableSubjects, setAvailableSubjects] = useState([]);

    // 1. Fetch Allocations
    const fetchAllocations = useCallback(async () => {
        try {
            const res = await auth().get("/faculty/allocations");
            setAllocations(res.data.allocations || []);
        } catch (e) { console.error("Alloc fetch error", e); }
    }, []);

    useEffect(() => { fetchAllocations(); }, [fetchAllocations]);

    // 2. Filter: Degrees
    useEffect(() => {
        if (!allocations.length) return;
        const degrees = [...new Set(allocations.map(a => a.degree))];
        setAvailableDegrees(degrees);
        if (!selDegree && degrees.length) setSelDegree(degrees[0]);
    }, [allocations, selDegree]);

    // 3. Filter: Semesters (based on Degree)
    useEffect(() => {
        if (!selDegree) return;
        const relevant = allocations.filter(a => a.degree === selDegree);
        const sems = [...new Set(relevant.map(a => a.semester))].sort((a, b) => a - b);
        setAvailableSemesters(sems);
        if (!selSemester && sems.length) setSelSemester(String(sems[0]));
    }, [allocations, selDegree, selSemester]);

    // 4. Filter: Sections (based on Degree + Sem)
    useEffect(() => {
        if (!selDegree || !selSemester) return;
        const relevant = allocations.filter(a => a.degree === selDegree && a.semester == selSemester);
        const secs = [...new Set(relevant.map(a => a.section))].sort();
        setAvailableSections(secs);
        // FIX: Re-validate selSection
        if (!selSection || !secs.includes(selSection)) setSelSection(secs[0] || "");
    }, [allocations, selDegree, selSemester, selSection]);

    // 5. Filter: Subjects (based on Degree + Sem + Section)
    useEffect(() => {
        if (!selDegree || !selSemester || !selSection) return;
        const relevant = allocations.filter(a => a.degree === selDegree && a.semester == selSemester && a.section === selSection);
        const subjs = [...new Set(relevant.map(a => a.subject))];
        setAvailableSubjects(subjs);
        if (!subject || !subjs.includes(subject)) setSubject(subjs[0] || "");
    }, [allocations, selDegree, selSemester, selSection, subject]);

    const handleUpload = async () => {
        if (!subject || !examType || !srn || marksObtained === "" || maxMarks === "") {
            return showMessage("All fields are required.", 'error');
        }
        if (parseFloat(marksObtained) > parseFloat(maxMarks)) {
            return showMessage("Marks Obtained cannot be greater than Maximum Marks.", 'error');
        }

        setIsLoading(true);
        const payload = {
            subject,
            exam_type: examType,
            srn,
            marks_obtained: parseFloat(marksObtained),
            max_marks: parseFloat(maxMarks)
        };

        try {
            // Using auth()
            const res = await auth().post("/faculty/marks/upload", payload);
            showMessage(res.data.message, 'success');
            setSrn("");
            setMarksObtained("");
            setMaxMarks("");
        } catch (e) {
            if (e.response && e.response.status !== 401) {
                showMessage(e.response?.data?.message || "Mark submission failed. Check SRN/Subject validity.", 'error');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-xl shadow-lg border border-green-500/20 space-y-4">
            <h4 className="text-2xl font-bold text-green-400 flex items-center"><Upload className="w-6 h-6 mr-2" /> Upload Single Mark Entry</h4>
            <p className="text-sm text-slate-400">Enter marks directly per student.</p>

            <div className="grid grid-cols-3 gap-3">
                <Select value={selDegree} onChange={e => setSelDegree(e.target.value)} disabled={isLoading}>
                    {availableDegrees.map(d => <option key={d} value={d} className="text-slate-900">{d}</option>)}
                </Select>
                <Select value={selSemester} onChange={e => setSelSemester(e.target.value)} disabled={isLoading}>
                    {availableSemesters.map(s => <option key={s} value={s} className="text-slate-900">Sem {s}</option>)}
                </Select>
                <Select value={selSection} onChange={e => setSelSection(e.target.value)} disabled={isLoading}>
                    {availableSections.map(s => <option key={s} value={s} className="text-slate-900">Sec {s}</option>)}
                </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <Select value={subject} onChange={e => setSubject(e.target.value)} disabled={!availableSubjects.length || isLoading}>
                    <option value="" className="text-slate-900">Select Subject</option>
                    {(availableSubjects || []).map(s => <option key={s} value={s} className="text-slate-900">{s}</option>)}
                </Select>
                <Select value={examType} onChange={e => setExamType(e.target.value)} disabled={isLoading}>
                    <option value="internal" className="text-slate-900">Internal Exam</option>
                    <option value="mid" className="text-slate-900">Mid-Term Exam</option>
                    <option value="endsem" className="text-slate-900">End-Semester Exam</option>
                    <option value="assignment" className="text-slate-900">Assignment</option>
                    <option value="lab" className="text-slate-900">Lab Viva/Report</option>
                </Select>
            </div>

            <Input placeholder="Student SRN (e.g., SRN001)" value={srn} onChange={e => setSrn(e.target.value)} disabled={isLoading} />

            <div className="grid grid-cols-2 gap-3">
                <Input type="number" placeholder="Marks Obtained" value={marksObtained} onChange={e => setMarksObtained(e.target.value)} disabled={isLoading} min="0" />
                <Input type="number" placeholder="Max Marks (Total)" value={maxMarks} onChange={e => setMaxMarks(e.target.value)} disabled={isLoading} min="1" />
            </div>

            <button
                className={`${buttonClass} ${primaryButtonClass} w-full`}
                onClick={handleUpload}
                disabled={isLoading || !subject || !srn || marksObtained === "" || maxMarks === ""}
            >
                {isLoading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                {isLoading ? 'Submiting...' : 'Submit Mark'}
            </button>
        </div>
    );
}

function ProfessorFeedback({ showMessage, primaryButtonClass, buttonClass, catalogs, user }) {
    const { subjects, fetchSubjects } = catalogs;
    const [srn, setSrn] = useState("");
    const [subject, setSubject] = useState("");
    const [text, setText] = useState("");

    const [isLoading, setIsLoading] = useState(false);

    // --- Allocation Logic & Filters ---
    const [allocations, setAllocations] = useState([]);

    // Selection States
    const [selDegree, setSelDegree] = useState("");
    const [selSemester, setSelSemester] = useState("");
    const [selSection, setSelSection] = useState("");

    // Derived Lists
    const [availableDegrees, setAvailableDegrees] = useState([]);
    const [availableSemesters, setAvailableSemesters] = useState([]);
    const [availableSections, setAvailableSections] = useState([]);
    const [availableSubjects, setAvailableSubjects] = useState([]);

    // 1. Fetch Allocations
    const fetchAllocations = useCallback(async () => {
        try {
            const res = await auth().get("/faculty/allocations");
            setAllocations(res.data.allocations || []);
        } catch (e) { console.error("Alloc fetch error", e); }
    }, []);

    useEffect(() => { fetchAllocations(); }, [fetchAllocations]);

    // 2. Filter: Degrees
    useEffect(() => {
        if (!allocations.length) return;
        const degrees = [...new Set(allocations.map(a => a.degree))];
        setAvailableDegrees(degrees);
        if (!selDegree && degrees.length) setSelDegree(degrees[0]);
    }, [allocations, selDegree]);

    // 3. Filter: Semesters
    useEffect(() => {
        if (!selDegree) return;
        const relevant = allocations.filter(a => a.degree === selDegree);
        const sems = [...new Set(relevant.map(a => a.semester))].sort((a, b) => a - b);
        setAvailableSemesters(sems);
        if (!selSemester && sems.length) setSelSemester(String(sems[0]));
    }, [allocations, selDegree, selSemester]);

    // 4. Filter: Sections
    useEffect(() => {
        if (!selDegree || !selSemester) return;
        const relevant = allocations.filter(a => a.degree === selDegree && a.semester == selSemester);
        const secs = [...new Set(relevant.map(a => a.section))].sort();
        setAvailableSections(secs);
        // FIX: Check if current section is still valid
        if (!selSection || !secs.includes(selSection)) setSelSection(secs[0] || "");
    }, [allocations, selDegree, selSemester, selSection]);

    // 5. Filter: Subjects
    useEffect(() => {
        if (!selDegree || !selSemester || !selSection) return;
        const relevant = allocations.filter(a => a.degree === selDegree && a.semester == selSemester && a.section === selSection);
        const subjs = [...new Set(relevant.map(a => a.subject))];
        setAvailableSubjects(subjs);
        if (!subject || !subjs.includes(subject)) setSubject(subjs[0] || "");
    }, [allocations, selDegree, selSemester, selSection, subject]);

    const handleSubmit = async () => {
        if (!srn || !subject || !text) { return showMessage("SRN, subject, and feedback text are required.", 'error'); }

        setIsLoading(true);
        try {
            // Using auth()
            await auth().post("/faculty/feedback", { srn, subject, text });
            showMessage(`Feedback saved for SRN ${srn}.`, 'success');
            setSrn("");
            setText("");
        } catch (e) {
            if (e.response && e.response.status !== 401) {
                showMessage(e.response?.data?.message || "Failed to save feedback. Check if SRN is valid.", 'error');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-xl shadow-lg border border-yellow-500/20 space-y-4">
            <h4 className="text-2xl font-bold text-yellow-400 flex items-center"><MessageSquare className="w-6 h-6 mr-2" /> Provide Student Feedback</h4>
            <p className="text-sm text-slate-400">Send personalized academic comments to a specific student.</p>

            <div className="grid grid-cols-3 gap-3">
                <Select value={selDegree} onChange={e => setSelDegree(e.target.value)} disabled={isLoading}>
                    {availableDegrees.map(d => <option key={d} value={d} className="text-slate-900">{d}</option>)}
                </Select>
                <Select value={selSemester} onChange={e => setSelSemester(e.target.value)} disabled={isLoading}>
                    {availableSemesters.map(s => <option key={s} value={s} className="text-slate-900">Sem {s}</option>)}
                </Select>
                <Select value={selSection} onChange={e => setSelSection(e.target.value)} disabled={isLoading}>
                    {availableSections.map(s => <option key={s} value={s} className="text-slate-900">Sec {s}</option>)}
                </Select>
            </div>

            <Input placeholder="Student SRN (e.g., SRN001)" value={srn} onChange={e => setSrn(e.target.value)} disabled={isLoading} />

            <Select value={subject} onChange={e => setSubject(e.target.value)} disabled={!availableSubjects.length || isLoading}>
                <option value="" className="text-slate-900">Select Subject</option>
                {(availableSubjects || []).map(s => <option key={s} value={s} className="text-slate-900">{s}</option>)}
            </Select>

            <textarea
                className="w-full bg-slate-800/50 backdrop-blur-xl text-white placeholder-slate-500 border border-white/10 rounded-xl py-3 px-4 focus:ring-2 focus:ring-yellow-500/50 outline-none transition duration-200 h-32"
                placeholder="Detailed feedback message..."
                value={text}
                onChange={e => setText(e.target.value)}
                disabled={isLoading}
            />

            <button
                className={`${buttonClass} ${primaryButtonClass} w-full bg-yellow-600 hover:bg-yellow-700 text-white`}
                onClick={handleSubmit}
                disabled={isLoading || !srn || !subject || !text}
            >
                {isLoading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                {isLoading ? 'Sending...' : 'Send Feedback'}
            </button>
        </div>
    );
}

// --- NEW COMPONENT: Professor Messages (Chat Style) ---
function ProfessorMessages({ showMessage }) {
    const [conversations, setConversations] = useState([]);
    const [activeThread, setActiveThread] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [replyText, setReplyText] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);

    // Auto-scroll logic
    const messagesEndRef = useRef(null);
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };
    useEffect(scrollToBottom, [activeThread]);

    // 1. Fetch List of Conversations (Students who have messaged)
    const fetchConversations = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await auth().get("/faculty/conversations");
            setConversations(res.data.conversations || []);
        } catch (e) {
            console.error(e);
            showMessage("Failed to load conversations", "error");
        } finally {
            setIsLoading(false);
        }
    }, [showMessage]);

    useEffect(() => { fetchConversations(); }, [fetchConversations]);

    // 2. Fetch Thread when student selected
    const selectStudent = async (student) => {
        setSelectedStudent(student);
        setSidebarOpen(false); // Close mobile drawer
        try {
            const res = await auth().get(`/faculty/messages/${student.student_id}`);
            setActiveThread(res.data.messages || []);
            // Mark conversation as read locally
            setConversations(prev => prev.map(c =>
                c.student_id === student.student_id ? { ...c, unread_count: 0 } : c
            ));
        } catch (e) {
            console.error(e);
            showMessage("Failed to load chat history", "error");
        }
    };

    const handleSendReply = async () => {
        if (!replyText.trim()) return;
        setIsSending(true);
        try {
            await auth().post("/faculty/messages/reply", {
                student_id: selectedStudent.student_id,
                reply_body: replyText
            });

            // Optimistic Update
            const newMsg = {
                id: Date.now(), // temp id
                sender: 'faculty',
                body: replyText,
                timestamp: new Date().toISOString()
            };
            setActiveThread(prev => [...prev, newMsg]);
            setReplyText("");
        } catch (e) {
            console.error(e);
            showMessage("Failed to send reply", "error");
        } finally {
            setIsSending(false);
        }
    };

    if (isLoading && conversations.length === 0) return <div className="p-8 text-center text-slate-400">Loading chats...</div>;

    return (
        <div className="flex h-[600px] gap-4 relative isolate overflow-hidden">
            {/* Sidebar: Conversation List - Mobile Drawer / Desktop Static */}
            <div className={`
                absolute inset-y-0 left-0 z-50 h-full w-3/4 max-w-xs bg-slate-900/95 backdrop-blur-2xl border-r border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-transform duration-300 ease-out
                md:static md:w-1/3 md:bg-slate-900/60 md:backdrop-blur-xl md:border md:rounded-xl md:flex md:flex-col md:shadow-none md:translate-x-0
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:w-0 md:border-0 md:p-0'}
            `}>
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <h5 className="font-bold text-lg text-white">Messages</h5>
                    <button onClick={() => setSidebarOpen(false)} className="md:hidden p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {conversations.length === 0 ? (
                        <div className="p-4 text-center text-slate-500">No active conversations.</div>
                    ) : (
                        conversations.map(c => (
                            <div
                                key={c.student_id}
                                onClick={() => selectStudent(c)}
                                className={`p-4 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors ${selectedStudent?.student_id === c.student_id ? 'bg-blue-900/20 border-l-4 border-l-blue-500 chain-active' : ''}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <div className="font-semibold text-slate-200">{c.student_name}</div>
                                    {c.unread_count > 0 && (
                                        <span className="bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full">{c.unread_count} new</span>
                                    )}
                                </div>
                                <div className="text-xs text-slate-500 truncate">{c.last_message}</div>
                                <div className="text-[10px] text-slate-600 mt-1">{new Date(c.last_timestamp).toLocaleDateString()}</div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Mobile Overlay for Sidebar */}
            {sidebarOpen && (
                <div
                    className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Main Chat Area */}
            <div className={`flex-1 flex flex-col bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden relative transition-all duration-300 ${sidebarOpen ? 'md:w-2/3' : 'w-full'}`}>
                {selectedStudent ? (
                    <>
                        {/* Header */}
                        <div className="p-4 border-b border-white/10 bg-slate-800/50 flex items-center shadow-sm z-10">
                            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="mr-3 p-1 rounded-lg hover:bg-white/5 transition-colors text-white">
                                <Menu className="w-6 h-6" />
                            </button>
                            <div>
                                <h4 className="font-bold text-white">{selectedStudent.student_name}</h4>
                                <p className="text-xs text-slate-400">SRN: {selectedStudent.student_srn}</p>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/30">
                            {activeThread.map((msg, idx) => {
                                const isMe = msg.sender === 'faculty';
                                return (
                                    <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] md:max-w-[70%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm relative ${isMe
                                            ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-none border border-blue-500/20'
                                            : 'bg-slate-800 text-slate-200 rounded-bl-none border border-white/5'
                                            }`}>
                                            {!isMe && <div className="text-[10px] text-slate-400 mb-1 font-bold uppercase tracking-wider">Parent</div>}
                                            {msg.body}
                                            <div className={`text-[9px] mt-1 opacity-70 ${isMe ? 'text-blue-100 text-right' : 'text-slate-400'}`}>
                                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-3 md:p-4 bg-slate-900 border-t border-white/10 z-20">
                            <div className="flex gap-2 max-w-4xl mx-auto">
                                <textarea
                                    className="flex-1 bg-slate-900 text-white rounded-xl border border-white/10 p-3 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none resize-none h-12"
                                    placeholder="Type your reply..."
                                    value={replyText}
                                    onChange={e => setReplyText(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
                                />
                                <button
                                    onClick={handleSendReply}
                                    disabled={isSending || !replyText.trim()}
                                    className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl disabled:opacity-50 transition-all active:scale-95"
                                >
                                    {isSending ? <Loader2 className="animate-spin w-5 h-5" /> : <SendIcon className="w-5 h-5" />}
                                </button>
                            </div>
                            <div className="text-[10px] text-center text-slate-500 mt-2 hidden md:block">
                                Reply will be sent via email and saved to chat history.
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600">
                        <div className="md:hidden absolute top-4 left-4">
                            <button onClick={() => setSidebarOpen(true)} className="p-2 bg-slate-800 rounded-lg text-white">
                                <Menu className="w-6 h-6" />
                            </button>
                        </div>
                        <MessageSquare className="w-16 h-16 opacity-20 mb-4" />
                        <p>Select a conversation to start chatting.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// Professor Panel (Updated for separated Degree/Semester controls + Strict Allocation Filtering)
function ProfessorPanel({ user, showMessage, catalogs, buttonClass, successButtonClass, dangerButtonClass, onLogout }) {
    const [view, setView] = useState('notes');

    // Allocations State
    const [allocations, setAllocations] = useState([]);
    const [availableDegrees, setAvailableDegrees] = useState([]);
    const [availableSemesters, setAvailableSemesters] = useState([]); // Filtered by selected degree
    const [availableSections, setAvailableSections] = useState([]);   // Filtered by selected degree & sem
    const [availableSubjects, setAvailableSubjects] = useState([]);   // Filtered by selected degree & sem

    // --- State for Notes Upload ---
    const [noteTitle, setNoteTitle] = useState("");
    const [noteDegree, setNoteDegree] = useState("");
    const [noteSemester, setNoteSemester] = useState("");
    const [noteSection, setNoteSection] = useState(""); // Added Section State
    const [noteSubject, setNoteSubject] = useState("");
    const [noteDocumentType, setNoteDocumentType] = useState("Notes");
    const [noteFile, setNoteFile] = useState(null);
    const [isUploadLoading, setIsUploadLoading] = useState(false);

    // --- State for Notice Creation ---
    const [nTitle, setNTitle] = useState("");
    const [nMsg, setNMsg] = useState("");
    const [nDegree, setNDegree] = useState("");
    const [nSemester, setNSemester] = useState("");
    const [nSection, setNSection] = useState("");
    const [nSubject, setNSubject] = useState("");
    const [nDeadline, setNDeadline] = useState("");
    const [attachment, setAttachment] = useState(null);
    const [isNoticeLoading, setIsNoticeLoading] = useState(false);

    // Fetch Allocations
    const fetchAllocations = useCallback(async () => {
        try {
            const res = await auth().get("/faculty/allocations");
            setAllocations(res.data.allocations || []);
        } catch (e) {
            console.error("Failed to fetch allocations", e);
        }
    }, []);

    useEffect(() => { fetchAllocations(); }, [fetchAllocations]);

    // Derived Lists based on Allocations
    useEffect(() => {
        if (!allocations.length) return;
        const degrees = [...new Set(allocations.map(a => a.degree))];
        setAvailableDegrees(degrees);
        // Defaults
        if (!noteDegree && degrees.length) { setNoteDegree(degrees[0]); setNDegree(degrees[0]); }
    }, [allocations, noteDegree]);

    // Update Valid Semesters when Degree changes
    useEffect(() => {
        const relevant = allocations.filter(a => a.degree === (view === 'notes' ? noteDegree : nDegree));
        const sems = [...new Set(relevant.map(a => a.semester))].sort((a, b) => a - b);
        setAvailableSemesters(sems);
        // Default Semester
        const currentSem = view === 'notes' ? noteSemester : nSemester;
        if (!currentSem || !sems.includes(parseInt(currentSem))) {
            const def = sems.length ? String(sems[0]) : "";
            if (view === 'notes') setNoteSemester(def); else setNSemester(def);
        }
    }, [allocations, noteDegree, nDegree, view, noteSemester, nSemester]);

    // Update Valid Subjects/Sections when Degree/Sem changes
    useEffect(() => {
        // Shared Logic for Valid Sections (Both Views need Section now)
        const relevantForSec = allocations.filter(a => a.degree === (view === 'notes' ? noteDegree : nDegree) && a.semester == (view === 'notes' ? noteSemester : nSemester));
        const secs = [...new Set(relevantForSec.map(a => a.section))].sort();
        setAvailableSections(secs);

        // Update Section State
        if (view === 'notes') {
            if (!noteSection || !secs.includes(noteSection)) setNoteSection(secs[0] || "");
        } else {
            if (!nSection || !secs.includes(nSection)) setNSection(secs[0] || "");
        }

        // Shared Logic for Subjects (Filtered by Section as well now)
        const currentSec = view === 'notes' ? noteSection : nSection;
        const currentDeg = view === 'notes' ? noteDegree : nDegree;
        const currentSem = view === 'notes' ? noteSemester : nSemester;

        const relevantForSub = allocations.filter(a => a.degree === currentDeg && a.semester == currentSem && a.section === currentSec);
        const subjs = [...new Set(relevantForSub.map(a => a.subject))];
        setAvailableSubjects(subjs);

        if (view === 'notes') {
            if (!noteSubject || !subjs.includes(noteSubject)) setNoteSubject(subjs[0] || "");
        } else {
            if (!nSubject || !subjs.includes(nSubject)) setNSubject(subjs[0] || "");
        }

    }, [allocations, view, noteDegree, noteSemester, noteSection, nDegree, nSemester, nSection, noteSubject, nSubject]);

    // GSAP Navigation Animation
    const navRef = useRef(null);
    const indicatorRef = useRef(null);
    const contentRef = useRef(null);

    useEffect(() => {
        if (navRef.current && indicatorRef.current) {
            const activeBtn = navRef.current.querySelector(`button[data-key="${view}"]`);
            if (activeBtn) {
                gsap.to(indicatorRef.current, {
                    y: activeBtn.offsetTop,
                    height: activeBtn.offsetHeight,
                    opacity: 1,
                    duration: 0.5,
                    ease: "elastic.out(1, 0.6)"
                });
            }
        }
        // Animate Content
        if (contentRef.current) {
            gsap.fromTo(contentRef.current,
                { opacity: 0, y: 10 },
                { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }
            );
        }
    }, [view]);

    const uploadNote = async () => {
        if (!noteTitle || !noteFile || !noteDegree || !noteSemester || !noteSection || !noteSubject) return showMessage("All fields and file are required.", 'error');

        setIsUploadLoading(true);
        const form = new FormData();
        form.append("title", noteTitle);
        form.append("degree", noteDegree);
        form.append("semester", noteSemester);
        form.append("section", noteSection); // Added Section
        form.append("subject", noteSubject);
        form.append("document_type", noteDocumentType);
        form.append("file", noteFile);

        try {
            await auth().post("/upload-note", form);
            showMessage("Note uploaded successfully!", 'success');
            setNoteTitle(""); setNoteFile(null);
            if (document.getElementById('noteFile')) document.getElementById('noteFile').value = '';
        } catch (err) {
            if (err.response && err.response.status !== 401) { showMessage(err.response?.data?.message || "Upload failed", 'error'); }
        } finally {
            setIsUploadLoading(false);
        }
    };

    const postNotice = async () => {
        if (!nTitle || !nMsg || !nSection || !nDegree || !nSemester || !nSubject) return showMessage("All fields are required.", 'error');

        setIsNoticeLoading(true);
        const form = new FormData();
        form.append("title", nTitle);
        form.append("message", nMsg);
        form.append("degree", nDegree);
        form.append("semester", nSemester);
        form.append("section", nSection);
        form.append("subject", nSubject);
        if (nDeadline) form.append("deadline", nDeadline);
        if (attachment) form.append("attachment", attachment);

        try {
            await auth().post("/create-notice", form);
            showMessage("Notice posted successfully!", 'success');
            setNTitle(""); setNMsg(""); setNDeadline(""); setAttachment(null); setNSection(catalogs.sections[0]);
        } catch (err) {
            if (err.response && err.response.status !== 401) { showMessage(err.response?.data?.message || "Notice failed", 'error'); }
        } finally {
            setIsNoticeLoading(false);
        }
    };


    const renderView = () => {
        switch (view) {
            case 'notes':
                return (
                    <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-xl shadow-lg border border-green-500/20 space-y-3">
                        <h4 className="text-2xl font-bold mb-4 text-green-400 flex items-center"><Book className="w-6 h-6 mr-2" /> Upload Study Material</h4>
                        <Input placeholder="Title (e.g., Module 1 PPT)" value={noteTitle} onChange={e => setNoteTitle(e.target.value)} disabled={isUploadLoading} />

                        {/* SEPARATE DROPDOWNS FOR NOTES */}
                        <div className="grid grid-cols-3 gap-3">
                            <Select value={noteDegree} onChange={e => setNoteDegree(e.target.value)} disabled={isUploadLoading}>
                                {availableDegrees.map(d => <option key={d} value={d} className="text-slate-900">{d}</option>)}
                            </Select>
                            <Select value={noteSemester} onChange={e => setNoteSemester(e.target.value)} disabled={isUploadLoading}>
                                {availableSemesters.map(s => <option key={s} value={s} className="text-slate-900">Sem {s}</option>)}
                            </Select>
                            <Select value={noteSection} onChange={e => setNoteSection(e.target.value)} disabled={isUploadLoading || !availableSections.length}>
                                {availableSections.map(s => <option key={s} value={s} className="text-slate-900">Sec {s}</option>)}
                            </Select>
                        </div>
                        {/* END SEPARATE DROPDOWNS */}

                        <Select value={noteSubject} onChange={e => setNoteSubject(e.target.value)} icon={Book} disabled={isUploadLoading || !availableSubjects.length}>
                            <option value="" className="text-slate-900">Select Subject</option>
                            {(availableSubjects || []).map(s => <option key={s} value={s} className="text-slate-900">{s}</option>)}
                        </Select>
                        <Select value={noteDocumentType} onChange={e => setNoteDocumentType(e.target.value)} disabled={isUploadLoading}>
                            <option value="Notes" className="text-slate-900">Notes</option>
                            <option value="Question Bank" className="text-slate-900">Question Bank</option>
                            <option value="Reference Book" className="text-slate-900">Reference Book</option>
                        </Select>
                        <label className="block text-sm text-slate-300 font-medium pt-2">Select File (PDF, DOCX, PPTX):</label>
                        <input id="noteFile" type="file" onChange={e => setNoteFile(e.target.files[0])} className="w-full text-slate-300 bg-slate-800/50 rounded-lg p-3 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700 transition duration-200" disabled={isUploadLoading} />
                        <button className={`${buttonClass} ${successButtonClass} w-full`} onClick={uploadNote} disabled={isUploadLoading || !noteTitle || !noteFile || !noteSubject}> {isUploadLoading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Upload className="w-5 h-5 mr-2" />} {isUploadLoading ? 'Uploading...' : 'Upload Note'} </button>
                    </div>
                );
            case 'notices':
                return (
                    <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-xl shadow-lg border border-red-500/20 space-y-3">
                        <h4 className="text-2xl font-bold mb-4 text-red-500 flex items-center"><Bell className="w-6 h-6 mr-2" /> Create Notice</h4>
                        <Input placeholder="Title (e.g., Assignment 1 Due)" value={nTitle} onChange={e => setNTitle(e.target.value)} disabled={isNoticeLoading} />
                        <textarea className="w-full bg-slate-800/50 backdrop-blur-xl text-white placeholder-slate-500 border border-white/10 rounded-xl py-3 px-4 focus:ring-2 focus:ring-red-500/50 outline-none transition duration-200 h-24" placeholder="Message details..." value={nMsg} onChange={e => setNMsg(e.target.value)} disabled={isNoticeLoading} />

                        {/* SEPARATE DROPDOWNS FOR NOTICES */}
                        <div className="grid grid-cols-3 gap-3">
                            <Select value={nDegree} onChange={e => setNDegree(e.target.value)} disabled={isNoticeLoading}>
                                {availableDegrees.map(d => <option key={d} value={d} className="text-slate-900">{d}</option>)}
                            </Select>
                            <Select value={nSemester} onChange={e => setNSemester(e.target.value)} disabled={isNoticeLoading}>
                                {availableSemesters.map(s => <option key={s} value={s} className="text-slate-900">Sem {s}</option>)}
                            </Select>
                            <Select value={nSection} onChange={e => setNSection(e.target.value)} disabled={isNoticeLoading || !availableSections.length}>
                                {availableSections.map(s => <option key={s} value={s} className="text-slate-900">Sec {s}</option>)}
                            </Select>
                        </div>
                        {/* END SEPARATE DROPDOWNS */}

                        <Select value={nSubject} onChange={e => setNSubject(e.target.value)} icon={Book} disabled={isNoticeLoading || !availableSubjects.length}>
                            <option value="" className="text-slate-900">Select Subject</option>
                            {(availableSubjects || []).map(s => <option key={s} value={s} className="text-slate-900">{s}</option>)}
                        </Select>
                        <div className="flex gap-2">
                            <input type="date" value={nDeadline} onChange={e => setNDeadline(e.target.value)} className="bg-slate-800/50 text-white border border-white/10 rounded-lg px-4" disabled={isNoticeLoading} />
                            <input type="file" onChange={e => setAttachment(e.target.files[0])} className="text-xs text-slate-400 file:mr-2 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-red-600 file:text-white hover:file:bg-red-700" disabled={isNoticeLoading} />
                        </div>
                        <button className={`${buttonClass} ${dangerButtonClass} w-full`} onClick={postNotice} disabled={isNoticeLoading || !nTitle || !nMsg || !nSection || !nSubject}> {isNoticeLoading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Bell className="w-5 h-5 mr-2" />} {isNoticeLoading ? 'Posting...' : 'Post Notice'} </button>
                    </div>
                );
            case 'messages': return <ProfessorMessages showMessage={showMessage} />; // NEW
            case 'marks':
                return <ProfessorMarksUpload showMessage={showMessage} primaryButtonClass={successButtonClass} buttonClass={buttonClass} catalogs={catalogs} user={user} />;
            case 'feedback':
                return <ProfessorFeedback showMessage={showMessage} primaryButtonClass={successButtonClass} buttonClass={buttonClass} catalogs={catalogs} user={user} />;
            case 'books':
                return <UnifiedLibrarySearch showMessage={showMessage} primaryButtonClass={successButtonClass} buttonClass={buttonClass} />;
            case 'attendance':
                return <FacultyAttendance showMessage={showMessage} buttonClass={buttonClass} catalogs={catalogs} />;
            case 'chat':
                return <AIChat showMessage={showMessage} primaryButtonClass={successButtonClass} buttonClass={buttonClass} />;
            default:
                return <div className="p-8 text-center text-gray-500">Welcome to the Faculty Portal. Select a tool from the sidebar.</div>;
        }
    };

    const navigation = [
        { key: 'notes', label: 'Upload Notes', icon: Book },
        { key: 'notices', label: 'Create Notices', icon: Bell },
        { key: 'marks', label: 'Upload Marks', icon: Award },
        { key: 'feedback', label: 'Send Feedback', icon: MessageSquare },
        { key: 'messages', label: 'Parent Messages', icon: Mail }, // NEW
        { key: 'attendance', label: 'Attendance', icon: ClipboardList },
        { key: 'books', label: 'Search Library', icon: Search },
        { key: 'chat', label: 'Orbit Bot', icon: Briefcase },
    ];

    return (
        <div className="min-h-screen animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Area */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Faculty Portal</h1>
                    <p className="text-slate-400">Welcome, {user?.name || 'Professor'}! Manage your academic duties.</p>
                </div>
                {/* Aesthetic Logout Button */}
                <button
                    onClick={onLogout}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl border border-red-500/20 transition-all font-medium shadow-sm"
                >
                    <LogOut className="w-4 h-4" /> Logout
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-56 bg-slate-900/60 backdrop-blur-xl p-4 rounded-xl shadow-lg border border-white/10 flex-shrink-0 animate-in slide-in-from-left-4 duration-500">
                    <h5 className="text-lg font-bold text-emerald-400 mb-4 ml-2 hidden md:block">Faculty Tools</h5>
                    <nav className="space-y-1 relative hidden md:block" ref={navRef}>
                        <div ref={indicatorRef} className="absolute left-0 top-0 w-full bg-emerald-600/20 border border-emerald-500/30 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.2)] pointer-events-none opacity-0 z-0" style={{ height: 0 }} />
                        {navigation.map(item => (
                            <button
                                key={item.key}
                                data-key={item.key}
                                onClick={() => setView(item.key)}
                                className={`w-full flex items-center p-3 rounded-xl font-semibold transition-colors duration-200 relative z-10 ${view === item.key
                                    ? 'text-emerald-300'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <item.icon className="w-5 h-5 mr-3" />
                                {item.label}
                            </button>
                        ))}
                    </nav>
                    {/* Mobile Navigation Dropdown (HRD Style) */}
                    <div className="md:hidden">
                        <div className="relative">
                            <Menu className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400 pointer-events-none" />
                            <select
                                value={view}
                                onChange={(e) => setView(e.target.value)}
                                className="w-full bg-slate-800/80 border border-emerald-500/30 rounded-xl py-3 pl-10 pr-4 text-white appearance-none outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-lg font-semibold"
                            >
                                {navigation.map(item => (
                                    <option key={item.key} value={item.key} className="bg-slate-900 text-white py-2">
                                        {item.label}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </div>
                <div ref={contentRef} className="flex-1 min-h-[600px] bg-slate-900/60 backdrop-blur-xl p-6 rounded-xl shadow-2xl border border-white/10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
                    {renderView()}
                </div>
            </div>
        </div>
    );
}

// ----------------------------------------------
// --- ADMIN MODULES (NEW/MODIFIED) ---

// --- NEW ADMIN MODULE: Note Upload (Reuses Faculty Endpoint)
function AdminNoteUpload({ showMessage, buttonClass, primaryButtonClass, catalogs }) {
    const { degrees, fetchSubjects, fetchSections } = catalogs;
    const [title, setTitle] = useState("");
    const [degree, setDegree] = useState("");
    const [semester, setSemester] = useState("1");
    const [section, setSection] = useState("");
    const [subject, setSubject] = useState("");
    const [documentType, setDocumentType] = useState("Notes");
    const [file, setFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isListLoading, setIsListLoading] = useState(false);
    const [uploadedItems, setUploadedItems] = useState([]);

    // Dynamic Lists
    const [availableSubjects, setAvailableSubjects] = useState([]);
    const [availableSections, setAvailableSections] = useState([]);

    // Initialize defaults
    useEffect(() => {
        if (degrees.length && !degree) setDegree(degrees[0]);
    }, [degrees, degree]);

    // Fetch Subjects & Sections on Deg/Sem change
    useEffect(() => {
        if (degree && semester) {
            fetchSubjects(degree, semester).then(setAvailableSubjects);
            fetchSections(degree, semester).then(setAvailableSections);
        } else {
            setAvailableSubjects([]);
            setAvailableSections([]);
        }
    }, [degree, semester, fetchSubjects, fetchSections]);

    // Reset subject if not in new list
    useEffect(() => {
        if (availableSubjects.length && !availableSubjects.includes(subject)) {
            setSubject(availableSubjects[0]);
        } else if (!availableSubjects.length) {
            setSubject("");
        }
    }, [availableSubjects, subject]);


    const handleUpload = async () => {
        if (!title || !file || !degree || !semester || !section || !subject) {
            return showMessage("All fields are required.", 'error');
        }

        setIsLoading(true);
        const form = new FormData();
        form.append("title", title);
        form.append("degree", degree);
        form.append("semester", semester);
        form.append("section", section);
        form.append("subject", subject);
        form.append("document_type", documentType);
        form.append("file", file);

        try {
            await auth().post("/upload-note", form);
            showMessage("Study material uploaded successfully!", 'success');
            setTitle("");
            setFile(null);
            if (document.getElementById('adminNoteFile')) document.getElementById('adminNoteFile').value = '';
        } catch (err) {
            if (err.response && err.response.status !== 401) {
                showMessage(err.response?.data?.message || "Upload failed", 'error');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const fetchUploaded = useCallback(async () => {
        if (!degree || !semester) {
            setUploadedItems([]);
            return;
        }
        setIsListLoading(true);
        try {
            const params = { degree, semester };
            if (subject) params.subject = subject;
            // If section is blank => fetch all sections for management
            if (section) params.section = section;
            if (documentType) params.document_type = documentType;

            const res = await auth().get("/notes", { params });
            setUploadedItems(res.data.notes || []);
        } catch (e) {
            if (e.response && e.response.status !== 401) {
                showMessage(e.response?.data?.message || "Failed to load uploaded materials.", "error");
            }
            setUploadedItems([]);
        } finally {
            setIsListLoading(false);
        }
    }, [degree, semester, subject, section, documentType, showMessage]);

    useEffect(() => {
        // Keep the admin list in sync with the selected filters
        fetchUploaded();
    }, [fetchUploaded]);

    const handleDelete = async (noteId) => {
        const ok = window.confirm("Delete this uploaded material? This cannot be undone.");
        if (!ok) return;
        try {
            await auth().delete(`/admin/notes/${noteId}`);
            showMessage("Deleted successfully.", "success");
            fetchUploaded();
        } catch (e) {
            if (e.response && e.response.status !== 401) {
                showMessage(e.response?.data?.message || "Delete failed.", "error");
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-xl shadow-lg border border-green-500/20 space-y-4">
                <h4 className="text-2xl font-bold mb-4 text-green-400 flex items-center"><Book className="w-6 h-6 mr-2" /> Upload Study Material (Admin)</h4>

                <Input placeholder="Title (e.g., Module 1 PPT)" value={title} onChange={e => setTitle(e.target.value)} disabled={isLoading} />

                <div className="grid grid-cols-3 gap-3">
                    <Select value={degree} onChange={e => setDegree(e.target.value)} disabled={isLoading}>
                        <option value="" className="text-slate-900">Select Degree</option>
                        {(degrees || []).map(d => <option key={d} value={d} className="text-slate-900">{d}</option>)}
                    </Select>
                    <Select value={semester} onChange={e => setSemester(e.target.value)} disabled={isLoading}>
                        {Array.from({ length: 8 }, (_, i) => i + 1).map(s => <option key={s} value={s} className="text-slate-900">Sem {s}</option>)}
                    </Select>
                    <Select value={section} onChange={e => setSection(e.target.value)} disabled={isLoading}>
                        <option value="" className="text-slate-900">All Sections (Manage)</option>
                        <option value="ALL" className="text-amber-400 font-bold">All Sections</option>
                        {(availableSections || []).map(s => <option key={s} value={s} className="text-slate-900">Sec {s}</option>)}
                    </Select>
                </div>

                <Select value={subject} onChange={e => setSubject(e.target.value)} icon={Book} disabled={isLoading || !availableSubjects.length}>
                    <option value="" className="text-slate-900">Select Subject</option>
                    {(availableSubjects || []).map(s => <option key={s} value={s} className="text-slate-900">{s}</option>)}
                </Select>

                <Select value={documentType} onChange={e => setDocumentType(e.target.value)} disabled={isLoading}>
                    <option value="Notes" className="text-slate-900">Notes</option>
                    <option value="Question Bank" className="text-slate-900">Question Bank</option>
                    <option value="Reference Book" className="text-slate-900">Reference Book</option>
                </Select>

                <label className="block text-sm text-slate-300 font-medium pt-2">Select File (PDF, DOCX, PPTX):</label>
                <input
                    id="adminNoteFile"
                    type="file"
                    onChange={e => setFile(e.target.files[0])}
                    className="w-full text-slate-300 bg-slate-800/50 rounded-lg p-3 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700 transition duration-200"
                    disabled={isLoading}
                />

                <button
                    className={`${buttonClass} ${primaryButtonClass} w-full`}
                    onClick={handleUpload}
                    disabled={isLoading || !title || !file || !degree || !subject}
                >
                    {isLoading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Upload className="w-5 h-5 mr-2" />}
                    {isLoading ? 'Uploading...' : 'Upload Material'}
                </button>
            </div>

            <div className="bg-slate-900/40 backdrop-blur-xl p-6 rounded-xl shadow-lg border border-white/10">
                <div className="flex items-center justify-between gap-3 mb-4">
                    <h5 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                        <History className="w-5 h-5 text-slate-400" /> Manage Uploaded Materials
                    </h5>
                    <button
                        className={`${buttonClass} bg-slate-700 hover:bg-slate-600 text-white text-sm`}
                        onClick={fetchUploaded}
                        disabled={isListLoading || !degree || !semester}
                    >
                        {isListLoading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                        Refresh
                    </button>
                </div>

                {!degree && <div className="text-sm text-slate-400">Select Degree/Semester to view uploaded materials.</div>}

                {degree && semester && !isListLoading && uploadedItems.length === 0 && (
                    <div className="p-4 bg-slate-900/40 border border-white/10 rounded-xl text-slate-500 text-sm">
                        No uploaded materials found for the selected filters.
                    </div>
                )}

                {isListLoading && (
                    <div className="text-center py-8">
                        <Loader2 className="animate-spin w-6 h-6 mx-auto text-slate-300" />
                    </div>
                )}

                <div className="space-y-3">
                    {uploadedItems.map((n) => (
                        <div key={n.id} className="p-4 rounded-xl border border-white/10 bg-slate-800/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="min-w-0">
                                <div className="font-bold text-white truncate">{n.title}</div>
                                <div className="text-xs text-slate-400 mt-1">
                                    {n.degree} • Sem {n.semester} • Sec {n.section} • {n.subject} • <span className="text-blue-300">{n.document_type}</span>
                                </div>
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                                {n.file_url && (
                                    <a className={`py-2 px-4 text-sm font-semibold rounded-full inline-flex items-center ${primaryButtonClass}`} href={n.file_url} target="_blank" rel="noopener noreferrer">
                                        Download
                                    </a>
                                )}
                                <button
                                    className={`${buttonClass} bg-red-600 hover:bg-red-700 text-white text-sm`}
                                    onClick={() => handleDelete(n.id)}
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// --- NEW ADMIN MODULE: Book Upload
function AdminBookUpload({ showMessage, buttonClass, primaryButtonClass, catalogs }) {
    const { degrees } = catalogs;
    const [title, setTitle] = useState("");
    const [author, setAuthor] = useState("");
    const [isbn, setIsbn] = useState("");
    const [file, setFile] = useState(null);
    const [degree, setDegree] = useState(degrees[0] || "");
    const [semester, setSemester] = useState("1");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (degrees.length && !degree) setDegree(degrees[0]);
    }, [degrees, degree]);

    const handleUpload = async () => {
        if (!title || !author || !degree || !semester || !file) {
            return showMessage("Title, Author, Degree, Semester, and File are required.", 'error');
        }

        setIsLoading(true);
        const form = new FormData();
        form.append("title", title);
        form.append("author", author);
        form.append("isbn", isbn);
        form.append("degree", degree);
        form.append("semester", semester);
        form.append("file", file);

        try {
            const res = await auth().post("/api/admin/library/book", form);
            showMessage(res.data.message, 'success');
            setTitle("");
            setAuthor("");
            setIsbn("");
            setFile(null);
            if (document.getElementById('bookFile')) document.getElementById('bookFile').value = '';
        } catch (err) {
            if (err.response && err.response.status !== 401) {
                showMessage(err.response?.data?.message || "Book upload failed.", 'error');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-xl shadow-lg border border-blue-500/20 space-y-4">
            <h4 className="text-2xl font-bold mb-4 text-blue-400 flex items-center"><Upload className="w-6 h-6 mr-2" /> Upload Internal E-Book / Resource</h4>

            <Input placeholder="Book Title" value={title} onChange={e => setTitle(e.target.value)} disabled={isLoading} />
            <Input placeholder="Author Name" value={author} onChange={e => setAuthor(e.target.value)} disabled={isLoading} />
            <Input placeholder="ISBN (Optional)" value={isbn} onChange={e => setIsbn(e.target.value)} disabled={isLoading} />

            <div className="grid grid-cols-2 gap-3">
                <Select value={degree} onChange={e => setDegree(e.target.value)} disabled={isLoading}>
                    <option value="" className="text-slate-900">Select Degree</option>
                    {(degrees || []).map(d => <option key={d} value={d} className="text-slate-900">{d}</option>)}
                </Select>
                <Select value={semester} onChange={e => setSemester(e.target.value)} disabled={isLoading}>
                    {Array.from({ length: 8 }, (_, i) => i + 1).map(s => <option key={s} value={s} className="text-slate-900">{s}</option>)}
                </Select>
            </div>

            <label className="block text-sm text-slate-300 font-medium pt-2">Select Book File (PDF, EPUB, DOCX):</label>
            <input
                id="bookFile"
                type="file"
                onChange={e => setFile(e.target.files[0])}
                className="w-full text-slate-300 bg-slate-800/50 rounded-lg p-3 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 transition duration-200"
                disabled={isLoading}
            />

            <button
                className={`${buttonClass} ${primaryButtonClass} w-full`}
                onClick={handleUpload}
                disabled={isLoading || !title || !author || !degree || !semester || !file}
            >
                {isLoading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                {isLoading ? 'Uploading Book...' : 'Upload Book'}
            </button>
        </div>
    );
}





function FacultyAttendance({ showMessage, buttonClass, catalogs }) {
    const [allocations, setAllocations] = useState([]);
    const [selectedAlloc, setSelectedAlloc] = useState(null);
    const [students, setStudents] = useState([]);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLocked, setIsLocked] = useState(false); // Locked if > 30 mins

    useEffect(() => {
        const fetchAlloc = async () => {
            try {
                const res = await auth().get("/faculty/allocations");
                setAllocations(res.data.allocations || []);
            } catch (e) { } // silent fail or log
        };
        fetchAlloc();
    }, []);

    const fetchStudents = useCallback(async () => {
        if (!selectedAlloc) return;
        setIsLoading(true);
        setIsLocked(false);
        try {
            const res = await auth().get("/faculty/students", {
                params: {
                    degree: selectedAlloc.degree, semester: selectedAlloc.semester, section: selectedAlloc.section,
                    subject: selectedAlloc.subject, date: date
                }
            });
            const data = res.data.students || [];
            // Map to include local 'status' state if needed, but we used api to return 'status'
            // We need to manage state for toggling.
            const mapped = data.map(s => ({
                ...s,
                currentStatus: s.status || "Present" // Default to Present if not marked
            }));
            setStudents(mapped);

            // Check Lock Logic
            // If any student has marked_at, check if (now - marked_at) > 30m
            // We can check the first one that has marked_at
            const marked = data.find(s => s.marked_at);
            if (marked) {
                const markedTime = new Date(marked.marked_at).getTime(); // UTC ISO string to local time (browser handles it, or use Z)
                // Backend sends isoformat (no Z usually unless pytz). utcnow() is native.
                // Assuming simplified check:
                // Let's rely on backend rejecting save? Or visual cue?
                // Visual cue:
                // The marked_at is from server (UTC presumably).
                // Let's assume server time sync.
                // Actually, logic: "Editable for 30 mins".
                const now = new Date().getTime();
                // Add 'Z' to marked_at if missing to ensure UTC parsing
                const timeStr = marked.marked_at.endsWith('Z') ? marked.marked_at : marked.marked_at + 'Z';
                const mTime = new Date(timeStr).getTime();
                if ((now - mTime) > 30 * 60 * 1000) {
                    setIsLocked(true);
                }
            }

        } catch (e) {
            showMessage("Failed to load class list.", 'error');
        } finally { setIsLoading(false); }
    }, [selectedAlloc, date, showMessage]);

    useEffect(() => { if (selectedAlloc) fetchStudents(); }, [fetchStudents]);

    const toggleStatus = (id) => {
        if (isLocked) return;
        setStudents(prev => prev.map(s => s.id === id ? { ...s, currentStatus: s.currentStatus === "Present" ? "Absent" : "Present" } : s));
    };

    const submitAttendance = async () => {
        if (isLocked) return showMessage("Attendance is locked (30 mins passed).", 'error');
        if (!selectedAlloc) return;
        setIsSubmitting(true);
        try {
            const payload = {
                degree: selectedAlloc.degree,
                semester: selectedAlloc.semester,
                section: selectedAlloc.section,
                subject: selectedAlloc.subject,
                date: date,
                data: students.map(s => ({ student_id: s.id, status: s.currentStatus }))
            };
            await auth().post("/faculty/attendance", payload);
            showMessage("Attendance saved successfully!", 'success');
            fetchStudents(); // Refresh lock status etc
        } catch (e) {
            showMessage(e.response?.data?.message || "Failed to save.", 'error');
        } finally { setIsSubmitting(false); }
    };

    return (
        <div className="space-y-6">
            <h4 className="text-2xl font-bold text-emerald-400 flex items-center"><ClipboardList className="w-6 h-6 mr-2" /> Attendance Register</h4>

            {/* Controls */}
            <div className="bg-slate-900/60 backdrop-blur-xl p-4 rounded-xl shadow-lg border border-emerald-500/20 grid grid-cols-1 md:grid-cols-3 gap-4 mx-auto">
                <div>
                    <label className="text-xs text-slate-400 font-bold uppercase">Select Class</label>
                    <Select value={selectedAlloc ? selectedAlloc.id : ""} onChange={e => {
                        const a = allocations.find(x => x.id === parseInt(e.target.value));
                        setSelectedAlloc(a || null);
                    }} disabled={!allocations.length}>
                        <option value="">-- Choose Class --</option>
                        {allocations.map(a => <option key={a.id} value={a.id}>{a.subject} ({a.degree} {a.semester} {a.section})</option>)}
                    </Select>
                    {!allocations.length && <div className="text-xs text-red-500 mt-1">No classes allocated. Contact Admin.</div>}
                </div>
                <div>
                    <label className="text-xs text-slate-400 font-bold uppercase">Date</label>
                    <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="text-slate-300" />
                </div>
                <div className="flex items-end">
                    <button className={`${buttonClass} bg-emerald-600 hover:bg-emerald-700 w-full disabled:opacity-50 disabled:cursor-not-allowed`} onClick={submitAttendance} disabled={!selectedAlloc || isLoading || isSubmitting || isLocked}>
                        {isSubmitting ? "Saving..." : isLocked ? "Locked (Time limit)" : "Mark Attendance"}
                    </button>
                </div>
            </div>

            {/* Student List */}
            {isLoading ? <div className="text-center p-10"><Loader2 className="animate-spin w-8 h-8 mx-auto text-emerald-500" /></div> : !selectedAlloc ? <div className="text-center text-slate-500 mt-10">Select a class to load students.</div> : students.length === 0 ? <div className="text-center text-slate-500">No students found in this class.</div> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {students.map(s => (
                        <div key={s.id} onClick={() => toggleStatus(s.id)} className={`cursor-pointer p-4 rounded-xl border transition-all duration-200 flex justify-between items-center ${s.currentStatus === 'Present' ? 'bg-emerald-900/20 border-emerald-500/30 hover:bg-emerald-900/40' : 'bg-red-900/20 border-red-500/30 hover:bg-red-900/40'} ${isLocked ? 'opacity-70 pointer-events-none' : ''}`}>
                            <div>
                                <div className={`font-bold ${s.currentStatus === 'Present' ? 'text-emerald-300' : 'text-red-300'}`}>{s.name}</div>
                                <div className="text-xs text-slate-400">{s.srn}</div>
                            </div>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${s.currentStatus === 'Present' ? 'bg-emerald-500 text-black' : 'bg-red-500 text-white'}`}>
                                {s.currentStatus === 'Present' ? <Check className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// --- MODIFIED ADMIN MODULE: Hostel Management (SRN Change) ---
function AdminHostelManagement({ showMessage, buttonClass, primaryButtonClass, catalogs }) {
    const { degrees, sections, fetchBasics } = catalogs;

    // States for Hostel/Room CRUD
    const [hostels, setHostels] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [isHostelLoading, setIsHostelLoading] = useState(false);

    const [newHostelName, setNewHostelName] = useState('');
    const [newHostelAddress, setNewHostelAddress] = useState('');

    const [newRoomHostelId, setNewRoomHostelId] = useState('');
    const [newRoomNumber, setNewRoomNumber] = useState('');
    const [newRoomCapacity, setNewRoomCapacity] = useState(1);

    // MODIFIED: Renamed state variable from studentToAssign to srnToAssign
    const [srnToAssign, setSrnToAssign] = useState('');
    const [roomToAssign, setRoomToAssign] = useState('');

    // States for Global View
    const [globalHostelData, setGlobalHostelData] = useState([]);

    const fetchHostelData = useCallback(async () => {
        setIsHostelLoading(true);
        try {
            const [hostelRes, roomRes, globalRes] = await Promise.all([
                auth().get("/admin/hostel/hostels"),
                auth().get("/admin/hostel/rooms"),
                auth().get("/admin/hostel/hostels") // Same endpoint used for global view/list
            ]);
            setHostels(hostelRes.data.hostels || []);
            setRooms(roomRes.data.rooms || []);
            setGlobalHostelData(globalRes.data.hostels || []);

            // Initialize dropdowns
            if (hostelRes.data.hostels.length > 0) {
                setNewRoomHostelId(hostelRes.data.hostels[0].id);
            }
            if (roomRes.data.rooms.length > 0) {
                setRoomToAssign(roomRes.data.rooms[0].id);
            } else {
                setNewRoomHostelId('');
                setRoomToAssign('');
            }

        } catch (e) {
            if (e.response && e.response.status !== 401) {
                showMessage(e.response?.data?.message || "Failed to fetch hostel data.", 'error');
            }
            setHostels([]); setRooms([]); setGlobalHostelData([]);
        } finally {
            setIsHostelLoading(false);
        }
    }, [showMessage]);

    useEffect(() => {
        fetchHostelData();
    }, [fetchHostelData]);


    // --- Handlers ---
    const handleAddHostel = async () => {
        if (!newHostelName.trim()) return showMessage("Hostel Name is required.", 'error');
        try {
            await auth().post("/admin/hostel/hostels", { name: newHostelName, address: newHostelAddress });
            showMessage(`Hostel **${newHostelName}** added!`, 'success');
            setNewHostelName('');
            setNewHostelAddress('');
            fetchHostelData();
        } catch (e) {
            showMessage(e.response?.data?.message || "Failed to add hostel.", 'error');
        }
    };

    const handleAddRoom = async () => {
        if (!newRoomHostelId || !newRoomNumber.trim() || newRoomCapacity < 1) return showMessage("All room fields are required and capacity must be > 0.", 'error');
        try {
            await auth().post("/admin/hostel/rooms", {
                hostel_id: newRoomHostelId,
                room_number: newRoomNumber,
                capacity: parseInt(newRoomCapacity)
            });
            showMessage(`Room **${newRoomNumber}** added!`, 'success');
            setNewRoomNumber('');
            setNewRoomCapacity(1);
            fetchHostelData();
        } catch (e) {
            showMessage(e.response?.data?.message || "Failed to add room.", 'error');
        }
    };

    // MODIFIED: Function updated to use 'srn' state variable and pass 'srn' in payload
    const handleAssignRoom = async () => {
        if (!srnToAssign.trim() || !roomToAssign) return showMessage("Student SRN and Room must be selected.", 'error');
        try {
            await auth().post("/admin/hostel/assign-room", {
                srn: srnToAssign, // <<-- KEY CHANGED TO SRN
                room_id: roomToAssign
            });
            showMessage(`Room assigned successfully to SRN ${srnToAssign}!`, 'success'); // Updated message
            setSrnToAssign('');
            fetchHostelData();
        } catch (e) {
            showMessage(e.response?.data?.message || "Failed to assign room.", 'error');
        }
    };

    const renderGlobalHostelView = () => (
        <div className="space-y-4">
            <h5 className="text-xl font-bold text-blue-400">Hostel Overview (One Go)</h5>
            {isHostelLoading ? <div className="text-center p-4"><Loader2 className="animate-spin w-5 h-5 mx-auto text-blue-500" /></div> : globalHostelData.length === 0 ? <div className="text-slate-500">No hostels defined.</div> : (
                <div className="overflow-x-auto rounded-xl border border-white/10">
                    <table className="min-w-full divide-y divide-white/10 shadow-md bg-slate-900/60 backdrop-blur-xl">
                        <thead className="bg-slate-800/80">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Hostel</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Rooms</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Capacity</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Occupancy</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Vacant Beds</th>
                            </tr>
                        </thead>
                        <tbody className="bg-slate-900/40 divide-y divide-white/10">
                            {globalHostelData.map(h => (
                                <tr key={h.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-200">{h.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{h.total_rooms}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{h.total_capacity}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{h.current_occupancy}</td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${h.vacant_beds > 0 ? 'text-green-400' : 'text-red-400'}`}>{h.vacant_beds}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-6">
            <h4 className="text-2xl font-bold text-blue-400 flex items-center"><Home className="w-6 h-6 mr-2" /> Hostel Management</h4>

            {renderGlobalHostelView()}

            <div className="grid lg:grid-cols-3 gap-6 pt-4 border-t border-white/10">

                {/* Add Hostel */}
                <div className="bg-slate-900/60 backdrop-blur-xl p-5 rounded-xl shadow-lg border border-yellow-500/20 space-y-3">
                    <h5 className="text-xl font-bold text-yellow-400">Add New Hostel</h5>
                    <Input placeholder="Hostel Name" value={newHostelName} onChange={e => setNewHostelName(e.target.value)} />
                    <Input placeholder="Address (Optional)" value={newHostelAddress} onChange={e => setNewHostelAddress(e.target.value)} />
                    <button className={`${buttonClass} ${primaryButtonClass}`} onClick={handleAddHostel}>Create Hostel</button>
                </div>

                {/* Add Room */}
                <div className="bg-slate-900/60 backdrop-blur-xl p-5 rounded-xl shadow-lg border border-yellow-500/20 space-y-3">
                    <h5 className="text-xl font-bold text-yellow-400">Add Room to Hostel</h5>
                    <Select value={newRoomHostelId} onChange={e => setNewRoomHostelId(parseInt(e.target.value) || '')} disabled={!hostels.length}>
                        <option value="" className="text-slate-900">Select Hostel</option>
                        {(hostels || []).map(h => <option key={h.id} value={h.id} className="text-slate-900">{h.name}</option>)}
                    </Select>
                    <Input placeholder="Room Number (e.g., 101A)" value={newRoomNumber} onChange={e => setNewRoomNumber(e.target.value)} />
                    <Input type="number" placeholder="Capacity (e.g., 2)" value={newRoomCapacity} onChange={e => setNewRoomCapacity(parseInt(e.target.value) || 1)} min="1" />
                    <button className={`${buttonClass} ${primaryButtonClass}`} onClick={handleAddRoom} disabled={!newRoomHostelId || !newRoomNumber}>Add Room</button>
                </div>

                {/* Assign Room */}
                <div className="bg-slate-900/60 backdrop-blur-xl p-5 rounded-xl shadow-lg border border-yellow-500/20 space-y-3">
                    <h5 className="text-xl font-bold text-yellow-400">Assign Room to Student</h5>
                    <Input placeholder="Student SRN (e.g., SRN001)" value={srnToAssign} onChange={e => setSrnToAssign(e.target.value)} /> {/* MODIFIED: Input changed to SRN */}
                    <Select value={roomToAssign} onChange={e => setRoomToAssign(parseInt(e.target.value) || '')} disabled={!rooms.length}>
                        <option value="" className="text-slate-900">Select Room (Hostel - Room # - Occupancy)</option>
                        {(rooms || []).map(r => (
                            <option key={r.id} value={r.id} disabled={r.occupancy >= r.capacity} className="text-slate-900">
                                {r.hostel_name} - {r.room_number} ({r.occupancy}/{r.capacity})
                            </option>
                        ))}
                    </Select>
                    <button className={`${buttonClass} ${primaryButtonClass}`} onClick={handleAssignRoom} disabled={!srnToAssign || !roomToAssign}>Assign Room</button>
                    <p className="text-xs text-red-400">Note: Must use Student **SRN**.</p> {/* MODIFIED: Note changed */}
                </div>
            </div>
        </div>
    );
}

// --- NEW ADMIN MODULE: Student List Filter ---
function AdminStudentList({ showMessage, catalogs, buttonClass, primaryButtonClass }) {
    const { degrees, loaded, fetchSections } = catalogs; // destructure fetchSections
    const [students, setStudents] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const [filterDegree, setFilterDegree] = useState('');
    const [filterSemester, setFilterSemester] = useState('');
    const [filterSection, setFilterSection] = useState('');

    // Edit Modal State
    const [editStudent, setEditStudent] = useState(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [generatedPass, setGeneratedPass] = useState(null);

    useEffect(() => {
        if (loaded && degrees.length && !filterDegree) setFilterDegree(degrees[0]);
        // FIXED: Do NOT default section to sections[0]. Let it be "" (All Sections).
    }, [loaded, degrees, filterDegree]);

    // NEW: Fetch sections for filter dropdown when Degree/Sem changes
    const [availableFilterSections, setAvailableFilterSections] = useState([]);
    useEffect(() => {
        if (filterDegree && filterSemester) {
            fetchSections(filterDegree, filterSemester).then(setAvailableFilterSections);
        } else {
            setAvailableFilterSections([]);
        }
    }, [filterDegree, filterSemester, fetchSections]);

    // NEW: Fetch sections for Edit Modal
    const [editSections, setEditSections] = useState([]);
    useEffect(() => {
        if (editStudent?.degree && editStudent?.semester) {
            fetchSections(editStudent.degree, editStudent.semester).then(setEditSections);
        } else {
            setEditSections([]);
        }
    }, [editStudent?.degree, editStudent?.semester, fetchSections]);

    const fetchStudents = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await auth().get("/admin/students", {
                params: {
                    degree: filterDegree,
                    semester: filterSemester,
                    section: filterSection
                }
            });
            setStudents(res.data.students || []);
        } catch (e) {
            if (e.response && e.response.status !== 401) {
                showMessage(e.response?.data?.message || "Failed to fetch student list.", 'error');
            }
            setStudents([]);
        } finally {
            setIsLoading(false);
        }
    }, [filterDegree, filterSemester, filterSection, showMessage]);

    // Handle Update Student (for Modal)
    const handleUpdateStudent = async () => {
        if (!editStudent) return;
        setIsUpdating(true);
        try {
            await auth().post("/admin/update-student", {
                student_id: editStudent.id,
                name: editStudent.name,
                srn: editStudent.srn,
                degree: editStudent.degree,
                semester: editStudent.semester,
                section: editStudent.section,
                parent_email: editStudent.parent_email
            });
            showMessage("Student details updated.", "success");
            setEditStudent(null);
            fetchStudents(); // Refresh list to show changes
        } catch (e) {
            showMessage(e.response?.data?.message || "Update failed", "error");
        } finally {
            setIsUpdating(false);
        }
    };

    // Handle Generate Parent Password
    const handleGenerateParentPass = async () => {
        if (!editStudent?.id) return;
        setIsUpdating(true);
        try {
            const res = await auth().post("/admin/generate-parent-password", { student_id: editStudent.id });
            setGeneratedPass(res.data.password);
            showMessage(res.data.message, "success");
        } catch (e) {
            showMessage(e.response?.data?.message || "Generation failed", "error");
        } finally {
            setIsUpdating(false);
        }
    };


    return (
        <div className="space-y-6">
            <h4 className="text-2xl font-bold text-yellow-400 flex items-center"><GraduationCap className="w-6 h-6 mr-2" /> Student Directory</h4>

            {/* Filters */}
            <div className="bg-slate-900/40 border border-white/10 p-4 rounded-xl shadow-inner grid grid-cols-4 gap-3 items-end">
                <Select value={filterDegree} onChange={e => setFilterDegree(e.target.value)} disabled={!degrees.length}>
                    <option value="" className="text-slate-900">All Degrees</option>
                    {(degrees || []).map(d => <option key={d} value={d} className="text-slate-900">{d}</option>)}
                </Select>
                <Select value={filterSemester} onChange={e => setFilterSemester(e.target.value)}>
                    <option value="" className="text-slate-900">All Sems</option>
                    {Array.from({ length: 8 }, (_, i) => i + 1).map(s => <option key={s} value={s} className="text-slate-900">{s}</option>)}
                </Select>
                <Select value={filterSection} onChange={e => setFilterSection(e.target.value)} disabled={!availableFilterSections.length}>
                    <option value="" className="text-slate-900">All Sections</option>
                    {(availableFilterSections || []).map(s => <option key={s} value={s} className="text-slate-900">{s}</option>)}
                </Select>
                <button
                    onClick={fetchStudents}
                    className={`${buttonClass} ${primaryButtonClass} bg-yellow-600 hover:bg-yellow-700`}
                    disabled={isLoading || (!filterDegree && !filterSemester && !filterSection)}
                >
                    {isLoading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Search className="w-5 h-5 mr-2" />}
                    Search
                </button>
            </div>

            {/* Results Table */}
            {isLoading ? <div className="text-center p-10"><Loader2 className="animate-spin w-8 h-8 mx-auto text-yellow-500" /></div> : students.length === 0 ? <div className="p-4 text-slate-500 text-center bg-slate-900/60 rounded-xl shadow-md border border-white/10">No students found matching filters.</div> : (
                <div className="overflow-x-auto rounded-xl border border-white/10">
                    <div className="bg-slate-800/80 px-6 py-2 border-b border-white/10 text-xs font-bold text-yellow-500 uppercase tracking-widest text-right">
                        Total Students: {students.length}
                    </div>
                    <table className="min-w-full divide-y divide-white/10 shadow-md bg-slate-900/60 backdrop-blur-xl">
                        <thead className="bg-slate-800/80">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">SRN / Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Academics</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Hostel</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-slate-900/40 divide-y divide-white/10">
                            {students.map(s => (
                                <tr key={s.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-slate-200">{s.name}</div>
                                        <div className="text-xs text-slate-500">{s.srn}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-slate-300">{s.degree} Sem {s.semester}</div>
                                        <div className="text-xs text-slate-500">Section {s.section}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                                        {s.hostel_info || <span className="text-xs text-red-400">Not Assigned</span>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${s.status === 'APPROVED' ? 'bg-green-900/40 text-green-300' : 'bg-red-900/40 text-red-300'}`}>
                                            {s.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                        <button onClick={() => { setEditStudent(s); setGeneratedPass(null); }} className="text-yellow-400 hover:text-yellow-300 p-2 hover:bg-yellow-500/10 rounded-full transition-colors">
                                            <Edit className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* EDIT STUDENT MODAL */}
            {editStudent && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-white/10 p-6 rounded-xl w-full max-w-lg shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-2">
                            <h5 className="text-xl font-bold text-yellow-400">Edit Student Details</h5>
                            <button onClick={() => setEditStudent(null)} className="text-slate-500 hover:text-white"><XCircle className="w-6 h-6" /></button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400">Full Name</label>
                                <Input value={editStudent.name} onChange={e => setEditStudent({ ...editStudent, name: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400">SRN</label>
                                <Input value={editStudent.srn} onChange={e => setEditStudent({ ...editStudent, srn: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400">Degree</label>
                                <Select value={editStudent.degree} onChange={e => setEditStudent({ ...editStudent, degree: e.target.value })}>
                                    {(degrees || []).map(d => <option key={d} value={d} className="text-slate-900">{d}</option>)}
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400">Semester</label>
                                <Select value={editStudent.semester} onChange={e => setEditStudent({ ...editStudent, semester: e.target.value })}>
                                    {Array.from({ length: 8 }, (_, i) => i + 1).map(s => <option key={s} value={s} className="text-slate-900">{s}</option>)}
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400">Section</label>
                                <Select value={editStudent.section} onChange={e => setEditStudent({ ...editStudent, section: e.target.value })}>
                                    {(editSections || []).map(s => <option key={s} value={s} className="text-slate-900">{s}</option>)}
                                </Select>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/5 space-y-2">
                            <h6 className="text-sm font-bold text-slate-300">Parent Portal (Read Only Access)</h6>
                            <div className="space-y-2">
                                <label className="text-xs text-slate-400">Parent Email (Required for Login)</label>
                                <div className="flex gap-2">
                                    <Input
                                        type="email"
                                        placeholder="parent@example.com"
                                        value={editStudent.parent_email || ''}
                                        onChange={e => setEditStudent({ ...editStudent, parent_email: e.target.value })}
                                    />
                                </div>

                                <button
                                    className={`${buttonClass} w-full border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10`}
                                    onClick={handleGenerateParentPass}
                                    disabled={!editStudent.parent_email || isUpdating}
                                >
                                    {isUpdating ? <Loader2 className="animate-spin w-4 h-4 mr-2 inline" /> : <Lock className="w-4 h-4 mr-2 inline" />}
                                    Generate & Email Password
                                </button>
                                {generatedPass && (
                                    <div className="p-3 bg-green-900/20 border border-green-500/30 rounded-lg text-green-300 text-sm break-all">
                                        <strong>Generated Password:</strong> {generatedPass} <br />
                                        <span className="text-xs opacity-70">(Sent to {editStudent.parent_email})</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-white/5">
                            <button className={`${buttonClass} bg-slate-700 text-white flex-1 hover:bg-slate-600`} onClick={() => setEditStudent(null)}>Cancel</button>
                            <button className={`${buttonClass} ${primaryButtonClass} bg-green-600 flex-1`} onClick={handleUpdateStudent} disabled={isUpdating}>
                                {isUpdating ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Save className="w-5 h-5 mr-2" />} Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


function AdminFacultyOnboarding({ showMessage, buttonClass, primaryButtonClass }) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [empId, setEmpId] = useState(""); // <-- NEW EMP ID FIELD
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async () => {
        if (!name || !email || !password || !empId) {
            return showMessage("Full Name, Email, Password, and Employee ID are required.", 'error');
        }

        setIsLoading(true);
        try {
            const payload = {
                name, email, password,
                emp_id: empId, // <-- Send the new EMP ID field
            };
            // Using auth()
            const res = await auth().post("/admin/add-faculty", payload);
            showMessage(res.data.message, 'success');
            setName('');
            setEmail('');
            setPassword('');
            setEmpId('');
        } catch (e) {
            if (e.response && e.response.status !== 401) {
                showMessage(e.response?.data?.message || "Failed to add faculty account.", 'error');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-xl shadow-lg border border-yellow-500/20 space-y-4">
            <h4 className="text-2xl font-bold mb-4 text-yellow-400 flex items-center"><UserPlus className="w-6 h-6 mr-2" /> Onboard New Faculty Member</h4>

            <Input placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} disabled={isLoading} />
            <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} disabled={isLoading} />
            <Input type="password" placeholder="Temporary Password" value={password} onChange={e => setPassword(e.target.value)} disabled={isLoading} />

            <Input placeholder="Employee ID (e.g., FCLT001)" value={empId} onChange={e => setEmpId(e.target.value)} disabled={isLoading} />

            <button
                className={`${buttonClass} ${primaryButtonClass} w-full`}
                onClick={handleSubmit}
                disabled={isLoading || !name || !email || !password || !empId}
            >
                {isLoading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                {isLoading ? 'Processing...' : 'Create Professor Account'}
            </button>
        </div>
    );
}

function AdminFeeManagement({ showMessage, buttonClass, primaryButtonClass, catalogs }) {
    const { degrees, loaded } = catalogs;
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState(''); // Amount in Rupees
    const [category, setCategory] = useState('tuition');
    const [dueDate, setDueDate] = useState('');
    const [targetType, setTargetType] = useState('batch'); // batch, sem, custom, single

    // Dynamic targeting fields
    const [targetDegree, setTargetDegree] = useState(degrees[0] || '');
    const [targetSemester, setTargetSemester] = useState('1');
    const [targetSections, setTargetSections] = useState(''); // Comma separated, e.g., "A,B"
    const [customSrns, setCustomSrns] = useState(''); // Comma separated, e.g., "SRN001,SRN005"
    const [singleSrn, setSingleSrn] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (loaded && Array.isArray(degrees) && degrees.length > 0) {
            if (!targetDegree) setTargetDegree(degrees[0]);
        }
    }, [loaded, degrees, targetDegree]);

    const handleSubmit = async () => {
        if (!title || !amount || parseFloat(amount) <= 0 || !targetType) {
            return showMessage("Title and a valid Amount are required.", 'error');
        }

        const amountCents = Math.round(parseFloat(amount) * 100);

        let payload = {
            title, description, amount_cents: amountCents, category,
            due_date: dueDate || undefined, target: targetType,
        };

        if (targetType === 'sem') {
            if (!targetDegree || !targetSemester) return showMessage("Degree and Semester are required for sem targeting.", 'error');
            payload.degree = targetDegree;
            payload.semester = parseInt(targetSemester);
        } else if (targetType === 'custom') {
            const srnList = customSrns.split(',').map(s => s.trim()).filter(s => s);
            if (srnList.length === 0) return showMessage("Enter at least one SRN for custom targeting.", 'error');
            payload.srns = srnList;
        } else if (targetType === 'single') {
            if (!singleSrn.trim()) return showMessage("Enter a single SRN for targeted fee.", 'error');
            payload.single_srn = singleSrn.trim();
        }

        if (targetSections && (targetType === 'batch' || targetType === 'sem')) {
            payload.sections = targetSections;
        }

        setIsLoading(true);
        try {
            // Using auth()
            const res = await auth().post("/admin/fees/create", payload);
            showMessage(`Fee Notification created. Targets created: **${res.data.targets_created}**`, 'success');
            setTitle(''); setDescription(''); setAmount(''); setDueDate('');
            setTargetSections(''); setCustomSrns(''); setSingleSrn('');
        } catch (e) {
            if (e.response && e.response.status !== 401) {
                showMessage(e.response?.data?.message || "Fee creation failed. Check input data or backend logs.", 'error');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const isSemesterTarget = targetType === 'sem';
    const isCustomTarget = targetType === 'custom';
    const isSingleTarget = targetType === 'single';
    const isBroadTarget = targetType === 'batch' || targetType === 'sem';


    return (
        <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-xl shadow-lg border border-yellow-500/20 space-y-4">
            <h4 className="text-2xl font-bold mb-4 text-yellow-400 flex items-center"><IndianRupee className="w-6 h-6 mr-2" /> Create New Fee Notification</h4>

            <Input placeholder="Fee Title (e.g., Tuition Fee Sem 4)" value={title} onChange={e => setTitle(e.target.value)} disabled={isLoading} />
            <Input
                type="number"
                placeholder="Amount in Rupees (e.g., 5000.00)"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                disabled={isLoading}
            />

            <div className="grid grid-cols-2 gap-3">
                <Select value={category} onChange={e => setCategory(e.target.value)} disabled={isLoading}>
                    <option value="tuition" className="text-slate-900">Tuition Fee</option>
                    <option value="hostel" className="text-slate-900">Hostel Fee</option>
                    <option value="transport" className="text-slate-900">Transport Fee</option>
                    <option value="exam" className="text-slate-900">Exam Fee</option>
                    <option value="misc" className="text-slate-900">Miscellaneous</option>
                </Select>
                <Input type="date" placeholder="Due Date (Optional)" value={dueDate} onChange={e => setDueDate(e.target.value)} disabled={isLoading} className="text-slate-300" />
            </div>

            <h5 className="text-lg font-bold text-slate-300 pt-4 border-t border-white/10">Target Students:</h5>

            <Select value={targetType} onChange={e => setTargetType(e.target.value)} disabled={isLoading}>
                <option value="batch" className="text-slate-900">Whole Student Body (All Degrees/Sems)</option>
                <option value="sem" className="text-slate-900">Specific Degree & Semester</option>
                <option value="custom" className="text-slate-900">Custom List of SRNs (Bulk)</option>
                <option value="single" className="text-slate-900">Single SRN</option>
            </Select>

            {isSemesterTarget && (
                <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-300">
                    {loaded && Array.isArray(degrees) && degrees.length > 0 ? (
                        <>
                            <Select value={targetDegree} onChange={e => setTargetDegree(e.target.value)} disabled={isLoading}>
                                {degrees.map(d => <option key={d} value={d} className="text-slate-900">{d}</option>)}
                            </Select>
                            <Select value={targetSemester} onChange={e => setTargetSemester(e.target.value)} disabled={isLoading}>
                                {Array.from({ length: 8 }, (_, i) => i + 1).map(s => <option key={s} value={s} className="text-slate-900">{s}</option>)}
                            </Select>
                        </>
                    ) : <div className="col-span-2 text-center text-sm text-slate-500">Loading degree list...</div>}
                </div>
            )}

            {(isBroadTarget) && (
                <Input
                    placeholder="Sections (Optional, Comma-separated: A, B, C)"
                    value={targetSections}
                    onChange={e => setTargetSections(e.target.value)}
                    disabled={isLoading}
                    className="animate-in fade-in duration-300"
                />
            )}

            {isCustomTarget && (
                <textarea
                    className="w-full bg-slate-800/50 backdrop-blur-xl text-white border border-white/10 rounded-xl py-3 px-4 h-24 placeholder-slate-500 focus:ring-2 focus:ring-yellow-500/50 outline-none"
                    placeholder="Enter SRNs separated by commas (e.g., SRN001, SRN005, SRN010)"
                    value={customSrns}
                    onChange={e => setCustomSrns(e.target.value)}
                    disabled={isLoading}
                />
            )}

            {isSingleTarget && (
                <Input
                    placeholder="Enter Single SRN"
                    value={singleSrn}
                    onChange={e => setSingleSrn(e.target.value)}
                    disabled={isLoading}
                />
            )}

            <button
                className={`${buttonClass} ${primaryButtonClass} w-full mt-4`}
                onClick={handleSubmit}
                disabled={isLoading}
            >
                {isLoading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                {isLoading ? 'Creating Notification...' : 'Create Fee Notification'}
            </button>
        </div>
    );
}

// --- ADMIN MODULE: Hostel Complaints (MODIFIED) ---
function AdminHostelComplaints({ showMessage, buttonClass, primaryButtonClass }) {
    const [complaints, setComplaints] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    // New state for status update
    const [statusUpdate, setStatusUpdate] = useState({ id: null, status: 'Open', note: '' });

    const fetchComplaints = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await auth().get("/admin/hostel/complaints");
            setComplaints(res.data.complaints || []);
        } catch (e) {
            if (e.response && e.response.status !== 401) {
                showMessage("Failed to fetch hostel complaints.", 'error');
            }
            setComplaints([]);
        } finally {
            setIsLoading(false);
        }
    }, [showMessage]);

    // NEW: Function to handle status change
    const updateComplaintStatus = async () => {
        if (!statusUpdate.id || !statusUpdate.status) return;

        setIsLoading(true); // Disable interface during update
        try {
            const res = await auth().patch(`/admin/hostel/complaints/${statusUpdate.id}/status`, {
                status: statusUpdate.status,
                note: statusUpdate.note
            });
            showMessage(`Complaint status updated to **${res.data.new_status}**`, 'success');
            setStatusUpdate({ id: null, status: 'Open', note: '' }); // Close modal/form
            fetchComplaints(); // Refresh data to show new status/audit trail
        } catch (e) {
            showMessage(e.response?.data?.message || "Failed to update status.", 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchComplaints(); }, [fetchComplaints]);

    const VALID_STATUSES = ["Open", "Under Review", "Under Progress", "Resolved", "Closed"];

    if (isLoading && statusUpdate.id === null) {
        return <div className="text-center p-10"><Loader2 className="animate-spin w-8 h-8 mx-auto text-yellow-500" /></div>;
    }

    return (
        <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-xl shadow-lg border border-red-500/20">
            <div className="flex justify-between items-center mb-4">
                <h4 className="text-2xl font-bold text-red-400 flex items-center"><Home className="w-6 h-6 mr-2" /> Active Hostel Complaints</h4>
                <button onClick={fetchComplaints} className="p-2 bg-slate-700 rounded-full hover:bg-slate-600 transition" disabled={isLoading}><RefreshCw className="w-5 h-5 text-slate-300" /></button>
            </div>

            {/* Status Update Modal/Form (Render if statusUpdate.id is set) */}
            {statusUpdate.id && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-white/10 p-6 rounded-xl w-full max-w-md shadow-2xl space-y-4">
                        <h5 className="text-xl font-bold text-red-400">Update Complaint Status</h5>
                        <Select value={statusUpdate.status} onChange={e => setStatusUpdate(prev => ({ ...prev, status: e.target.value }))}>
                            {VALID_STATUSES.map(s => <option key={s} value={s} className="text-slate-900">{s}</option>)}
                        </Select>
                        <textarea
                            className="w-full bg-slate-800/50 backdrop-blur-xl text-white placeholder-slate-500 border border-white/10 rounded-xl py-3 px-4 h-20 focus:ring-2 focus:ring-red-500/50 outline-none"
                            placeholder="Internal Note (Optional)"
                            value={statusUpdate.note}
                            onChange={e => setStatusUpdate(prev => ({ ...prev, note: e.target.value }))}
                        />
                        <div className="flex gap-3">
                            <button className={`${buttonClass} bg-slate-700 text-white flex-1 hover:bg-slate-600`} onClick={() => setStatusUpdate({ id: null, status: 'Open', note: '' })}>Cancel</button>
                            <button className={`${buttonClass} ${primaryButtonClass} bg-green-600 flex-1`} onClick={updateComplaintStatus} disabled={isLoading}>
                                {isLoading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Save className="w-5 h-5 mr-2" />} Save Status
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Complaints List */}
            {complaints.length === 0 && !isLoading && <div className="text-slate-500 text-center py-4">No complaints recorded.</div>}

            <div className="space-y-4">
                {complaints.map(c => (
                    <div key={c.id} className={`p-4 rounded-xl shadow-md ${c.status === 'Closed' ? 'bg-slate-800/50 border-l-4 border-slate-500' : 'bg-slate-800 border-l-4 border-red-500'}`}>
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <div className="font-bold text-lg text-red-400">{c.title}</div>
                                <div className="text-sm text-slate-300 mt-1">{c.description}</div>
                                <div className="text-xs text-slate-500 mt-1">
                                    From: <strong className="text-slate-400">{c.hostel_name} (Room {c.room_number})</strong> | Student: <strong className="text-slate-400">{c.student_name}</strong>
                                </div>
                            </div>
                            <div className={`text-xs px-2 py-1 rounded-full flex-shrink-0 font-semibold ${c.status.includes('Progress') ? 'bg-orange-900/40 text-orange-300' : c.status === 'Open' ? 'bg-red-900/40 text-red-300' : 'bg-green-900/40 text-green-300'}`}>
                                {c.status}
                            </div>
                        </div>

                        {/* Audit Trail/Status Bar */}
                        <div className="mt-3 pt-2 border-t border-white/10">
                            <div className="text-xs text-slate-500 font-semibold mb-1">Audit Trail:</div>
                            <div className="flex items-center space-x-2 text-xs overflow-x-auto pb-1">
                                {c.audit_trail && c.audit_trail.map((step, index) => (
                                    <div key={index} className="flex-shrink-0">
                                        <span className={`px-2 py-0.5 rounded-full ${step.status.includes('Progress') ? 'bg-orange-900/40 text-orange-300' : step.status === 'Open' ? 'bg-red-900/40 text-red-300' : 'bg-green-900/40 text-green-300'}`}>
                                            {step.status}
                                        </span>
                                        {index < c.audit_trail.length - 1 && <span className="text-slate-600 ml-2">&gt;</span>}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end items-center mt-3 pt-2 border-t border-white/10">
                            <div className="flex space-x-2">
                                {c.file_url && <a href={c.file_url} className={`py-1 px-3 text-xs font-semibold rounded-full inline-flex items-center bg-red-600 hover:bg-red-700 text-white`} target="_blank" rel="noopener noreferrer">Attachment</a>}
                                <button
                                    className={`${buttonClass} bg-yellow-600 hover:bg-yellow-700 text-white text-xs py-1.5 w-32`}
                                    onClick={() => setStatusUpdate({ id: c.id, status: c.status, note: '' })}
                                >
                                    <RefreshCw className="w-4 h-4 mr-1" /> Update Status
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}



function AdminFacultyManagement({ showMessage, catalogs, buttonClass, primaryButtonClass }) {
    const { degrees, loaded, fetchBasics, subjects, fetchSubjects, fetchSections } = catalogs; // Added fetchSections, Removed sections (global)
    const [faculty, setFaculty] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // Allocation Modal State
    const [selectedFaculty, setSelectedFaculty] = useState(null);
    const [allocDegree, setAllocDegree] = useState("");
    const [allocSemester, setAllocSemester] = useState("1");
    const [allocSection, setAllocSection] = useState("");
    const [allocSubject, setAllocSubject] = useState("");
    const [allocFacultySearch, setAllocFacultySearch] = useState("");
    const [isAllocating, setIsAllocating] = useState(false);

    // Filters
    const [filterDegree, setFilterDegree] = useState("");
    const [filterSemester, setFilterSemester] = useState("");
    const [filterSection, setFilterSection] = useState("");
    const [availableFilterSections, setAvailableFilterSections] = useState([]);

    // Update filter sections
    useEffect(() => {
        if (filterDegree && filterSemester) {
            fetchSections(filterDegree, filterSemester).then(setAvailableFilterSections);
        } else {
            setAvailableFilterSections([]);
        }
    }, [filterDegree, filterSemester, fetchSections]);

    // Fetch subjects & sections when degree/sem changes
    const [availableSections, setAvailableSections] = useState([]);
    useEffect(() => {
        if (allocDegree && allocSemester) {
            fetchSubjects(allocDegree, allocSemester);
            fetchSections(allocDegree, allocSemester).then(setAvailableSections);
        } else {
            setAvailableSections([]);
        }
    }, [allocDegree, allocSemester, fetchSubjects, fetchSections]);

    // Fetch Faculty List
    const fetchFaculty = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await auth().get("/admin/faculty");
            setFaculty(res.data.faculty || []);
        } catch (e) {
            if (e.response && e.response.status !== 401) {
                showMessage(e.response?.data?.message || "Failed to fetch faculty list.", 'error');
            }
        } finally { setIsLoading(false); }
    }, [showMessage]);

    // FIX: Removed fetchBasics call from here to avoid loops. Parent should handle basics.
    useEffect(() => { fetchFaculty(); }, [fetchFaculty]);

    // Initialize dropdowns
    useEffect(() => {
        if (loaded && degrees.length && !allocDegree) setAllocDegree(degrees[0]);
        // Do not force section default
    }, [loaded, degrees, allocDegree]);

    // Filter Logic
    const filtersActive = filterDegree || filterSemester || filterSection;

    // Custom Dropdown State
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [dropdownRef]);

    const filteredFaculty = faculty.filter(f => {
        if (!filtersActive) return false; // Hide if no filters

        // Match if ANY allocation matches the filter criteria
        const hasMatch = f.allocations.some(a => {
            const matchDeg = filterDegree ? a.degree === filterDegree : true;
            const matchSem = filterSemester ? a.semester === parseInt(filterSemester) : true;
            const matchSec = filterSection ? a.section === filterSection : true;
            return matchDeg && matchSem && matchSec;
        });

        return hasMatch;
    });

    const handleAllocate = async () => {
        if (!selectedFaculty || !allocDegree || !allocSemester || !allocSection || !allocSubject) {
            return showMessage("All fields are required.", 'error');
        }
        setIsAllocating(true);
        try {
            await auth().post("/admin/faculty/allocate", {
                faculty_id: selectedFaculty.id,
                degree: allocDegree, semester: parseInt(allocSemester),
                section: allocSection, subject: allocSubject
            });
            showMessage(`Success: Assigned **${allocSubject}** to **${selectedFaculty.name}**`, 'success');
            setAllocSubject("");
            fetchFaculty(); // Refresh
        } catch (e) {
            showMessage(e.response?.data?.message || "Allocation failed.", 'error');
        } finally { setIsAllocating(false); }
    };

    const handleDeallocate = async (allocId) => {
        if (!confirm("Are you sure you want to remove this subject assignment?")) return;
        try {
            await auth().post("/admin/faculty/deallocate", { allocation_id: allocId });
            showMessage("Allocation removed.", 'success');
            fetchFaculty();
        } catch (e) { showMessage("Failed to remove.", 'error'); }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <div>
                    <h4 className="text-3xl font-bold text-yellow-500 flex items-center tracking-tight">
                        <ClipboardList className="w-8 h-8 mr-3 opacity-80" />
                        Faculty & Allocations
                    </h4>
                    <p className="text-slate-400 mt-1 pl-11">Manage professors and their subject allotments.</p>
                </div>
                <div className="bg-yellow-500/10 px-4 py-2 rounded-lg border border-yellow-500/20 text-yellow-500 font-mono text-xs uppercase tracking-widest">
                    {faculty.length} Faculty Members
                </div>
            </div>

            {/* Allocation Interface */}
            <div className="bg-slate-900/40 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-yellow-500/10" style={{ minHeight: '400px' }}>
                <h5 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-6 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></span> New Allocation
                </h5>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Faculty Selection */}
                    <div className="space-y-4">
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider pl-1">Select Professor</label>

                        {/* Custom Searchable Dropdown */}
                        <div className="relative" ref={dropdownRef}>
                            <div
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className={`w-full bg-slate-800/50 border ${isDropdownOpen ? 'border-yellow-500 ring-1 ring-yellow-500/50' : 'border-white/10'} rounded-xl px-4 py-3 text-white flex justify-between items-center cursor-pointer transition-all hover:bg-slate-800/80`}
                            >
                                <span className={selectedFaculty ? "text-white font-medium" : "text-slate-500"}>
                                    {selectedFaculty ? `${selectedFaculty.name} (${selectedFaculty.emp_id})` : "-- Choose Faculty Member --"}
                                </span>
                                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                            </div>

                            {/* Dropdown Menu */}
                            {isDropdownOpen && (
                                <div className="absolute z-50 mt-2 w-full bg-slate-900 border border-white/10 rounded-xl shadow-2xl max-h-80 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                    {/* Search Box Sticky Top */}
                                    <div className="p-2 border-b border-white/5 bg-slate-900 sticky top-0">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                                            <input
                                                autoFocus
                                                className="w-full bg-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-yellow-500"
                                                placeholder="Search faculty..."
                                                value={allocFacultySearch}
                                                onChange={e => setAllocFacultySearch(e.target.value)}
                                                onClick={e => e.stopPropagation()}
                                            />
                                        </div>
                                    </div>

                                    {/* List */}
                                    <div className="overflow-y-auto custom-scrollbar flex-1 p-1">
                                        {faculty.filter(f => f.name.toLowerCase().includes(allocFacultySearch.toLowerCase())).length === 0 ? (
                                            <div className="p-3 text-xs text-slate-500 text-center italic">No faculty found.</div>
                                        ) : (
                                            faculty.filter(f => f.name.toLowerCase().includes(allocFacultySearch.toLowerCase())).map(f => (
                                                <div
                                                    key={f.id}
                                                    onClick={() => {
                                                        setSelectedFaculty(f);
                                                        setIsDropdownOpen(false);
                                                        setAllocFacultySearch(""); // Optional: reset search or keep it
                                                    }}
                                                    className={`p-2.5 rounded-lg text-sm cursor-pointer flex items-center justify-between group transition-colors ${selectedFaculty?.id === f.id ? 'bg-yellow-500/20 text-yellow-400' : 'hover:bg-slate-800 text-slate-300 hover:text-white'}`}
                                                >
                                                    <span className="font-medium">{f.name}</span>
                                                    <span className={`text-[10px] uppercase tracking-wider ${selectedFaculty?.id === f.id ? 'text-yellow-500/70' : 'text-slate-600 group-hover:text-slate-500'}`}>{f.emp_id}</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {selectedFaculty && (
                            <div className="p-3 bg-white/5 rounded-lg border border-white/5 flex items-center animate-in fade-in slide-in-from-top-2">
                                <div className="w-8 h-8 rounded-full bg-yellow-500/20 text-yellow-500 flex items-center justify-center font-bold mr-3">{selectedFaculty.name[0]}</div>
                                <div>
                                    <div className="text-sm font-bold text-white leading-tight">{selectedFaculty.name}</div>
                                    <div className="text-xs text-slate-500">{selectedFaculty.email}</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Class Details */}
                    <div className="space-y-4">
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider pl-1">Class Details</label>
                        <div className="grid grid-cols-3 gap-3">
                            <Select value={allocDegree} onChange={e => setAllocDegree(e.target.value)}>
                                {degrees.map(d => <option key={d} value={d}>{d}</option>)}
                            </Select>
                            <Select value={allocSemester} onChange={e => setAllocSemester(e.target.value)}>
                                {Array.from({ length: 8 }, (_, i) => i + 1).map(s => <option key={s} value={s}>Sem {s}</option>)}
                            </Select>
                            <Select value={allocSection} onChange={e => setAllocSection(e.target.value)}>
                                <option value="">Select Section</option>
                                {(availableSections || []).map(s => <option key={s} value={s}>Sec {s}</option>)}
                            </Select>
                        </div>
                        <div className="flex gap-2">
                            <Select value={allocSubject} onChange={e => setAllocSubject(e.target.value)} icon={Book} disabled={!subjects.length}>
                                <option value="">-- Select Subject --</option>
                                {subjects.length > 0 ? (
                                    subjects.map(s => <option key={s} value={s}>{s}</option>)
                                ) : (
                                    <option value="" disabled>No subjects found for this class</option>
                                )}
                            </Select>
                            <button
                                className={`${buttonClass} bg-yellow-600 hover:bg-yellow-500 text-white w-auto px-6`}
                                onClick={handleAllocate}
                                disabled={!selectedFaculty || isAllocating || !allocSubject}
                            >
                                {isAllocating ? <Loader2 className="animate-spin w-5 h-5" /> : <Plus className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="space-y-4">
                <div className="flex justify-between items-end">
                    <h5 className="text-sm font-bold text-slate-300 uppercase tracking-widest pl-1">Directory & Allocations</h5>

                    {/* Filters UI */}
                    <div className="flex gap-2">
                        <select className="bg-slate-900 border border-white/10 text-xs rounded px-2 py-1 text-slate-300 outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 cursor-pointer" value={filterDegree} onChange={e => setFilterDegree(e.target.value)}>
                            <option value="">Degree</option>
                            {(degrees || []).map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <select className="bg-slate-900 border border-white/10 text-xs rounded px-2 py-1 text-slate-300 outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 cursor-pointer" value={filterSemester} onChange={e => setFilterSemester(e.target.value)}>
                            <option value="">Semester</option>
                            {Array.from({ length: 8 }, (_, i) => i + 1).map(s => <option key={s} value={s}>Sem {s}</option>)}
                        </select>
                        <select className="bg-slate-900 border border-white/10 text-xs rounded px-2 py-1 text-slate-300 outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 cursor-pointer" value={filterSection} onChange={e => setFilterSection(e.target.value)}>
                            <option value="">Section</option>
                            {(availableFilterSections || []).map(s => <option key={s} value={s}>Sec {s}</option>)}
                        </select>
                    </div>
                </div>

                {!filtersActive ? (
                    <div className="text-center py-20 bg-slate-900/20 rounded-2xl border border-white/5 text-slate-600 animate-in fade-in zoom-in-95 duration-500">
                        <div className="w-16 h-16 rounded-full bg-slate-800 mx-auto mb-4 flex items-center justify-center">
                            <Filter className="w-8 h-8 text-slate-500" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-400 mb-1">Directory Filtered</h3>
                        <p className="text-sm text-slate-500">Please select a Degree, Semester, or Section to view faculty.</p>
                    </div>
                ) : isLoading ? <div className="text-center p-20"><Loader2 className="animate-spin w-10 h-10 mx-auto text-yellow-500 opacity-50" /></div> : filteredFaculty.length === 0 ? <div className="text-center py-20 bg-slate-900/20 rounded-2xl border border-white/5 text-slate-600">No faculty members found matching criteria.</div> : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {filteredFaculty.map(f => (
                            <div key={f.id} className="bg-slate-800/20 rounded-xl border border-white/5 p-5 hover:bg-slate-800/40 hover:border-white/10 transition-all duration-300 group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center">
                                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 border border-white/10 flex items-center justify-center text-slate-300 font-bold text-lg mr-3 shadow-inner">
                                            {f.name[0]}
                                        </div>
                                        <div>
                                            <div className="font-bold text-white group-hover:text-yellow-400 transition-colors">{f.name}</div>
                                            <div className="text-xs text-slate-500 font-mono mt-0.5">{f.email} • {f.emp_id}</div>
                                        </div>
                                    </div>
                                    {f.allocations.length > 0 && <span className="bg-yellow-500/10 text-yellow-500 text-[10px] font-bold px-2 py-1 rounded border border-yellow-500/20 uppercase tracking-widest">{f.allocations.length} SUB</span>}
                                </div>

                                <div className="space-y-2">
                                    {f.allocations.length === 0 ? (
                                        <div className="text-xs text-slate-600 italic pl-1">No subjects allocated yet.</div>
                                    ) : (
                                        f.allocations.map(a => (
                                            <div key={a.id} className="flex justify-between items-center bg-slate-900/60 p-2.5 rounded-lg border border-white/5 text-sm group/item hover:border-white/10 transition-colors">
                                                <div className="flex items-center">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/50 mr-3"></div>
                                                    <span className="text-slate-200 font-medium mr-2">{a.subject}</span>
                                                    <span className="text-xs text-slate-500">
                                                        {a.degree} • {a.semester}-{a.section}
                                                    </span>
                                                </div>
                                                <button onClick={() => handleDeallocate(a.id)} className="text-slate-600 hover:text-red-400 p-1 opacity-0 group-hover/item:opacity-100 transition-all">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}


function AdminPanel({ showMessage, catalogs, buttonClass, primaryButtonClass, dangerButtonClass, user, onLogout }) { // 🛑 ADDED user PROP + onLogout
    const { degrees, sections, loaded, fetchBasics, fetchSections, fetchSubjects } = catalogs;

    const [pending, setPending] = useState([]);
    const [newDegree, setNewDegree] = useState("");
    const [newSection, setNewSection] = useState("");
    const [newSectionDegree, setNewSectionDegree] = useState("");
    const [newSectionSemester, setNewSectionSemester] = useState("1");
    // Selected degree/semester for viewing sections
    const [viewSectionDegree, setViewSectionDegree] = useState("");
    const [viewSectionSemester, setViewSectionSemester] = useState("");
    // Sections for selected degree/semester only
    const [currentSections, setCurrentSections] = useState([]);
    const [isLoadingSections, setIsLoadingSections] = useState(false);

    // Selected degree/semester for viewing subjects
    const [viewSubjectDegree, setViewSubjectDegree] = useState("");
    const [viewSubjectSemester, setViewSubjectSemester] = useState("");
    // Subjects for selected degree/semester
    const [currentSubjects, setCurrentSubjects] = useState([]);
    const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);

    // Fetch sections only for selected degree and semester
    const fetchCurrentSections = useCallback(async (degree, semester) => {
        if (!degree || !semester) {
            setCurrentSections([]);
            return;
        }
        setIsLoadingSections(true);
        try {
            const sections = await fetchSections(degree, semester);
            setCurrentSections(sections || []);
        } catch (e) {
            console.error("Failed to fetch sections", e);
            setCurrentSections([]);
        } finally {
            setIsLoadingSections(false);
        }
    }, [fetchSections]);

    const fetchCurrentSubjects = useCallback(async (degree, semester) => {
        if (!degree || !semester) {
            setCurrentSubjects([]);
            return;
        }
        setIsLoadingSubjects(true);
        try {
            const subjects = await fetchSubjects(degree, semester);
            setCurrentSubjects(subjects || []);
        } catch (e) {
            console.error("Failed to fetch subjects", e);
            setCurrentSubjects([]);
        } finally {
            setIsLoadingSubjects(false);
        }
    }, [fetchSubjects]);

    // Track previous values to prevent duplicate calls
    const prevSecDeg = useRef("");
    const prevSecSem = useRef("");
    const prevSubDeg = useRef("");
    const prevSubSem = useRef("");

    // Fetch sections when view degree/semester changes
    useEffect(() => {
        if (viewSectionDegree && viewSectionSemester) {
            if (prevSecDeg.current !== viewSectionDegree || prevSecSem.current !== viewSectionSemester) {
                prevSecDeg.current = viewSectionDegree;
                prevSecSem.current = viewSectionSemester;
                fetchCurrentSections(viewSectionDegree, viewSectionSemester);
            }
        } else {
            setCurrentSections([]);
            prevSecDeg.current = "";
            prevSecSem.current = "";
        }
    }, [viewSectionDegree, viewSectionSemester, fetchCurrentSections]);

    // Fetch subjects when view degree/semester changes
    useEffect(() => {
        if (viewSubjectDegree && viewSubjectSemester) {
            if (prevSubDeg.current !== viewSubjectDegree || prevSubSem.current !== viewSubjectSemester) {
                prevSubDeg.current = viewSubjectDegree;
                prevSubSem.current = viewSubjectSemester;
                fetchCurrentSubjects(viewSubjectDegree, viewSubjectSemester);
            }
        } else {
            setCurrentSubjects([]);
            prevSubDeg.current = "";
            prevSubSem.current = "";
        }
    }, [viewSubjectDegree, viewSubjectSemester, fetchCurrentSubjects]);

    const addSection = async () => {
        if (!newSectionDegree || !newSectionSemester || !newSection.trim()) return showMessage("Select Degree, Sem and enter Name.", "error");
        try {
            await auth().post("/admin/sections", { name: newSection, degree: newSectionDegree, semester: newSectionSemester });
            showMessage("Section added!", "success");
            setNewSection("");
            // Refresh sections if viewing the same degree/semester
            if (viewSectionDegree === newSectionDegree && viewSectionSemester === newSectionSemester) {
                await fetchCurrentSections(newSectionDegree, newSectionSemester);
            }
        } catch (e) {
            showMessage(e.response?.data?.message || "Failed to add section", "error");
        }
    };

    const deleteSection = async (name) => {
        if (!viewSectionDegree || !viewSectionSemester) return;
        if (!confirm(`Delete Section ${name} from ${viewSectionDegree} Sem ${viewSectionSemester}?`)) return;
        try {
            await auth().delete("/admin/sections", { data: { name, degree: viewSectionDegree, semester: viewSectionSemester } });
            showMessage("Section deleted!", "success");
            // Refresh current sections
            await fetchCurrentSections(viewSectionDegree, viewSectionSemester);
        } catch (e) {
            showMessage(e.response?.data?.message || "Failed to delete section", "error");
        }
    };
    const [subjectDegree, setSubjectDegree] = useState('');
    const [subjectSemester, setSubjectSemester] = useState("1");
    const [newSubject, setNewSubject] = useState("");
    const [view, setView] = useState('approvals');
    const [isFetchingPending, setIsFetchingPending] = useState(false);
    const [processingId, setProcessingId] = useState(null); // NEW: Track processing student

    // Edit Modal State
    const [editStudent, setEditStudent] = useState(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [generatedPass, setGeneratedPass] = useState(null);

    // FIX: Cleaned up fetchPending function
    const fetchPending = useCallback(async () => {
        setIsFetchingPending(true);
        try {
            const res = await auth().get("/admin/pending-students");
            setPending(res.data.students || []);
        } catch (e) {
            if (e.response && e.response.status !== 401) {
                showMessage("Failed to fetch pending students.", "error");
            }
            setPending([]);
        } finally {
            setIsFetchingPending(false);
        }
    }, [showMessage]);

    const handleUpdateStudent = async () => {
        if (!editStudent) return;
        setIsUpdating(true);
        try {
            await auth().post("/admin/update-student", {
                student_id: editStudent.id,
                name: editStudent.name,
                srn: editStudent.srn,
                degree: editStudent.degree,
                semester: editStudent.semester,
                section: editStudent.section,
                parent_email: editStudent.parent_email
            });
            showMessage("Student details updated.", "success");
            setEditStudent(null);
            fetchPending(); // Refresh lists (might be efficient to just update local state but safer to refetch)
        } catch (e) {
            showMessage(e.response?.data?.message || "Update failed", "error");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleGenerateParentPass = async () => {
        if (!editStudent?.id) return;
        setIsUpdating(true);
        try {
            const res = await auth().post("/admin/generate-parent-password", { student_id: editStudent.id });
            setGeneratedPass(res.data.password);
            showMessage(res.data.message, "success");
        } catch (e) {
            showMessage(e.response?.data?.message || "Generation failed", "error");
        } finally {
            setIsUpdating(false);
        }
    };

    const take = async (id, action) => {
        if (processingId) return; // Prevent concurrent actions
        setProcessingId(id);
        try {
            // Using auth()
            const res = await auth().post("/admin/approve-student", { student_id: id, action: action });
            showMessage(res.data.message, "success");
            setPending(prev => prev.filter(s => s.id !== id));
        } catch (e) {
            if (e.response && e.response.status !== 401) {
                showMessage(e.response?.data?.message || "Action failed.", "error");
            }
        } finally {
            setProcessingId(null);
        }
    };

    const addCatalogItem = async (endpoint, name, successMsg) => {
        if (!name.trim()) return showMessage("Please enter a valid value.", "error");
        try {
            // Using auth()
            await auth().post(`/admin/${endpoint}`, { name });
            showMessage(successMsg, "success");
            await fetchBasics();
        } catch (e) {
            if (e.response && e.response.status !== 401) {
                showMessage(e.response?.data?.message || "Operation failed.", "error");
            }
        }
    };

    const deleteCatalogItem = async (endpoint, name) => {
        if (!confirm(`Delete ${name}? This might affect data linked to it.`)) return;
        try {
            await auth().delete(`/admin/${endpoint}`, { data: { name } });
            showMessage("Deleted successfully", "success");
            await fetchBasics();
        } catch (e) {
            showMessage(e.response?.data?.message || "Deletion failed", "error");
        }
    };

    const deleteSubject = async (name) => {
        if (!confirm(`Delete subject ${name}?`)) return;
        try {
            await auth().delete("/admin/subjects", {
                data: {
                    degree: viewSubjectDegree,
                    semester: parseInt(viewSubjectSemester),
                    name
                }
            });
            showMessage("Subject deleted", "success");
            fetchCurrentSubjects(viewSubjectDegree, viewSubjectSemester);
        } catch (e) {
            showMessage(e.response?.data?.message || "Deletion failed", "error");
        }
    };

    const addSubject = async () => {
        if (!newSubject.trim()) return showMessage("Subject cannot be empty", "error");
        try {
            // Using auth()
            await auth().post("/admin/subjects", {
                degree: subjectDegree,
                semester: parseInt(subjectSemester),
                name: newSubject,
            });
            showMessage("Subject added successfully!", "success");
            setNewSubject("");
        } catch (e) {
            if (e.response && e.response.status !== 401) {
                showMessage(e.response?.data?.message || "Failed to add subject.", "error");
            }
        }
    };

    // Effect 1: Initialize Dropdowns
    useEffect(() => {
        if (loaded && Array.isArray(degrees) && degrees.length > 0 && !subjectDegree) {
            setSubjectDegree(degrees[0]);
        }
    }, [loaded, degrees, subjectDegree]);

    // Effect 2: Fetch Data (CRITICAL FIX: Only run if user is confirmed and on the approvals view)
    useEffect(() => {
        // Since AdminPanel receives the 'user' object as a prop, we use it as a robust guardrail
        if (view === 'approvals' && user && user.role === 'admin') {
            fetchPending();
        }
    }, [view, fetchPending, user]); // Added 'user' to the dependency array


    const renderView = () => {
        switch (view) {
            case "approvals":
                return (
                    <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-xl shadow-lg border border-yellow-500/20">
                        <h4 className="text-2xl font-bold text-yellow-500 mb-4">Pending Student Approvals</h4>
                        {isFetchingPending && <div className="text-center p-5"><Loader2 className="animate-spin w-6 h-6 text-yellow-500 mx-auto" /></div>}
                        {!isFetchingPending && pending.length === 0 && <div className="p-4 text-slate-500 text-center">No pending students.</div>}

                        <div className="space-y-4">
                            {pending.map(s => (
                                <div key={s.id} className="p-4 bg-yellow-900/20 border-l-4 border-yellow-500 rounded-xl shadow backdrop-blur-sm">
                                    <div className="font-bold text-lg text-white">{s.name}</div>
                                    <div className="text-sm text-slate-300">{s.srn} • {s.email} • {s.degree} • Sem {s.semester}</div>
                                    <div className="flex gap-3 mt-3">
                                        <button
                                            disabled={processingId === s.id}
                                            className={`${buttonClass} bg-green-600 text-white disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px] flex justify-center`}
                                            onClick={() => take(s.id, "approve")}
                                        >
                                            {processingId === s.id ? <Loader2 className="w-5 h-5 animate-spin" /> : "Approve"}
                                        </button>
                                        <button
                                            disabled={processingId === s.id}
                                            className={`${buttonClass} bg-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px] flex justify-center`}
                                            onClick={() => take(s.id, "reject")}
                                        >
                                            {processingId === s.id ? <Loader2 className="w-5 h-5 animate-spin" /> : "Reject"}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'faculty_mgmt':
                return <AdminFacultyManagement showMessage={showMessage} catalogs={catalogs} buttonClass={buttonClass} primaryButtonClass={primaryButtonClass} />;
            case "faculty-onboard": return <AdminFacultyOnboarding showMessage={showMessage} buttonClass={buttonClass} primaryButtonClass={primaryButtonClass} catalogs={catalogs} />;
            case "note-upload": return <AdminNoteUpload showMessage={showMessage} buttonClass={buttonClass} primaryButtonClass={primaryButtonClass} catalogs={catalogs} />; // NEW VIEW
            case "library-upload": return <AdminBookUpload showMessage={showMessage} buttonClass={buttonClass} primaryButtonClass={primaryButtonClass} catalogs={catalogs} />; // NEW VIEW
            case "catalogs":
                return (
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-xl shadow-lg border border-white/10 space-y-3">
                            <h4 className="text-xl font-bold text-yellow-400">Manage Degrees</h4>
                            <Input placeholder="New degree" value={newDegree} onChange={e => setNewDegree(e.target.value)} />
                            <button className={`${buttonClass} ${primaryButtonClass}`} onClick={() => addCatalogItem("degrees", newDegree, "Degree added!")}>Add Degree</button>

                            <div className="mt-4 pt-4 border-t border-white/10">
                                <label className="block text-sm font-bold text-slate-300 uppercase tracking-widest mb-2">Current Degrees</label>
                                <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                    {(degrees || []).map(d => (
                                        <div key={d} className="flex justify-between items-center p-2 bg-slate-800/40 rounded border border-white/5 group">
                                            <span className="text-white text-sm font-medium">{d}</span>
                                            <button
                                                onClick={() => deleteCatalogItem("degrees", d)}
                                                className="p-1 text-slate-500 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                title="Delete Degree"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-xl shadow-lg border border-white/10 space-y-4">
                            <h4 className="text-xl font-bold text-yellow-400">Manage Sections</h4>

                            {/* Add Section Form */}
                            <div className="bg-slate-800/40 p-4 rounded-lg border border-white/5 space-y-3">
                                <div className="flex flex-col sm:grid sm:grid-cols-2 gap-2">
                                    <Select value={newSectionDegree} onChange={e => setNewSectionDegree(e.target.value)} disabled={!degrees.length} className="w-full">
                                        <option value="">Select Degree</option>
                                        {(degrees || []).map(d => <option key={d} value={d} className="text-slate-900">{d}</option>)}
                                    </Select>
                                    <Select value={newSectionSemester} onChange={e => setNewSectionSemester(e.target.value)} className="w-full">
                                        {Array.from({ length: 8 }, (_, i) => i + 1).map(s => <option key={s} value={s} className="text-slate-900">Sem {s}</option>)}
                                    </Select>
                                </div>
                                <Input placeholder="New section name (e.g. A)" value={newSection} onChange={e => setNewSection(e.target.value)} />
                                <button className={`${buttonClass} ${primaryButtonClass} w-full`} onClick={addSection}>Add Section</button>
                            </div>

                            {/* Sections Display - Dropdown Menu */}
                            <div>
                                <label className="block text-sm font-bold text-slate-300 uppercase tracking-widest mb-2">View & Delete Sections</label>

                                {/* Select Degree & Semester to View Sections - Mobile Optimized */}
                                <div className="flex flex-col sm:grid sm:grid-cols-2 gap-2 mb-3">
                                    <Select
                                        value={viewSectionDegree}
                                        onChange={e => {
                                            setViewSectionDegree(e.target.value);
                                            setViewSectionSemester(""); // Reset semester when degree changes
                                        }}
                                        disabled={!degrees.length}
                                        className="w-full"
                                    >
                                        <option value="" className="text-slate-900">Select Degree</option>
                                        {(degrees || []).map(d => <option key={d} value={d} className="text-slate-900">{d}</option>)}
                                    </Select>
                                    <Select
                                        value={viewSectionSemester}
                                        onChange={e => setViewSectionSemester(e.target.value)}
                                        disabled={!viewSectionDegree}
                                        className="w-full"
                                    >
                                        <option value="" className="text-slate-900">Select Semester</option>
                                        {Array.from({ length: 8 }, (_, i) => i + 1).map(s => <option key={s} value={s} className="text-slate-900">Sem {s}</option>)}
                                    </Select>
                                </div>

                                {/* Sections Dropdown - Only shows when degree & semester selected - Mobile Optimized */}
                                {viewSectionDegree && viewSectionSemester ? (
                                    isLoadingSections ? (
                                        <div className="text-center p-4"><Loader2 className="animate-spin w-5 h-5 mx-auto text-yellow-500" /></div>
                                    ) : currentSections.length === 0 ? (
                                        <div className="text-center p-4 bg-slate-800/20 rounded-lg border border-white/5 text-slate-500 text-sm">
                                            No sections found for {viewSectionDegree} Sem {viewSectionSemester}.
                                        </div>
                                    ) : (
                                        <>
                                            <Select
                                                className="w-full bg-slate-800/50 border border-white/10 text-white py-2.5 text-base"
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    if (value && value !== '') {
                                                        deleteSection(value);
                                                        e.target.value = ''; // Reset dropdown
                                                    }
                                                }}
                                            >
                                                <option value="" className="text-slate-900">Select a section to delete...</option>
                                                {currentSections.map(s => (
                                                    <option
                                                        key={s}
                                                        value={s}
                                                        className="text-slate-900"
                                                    >
                                                        Section {s}
                                                    </option>
                                                ))}
                                            </Select>
                                            <div className="mt-2 text-xs text-slate-400 text-center">
                                                {currentSections.length} {currentSections.length === 1 ? 'section' : 'sections'} for {viewSectionDegree} Sem {viewSectionSemester}
                                            </div>
                                        </>
                                    )
                                ) : (
                                    <div className="text-center p-4 bg-slate-800/20 rounded-lg border border-white/5 text-slate-400 text-sm">
                                        Select a degree and semester above to view sections.
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-xl shadow-lg border border-white/10 space-y-4">
                            <h4 className="text-xl font-bold text-yellow-400">Manage Subjects</h4>

                            {/* Add Subject Form */}
                            <div className="bg-slate-800/40 p-4 rounded-lg border border-white/5 space-y-3">
                                <div className="flex flex-col sm:grid sm:grid-cols-2 gap-2">
                                    <Select value={subjectDegree} onChange={e => setSubjectDegree(e.target.value)} disabled={!degrees.length} className="w-full">
                                        <option value="">Select Degree</option>
                                        {(degrees || []).map(d => <option key={d} value={d} className="text-slate-900">{d}</option>)}
                                    </Select>
                                    <Select value={subjectSemester} onChange={e => setSubjectSemester(e.target.value)} className="w-full">
                                        {Array.from({ length: 8 }, (_, i) => i + 1).map(s => <option key={s} value={s} className="text-slate-900">Sem {s}</option>)}
                                    </Select>
                                </div>
                                <Input placeholder="Subject name" value={newSubject} onChange={e => setNewSubject(e.target.value)} />
                                <button className={`${buttonClass} ${primaryButtonClass} w-full`} onClick={addSubject}>Add Subject</button>
                            </div>

                            {/* View & Delete Subjects */}
                            <div>
                                <label className="block text-sm font-bold text-slate-300 uppercase tracking-widest mb-2">View & Delete Subjects</label>

                                <div className="flex flex-col sm:grid sm:grid-cols-2 gap-2 mb-3">
                                    <Select
                                        value={viewSubjectDegree}
                                        onChange={e => {
                                            setViewSubjectDegree(e.target.value);
                                            setViewSubjectSemester("");
                                        }}
                                        disabled={!degrees.length}
                                        className="w-full"
                                    >
                                        <option value="" className="text-slate-900">Select Degree</option>
                                        {(degrees || []).map(d => <option key={d} value={d} className="text-slate-900">{d}</option>)}
                                    </Select>
                                    <Select
                                        value={viewSubjectSemester}
                                        onChange={e => setViewSubjectSemester(e.target.value)}
                                        disabled={!viewSubjectDegree}
                                        className="w-full"
                                    >
                                        <option value="" className="text-slate-900">Select Semester</option>
                                        {Array.from({ length: 8 }, (_, i) => i + 1).map(s => <option key={s} value={s} className="text-slate-900">Sem {s}</option>)}
                                    </Select>
                                </div>

                                {viewSubjectDegree && viewSubjectSemester ? (
                                    isLoadingSubjects ? (
                                        <div className="text-center p-4"><Loader2 className="animate-spin w-5 h-5 mx-auto text-yellow-500" /></div>
                                    ) : currentSubjects.length === 0 ? (
                                        <div className="text-center p-4 bg-slate-800/20 rounded-lg border border-white/5 text-slate-500 text-sm">
                                            No subjects found.
                                        </div>
                                    ) : (
                                        <>
                                            <Select
                                                className="w-full bg-slate-800/50 border border-white/10 text-white py-2.5 text-base"
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    if (value) {
                                                        deleteSubject(value);
                                                        e.target.value = '';
                                                    }
                                                }}
                                            >
                                                <option value="" className="text-slate-900">Select a subject to delete...</option>
                                                {currentSubjects.map(s => (
                                                    <option key={s} value={s} className="text-slate-900">{s}</option>
                                                ))}
                                            </Select>
                                            <div className="mt-2 text-xs text-slate-400 text-center">
                                                {currentSubjects.length} subjects found.
                                            </div>
                                        </>
                                    )
                                ) : (
                                    <div className="text-center p-4 bg-slate-800/20 rounded-lg border border-white/5 text-slate-400 text-sm">
                                        Select context to view subjects.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            case "fees-admin": return <AdminFeeManagement showMessage={showMessage} buttonClass={buttonClass} primaryButtonClass={primaryButtonClass} catalogs={catalogs} />;
            case "complaints-admin": return <AdminHostelComplaints showMessage={showMessage} buttonClass={buttonClass} primaryButtonClass={primaryButtonClass} />;
            case "student-list": return <AdminStudentList showMessage={showMessage} catalogs={catalogs} buttonClass={buttonClass} primaryButtonClass={primaryButtonClass} />;
            case "hostel-config": return <AdminHostelManagement showMessage={showMessage} buttonClass={buttonClass} primaryButtonClass={primaryButtonClass} catalogs={catalogs} />;
            default: return <div className="text-center p-6 text-gray-500">Select an option</div>;
        }
    };

    return (
        <div className="min-h-screen animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Area */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Admin Tools</h1>
                    <p className="text-slate-400">Manage students, faculty, courses and institutional settings.</p>
                </div>
                {/* Aesthetic Logout Button */}
                <button
                    onClick={onLogout}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl border border-red-500/20 transition-all font-medium shadow-sm"
                >
                    <LogOut className="w-4 h-4" /> Logout
                </button>
            </div>

            {/* Desktop Navigation Tabs */}
            <div className="hidden md:flex flex-wrap gap-2 mb-8 p-1 bg-slate-900/40 backdrop-blur-md rounded-xl border border-white/5 w-fit">
                {[
                    { key: 'approvals', label: 'Student Approvals', icon: User },
                    { key: 'student-list', label: 'Student Directory', icon: GraduationCap },
                    { key: 'faculty_mgmt', label: 'Faculty Allocations', icon: ClipboardList },
                    { key: 'hostel-config', label: 'Hostel Config', icon: Home },
                    { key: 'complaints-admin', label: 'Hostel Complaints', icon: Mail },
                    { key: 'note-upload', label: 'Upload Study Material', icon: Book },
                    { key: 'library-upload', label: 'Book Upload', icon: Upload },
                    { key: 'faculty-onboard', label: 'Add Faculty', icon: UserPlus },
                    { key: 'catalogs', label: 'Degrees/Subjects', icon: Settings },
                    { key: 'fees-admin', label: 'Manage Fees', icon: IndianRupee },
                ].map(item => {
                    const Icon = item.icon;
                    const isActive = view === item.key;
                    return (
                        <button
                            key={item.key}
                            onClick={() => setView(item.key)}
                            className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${isActive
                                ? 'bg-cyan-500/20 text-cyan-400 shadow-sm border border-cyan-500/30'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            {item.label}
                        </button>
                    );
                })}
            </div>

            {/* Mobile Navigation Dropdown (HRD Style) */}
            <div className="md:hidden mb-8">
                <div className="relative">
                    <Menu className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400 pointer-events-none" />
                    <select
                        value={view}
                        onChange={(e) => setView(e.target.value)}
                        className="w-full bg-slate-800/80 border border-cyan-500/30 rounded-xl py-3 pl-10 pr-4 text-white appearance-none outline-none focus:ring-2 focus:ring-cyan-500/50 shadow-lg font-semibold"
                    >
                        {[
                            { key: 'approvals', label: 'Student Approvals' },
                            { key: 'student-list', label: 'Student Directory' },
                            { key: 'faculty_mgmt', label: 'Faculty Allocations' },
                            { key: 'hostel-config', label: 'Hostel Config' },
                            { key: 'complaints-admin', label: 'Hostel Complaints' },
                            { key: 'note-upload', label: 'Upload Study Material' },
                            { key: 'library-upload', label: 'Book Upload' },
                            { key: 'faculty-onboard', label: 'Add Faculty' },
                            { key: 'catalogs', label: 'Degrees/Subjects' },
                            { key: 'fees-admin', label: 'Manage Fees' },
                        ].map(item => (
                            <option key={item.key} value={item.key} className="bg-slate-900 text-white py-2">
                                {item.label}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
            </div>

            {/* Content Area */}
            <div className="min-h-[400px]">
                {renderView()}
            </div>
        </div>
    );
}
// Professor Panel (Updated with Books)

// Student Attendance Calendar
function StudentAttendanceCalendar({ showMessage, buttonClass, primaryButtonClass }) {
    const [attendance, setAttendance] = useState([]);
    const [viewDate, setViewDate] = useState(new Date()); // Tracks Month/Year
    const [isLoading, setIsLoading] = useState(false);
    const [selectedDay, setSelectedDay] = useState(null);

    useEffect(() => {
        const fetchAtt = async () => {
            setIsLoading(true);
            try {
                const res = await auth().get("/student/attendance");
                setAttendance(res.data.attendance || []);
            } catch (e) { } finally { setIsLoading(false); }
        };
        fetchAtt();
    }, []);

    // Calendar Logic
    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay(); // 0 = Sun

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    // Map attendance to dates
    // attendance: [{date, subject, status}]
    const getStatusForDay = (day) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayRecs = attendance.filter(r => r.date === dateStr);
        if (!dayRecs.length) return null; // No data
        // Priority: If any Absent -> Red. Else (all present) -> Green.
        const anyAbsent = dayRecs.some(r => r.status === "Absent");
        return anyAbsent ? "Absent" : "Present";
    };

    const getDayDetails = (day) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return attendance.filter(r => r.date === dateStr);
    };

    return (
        <div className="space-y-6">
            <h4 className="text-2xl font-bold text-blue-400 flex items-center"><ClipboardList className="w-6 h-6 mr-2" /> My Attendance</h4>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Calendar View */}
                <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-xl shadow-lg border border-blue-500/20">
                    <div className="flex justify-between items-center mb-4">
                        <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="text-slate-400 hover:text-white"><ArrowLeft className="w-5 h-5" /></button>
                        <h5 className="text-lg font-bold text-white uppercase tracking-wider">
                            {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </h5>
                        <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="text-slate-400 hover:text-white rotate-180"><ArrowLeft className="w-5 h-5" /></button>
                    </div>

                    <div className="grid grid-cols-7 text-center mb-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="text-xs font-bold text-slate-500">{d}</div>)}
                    </div>

                    <div className="grid grid-cols-7 gap-2">
                        {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const day = i + 1;
                            const status = getStatusForDay(day);
                            const isSelected = selectedDay === day;

                            let bgClass = "bg-slate-800/50 border-white/5 text-slate-300";
                            if (status === "Present") bgClass = "bg-green-900/40 border-green-500/30 text-green-300";
                            if (status === "Absent") bgClass = "bg-red-900/40 border-red-500/30 text-red-300";
                            if (isSelected) bgClass += " ring-2 ring-blue-500";

                            return (
                                <div
                                    key={day}
                                    onClick={() => setSelectedDay(day)}
                                    className={`aspect-square rounded-lg flex items-center justify-center font-bold text-sm border cursor-pointer hover:opacity-80 transition-all ${bgClass}`}
                                >
                                    {day}
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex gap-4 mt-4 text-xs text-slate-400 justify-center">
                        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-500"></div> Present</div>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-500"></div> Absent</div>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-slate-700"></div> No Data</div>
                    </div>
                </div>

                {/* Details View */}
                <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-xl shadow-lg border border-white/10">
                    <h5 className="text-xl font-bold text-slate-300 mb-4">
                        {selectedDay ? `Details for ${viewDate.toLocaleString('default', { month: 'long' })} ${selectedDay}` : "Select a date to view details"}
                    </h5>

                    {selectedDay ? (
                        <div className="space-y-3">
                            {getDayDetails(selectedDay).length > 0 ? getDayDetails(selectedDay).map((r, idx) => (
                                <div key={idx} className={`p-3 rounded-lg border flex justify-between items-center ${r.status === 'Present' ? 'bg-green-900/10 border-green-500/20' : 'bg-red-900/10 border-red-500/20'}`}>
                                    <span className="font-medium text-slate-200">{r.subject}</span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${r.status === 'Present' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>{r.status}</span>
                                </div>
                            )) : <div className="text-slate-500 italic">No classes recorded for this day.</div>}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-slate-600">
                            <ClipboardList className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            Click on a calendar date
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// --- NEW: AI Student Attendance System ---
function StudentAttendanceFeature({ showMessage, buttonClass, primaryButtonClass }) {
    const [view, setView] = useState("loading"); // loading, upload, checkin, marked, holiday, stats
    const [todayData, setTodayData] = useState(null);
    const [stats, setStats] = useState(null);
    const [routineText, setRoutineText] = useState("");
    const [file, setFile] = useState(null);
    const [attendanceMap, setAttendanceMap] = useState({}); // { SubjectName: "Present" | "Absent" }
    const [isLoading, setIsLoading] = useState(false);

    // Initial Fetch
    const fetchTodayStatus = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await auth().get(`/attendance/today?t=${new Date().getTime()}`);
            const data = res.data;
            setTodayData(data);

            if (data.status === "holiday") setView("holiday");
            else if (data.status === "marked" || data.status === "marked_no_class") setView("marked");
            else if (data.status === "pending") {
                if (data.message && data.message.includes("Add one first")) {
                    setView("upload");
                } else {
                    setView("checkin");
                    // Initialize checkboxes
                    const initialMap = {};
                    (data.subjects || []).forEach(sub => initialMap[sub] = "Present");
                    setAttendanceMap(initialMap);
                }
            }
        } catch (e) {
            console.error(e);
            showMessage("Failed to load attendance status.", "error");
        } finally {
            setIsLoading(false);
        }
    }, [showMessage]);

    useEffect(() => { fetchTodayStatus(); }, [fetchTodayStatus]);

    // Handlers
    const handleRoutineUpload = async () => {
        if (!routineText.trim() && !file) return showMessage("Please paste text or upload a file.", "error");
        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append('routine_text', routineText);
            if (file) formData.append('file', file);

            await auth().post("/attendance/routine/upload", formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            showMessage("Routine parsed and saved!", "success");
            fetchTodayStatus(); // Refresh to go to checkin
        } catch (e) {
            showMessage(e.response?.data?.message || "Parsing failed. Try again.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleMarkAttendance = async (type) => {
        setIsLoading(true);
        try {
            const payload = { type }; // 'classes' or 'no_class'
            if (type === 'classes') {
                payload.data = attendanceMap;
            }
            const res = await auth().post("/attendance/mark", payload);
            showMessage(res.data.message || "Attendance saved.", "success");
            fetchTodayStatus(); // Refresh to show success/marked view
        } catch (e) {
            showMessage(e.response?.data?.message || "Failed to mark.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteRoutine = async () => {
        if (!window.confirm("Are you sure you want to delete your routine? You will need to re-upload it.")) return;
        setIsLoading(true);
        try {
            await auth().delete("/attendance/routine");
            showMessage("Routine deleted.", "success");
            setView("upload");
            setRoutineText("");
            setFile(null);
            setTodayData(null);
            setAttendanceMap({});
        } catch (e) {
            showMessage("Failed to delete routine.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchStats = async () => {
        setIsLoading(true);
        try {
            const res = await auth().get("/attendance/stats");
            setStats(res.data);
            setView("stats");
        } catch (e) {
            showMessage("Failed to load stats.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    // Sub-components
    const renderUpload = () => (
        <div className="space-y-4 max-w-xl mx-auto text-center animate-in fade-in zoom-in duration-300">
            <div className="p-4 bg-blue-500/10 rounded-full w-fit mx-auto mb-4">
                <Upload className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-2xl font-bold text-white">Setup Your Routine</h3>
            <p className="text-slate-400">
                Paste your routine text or upload an image/PDF.
            </p>
            <div className="space-y-3">
                <textarea
                    value={routineText}
                    onChange={e => setRoutineText(e.target.value)}
                    placeholder="Ex: Monday: Math 10am, Physics 12pm..."
                    className="w-full h-32 bg-slate-800/50 border border-white/10 rounded-xl p-4 text-white focus:ring-2 focus:ring-blue-500/50 outline-none"
                />
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-white/10" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-slate-900 px-2 text-slate-500">Or Upload File</span>
                    </div>
                </div>
                <input
                    type="file"
                    accept=".txt,.pdf,.png,.jpg,.jpeg,.webp"
                    onChange={e => setFile(e.target.files[0])}
                    className="block w-full text-sm text-slate-400
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-blue-500/10 file:text-blue-400
                        hover:file:bg-blue-500/20
                        cursor-pointer"
                />
            </div>
            <button
                onClick={handleRoutineUpload}
                disabled={isLoading}
                className={`${buttonClass} ${primaryButtonClass} w-full`}
            >
                {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : "Process Routine with AI"}
            </button>
            {/* Divider */}
            <div className="pt-4 border-t border-white/5 mt-4">
                <button
                    onClick={() => setView("checkin")}
                    className="text-sm text-slate-500 hover:text-white underline"
                >
                    Cancel / Go Back
                </button>
            </div>
        </div>
    );

    const renderCheckin = () => (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div>
                <h3 className="text-xl font-bold text-white mb-6">Today's Classes</h3>
                <div className="space-y-4 mb-6">
                    {Object.keys(attendanceMap).length === 0 ? (
                        <div className="p-4 bg-slate-800/50 rounded-xl text-slate-400 text-sm">
                            No classes found for today in your routine.
                        </div>
                    ) : Object.keys(attendanceMap).map((subject, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-slate-800/40 border border-white/5 rounded-xl">
                            <span className="font-semibold text-slate-200">{subject}</span>
                            <div className="flex bg-slate-900 rounded-lg p-1">
                                <button
                                    onClick={() => setAttendanceMap({ ...attendanceMap, [subject]: "Present" })}
                                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${attendanceMap[subject] === "Present" ? "bg-green-500 text-white shadow-lg" : "text-slate-500 hover:text-white"}`}
                                >
                                    P
                                </button>
                                <button
                                    onClick={() => setAttendanceMap({ ...attendanceMap, [subject]: "Absent" })}
                                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${attendanceMap[subject] === "Absent" ? "bg-red-500 text-white shadow-lg" : "text-slate-500 hover:text-white"}`}
                                >
                                    A
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => handleMarkAttendance('classes')}
                        disabled={isLoading || Object.keys(attendanceMap).length === 0}
                        className={`${buttonClass} ${primaryButtonClass} w-full flex justify-center items-center gap-2`}
                    >
                        <Save className="w-4 h-4" /> Save Attendance
                    </button>
                    <button
                        onClick={() => handleMarkAttendance('no_class')}
                        disabled={isLoading}
                        className={`${buttonClass} border border-slate-600 hover:bg-slate-800 w-full text-slate-300`}
                    >
                        No Classes Today
                    </button>
                </div>

                <div className="mt-6 flex justify-between items-center text-xs text-slate-500 border-t border-white/5 pt-4">
                    <button onClick={fetchStats} className="hover:text-blue-400 flex items-center gap-1">
                        <BarChart3 className="w-3 h-3" /> View Stats
                    </button>
                    <button onClick={handleDeleteRoutine} className="hover:text-red-400 flex items-center gap-1">
                        <Trash2 className="w-3 h-3" /> Reset Routine
                    </button>
                </div>
            </div>
        </div>
    );

    const handleResetToday = async () => {
        if (!window.confirm("Want to change today's attendance? This will reset today's entry.")) return;
        setIsLoading(true);
        try {
            await auth().delete("/attendance/today");
            showMessage("Ready to update.", "success");
            fetchTodayStatus();
        } catch (e) {
            showMessage("Failed to reset.", "error");
            setIsLoading(false);
        }
    };

    const renderMarked = () => (
        <div className="text-center py-10 space-y-6 animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto ring-4 ring-emerald-500/10">
                <CheckCircle className="w-10 h-10 text-emerald-400" />
            </div>
            <div>
                <h3 className="text-2xl font-bold text-white mb-2">You're All Set!</h3>
                <p className="text-slate-400 max-w-sm mx-auto">
                    {todayData?.status === 'marked_no_class' ? "Enjoy your day off! " : "Attendance for today has been recorded."}
                </p>
                {todayData?.fun_message && (
                    <div className="mt-6 p-4 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl">
                        <p className="text-indigo-300 italic">" {todayData.fun_message} "</p>
                    </div>
                )}
            </div>
            <div className="flex justify-center gap-4 text-sm font-medium">
                <button onClick={fetchStats} className="text-blue-400 hover:text-blue-300 underline">
                    View My Statistics
                </button>
                <span className="text-slate-600">|</span>
                <button onClick={handleResetToday} className="text-slate-400 hover:text-white flex items-center gap-1">
                    <Edit className="w-3 h-3" /> Edit / Reset
                </button>
            </div>
        </div>
    );

    const renderHoliday = () => (
        <div className="text-center py-10 space-y-6 animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto ring-4 ring-amber-500/10">
                <Sparkles className="w-10 h-10 text-amber-400" />
            </div>
            <div>
                <h3 className="text-2xl font-bold text-white mb-2">Happy Sunday!</h3>
                <div className="mt-4 p-6 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl max-w-md mx-auto relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles className="w-20 h-20" /></div>
                    <p className="text-amber-200 text-lg font-medium leading-relaxed">
                        {todayData?.message || "Take a break and recharge for the week ahead!"}
                    </p>
                </div>
            </div>
            <button onClick={fetchStats} className="text-blue-400 hover:text-blue-300 underline font-medium">
                View Statistics
            </button>
        </div>
    );

    const renderStats = () => (
        <div className="space-y-6 animate-in slide-in-from-right duration-300">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={fetchTodayStatus} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h3 className="text-2xl font-bold text-white">Attendance Analytics</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 bg-gradient-to-br from-blue-600 to-indigo-600 p-6 rounded-2xl shadow-xl text-white relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="text-blue-200 text-sm font-bold uppercase tracking-wider mb-1">Overall Attendance</div>
                        <div className="text-5xl font-bold">{stats?.overall || 0}%</div>
                        <div className="text-xs text-blue-200 mt-2 opacity-80">Accumulated Average</div>
                    </div>
                    <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/20 rounded-full blur-2xl" />
                </div>

                <div className="md:col-span-2 grid gap-3">
                    {stats?.subject_wise?.map((sub, i) => (
                        <div key={i} className="bg-slate-800/50 p-4 rounded-xl border border-white/5 flex items-center justify-between">
                            <div>
                                <div className="font-bold text-slate-200">{sub.subject}</div>
                                <div className="text-xs text-slate-500">{sub.present}/{sub.total} Classes Attended</div>
                            </div>
                            <div className={`text-xl font-bold ${sub.percentage >= 75 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {sub.percentage}%
                            </div>
                        </div>
                    ))}
                    {(!stats?.subject_wise || stats.subject_wise.length === 0) && (
                        <div className="text-center text-slate-500 py-4">No data available yet.</div>
                    )}
                </div>
            </div>
            <div className="flex justify-end">
                <button
                    onClick={handleDeleteRoutine}
                    className="text-xs text-slate-500 hover:text-red-400 flex items-center gap-1"
                >
                    <Trash2 className="w-3 h-3" /> Reset Routine
                </button>
            </div>
        </div>
    );

    return (
        <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-xl shadow-lg border border-white/10 min-h-[400px]">
            {isLoading && view === 'loading' ? (
                <div className="h-full flex flex-col items-center justify-center p-20 text-blue-400">
                    <Loader2 className="w-10 h-10 animate-spin mb-4" />
                    <span className="text-sm font-medium">Syncing with Orbit...</span>
                </div>
            ) : (
                <>
                    {view === 'upload' && renderUpload()}
                    {view === 'checkin' && renderCheckin()}
                    {view === 'marked' && renderMarked()}
                    {view === 'holiday' && renderHoliday()}
                    {view === 'stats' && renderStats()}
                </>
            )}
        </div>
    );
}

// Academic Insights Component (Groq Powered)
function AcademicInsights({ user, showMessage }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInsights = async () => {
            try {
                const res = await auth().get("/api/academic-insights");
                setData(res.data.insights);
            } catch (e) {
                console.error(e);
                showMessage("Failed to load insights.", "error");
            } finally {
                setLoading(false);
            }
        };
        fetchInsights();
    }, []);

    if (loading) return <div className="text-center py-20 text-slate-400 animate-pulse">Consulting AI Counselor...</div>;
    if (!data) return <div className="text-center py-20 text-slate-500">No insights available.</div>;

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 shadow-lg shadow-fuchsia-500/20">
                    <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">AI Academic Insights</h2>
                    <p className="text-slate-400 text-sm">Personalized analysis powered by Groq AI</p>
                </div>
            </div>

            {/* Counselor Message Card */}
            <div className="bg-slate-800/60 backdrop-blur-xl border border-violet-500/30 rounded-2xl p-6 relative overflow-hidden group hover:border-violet-500/50 transition-all">
                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                <h3 className="text-lg font-semibold text-violet-300 mb-3 flex items-center gap-2">
                    <BrainCircuit className="w-5 h-5" />
                    Counselor's Note
                </h3>
                <p className="text-slate-200 leading-relaxed text-lg italic opacity-90">
                    "{data.counselor_message}"
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Risks - Red Theme */}
                <div className="bg-slate-900/50 border border-red-500/20 rounded-xl p-5 hover:bg-slate-900/80 transition-all">
                    <h4 className="text-red-400 font-bold mb-4 flex items-center gap-2 border-b border-red-500/10 pb-2">
                        <AlertTriangle className="w-5 h-5" /> Attendance Risks
                    </h4>
                    {data.attendance_risks && data.attendance_risks.length > 0 ? (
                        <ul className="space-y-2">
                            {data.attendance_risks.map((sub, i) => (
                                <li key={i} className="flex items-center gap-2 text-red-200 bg-red-500/10 px-3 py-2 rounded-lg text-sm">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" /> {sub}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="text-slate-500 text-sm italic">No attendance risks detected. Great job!</div>
                    )}
                </div>

                {/* Priorities - Yellow Theme */}
                <div className="bg-slate-900/50 border border-amber-500/20 rounded-xl p-5 hover:bg-slate-900/80 transition-all">
                    <h4 className="text-amber-400 font-bold mb-4 flex items-center gap-2 border-b border-amber-500/10 pb-2">
                        <Target className="w-5 h-5" /> Focus Priorities
                    </h4>
                    {data.priorities && data.priorities.length > 0 ? (
                        <ul className="space-y-2">
                            {data.priorities.map((sub, i) => (
                                <li key={i} className="flex items-center gap-2 text-amber-200 bg-amber-500/10 px-3 py-2 rounded-lg text-sm">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> {sub}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="text-slate-500 text-sm italic">No urgent priorities. Keep maintaining your scores!</div>
                    )}
                </div>
            </div>

            {/* Suggestions - Green Theme */}
            <div className="bg-slate-900/50 border border-emerald-500/20 rounded-xl p-6 hover:bg-slate-900/80 transition-all">
                <h4 className="text-emerald-400 font-bold mb-4 flex items-center gap-2 border-b border-emerald-500/10 pb-2">
                    <Lightbulb className="w-5 h-5" /> Improvement Plan
                </h4>
                <div className="grid gap-3">
                    {data.suggestions.map((tip, i) => (
                        <div key={i} className="flex gap-3 text-slate-300 text-sm bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/10 hover:border-emerald-500/30 transition-all">
                            <span className="text-emerald-500 font-bold font-mono">{i + 1}.</span>
                            <span>{tip}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// Student Panel (Updated with Books and Hostel)
function StudentPanel({ user, showMessage, catalogs, buttonClass, primaryButtonClass, onLogout }) {
    const [view, setView] = useState('notes');

    const navigation = [
        { key: 'notes', label: 'Notes & Notices', icon: Book },
        { key: 'books', label: 'Internal Library', icon: Search },
        { key: 'placement', label: 'Placement Assist', icon: Briefcase },
        { key: 'fees', label: 'Fees & Payments', icon: IndianRupee },
        { key: 'marks', label: 'Marks & Grades', icon: Award },
        { key: 'feedback', label: 'Feedback', icon: MessageSquare },
        { key: 'attendance', label: 'Attendance', icon: ClipboardList },
        { key: 'attendify', label: 'Attendify', icon: CheckCircle },
        { key: 'complaints', label: 'Hostel Complaints', icon: Home },
        { key: 'insights', label: 'Academic Insights', icon: BrainCircuit },
        { key: 'chat', label: 'Orbit Bot', icon: Briefcase },
    ];

    // === FIX: Completed renderView function ===
    const renderView = () => {
        switch (view) {
            case 'notes': return <StudentNotesNotices user={user} showMessage={showMessage} catalogs={catalogs} primaryButtonClass={primaryButtonClass} buttonClass={buttonClass} />;
            case 'books': return <UnifiedLibrarySearch showMessage={showMessage} primaryButtonClass={primaryButtonClass} buttonClass={buttonClass} />; // UPDATED COMPONENT
            case 'placement': return <PlacementAssist token={localStorage.getItem('noteorbit_token')} user={user} />;
            case 'fees': return <StudentFees user={user} showMessage={showMessage} primaryButtonClass={primaryButtonClass} buttonClass={buttonClass} />;
            case 'marks': return <StudentMarks user={user} showMessage={showMessage} primaryButtonClass={primaryButtonClass} buttonClass={buttonClass} />;
            case 'feedback': return <StudentFeedback showMessage={showMessage} />; // NEW COMPONENT
            case 'attendance': return <StudentAttendanceCalendar showMessage={showMessage} primaryButtonClass={primaryButtonClass} buttonClass={buttonClass} />;
            case 'attendify': return <StudentAttendanceFeature showMessage={showMessage} primaryButtonClass={primaryButtonClass} buttonClass={buttonClass} />;
            case 'complaints': return <HostelComplaints showMessage={showMessage} primaryButtonClass={primaryButtonClass} buttonClass={buttonClass} />;
            case 'insights': return <AcademicInsights user={user} showMessage={showMessage} />;
            case 'chat': return <AIChat showMessage={showMessage} primaryButtonClass={primaryButtonClass} buttonClass={buttonClass} />;
            default: return <div className="p-8 text-center text-gray-500">Welcome to NoteOrbit! Select a module to begin.</div>;
        }
    };
    // ===========================================

    return (
        <div className="min-h-screen animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Area */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Student Hub</h1>
                    <p className="text-slate-400">Welcome, {user?.name || 'Student'}! Access your academic resources.</p>
                </div>
                {/* Aesthetic Logout Button */}
                <button
                    onClick={onLogout}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl border border-red-500/20 transition-all font-medium shadow-sm"
                >
                    <LogOut className="w-4 h-4" /> Logout
                </button>
            </div>

            {/* Desktop Navigation Tabs */}
            <div className="hidden md:flex flex-wrap gap-2 mb-8 p-1 bg-slate-900/40 backdrop-blur-md rounded-xl border border-white/5 w-fit">
                {navigation.map(item => {
                    const Icon = item.icon;
                    const isActive = view === item.key;
                    return (
                        <button
                            key={item.key}
                            onClick={() => setView(item.key)}
                            className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${isActive
                                ? 'bg-cyan-500/20 text-cyan-400 shadow-sm border border-cyan-500/30'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            {item.label}
                        </button>
                    );
                })}
            </div>

            {/* Mobile Navigation Dropdown (HRD Style) */}
            <div className="md:hidden mb-8">
                <div className="relative">
                    <Menu className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400 pointer-events-none" />
                    <select
                        value={view}
                        onChange={(e) => setView(e.target.value)}
                        className="w-full bg-slate-800/80 border border-cyan-500/30 rounded-xl py-3 pl-10 pr-4 text-white appearance-none outline-none focus:ring-2 focus:ring-cyan-500/50 shadow-lg font-semibold"
                    >
                        {navigation.map(item => (
                            <option key={item.key} value={item.key} className="bg-slate-900 text-white py-2">
                                {item.label}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
            </div>

            {/* Content Area */}
            <div className="min-h-[400px]">
                {renderView()}
            </div>
        </div>
    );
}


// --- NEW COMPONENT: Parent Contact Faculty (Chat Style) ---
function ParentContactFaculty({ user, showMessage, primaryButtonClass, buttonClass }) {
    const [professors, setProfessors] = useState([]);
    const [conversations, setConversations] = useState([]);
    const [activeThread, setActiveThread] = useState([]);
    const [selectedProf, setSelectedProf] = useState(null);
    const [replyText, setReplyText] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);

    // Auto-scroll
    const messagesEndRef = useRef(null);
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };
    useEffect(scrollToBottom, [activeThread]);

    // Fetch Professors & Previous Conversations
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [profsRes, convsRes] = await Promise.all([
                auth().get("/parent/professors"),
                auth().get("/parent/conversations")
            ]);
            setProfessors(profsRes.data.professors || []);
            setConversations(convsRes.data.conversations || []);
        } catch (e) {
            console.error(e);
            showMessage("Failed to load data.", "error");
        } finally {
            setIsLoading(false);
        }
    }, [showMessage]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const selectProfessor = async (prof) => {
        setSelectedProf(prof);
        setSidebarOpen(false); // Close mobile drawer
        try {
            const res = await auth().get(`/parent/messages/${prof.id}`);
            setActiveThread(res.data.messages || []);
            // Update local badge
            setConversations(prev => prev.map(c =>
                c.faculty_id === prof.id ? { ...c, unread_count: 0 } : c
            ));
        } catch (e) {
            // If no thread exists, that's fine, empty array
            setActiveThread([]);
        }
    };

    const handleSendMessage = async () => {
        if (!replyText.trim()) return;
        setIsSending(true);

        try {
            if (activeThread.length === 0) {
                // First message: standard /parent/contact-professor (Email + DB)
                // Default Subject: Extract first subject from allocation array
                const subjects = Array.isArray(selectedProf.allocations) ? selectedProf.allocations : [];
                const defaultSubject = subjects.length > 0 ? subjects[0] : "Parent Inquiry";

                await auth().post("/parent/contact-professor", {
                    professor_id: selectedProf.id,
                    subject: defaultSubject,
                    message: replyText
                });
            } else {
                // Follow-up: /parent/messages/reply (DB + Email)
                await auth().post("/parent/messages/reply", {
                    faculty_id: selectedProf.id,
                    reply_body: replyText
                });
            }

            // Optimistic Append
            const newMsg = {
                id: Date.now(),
                sender: 'parent',
                body: replyText,
                timestamp: new Date().toISOString()
            };
            setActiveThread(prev => [...prev, newMsg]);
            setReplyText("");
        } catch (e) {
            console.error(e);
            showMessage("Failed to send message.", "error");
        } finally {
            setIsSending(false);
        }
    };

    if (isLoading) return <div className="p-10 text-center"><Loader2 className="animate-spin w-8 h-8 mx-auto text-blue-500" /></div>;

    // Merge Professors list with Conversation metadata (badges, last msg)
    const displayList = professors.map(p => {
        const conv = conversations.find(c => c.faculty_id === p.id);
        return { ...p, ...conv };
    });

    return (
        <div className="flex h-[600px] gap-4 relative isolate overflow-hidden">
            {/* Sidebar (History Style) - Mobile Drawer / Desktop Static */}
            <div className={`
                absolute inset-y-0 left-0 z-50 h-full w-3/4 max-w-xs bg-slate-900/95 backdrop-blur-2xl border-r border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-transform duration-300 ease-out
                md:static md:w-1/4 md:bg-slate-900/60 md:shadow-none md:translate-x-0 md:backdrop-blur-xl md:border md:rounded-xl md:flex md:flex-col
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:w-0 md:border-0 md:p-0'}
            `}>
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-slate-900 to-slate-800/50">
                    <h5 className="font-bold text-slate-200 flex items-center gap-2">
                        <Mail className="w-4 h-4 text-blue-400" /> Contacts
                    </h5>
                    {/* Mobile Close Button */}
                    <button onClick={() => setSidebarOpen(false)} className="md:hidden p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-slate-900/50">
                    {displayList.map(p => (
                        <div
                            key={p.id}
                            onClick={() => selectProfessor(p)}
                            className={`p-3 rounded-xl text-sm cursor-pointer flex flex-col group transition-all border border-transparent ${selectedProf?.id === p.id
                                ? "bg-blue-600/20 text-blue-100 border-blue-500/30 shadow-sm"
                                : "text-slate-400 hover:bg-white/5 hover:text-slate-200"}`}
                        >
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-medium truncate">Prof. {p.name}</span>
                                {p.unread_count > 0 && (
                                    <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full shadow-lg shadow-blue-500/20">{p.unread_count}</span>
                                )}
                            </div>
                            <div className="text-[10px] opacity-60 truncate">
                                {p.allocations && p.allocations.length > 0 ? p.allocations[0] : "General Faculty"}
                            </div>
                        </div>
                    ))}
                    {displayList.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-500 gap-2 font-medium">
                            <Mail className="w-8 h-8 opacity-20" />
                            <span className="text-xs">No contacts available</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile Overlay for Sidebar */}
            {sidebarOpen && (
                <div
                    className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Main Chat Area */}
            <div className="flex-1 w-full flex flex-col bg-slate-900/60 backdrop-blur-xl border border-white/10 md:border-blue-500/20 rounded-xl overflow-hidden relative shadow-2xl">
                {selectedProf ? (
                    <>
                        {/* Header */}
                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-800/40 backdrop-blur-md z-10">
                            <div className="flex items-center text-blue-400 font-bold text-lg">
                                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="mr-3 p-1 rounded-lg hover:bg-white/5 transition-colors">
                                    <Menu className="w-6 h-6" />
                                </button>
                                <div className="flex flex-col leading-none">
                                    <span className="flex items-center gap-2">
                                        <User className="w-5 h-5 text-blue-400" />
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Prof. {selectedProf.name}</span>
                                    </span>
                                    <span className="text-[10px] font-normal text-slate-500 mt-1 hidden md:block">
                                        {selectedProf.allocations && selectedProf.allocations.length > 0 ? selectedProf.allocations.join(", ") : "Faculty Member"}
                                    </span>
                                </div>
                            </div>
                            <div className="text-xs font-medium px-3 py-1 bg-green-500/10 text-green-400 rounded-full border border-green-500/20">
                                Secure Channel
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div id="parent-chat-history" className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/30 scroll-smooth">
                            {activeThread.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-60">
                                    <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
                                        <Mail className="w-8 h-8 text-blue-400" />
                                    </div>
                                    <p className="text-sm font-medium">Start a conversation with Prof. {selectedProf.name}</p>
                                </div>
                            ) : (
                                activeThread.map((msg, idx) => {
                                    const isMe = msg.sender === 'parent';
                                    return (
                                        <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[85%] md:max-w-[75%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-md ${isMe
                                                ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white border border-blue-500/20 rounded-tr-none"
                                                : "bg-slate-800 text-slate-200 border border-white/5 rounded-tl-none"
                                                }`}>
                                                {!isMe && <div className="text-[10px] text-blue-400 mb-1 font-bold uppercase tracking-wider">Prof. {selectedProf.name}</div>}
                                                <div className="whitespace-pre-wrap">{msg.body}</div>
                                                <div className={`text-[10px] mt-1 opacity-50 ${isMe ? 'text-blue-100 text-right' : 'text-slate-400'}`}>
                                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area - Pinned Bottom */}
                        <div className="p-3 md:p-4 bg-slate-900 border-t border-white/10 z-20">
                            <div className="flex flex-col space-y-2 max-w-4xl mx-auto">
                                <div className="flex items-end gap-2 bg-slate-800/50 p-1.5 rounded-2xl border border-white/10 focus-within:ring-2 focus-within:ring-blue-500/50 focus-within:border-blue-500/50 transition-all shadow-sm">
                                    <div className="relative flex-grow">
                                        <textarea
                                            className="w-full py-3 px-4 bg-transparent border-none focus:ring-0 text-slate-200 placeholder:text-slate-500 text-base resize-none min-h-[48px] max-h-32"
                                            placeholder={`Message Prof. ${selectedProf.name}...`}
                                            value={replyText}
                                            onChange={e => setReplyText(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                                            rows={1}
                                        />
                                    </div>

                                    <button
                                        className={`p-3 rounded-xl transition-all duration-200 ${!replyText.trim()
                                            ? "bg-slate-700/50 text-slate-500 cursor-not-allowed"
                                            : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 active:scale-95"
                                            }`}
                                        onClick={handleSendMessage}
                                        disabled={isSending || !replyText.trim()}
                                    >
                                        {isSending ? <Loader2 className="animate-spin w-5 h-5" /> : <SendIcon className="w-5 h-5" />}
                                    </button>
                                </div>

                                <div className="text-[10px] text-center text-slate-600 font-medium">
                                    Synced via Email & NoteOrbit Portal
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-60">
                        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="absolute top-4 left-4 p-2 rounded-lg hover:bg-white/5 transition-colors text-slate-400">
                            <Menu className="w-6 h-6" />
                        </button>
                        <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
                            <Mail className="w-8 h-8 text-blue-400" />
                        </div>
                        <p className="text-sm font-medium">Select a faculty member to start messaging</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// Parent Panel (Reusing Student Components)
function ParentPanel({ user, showMessage, catalogs, buttonClass, primaryButtonClass, onLogout }) {
    const [view, setView] = useState('attendance');

    const navigation = [
        { key: 'attendance', label: 'Ward Attendance', icon: ClipboardList },
        { key: 'contact', label: 'Contact Faculty', icon: Mail },
        { key: 'marks', label: 'Academic Performance', icon: Award },
        { key: 'fees', label: 'Fee Payments', icon: IndianRupee },
        { key: 'feedback', label: 'Feedback', icon: MessageSquare },
        { key: 'complaints', label: 'Hostel Complaints', icon: Home },
        { key: 'insights', label: 'Academic Insights', icon: BrainCircuit },
    ];

    const renderView = () => {
        switch (view) {
            case 'attendance': return <StudentAttendanceCalendar showMessage={showMessage} primaryButtonClass={primaryButtonClass} buttonClass={buttonClass} />;
            case 'contact': return <ParentContactFaculty user={user} showMessage={showMessage} primaryButtonClass={primaryButtonClass} buttonClass={buttonClass} />;
            case 'marks': return <StudentMarks user={user} showMessage={showMessage} primaryButtonClass={primaryButtonClass} buttonClass={buttonClass} />;
            case 'fees': return <StudentFees user={user} showMessage={showMessage} primaryButtonClass={primaryButtonClass} buttonClass={buttonClass} />;
            case 'feedback': return <StudentFeedback showMessage={showMessage} />;
            case 'complaints': return <HostelComplaints showMessage={showMessage} primaryButtonClass={primaryButtonClass} buttonClass={buttonClass} />;
            case 'insights': return <AcademicInsights user={user} showMessage={showMessage} />;
            default: return <div className="p-8 text-center text-gray-500">Welcome, Parent! Select a module to begin.</div>;
        }
    };

    return (
        <div className="min-h-screen animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Area */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Parent Portal</h1>
                    <p className="text-slate-400">Viewing data for: <span className="text-white font-medium">{user.name.replace("'s Parent", "")}</span></p>
                </div>
                {/* Aesthetic Logout Button */}
                <button
                    onClick={onLogout}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl border border-red-500/20 transition-all font-medium shadow-sm"
                >
                    <LogOut className="w-4 h-4" /> Logout
                </button>
            </div>

            {/* Desktop Navigation Tabs */}
            <div className="hidden md:flex flex-wrap gap-2 mb-8 p-1 bg-slate-900/40 backdrop-blur-md rounded-xl border border-white/5 w-fit">
                {navigation.map(item => {
                    const Icon = item.icon;
                    const isActive = view === item.key;
                    return (
                        <button
                            key={item.key}
                            onClick={() => setView(item.key)}
                            className={`flex items-center gap-2 px-5 py-3 rounded-lg font-medium transition-all ${isActive
                                ? 'bg-cyan-500/20 text-cyan-400 shadow-sm border border-cyan-500/30'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            {item.label}
                        </button>
                    );
                })}
            </div>

            {/* Mobile Navigation Dropdown (HRD Style) */}
            <div className="md:hidden mb-8">
                <div className="relative">
                    <Menu className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400 pointer-events-none" />
                    <select
                        value={view}
                        onChange={(e) => setView(e.target.value)}
                        className="w-full bg-slate-800/80 border border-cyan-500/30 rounded-xl py-3 pl-10 pr-4 text-white appearance-none outline-none focus:ring-2 focus:ring-cyan-500/50 shadow-lg font-semibold"
                    >
                        {navigation.map(item => (
                            <option key={item.key} value={item.key} className="bg-slate-900 text-white py-2">
                                {item.label}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
            </div>

            {/* Content Area */}
            <div className="min-h-[400px]">
                {renderView()}
            </div>
        </div>
    );
}


// ----------------------------------------------
// --- MAIN APPLICATION ---
function App() {
    const [user, setUser, isLoading] = useLocalUser();
    const [page, setPage] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [authMode, setAuthMode] = useState("login");
    const [message, setMessage] = useState({ text: null, type: null });
    const [isLoginTransition, setIsLoginTransition] = useState(false); // NEW: Login Transition State
    const catalogs = useCatalogs();

    useEffect(() => {
        if (!isLoading) {
            if (user) {
                // Check if this is an HRD user (chro/trainer)
                const userRoleFromStorage = user.role;
                if (userRoleFromStorage === 'chro' || userRoleFromStorage === 'trainer' || userRoleFromStorage === 'hrd_trainer' || userRoleFromStorage === 'hrd') {
                    // Set userRole based on actual role from storage
                    const appRole = (userRoleFromStorage === 'trainer' || userRoleFromStorage === 'hrd_trainer') ? 'Trainer' : 'HRD';
                    setUserRole(appRole);
                    setPage('hrd-dashboard');
                } else {
                    setPage("dashboard");
                }
            } else {
                setPage("user_type");
            }
        }
    }, [user, isLoading]);

    // Scroll to top when page changes to credentials (fixes mobile scroll issue)
    useEffect(() => {
        if (page === 'credentials') {
            // Immediate scroll to top, then smooth scroll to form
            window.scrollTo({ top: 0, behavior: 'auto' });
            // Small delay to ensure DOM is ready, then scroll to credentials form
            setTimeout(() => {
                const credentialsForm = document.getElementById('credentials-form');
                if (credentialsForm) {
                    credentialsForm.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
                } else {
                    // Fallback: scroll window to top
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            }, 150);
        }
    }, [page]);

    const showMessage = (text, type = 'error') => setMessage({ text, type });
    const clearMessage = () => setMessage({ text: null, type: null });

    // Auto-dismiss alert after 3 seconds
    useEffect(() => {
        if (message.text) {
            const timer = setTimeout(() => {
                clearMessage();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    const getBackendRole = (uiRole) => {
        if (uiRole === 'Faculty') return 'professor';
        return uiRole ? uiRole.toLowerCase() : null;
    };

    const doLogin = async (identifier, password) => {
        clearMessage();
        const expectedRole = getBackendRole(userRole);
        if (!expectedRole) return showMessage("Please select a valid role first.", 'error');

        try {
            // Using unauth() for login/register endpoint.
            // Send proper payload based on role
            let payload = { password, role: expectedRole };
            payload.email = identifier; // Backend expects 'email' key even for SRN identifier for parents

            const res = await unauth().post("/login", payload);

            // 🔥 ADD THIS LINE
            console.log("BACKEND ROLE SAYS →", res.data.user.role);

            let { token, user: u } = res.data;

            u.degree = u.degree || "";
            u.semester = u.semester || 1;
            u.section = u.section || "";


            if (u.role !== expectedRole) {
                setAuthToken(null);
                localStorage.removeItem("noteorbit_user");
                throw new Error(`Access denied. You are logging in as a ${u.role}, not a ${expectedRole}.`);
            }
            if (u.role === "student" && u.status !== "APPROVED") {
                setAuthToken(null);
                localStorage.removeItem("noteorbit_user");
                throw new Error(`Account status: ${u.status}. Wait for admin approval.`);
            }

            // TRIGGER TRANSITION ANIMATION
            setIsLoginTransition(true);
            setTimeout(() => {
                setAuthToken(token);
                localStorage.setItem("noteorbit_user", JSON.stringify(u));
                setUser(u);
                showMessage("Logged in successfully.", 'success');
                setPage("dashboard");
                setIsLoginTransition(false);
            }, 2000); // 2 Second Wait Animation

        } catch (err) {
            // Note: Login/Register should not get a 401 error,  
            // but the general 4xx/5xx handling is still here.
            showMessage(err.response?.data?.message || err.message || "Login failed");
            throw err; // Re-throw so CredentialsView stops loading & doesn't vanish
        }
    };

    const doRegister = async (payload) => {
        clearMessage();
        try {
            // Using unauth() for login/register endpoint.
            const res = await unauth().post("/register", payload);
            showMessage(res.data.message, 'success');
            setAuthMode("login");
        } catch (err) {
            showMessage(err.response?.data?.message || "Registration failed");
        }
    };

    const doLogout = () => {
        localStorage.removeItem("noteorbit_user");
        setAuthToken(null);
        setUser(null);
        setPage("user_type");
        clearMessage();
    };

    const buttonClass = "w-full flex items-center justify-center px-4 py-3 font-semibold rounded-full shadow-md transition duration-200";
    const primaryButtonClass = "bg-blue-600 hover:bg-blue-700 text-white";
    const successButtonClass = "bg-green-600 hover:bg-green-700 text-white";
    const dangerButtonClass = "bg-red-600 hover:bg-red-700 text-white";


    // Scroll to top when page changes to credentials (fixes mobile scroll issue)
    useEffect(() => {
        if (page === 'credentials') {
            // Small delay to ensure DOM is ready
            setTimeout(() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                // Also scroll the main container if needed
                const mainContainer = document.querySelector('.min-h-screen');
                if (mainContainer) {
                    mainContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 100);
        }
    }, [page]);

    const renderContent = () => {
        if (isLoading || page === null) {
            return (
                <div className="text-center p-10 text-gray-500 flex justify-center items-center h-48">
                    <Loader2 className="animate-spin w-8 h-8 mr-3 text-blue-500" />
                    <span className="text-lg">Loading Session...</span>
                </div>
            );
        }

        if (page === 'dashboard' && !user) { setPage('user_type'); return <div className="text-center p-10 text-gray-500">Redirecting...</div>; }

        // HRD Portal Routing
        const hrdToken = localStorage.getItem('noteorbit_token');
        if ((userRole && (userRole === 'HRD' || userRole === 'Trainer')) || (userRole && userRole.ui === 'HRD')) {
            if (page === 'hrd-dashboard' && hrdToken) {
                return (
                    <div className="w-full max-w-5xl mx-auto animate-in fade-in duration-700">
                        <HRDDashboard userRole={userRole} token={hrdToken} setPage={setPage} setToken={() => { }} catalogs={catalogs} />
                    </div>
                );
            }
            return <HRDLogin setToken={() => { }} setPage={setPage} setUserRole={setUserRole} />;
        }

        switch (page) {
            case 'user_type':
                return (<UserTypeSelection setUserRole={setUserRole} setPage={setPage} buttonClass={buttonClass} primaryButtonClass={primaryButtonClass} />);
            case 'credentials':
                return (
                    <div key={authMode} className="animate-in fade-in slide-in-from-right-10 duration-500 w-full max-w-lg mx-auto" id="credentials-form">
                        <CredentialsView showMessage={showMessage} userRole={userRole} authMode={authMode} setAuthMode={setAuthMode} setPage={setPage} onLogin={doLogin} onRegister={doRegister} catalogs={catalogs} primaryButtonClass={primaryButtonClass} successButtonClass={successButtonClass} buttonClass={buttonClass} />
                    </div>
                );
            case "dashboard":
                return (
                    <div className="w-full max-w-5xl mx-auto animate-in fade-in duration-700">
                        {user.role === "admin" ? <AdminPanel user={user} showMessage={showMessage} catalogs={catalogs} buttonClass={buttonClass} primaryButtonClass={primaryButtonClass} dangerButtonClass={dangerButtonClass} onLogout={doLogout} /> :
                            user.role === "professor" ? <ProfessorPanel user={user} showMessage={showMessage} catalogs={catalogs} buttonClass={buttonClass} successButtonClass={successButtonClass} dangerButtonClass={dangerButtonClass} onLogout={doLogout} /> :
                                user.role === "student" ? <StudentPanel user={user} showMessage={showMessage} catalogs={catalogs} buttonClass={buttonClass} primaryButtonClass={primaryButtonClass} onLogout={doLogout} /> :
                                    user.role === "parent" ? <ParentPanel user={user} showMessage={showMessage} catalogs={catalogs} buttonClass={buttonClass} primaryButtonClass={primaryButtonClass} onLogout={doLogout} /> :
                                        <div className="card">Unknown role</div>}
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-transparent font-sans p-4 sm:p-8 text-white selection:bg-blue-500/30 selection:text-blue-200 relative overflow-x-hidden">
            {/* Global Background Elements */}
            <ParticleBackground />
            <div className="fixed inset-0 z-0 pointer-events-none">
                {/* <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] opacity-40 animate-pulse" /> */}
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] opacity-20" />
                {/* <div className="absolute top-[20%] right-[30%] w-[200px] h-[200px] bg-cyan-500/10 rounded-full blur-[80px]" /> */}
            </div>

            <div className="max-w-6xl mx-auto w-full relative z-10">
                <div className="header flex justify-between items-center p-6 bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/10 mb-8 sticky top-2 z-50 shadow-2xl">
                    <div className="flex flex-col">
                        <OrbitLogo />
                        {/* <div className="text-xs text-blue-300/80 ml-14 mt-1 font-medium tracking-wide">Smart University ERP Portal</div> */}
                    </div>
                    <div className="flex items-center space-x-3">
                        {user ? (
                            <span className="text-sm font-medium text-slate-300 mr-4 hidden sm:inline">{user.name} <span className="text-blue-400 uppercase">({user.role})</span></span>
                        ) : null}
                    </div>
                </div>

                {/* NEW: Login Transition Overlay */}
                {isLoginTransition && <WelcomeLoader />}

                <MessageBar message={message.text} type={message.type} onClose={clearMessage} />

                <div className="mt-6">
                    {renderContent()}
                </div>

                {/* Footer with About Section - Only show when not logged in AND not in HRD Dashboard */}
                {!user && page !== 'hrd-dashboard' && (
                    <footer className="mt-12 mb-8 pt-8 border-t border-white/10">
                        <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/10 p-6 sm:p-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                {/* About Section */}
                                <div>
                                    <h3 className="text-lg font-bold text-blue-400 mb-3 flex items-center">
                                        <Book className="w-5 h-5 mr-2" />
                                        About NoteOrbit
                                    </h3>
                                    <p className="text-sm text-slate-300 leading-relaxed">
                                        A comprehensive academic management system designed to streamline student-faculty interactions,
                                        manage academic resources, and enhance the learning experience.
                                    </p>
                                </div>

                                {/* Core Team Section */}
                                <div>
                                    <h3 className="text-lg font-bold text-emerald-400 mb-3 flex items-center">
                                        <User className="w-5 h-5 mr-2" />
                                        Core Development Team
                                    </h3>
                                    <div className="space-y-3 text-xs text-slate-300">
                                        <div>
                                            <div className="font-semibold text-emerald-300 mb-1">Sumit Kumar Sinha (3CSE37)</div>
                                            <div className="text-slate-400 pl-2">SRN: 24SUUBECS2175 •  Fullstack Developer, Database Designer</div>
                                        </div>
                                        <div>
                                            <div className="font-semibold text-emerald-300 mb-1">Satyam Kumar (3CSE32)</div>
                                            <div className="text-slate-400 pl-2">SRN: 24SUUBECS1906 • Backend Developer</div>
                                        </div>
                                        <div>
                                            <div className="font-semibold text-emerald-300 mb-1">Santosh Kumar Sah (3CSE32)</div>
                                            <div className="text-slate-400 pl-2">SRN: 24SUUBECS1895 • Frontend Developer, Bugs Analyst</div>
                                        </div>
                                        <div>
                                            <div className="font-semibold text-emerald-300 mb-1">Raushan Kumar (3CSE29)</div>
                                            <div className="text-slate-400 pl-2">SRN: 24SUUBECS1711 • UI/UX Designer, Developer</div>
                                        </div>
                                        <div>
                                            <div className="font-semibold text-emerald-300 mb-1">Satyam Kumar Thakur (3CSE32)</div>
                                            <div className="text-slate-400 pl-2">SRN: 24SUUBECS1908 • Bugs Analyst, UI/UX Tester</div>
                                        </div>
                                        <div>
                                            <div className="font-semibold text-emerald-300 mb-1">Abhishek H (1AIML01)</div>
                                            <div className="text-slate-400 pl-2">SRN: 25SUUBEAML009 • UI/UX Developer , Tester (Android Application)</div>
                                        </div>
                                    </div>
                                </div>

                                {/* College & Contact Section */}
                                <div>
                                    <h3 className="text-lg font-bold text-yellow-400 mb-3 flex items-center">
                                        <GraduationCap className="w-5 h-5 mr-2" />
                                        Institution & Contact
                                    </h3>
                                    <div className="space-y-3 text-sm text-slate-300">
                                        <div>
                                            <div className="font-semibold text-yellow-300 mb-1">Sapthagiri NPS University</div>
                                            <div className="text-slate-400 text-xs mb-2">Academic Year 2024-2028</div>
                                            <div className="flex items-start text-xs text-slate-400">
                                                <Home className="w-4 h-4 mr-2 mt-0.5 text-yellow-400 flex-shrink-0" />
                                                <span>#14/5, Chikkasandra, Hesarghatta Main Road, Bengaluru – 560057</span>
                                            </div>
                                        </div>
                                        <div className="pt-2 border-t border-white/5">
                                            <div className="flex items-start mb-2">
                                                <Mail className="w-4 h-4 mr-2 mt-0.5 text-yellow-400 flex-shrink-0" />
                                                <a href="mailto:info.noteorbit@gmail.com" className="text-blue-400 hover:text-blue-300 transition-colors break-all">
                                                    info.noteorbit@gmail.com
                                                </a>
                                            </div>
                                            <div className="flex items-center text-xs text-slate-400">
                                                <span className="mr-2">📞</span>
                                                <span>9771719891, 7033688853</span>
                                            </div>
                                        </div>

                                        <div className="pt-2 mt-2 border-t border-white/5">
                                            <a
                                                href="https://docs.google.com/forms/d/e/1FAIpQLSc4V44detvlfsLSphLF3-QsGM_zw0MQ4vYt4LVzMmhwBp1s5A/viewform"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center text-sm font-bold text-pink-400 hover:text-pink-300 transition-colors bg-pink-500/10 px-3 py-2 rounded-lg border border-pink-500/20 hover:bg-pink-500/20"
                                            >
                                                <MessageSquare className="w-4 h-4 mr-2" />
                                                Share Feedback
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Copyright & Branding */}
                            <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4">
                                <div className="text-xs text-slate-400 text-center sm:text-left">
                                    <p>© 2026 NoteOrbit Academic Management System</p>
                                    <p className="mt-1">Powered by <span className="text-blue-400 font-semibold">LeafCore Labs</span></p>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                    <span>Where Imagination is Redefined!</span>
                                </div>
                            </div>
                        </div>
                    </footer>
                )}
            </div>
        </div>
    );
}

export default App;