import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import gsap from "gsap";
import {
    LogIn, UserPlus, LogOut, ArrowLeft, ArrowRight, Loader2, CheckCircle, XCircle, ChevronDown,
    Book, Bell, Settings, Briefcase, User, Mail, Lock, GraduationCap, ClipboardList,
    BriefcaseBusiness, IndianRupee, Award, MessageSquare, Upload, RefreshCw,
    Trash2, Save, Home, Search, Download, Check, Atom, Star, Sparkles, Plus, Filter, Eye, EyeOff, Edit,
    BrainCircuit, AlertTriangle, Target, Lightbulb, Send as SendIcon, Paperclip, Menu, History, Bot, BarChart3
} from "lucide-react";
import { api, auth, unauth } from "../../api";
import { setAuthToken } from "../../api/auth";
import { cents_to_rupees_str } from "../../utils/format";

export default function UserTypeSelection({ setUserRole, setPage }) {
    const [activeIndex, setActiveIndex] = useState(0);
    const containerRef = useRef(null);
    const cardRefs = useRef([]); // Refs for individual cards
    const touchStart = useRef(null);
    const touchEnd = useRef(null);

    const roles = [
        { ui: 'Student', icon: GraduationCap, subtitle: 'Access notes, results & more', gradient: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-500/30', border: 'border-blue-500/50', btnText: 'Sign In / Sign Up' },
        { ui: 'Admin', icon: BriefcaseBusiness, subtitle: 'System configuration & control', gradient: 'from-amber-500 to-amber-600', shadow: 'shadow-amber-500/30', border: 'border-amber-500/50', btnText: 'Sign In' },
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
                <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">v2.3 Pre_Release • © 2026 | LeafCore Labs</p>
            </div>
        </div>
    );
}
