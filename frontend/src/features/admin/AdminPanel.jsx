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
import AdminFacultyManagement from "./AdminFacultyManagement";
import AdminFacultyOnboarding from "./AdminFacultyOnboarding";
import AdminNoteUpload from "./AdminNoteUpload";
import AdminBookUpload from "./AdminBookUpload";
import AdminFeeManagement from "./AdminFeeManagement";
import AdminHostelComplaints from "./AdminHostelComplaints";
import AdminStudentList from "./AdminStudentList";
import AdminHostelManagement from "./AdminHostelManagement";
import { Input } from "../../components/ui";
import { Select } from "../../components/ui";

export default function AdminPanel({ showMessage, catalogs, buttonClass, primaryButtonClass, dangerButtonClass, user, onLogout }) { // 🛑 ADDED user PROP + onLogout
    const { degrees, sections, loaded, fetchBasics, fetchSections, fetchSubjects } = catalogs;

    const [pending, setPending] = useState([]);
    const [newDegree, setNewDegree] = useState("");
    const [newSection, setNewSection] = useState("");
    const [newSectionDegree, setNewSectionDegree] = useState("");
    const [newSectionSemester, setNewSectionSemester] = useState("1");
    // Selected degree/semester for viewing sections
    const [viewSectionDegree, setViewSectionDegree] = useState("");
    const [viewSectionSemester, setViewSectionSemester] = useState("");
    // Sections for selected degree/semester only
    const [currentSections, setCurrentSections] = useState([]);
    const [isLoadingSections, setIsLoadingSections] = useState(false);

    // Selected degree/semester for viewing subjects
    const [viewSubjectDegree, setViewSubjectDegree] = useState("");
    const [viewSubjectSemester, setViewSubjectSemester] = useState("");
    // Subjects for selected degree/semester
    const [currentSubjects, setCurrentSubjects] = useState([]);
    const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);

    // Fetch sections only for selected degree and semester
    const fetchCurrentSections = useCallback(async (degree, semester) => {
        if (!degree || !semester) {
            setCurrentSections([]);
            return;
        }
        setIsLoadingSections(true);
        try {
            const sections = await fetchSections(degree, semester);
            setCurrentSections(sections || []);
        } catch (e) {
            console.error("Failed to fetch sections", e);
            setCurrentSections([]);
        } finally {
            setIsLoadingSections(false);
        }
    }, [fetchSections]);

    const fetchCurrentSubjects = useCallback(async (degree, semester) => {
        if (!degree || !semester) {
            setCurrentSubjects([]);
            return;
        }
        setIsLoadingSubjects(true);
        try {
            const subjects = await fetchSubjects(degree, semester);
            setCurrentSubjects(subjects || []);
        } catch (e) {
            console.error("Failed to fetch subjects", e);
            setCurrentSubjects([]);
        } finally {
            setIsLoadingSubjects(false);
        }
    }, [fetchSubjects]);

    // Track previous values to prevent duplicate calls
    const prevSecDeg = useRef("");
    const prevSecSem = useRef("");
    const prevSubDeg = useRef("");
    const prevSubSem = useRef("");

    // Fetch sections when view degree/semester changes
    useEffect(() => {
        if (viewSectionDegree && viewSectionSemester) {
            if (prevSecDeg.current !== viewSectionDegree || prevSecSem.current !== viewSectionSemester) {
                prevSecDeg.current = viewSectionDegree;
                prevSecSem.current = viewSectionSemester;
                fetchCurrentSections(viewSectionDegree, viewSectionSemester);
            }
        } else {
            setCurrentSections([]);
            prevSecDeg.current = "";
            prevSecSem.current = "";
        }
    }, [viewSectionDegree, viewSectionSemester, fetchCurrentSections]);

    // Fetch subjects when view degree/semester changes
    useEffect(() => {
        if (viewSubjectDegree && viewSubjectSemester) {
            if (prevSubDeg.current !== viewSubjectDegree || prevSubSem.current !== viewSubjectSemester) {
                prevSubDeg.current = viewSubjectDegree;
                prevSubSem.current = viewSubjectSemester;
                fetchCurrentSubjects(viewSubjectDegree, viewSubjectSemester);
            }
        } else {
            setCurrentSubjects([]);
            prevSubDeg.current = "";
            prevSubSem.current = "";
        }
    }, [viewSubjectDegree, viewSubjectSemester, fetchCurrentSubjects]);

    const addSection = async () => {
        if (!newSectionDegree || !newSectionSemester || !newSection.trim()) return showMessage("Select Degree, Sem and enter Name.", "error");
        try {
            await auth().post("/admin/sections", { name: newSection, degree: newSectionDegree, semester: newSectionSemester });
            showMessage("Section added!", "success");
            setNewSection("");
            // Refresh sections if viewing the same degree/semester
            if (viewSectionDegree === newSectionDegree && viewSectionSemester === newSectionSemester) {
                await fetchCurrentSections(newSectionDegree, newSectionSemester);
            }
        } catch (e) {
            showMessage(e.response?.data?.message || "Failed to add section", "error");
        }
    };

    const deleteSection = async (name) => {
        if (!viewSectionDegree || !viewSectionSemester) return;
        if (!confirm(`Delete Section ${name} from ${viewSectionDegree} Sem ${viewSectionSemester}?`)) return;
        try {
            await auth().delete("/admin/sections", { data: { name, degree: viewSectionDegree, semester: viewSectionSemester } });
            showMessage("Section deleted!", "success");
            // Refresh current sections
            await fetchCurrentSections(viewSectionDegree, viewSectionSemester);
        } catch (e) {
            showMessage(e.response?.data?.message || "Failed to delete section", "error");
        }
    };
    const [subjectDegree, setSubjectDegree] = useState('');
    const [subjectSemester, setSubjectSemester] = useState("1");
    const [newSubject, setNewSubject] = useState("");
    const [view, setView] = useState('approvals');
    const [isFetchingPending, setIsFetchingPending] = useState(false);
    const [processingId, setProcessingId] = useState(null); // NEW: Track processing student

    // Edit Modal State
    const [editStudent, setEditStudent] = useState(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [generatedPass, setGeneratedPass] = useState(null);

    // FIX: Cleaned up fetchPending function
    const fetchPending = useCallback(async () => {
        setIsFetchingPending(true);
        try {
            const res = await auth().get("/admin/pending-students");
            setPending(res.data.students || []);
        } catch (e) {
            if (e.response && e.response.status !== 401) {
                showMessage("Failed to fetch pending students.", "error");
            }
            setPending([]);
        } finally {
            setIsFetchingPending(false);
        }
    }, [showMessage]);

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
            fetchPending(); // Refresh lists (might be efficient to just update local state but safer to refetch)
        } catch (e) {
            showMessage(e.response?.data?.message || "Update failed", "error");
        } finally {
            setIsUpdating(false);
        }
    };

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

    const take = async (id, action) => {
        if (processingId) return; // Prevent concurrent actions
        setProcessingId(id);
        try {
            // Using auth()
            const res = await auth().post("/admin/approve-student", { student_id: id, action: action });
            showMessage(res.data.message, "success");
            setPending(prev => prev.filter(s => s.id !== id));
        } catch (e) {
            if (e.response && e.response.status !== 401) {
                showMessage(e.response?.data?.message || "Action failed.", "error");
            }
        } finally {
            setProcessingId(null);
        }
    };

    const addCatalogItem = async (endpoint, name, successMsg) => {
        if (!name.trim()) return showMessage("Please enter a valid value.", "error");
        try {
            // Using auth()
            await auth().post(`/admin/${endpoint}`, { name });
            showMessage(successMsg, "success");
            await fetchBasics();
        } catch (e) {
            if (e.response && e.response.status !== 401) {
                showMessage(e.response?.data?.message || "Operation failed.", "error");
            }
        }
    };

    const deleteCatalogItem = async (endpoint, name) => {
        if (!confirm(`Delete ${name}? This might affect data linked to it.`)) return;
        try {
            await auth().delete(`/admin/${endpoint}`, { data: { name } });
            showMessage("Deleted successfully", "success");
            await fetchBasics();
        } catch (e) {
            showMessage(e.response?.data?.message || "Deletion failed", "error");
        }
    };

    const deleteSubject = async (name) => {
        if (!confirm(`Delete subject ${name}?`)) return;
        try {
            await auth().delete("/admin/subjects", {
                data: {
                    degree: viewSubjectDegree,
                    semester: parseInt(viewSubjectSemester),
                    name
                }
            });
            showMessage("Subject deleted", "success");
            fetchCurrentSubjects(viewSubjectDegree, viewSubjectSemester);
        } catch (e) {
            showMessage(e.response?.data?.message || "Deletion failed", "error");
        }
    };

    const addSubject = async () => {
        if (!newSubject.trim()) return showMessage("Subject cannot be empty", "error");
        try {
            // Using auth()
            await auth().post("/admin/subjects", {
                degree: subjectDegree,
                semester: parseInt(subjectSemester),
                name: newSubject,
            });
            showMessage("Subject added successfully!", "success");
            setNewSubject("");
        } catch (e) {
            if (e.response && e.response.status !== 401) {
                showMessage(e.response?.data?.message || "Failed to add subject.", "error");
            }
        }
    };

    // Effect 1: Initialize Dropdowns
    useEffect(() => {
        if (loaded && Array.isArray(degrees) && degrees.length > 0 && !subjectDegree) {
            setSubjectDegree(degrees[0]);
        }
    }, [loaded, degrees, subjectDegree]);

    // Effect 2: Fetch Data (CRITICAL FIX: Only run if user is confirmed and on the approvals view)
    useEffect(() => {
        // Since AdminPanel receives the 'user' object as a prop, we use it as a robust guardrail
        if (view === 'approvals' && user && user.role === 'admin') {
            fetchPending();
        }
    }, [view, fetchPending, user]); // Added 'user' to the dependency array


    const renderView = () => {
        switch (view) {
            case "approvals":
                return (
                    <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-xl shadow-lg border border-yellow-500/20">
                        <h4 className="text-2xl font-bold text-yellow-500 mb-4">Pending Student Approvals</h4>
                        {isFetchingPending && <div className="text-center p-5"><Loader2 className="animate-spin w-6 h-6 text-yellow-500 mx-auto" /></div>}
                        {!isFetchingPending && pending.length === 0 && <div className="p-4 text-slate-500 text-center">No pending students.</div>}

                        <div className="space-y-4">
                            {pending.map(s => (
                                <div key={s.id} className="p-4 bg-yellow-900/20 border-l-4 border-yellow-500 rounded-xl shadow backdrop-blur-sm">
                                    <div className="font-bold text-lg text-white">{s.name}</div>
                                    <div className="text-sm text-slate-300">{s.srn} • {s.email} • {s.degree} • Sem {s.semester}</div>
                                    <div className="flex gap-3 mt-3">
                                        <button
                                            disabled={processingId === s.id}
                                            className={`${buttonClass} bg-green-600 text-white disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px] flex justify-center`}
                                            onClick={() => take(s.id, "approve")}
                                        >
                                            {processingId === s.id ? <Loader2 className="w-5 h-5 animate-spin" /> : "Approve"}
                                        </button>
                                        <button
                                            disabled={processingId === s.id}
                                            className={`${buttonClass} bg-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px] flex justify-center`}
                                            onClick={() => take(s.id, "reject")}
                                        >
                                            {processingId === s.id ? <Loader2 className="w-5 h-5 animate-spin" /> : "Reject"}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'faculty_mgmt':
                return <AdminFacultyManagement showMessage={showMessage} catalogs={catalogs} buttonClass={buttonClass} primaryButtonClass={primaryButtonClass} />;
            case "faculty-onboard": return <AdminFacultyOnboarding showMessage={showMessage} buttonClass={buttonClass} primaryButtonClass={primaryButtonClass} catalogs={catalogs} />;
            case "note-upload": return <AdminNoteUpload showMessage={showMessage} buttonClass={buttonClass} primaryButtonClass={primaryButtonClass} catalogs={catalogs} />; // NEW VIEW
            case "library-upload": return <AdminBookUpload showMessage={showMessage} buttonClass={buttonClass} primaryButtonClass={primaryButtonClass} catalogs={catalogs} />; // NEW VIEW
            case "catalogs":
                return (
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-xl shadow-lg border border-white/10 space-y-3">
                            <h4 className="text-xl font-bold text-yellow-400">Manage Degrees</h4>
                            <Input placeholder="New degree" value={newDegree} onChange={e => setNewDegree(e.target.value)} />
                            <button className={`${buttonClass} ${primaryButtonClass}`} onClick={() => addCatalogItem("degrees", newDegree, "Degree added!")}>Add Degree</button>

                            <div className="mt-4 pt-4 border-t border-white/10">
                                <label className="block text-sm font-bold text-slate-300 uppercase tracking-widest mb-2">Current Degrees</label>
                                <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                    {(degrees || []).map(d => (
                                        <div key={d} className="flex justify-between items-center p-2 bg-slate-800/40 rounded border border-white/5 group">
                                            <span className="text-white text-sm font-medium">{d}</span>
                                            <button
                                                onClick={() => deleteCatalogItem("degrees", d)}
                                                className="p-1 text-slate-500 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                title="Delete Degree"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-xl shadow-lg border border-white/10 space-y-4">
                            <h4 className="text-xl font-bold text-yellow-400">Manage Sections</h4>

                            {/* Add Section Form */}
                            <div className="bg-slate-800/40 p-4 rounded-lg border border-white/5 space-y-3">
                                <div className="flex flex-col sm:grid sm:grid-cols-2 gap-2">
                                    <Select value={newSectionDegree} onChange={e => setNewSectionDegree(e.target.value)} disabled={!degrees.length} className="w-full">
                                        <option value="">Select Degree</option>
                                        {(degrees || []).map(d => <option key={d} value={d} className="text-slate-900">{d}</option>)}
                                    </Select>
                                    <Select value={newSectionSemester} onChange={e => setNewSectionSemester(e.target.value)} className="w-full">
                                        {Array.from({ length: 8 }, (_, i) => i + 1).map(s => <option key={s} value={s} className="text-slate-900">Sem {s}</option>)}
                                    </Select>
                                </div>
                                <Input placeholder="New section name (e.g. A)" value={newSection} onChange={e => setNewSection(e.target.value)} />
                                <button className={`${buttonClass} ${primaryButtonClass} w-full`} onClick={addSection}>Add Section</button>
                            </div>

                            {/* Sections Display - Dropdown Menu */}
                            <div>
                                <label className="block text-sm font-bold text-slate-300 uppercase tracking-widest mb-2">View & Delete Sections</label>

                                {/* Select Degree & Semester to View Sections - Mobile Optimized */}
                                <div className="flex flex-col sm:grid sm:grid-cols-2 gap-2 mb-3">
                                    <Select
                                        value={viewSectionDegree}
                                        onChange={e => {
                                            setViewSectionDegree(e.target.value);
                                            setViewSectionSemester(""); // Reset semester when degree changes
                                        }}
                                        disabled={!degrees.length}
                                        className="w-full"
                                    >
                                        <option value="" className="text-slate-900">Select Degree</option>
                                        {(degrees || []).map(d => <option key={d} value={d} className="text-slate-900">{d}</option>)}
                                    </Select>
                                    <Select
                                        value={viewSectionSemester}
                                        onChange={e => setViewSectionSemester(e.target.value)}
                                        disabled={!viewSectionDegree}
                                        className="w-full"
                                    >
                                        <option value="" className="text-slate-900">Select Semester</option>
                                        {Array.from({ length: 8 }, (_, i) => i + 1).map(s => <option key={s} value={s} className="text-slate-900">Sem {s}</option>)}
                                    </Select>
                                </div>

                                {/* Sections Dropdown - Only shows when degree & semester selected - Mobile Optimized */}
                                {viewSectionDegree && viewSectionSemester ? (
                                    isLoadingSections ? (
                                        <div className="text-center p-4"><Loader2 className="animate-spin w-5 h-5 mx-auto text-yellow-500" /></div>
                                    ) : currentSections.length === 0 ? (
                                        <div className="text-center p-4 bg-slate-800/20 rounded-lg border border-white/5 text-slate-500 text-sm">
                                            No sections found for {viewSectionDegree} Sem {viewSectionSemester}.
                                        </div>
                                    ) : (
                                        <>
                                            <Select
                                                className="w-full bg-slate-800/50 border border-white/10 text-white py-2.5 text-base"
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    if (value && value !== '') {
                                                        deleteSection(value);
                                                        e.target.value = ''; // Reset dropdown
                                                    }
                                                }}
                                            >
                                                <option value="" className="text-slate-900">Select a section to delete...</option>
                                                {currentSections.map(s => (
                                                    <option
                                                        key={s}
                                                        value={s}
                                                        className="text-slate-900"
                                                    >
                                                        Section {s}
                                                    </option>
                                                ))}
                                            </Select>
                                            <div className="mt-2 text-xs text-slate-400 text-center">
                                                {currentSections.length} {currentSections.length === 1 ? 'section' : 'sections'} for {viewSectionDegree} Sem {viewSectionSemester}
                                            </div>
                                        </>
                                    )
                                ) : (
                                    <div className="text-center p-4 bg-slate-800/20 rounded-lg border border-white/5 text-slate-400 text-sm">
                                        Select a degree and semester above to view sections.
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-xl shadow-lg border border-white/10 space-y-4">
                            <h4 className="text-xl font-bold text-yellow-400">Manage Subjects</h4>

                            {/* Add Subject Form */}
                            <div className="bg-slate-800/40 p-4 rounded-lg border border-white/5 space-y-3">
                                <div className="flex flex-col sm:grid sm:grid-cols-2 gap-2">
                                    <Select value={subjectDegree} onChange={e => setSubjectDegree(e.target.value)} disabled={!degrees.length} className="w-full">
                                        <option value="">Select Degree</option>
                                        {(degrees || []).map(d => <option key={d} value={d} className="text-slate-900">{d}</option>)}
                                    </Select>
                                    <Select value={subjectSemester} onChange={e => setSubjectSemester(e.target.value)} className="w-full">
                                        {Array.from({ length: 8 }, (_, i) => i + 1).map(s => <option key={s} value={s} className="text-slate-900">Sem {s}</option>)}
                                    </Select>
                                </div>
                                <Input placeholder="Subject name" value={newSubject} onChange={e => setNewSubject(e.target.value)} />
                                <button className={`${buttonClass} ${primaryButtonClass} w-full`} onClick={addSubject}>Add Subject</button>
                            </div>

                            {/* View & Delete Subjects */}
                            <div>
                                <label className="block text-sm font-bold text-slate-300 uppercase tracking-widest mb-2">View & Delete Subjects</label>

                                <div className="flex flex-col sm:grid sm:grid-cols-2 gap-2 mb-3">
                                    <Select
                                        value={viewSubjectDegree}
                                        onChange={e => {
                                            setViewSubjectDegree(e.target.value);
                                            setViewSubjectSemester("");
                                        }}
                                        disabled={!degrees.length}
                                        className="w-full"
                                    >
                                        <option value="" className="text-slate-900">Select Degree</option>
                                        {(degrees || []).map(d => <option key={d} value={d} className="text-slate-900">{d}</option>)}
                                    </Select>
                                    <Select
                                        value={viewSubjectSemester}
                                        onChange={e => setViewSubjectSemester(e.target.value)}
                                        disabled={!viewSubjectDegree}
                                        className="w-full"
                                    >
                                        <option value="" className="text-slate-900">Select Semester</option>
                                        {Array.from({ length: 8 }, (_, i) => i + 1).map(s => <option key={s} value={s} className="text-slate-900">Sem {s}</option>)}
                                    </Select>
                                </div>

                                {viewSubjectDegree && viewSubjectSemester ? (
                                    isLoadingSubjects ? (
                                        <div className="text-center p-4"><Loader2 className="animate-spin w-5 h-5 mx-auto text-yellow-500" /></div>
                                    ) : currentSubjects.length === 0 ? (
                                        <div className="text-center p-4 bg-slate-800/20 rounded-lg border border-white/5 text-slate-500 text-sm">
                                            No subjects found.
                                        </div>
                                    ) : (
                                        <>
                                            <Select
                                                className="w-full bg-slate-800/50 border border-white/10 text-white py-2.5 text-base"
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    if (value) {
                                                        deleteSubject(value);
                                                        e.target.value = '';
                                                    }
                                                }}
                                            >
                                                <option value="" className="text-slate-900">Select a subject to delete...</option>
                                                {currentSubjects.map(s => (
                                                    <option key={s} value={s} className="text-slate-900">{s}</option>
                                                ))}
                                            </Select>
                                            <div className="mt-2 text-xs text-slate-400 text-center">
                                                {currentSubjects.length} subjects found.
                                            </div>
                                        </>
                                    )
                                ) : (
                                    <div className="text-center p-4 bg-slate-800/20 rounded-lg border border-white/5 text-slate-400 text-sm">
                                        Select context to view subjects.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            case "fees-admin": return <AdminFeeManagement showMessage={showMessage} buttonClass={buttonClass} primaryButtonClass={primaryButtonClass} catalogs={catalogs} />;
            case "complaints-admin": return <AdminHostelComplaints showMessage={showMessage} buttonClass={buttonClass} primaryButtonClass={primaryButtonClass} />;
            case "student-list": return <AdminStudentList showMessage={showMessage} catalogs={catalogs} buttonClass={buttonClass} primaryButtonClass={primaryButtonClass} />;
            case "hostel-config": return <AdminHostelManagement showMessage={showMessage} buttonClass={buttonClass} primaryButtonClass={primaryButtonClass} catalogs={catalogs} />;
            default: return <div className="text-center p-6 text-gray-500">Select an option</div>;
        }
    };

    return (
        <div className="min-h-screen animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Area */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Admin Tools</h1>
                    <p className="text-slate-400">Manage students, faculty, courses and institutional settings.</p>
                </div>
            </div>

            {/* Desktop Navigation Tabs */}
            <div className="hidden md:flex flex-wrap gap-2 mb-8 p-1 bg-slate-900/40 backdrop-blur-md rounded-xl border border-white/5 w-fit">
                {[
                    { key: 'approvals', label: 'Student Approvals', icon: User },
                    { key: 'student-list', label: 'Student Directory', icon: GraduationCap },
                    { key: 'faculty_mgmt', label: 'Faculty Allocations', icon: ClipboardList },
                    { key: 'hostel-config', label: 'Hostel Config', icon: Home },
                    { key: 'complaints-admin', label: 'Hostel Complaints', icon: Mail },
                    { key: 'note-upload', label: 'Upload Study Material', icon: Book },
                    { key: 'library-upload', label: 'Book Upload', icon: Upload },
                    { key: 'faculty-onboard', label: 'Add Faculty', icon: UserPlus },
                    { key: 'catalogs', label: 'Degrees/Subjects', icon: Settings },
                    { key: 'fees-admin', label: 'Manage Fees', icon: IndianRupee },
                ].map(item => {
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
                        {[
                            { key: 'approvals', label: 'Student Approvals' },
                            { key: 'student-list', label: 'Student Directory' },
                            { key: 'faculty_mgmt', label: 'Faculty Allocations' },
                            { key: 'hostel-config', label: 'Hostel Config' },
                            { key: 'complaints-admin', label: 'Hostel Complaints' },
                            { key: 'note-upload', label: 'Upload Study Material' },
                            { key: 'library-upload', label: 'Book Upload' },
                            { key: 'faculty-onboard', label: 'Add Faculty' },
                            { key: 'catalogs', label: 'Degrees/Subjects' },
                            { key: 'fees-admin', label: 'Manage Fees' },
                        ].map(item => (
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
// Professor Panel (Updated with Books)

// Student Attendance Calendar
