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
export default OrbitLogo;
