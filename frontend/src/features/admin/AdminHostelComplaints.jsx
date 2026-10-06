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
import { Select } from "../../components/ui";

export default function AdminHostelComplaints({ showMessage, buttonClass, primaryButtonClass }) {
    const [complaints, setComplaints] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    // New state for status update
    const [statusUpdate, setStatusUpdate] = useState({ id: null, status: 'Open', note: '' });

    const fetchComplaints = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await auth().get("/admin/hostel/complaints");
            setComplaints(res.data.complaints || []);
        } catch (e) {
            if (e.response && e.response.status !== 401) {
                showMessage("Failed to fetch hostel complaints.", 'error');
            }
            setComplaints([]);
        } finally {
            setIsLoading(false);
        }
    }, [showMessage]);

    // NEW: Function to handle status change
    const updateComplaintStatus = async () => {
        if (!statusUpdate.id || !statusUpdate.status) return;

        setIsLoading(true); // Disable interface during update
        try {
            const res = await auth().patch(`/admin/hostel/complaints/${statusUpdate.id}/status`, {
                status: statusUpdate.status,
                note: statusUpdate.note
            });
            showMessage(`Complaint status updated to **${res.data.new_status}**`, 'success');
            setStatusUpdate({ id: null, status: 'Open', note: '' }); // Close modal/form
            fetchComplaints(); // Refresh data to show new status/audit trail
        } catch (e) {
            showMessage(e.response?.data?.message || "Failed to update status.", 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchComplaints(); }, [fetchComplaints]);

    const VALID_STATUSES = ["Open", "Under Review", "Under Progress", "Resolved", "Closed"];

    if (isLoading && statusUpdate.id === null) {
        return <div className="text-center p-10"><Loader2 className="animate-spin w-8 h-8 mx-auto text-yellow-500" /></div>;
    }

    return (
        <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-xl shadow-lg border border-red-500/20">
            <div className="flex justify-between items-center mb-4">
                <h4 className="text-2xl font-bold text-red-400 flex items-center"><Home className="w-6 h-6 mr-2" /> Active Hostel Complaints</h4>
                <button onClick={fetchComplaints} className="p-2 bg-slate-700 rounded-full hover:bg-slate-600 transition" disabled={isLoading}><RefreshCw className="w-5 h-5 text-slate-300" /></button>
            </div>

            {/* Status Update Modal/Form (Render if statusUpdate.id is set) */}
            {statusUpdate.id && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-white/10 p-6 rounded-xl w-full max-w-md shadow-2xl space-y-4">
                        <h5 className="text-xl font-bold text-red-400">Update Complaint Status</h5>
                        <Select value={statusUpdate.status} onChange={e => setStatusUpdate(prev => ({ ...prev, status: e.target.value }))}>
                            {VALID_STATUSES.map(s => <option key={s} value={s} className="text-slate-900">{s}</option>)}
                        </Select>
                        <textarea
                            className="w-full bg-slate-800/50 backdrop-blur-xl text-white placeholder-slate-500 border border-white/10 rounded-xl py-3 px-4 h-20 focus:ring-2 focus:ring-red-500/50 outline-none"
                            placeholder="Internal Note (Optional)"
                            value={statusUpdate.note}
                            onChange={e => setStatusUpdate(prev => ({ ...prev, note: e.target.value }))}
                        />
                        <div className="flex gap-3">
                            <button className={`${buttonClass} bg-slate-700 text-white flex-1 hover:bg-slate-600`} onClick={() => setStatusUpdate({ id: null, status: 'Open', note: '' })}>Cancel</button>
                            <button className={`${buttonClass} ${primaryButtonClass} bg-green-600 flex-1`} onClick={updateComplaintStatus} disabled={isLoading}>
                                {isLoading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Save className="w-5 h-5 mr-2" />} Save Status
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Complaints List */}
            {complaints.length === 0 && !isLoading && <div className="text-slate-500 text-center py-4">No complaints recorded.</div>}

            <div className="space-y-4">
                {complaints.map(c => (
                    <div key={c.id} className={`p-4 rounded-xl shadow-md ${c.status === 'Closed' ? 'bg-slate-800/50 border-l-4 border-slate-500' : 'bg-slate-800 border-l-4 border-red-500'}`}>
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <div className="font-bold text-lg text-red-400">{c.title}</div>
                                <div className="text-sm text-slate-300 mt-1">{c.description}</div>
                                <div className="text-xs text-slate-500 mt-1">
                                    From: <strong className="text-slate-400">{c.hostel_name} (Room {c.room_number})</strong> | Student: <strong className="text-slate-400">{c.student_name}</strong>
                                </div>
                            </div>
                            <div className={`text-xs px-2 py-1 rounded-full flex-shrink-0 font-semibold ${c.status.includes('Progress') ? 'bg-orange-900/40 text-orange-300' : c.status === 'Open' ? 'bg-red-900/40 text-red-300' : 'bg-green-900/40 text-green-300'}`}>
                                {c.status}
                            </div>
                        </div>

                        {/* Audit Trail/Status Bar */}
                        <div className="mt-3 pt-2 border-t border-white/10">
                            <div className="text-xs text-slate-500 font-semibold mb-1">Audit Trail:</div>
                            <div className="flex items-center space-x-2 text-xs overflow-x-auto pb-1">
                                {c.audit_trail && c.audit_trail.map((step, index) => (
                                    <div key={index} className="flex-shrink-0">
                                        <span className={`px-2 py-0.5 rounded-full ${step.status.includes('Progress') ? 'bg-orange-900/40 text-orange-300' : step.status === 'Open' ? 'bg-red-900/40 text-red-300' : 'bg-green-900/40 text-green-300'}`}>
                                            {step.status}
                                        </span>
                                        {index < c.audit_trail.length - 1 && <span className="text-slate-600 ml-2">&gt;</span>}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end items-center mt-3 pt-2 border-t border-white/10">
                            <div className="flex space-x-2">
                                {c.file_url && <a href={c.file_url} className={`py-1 px-3 text-xs font-semibold rounded-full inline-flex items-center bg-red-600 hover:bg-red-700 text-white`} target="_blank" rel="noopener noreferrer">Attachment</a>}
                                <button
                                    className={`${buttonClass} bg-yellow-600 hover:bg-yellow-700 text-white text-xs py-1.5 w-32`}
                                    onClick={() => setStatusUpdate({ id: c.id, status: c.status, note: '' })}
                                >
                                    <RefreshCw className="w-4 h-4 mr-1" /> Update Status
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
