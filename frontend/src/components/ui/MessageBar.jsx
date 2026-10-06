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
export default MessageBar;

export { MessageBar };
