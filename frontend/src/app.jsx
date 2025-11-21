// NoteOrbitStudentHostel.jsx (FINAL IMPLEMENTATION - Including Live Hostel Complaint Tracking)
import React, { useEffect, useState, useCallback } from "react";
import axios from 'axios';
import { 
    LogIn, UserPlus, LogOut, ArrowLeft, Loader2, CheckCircle, XCircle, ChevronDown, 
    Book, Bell, Settings, Briefcase, User, Mail, Lock, GraduationCap, ClipboardList, 
    BriefcaseBusiness, DollarSign, Award, MessageSquare, Upload, RefreshCw, 
    Trash2, Save, Home, Search, Download, Check 
} from 'lucide-react';

// --- CONFIGURATION ---
const BACKEND_BASE_URL = "http://127.0.0.1:5000"; 

// --- AXIOS CONFIGURATION ---
const api = axios.create({
    baseURL: BACKEND_BASE_URL,
});

/**
 * Creates an authenticated instance of the axios API object.
 * Retrieves the token from localStorage just before the request.
 * It also attaches the 401 response handler locally.
 */
const auth = (token = null) => {
    const currentToken = token || localStorage.getItem("noteorbit_token");
    const authedApi = axios.create({ baseURL: BACKEND_BASE_URL });

    if (currentToken) {
        authedApi.defaults.headers.common['Authorization'] = `Bearer ${currentToken}`;
    } else {
        delete authedApi.defaults.headers.common['Authorization'];
    }

    // Re-introduce the global 401 response logic here, applied to the temporary instance
    authedApi.interceptors.response.use(
        res => res,
        err => {
            if (err.response && err.response.status === 401) {
                // Clear saved auth if backend says unauthorized
                localStorage.removeItem("noteorbit_token");
                localStorage.removeItem("noteorbit_user");
            }
            return Promise.reject(err);
        }
    );

    return authedApi;
};

// The following function is ONLY for login/register/unauthenticated requests.
const unauth = () => {
    return api;
}

// --- END AXIOS CONFIGURATION ---

// Manage auth token both in localStorage and axios defaults
const setAuthToken = (token) => {
    if (token) {
        localStorage.setItem("noteorbit_token", token);
    } else {
        localStorage.removeItem("noteorbit_token");
    }
};

function useCatalogs() {
    const [degrees, setDegrees] = useState([]);
    const [sections, setSections] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [loaded, setLoaded] = useState(false);

    const fetchBasics = useCallback(async () => {
        try {
            // Using unauth() for public catalog lists
            const [deg, sec] = await Promise.all([
                unauth().get("/admin/degrees"),
                unauth().get("/admin/sections")
            ]);
            setDegrees(deg.data.degrees || []);
            setSections(sec.data.sections || []);
        } catch (e) {
            console.error("Failed to fetch basics from backend:", e);
            setDegrees([]);
            setSections([]);
        } finally {
            setLoaded(true);
        }
    }, []);

    const fetchSubjects = useCallback(async (degree, semester) => {
        if (!degree || !semester) {
            setSubjects([]);
            return [];
        }
        try {
            // Using unauth() for public catalog lists
            const res = await unauth().get("/admin/subjects", { params: { degree, semester } });
            const subjNames = (res.data.subjects || []).map(s => s.name);
            setSubjects(subjNames);
            return subjNames;
        } catch (e) {
            console.error("Failed to fetch subjects:", e);
            setSubjects([]);
            return [];
        }
    }, []);

    useEffect(() => { fetchBasics(); }, [fetchBasics]);
    return { degrees, sections, subjects, fetchSubjects, loaded, fetchBasics };
}

function useLocalUser() {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const loadUser = useCallback(() => {
        const raw = localStorage.getItem("noteorbit_user");
        const token = localStorage.getItem("noteorbit_token");

        if (raw && token) {
            try {
                const parsedUser = JSON.parse(raw);
                setUser(parsedUser);
                setAuthToken(token);
            } catch (e) {
                console.error("Corrupted user data in localStorage", e);
                setAuthToken(null);
                localStorage.removeItem("noteorbit_user");
                setUser(null);
            }
        }
        setIsLoading(false);
    }, []);

    useEffect(() => { loadUser(); }, [loadUser]);

    return [user, setUser, isLoading];
}

// --- UI COMPONENTS (Praman Style) ---
const Input = ({ icon: Icon, className = '', type = 'text', ...props }) => (
    <div className="relative">
        {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />}
        <input
            {...props}
            type={type}
            className={`w-full bg-white text-gray-800 placeholder-gray-500 border border-gray-300 rounded-full py-3 ${Icon ? 'pl-12 pr-4' : 'px-4'} focus:ring-2 focus:ring-blue-500 outline-none transition duration-200 ${className}`}
        />
    </div>
);

const Select = ({ icon: Icon, className = '', children, ...props }) => (
    <div className="relative">
        {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />}
        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
        <select
            {...props}
            className={`w-full bg-white text-gray-800 border border-gray-300 rounded-full py-3 ${Icon ? 'pl-12 pr-10' : 'px-4'} appearance-none focus:ring-2 focus:ring-blue-500 outline-none transition duration-200 ${className}`}
        >
            {children}
        </select>
    </div>
);

const MessageBar = ({ message, type, onClose }) => {
    if (!message) return null;
    const isSuccess = type === 'success';
    const baseClasses = "p-4 rounded-xl shadow-md text-sm flex items-start mt-6 animate-in fade-in duration-500";
    const classes = isSuccess 
        ? "bg-green-100 border border-green-300 text-green-700" 
        : "bg-red-100 border border-red-300 text-red-700";
    const Icon = isSuccess ? CheckCircle : XCircle;

    return (
        <div className={`${baseClasses} ${classes}`}>
            <Icon className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
            <div className="flex-1 whitespace-pre-wrap">{message}</div>
            {onClose && (
                <button onClick={onClose} className="ml-4 text-gray-500 hover:text-gray-700">
                    <XCircle className="w-4 h-4" />
                </button>
            )}
        </div>
    );
};

// ----------------------------------------------
// --- AUTH COMPONENTS ---
function UserTypeSelection({ setUserRole, setPage, primaryButtonClass, buttonClass }) {
    const [selectedRole, setSelectedRole] = useState(null);
    const roles = [
        { ui: 'Admin', icon: BriefcaseBusiness, color: 'text-yellow-600', description: 'Institutional Management' },
        { ui: 'Faculty', icon: ClipboardList, color: 'text-green-600', description: 'Resource Uploader & Notice Board' },
        { ui: 'Student', icon: GraduationCap, color: 'text-blue-600', description: 'Access Notes & AI Assistant' },
    ];

    const handleContinue = () => {
        if (selectedRole) {
            setUserRole(selectedRole);
            setPage('credentials');
        }
    };

    return (
        <div className="w-full max-w-xl mx-auto bg-white p-8 rounded-2xl shadow-2xl border border-blue-200 animate-in fade-in duration-700">
            <h3 className="text-3xl font-bold mb-2 text-gray-800 text-center">Select Your Access Portal</h3>
            <p className="text-center text-gray-500 mb-6">Choose your user type to proceed with sign-in.</p>
            
            <div className="space-y-4">
                {roles.map(role => (
                    <button
                        key={role.ui}
                        onClick={() => setSelectedRole(role.ui)}
                        className={`w-full p-4 rounded-xl shadow-md border transition duration-200 flex items-center ${
                            selectedRole === role.ui 
                                ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-500' 
                                : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
                        }`}
                    >
                        <role.icon className={`w-8 h-8 mr-4 ${role.color}`} />
                        <div className="text-left">
                            <div className="font-bold text-lg text-gray-800">{role.ui}</div>
                            <div className="text-sm text-gray-500">{role.description}</div>
                        </div>
                    </button>
                ))}
            </div>

            <button
                onClick={handleContinue}
                disabled={!selectedRole}
                className={`mt-8 ${buttonClass} py-3 ${selectedRole ? primaryButtonClass : 'bg-gray-400 cursor-not-allowed text-gray-800'}`}
            >
                Continue to Login
            </button>
        </div>
    );
}

function CredentialsView({ onLogin, onRegister, userRole, setPage, catalogs, primaryButtonClass, successButtonClass, buttonClass, authMode, setAuthMode }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loginFormActive, setLoginFormActive] = useState(authMode === "login");

    const { degrees, sections, loaded } = catalogs;
    const [srn, setSrn] = useState("");
    const [name, setName] = useState("");
    const [regEmail, setRegEmail] = useState("");
    const [regPassword, setRegPassword] = useState("");
    const [degree, setDegree] = useState("");
    const [semester, setSemester] = useState("1");
    const [section, setSection] = useState("");

    const isStudent = userRole === 'Student';
    const headerText = `${userRole} Portal`;
    
    useEffect(() => {
        setLoginFormActive(authMode === 'login');
    }, [authMode]);

    useEffect(() => {
        if (loaded && Array.isArray(degrees) && degrees.length > 0 && Array.isArray(sections) && sections.length > 0) {
            if (!degree) setDegree(degrees[0] || "");
            if (!section) setSection(sections[0] || "");
        }
    }, [loaded, degrees, sections, degree, section]);

    const handleRegisterSubmit = () => {
        onRegister({ srn, name, email: regEmail, password: regPassword, degree, semester: parseInt(semester), section });
    };
    
    const handleBack = () => {
        setPage('user_type');
        setAuthMode('login');
    }

    return (
        <div className="w-full bg-white p-8 rounded-2xl shadow-2xl border border-blue-200">
            <h3 className="text-3xl font-bold mb-6 text-gray-800 text-center">{headerText}</h3>

            {isStudent && (
                <div className="flex justify-center mb-6">
                    <div className="flex space-x-0 bg-gray-200 p-1 rounded-full shadow-inner">
                        <button
                            onClick={() => setAuthMode('login')}
                            className={`px-6 py-2 rounded-l-full font-semibold transition duration-200 ${loginFormActive ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-300'}`}
                        >
                            Sign In
                        </button>
                        <button
                            onClick={() => setAuthMode('register')}
                            className={`px-6 py-2 rounded-r-full font-semibold transition duration-200 ${!loginFormActive ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-300'}`}
                        >
                            Sign Up
                        </button>
                    </div>
                </div>
            )}

            {loginFormActive ? (
                <div className="space-y-4">
                    <Input icon={Mail} placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                    <Input icon={Lock} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
                    <div className="flex gap-3 pt-4">
                        <button className={`${buttonClass} flex-1 bg-gray-400 hover:bg-gray-500 text-gray-900`} onClick={handleBack}><ArrowLeft className="w-5 h-5 mr-1" /> Back</button>
                        <button className={`${buttonClass} flex-1 ${primaryButtonClass}`} onClick={() => onLogin(email, password)}>Sign In</button>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <Input placeholder="SRN" value={srn} onChange={e => setSrn(e.target.value)} />
                    <Input placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} />
                    <Input type="email" placeholder="Email" value={regEmail} onChange={e => setRegEmail(e.target.value)} />
                    <Input type="password" placeholder="Password" value={regPassword} onChange={e => setRegPassword(e.target.value)} />

                    <div className="grid grid-cols-3 gap-3 pt-2">
                        <Select value={degree} onChange={e => setDegree(e.target.value)}>
                            {(degrees || []).map(d => <option key={d} value={d}>{d}</option>)}
                        </Select>
                        <Select value={semester} onChange={e => setSemester(e.target.value)}>
                            {Array.from({ length: 8 }, (_, i) => i + 1).map(s => <option key={s} value={s}>{s}</option>)}
                        </Select>
                        <Select value={section} onChange={e => setSection(e.target.value)}>
                            {(sections || []).map(s => <option key={s} value={s}>{s}</option>)}
                        </Select>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button className={`${buttonClass} flex-1 bg-gray-400 hover:bg-gray-500 text-gray-900`} onClick={handleBack}><ArrowLeft className="w-5 h-5 mr-1" /> Back</button>
                        <button className={`${buttonClass} flex-1 ${successButtonClass}`} onClick={handleRegisterSubmit}>Register Account</button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ----------------------------------------------
// --- STUDENT MODULES ---

// --- NEW COMPONENT: Student Feedback ---
function StudentFeedback({ showMessage }) {
    const [feedback, setFeedback] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchFeedback = useCallback(async () => {
        setIsLoading(true);
        try {
            // This is the functional endpoint already defined in app.py
            const res = await auth().get("/student/feedback");
            setFeedback(res.data.feedback || []);
        } catch (e) {
            if (e.response && e.response.status !== 401) {
                showMessage(e.response?.data?.message || "Failed to fetch faculty feedback.", 'error');
            }
            setFeedback([]);
        } finally {
            setIsLoading(false);
        }
    }, [showMessage]);

    useEffect(() => { fetchFeedback(); }, [fetchFeedback]);

    if (isLoading) {
        return <div className="text-center p-10"><Loader2 className="animate-spin w-8 h-8 mx-auto text-yellow-500" /></div>;
    }

    return (
        <div className="space-y-6">
            <h4 className="text-2xl font-bold text-yellow-700 flex items-center"><MessageSquare className="w-6 h-6 mr-2" /> Faculty Feedback Report</h4>
            
            {feedback.length === 0 && <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-500">No personalized feedback has been sent by faculty yet.</div>}

            <div className="space-y-4">
                {feedback.map((f, index) => (
                    <div key={index} className="bg-yellow-50 p-5 rounded-xl shadow-lg border-l-4 border-yellow-500">
                        <div className="font-bold text-lg text-gray-800 mb-2">Subject: {f.subject}</div>
                        
                        <p className="text-gray-700 whitespace-pre-wrap border-l-2 border-gray-200 pl-3 py-1 text-[0.95rem]">{f.text}</p>

                        <div className="text-xs text-gray-500 mt-3 pt-2 border-t border-yellow-100">
                            Sent by Faculty ID: {f.faculty_id} on {new Date(f.created_at).toLocaleDateString()}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function StudentNotesNotices({ user, showMessage, catalogs, primaryButtonClass, buttonClass }) {
    const { fetchSubjects, subjects } = catalogs;
    const [selectedSubject, setSelectedSubject] = useState(''); 
    const [notes, setNotes] = useState([]);
    const [notices, setNotices] = useState([]);
    const [isFetching, setIsFetching] = useState(false);
    
    const fetchContent = useCallback(async (subjectToFetch) => {
        if (!subjectToFetch || !user.degree || !user.semester) {
            setNotes([]); setNotices([]); return;
        }
        setIsFetching(true);
        try {
            // Using auth()
            const [notesRes, noticesRes] = await Promise.all([
                auth().get("/notes", { params: { degree: user.degree, semester: user.semester, subject: subjectToFetch } }),
                auth().get("/notices", { params: { subject: subjectToFetch } })
            ]);
            setNotes(notesRes.data.notes || []);
            setNotices(noticesRes.data.notices || []);
        } catch (e) {
            // Only show general error if not 401 (401 handled by auth interceptor)
            if (e.response && e.response.status !== 401) {
                showMessage("Failed to load content.", 'error'); 
            }
            setNotes([]); setNotices([]);
        } finally {
            setIsFetching(false);
        }
    }, [user.degree, user.semester, showMessage]); 

    useEffect(() => {
        if (user && user.degree && user.semester) { fetchSubjects(user.degree, user.semester); } else { fetchSubjects(null, null); }
    }, [user.degree, user.semester, fetchSubjects]);

    useEffect(() => {
        let subjectToUse = selectedSubject;
        if (Array.isArray(subjects) && subjects.length > 0) {
            if (!subjectToUse || !subjects.includes(subjectToUse)) {
                subjectToUse = subjects[0];
                setSelectedSubject(subjectToUse);
            }
        } else {
            setSelectedSubject('');
            subjectToUse = null;
        }
        if (subjectToUse) { fetchContent(subjectToUse); } else { setNotes([]); setNotices([]); }
    }, [subjects, selectedSubject, fetchContent]); 

    const handleRefresh = () => {
        if (selectedSubject) fetchContent(selectedSubject);
    };

    if (!user.degree || !user.semester) {
        return <div className="text-center p-10 bg-white rounded-xl shadow-md text-gray-500">Student profile missing degree/semester information. Please contact admin.</div>;
    }
    if (!subjects || subjects.length === 0) {
        return <div className="text-center p-10 bg-white rounded-xl shadow-md text-gray-500">No subjects are currently defined for {user.degree} Sem {user.semester}.</div>;
    }

    return (
        <div className="space-y-8">
            <div className="bg-blue-50 p-6 rounded-xl border border-blue-200 shadow-inner">
                <strong className="text-xl text-blue-700 block mb-1">Content Context</strong>
                <div className="text-sm text-gray-600">{user.degree} (Semester {user.semester} / Section {user.section})</div>
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center pt-4">
                    <label className="text-base text-gray-700 font-bold flex-shrink-0">Filter Subject:</label>
                    <Select className="flex-1 max-w-xs" value={selectedSubject || ''} onChange={e => setSelectedSubject(e.target.value)} disabled={!subjects.length || isFetching}>
                        {Array.isArray(subjects) && subjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </Select>
                    <button className={`${buttonClass} bg-gray-400 hover:bg-gray-500 text-gray-900 text-sm sm:w-48 py-2.5`} onClick={handleRefresh} disabled={isFetching || !selectedSubject}>
                        {isFetching ? <Loader2 className="animate-spin w-5 h-5 mr-1" /> : <RefreshCw className="w-5 h-5 mr-1" />}
                        {isFetching ? 'Refreshing...' : 'Refresh Content'}
                    </button>
                </div>
            </div>

            <div>
                <h4 className="text-xl font-bold mt-4 mb-4 text-blue-700 flex items-center"><Book className="w-5 h-5 mr-2" /> Notes for "{selectedSubject || '...'}"</h4>
                {isFetching && <div className="text-center p-4"><Loader2 className="animate-spin w-5 h-5 mx-auto text-blue-500" /></div>}
                {!isFetching && notes.length === 0 && <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 text-sm">No notes uploaded for {selectedSubject} yet.</div>}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {notes.map(n => (
                        <div key={n.id} className="p-4 rounded-xl shadow-md border-l-4 border-blue-500 bg-white hover:bg-blue-50 transition duration-200">
                            <div className="font-bold text-lg text-gray-800 truncate">{n.title} <span className="text-xs text-blue-500">({n.document_type})</span></div>
                            <div className="text-xs text-gray-500 mt-1">{n.subject} | Uploaded: {new Date(n.timestamp).toLocaleDateString()}</div>
                            <div className="mt-3">
                                {n.file_url && <a className={`py-1.5 px-4 text-sm font-semibold rounded-full inline-flex items-center ${primaryButtonClass}`} href={n.file_url} target="_blank" rel="noopener noreferrer">Download</a>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div>
                <h4 className="text-xl font-bold mt-8 mb-4 text-red-700 flex items-center"><Bell className="w-5 h-5 mr-2" /> Notices for "{selectedSubject || '...'}"</h4>
                {!isFetching && notices.length === 0 && <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 text-sm">No recent notices for {selectedSubject} matching your context.</div>}
                <div className="space-y-4">
                    {notices.map(n => (
                        <div key={n.id} className="p-4 bg-red-50 border-l-4 border-red-500 rounded-xl shadow-md">
                            <div className="font-bold text-xl text-red-700">{n.title}</div>
                            <div className="text-xs text-gray-500 mt-1">
                                Subject: {n.subject} | Target: {n.degree} Sem {n.semester} Sec {n.section}
                            </div>
                            <p className="mt-2 text-gray-700 text-[0.95rem]">{n.message}</p>
                            <div className="flex justify-between items-center mt-3 pt-2 border-t border-red-100">
                                <div className="text-xs text-gray-500">
                                    Posted by: {n.professor_name} on {new Date(n.created_at).toLocaleDateString()}
                                    {n.deadline && <span className="font-bold text-red-600 block mt-1">Deadline: {new Date(n.deadline).toLocaleDateString()}</span>}
                                </div>
                                {n.attachment_url && <a href={n.attachment_url} className={`py-1.5 px-4 text-sm font-semibold rounded-full inline-flex items-center bg-red-600 hover:bg-red-700 text-white`} target="_blank" rel="noopener noreferrer">Attachment</a>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function StudentFees({ user, showMessage, primaryButtonClass, buttonClass }) {
    const [fees, setFees] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchFees = useCallback(async () => {
        setIsLoading(true);
        try {
            // Using auth()
            const res = await auth().get("/fees/list");
            setFees(res.data.fees || []);
        } catch (e) {
            if (e.response && e.response.status !== 401) {
                showMessage("Failed to fetch fee list.", 'error');
            }
            setFees([]);
        } finally {
            setIsLoading(false);
        }
    }, [showMessage]);

    useEffect(() => { fetchFees(); }, [fetchFees]);

    const handlePay = async (targetId) => {
        try {
            // Using auth()
            const res = await auth().post("/fees/pay", { target_id: targetId });
            const { order_id } = res.data;
            // The backend returns an order_id which is used to redirect to the demo payment page
            window.location.href = `${BACKEND_BASE_URL}/demo/checkout/${order_id}`;
        } catch (e) {
            if (e.response && e.response.status !== 401) {
                showMessage(e.response?.data?.message || "Payment initiation failed.", 'error');
            }
        }
    };

    const handleReceipt = async (paymentId) => {
        try {
            // paymentId here is the ft.order_id which is set to the Payment ID after checkout
            // Using auth()
            const res = await auth().get(`/fees/receipt/${paymentId}`);
            window.open(res.data.receipt_url, '_blank');
        } catch (e) {
            if (e.response && e.response.status !== 401) {
                showMessage(e.response?.data?.message || "Failed to get receipt URL. It may have expired.", 'error');
            }
        }
    };

    if (isLoading) {
        return <div className="text-center p-10"><Loader2 className="animate-spin w-8 h-8 mx-auto text-blue-500" /></div>;
    }

    return (
        <div className="space-y-6">
            <h4 className="text-2xl font-bold text-blue-700 flex items-center"><DollarSign className="w-6 h-6 mr-2" /> Fee Payment History</h4>
            {fees.length === 0 && <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-500">No fee notifications found for your account.</div>}
            
            <div className="space-y-4">
                {fees.map(f => (
                    <div key={f.target_id} className={`p-4 rounded-xl shadow-lg transition duration-200 ${
                        f.status === 'paid' 
                            ? 'bg-green-50 border-l-4 border-green-500' 
                            : 'bg-red-50 border-l-4 border-red-500'
                    }`}>
                        <div className="flex justify-between items-center">
                            <div className="flex-1">
                                <div className="font-bold text-lg text-gray-800">{f.title} <span className="text-xs font-normal">({f.category})</span></div>
                                <div className="text-sm text-gray-600 mt-1">Amount: **₹{f.amount}** | Due: {f.due_date ? new Date(f.due_date).toLocaleDateString() : 'N/A'}</div>
                            </div>
                            <div className="flex-shrink-0 ml-4">
                                {f.status === 'pending' && (
                                    <button 
                                        className={`${buttonClass} w-32 py-2.5 ${primaryButtonClass}`} 
                                        onClick={() => handlePay(f.target_id)}
                                    >
                                        Pay Now
                                    </button>
                                )}
                                {f.status === 'paid' && (
                                    <button 
                                        className={`${buttonClass} w-32 py-2.5 bg-green-600 hover:bg-green-700 text-white`} 
                                        onClick={() => handleReceipt(f.payment_id)}
                                    >
                                        Receipt
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 border-t border-gray-100 pt-1">Status: **{f.status.toUpperCase()}** {f.paid_at && `on ${new Date(f.paid_at).toLocaleDateString()}`}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function StudentMarks({ showMessage }) {
    const [marks, setMarks] = useState({});
    const [isLoading, setIsLoading] = useState(true);

    const fetchMarks = useCallback(async () => {
        setIsLoading(true);
        try {
            // Using auth()
            const res = await auth().get("/student/marks");
            // API returns marks grouped by subject
            setMarks(res.data.marks || {});
        } catch (e) {
            if (e.response && e.response.status !== 401) {
                showMessage(e.response?.data?.message || "Failed to fetch marks data.", 'error');
            }
            setMarks({});
        } finally {
            setIsLoading(false);
        }
    }, [showMessage]);

    useEffect(() => { fetchMarks(); }, [fetchMarks]);
    
    const calculateSubjectSummary = (subjectMarks) => {
        if (!subjectMarks || subjectMarks.length === 0) return { obtained: 0, max: 0, percent: 0 };
        // Ensure values are numbers for calculation
        const totalObtained = subjectMarks.reduce((sum, m) => sum + (parseFloat(m.marks_obtained) || 0), 0);
        const totalMax = subjectMarks.reduce((sum, m) => sum + (parseFloat(m.max_marks) || 0), 0);
        const percentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(1) : 0;
        return { obtained: totalObtained.toFixed(1), max: totalMax.toFixed(1), percent: percentage };
    };

    if (isLoading) {
        return <div className="text-center p-10"><Loader2 className="animate-spin w-8 h-8 mx-auto text-blue-500" /></div>;
    }
    
    const subjectNames = Object.keys(marks);

    return (
        <div className="space-y-6">
            <h4 className="text-2xl font-bold text-blue-700 flex items-center"><Award className="w-6 h-6 mr-2" /> Academic Marks Report</h4>
            {subjectNames.length === 0 && <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-500">No marks have been recorded for your subjects yet.</div>}

            <div className="space-y-6">
                {subjectNames.map(subject => {
                    const summary = calculateSubjectSummary(marks[subject]);
                    return (
                        <div key={subject} className="bg-white p-5 rounded-xl shadow-lg border-l-4 border-yellow-500">
                            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                                <h5 className="text-xl font-bold text-gray-800">{subject}</h5>
                                <div className={`text-lg font-semibold px-3 py-1 rounded-full ${summary.percent >= 75 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                    {summary.percent}% Overall
                                </div>
                            </div>
                            <div className="pt-3 space-y-2">
                                {marks[subject].map((m, index) => (
                                    <div key={index} className="flex justify-between text-sm text-gray-700 border-b border-dashed border-gray-200 last:border-b-0 py-1">
                                        <span className="font-medium capitalize">{m.exam_type}:</span>
                                        <span className="font-semibold text-gray-900">{m.marks_obtained} / {m.max_marks}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 pt-3 border-t border-gray-200 text-sm font-semibold text-gray-800 flex justify-between">
                                <span>Total:</span>
                                <span>{summary.obtained} / {summary.max}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// --- NEW COMPONENT: Complaint Audit Trail Renderer ---
const ComplaintAuditTimeline = ({ auditTrail }) => {
    // Sort history by timestamp (newest first for display)
    const sortedHistory = [...auditTrail].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return (
        <div className="mt-4 p-4 bg-gray-100 border border-red-200 rounded-lg">
            <h3 className="text-md font-semibold text-gray-700 mb-3">
                Tracking History
            </h3>
            <div className="relative border-l border-red-500 pl-4 space-y-3">
                {sortedHistory.map((entry, index) => (
                    <div key={index} className="relative">
                        <div className="absolute w-3 h-3 bg-red-500 rounded-full mt-1 -left-[18px] border-4 border-white"></div>
                        <p className="text-sm font-medium text-gray-800">
                            Status: <span className="font-bold text-red-700">{entry.status}</span>
                        </p>
                        {entry.note && <p className="text-xs text-gray-600 italic">Note: {entry.note}</p>}
                        <p className="text-xs text-gray-500 italic mt-0.5">
                            {new Date(entry.timestamp).toLocaleString()} by {entry.by}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- STUDENT MODULE: Hostel Complaints (MODIFIED FOR LIVE TRACKING) ---
function HostelComplaints({ showMessage, primaryButtonClass, buttonClass }) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [attachment, setAttachment] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [userComplaints, setUserComplaints] = useState([]);
    const [isFetching, setIsFetching] = useState(true);
    const [hostelStatus, setHostelStatus] = useState('checking'); // 'allowed', 'not_allowed', 'error', 'checking'

    // This function attempts to fetch complaints and infers allocation status.
    const fetchUserComplaints = useCallback(async () => {
        setIsFetching(true);
        setHostelStatus('checking');

        try {
            // GET /student/hostel/complaints is the new endpoint
            const res = await auth().get("/student/hostel/complaints");
            setUserComplaints(res.data.complaints || []);
            setHostelStatus('allowed'); 

        } catch (e) {
            if (e.response) {
                 if (e.response.status === 403 || (e.response.data.message && e.response.data.message.includes('not allowed'))) {
                    setHostelStatus('not_allowed');
                } else if (e.response.status !== 401) {
                    showMessage(e.response?.data?.message || "Failed to load complaint history.", 'error');
                    setHostelStatus('error');
                }
            }
            setUserComplaints([]);
        } finally {
            setIsFetching(false);
        }
    }, [showMessage]);

    useEffect(() => { fetchUserComplaints(); }, [fetchUserComplaints]);

    const handleSubmit = async () => {
        if (!title || !description) {
            return showMessage("Title and description are required.", 'error');
        }
        
        setIsLoading(true);
        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        if (attachment) formData.append('attachment', attachment);

        try {
            const res = await auth().post("/hostel/complaints", formData); 
            showMessage(res.data.message, 'success');
            setTitle(''); setDescription(''); setAttachment(null);
            if (document.getElementById('complaintAttachment')) document.getElementById('complaintAttachment').value = '';
            
            // Refresh the list immediately after submission
            fetchUserComplaints(); 

        } catch (e) {
            const msg = e.response?.data?.message || "Failed to submit complaint. Check allocation status.";
            if (e.response && e.response.status === 403) {
                 setHostelStatus('not_allowed'); // Explicitly block if 403
            }
            showMessage(msg, 'error');
        } finally {
            setIsLoading(false);
        }
    };
    
    if (isFetching && hostelStatus === 'checking') {
        return <div className="text-center p-10"><Loader2 className="animate-spin w-8 h-8 mx-auto text-red-500" /></div>;
    }

    if (hostelStatus === 'not_allowed') {
        return (
            <div className="text-center p-10 bg-red-100 rounded-xl shadow-md border border-red-300">
                <XCircle className="w-10 h-10 mx-auto text-red-600 mb-4" />
                <h4 className="text-2xl font-bold text-red-700">Complaint Submission Blocked</h4>
                <p className="text-lg text-red-600 mt-2">**Not allowed for complaining as no hostel is allotted for you.**</p>
                <p className="text-sm text-gray-600 mt-4">Please contact the administration if you believe this is an error.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-lg border border-red-200 space-y-4">
                <h4 className="text-2xl font-bold mb-4 text-red-700 flex items-center"><Home className="w-6 h-6 mr-2" /> Raise Hostel Complaint</h4>
                <Input placeholder="Complaint Title (e.g., Water leakage in Room 101)" value={title} onChange={e => setTitle(e.target.value)} disabled={isLoading}/>
                <textarea className="w-full bg-white text-gray-800 placeholder-gray-500 border border-gray-300 rounded-xl py-3 px-4 focus:ring-2 focus:ring-red-500 outline-none transition duration-200 h-32" placeholder="Detailed description of the issue..." value={description} onChange={e => setDescription(e.target.value)} disabled={isLoading}/>
                <label className="block text-sm text-gray-700 font-medium pt-2">Attach Image/File (Optional):</label>
                <input id="complaintAttachment" type="file" onChange={e => setAttachment(e.target.files[0])} className="w-full text-gray-600 bg-gray-100 rounded-lg p-3 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-600 file:text-white hover:file:bg-red-700 transition duration-200" disabled={isLoading}/>
                <button className={`${buttonClass} ${primaryButtonClass} bg-red-600 hover:bg-red-700 text-white w-full`} onClick={handleSubmit} disabled={isLoading || !title || !description}>
                    {isLoading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Mail className="w-5 h-5 mr-2" />}
                    {isLoading ? 'Submitting...' : 'Submit Complaint'}
                </button>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-xl font-bold text-red-700 flex items-center"><ClipboardList className="w-5 h-5 mr-2" /> Your Complaint History ({userComplaints.length})</h4>
                    <button onClick={fetchUserComplaints} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition" disabled={isFetching}><RefreshCw className="w-5 h-5 text-gray-600" /></button>
                </div>
                
                {isFetching ? (
                    <div className="text-center p-4"><Loader2 className="animate-spin w-5 h-5 mx-auto text-red-500" /></div>
                ) : userComplaints.length === 0 ? (
                    <div className="p-4 text-gray-500 text-center">You have no active or historical complaints.</div>
                ) : (
                    <div className="space-y-6">
                        {userComplaints.map(c => (
                            <div key={c.id} className={`p-4 rounded-xl shadow-md border-l-4 ${c.status === 'Resolved' || c.status === 'Closed' ? 'border-green-500 bg-green-50' : c.status.includes('Progress') || c.status.includes('Review') ? 'border-orange-500 bg-orange-50' : 'border-red-500 bg-red-50'}`}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="font-bold text-lg text-gray-800">{c.title}</div>
                                        <div className="text-sm text-gray-600 mt-1">Room: {c.room_number} in {c.hostel_name}</div>
                                    </div>
                                    <div className={`text-sm px-3 py-1 rounded-full font-semibold ${c.status === 'Resolved' || c.status === 'Closed' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                                        {c.status}
                                    </div>
                                </div>
                                <ComplaintAuditTimeline auditTrail={c.audit_trail || []} />
                                {c.file_url && <a href={c.file_url} className="mt-3 inline-flex items-center text-xs text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">View Attachment</a>}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function UnifiedLibrarySearch({ showMessage, primaryButtonClass, buttonClass }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchSource, setSearchSource] = useState('internal'); // 'internal' or 'openlibrary'
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const performSearch = useCallback(async () => {
        if (!searchTerm.trim()) {
            setResults([]);
            return;
        }

        setIsLoading(true);
        const query = encodeURIComponent(searchTerm.trim());
        
        try {
            // Use the unified backend endpoint /api/library/search
            const res = await auth().get(`/api/library/search?q=${query}&source=${searchSource}`);
            
            // The backend is responsible for formatting, so we take results directly
            setResults(res.data.books || []);

        } catch (e) {
            if (e.response && e.response.status !== 401) {
                showMessage(e.response?.data?.message || `Search failed against ${searchSource} library.`, 'error');
            }
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    }, [searchTerm, searchSource, showMessage]);

    // Calculate total results based on state
    const allResults = results;

    return (
        <div className="space-y-6">
            <h4 className="text-2xl font-bold text-blue-700 flex items-center"><Book className="w-6 h-6 mr-2" /> Unified Library Search</h4>
            
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                <Select className="sm:w-40 flex-shrink-0" value={searchSource} onChange={e => setSearchSource(e.target.value)} disabled={isLoading}>
                    <option value="internal">Internal Library</option>
                    <option value="openlibrary">OpenLibrary API</option>
                </Select>
                <Input 
                    icon={Search}
                    className="flex-grow py-3 px-4 rounded-full" 
                    placeholder="Search for book title, author, or ISBN..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    onKeyDown={(e) => { if (e.key === 'Enter') performSearch(); }}
                    disabled={isLoading} 
                />
                <button 
                    className={`${buttonClass} w-32 py-3 ${primaryButtonClass}`} 
                    onClick={performSearch} 
                    disabled={isLoading || !searchTerm.trim()}
                >
                    {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Search'}
                </button>
            </div>

            {isLoading && <div className="text-center p-4"><Loader2 className="animate-spin w-6 h-6 mx-auto text-blue-500" /></div>}
            
            {!isLoading && searchTerm.trim() && allResults.length === 0 && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-500">
                    No results found for "{searchTerm}" in the {searchSource} library.
                </div>
            )}

            {!isLoading && allResults.length > 0 && (
                <div className="space-y-4">
                    <div className="text-sm text-gray-500 font-semibold">{allResults.length} result(s) found.</div>
                    {allResults.map((book, index) => (
                        <div key={book.id || index} className={`p-4 rounded-xl shadow-md ${book.source === 'Internal' ? 'bg-green-50 border-l-4 border-green-500' : 'bg-white border-l-4 border-gray-300'}`}>
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="font-bold text-lg text-gray-800">{book.title}</div>
                                    <div className="text-sm text-gray-600 mt-1">
                                        Author: **{book.author}** | ISBN: {book.isbn || 'N/A'}
                                    </div>
                                    <div className="text-xs mt-1 text-gray-500">Source: {book.source}</div>
                                </div>
                                <div className="ml-4 flex-shrink-0">
                                    {book.source === 'Internal' && book.file_url ? (
                                        <a href={book.file_url} target="_blank" rel="noopener noreferrer" className={`py-1.5 px-4 text-sm font-semibold rounded-full inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white`}>
                                            <Download className="w-4 h-4 mr-1" /> Download
                                        </a>
                                    ) : book.cover_url ? (
                                        <a href={`https://openlibrary.org/search?q=${book.isbn || book.title}`} target="_blank" rel="noopener noreferrer">
                                            <img src={book.cover_url} onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/50x70/E0E0E0/505050?text=No+Cover'; }} className="w-12 h-16 object-cover rounded shadow-md" alt="Cover" />
                                        </a>
                                    ) : (
                                        <span className="text-xs text-gray-500 bg-gray-100 p-2 rounded-full">No Download</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}


function AIChat({ showMessage, primaryButtonClass, buttonClass }) { 
    const [question, setQuestion] = useState("");
    const [history, setHistory] = useState([
        { role: "ai", text: "Hello! I am your NoteOrbit academic assistant. Ask me anything about your studies, concepts, or topics you want to review." }
    ]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const chatContainer = document.getElementById('chat-history');
        if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
    }, [history]);

    const askQuestion = async () => {
        const q = question.trim();
        if (!q || isLoading) return;
        setHistory(h => [...h, { role: "user", text: q }]);
        setQuestion("");
        setIsLoading(true);
        try {
            // Using auth()
            const res = await auth().post("/chat", { question: q });
            setHistory(h => [...h, { role: "ai", text: res.data.answer }]);
        } catch (err) {
            if (err.response && err.response.status !== 401) {
                showMessage(`Chat failed: ${err.response?.data?.message || "Could not connect to AI service."}`, 'error');
            }
            setHistory(h => [...h, { role: "ai", text: "I'm sorry, I couldn't connect to the AI service. Please check the backend configuration or API Key." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !isLoading) askQuestion();
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-blue-200">
            <h4 className="text-2xl font-bold mb-4 text-blue-700 flex items-center"><Briefcase className="w-6 h-6 mr-2" /> AI Study Assistant</h4>
            <div id="chat-history" className="h-96 overflow-y-auto border border-gray-300 rounded-xl p-4 bg-gray-50">
                <div className="flex flex-col space-y-3">
                    {history.map((msg, index) => (
                        <div key={index} className={`max-w-[80%] p-3 rounded-xl shadow-sm text-sm whitespace-pre-wrap ${
                            msg.role === "ai" 
                                ? "self-start bg-blue-100 text-gray-800 border border-blue-300" 
                                : "self-end bg-blue-600 text-white"
                        }`}>
                            {msg.text}
                        </div>
                    ))}
                    {isLoading && (
                        <div className="self-start bg-blue-100 p-3 rounded-xl text-sm text-blue-700 flex items-center">
                            <Loader2 className="animate-spin w-4 h-4 mr-2" />
                            <span className="font-semibold">Generating Response...</span>
                        </div>
                    )}
                </div>
            </div>
            <div className="flex space-x-3 mt-4">
                <Input 
                    className="flex-grow py-3 px-4 rounded-full" 
                    placeholder="Ask a question about your subject..." 
                    value={question} 
                    onChange={e => setQuestion(e.target.value)} 
                    onKeyDown={handleKeyDown} 
                    disabled={isLoading} 
                />
                <button className={`${buttonClass} w-24 py-3 ${primaryButtonClass}`} onClick={askQuestion} disabled={isLoading || !question.trim()}>
                    {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Ask'}
                </button>
            </div>
            <div className="text-xs text-center mt-2 text-gray-500">Powered by Gemini</div>
        </div>
    );
}

// ----------------------------------------------
// --- PROFESSOR MODULES ---

// --- PROFESSOR MODULE: Marks Upload (MODIFIED to use form fields) ---
function ProfessorMarksUpload({ showMessage, primaryButtonClass, buttonClass, catalogs, user }) {
    const { subjects, fetchSubjects } = catalogs;
    const [subject, setSubject] = useState("");
    const [examType, setExamType] = useState("internal");
    
    // New fields for single mark entry
    const [srn, setSrn] = useState("");
    const [marksObtained, setMarksObtained] = useState("");
    const [maxMarks, setMaxMarks] = useState("");

    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // NOTE: Professor view filters are now handled by the user/context
        if (user && user.degree && user.semester) { fetchSubjects(user.degree, user.semester); }
    }, [user.degree, user.semester, fetchSubjects]);

    useEffect(() => {
        if (Array.isArray(subjects) && subjects.length > 0) {
            if (!subject || !subjects.includes(subject)) { setSubject(subjects[0]); }
        } else {
            setSubject("");
        }
    }, [subjects, subject]); 

    const handleUpload = async () => {
        if (!subject || !examType || !srn || marksObtained === "" || maxMarks === "") { 
            return showMessage("All fields are required.", 'error'); 
        }
        if (parseFloat(marksObtained) > parseFloat(maxMarks)) {
            return showMessage("Marks Obtained cannot be greater than Maximum Marks.", 'error'); 
        }

        setIsLoading(true);
        const payload = {
            subject,
            exam_type: examType,
            srn,
            marks_obtained: parseFloat(marksObtained),
            max_marks: parseFloat(maxMarks)
        };

        try {
            // Using auth()
            const res = await auth().post("/faculty/marks/upload", payload); 
            showMessage(res.data.message, 'success');
            setSrn("");
            setMarksObtained("");
            setMaxMarks("");
        } catch (e) {
            if (e.response && e.response.status !== 401) {
                showMessage(e.response?.data?.message || "Mark submission failed. Check SRN/Subject validity.", 'error');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-green-200 space-y-4">
            <h4 className="text-2xl font-bold text-green-700 flex items-center"><Upload className="w-6 h-6 mr-2" /> Upload Single Mark Entry</h4>
            <p className="text-sm text-gray-500">Enter marks directly per student (CSV upload removed).</p>

            {/* Note: Professor degree/semester filter is handled by the main panel's navigation */}

            <div className="grid grid-cols-2 gap-3">
                <Select value={subject} onChange={e => setSubject(e.target.value)} disabled={!subjects.length || isLoading}>
                    <option value="">Select Subject</option>
                    { (subjects || []).map(s => <option key={s} value={s}>{s}</option>) }
                </Select>
                <Select value={examType} onChange={e => setExamType(e.target.value)} disabled={isLoading}>
                    <option value="internal">Internal Exam</option>
                    <option value="mid">Mid-Term Exam</option>
                    <option value="endsem">End-Semester Exam</option>
                    <option value="assignment">Assignment</option>
                    <option value="lab">Lab Viva/Report</option>
                </Select>
            </div>
            
            <Input placeholder="Student SRN (e.g., SRN001)" value={srn} onChange={e => setSrn(e.target.value)} disabled={isLoading} />

            <div className="grid grid-cols-2 gap-3">
                <Input type="number" placeholder="Marks Obtained" value={marksObtained} onChange={e => setMarksObtained(e.target.value)} disabled={isLoading} min="0" />
                <Input type="number" placeholder="Max Marks (Total)" value={maxMarks} onChange={e => setMaxMarks(e.target.value)} disabled={isLoading} min="1" />
            </div>

            <button 
                className={`${buttonClass} ${primaryButtonClass} w-full`} 
                onClick={handleUpload} 
                disabled={isLoading || !subject || !srn || marksObtained === "" || maxMarks === ""}
            >
                {isLoading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                {isLoading ? 'Submiting...' : 'Submit Mark'}
            </button>
        </div>
    );
}

function ProfessorFeedback({ showMessage, primaryButtonClass, buttonClass, catalogs, user }) {
    const { subjects, fetchSubjects } = catalogs;
    const [srn, setSrn] = useState("");
    const [subject, setSubject] = useState("");
    const [text, setText] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (user && user.degree && user.semester) { fetchSubjects(user.degree, user.semester); }
    }, [user.degree, user.semester, fetchSubjects]);

    useEffect(() => {
        if (Array.isArray(subjects) && subjects.length && !subject) setSubject(subjects[0]);
    }, [subjects]);

    const handleSubmit = async () => {
        if (!srn || !subject || !text) { return showMessage("SRN, subject, and feedback text are required.", 'error'); }

        setIsLoading(true);
        try {
            // Using auth()
            await auth().post("/faculty/feedback", { srn, subject, text });
            showMessage(`Feedback saved for SRN ${srn}.`, 'success');
            setSrn("");
            setText("");
        } catch (e) {
            if (e.response && e.response.status !== 401) {
                showMessage(e.response?.data?.message || "Failed to save feedback. Check if SRN is valid.", 'error');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-yellow-200 space-y-4">
            <h4 className="text-2xl font-bold text-yellow-700 flex items-center"><MessageSquare className="w-6 h-6 mr-2" /> Provide Student Feedback</h4>
            <p className="text-sm text-gray-500">Send personalized academic comments to a specific student.</p>

            <Input placeholder="Student SRN (e.g., SRN001)" value={srn} onChange={e => setSrn(e.target.value)} disabled={isLoading} />
            
            <Select value={subject} onChange={e => setSubject(e.target.value)} disabled={!subjects.length || isLoading}>
                <option value="">Select Subject</option>
                {(subjects || []).map(s => <option key={s} value={s}>{s}</option>)}
            </Select>

            <textarea 
                className="w-full bg-white text-gray-800 placeholder-gray-500 border border-gray-300 rounded-xl py-3 px-4 focus:ring-2 focus:ring-yellow-500 outline-none transition duration-200 h-32" 
                placeholder="Detailed feedback message..." 
                value={text} 
                onChange={e => setText(e.target.value)}
                disabled={isLoading}
            />

            <button 
                className={`${buttonClass} ${primaryButtonClass} w-full bg-yellow-600 hover:bg-yellow-700 text-white`} 
                onClick={handleSubmit} 
                disabled={isLoading || !srn || !subject || !text}
            >
                {isLoading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                {isLoading ? 'Sending...' : 'Send Feedback'}
            </button>
        </div>
    );
}

// Professor Panel (Updated for separated Degree/Semester controls)
function ProfessorPanel({ user, showMessage, catalogs, buttonClass, successButtonClass, dangerButtonClass }) {
    const [view, setView] = useState('notes');

    // --- State for Notes Upload ---
    const [noteTitle, setNoteTitle] = useState("");
    const [noteDegree, setNoteDegree] = useState(user && (user.degree || (catalogs.degrees && catalogs.degrees[0]) || ""));
    const [noteSemester, setNoteSemester] = useState(user && (user.semester ? String(user.semester) : "1"));
    const [noteSubject, setNoteSubject] = useState("");
    const [noteDocumentType, setNoteDocumentType] = useState("Notes");
    const [noteFile, setNoteFile] = useState(null);
    const [isUploadLoading, setIsUploadLoading] = useState(false);
    
    // --- State for Notice Creation ---
    const [nTitle, setNTitle] = useState("");
    const [nMsg, setNMsg] = useState("");
    const [nDegree, setNDegree] = useState(user && (user.degree || (catalogs.degrees && catalogs.degrees[0]) || ""));
    const [nSemester, setNSemester] = useState(user && (user.semester ? String(user.semester) : "1"));
    const [nSection, setNSection] = useState((catalogs.sections && catalogs.sections[0]) || ""); // Target Section(s)
    const [nSubject, setNSubject] = useState("");
    const [nDeadline, setNDeadline] = useState("");
    const [attachment, setAttachment] = useState(null); 
    const [isNoticeLoading, setIsNoticeLoading] = useState(false);

    const { fetchSubjects } = catalogs;
    const [noteSubjects, setNoteSubjects] = useState([]);
    const [noticeSubjects, setNoticeSubjects] = useState([]);
    
    // 1. Fetch subjects for Notes Upload view
    const fetchNoteSubjects = useCallback(async () => {
        if (view === 'notes' && noteDegree && noteSemester) {
            const subjects = await fetchSubjects(noteDegree, noteSemester);
            setNoteSubjects(subjects);
        } else if (view !== 'notes') {
            setNoteSubjects([]);
        }
    }, [view, noteDegree, noteSemester, fetchSubjects]); 

    // 2. Fetch subjects for Notice Creation view
    const fetchNoticeSubjects = useCallback(async () => {
        if (view === 'notices' && nDegree && nSemester) {
            const subjects = await fetchSubjects(nDegree, nSemester);
            setNoticeSubjects(subjects);
        } else if (view !== 'notices') {
            setNoticeSubjects([]);
        }
    }, [view, nDegree, nSemester, fetchSubjects]); 

    useEffect(() => { fetchNoteSubjects(); }, [fetchNoteSubjects]);
    useEffect(() => { fetchNoticeSubjects(); }, [fetchNoticeSubjects]);

    // 3. Initialize/Sync Subject dropdowns
    useEffect(() => {
        if (Array.isArray(noteSubjects) && noteSubjects.length > 0) {
            if (!noteSubject || !noteSubjects.includes(noteSubject)) { setNoteSubject(noteSubjects[0]); }
        } else { setNoteSubject(""); }
    }, [noteSubjects, noteSubject]);

    useEffect(() => {
        if (Array.isArray(noticeSubjects) && noticeSubjects.length > 0) {
            if (!nSubject || !noticeSubjects.includes(nSubject)) { setNSubject(noticeSubjects[0]); }
        } else { setNSubject(""); }
    }, [noticeSubjects, nSubject]);

    // --- Handlers (Modified to use new state variables) ---
    const uploadNote = async () => {
        if (!noteTitle || !noteFile || !noteDegree || !noteSemester || !noteSubject) return showMessage("All fields and file are required.", 'error');
        
        setIsUploadLoading(true);
        const form = new FormData();
        form.append("title", noteTitle);
        form.append("degree", noteDegree);
        form.append("semester", noteSemester);
        form.append("subject", noteSubject);
        form.append("document_type", noteDocumentType);
        form.append("file", noteFile);
        
        try {
            await auth().post("/upload-note", form); 
            showMessage("Note uploaded successfully!", 'success');
            setNoteTitle(""); setNoteFile(null);
            if (document.getElementById('noteFile')) document.getElementById('noteFile').value = '';
        } catch (err) {
            if (err.response && err.response.status !== 401) { showMessage(err.response?.data?.message || "Upload failed", 'error'); }
        } finally {
            setIsUploadLoading(false);
        }
    };

    const postNotice = async () => {
        if (!nTitle || !nMsg || !nSection || !nDegree || !nSemester || !nSubject) return showMessage("All fields are required.", 'error');
        
        setIsNoticeLoading(true);
        const form = new FormData();
        form.append("title", nTitle);
        form.append("message", nMsg);
        form.append("degree", nDegree);
        form.append("semester", nSemester);
        form.append("section", nSection); 
        form.append("subject", nSubject);
        if (nDeadline) form.append("deadline", nDeadline);
        if (attachment) form.append("attachment", attachment);
        
        try {
            await auth().post("/create-notice", form);
            showMessage("Notice posted successfully!", 'success');
            setNTitle(""); setNMsg(""); setNDeadline(""); setAttachment(null); setNSection(catalogs.sections[0]);
        } catch (err) {
            if (err.response && err.response.status !== 401) { showMessage(err.response?.data?.message || "Notice failed", 'error'); }
        } finally {
            setIsNoticeLoading(false);
        }
    };


    const renderView = () => {
        switch (view) {
            case 'notes':
                return (
                    <div className="bg-white p-6 rounded-xl shadow-lg border border-green-200 space-y-3">
                        <h4 className="text-2xl font-bold mb-4 text-green-700 flex items-center"><Book className="w-6 h-6 mr-2" /> Upload Study Material</h4>
                        <Input placeholder="Title (e.g., Module 1 PPT)" value={noteTitle} onChange={e => setNoteTitle(e.target.value)} disabled={isUploadLoading} />
                        
                        {/* SEPARATE DROPDOWNS FOR NOTES */}
                        <div className="grid grid-cols-2 gap-3">
                            <Select value={noteDegree} onChange={e => setNoteDegree(e.target.value)} disabled={isUploadLoading}>
                                {(catalogs.degrees || []).map(d => <option key={d} value={d}>{d}</option>)}
                            </Select>
                            <Select value={noteSemester} onChange={e => setNoteSemester(e.target.value)} disabled={isUploadLoading}>
                                {Array.from({length: 8}, (_, i) => i + 1).map(s => <option key={s} value={s}>{s}</option>)}
                            </Select>
                        </div>
                        {/* END SEPARATE DROPDOWNS */}

                        <Select value={noteSubject} onChange={e => setNoteSubject(e.target.value)} icon={Book} disabled={isUploadLoading}>
                            {(Array.isArray(noteSubjects) ? noteSubjects : []).map(s => <option key={s} value={s}>{s}</option>)}
                        </Select>
                        <Select value={noteDocumentType} onChange={e => setNoteDocumentType(e.target.value)} disabled={isUploadLoading}>
                            <option value="Notes">Notes</option>
                            <option value="Question Bank">Question Bank</option>
                            <option value="Reference Book">Reference Book</option>
                        </Select>
                        <label className="block text-sm text-gray-700 font-medium pt-2">Select File (PDF, DOCX, PPTX):</label>
                        <input id="noteFile" type="file" onChange={e => setNoteFile(e.target.files[0])} className="w-full text-gray-600 bg-gray-100 rounded-lg p-3 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700 transition duration-200" disabled={isUploadLoading}/>
                        <button className={`${buttonClass} ${successButtonClass} w-full`} onClick={uploadNote} disabled={isUploadLoading || !noteTitle || !noteFile || !noteSubject}> {isUploadLoading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Upload className="w-5 h-5 mr-2" />} {isUploadLoading ? 'Uploading...' : 'Upload Note'} </button>
                    </div>
                );
            case 'notices':
                return (
                    <div className="bg-white p-6 rounded-xl shadow-lg border border-red-200 space-y-3">
                        <h4 className="text-2xl font-bold mb-4 text-red-700 flex items-center"><Bell className="w-6 h-6 mr-2" /> Create Notice</h4>
                        <Input placeholder="Title (e.g., Assignment 1 Due)" value={nTitle} onChange={e => setNTitle(e.target.value)} disabled={isNoticeLoading} />
                        <textarea className="w-full bg-white text-gray-800 placeholder-gray-500 border border-gray-300 rounded-xl py-3 px-4 focus:ring-2 focus:ring-red-500 outline-none transition duration-200 h-24" placeholder="Message details..." value={nMsg} onChange={e => setNMsg(e.target.value)} disabled={isNoticeLoading}/>
                        
                        {/* SEPARATE DROPDOWNS FOR NOTICES */}
                        <div className="grid grid-cols-3 gap-3">
                            <Select value={nDegree} onChange={e => setNDegree(e.target.value)} disabled={isNoticeLoading}>
                                {(catalogs.degrees || []).map(d => <option key={d} value={d}>{d}</option>)}
                            </Select>
                            <Select value={nSemester} onChange={e => setNSemester(e.target.value)} disabled={isNoticeLoading}>
                                {Array.from({length: 8}, (_, i) => i + 1).map(s => <option key={s} value={s}>{s}</option>)}
                            </Select>
                             <Select value={nSection} onChange={e => setNSection(e.target.value)} disabled={isNoticeLoading}>
                                { (catalogs.sections || []).map(s => <option key={s} value={s}>{s}</option>) }
                            </Select>
                        </div>
                        {/* END SEPARATE DROPDOWNS */}

                        <Input type="date" value={nDeadline} onChange={e => setNDeadline(e.target.value)} disabled={isNoticeLoading} />
                        
                        <Select value={nSubject} onChange={e => setNSubject(e.target.value)} icon={Book} disabled={isNoticeLoading}>
                            {(Array.isArray(noticeSubjects) ? noticeSubjects : []).map(s => <option key={s} value={s}>{s}</option>)}
                        </Select>
                        <label className="block text-sm text-gray-700 font-medium pt-2">Attachment (Optional):</label>
                        <input id="noticeAttachment" type="file" onChange={e => setAttachment(e.target.files[0])} className="w-full text-gray-600 bg-gray-100 rounded-lg p-3 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-600 file:text-white hover:file:bg-red-700 transition duration-200" disabled={isNoticeLoading}/>
                        <button className={`${buttonClass} ${dangerButtonClass} w-full`} onClick={postNotice} disabled={isNoticeLoading || !nTitle || !nMsg || !nSection || !nSubject}> {isNoticeLoading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Bell className="w-5 h-5 mr-2" />} {isNoticeLoading ? 'Posting...' : 'Post Notice'} </button>
                    </div>
                );
            case 'marks':
                return <ProfessorMarksUpload showMessage={showMessage} primaryButtonClass={successButtonClass} buttonClass={buttonClass} catalogs={catalogs} user={user} />;
            case 'feedback':
                return <ProfessorFeedback showMessage={showMessage} primaryButtonClass={successButtonClass} buttonClass={buttonClass} catalogs={catalogs} user={user} />;
            case 'books':
                return <UnifiedLibrarySearch showMessage={showMessage} primaryButtonClass={successButtonClass} buttonClass={buttonClass} />;
            default:
                return <div className="p-8 text-center text-gray-500">Welcome to the Faculty Portal. Select a tool from the sidebar.</div>;
        }
    };

    const navigation = [
        { key: 'notes', label: 'Upload Notes', icon: Book },
        { key: 'notices', label: 'Create Notices', icon: Bell },
        { key: 'marks', label: 'Upload Marks', icon: Award },
        { key: 'feedback', label: 'Send Feedback', icon: MessageSquare },
        { key: 'books', label: 'Search Library', icon: Search },
    ];

    return (
        <div className="flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-56 bg-white p-4 rounded-xl shadow-lg border border-gray-200 flex-shrink-0">
                <h5 className="text-lg font-bold text-green-800 mb-4">Faculty Tools</h5>
                <nav className="space-y-2">
                    {navigation.map(item => (
                        <button
                            key={item.key}
                            onClick={() => setView(item.key)}
                            className={`w-full flex items-center p-3 rounded-lg font-semibold transition duration-200 ${
                                view === item.key 
                                    ? 'bg-green-600 text-white shadow-md' 
                                    : 'text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            <item.icon className="w-5 h-5 mr-3" />
                            {item.label}
                        </button>
                    ))}
                </nav>
            </div>
            <div className="flex-1 min-h-[600px]">
                {renderView()}
            </div>
        </div>
    );
}

// ----------------------------------------------
// --- ADMIN MODULES (NEW/MODIFIED) ---

// --- NEW ADMIN MODULE: Book Upload
function AdminBookUpload({ showMessage, buttonClass, primaryButtonClass, catalogs }) {
    const { degrees } = catalogs;
    const [title, setTitle] = useState("");
    const [author, setAuthor] = useState("");
    const [isbn, setIsbn] = useState("");
    const [file, setFile] = useState(null);
    const [degree, setDegree] = useState(degrees[0] || "");
    const [semester, setSemester] = useState("1");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (degrees.length && !degree) setDegree(degrees[0]);
    }, [degrees, degree]);
    
    const handleUpload = async () => {
        if (!title || !author || !degree || !semester || !file) {
            return showMessage("Title, Author, Degree, Semester, and File are required.", 'error');
        }

        setIsLoading(true);
        const form = new FormData();
        form.append("title", title);
        form.append("author", author);
        form.append("isbn", isbn);
        form.append("degree", degree);
        form.append("semester", semester);
        form.append("file", file);

        try {
            const res = await auth().post("/api/admin/library/book", form); 
            showMessage(res.data.message, 'success');
            setTitle("");
            setAuthor("");
            setIsbn("");
            setFile(null);
            if (document.getElementById('bookFile')) document.getElementById('bookFile').value = '';
        } catch (err) {
            if (err.response && err.response.status !== 401) { 
                showMessage(err.response?.data?.message || "Book upload failed.", 'error'); 
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-blue-200 space-y-4">
            <h4 className="text-2xl font-bold mb-4 text-blue-700 flex items-center"><Upload className="w-6 h-6 mr-2" /> Upload Internal E-Book / Resource</h4>
            
            <Input placeholder="Book Title" value={title} onChange={e => setTitle(e.target.value)} disabled={isLoading} />
            <Input placeholder="Author Name" value={author} onChange={e => setAuthor(e.target.value)} disabled={isLoading} />
            <Input placeholder="ISBN (Optional)" value={isbn} onChange={e => setIsbn(e.target.value)} disabled={isLoading} />

            <div className="grid grid-cols-2 gap-3">
                <Select value={degree} onChange={e => setDegree(e.target.value)} disabled={isLoading}>
                    <option value="">Select Degree</option>
                    {(degrees || []).map(d => <option key={d} value={d}>{d}</option>)}
                </Select>
                <Select value={semester} onChange={e => setSemester(e.target.value)} disabled={isLoading}>
                    {Array.from({length: 8}, (_, i) => i + 1).map(s => <option key={s} value={s}>{s}</option>)}
                </Select>
            </div>
            
            <label className="block text-sm text-gray-700 font-medium pt-2">Select Book File (PDF, EPUB, DOCX):</label>
            <input 
                id="bookFile" 
                type="file" 
                onChange={e => setFile(e.target.files[0])} 
                className="w-full text-gray-600 bg-gray-100 rounded-lg p-3 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 transition duration-200" 
                disabled={isLoading}
            />

            <button 
                className={`${buttonClass} ${primaryButtonClass} w-full`} 
                onClick={handleUpload} 
                disabled={isLoading || !title || !author || !degree || !semester || !file}
            >
                {isLoading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                {isLoading ? 'Uploading Book...' : 'Upload Book'}
            </button>
        </div>
    );
}


// --- MODIFIED ADMIN MODULE: Hostel Management (SRN Change) ---
function AdminHostelManagement({ showMessage, buttonClass, primaryButtonClass, catalogs }) {
    const { degrees, sections, fetchBasics } = catalogs;
    
    // States for Hostel/Room CRUD
    const [hostels, setHostels] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [isHostelLoading, setIsHostelLoading] = useState(false);
    
    const [newHostelName, setNewHostelName] = useState('');
    const [newHostelAddress, setNewHostelAddress] = useState('');

    const [newRoomHostelId, setNewRoomHostelId] = useState('');
    const [newRoomNumber, setNewRoomNumber] = useState('');
    const [newRoomCapacity, setNewRoomCapacity] = useState(1);

    // MODIFIED: Renamed state variable from studentToAssign to srnToAssign
    const [srnToAssign, setSrnToAssign] = useState(''); 
    const [roomToAssign, setRoomToAssign] = useState('');
    
    // States for Global View
    const [globalHostelData, setGlobalHostelData] = useState([]);

    const fetchHostelData = useCallback(async () => {
        setIsHostelLoading(true);
        try {
            const [hostelRes, roomRes, globalRes] = await Promise.all([
                auth().get("/admin/hostel/hostels"),
                auth().get("/admin/hostel/rooms"),
                auth().get("/admin/hostel/hostels") // Same endpoint used for global view/list
            ]);
            setHostels(hostelRes.data.hostels || []);
            setRooms(roomRes.data.rooms || []);
            setGlobalHostelData(globalRes.data.hostels || []);
            
            // Initialize dropdowns
            if (hostelRes.data.hostels.length > 0) {
                setNewRoomHostelId(hostelRes.data.hostels[0].id);
            } 
            if (roomRes.data.rooms.length > 0) {
                setRoomToAssign(roomRes.data.rooms[0].id);
            } else {
                setNewRoomHostelId('');
                setRoomToAssign('');
            }

        } catch (e) {
            if (e.response && e.response.status !== 401) {
                showMessage(e.response?.data?.message || "Failed to fetch hostel data.", 'error');
            }
            setHostels([]); setRooms([]); setGlobalHostelData([]);
        } finally {
            setIsHostelLoading(false);
        }
    }, [showMessage]);

    useEffect(() => {
        fetchHostelData();
    }, [fetchHostelData]);


    // --- Handlers ---
    const handleAddHostel = async () => {
        if (!newHostelName.trim()) return showMessage("Hostel Name is required.", 'error');
        try {
            await auth().post("/admin/hostel/hostels", { name: newHostelName, address: newHostelAddress });
            showMessage(`Hostel **${newHostelName}** added!`, 'success');
            setNewHostelName('');
            setNewHostelAddress('');
            fetchHostelData();
        } catch (e) {
            showMessage(e.response?.data?.message || "Failed to add hostel.", 'error');
        }
    };
    
    const handleAddRoom = async () => {
        if (!newRoomHostelId || !newRoomNumber.trim() || newRoomCapacity < 1) return showMessage("All room fields are required and capacity must be > 0.", 'error');
        try {
            await auth().post("/admin/hostel/rooms", { 
                hostel_id: newRoomHostelId, 
                room_number: newRoomNumber, 
                capacity: parseInt(newRoomCapacity) 
            });
            showMessage(`Room **${newRoomNumber}** added!`, 'success');
            setNewRoomNumber('');
            setNewRoomCapacity(1);
            fetchHostelData();
        } catch (e) {
            showMessage(e.response?.data?.message || "Failed to add room.", 'error');
        }
    };

    // MODIFIED: Function updated to use 'srn' state variable and pass 'srn' in payload
    const handleAssignRoom = async () => {
        if (!srnToAssign.trim() || !roomToAssign) return showMessage("Student SRN and Room must be selected.", 'error');
        try {
            await auth().post("/admin/hostel/assign-room", { 
                srn: srnToAssign, // <<-- KEY CHANGED TO SRN
                room_id: roomToAssign
            });
            showMessage(`Room assigned successfully to SRN ${srnToAssign}!`, 'success'); // Updated message
            setSrnToAssign('');
            fetchHostelData();
        } catch (e) {
            showMessage(e.response?.data?.message || "Failed to assign room.", 'error');
        }
    };

    const renderGlobalHostelView = () => (
        <div className="space-y-4">
            <h5 className="text-xl font-bold text-blue-700">Hostel Overview (One Go)</h5>
            {isHostelLoading ? <div className="text-center p-4"><Loader2 className="animate-spin w-5 h-5 mx-auto text-blue-500" /></div> : globalHostelData.length === 0 ? <div className="text-gray-500">No hostels defined.</div> : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 shadow-md rounded-xl bg-white">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hostel</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rooms</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Capacity</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Occupancy</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vacant Beds</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {globalHostelData.map(h => (
                                <tr key={h.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{h.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{h.total_rooms}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{h.total_capacity}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{h.current_occupancy}</td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${h.vacant_beds > 0 ? 'text-green-600' : 'text-red-600'}`}>{h.vacant_beds}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
    
    return (
        <div className="space-y-6">
            <h4 className="text-2xl font-bold text-blue-700 flex items-center"><Home className="w-6 h-6 mr-2" /> Hostel Management</h4>
            
            {renderGlobalHostelView()}
            
            <div className="grid lg:grid-cols-3 gap-6 pt-4 border-t border-gray-200">
                
                {/* Add Hostel */}
                <div className="bg-white p-5 rounded-xl shadow-lg border space-y-3">
                    <h5 className="text-xl font-bold text-yellow-700">Add New Hostel</h5>
                    <Input placeholder="Hostel Name" value={newHostelName} onChange={e => setNewHostelName(e.target.value)} />
                    <Input placeholder="Address (Optional)" value={newHostelAddress} onChange={e => setNewHostelAddress(e.target.value)} />
                    <button className={`${buttonClass} ${primaryButtonClass}`} onClick={handleAddHostel}>Create Hostel</button>
                </div>

                {/* Add Room */}
                <div className="bg-white p-5 rounded-xl shadow-lg border space-y-3">
                    <h5 className="text-xl font-bold text-yellow-700">Add Room to Hostel</h5>
                    <Select value={newRoomHostelId} onChange={e => setNewRoomHostelId(parseInt(e.target.value) || '')} disabled={!hostels.length}>
                        <option value="">Select Hostel</option>
                        {(hostels || []).map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                    </Select>
                    <Input placeholder="Room Number (e.g., 101A)" value={newRoomNumber} onChange={e => setNewRoomNumber(e.target.value)} />
                    <Input type="number" placeholder="Capacity (e.g., 2)" value={newRoomCapacity} onChange={e => setNewRoomCapacity(parseInt(e.target.value) || 1)} min="1" />
                    <button className={`${buttonClass} ${primaryButtonClass}`} onClick={handleAddRoom} disabled={!newRoomHostelId || !newRoomNumber}>Add Room</button>
                </div>
                
                {/* Assign Room */}
                <div className="bg-white p-5 rounded-xl shadow-lg border space-y-3">
                    <h5 className="text-xl font-bold text-yellow-700">Assign Room to Student</h5>
                    <Input placeholder="Student SRN (e.g., SRN001)" value={srnToAssign} onChange={e => setSrnToAssign(e.target.value)} /> {/* MODIFIED: Input changed to SRN */}
                    <Select value={roomToAssign} onChange={e => setRoomToAssign(parseInt(e.target.value) || '')} disabled={!rooms.length}>
                        <option value="">Select Room (Hostel - Room # - Occupancy)</option>
                        {(rooms || []).map(r => (
                            <option key={r.id} value={r.id} disabled={r.occupancy >= r.capacity}>
                                {r.hostel_name} - {r.room_number} ({r.occupancy}/{r.capacity})
                            </option>
                        ))}
                    </Select>
                    <button className={`${buttonClass} ${primaryButtonClass}`} onClick={handleAssignRoom} disabled={!srnToAssign || !roomToAssign}>Assign Room</button>
                    <p className="text-xs text-red-500">Note: Must use Student **SRN**.</p> {/* MODIFIED: Note changed */}
                </div>
            </div>
        </div>
    );
}

// --- NEW ADMIN MODULE: Student List Filter ---
function AdminStudentList({ showMessage, catalogs, buttonClass, primaryButtonClass }) {
    const { degrees, sections, loaded } = catalogs;
    const [students, setStudents] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const [filterDegree, setFilterDegree] = useState('');
    const [filterSemester, setFilterSemester] = useState('');
    const [filterSection, setFilterSection] = useState('');

    useEffect(() => {
        if (loaded && degrees.length && !filterDegree) setFilterDegree(degrees[0]);
        if (loaded && sections.length && !filterSection) setFilterSection(sections[0]);
    }, [loaded, degrees, sections, filterDegree, filterSection]);

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


    return (
        <div className="space-y-6">
            <h4 className="text-2xl font-bold text-yellow-700 flex items-center"><GraduationCap className="w-6 h-6 mr-2" /> Student Directory</h4>
            
            {/* Filters */}
            <div className="bg-gray-50 p-4 rounded-xl shadow-inner grid grid-cols-4 gap-3 items-end">
                <Select value={filterDegree} onChange={e => setFilterDegree(e.target.value)} disabled={!degrees.length}>
                    <option value="">All Degrees</option>
                    {(degrees || []).map(d => <option key={d} value={d}>{d}</option>)}
                </Select>
                <Select value={filterSemester} onChange={e => setFilterSemester(e.target.value)}>
                    <option value="">All Sems</option>
                    {Array.from({ length: 8 }, (_, i) => i + 1).map(s => <option key={s} value={s}>{s}</option>)}
                </Select>
                <Select value={filterSection} onChange={e => setFilterSection(e.target.value)} disabled={!sections.length}>
                    <option value="">All Sections</option>
                    {(sections || []).map(s => <option key={s} value={s}>{s}</option>)}
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
            {isLoading ? <div className="text-center p-10"><Loader2 className="animate-spin w-8 h-8 mx-auto text-yellow-500" /></div> : students.length === 0 ? <div className="p-4 text-gray-500 text-center bg-white rounded-xl shadow-md">No students found matching filters.</div> : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 shadow-md rounded-xl bg-white">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SRN / Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Academics</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hostel</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {students.map(s => (
                                <tr key={s.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{s.name}</div>
                                        <div className="text-xs text-gray-500">{s.srn}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{s.degree} Sem {s.semester}</div>
                                        <div className="text-xs text-gray-500">Section {s.section}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {s.hostel_info || <span className="text-xs text-red-500">Not Assigned</span>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${s.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {s.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}


function AdminFacultyOnboarding({ showMessage, buttonClass, primaryButtonClass }) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [empId, setEmpId] = useState(""); // <-- NEW EMP ID FIELD
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async () => {
        if (!name || !email || !password || !empId) {
            return showMessage("Full Name, Email, Password, and Employee ID are required.", 'error');
        }

        setIsLoading(true);
        try {
            const payload = { 
                name, email, password, 
                emp_id: empId, // <-- Send the new EMP ID field
            };
            // Using auth()
            const res = await auth().post("/admin/add-faculty", payload);
            showMessage(res.data.message, 'success');
            setName('');
            setEmail('');
            setPassword('');
            setEmpId('');
        } catch (e) {
            if (e.response && e.response.status !== 401) {
                showMessage(e.response?.data?.message || "Failed to add faculty account.", 'error');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-yellow-200 space-y-4">
            <h4 className="text-2xl font-bold mb-4 text-yellow-700 flex items-center"><UserPlus className="w-6 h-6 mr-2" /> Onboard New Faculty Member</h4>
            
            <Input placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} disabled={isLoading} />
            <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} disabled={isLoading} />
            <Input type="password" placeholder="Temporary Password" value={password} onChange={e => setPassword(e.target.value)} disabled={isLoading} />

            <Input placeholder="Employee ID (e.g., FCLT001)" value={empId} onChange={e => setEmpId(e.target.value)} disabled={isLoading} />
            
            <button 
                className={`${buttonClass} ${primaryButtonClass} w-full`} 
                onClick={handleSubmit} 
                disabled={isLoading || !name || !email || !password || !empId}
            >
                {isLoading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                {isLoading ? 'Processing...' : 'Create Professor Account'}
            </button>
        </div>
    );
}

function AdminFeeManagement({ showMessage, buttonClass, primaryButtonClass, catalogs }) {
    const { degrees, loaded } = catalogs;
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState(''); // Amount in Rupees
    const [category, setCategory] = useState('tuition');
    const [dueDate, setDueDate] = useState('');
    const [targetType, setTargetType] = useState('batch'); // batch, sem, custom, single

    // Dynamic targeting fields
    const [targetDegree, setTargetDegree] = useState(degrees[0] || '');
    const [targetSemester, setTargetSemester] = useState('1');
    const [targetSections, setTargetSections] = useState(''); // Comma separated, e.g., "A,B"
    const [customSrns, setCustomSrns] = useState(''); // Comma separated, e.g., "SRN001,SRN005"
    const [singleSrn, setSingleSrn] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (loaded && Array.isArray(degrees) && degrees.length > 0) {
            if (!targetDegree) setTargetDegree(degrees[0]);
        }
    }, [loaded, degrees, targetDegree]);

    const handleSubmit = async () => {
        if (!title || !amount || parseFloat(amount) <= 0 || !targetType) {
            return showMessage("Title and a valid Amount are required.", 'error');
        }

        const amountCents = Math.round(parseFloat(amount) * 100);
        
        let payload = {
            title, description, amount_cents: amountCents, category,
            due_date: dueDate || undefined, target: targetType,
        };
        
        if (targetType === 'sem') {
            if (!targetDegree || !targetSemester) return showMessage("Degree and Semester are required for sem targeting.", 'error');
            payload.degree = targetDegree;
            payload.semester = parseInt(targetSemester);
        } else if (targetType === 'custom') {
            const srnList = customSrns.split(',').map(s => s.trim()).filter(s => s);
            if (srnList.length === 0) return showMessage("Enter at least one SRN for custom targeting.", 'error');
            payload.srns = srnList;
        } else if (targetType === 'single') {
            if (!singleSrn.trim()) return showMessage("Enter a single SRN for targeted fee.", 'error');
            payload.single_srn = singleSrn.trim();
        }

        if (targetSections && (targetType === 'batch' || targetType === 'sem')) {
            payload.sections = targetSections;
        }

        setIsLoading(true);
        try {
            // Using auth()
            const res = await auth().post("/admin/fees/create", payload);
            showMessage(`Fee Notification created. Targets created: **${res.data.targets_created}**`, 'success');
            setTitle(''); setDescription(''); setAmount(''); setDueDate('');
            setTargetSections(''); setCustomSrns(''); setSingleSrn('');
        } catch (e) {
            if (e.response && e.response.status !== 401) {
                showMessage(e.response?.data?.message || "Fee creation failed. Check input data or backend logs.", 'error');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const isSemesterTarget = targetType === 'sem';
    const isCustomTarget = targetType === 'custom';
    const isSingleTarget = targetType === 'single';
    const isBroadTarget = targetType === 'batch' || targetType === 'sem';


    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-yellow-200 space-y-4">
            <h4 className="text-2xl font-bold mb-4 text-yellow-700 flex items-center"><DollarSign className="w-6 h-6 mr-2" /> Create New Fee Notification</h4>
            
            <Input placeholder="Fee Title (e.g., Tuition Fee Sem 4)" value={title} onChange={e => setTitle(e.target.value)} disabled={isLoading} />
            <Input 
                type="number" 
                placeholder="Amount in Rupees (e.g., 5000.00)" 
                value={amount} 
                onChange={e => setAmount(e.target.value)} 
                disabled={isLoading} 
            />

            <div className="grid grid-cols-2 gap-3">
                <Select value={category} onChange={e => setCategory(e.target.value)} disabled={isLoading}>
                    <option value="tuition">Tuition Fee</option>
                    <option value="hostel">Hostel Fee</option>
                    <option value="transport">Transport Fee</option>
                    <option value="exam">Exam Fee</option>
                    <option value="misc">Miscellaneous</option>
                </Select>
                <Input type="date" placeholder="Due Date (Optional)" value={dueDate} onChange={e => setDueDate(e.target.value)} disabled={isLoading} />
            </div>

            <h5 className="text-lg font-bold text-gray-700 pt-4 border-t border-gray-100">Target Students:</h5>
            
            <Select value={targetType} onChange={e => setTargetType(e.target.value)} disabled={isLoading}>
                <option value="batch">Whole Student Body (All Degrees/Sems)</option>
                <option value="sem">Specific Degree & Semester</option>
                <option value="custom">Custom List of SRNs (Bulk)</option>
                <option value="single">Single SRN</option>
            </Select>

            {isSemesterTarget && (
                <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-300">
                    {loaded && Array.isArray(degrees) && degrees.length > 0 ? (
                        <>
                            <Select value={targetDegree} onChange={e => setTargetDegree(e.target.value)} disabled={isLoading}>
                                {degrees.map(d => <option key={d} value={d}>{d}</option>)}
                            </Select>
                            <Select value={targetSemester} onChange={e => setTargetSemester(e.target.value)} disabled={isLoading}>
                                {Array.from({ length: 8 }, (_, i) => i + 1).map(s => <option key={s} value={s}>{s}</option>)}
                            </Select>
                        </>
                    ) : <div className="col-span-2 text-center text-sm text-gray-500">Loading degree list...</div>}
                </div>
            )}
            
            {(isBroadTarget) && (
                <Input
                    placeholder="Sections (Optional, Comma-separated: A, B, C)"
                    value={targetSections}
                    onChange={e => setTargetSections(e.target.value)}
                    disabled={isLoading}
                    className="animate-in fade-in duration-300"
                />
            )}

            {isCustomTarget && (
                <textarea
                    className="w-full bg-white text-gray-800 border border-gray-300 rounded-xl py-3 px-4 h-24"
                    placeholder="Enter SRNs separated by commas (e.g., SRN001, SRN005, SRN010)"
                    value={customSrns}
                    onChange={e => setCustomSrns(e.target.value)}
                    disabled={isLoading}
                />
            )}
            
            {isSingleTarget && (
                <Input
                    placeholder="Enter Single SRN"
                    value={singleSrn}
                    onChange={e => setSingleSrn(e.target.value)}
                    disabled={isLoading}
                />
            )}
            
            <button 
                className={`${buttonClass} ${primaryButtonClass} w-full mt-4`} 
                onClick={handleSubmit} 
                disabled={isLoading}
            >
                {isLoading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                {isLoading ? 'Creating Notification...' : 'Create Fee Notification'}
            </button>
        </div>
    );
}

// --- ADMIN MODULE: Hostel Complaints (MODIFIED) ---
function AdminHostelComplaints({ showMessage, buttonClass, primaryButtonClass }) {
    const [complaints, setComplaints] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    // New state for status update
    const [statusUpdate, setStatusUpdate] = useState({ id: null, status: 'Open', note: '' });

    const fetchComplaints = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await auth().get("/admin/hostel/complaints");
            setComplaints(res.data.complaints || []);
        } catch(e) {
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
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
            <div className="flex justify-between items-center mb-4">
                <h4 className="text-2xl font-bold text-red-700 flex items-center"><Home className="w-6 h-6 mr-2" /> Active Hostel Complaints</h4>
                <button onClick={fetchComplaints} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition" disabled={isLoading}><RefreshCw className="w-5 h-5 text-gray-600" /></button>
            </div>
            
            {/* Status Update Modal/Form (Render if statusUpdate.id is set) */}
            {statusUpdate.id && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl space-y-4">
                        <h5 className="text-xl font-bold text-red-700">Update Complaint Status</h5>
                        <Select value={statusUpdate.status} onChange={e => setStatusUpdate(prev => ({...prev, status: e.target.value}))}>
                            {VALID_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </Select>
                        <textarea
                            className="w-full bg-white text-gray-800 border border-gray-300 rounded-xl py-3 px-4 h-20"
                            placeholder="Internal Note (Optional)"
                            value={statusUpdate.note}
                            onChange={e => setStatusUpdate(prev => ({...prev, note: e.target.value}))}
                        />
                        <div className="flex gap-3">
                            <button className={`${buttonClass} bg-gray-400 text-gray-900 flex-1`} onClick={() => setStatusUpdate({ id: null, status: 'Open', note: '' })}>Cancel</button>
                            <button className={`${buttonClass} ${primaryButtonClass} bg-green-600 flex-1`} onClick={updateComplaintStatus} disabled={isLoading}>
                                {isLoading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Save className="w-5 h-5 mr-2" />} Save Status
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Complaints List */}
            {complaints.length === 0 && !isLoading && <div className="text-gray-500 text-center py-4">No complaints recorded.</div>}
            
            <div className="space-y-4">
                {complaints.map(c => (
                    <div key={c.id} className={`p-4 rounded-xl shadow-md ${c.status === 'Closed' ? 'bg-gray-100 border-l-4 border-gray-400' : 'bg-red-50 border-l-4 border-red-500'}`}>
                        <div className="flex justify-between items-start">
                             <div className="flex-1">
                                 <div className="font-bold text-lg text-red-700">{c.title}</div>
                                 <div className="text-sm text-gray-700 mt-1">{c.description}</div>
                                 <div className="text-xs text-gray-500 mt-1">
                                     From: <strong>{c.hostel_name} (Room {c.room_number})</strong> | Student: <strong>{c.student_name}</strong>
                                 </div>
                             </div>
                             <div className={`text-xs px-2 py-1 rounded-full flex-shrink-0 font-semibold ${c.status.includes('Progress') ? 'bg-orange-200 text-orange-800' : c.status === 'Open' ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'}`}>
                                 {c.status}
                             </div>
                        </div>
                        
                        {/* Audit Trail/Status Bar */}
                        <div className="mt-3 pt-2 border-t border-red-100">
                            <div className="text-xs text-gray-500 font-semibold mb-1">Audit Trail:</div>
                            <div className="flex items-center space-x-2 text-xs overflow-x-auto pb-1">
                                {c.audit_trail && c.audit_trail.map((step, index) => (
                                    <div key={index} className="flex-shrink-0">
                                        <span className={`px-2 py-0.5 rounded-full ${step.status.includes('Progress') ? 'bg-orange-100 text-orange-700' : step.status === 'Open' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                            {step.status}
                                        </span>
                                        {index < c.audit_trail.length - 1 && <span className="text-gray-400 ml-2">&gt;</span>}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end items-center mt-3 pt-2 border-t border-red-100">
                            <div className="flex space-x-2">
                                {c.file_url && <a href={c.file_url} className={`py-1 px-3 text-xs font-semibold rounded-full inline-flex items-center bg-red-600 hover:bg-red-700 text-white`} target="_blank" rel="noopener noreferrer">Attachment</a>}
                                <button 
                                    className={`${buttonClass} bg-yellow-600 hover:bg-yellow-700 text-white text-xs py-1.5 w-32`}
                                    onClick={() => setStatusUpdate({ id: c.id, status: c.status, note: '' })}
                                >
                                    <RefreshCw className="w-4 h-4 mr-1"/> Update Status
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}


function AdminPanel({ showMessage, catalogs, buttonClass, primaryButtonClass, dangerButtonClass, user }) { // 🛑 ADDED user PROP
    const { degrees, sections, loaded, fetchBasics } = catalogs;

    const [pending, setPending] = useState([]);
    const [newDegree, setNewDegree] = useState("");
    const [newSection, setNewSection] = useState("");
    const [subjectDegree, setSubjectDegree] = useState('');
    const [subjectSemester, setSubjectSemester] = useState("1");
    const [newSubject, setNewSubject] = useState("");
    const [view, setView] = useState('approvals');
    const [isFetchingPending, setIsFetchingPending] = useState(false);

    // FIX: Cleaned up fetchPending function
    const fetchPending = useCallback(async () => {
        // No token check needed here, relying on useEffect guardrail
        
        setIsFetchingPending(true);
        try {
            // Using auth()
            const res = await auth().get("/admin/pending-students");
            setPending(res.data.students || []);
        } catch (e) {
            // Only show message if it's NOT a 401 (handled by auth interceptor)
            if (e.response && e.response.status !== 401) {
                showMessage("Failed to fetch pending students.", "error");
            }
            setPending([]);
        } finally {
            setIsFetchingPending(false);
        }
    }, [showMessage]); 

    const take = async (id, action) => {
        try {
            // Using auth()
            const res = await auth().post("/admin/approve-student", { student_id: id, action: action });
            showMessage(res.data.message, "success");
            setPending(prev => prev.filter(s => s.id !== id));
        } catch (e) {
            if (e.response && e.response.status !== 401) {
                showMessage(e.response?.data?.message || "Action failed.", "error");
            }
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
                    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                        <h4 className="text-2xl font-bold text-yellow-700 mb-4">Pending Student Approvals</h4>
                        {isFetchingPending && <div className="text-center p-5"><Loader2 className="animate-spin w-6 h-6 text-yellow-600 mx-auto" /></div>}
                        {!isFetchingPending && pending.length === 0 && <div className="p-4 text-gray-500 text-center">No pending students.</div>}
                        
                        <div className="space-y-4">
                            {pending.map(s => (
                                <div key={s.id} className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-xl shadow">
                                    <div className="font-bold text-lg">{s.name}</div>
                                    <div className="text-sm text-gray-600">{s.email} • {s.degree} • Sem {s.semester}</div>
                                    <div className="flex gap-3 mt-3">
                                        <button className={`${buttonClass} bg-green-600 text-white`} onClick={() => take(s.id, "approve")}>Approve</button>
                                        <button className={`${buttonClass} bg-red-600 text-white`} onClick={() => take(s.id, "reject")}>Reject</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case "faculty-onboard": return <AdminFacultyOnboarding showMessage={showMessage} buttonClass={buttonClass} primaryButtonClass={primaryButtonClass} catalogs={catalogs} />;
            case "library-upload": return <AdminBookUpload showMessage={showMessage} buttonClass={buttonClass} primaryButtonClass={primaryButtonClass} catalogs={catalogs} />; // NEW VIEW
            case "catalogs":
                return (
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow-lg border space-y-3">
                            <h4 className="text-xl font-bold text-yellow-700">Manage Degrees</h4>
                            <Input placeholder="New degree" value={newDegree} onChange={e => setNewDegree(e.target.value)} />
                            <button className={`${buttonClass} ${primaryButtonClass}`} onClick={() => addCatalogItem("degrees", newDegree, "Degree added!")}>Add Degree</button>
                            <div className="text-xs text-gray-500">Current: {(degrees || []).join(", ")}</div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-lg border space-y-3">
                            <h4 className="text-xl font-bold text-yellow-700">Manage Sections</h4>
                            <Input placeholder="New section" value={newSection} onChange={e => setNewSection(e.target.value)} />
                            <button className={`${buttonClass} ${primaryButtonClass}`} onClick={() => addCatalogItem("sections", newSection, "Section added!")}>Add Section</button>
                            <div className="text-xs text-gray-500">Current: {(sections || []).join(", ")}</div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-lg border space-y-3">
                            <h4 className="text-xl font-bold text-yellow-700">Add Subject</h4>
                            <Select value={subjectDegree} onChange={e => setSubjectDegree(e.target.value)}>
                                {(degrees || []).map(d => <option key={d} value={d}>{d}</option>)}
                            </Select>
                            <Select value={subjectSemester} onChange={e => setSubjectSemester(e.target.value)}>
                                {Array.from({ length: 8 }, (_, i) => i + 1).map(s => <option key={s} value={s}>{s}</option>)}
                            </Select>
                            <Input placeholder="Subject name" value={newSubject} onChange={e => setNewSubject(e.target.value)} />
                            <button className={`${buttonClass} ${primaryButtonClass}`} onClick={addSubject}>Add Subject</button>
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
        <div className="flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-56 bg-white p-4 rounded-xl shadow-lg border">
                <h5 className="font-bold text-yellow-800 mb-4">Admin Tools</h5>
                {[
                    { key: 'approvals', label: 'Student Approvals', icon: User },
                    { key: 'student-list', label: 'Student Directory', icon: GraduationCap },
                    { key: 'hostel-config', label: 'Hostel Config', icon: Home },
                    { key: 'complaints-admin', label: 'Hostel Complaints', icon: Mail },
                    { key: 'library-upload', label: 'Book Upload', icon: Upload }, // NEW NAVIGATION ITEM
                    { key: 'faculty-onboard', label: 'Add Faculty', icon: UserPlus },
                    { key: 'catalogs', label: 'Degrees/Subjects', icon: Settings },
                    { key: 'fees-admin', label: 'Manage Fees', icon: DollarSign },
                ].map(item => (
                    <button key={item.key} onClick={() => setView(item.key)} className={`w-full flex items-center p-3 rounded-lg font-semibold transition ${view === item.key ? "bg-yellow-600 text-white" : "hover:bg-gray-100"}`}>
                        <item.icon className="w-5 h-5 mr-3" />{item.label}
                    </button>
                ))}
            </div>
            <div className="flex-1">{renderView()}</div>
        </div>
    );
}
// Professor Panel (Updated with Books)

// Student Panel (Updated with Books and Hostel)
function StudentPanel({ user, showMessage, catalogs, buttonClass, primaryButtonClass }) {
    const [view, setView] = useState('notes');

    const navigation = [
        { key: 'notes', label: 'Notes & Notices', icon: Book },
        { key: 'books', label: 'Internal Library', icon: Search },
        { key: 'fees', label: 'Fees & Payments', icon: DollarSign },
        { key: 'marks', label: 'Marks & Grades', icon: Award },
        { key: 'feedback', label: 'Faculty Feedback', icon: MessageSquare }, // ADDED FEEDBACK NAVIGATION
        { key: 'complaints', label: 'Hostel Complaints', icon: Home },
        { key: 'chat', label: 'AI Study Chat', icon: Briefcase },
    ];

    // === FIX: Completed renderView function ===
    const renderView = () => {
        switch (view) {
            case 'notes': return <StudentNotesNotices user={user} showMessage={showMessage} catalogs={catalogs} primaryButtonClass={primaryButtonClass} buttonClass={buttonClass} />;
            case 'books': return <UnifiedLibrarySearch showMessage={showMessage} primaryButtonClass={primaryButtonClass} buttonClass={buttonClass} />; // UPDATED COMPONENT
            case 'fees': return <StudentFees user={user} showMessage={showMessage} primaryButtonClass={primaryButtonClass} buttonClass={buttonClass} />;
            case 'marks': return <StudentMarks user={user} showMessage={showMessage} primaryButtonClass={primaryButtonClass} buttonClass={buttonClass} />;
            case 'feedback': return <StudentFeedback showMessage={showMessage} />; // NEW COMPONENT
            case 'complaints': return <HostelComplaints showMessage={showMessage} primaryButtonClass={primaryButtonClass} buttonClass={buttonClass} />;
            case 'chat': return <AIChat showMessage={showMessage} primaryButtonClass={primaryButtonClass} buttonClass={buttonClass} />;
            default: return <div className="p-8 text-center text-gray-500">Welcome to NoteOrbit! Select a module to begin.</div>;
        }
    };
    // ===========================================

    return (
        <div className="flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-56 bg-white p-4 rounded-xl shadow-lg border border-gray-200 flex-shrink-0">
                <h5 className="text-lg font-bold text-blue-800 mb-4">Student Hub</h5>
                <nav className="space-y-2">
                    {navigation.map(item => (
                        <button
                            key={item.key}
                            onClick={() => setView(item.key)}
                            className={`w-full flex items-center p-3 rounded-lg font-semibold transition duration-200 ${
                                view === item.key 
                                    ? 'bg-blue-600 text-white shadow-md' 
                                    : 'text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            <item.icon className="w-5 h-5 mr-3" />
                            {item.label}
                        </button>
                    ))}
                </nav>
            </div>
            <div className="flex-1 min-h-[600px] bg-white p-6 rounded-xl shadow-2xl border border-blue-200">
                {renderView()}
            </div>
        </div>
    );
}

// ----------------------------------------------
// --- MAIN APPLICATION ---
function App() {
    const [user, setUser, isLoading] = useLocalUser();
    const [page, setPage] = useState(null); 
    const [userRole, setUserRole] = useState(null); 
    const [authMode, setAuthMode] = useState("login"); 
    const [message, setMessage] = useState({ text: null, type: null });
    const catalogs = useCatalogs();

    useEffect(() => { 
        if (!isLoading) {
            if (user) { setPage("dashboard"); } else { setPage("user_type"); }
        }
    }, [user, isLoading]); 

    const showMessage = (text, type = 'error') => setMessage({ text, type });
    const clearMessage = () => setMessage({ text: null, type: null });
    
    const getBackendRole = (uiRole) => {
        if (uiRole === 'Faculty') return 'professor';
        return uiRole ? uiRole.toLowerCase() : null; 
    };

    const doLogin = async (email, password) => {
    clearMessage();
    const expectedRole = getBackendRole(userRole);
    if (!expectedRole) return showMessage("Please select a valid role first.", 'error');

    try {
        // Using unauth() for login/register endpoint.
        const res = await unauth().post("/login", { email, password });

        // 🔥 ADD THIS LINE
        console.log("BACKEND ROLE SAYS →", res.data.user.role);

        let { token, user: u } = res.data;
        
        u.degree = u.degree || "";
        u.semester = u.semester || 1; 
        u.section = u.section || "";

            
            if (u.role !== expectedRole) {
                setAuthToken(null);
                localStorage.removeItem("noteorbit_user");
                throw new Error(`Access denied. You are logging in as a ${u.role}, not a ${expectedRole}.`);
            }
            if (u.role === "student" && u.status !== "APPROVED") {
                setAuthToken(null);
                localStorage.removeItem("noteorbit_user");
                throw new Error(`Account status: ${u.status}. Wait for admin approval.`);
            }

            setAuthToken(token);
            localStorage.setItem("noteorbit_user", JSON.stringify(u));
            setUser(u);
            showMessage("Logged in successfully.", 'success');
            setPage("dashboard");
        } catch (err) {
            // Note: Login/Register should not get a 401 error, 
            // but the general 4xx/5xx handling is still here.
            showMessage(err.response?.data?.message || err.message || "Login failed");
        }
    };

    const doRegister = async (payload) => {
        clearMessage();
        try {
            // Using unauth() for login/register endpoint.
            const res = await unauth().post("/register", payload);
            showMessage(res.data.message, 'success');
            setAuthMode("login");
        } catch (err) {
            showMessage(err.response?.data?.message || "Registration failed");
        }
    };

    const doLogout = () => {
        localStorage.removeItem("noteorbit_user");
        setAuthToken(null);
        setUser(null);
        setPage("user_type"); 
        clearMessage();
    };
    
    const buttonClass = "w-full flex items-center justify-center px-4 py-3 font-semibold rounded-full shadow-md transition duration-200";
    const primaryButtonClass = "bg-blue-600 hover:bg-blue-700 text-white";
    const successButtonClass = "bg-green-600 hover:bg-green-700 text-white";
    const dangerButtonClass = "bg-red-600 hover:bg-red-700 text-white";


    const renderContent = () => {
        if (isLoading || page === null) {
            return (
                <div className="text-center p-10 text-gray-500 flex justify-center items-center h-48">
                    <Loader2 className="animate-spin w-8 h-8 mr-3 text-blue-500" />
                    <span className="text-lg">Loading Session...</span>
                </div>
            );
        }

        if (page === 'dashboard' && !user) { setPage('user_type'); return <div className="text-center p-10 text-gray-500">Redirecting...</div>; }

        switch (page) {
            case 'user_type':
                return (<UserTypeSelection setUserRole={setUserRole} setPage={setPage} buttonClass={buttonClass} primaryButtonClass={primaryButtonClass}/>);
            case 'credentials':
                return (
                    <div key={authMode} className="animate-in fade-in slide-in-from-right-10 duration-500 w-full max-w-lg mx-auto">
                        <CredentialsView userRole={userRole} authMode={authMode} setAuthMode={setAuthMode} setPage={setPage} onLogin={doLogin} onRegister={doRegister} catalogs={catalogs} primaryButtonClass={primaryButtonClass} successButtonClass={successButtonClass} buttonClass={buttonClass} />
                    </div>
                );
            case "dashboard":
                return (
                    <div className="w-full max-w-5xl mx-auto animate-in fade-in duration-700">
                        {user.role === "admin" ? <AdminPanel user={user} showMessage={showMessage} catalogs={catalogs} buttonClass={buttonClass} primaryButtonClass={primaryButtonClass} dangerButtonClass={dangerButtonClass} /> :
                        user.role === "professor" ? <ProfessorPanel user={user} showMessage={showMessage} catalogs={catalogs} buttonClass={buttonClass} successButtonClass={successButtonClass} dangerButtonClass={dangerButtonClass} /> :
                        user.role === "student" ? <StudentPanel user={user} showMessage={showMessage} catalogs={catalogs} buttonClass={buttonClass} primaryButtonClass={primaryButtonClass} /> :
                        <div className="card">Unknown role</div>}
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 font-sans p-4 sm:p-8 text-gray-900">
            <div className="max-w-5xl mx-auto w-full">
                <div className="header flex justify-between items-center p-6 bg-white rounded-xl shadow-lg border border-gray-200 mb-8">
                    <div className="flex flex-col">
                        <h2 className="text-4xl font-extrabold text-blue-800 tracking-wider">NoteOrbit</h2>
                        <div className="text-sm text-gray-500 mt-0.5">Smart college resource sharing platform</div>
                    </div>
                    <div className="flex items-center space-x-3">
                        {user ? (
                            <>
                                <span className="text-base font-medium text-gray-700 mr-3 hidden sm:inline">{user.name} ({user.role})</span>
                                <button className={`${buttonClass} bg-red-600 hover:bg-red-700 w-28 py-2.5`} onClick={doLogout}><LogOut className="w-5 h-5 mr-1" /> Logout</button>
                            </>
                        ) : null}
                    </div>
                </div>

                <MessageBar message={message.text} type={message.type} onClose={clearMessage} />

                <div className="mt-6">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
}

export default App;