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

export default function AdminFacultyManagement({ showMessage, catalogs, buttonClass, primaryButtonClass }) {
    const { degrees, loaded, fetchBasics, subjects, fetchSubjects, fetchSections } = catalogs; // Added fetchSections, Removed sections (global)
    const [faculty, setFaculty] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // Allocation Modal State
    const [selectedFaculty, setSelectedFaculty] = useState(null);
    const [allocDegree, setAllocDegree] = useState("");
    const [allocSemester, setAllocSemester] = useState("1");
    const [allocSection, setAllocSection] = useState("");
    const [allocSubject, setAllocSubject] = useState("");
    const [allocFacultySearch, setAllocFacultySearch] = useState("");
    const [isAllocating, setIsAllocating] = useState(false);

    // Filters
    const [filterDegree, setFilterDegree] = useState("");
    const [filterSemester, setFilterSemester] = useState("");
    const [filterSection, setFilterSection] = useState("");
    const [availableFilterSections, setAvailableFilterSections] = useState([]);

    // Update filter sections
    useEffect(() => {
        if (filterDegree && filterSemester) {
            fetchSections(filterDegree, filterSemester).then(setAvailableFilterSections);
        } else {
            setAvailableFilterSections([]);
        }
    }, [filterDegree, filterSemester, fetchSections]);

    // Fetch subjects & sections when degree/sem changes
    const [availableSections, setAvailableSections] = useState([]);
    useEffect(() => {
        if (allocDegree && allocSemester) {
            fetchSubjects(allocDegree, allocSemester);
            fetchSections(allocDegree, allocSemester).then(setAvailableSections);
        } else {
            setAvailableSections([]);
        }
    }, [allocDegree, allocSemester, fetchSubjects, fetchSections]);

    // Fetch Faculty List
    const fetchFaculty = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await auth().get("/admin/faculty");
            setFaculty(res.data.faculty || []);
        } catch (e) {
            if (e.response && e.response.status !== 401) {
                showMessage(e.response?.data?.message || "Failed to fetch faculty list.", 'error');
            }
        } finally { setIsLoading(false); }
    }, [showMessage]);

    // FIX: Removed fetchBasics call from here to avoid loops. Parent should handle basics.
    useEffect(() => { fetchFaculty(); }, [fetchFaculty]);

    // Initialize dropdowns
    useEffect(() => {
        if (loaded && degrees.length && !allocDegree) setAllocDegree(degrees[0]);
        // Do not force section default
    }, [loaded, degrees, allocDegree]);

    // Filter Logic
    const filtersActive = filterDegree || filterSemester || filterSection;

    // Custom Dropdown State
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [dropdownRef]);

    const filteredFaculty = faculty.filter(f => {
        if (!filtersActive) return false; // Hide if no filters

        // Match if ANY allocation matches the filter criteria
        const hasMatch = f.allocations.some(a => {
            const matchDeg = filterDegree ? a.degree === filterDegree : true;
            const matchSem = filterSemester ? a.semester === parseInt(filterSemester) : true;
            const matchSec = filterSection ? a.section === filterSection : true;
            return matchDeg && matchSem && matchSec;
        });

        return hasMatch;
    });

    const handleAllocate = async () => {
        if (!selectedFaculty || !allocDegree || !allocSemester || !allocSection || !allocSubject) {
            return showMessage("All fields are required.", 'error');
        }
        setIsAllocating(true);
        try {
            await auth().post("/admin/faculty/allocate", {
                faculty_id: selectedFaculty.id,
                degree: allocDegree, semester: parseInt(allocSemester),
                section: allocSection, subject: allocSubject
            });
            showMessage(`Success: Assigned **${allocSubject}** to **${selectedFaculty.name}**`, 'success');
            setAllocSubject("");
            fetchFaculty(); // Refresh
        } catch (e) {
            showMessage(e.response?.data?.message || "Allocation failed.", 'error');
        } finally { setIsAllocating(false); }
    };

    const handleDeallocate = async (allocId) => {
        if (!confirm("Are you sure you want to remove this subject assignment?")) return;
        try {
            await auth().post("/admin/faculty/deallocate", { allocation_id: allocId });
            showMessage("Allocation removed.", 'success');
            fetchFaculty();
        } catch (e) { showMessage("Failed to remove.", 'error'); }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <div>
                    <h4 className="text-3xl font-bold text-yellow-500 flex items-center tracking-tight">
                        <ClipboardList className="w-8 h-8 mr-3 opacity-80" />
                        Faculty & Allocations
                    </h4>
                    <p className="text-slate-400 mt-1 pl-11">Manage professors and their subject allotments.</p>
                </div>
                <div className="bg-yellow-500/10 px-4 py-2 rounded-lg border border-yellow-500/20 text-yellow-500 font-mono text-xs uppercase tracking-widest">
                    {faculty.length} Faculty Members
                </div>
            </div>

            {/* Allocation Interface */}
            <div className="bg-slate-900/40 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-yellow-500/10" style={{ minHeight: '400px' }}>
                <h5 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-6 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></span> New Allocation
                </h5>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Faculty Selection */}
                    <div className="space-y-4">
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider pl-1">Select Professor</label>

                        {/* Custom Searchable Dropdown */}
                        <div className="relative" ref={dropdownRef}>
                            <div
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className={`w-full bg-slate-800/50 border ${isDropdownOpen ? 'border-yellow-500 ring-1 ring-yellow-500/50' : 'border-white/10'} rounded-xl px-4 py-3 text-white flex justify-between items-center cursor-pointer transition-all hover:bg-slate-800/80`}
                            >
                                <span className={selectedFaculty ? "text-white font-medium" : "text-slate-500"}>
                                    {selectedFaculty ? `${selectedFaculty.name} (${selectedFaculty.emp_id})` : "-- Choose Faculty Member --"}
                                </span>
                                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                            </div>

                            {/* Dropdown Menu */}
                            {isDropdownOpen && (
                                <div className="absolute z-50 mt-2 w-full bg-slate-900 border border-white/10 rounded-xl shadow-2xl max-h-80 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                    {/* Search Box Sticky Top */}
                                    <div className="p-2 border-b border-white/5 bg-slate-900 sticky top-0">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                                            <input
                                                autoFocus
                                                className="w-full bg-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-yellow-500"
                                                placeholder="Search faculty..."
                                                value={allocFacultySearch}
                                                onChange={e => setAllocFacultySearch(e.target.value)}
                                                onClick={e => e.stopPropagation()}
                                            />
                                        </div>
                                    </div>

                                    {/* List */}
                                    <div className="overflow-y-auto custom-scrollbar flex-1 p-1">
                                        {faculty.filter(f => f.name.toLowerCase().includes(allocFacultySearch.toLowerCase())).length === 0 ? (
                                            <div className="p-3 text-xs text-slate-500 text-center italic">No faculty found.</div>
                                        ) : (
                                            faculty.filter(f => f.name.toLowerCase().includes(allocFacultySearch.toLowerCase())).map(f => (
                                                <div
                                                    key={f.id}
                                                    onClick={() => {
                                                        setSelectedFaculty(f);
                                                        setIsDropdownOpen(false);
                                                        setAllocFacultySearch(""); // Optional: reset search or keep it
                                                    }}
                                                    className={`p-2.5 rounded-lg text-sm cursor-pointer flex items-center justify-between group transition-colors ${selectedFaculty?.id === f.id ? 'bg-yellow-500/20 text-yellow-400' : 'hover:bg-slate-800 text-slate-300 hover:text-white'}`}
                                                >
                                                    <span className="font-medium">{f.name}</span>
                                                    <span className={`text-[10px] uppercase tracking-wider ${selectedFaculty?.id === f.id ? 'text-yellow-500/70' : 'text-slate-600 group-hover:text-slate-500'}`}>{f.emp_id}</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {selectedFaculty && (
                            <div className="p-3 bg-white/5 rounded-lg border border-white/5 flex items-center animate-in fade-in slide-in-from-top-2">
                                <div className="w-8 h-8 rounded-full bg-yellow-500/20 text-yellow-500 flex items-center justify-center font-bold mr-3">{selectedFaculty.name[0]}</div>
                                <div>
                                    <div className="text-sm font-bold text-white leading-tight">{selectedFaculty.name}</div>
                                    <div className="text-xs text-slate-500">{selectedFaculty.email}</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Class Details */}
                    <div className="space-y-4">
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider pl-1">Class Details</label>
                        <div className="grid grid-cols-3 gap-3">
                            <Select value={allocDegree} onChange={e => setAllocDegree(e.target.value)}>
                                {degrees.map(d => <option key={d} value={d}>{d}</option>)}
                            </Select>
                            <Select value={allocSemester} onChange={e => setAllocSemester(e.target.value)}>
                                {Array.from({ length: 8 }, (_, i) => i + 1).map(s => <option key={s} value={s}>Sem {s}</option>)}
                            </Select>
                            <Select value={allocSection} onChange={e => setAllocSection(e.target.value)}>
                                <option value="">Select Section</option>
                                {(availableSections || []).map(s => <option key={s} value={s}>Sec {s}</option>)}
                            </Select>
                        </div>
                        <div className="flex gap-2">
                            <Select value={allocSubject} onChange={e => setAllocSubject(e.target.value)} icon={Book} disabled={!subjects.length}>
                                <option value="">-- Select Subject --</option>
                                {subjects.length > 0 ? (
                                    subjects.map(s => <option key={s} value={s}>{s}</option>)
                                ) : (
                                    <option value="" disabled>No subjects found for this class</option>
                                )}
                            </Select>
                            <button
                                className={`${buttonClass} bg-yellow-600 hover:bg-yellow-500 text-white w-auto px-6`}
                                onClick={handleAllocate}
                                disabled={!selectedFaculty || isAllocating || !allocSubject}
                            >
                                {isAllocating ? <Loader2 className="animate-spin w-5 h-5" /> : <Plus className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="space-y-4">
                <div className="flex justify-between items-end">
                    <h5 className="text-sm font-bold text-slate-300 uppercase tracking-widest pl-1">Directory & Allocations</h5>

                    {/* Filters UI */}
                    <div className="flex gap-2">
                        <select className="bg-slate-900 border border-white/10 text-xs rounded px-2 py-1 text-slate-300 outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 cursor-pointer" value={filterDegree} onChange={e => setFilterDegree(e.target.value)}>
                            <option value="">Degree</option>
                            {(degrees || []).map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <select className="bg-slate-900 border border-white/10 text-xs rounded px-2 py-1 text-slate-300 outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 cursor-pointer" value={filterSemester} onChange={e => setFilterSemester(e.target.value)}>
                            <option value="">Semester</option>
                            {Array.from({ length: 8 }, (_, i) => i + 1).map(s => <option key={s} value={s}>Sem {s}</option>)}
                        </select>
                        <select className="bg-slate-900 border border-white/10 text-xs rounded px-2 py-1 text-slate-300 outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 cursor-pointer" value={filterSection} onChange={e => setFilterSection(e.target.value)}>
                            <option value="">Section</option>
                            {(availableFilterSections || []).map(s => <option key={s} value={s}>Sec {s}</option>)}
                        </select>
                    </div>
                </div>

                {!filtersActive ? (
                    <div className="text-center py-20 bg-slate-900/20 rounded-2xl border border-white/5 text-slate-600 animate-in fade-in zoom-in-95 duration-500">
                        <div className="w-16 h-16 rounded-full bg-slate-800 mx-auto mb-4 flex items-center justify-center">
                            <Filter className="w-8 h-8 text-slate-500" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-400 mb-1">Directory Filtered</h3>
                        <p className="text-sm text-slate-500">Please select a Degree, Semester, or Section to view faculty.</p>
                    </div>
                ) : isLoading ? <div className="text-center p-20"><Loader2 className="animate-spin w-10 h-10 mx-auto text-yellow-500 opacity-50" /></div> : filteredFaculty.length === 0 ? <div className="text-center py-20 bg-slate-900/20 rounded-2xl border border-white/5 text-slate-600">No faculty members found matching criteria.</div> : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {filteredFaculty.map(f => (
                            <div key={f.id} className="bg-slate-800/20 rounded-xl border border-white/5 p-5 hover:bg-slate-800/40 hover:border-white/10 transition-all duration-300 group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center">
                                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 border border-white/10 flex items-center justify-center text-slate-300 font-bold text-lg mr-3 shadow-inner">
                                            {f.name[0]}
                                        </div>
                                        <div>
                                            <div className="font-bold text-white group-hover:text-yellow-400 transition-colors">{f.name}</div>
                                            <div className="text-xs text-slate-500 font-mono mt-0.5">{f.email} • {f.emp_id}</div>
                                        </div>
                                    </div>
                                    {f.allocations.length > 0 && <span className="bg-yellow-500/10 text-yellow-500 text-[10px] font-bold px-2 py-1 rounded border border-yellow-500/20 uppercase tracking-widest">{f.allocations.length} SUB</span>}
                                </div>

                                <div className="space-y-2">
                                    {f.allocations.length === 0 ? (
                                        <div className="text-xs text-slate-600 italic pl-1">No subjects allocated yet.</div>
                                    ) : (
                                        f.allocations.map(a => (
                                            <div key={a.id} className="flex justify-between items-center bg-slate-900/60 p-2.5 rounded-lg border border-white/5 text-sm group/item hover:border-white/10 transition-colors">
                                                <div className="flex items-center">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/50 mr-3"></div>
                                                    <span className="text-slate-200 font-medium mr-2">{a.subject}</span>
                                                    <span className="text-xs text-slate-500">
                                                        {a.degree} • {a.semester}-{a.section}
                                                    </span>
                                                </div>
                                                <button onClick={() => handleDeallocate(a.id)} className="text-slate-600 hover:text-red-400 p-1 opacity-0 group-hover/item:opacity-100 transition-all">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
