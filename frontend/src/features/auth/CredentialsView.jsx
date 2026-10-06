import React, { useEffect, useState, useRef } from "react";
import gsap from "gsap";
import { ArrowLeft, Loader2, Mail, Lock } from "lucide-react";
import { unauth } from "../../api";
import { Input, Select } from "../../components/ui";

export default function CredentialsView({ onLogin, onRegister, showMessage, userRole, setPage, catalogs, primaryButtonClass, successButtonClass, buttonClass, authMode, setAuthMode }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // Registration States
    const { degrees, sections } = catalogs;
    const [srn, setSrn] = useState("");
    const [name, setName] = useState("");
    const [regEmail, setRegEmail] = useState("");
    const [regPassword, setRegPassword] = useState("");
    const [regConfirmPassword, setRegConfirmPassword] = useState("");
    const [degree, setDegree] = useState("");
    const [semester, setSemester] = useState("1");
    const [section, setSection] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const isStudent = userRole === 'Student';

    // Refs for Animation
    const cardRef = useRef(null);
    const titleRef = useRef(null);
    const formRef = useRef(null);

    // GSAP Entrance Animation
    useEffect(() => {
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
    }, [authMode]);

    // FETCH SECTIONS WHEN DEGREE/SEMESTER CHANGES
    useEffect(() => {
        if (degree && semester && catalogs.fetchSections) {
            catalogs.fetchSections(degree, semester);
            setSection(""); // Reset section selection
        }
    }, [degree, semester, catalogs.fetchSections]);

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
        if (!regEmail || !regEmail.trim()) return showMessage("Email is required.", "error");
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(regEmail)) return showMessage("Please enter a valid email address.", "error");
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

        onRegister({ srn, name, email: regEmail, password: regPassword, degree, semester: parseInt(semester), section, role: userRole.toLowerCase() });
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
                            <div className="space-y-4">
                                <Input type="email" placeholder="Email Address *" value={regEmail} onChange={e => setRegEmail(e.target.value)} required />
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
                        ) : (
                            <div className="text-center text-slate-400">Admin registration is restricted. Contact IT.</div>
                        )}
                    </div>
                </div>

                {/* FRONT FACE (Login) */}
                <div className={`${authMode === 'login' ? 'relative' : 'absolute inset-0'} w-full bg-black/20 md:bg-slate-900/60 backdrop-blur-2xl p-8 rounded-3xl shadow-2xl border border-white/10 overflow-hidden`}
                    style={{ backfaceVisibility: "hidden" }}>

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
                        <Input icon={Mail} placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} />
                        <div>
                            <Input icon={Lock} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
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
