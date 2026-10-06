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
export default ComplaintAuditTimeline;

export { ComplaintAuditTimeline };
