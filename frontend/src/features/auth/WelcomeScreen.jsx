import React, { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import {
    GraduationCap, ShieldCheck, Mail, Lock, User, Sparkles,
    ArrowRight, Loader2, BookOpen, Bot, BarChart3, ExternalLink,
    Building2, Zap, KeyRound, X, Key, ArrowLeft
} from "lucide-react";
import { Input, Select, OrbitLogo } from "../../components/ui";

export default function WelcomeScreen({
    userRole = "Student",
    setUserRole,
    authMode = "login",
    setAuthMode,
    onLogin,
    onRegister,
    showMessage,
    catalogs = {},
}) {
    // Student Login State
    const [loginEmail, setLoginEmail] = useState("");
    const [loginPassword, setLoginPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Student Registration State
    const { degrees = [], sections = [], fetchSections } = catalogs;
    const [srn, setSrn] = useState("");
    const [name, setName] = useState("");
    const [regEmail, setRegEmail] = useState("");
    const [regPassword, setRegPassword] = useState("");
    const [regConfirmPassword, setRegConfirmPassword] = useState("");
    const [degree, setDegree] = useState("");
    const [semester, setSemester] = useState("1");
    const [section, setSection] = useState("");

    // Admin Modal State
    const [showAdminModal, setShowAdminModal] = useState(false);
    const [adminIdentifier, setAdminIdentifier] = useState("");
    const [adminPassword, setAdminPassword] = useState("");
    const [isAdminSubmitting, setIsAdminSubmitting] = useState(false);

    // Animation Refs
    const leftHeroRef = useRef(null);
    const adminModalRef = useRef(null);

    // Entrance animation
    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.fromTo(
                leftHeroRef.current,
                { opacity: 0, x: -30 },
                { opacity: 1, x: 0, duration: 0.8, ease: "power3.out" }
            );
        });
        return () => ctx.revert();
    }, []);

    // Animate Admin Modal when opened
    useEffect(() => {
        if (showAdminModal && adminModalRef.current) {
            gsap.fromTo(
                adminModalRef.current,
                { opacity: 0, scale: 0.92, y: 20 },
                { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: "back.out(1.4)" }
            );
        }
    }, [showAdminModal]);

    // Fetch sections when degree/semester changes
    useEffect(() => {
        if (degree && semester && fetchSections) {
            fetchSections(degree, semester);
            setSection("");
        }
    }, [degree, semester, fetchSections]);

    // Password validation logic
    const validatePassword = (pwd) => {
        const minLength = pwd.length >= 8;
        const hasUpperCase = /[A-Z]/.test(pwd);
        const hasLowerCase = /[a-z]/.test(pwd);
        const hasNumber = /[0-9]/.test(pwd);
        const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd);

        return {
            isValid: minLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar,
            criteria: {
                minLength,
                hasUpperCase,
                hasLowerCase,
                hasNumber,
                hasSpecialChar,
            },
        };
    };

    const passwordRules = validatePassword(regPassword);

    // Student Login
    const handleStudentLogin = async (e) => {
        if (e) e.preventDefault();
        const emailTrim = loginEmail.trim();
        if (!emailTrim || !loginPassword) {
            return showMessage("Please enter your email/SRN and password.", "error");
        }

        setIsSubmitting(true);
        try {
            if (setUserRole) setUserRole("Student");
            await onLogin(emailTrim, loginPassword, "Student");
        } catch (err) {
            setIsSubmitting(false);
        }
    };

    // Student Register
    const handleStudentRegister = async (e) => {
        if (e) e.preventDefault();
        const trimmedEmail = regEmail.trim();
        const trimmedSrn = srn.trim();
        const trimmedName = name.trim();

        if (!trimmedEmail) return showMessage("Email is required.", "error");
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) return showMessage("Please enter a valid email address.", "error");
        if (!trimmedSrn) return showMessage("SRN is required.", "error");
        if (!trimmedName) return showMessage("Full Name is required.", "error");
        if (!regPassword) return showMessage("Password is required.", "error");
        if (!regConfirmPassword) return showMessage("Please confirm your password.", "error");
        if (!degree) return showMessage("Please select a degree.", "error");
        if (!semester) return showMessage("Please select a semester.", "error");
        if (!section) return showMessage("Please select a section.", "error");

        if (!passwordRules.isValid) {
            return showMessage("Password does not meet the security requirements.", "error");
        }

        if (regPassword !== regConfirmPassword) {
            return showMessage("Passwords do not match.", "error");
        }

        setIsSubmitting(true);
        try {
            await onRegister({
                srn: trimmedSrn,
                name: trimmedName,
                email: trimmedEmail,
                password: regPassword,
                degree,
                semester: parseInt(semester, 10),
                section,
                role: "student",
            });
            setIsSubmitting(false);
            setAuthMode("login");
            setLoginEmail(trimmedEmail);
            setLoginPassword("");
        } catch (err) {
            setIsSubmitting(false);
        }
    };

    // Admin Login Handler
    const handleAdminLogin = async (e) => {
        if (e) e.preventDefault();
        const identTrim = adminIdentifier.trim();
        if (!identTrim || !adminPassword) {
            return showMessage("Please enter admin identifier and password.", "error");
        }

        setIsAdminSubmitting(true);
        try {
            if (setUserRole) setUserRole("Admin");
            await onLogin(identTrim, adminPassword, "Admin");
        } catch (err) {
            setIsAdminSubmitting(false);
        }
    };

    // Pre-fill demo admin credentials helper
    const fillAdminDemo = () => {
        setAdminIdentifier("admin");
        setAdminPassword("admin");
        showMessage("Pre-filled default admin credentials (admin / admin)", "info");
    };

    return (
        <div className="w-full h-full min-h-screen lg:min-h-0 lg:h-full flex flex-col px-3 sm:px-5 lg:px-8 py-2 sm:py-2.5 overflow-y-auto lg:overflow-hidden">

            {/* =========================================================================
                TOP BAR: NoteOrbit Brand + Top-Right Admin Login Trigger
               ========================================================================= */}
            <header className="flex-shrink-0 flex items-center justify-between gap-3 pb-2.5 border-b border-white/10 w-full mb-2">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
                    <OrbitLogo />
                    <div className="hidden xl:inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/60 border border-blue-500/30 text-blue-300 text-xs font-semibold backdrop-blur-md">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                        <span>v2.3 ERP • Campus Portal Active</span>
                    </div>

                    {/* Partner Pill 1: LeafCore Labs */}
                    <a
                        href="https://leafcorelabs.in"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/30 text-emerald-300 text-xs font-semibold backdrop-blur-md transition-all hover:border-emerald-400/50 hover:scale-[1.02] shadow-sm"
                        title="LeafCore Labs — We write code. It writes the future."
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>LeafCore Labs</span>
                        <ExternalLink className="w-3 h-3 opacity-70" />
                    </a>

                    {/* Partner Pill 2: Being That Crew (BTC) */}
                    <a
                        href="https://beingthatcrew.in"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/30 text-cyan-300 text-xs font-semibold backdrop-blur-md transition-all hover:border-cyan-400/50 hover:scale-[1.02] shadow-sm"
                        title="Being That Crew (BTC) — Write code. Break things. Ship the lore."
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        <span>Being That Crew · BTC</span>
                        <ExternalLink className="w-3 h-3 opacity-70" />
                    </a>
                </div>

                {/* Top Right Admin Login Button */}
                <button
                    type="button"
                    onClick={() => setShowAdminModal(true)}
                    className="flex-shrink-0 group relative inline-flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-2xl bg-slate-900/60 hover:bg-slate-800/80 active:scale-95 border border-white/15 hover:border-amber-400/50 backdrop-blur-2xl shadow-lg shadow-black/30 text-slate-200 hover:text-white text-xs sm:text-sm font-semibold transition-all duration-300"
                >
                    <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-110 group-hover:bg-amber-500/30 transition-all">
                        <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                    <span>Admin Login</span>
                    <span className="hidden sm:inline text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        Staff
                    </span>
                </button>
            </header>


            {/* =========================================================================
                MAIN CONTENT: Mobile = auth card first, data below. Desktop = 60/40 split.
               ========================================================================= */}
            <main className="flex-1 min-h-0 flex flex-col lg:flex-row items-stretch lg:items-center gap-4 lg:gap-6 xl:gap-10 w-full lg:my-auto py-2">

                {/* =========================================================================
                    AUTH CARD COLUMN — order-first on mobile, order-last on desktop (right 40%)
                   ========================================================================= */}
                <div className="w-full lg:w-[42%] xl:w-[40%] flex flex-col justify-center items-center lg:items-end flex-shrink-0 order-first lg:order-last">
                    {/* 3D Perspective Wrapper */}
                    <div style={{ perspective: "1400px" }} className="w-full max-w-md lg:max-w-lg xl:max-w-xl">
                        <div
                            style={{
                                transformStyle: "preserve-3d",
                                transform: authMode === "register" ? "rotateY(180deg)" : "rotateY(0deg)",
                                transition: "transform 0.7s cubic-bezier(0.4, 0.2, 0.2, 1)",
                            }}
                            className="relative w-full"
                        >

                            {/* =====================================================================
                                FRONT FACE: Student Sign In
                               ===================================================================== */}
                            <div
                                style={{
                                    backfaceVisibility: "hidden",
                                    WebkitBackfaceVisibility: "hidden",
                                    transform: "rotateY(0deg)",
                                }}
                                className={`${
                                    authMode === "register"
                                        ? "absolute inset-0 pointer-events-none opacity-0"
                                        : "relative opacity-100"
                                } w-full rounded-3xl p-5 sm:p-6 backdrop-blur-3xl bg-white/[0.04] border border-white/[0.12] shadow-[0_8px_40px_-8px_rgba(0,100,255,0.2),inset_0_1px_0_0_rgba(255,255,255,0.06)] overflow-hidden transition-opacity duration-300 flex flex-col justify-between`}
                            >
                                {/* Ambient Glass Back-glows */}
                                <div className="pointer-events-none absolute -top-24 -right-24 w-56 h-56 bg-blue-500/15 rounded-full blur-[80px]" />
                                <div className="pointer-events-none absolute -bottom-24 -left-24 w-56 h-56 bg-cyan-500/10 rounded-full blur-[80px]" />

                                {/* Top Highlight Beam */}
                                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-400/80 to-transparent" />

                                <div>
                                    {/* Student Gateway Header */}
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shadow-lg shadow-blue-500/10">
                                            <GraduationCap className="w-5 h-5 stroke-[2]" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                                                <span>Student Gateway</span>
                                                <Sparkles className="w-3.5 h-3.5 text-blue-400/80" />
                                            </h2>
                                            <p className="text-[11px] text-slate-400 mt-0.5">
                                                Lecture notes, real-time academics & AI
                                            </p>
                                        </div>
                                    </div>

                                    {/* Segmented Switcher */}
                                    <div className="mb-4 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex">
                                        <button
                                            type="button"
                                            className="flex-1 py-2 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/25"
                                        >
                                            Sign In
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setAuthMode("register")}
                                            className="flex-1 py-2 rounded-xl font-bold text-xs sm:text-sm text-slate-400 hover:text-white hover:bg-white/[0.04] transition-all"
                                        >
                                            Create Account
                                        </button>
                                    </div>

                                    {/* Sign In Form */}
                                    <form onSubmit={handleStudentLogin} className="space-y-3.5">
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-xs font-semibold text-slate-300 mb-1 block">
                                                    Student Email Address or SRN
                                                </label>
                                                <Input
                                                    icon={Mail}
                                                    type="text"
                                                    placeholder="e.g. 24SUUBECS2175 or email@domain.com"
                                                    value={loginEmail}
                                                    onChange={(e) => setLoginEmail(e.target.value)}
                                                    autoComplete="username"
                                                    required
                                                />
                                            </div>

                                            <div>
                                                <label className="text-xs font-semibold text-slate-300 mb-1 block">
                                                    Password
                                                </label>
                                                <Input
                                                    icon={Lock}
                                                    type="password"
                                                    placeholder="••••••••"
                                                    value={loginPassword}
                                                    onChange={(e) => setLoginPassword(e.target.value)}
                                                    autoComplete="current-password"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="pt-1">
                                            <button
                                                type="submit"
                                                disabled={isSubmitting}
                                                className="w-full py-3 px-6 rounded-2xl font-bold text-sm tracking-wide transition-all duration-300 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:via-indigo-500 hover:to-cyan-400 text-white shadow-xl shadow-blue-500/20 active:scale-[0.99] border border-white/15"
                                            >
                                                {isSubmitting ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        <span>Authenticating...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span>Sign In as Student</span>
                                                        <ArrowRight className="w-4 h-4" />
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                {/* Front Face Bottom */}
                                <div className="pt-3 mt-2 border-t border-white/[0.06] text-center space-y-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setAuthMode("register")}
                                        className="text-xs text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1.5 transition-colors"
                                    >
                                        <span>New to NoteOrbit? Create an account</span>
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                    <p className="text-[10px] text-slate-500 flex items-center justify-center gap-1.5">
                                        <ShieldCheck className="w-3 h-3 text-blue-500/60" />
                                        <span>Authenticated via Student Registration Number</span>
                                    </p>
                                </div>
                            </div>


                            {/* =====================================================================
                                BACK FACE: Student Registration
                               ===================================================================== */}
                            <div
                                style={{
                                    backfaceVisibility: "hidden",
                                    WebkitBackfaceVisibility: "hidden",
                                    transform: "rotateY(180deg)",
                                }}
                                className={`${
                                    authMode === "login"
                                        ? "absolute inset-0 pointer-events-none opacity-0"
                                        : "relative opacity-100"
                                } w-full rounded-3xl p-5 sm:p-6 backdrop-blur-3xl bg-white/[0.04] border border-white/[0.12] shadow-[0_8px_40px_-8px_rgba(16,185,129,0.2),inset_0_1px_0_0_rgba(255,255,255,0.06)] overflow-hidden transition-opacity duration-300 flex flex-col justify-between`}
                            >
                                {/* Ambient Glass Back-glows */}
                                <div className="pointer-events-none absolute -top-24 -left-24 w-56 h-56 bg-emerald-500/15 rounded-full blur-[80px]" />
                                <div className="pointer-events-none absolute -bottom-24 -right-24 w-56 h-56 bg-teal-500/10 rounded-full blur-[80px]" />

                                {/* Top Highlight Beam */}
                                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400/80 to-transparent" />

                                <div>
                                    {/* Register Header */}
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shadow-lg shadow-emerald-500/10">
                                            <GraduationCap className="w-5 h-5 stroke-[2]" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                                                <span>Student Registration</span>
                                                <Sparkles className="w-3.5 h-3.5 text-emerald-400/80" />
                                            </h2>
                                            <p className="text-[11px] text-slate-400">
                                                Create your student account
                                            </p>
                                        </div>
                                    </div>

                                    {/* Segmented Switcher */}
                                    <div className="mb-3 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex">
                                        <button
                                            type="button"
                                            onClick={() => setAuthMode("login")}
                                            className="flex-1 py-1.5 rounded-xl font-bold text-xs sm:text-sm text-slate-400 hover:text-white hover:bg-white/[0.04] transition-all"
                                        >
                                            Sign In
                                        </button>
                                        <button
                                            type="button"
                                            className="flex-1 py-1.5 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25"
                                        >
                                            Create Account
                                        </button>
                                    </div>

                                    {/* Registration Form */}
                                    <form onSubmit={handleStudentRegister} className="space-y-2">
                                        <div>
                                            <Input
                                                icon={Mail}
                                                type="email"
                                                placeholder="University Email Address *"
                                                value={regEmail}
                                                onChange={(e) => setRegEmail(e.target.value)}
                                                className="!py-2 !text-xs sm:!text-sm"
                                                required
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <Input
                                                placeholder="SRN Number *"
                                                value={srn}
                                                onChange={(e) => setSrn(e.target.value)}
                                                className="!py-2 !text-xs sm:!text-sm"
                                                required
                                            />
                                            <Input
                                                icon={User}
                                                placeholder="Full Name *"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="!py-2 !text-xs sm:!text-sm"
                                                required
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <Input
                                                icon={Lock}
                                                type="password"
                                                placeholder="Password *"
                                                value={regPassword}
                                                onChange={(e) => setRegPassword(e.target.value)}
                                                className="!py-2 !text-xs sm:!text-sm"
                                                required
                                            />
                                            <Input
                                                icon={Lock}
                                                type="password"
                                                placeholder="Confirm Password *"
                                                value={regConfirmPassword}
                                                onChange={(e) => setRegConfirmPassword(e.target.value)}
                                                className="!py-2 !text-xs sm:!text-sm"
                                                required
                                            />
                                        </div>

                                        {/* Password Criteria Chips */}
                                        <div className="flex flex-wrap items-center justify-between gap-1 py-1 px-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-[10px]">
                                            <span className={`inline-flex items-center gap-1 ${passwordRules.criteria.minLength ? "text-emerald-400 font-bold" : "text-slate-500"}`}>
                                                {passwordRules.criteria.minLength ? "✓" : "○"} 8+ chars
                                            </span>
                                            <span className={`inline-flex items-center gap-1 ${passwordRules.criteria.hasUpperCase ? "text-emerald-400 font-bold" : "text-slate-500"}`}>
                                                {passwordRules.criteria.hasUpperCase ? "✓" : "○"} A-Z
                                            </span>
                                            <span className={`inline-flex items-center gap-1 ${passwordRules.criteria.hasLowerCase ? "text-emerald-400 font-bold" : "text-slate-500"}`}>
                                                {passwordRules.criteria.hasLowerCase ? "✓" : "○"} a-z
                                            </span>
                                            <span className={`inline-flex items-center gap-1 ${passwordRules.criteria.hasNumber ? "text-emerald-400 font-bold" : "text-slate-500"}`}>
                                                {passwordRules.criteria.hasNumber ? "✓" : "○"} 0-9
                                            </span>
                                            <span className={`inline-flex items-center gap-1 ${passwordRules.criteria.hasSpecialChar ? "text-emerald-400 font-bold" : "text-slate-500"}`}>
                                                {passwordRules.criteria.hasSpecialChar ? "✓" : "○"} Special
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2">
                                            <Select
                                                value={degree}
                                                onChange={(e) => setDegree(e.target.value)}
                                                className="!py-2 !text-xs sm:!text-sm !px-2"
                                                required
                                            >
                                                <option value="" className="text-gray-900">Degree</option>
                                                {(degrees || []).map((d) => (
                                                    <option key={d} value={d} className="text-gray-900">{d}</option>
                                                ))}
                                            </Select>

                                            <Select
                                                value={semester}
                                                onChange={(e) => setSemester(e.target.value)}
                                                className="!py-2 !text-xs sm:!text-sm !px-2"
                                                required
                                            >
                                                <option value="" className="text-gray-900">Sem</option>
                                                {Array.from({ length: 8 }, (_, i) => i + 1).map((s) => (
                                                    <option key={s} value={s} className="text-gray-900">Sem {s}</option>
                                                ))}
                                            </Select>

                                            <Select
                                                value={section}
                                                onChange={(e) => setSection(e.target.value)}
                                                className="!py-2 !text-xs sm:!text-sm !px-2"
                                                required
                                                disabled={!sections || sections.length === 0}
                                            >
                                                <option value="" className="text-gray-900">Sec</option>
                                                {(sections || []).map((s) => (
                                                    <option key={s} value={s} className="text-gray-900">Sec {s}</option>
                                                ))}
                                            </Select>
                                        </div>

                                        <div className="pt-0.5">
                                            <button
                                                type="submit"
                                                disabled={isSubmitting}
                                                className="w-full py-2.5 px-6 rounded-2xl font-bold text-sm tracking-wide transition-all duration-300 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-xl shadow-emerald-500/20 active:scale-[0.99] border border-white/15"
                                            >
                                                {isSubmitting ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        <span>Submitting...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span>Complete Registration</span>
                                                        <ArrowRight className="w-4 h-4" />
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                {/* Back Face Bottom */}
                                <div className="pt-2 mt-1 border-t border-white/[0.06] text-center">
                                    <button
                                        type="button"
                                        onClick={() => setAuthMode("login")}
                                        className="text-xs text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1.5 transition-colors"
                                    >
                                        <ArrowLeft className="w-3.5 h-3.5" />
                                        <span>Already registered? Sign in</span>
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                {/* =========================================================================
                    SHOWCASE COLUMN — order-last on mobile (below card), order-first on desktop (left 60%)
                   ========================================================================= */}
                <div
                    ref={leftHeroRef}
                    className="w-full lg:w-[58%] xl:w-[60%] flex flex-col justify-center order-last lg:order-first"
                >

                    {/* ============================
                        MOBILE COMPACT SHOWCASE
                       ============================ */}
                    <div className="lg:hidden space-y-3">
                        {/* Compact Headline */}
                        <div className="text-center space-y-1">
                            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                                Academic Intelligence,{" "}
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                                    Reimagined.
                                </span>
                            </h1>
                            <p className="text-[11px] sm:text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                                Sapthagiri NPS University's cohesive academic ecosystem — notes, attendance, AI tutoring & governance.
                            </p>
                        </div>

                        {/* 3 Feature Chips - Horizontal */}
                        <div className="flex items-stretch gap-2">
                            {[
                                { icon: BookOpen, label: "Smart Notes", color: "cyan" },
                                { icon: Bot, label: "OrbitBot AI", color: "purple" },
                                { icon: BarChart3, label: "Live Data", color: "emerald" },
                            ].map(({ icon: Icon, label, color }) => (
                                <div key={label} className="flex-1 flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl">
                                    <Icon className={`w-4 h-4 text-${color}-400`} />
                                    <span className="text-[10px] font-semibold text-slate-300">{label}</span>
                                </div>
                            ))}
                        </div>

                        {/* Security + SLA Strip */}
                        <div className="flex items-center justify-center gap-4 py-1.5 text-[10px] text-slate-500">
                            <span className="flex items-center gap-1"><Lock className="w-3 h-3 text-blue-400/60" />Encrypted</span>
                            <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-emerald-400/60" />Zero-Trust</span>
                            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />99.98% SLA</span>
                        </div>

                        {/* Compact Co-Branding Row */}
                        <div className="flex items-center gap-2">
                            <a href="https://leafcorelabs.in" target="_blank" rel="noopener noreferrer"
                               className="flex-1 flex items-center gap-2 py-2 px-2.5 rounded-xl bg-white/[0.03] border border-white/[0.07] hover:border-emerald-500/30 transition-all">
                                <div className="w-5 h-5 rounded bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-[8px] font-black flex-shrink-0">LC</div>
                                <span className="text-[10px] font-semibold text-slate-300 truncate">LeafCore Labs</span>
                            </a>
                            <span className="text-[10px] text-slate-600">×</span>
                            <a href="https://beingthatcrew.in" target="_blank" rel="noopener noreferrer"
                               className="flex-1 flex items-center gap-2 py-2 px-2.5 rounded-xl bg-white/[0.03] border border-white/[0.07] hover:border-cyan-500/30 transition-all">
                                <div className="w-5 h-5 rounded bg-cyan-500/20 flex items-center justify-center text-cyan-400 text-[8px] font-black font-mono flex-shrink-0">BTC</div>
                                <span className="text-[10px] font-semibold text-slate-300 truncate">Being That Crew</span>
                            </a>
                        </div>
                    </div>

                    {/* ============================
                        DESKTOP FULL SHOWCASE (lg+)
                       ============================ */}
                    <div className="hidden lg:flex flex-col space-y-3.5 xl:space-y-4">
                        {/* Grand Headline */}
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold backdrop-blur-md">
                                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                                <span>Sapthagiri NPS University • Official Academic Ecosystem</span>
                            </div>
                            <h1 className="text-3xl lg:text-4xl xl:text-5xl font-black text-white tracking-tight leading-[1.14]">
                                Academic Intelligence,{" "}
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-300 drop-shadow-[0_0_35px_rgba(59,130,246,0.3)]">
                                    Reimagined.
                                </span>
                            </h1>
                            <p className="text-[15px] xl:text-base text-slate-400 leading-relaxed max-w-2xl">
                                Where Imagination is Redefined. A cohesive, high-performance academic ecosystem orchestrating verified course materials, real-time attendance telemetry, autonomous AI tutoring, and administrative governance for <span className="text-white font-semibold">Sapthagiri NPS University</span>.
                            </p>
                        </div>

                        {/* 3 Pillar Cards */}
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { icon: BookOpen, title: "Smart Notes Hub", desc: "Peer-reviewed syllabus notes, question banks & verified digital uploads.", color: "cyan", tag: "Syllabus" },
                                { icon: Bot, title: "OrbitBot AI", desc: "Autonomous 24/7 academic copilot for real-time exam preparation & inquiries.", color: "purple", tag: "Copilot" },
                                { icon: BarChart3, title: "Live Academics", desc: "Real-time attendance metrics, hostel bookings & encrypted fee checkout.", color: "emerald", tag: "Real-time" },
                            ].map(({ icon: Icon, title, desc, color, tag }) => (
                                <div key={title} className={`group relative p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-${color}-400/40 backdrop-blur-2xl transition-all duration-300 hover:shadow-xl hover:shadow-${color}-500/10`}>
                                    <div className="flex items-center justify-between mb-2.5">
                                        <div className={`w-9 h-9 rounded-xl bg-${color}-500/15 border border-${color}-400/30 flex items-center justify-center text-${color}-400 group-hover:scale-110 transition-transform`}>
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <span className={`text-[10px] font-mono tracking-wider px-2 py-0.5 rounded-md bg-${color}-500/10 text-${color}-400 border border-${color}-500/20`}>
                                            {tag}
                                        </span>
                                    </div>
                                    <h2 className="text-sm font-bold text-white mb-1">{title}</h2>
                                    <p className="text-xs text-slate-400 leading-snug">{desc}</p>
                                </div>
                            ))}
                        </div>

                        {/* Telemetry Strip */}
                        <div className="flex flex-wrap items-center justify-between gap-y-1.5 gap-x-4 py-2 px-4 rounded-2xl bg-white/[0.02] border border-white/[0.07] text-xs text-slate-400 backdrop-blur-md">
                            <span className="flex items-center gap-1.5">
                                <Zap className="w-4 h-4 text-cyan-400/70" />
                                <span>High-Speed Resource Indexing</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Lock className="w-4 h-4 text-blue-400/70" />
                                <span>End-to-End Encrypted</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                                <ShieldCheck className="w-4 h-4 text-emerald-400/70" />
                                <span>Zero-Trust Architecture</span>
                            </span>
                            <span className="flex items-center gap-1.5 text-slate-500">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                <span>99.98% SLA</span>
                            </span>
                        </div>

                        {/* Dual-Branding Showcase */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-slate-500 font-semibold">
                                    // CO-ENGINEERED BY
                                </span>
                                <span className="h-px flex-1 bg-white/[0.06]" />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {/* LeafCore Labs */}
                                <a
                                    href="https://leafcorelabs.in"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group relative p-3.5 rounded-2xl bg-white/[0.02] hover:bg-emerald-950/30 border border-white/[0.07] hover:border-emerald-500/40 backdrop-blur-2xl transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/10"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black text-xs">
                                                LC
                                            </div>
                                            <span className="font-bold text-white text-sm group-hover:text-emerald-300 transition-colors">
                                                LeafCore Labs
                                            </span>
                                        </div>
                                        <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                            AI & EdTech
                                        </span>
                                    </div>
                                    <p className="text-xs font-semibold text-emerald-400/80 italic mb-1">
                                        "We write code. It writes the future."
                                    </p>
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                        Engineering Intelligent Automation. Powering multi-agent systems (Helix OS, Sentri-X), AI platforms & next-gen EdTech.
                                    </p>
                                    <div className="mt-2.5 pt-1.5 border-t border-white/[0.06] flex items-center justify-between text-xs text-emerald-400/80 font-medium">
                                        <span>leafcorelabs.in</span>
                                        <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                                    </div>
                                </a>

                                {/* Being That Crew */}
                                <a
                                    href="https://beingthatcrew.in"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group relative p-3.5 rounded-2xl bg-white/[0.02] hover:bg-cyan-950/30 border border-white/[0.07] hover:border-cyan-500/40 backdrop-blur-2xl transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-black text-xs font-mono">
                                                BTC
                                            </div>
                                            <span className="font-bold text-white text-sm group-hover:text-cyan-300 transition-colors">
                                                Being That Crew
                                            </span>
                                        </div>
                                        <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                            Builder Crew
                                        </span>
                                    </div>
                                    <p className="text-xs font-semibold text-cyan-400/80 italic mb-1">
                                        "Write code. Break things. Ship the lore."
                                    </p>
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                        SNPSU's elite builder syndicate for people who say "one last commit" and see the sun come up. Hack, build, deploy & ship.
                                    </p>
                                    <div className="mt-2.5 pt-1.5 border-t border-white/[0.06] flex items-center justify-between text-xs text-cyan-400/80 font-medium">
                                        <span>beingthatcrew.in</span>
                                        <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                                    </div>
                                </a>
                            </div>
                        </div>
                    </div>

                </div>

            </main>

            {/* =========================================================================
                FOOTER
               ========================================================================= */}
            <footer className="flex-shrink-0 mt-auto pt-2 border-t border-white/[0.06] w-full">
                {/* Desktop Footer */}
                <div className="hidden lg:flex items-center justify-between gap-2 text-[11px] text-slate-500 py-1">
                    <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-yellow-400/70" />
                        <span className="text-yellow-300/80 font-semibold">Sapthagiri NPS University</span>
                        <span className="hidden xl:inline">• Chikkasandra, Hesarghatta Main Road, Bengaluru – 560057</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span>© 2026 NoteOrbit</span>
                        <span>•</span>
                        <span>Powered by <a href="https://leafcorelabs.in" target="_blank" rel="noopener noreferrer" className="text-emerald-400/80 hover:text-emerald-300 font-semibold">LeafCore Labs</a></span>
                        <span>×</span>
                        <a href="https://beingthatcrew.in" target="_blank" rel="noopener noreferrer" className="text-cyan-400/80 hover:text-cyan-300 font-semibold">BTC</a>
                        <a
                            href="https://docs.google.com/forms/d/e/1FAIpQLSc4V44detvlfsLSphLF3-QsGM_zw0MQ4vYt4LVzMmhwBp1s5A/viewform"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-pink-500/10 text-pink-300/80 border border-pink-500/20 hover:bg-pink-500/20 transition-all font-medium"
                        >
                            <ExternalLink className="w-2.5 h-2.5" />
                            Feedback
                        </a>
                    </div>
                </div>

                {/* Mobile Footer */}
                <div className="lg:hidden flex items-center justify-between text-[10px] text-slate-500 py-1.5">
                    <div className="flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-yellow-400/60" />
                        <span className="text-yellow-300/70 font-semibold">SNPSU</span>
                        <span>• © 2026</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <a href="https://leafcorelabs.in" target="_blank" rel="noopener noreferrer" className="text-emerald-400/70 font-semibold">LeafCore</a>
                        <span>×</span>
                        <a href="https://beingthatcrew.in" target="_blank" rel="noopener noreferrer" className="text-cyan-400/70 font-semibold">BTC</a>
                    </div>
                </div>
            </footer>

            {/* =========================================================================
                ADMIN LOGIN MODAL
               ========================================================================= */}
            {showAdminModal && (
                <div
                    className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4"
                    onClick={() => setShowAdminModal(false)}
                >
                    <div
                        ref={adminModalRef}
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-full max-w-md rounded-3xl p-6 sm:p-8 backdrop-blur-3xl bg-white/[0.05] border border-amber-500/20 shadow-[0_0_60px_-10px_rgba(245,158,11,0.25),inset_0_1px_0_0_rgba(255,255,255,0.06)] overflow-hidden"
                    >
                        {/* Top Amber Beam */}
                        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/80 to-transparent" />

                        {/* Modal Header */}
                        <div className="flex items-center justify-between mb-6 pb-3 border-b border-white/[0.06]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                                    <ShieldCheck className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white tracking-tight">Admin Console</h3>
                                    <p className="text-xs text-amber-400/70">Authorized Staff Personnel Only</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowAdminModal(false)}
                                className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Admin Form */}
                        <form onSubmit={handleAdminLogin} className="space-y-4">
                            <div>
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="text-xs font-semibold text-slate-300 block">
                                        Admin Identifier
                                    </label>
                                    <button
                                        type="button"
                                        onClick={fillAdminDemo}
                                        className="text-[11px] text-amber-400/80 hover:text-amber-300 font-medium flex items-center gap-1 transition-colors"
                                    >
                                        <KeyRound className="w-3 h-3" />
                                        <span>Fill Demo (admin/admin)</span>
                                    </button>
                                </div>
                                <Input
                                    icon={User}
                                    type="text"
                                    placeholder="admin"
                                    value={adminIdentifier}
                                    onChange={(e) => setAdminIdentifier(e.target.value)}
                                    autoComplete="username"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                                    Master Password
                                </label>
                                <Input
                                    icon={Lock}
                                    type="password"
                                    placeholder="••••••••"
                                    value={adminPassword}
                                    onChange={(e) => setAdminPassword(e.target.value)}
                                    autoComplete="current-password"
                                    required
                                />
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isAdminSubmitting}
                                    className="w-full py-3.5 px-6 rounded-2xl font-bold text-sm tracking-wide transition-all duration-300 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-500 hover:from-amber-500 hover:via-orange-500 hover:to-amber-400 text-white shadow-xl shadow-amber-500/20 active:scale-[0.99] border border-white/15"
                                >
                                    {isAdminSubmitting ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span>Authenticating...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Key className="w-4 h-4" />
                                            <span>Authenticate Master Console</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            <p className="text-[11px] text-center text-slate-500 pt-1">
                                Multi-Tenant Governance • IP Logged & Monitored
                            </p>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
