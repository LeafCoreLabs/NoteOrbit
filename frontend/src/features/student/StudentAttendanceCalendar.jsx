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

export default function StudentAttendanceCalendar({ showMessage, buttonClass, primaryButtonClass }) {
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
