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
import StudentNotesNotices from "./StudentNotesNotices";
import UnifiedLibrarySearch from "./UnifiedLibrarySearch";
import StudentFees from "./StudentFees";
import StudentMarks from "./StudentMarks";
import StudentFeedback from "./StudentFeedback";
import StudentAttendanceCalendar from "./StudentAttendanceCalendar";
import StudentAttendanceFeature from "./StudentAttendanceFeature";
import HostelComplaints from "./HostelComplaints";
import AcademicInsights from "./AcademicInsights";
import AIChat from "./AIChat";

export default function StudentPanel({ user, showMessage, catalogs, buttonClass, primaryButtonClass, onLogout }) {
    const [view, setView] = useState('notes');

    const navigation = [
        { key: 'notes', label: 'Notes & Notices', icon: Book },
        { key: 'books', label: 'Internal Library', icon: Search },
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
