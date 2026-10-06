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
export default WelcomeLoader;

export { WelcomeLoader };
