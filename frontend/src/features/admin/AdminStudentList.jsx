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

export default function AdminStudentList({ showMessage, catalogs, buttonClass, primaryButtonClass }) {
    const { degrees, loaded, fetchSections } = catalogs; // destructure fetchSections
    const [students, setStudents] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const [filterDegree, setFilterDegree] = useState('');
    const [filterSemester, setFilterSemester] = useState('');
    const [filterSection, setFilterSection] = useState('');

    // Edit Modal State
    const [editStudent, setEditStudent] = useState(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [generatedPass, setGeneratedPass] = useState(null);

    useEffect(() => {
        if (loaded && degrees.length && !filterDegree) setFilterDegree(degrees[0]);
        // FIXED: Do NOT default section to sections[0]. Let it be "" (All Sections).
    }, [loaded, degrees, filterDegree]);

    // NEW: Fetch sections for filter dropdown when Degree/Sem changes
    const [availableFilterSections, setAvailableFilterSections] = useState([]);
    useEffect(() => {
        if (filterDegree && filterSemester) {
            fetchSections(filterDegree, filterSemester).then(setAvailableFilterSections);
        } else {
            setAvailableFilterSections([]);
        }
    }, [filterDegree, filterSemester, fetchSections]);

    // NEW: Fetch sections for Edit Modal
    const [editSections, setEditSections] = useState([]);
    useEffect(() => {
        if (editStudent?.degree && editStudent?.semester) {
            fetchSections(editStudent.degree, editStudent.semester).then(setEditSections);
        } else {
            setEditSections([]);
        }
    }, [editStudent?.degree, editStudent?.semester, fetchSections]);

    const fetchStudents = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await auth().get("/admin/students", {
                params: {
                    degree: filterDegree,
                    semester: filterSemester,
                    section: filterSection
                }
            });
            setStudents(res.data.students || []);
        } catch (e) {
            if (e.response && e.response.status !== 401) {
                showMessage(e.response?.data?.message || "Failed to fetch student list.", 'error');
            }
            setStudents([]);
        } finally {
            setIsLoading(false);
        }
    }, [filterDegree, filterSemester, filterSection, showMessage]);

    // Handle Update Student (for Modal)
    const handleUpdateStudent = async () => {
        if (!editStudent) return;
        setIsUpdating(true);
        try {
            await auth().post("/admin/update-student", {
                student_id: editStudent.id,
                name: editStudent.name,
                srn: editStudent.srn,
                degree: editStudent.degree,
                semester: editStudent.semester,
                section: editStudent.section,
                parent_email: editStudent.parent_email
            });
            showMessage("Student details updated.", "success");
            setEditStudent(null);
            fetchStudents(); // Refresh list to show changes
        } catch (e) {
            showMessage(e.response?.data?.message || "Update failed", "error");
        } finally {
            setIsUpdating(false);
        }
    };

    // Handle Generate Parent Password
    const handleGenerateParentPass = async () => {
        if (!editStudent?.id) return;
        setIsUpdating(true);
        try {
            const res = await auth().post("/admin/generate-parent-password", { student_id: editStudent.id });
            setGeneratedPass(res.data.password);
            showMessage(res.data.message, "success");
        } catch (e) {
            showMessage(e.response?.data?.message || "Generation failed", "error");
        } finally {
            setIsUpdating(false);
        }
    };


    return (
        <div className="space-y-6">
            <h4 className="text-2xl font-bold text-yellow-400 flex items-center"><GraduationCap className="w-6 h-6 mr-2" /> Student Directory</h4>

            {/* Filters */}
            <div className="bg-slate-900/40 border border-white/10 p-4 rounded-xl shadow-inner grid grid-cols-4 gap-3 items-end">
                <Select value={filterDegree} onChange={e => setFilterDegree(e.target.value)} disabled={!degrees.length}>
                    <option value="" className="text-slate-900">All Degrees</option>
                    {(degrees || []).map(d => <option key={d} value={d} className="text-slate-900">{d}</option>)}
                </Select>
                <Select value={filterSemester} onChange={e => setFilterSemester(e.target.value)}>
                    <option value="" className="text-slate-900">All Sems</option>
                    {Array.from({ length: 8 }, (_, i) => i + 1).map(s => <option key={s} value={s} className="text-slate-900">{s}</option>)}
                </Select>
                <Select value={filterSection} onChange={e => setFilterSection(e.target.value)} disabled={!availableFilterSections.length}>
                    <option value="" className="text-slate-900">All Sections</option>
                    {(availableFilterSections || []).map(s => <option key={s} value={s} className="text-slate-900">{s}</option>)}
                </Select>
                <button
                    onClick={fetchStudents}
                    className={`${buttonClass} ${primaryButtonClass} bg-yellow-600 hover:bg-yellow-700`}
                    disabled={isLoading || (!filterDegree && !filterSemester && !filterSection)}
                >
                    {isLoading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Search className="w-5 h-5 mr-2" />}
                    Search
                </button>
            </div>

            {/* Results Table */}
            {isLoading ? <div className="text-center p-10"><Loader2 className="animate-spin w-8 h-8 mx-auto text-yellow-500" /></div> : students.length === 0 ? <div className="p-4 text-slate-500 text-center bg-slate-900/60 rounded-xl shadow-md border border-white/10">No students found matching filters.</div> : (
                <div className="overflow-x-auto rounded-xl border border-white/10">
                    <div className="bg-slate-800/80 px-6 py-2 border-b border-white/10 text-xs font-bold text-yellow-500 uppercase tracking-widest text-right">
                        Total Students: {students.length}
                    </div>
                    <table className="min-w-full divide-y divide-white/10 shadow-md bg-slate-900/60 backdrop-blur-xl">
                        <thead className="bg-slate-800/80">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">SRN / Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Academics</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Hostel</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-slate-900/40 divide-y divide-white/10">
                            {students.map(s => (
                                <tr key={s.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-slate-200">{s.name}</div>
                                        <div className="text-xs text-slate-500">{s.srn}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-slate-300">{s.degree} Sem {s.semester}</div>
                                        <div className="text-xs text-slate-500">Section {s.section}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                                        {s.hostel_info || <span className="text-xs text-red-400">Not Assigned</span>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${s.status === 'APPROVED' ? 'bg-green-900/40 text-green-300' : 'bg-red-900/40 text-red-300'}`}>
                                            {s.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                        <button onClick={() => { setEditStudent(s); setGeneratedPass(null); }} className="text-yellow-400 hover:text-yellow-300 p-2 hover:bg-yellow-500/10 rounded-full transition-colors">
                                            <Edit className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* EDIT STUDENT MODAL */}
            {editStudent && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-white/10 p-6 rounded-xl w-full max-w-lg shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-2">
                            <h5 className="text-xl font-bold text-yellow-400">Edit Student Details</h5>
                            <button onClick={() => setEditStudent(null)} className="text-slate-500 hover:text-white"><XCircle className="w-6 h-6" /></button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400">Full Name</label>
                                <Input value={editStudent.name} onChange={e => setEditStudent({ ...editStudent, name: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400">SRN</label>
                                <Input value={editStudent.srn} onChange={e => setEditStudent({ ...editStudent, srn: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400">Degree</label>
                                <Select value={editStudent.degree} onChange={e => setEditStudent({ ...editStudent, degree: e.target.value })}>
                                    {(degrees || []).map(d => <option key={d} value={d} className="text-slate-900">{d}</option>)}
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400">Semester</label>
                                <Select value={editStudent.semester} onChange={e => setEditStudent({ ...editStudent, semester: e.target.value })}>
                                    {Array.from({ length: 8 }, (_, i) => i + 1).map(s => <option key={s} value={s} className="text-slate-900">{s}</option>)}
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400">Section</label>
                                <Select value={editStudent.section} onChange={e => setEditStudent({ ...editStudent, section: e.target.value })}>
                                    {(editSections || []).map(s => <option key={s} value={s} className="text-slate-900">{s}</option>)}
                                </Select>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/5 space-y-2">
                            <h6 className="text-sm font-bold text-slate-300">Parent Portal (Read Only Access)</h6>
                            <div className="space-y-2">
                                <label className="text-xs text-slate-400">Parent Email (Required for Login)</label>
                                <div className="flex gap-2">
                                    <Input
                                        type="email"
                                        placeholder="parent@example.com"
                                        value={editStudent.parent_email || ''}
                                        onChange={e => setEditStudent({ ...editStudent, parent_email: e.target.value })}
                                    />
                                </div>

                                <button
                                    className={`${buttonClass} w-full border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10`}
                                    onClick={handleGenerateParentPass}
                                    disabled={!editStudent.parent_email || isUpdating}
                                >
                                    {isUpdating ? <Loader2 className="animate-spin w-4 h-4 mr-2 inline" /> : <Lock className="w-4 h-4 mr-2 inline" />}
                                    Generate & Email Password
                                </button>
                                {generatedPass && (
                                    <div className="p-3 bg-green-900/20 border border-green-500/30 rounded-lg text-green-300 text-sm break-all">
                                        <strong>Generated Password:</strong> {generatedPass} <br />
                                        <span className="text-xs opacity-70">(Sent to {editStudent.parent_email})</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-white/5">
                            <button className={`${buttonClass} bg-slate-700 text-white flex-1 hover:bg-slate-600`} onClick={() => setEditStudent(null)}>Cancel</button>
                            <button className={`${buttonClass} ${primaryButtonClass} bg-green-600 flex-1`} onClick={handleUpdateStudent} disabled={isUpdating}>
                                {isUpdating ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Save className="w-5 h-5 mr-2" />} Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
