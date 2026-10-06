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
export default Select;

export { Select };
