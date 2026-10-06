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
import { Input, Select } from "../../components/ui";

export default function FacultyAttendance({ showMessage, buttonClass, catalogs }) {
    const [allocations, setAllocations] = useState([]);
    const [selectedAlloc, setSelectedAlloc] = useState(null);
    const [students, setStudents] = useState([]);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLocked, setIsLocked] = useState(false); // Locked if > 30 mins

    useEffect(() => {
        const fetchAlloc = async () => {
            try {
                const res = await auth().get("/faculty/allocations");
                setAllocations(res.data.allocations || []);
            } catch (e) { } // silent fail or log
        };
        fetchAlloc();
    }, []);

    const fetchStudents = useCallback(async () => {
        if (!selectedAlloc) return;
        setIsLoading(true);
        setIsLocked(false);
        try {
            const res = await auth().get("/faculty/students", {
                params: {
                    degree: selectedAlloc.degree, semester: selectedAlloc.semester, section: selectedAlloc.section,
                    subject: selectedAlloc.subject, date: date
                }
            });
            const data = res.data.students || [];
            // Map to include local 'status' state if needed, but we used api to return 'status'
            // We need to manage state for toggling.
            const mapped = data.map(s => ({
                ...s,
                currentStatus: s.status || "Present" // Default to Present if not marked
            }));
            setStudents(mapped);

            // Check Lock Logic
            // If any student has marked_at, check if (now - marked_at) > 30m
            // We can check the first one that has marked_at
            const marked = data.find(s => s.marked_at);
            if (marked) {
                const markedTime = new Date(marked.marked_at).getTime(); // UTC ISO string to local time (browser handles it, or use Z)
                // Backend sends isoformat (no Z usually unless pytz). utcnow() is native.
                // Assuming simplified check:
                // Let's rely on backend rejecting save? Or visual cue?
                // Visual cue:
                // The marked_at is from server (UTC presumably).
                // Let's assume server time sync.
                // Actually, logic: "Editable for 30 mins".
                const now = new Date().getTime();
                // Add 'Z' to marked_at if missing to ensure UTC parsing
                const timeStr = marked.marked_at.endsWith('Z') ? marked.marked_at : marked.marked_at + 'Z';
                const mTime = new Date(timeStr).getTime();
                if ((now - mTime) > 30 * 60 * 1000) {
                    setIsLocked(true);
                }
            }

        } catch (e) {
            showMessage("Failed to load class list.", 'error');
        } finally { setIsLoading(false); }
    }, [selectedAlloc, date, showMessage]);

    useEffect(() => { if (selectedAlloc) fetchStudents(); }, [fetchStudents]);

    const toggleStatus = (id) => {
        if (isLocked) return;
        setStudents(prev => prev.map(s => s.id === id ? { ...s, currentStatus: s.currentStatus === "Present" ? "Absent" : "Present" } : s));
    };

    const submitAttendance = async () => {
        if (isLocked) return showMessage("Attendance is locked (30 mins passed).", 'error');
        if (!selectedAlloc) return;
        setIsSubmitting(true);
        try {
            const payload = {
                degree: selectedAlloc.degree,
                semester: selectedAlloc.semester,
                section: selectedAlloc.section,
                subject: selectedAlloc.subject,
                date: date,
                data: students.map(s => ({ student_id: s.id, status: s.currentStatus }))
            };
            await auth().post("/faculty/attendance", payload);
            showMessage("Attendance saved successfully!", 'success');
            fetchStudents(); // Refresh lock status etc
        } catch (e) {
            showMessage(e.response?.data?.message || "Failed to save.", 'error');
        } finally { setIsSubmitting(false); }
    };

    return (
        <div className="space-y-6">
            <h4 className="text-2xl font-bold text-emerald-400 flex items-center"><ClipboardList className="w-6 h-6 mr-2" /> Attendance Register</h4>

            {/* Controls */}
            <div className="bg-slate-900/60 backdrop-blur-xl p-4 rounded-xl shadow-lg border border-emerald-500/20 grid grid-cols-1 md:grid-cols-3 gap-4 mx-auto">
                <div>
                    <label className="text-xs text-slate-400 font-bold uppercase">Select Class</label>
                    <Select value={selectedAlloc ? selectedAlloc.id : ""} onChange={e => {
                        const a = allocations.find(x => x.id === parseInt(e.target.value));
                        setSelectedAlloc(a || null);
                    }} disabled={!allocations.length}>
                        <option value="">-- Choose Class --</option>
                        {allocations.map(a => <option key={a.id} value={a.id}>{a.subject} ({a.degree} {a.semester} {a.section})</option>)}
                    </Select>
                    {!allocations.length && <div className="text-xs text-red-500 mt-1">No classes allocated. Contact Admin.</div>}
                </div>
                <div>
                    <label className="text-xs text-slate-400 font-bold uppercase">Date</label>
                    <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="text-slate-300" />
                </div>
                <div className="flex items-end">
                    <button className={`${buttonClass} bg-emerald-600 hover:bg-emerald-700 w-full disabled:opacity-50 disabled:cursor-not-allowed`} onClick={submitAttendance} disabled={!selectedAlloc || isLoading || isSubmitting || isLocked}>
                        {isSubmitting ? "Saving..." : isLocked ? "Locked (Time limit)" : "Mark Attendance"}
                    </button>
                </div>
            </div>

            {/* Student List */}
            {isLoading ? <div className="text-center p-10"><Loader2 className="animate-spin w-8 h-8 mx-auto text-emerald-500" /></div> : !selectedAlloc ? <div className="text-center text-slate-500 mt-10">Select a class to load students.</div> : students.length === 0 ? <div className="text-center text-slate-500">No students found in this class.</div> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {students.map(s => (
                        <div key={s.id} onClick={() => toggleStatus(s.id)} className={`cursor-pointer p-4 rounded-xl border transition-all duration-200 flex justify-between items-center ${s.currentStatus === 'Present' ? 'bg-emerald-900/20 border-emerald-500/30 hover:bg-emerald-900/40' : 'bg-red-900/20 border-red-500/30 hover:bg-red-900/40'} ${isLocked ? 'opacity-70 pointer-events-none' : ''}`}>
                            <div>
                                <div className={`font-bold ${s.currentStatus === 'Present' ? 'text-emerald-300' : 'text-red-300'}`}>{s.name}</div>
                                <div className="text-xs text-slate-400">{s.srn}</div>
                            </div>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${s.currentStatus === 'Present' ? 'bg-emerald-500 text-black' : 'bg-red-500 text-white'}`}>
                                {s.currentStatus === 'Present' ? <Check className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// --- MODIFIED ADMIN MODULE: Hostel Management (SRN Change) ---
