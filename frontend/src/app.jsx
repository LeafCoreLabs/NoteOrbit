import React, { useEffect, useState, useCallback } from "react";
import axios from 'axios'; 
import { LogIn, UserPlus, LogOut, ArrowLeft, Loader2, CheckCircle, XCircle, ChevronDown, Book, Bell, Settings, Briefcase, User, Mail, Lock, GraduationCap, ClipboardList, BriefcaseBusiness } from 'lucide-react';

// NOTE: Assuming this file is imported from a separate api.js file for cleaner code
const BACKEND_BASE_URL = "http://127.0.0.1:5000"; 
let currentToken = localStorage.getItem("noteorbit_token");

// --- AXIOS CONFIGURATION ---
const api = axios.create({
    baseURL: BACKEND_BASE_URL,
});

api.interceptors.request.use(config => {
    const token = localStorage.getItem("noteorbit_token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    } else {
        delete config.headers.Authorization;
    }
    return config;
}, error => {
    return Promise.reject(error);
});
// --- END AXIOS CONFIGURATION ---

const setAuthToken = (token) => {
    currentToken = token;
    if (token) {
        localStorage.setItem("noteorbit_token", token);
    } else {
        localStorage.removeItem("noteorbit_token");
    }
};


// Custom Input Component (Praman Style)
const Input = ({ icon: Icon, className = '', ...props }) => (
    <div className="relative">
        {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />}
        <input
            {...props}
            className={`w-full bg-white text-gray-800 placeholder-gray-500 border border-gray-300 rounded-full py-3 ${Icon ? 'pl-12 pr-4' : 'px-4'} focus:ring-2 focus:ring-blue-500 outline-none transition duration-200 ${className}`}
        />
    </div>
);

// Custom Select Component (Praman Style)
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

// Helper for displaying messages (Praman Style)
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


// Catalogs loaded from backend
function useCatalogs() {
    const [degrees, setDegrees] = useState([]);
    const [sections, setSections] = useState([]);
    const [subjects, setSubjects] = useState([]); 
    const [loaded, setLoaded] = useState(false);

    const fetchBasics = useCallback(async () => {
        try {
            const [deg, sec] = await Promise.all([
                api.get("/admin/degrees"),
                api.get("/admin/sections")
            ]);
            setDegrees(deg.data.degrees || []);
            setSections(sec.data.sections || []);
        } catch (e) {
            console.error("Failed to fetch basics from backend:", e);
            setDegrees(["BCA", "BE", "MCA", "MBA"]);
            setSections(["A", "B", "C"]);
        } finally {
            setLoaded(true);
        }
    }, []);

    const fetchSubjects = useCallback(async (degree, semester) => {
        if (!degree || !semester) {
            setSubjects([]);
            return;
        }
        try {
            const res = await api.get("/admin/subjects", { params: { degree, semester } });
            setSubjects((res.data.subjects || []).map(s => s.name));
        } catch {
            setSubjects([]);
        }
    }, []);

    useEffect(() => { fetchBasics(); }, [fetchBasics]);
    return { degrees, sections, subjects, fetchSubjects, loaded, fetchBasics }; 
}

/**
 * FIX 1: Returns 'isLoading' to properly manage initial page decision.
 */
function useLocalUser() {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true); 

    useEffect(() => {
        const raw = localStorage.getItem("noteorbit_user");
        const token = localStorage.getItem("noteorbit_token");
        
        if (raw && token) {
            try {
                const parsedUser = JSON.parse(raw);
                setUser(parsedUser);
                setAuthToken(token); 
            } catch (e) {
                console.error("Corrupted user data in localStorage", e);
                localStorage.removeItem("noteorbit_user");
                localStorage.removeItem("noteorbit_token");
            }
        }
        setIsLoading(false);
    }, []);
    
    return [user, setUser, isLoading]; 
}

// --- MAIN APPLICATION ---

function App() {
    // FIX 2: Destructure isLoading
    const [user, setUser, isLoading] = useLocalUser(); 
    
    // FIX 3: Initial page is null until loading check is complete
    const [page, setPage] = useState(null); 
    const [userRole, setUserRole] = useState(null); 
    const [authMode, setAuthMode] = useState("login"); 
    const [message, setMessage] = useState({ text: null, type: null });
    const catalogs = useCatalogs();

    /**
     * FIX 4: Control the initial page navigation flow based on loading status.
     */
    useEffect(() => { 
        if (!isLoading) {
            if (user) {
                setPage("dashboard");
            } else {
                setPage("user_type");
            }
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
            const res = await api.post("/login", { email, password }); 
            let { token, user: u } = res.data;
            
            u.degree = u.degree || "";
            u.semester = u.semester || 1; 
            u.section = u.section || "";
            
            if (u.role !== expectedRole) {
                setAuthToken(null);
                localStorage.removeItem("noteorbit_user");
                throw new Error(`Access denied. You are logging in as a ${u.role}, not a ${expectedRole}.`);
            }

            setAuthToken(token);
            localStorage.setItem("noteorbit_user", JSON.stringify(u));
            setUser(u);
            showMessage("Logged in successfully.", 'success');
            setPage("dashboard");
        } catch (err) {
            showMessage(err.response?.data?.message || err.message || "Login failed");
        }
    };

    const doRegister = async (payload) => {
        clearMessage();
        try {
            const res = await api.post("/register", payload);
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
    
    // Custom button class based on Praman style
    const buttonClass = "w-full flex items-center justify-center px-4 py-3 font-semibold rounded-full shadow-md transition duration-200";
    const darkButtonClass = "bg-gray-600 hover:bg-gray-700 text-white";
    const primaryButtonClass = "bg-blue-600 hover:bg-blue-700 text-white";
    const successButtonClass = "bg-green-600 hover:bg-green-700 text-white";
    const dangerButtonClass = "bg-red-600 hover:bg-red-700 text-white";


    // --- Renderers ---

    const renderContent = () => {
        // FIX 5: Show loading state while determining the initial page
        if (isLoading || page === null) {
            return (
                <div className="text-center p-10 text-gray-500 flex justify-center items-center h-48">
                    <Loader2 className="animate-spin w-8 h-8 mr-3 text-blue-500" />
                    <span className="text-lg">Loading Session...</span>
                </div>
            );
        }

        if (page === 'dashboard' && !user) {
             setPage('user_type'); 
             return <div className="text-center p-10 text-gray-500">Redirecting...</div>;
        }

        switch (page) {
            case 'user_type':
                return (
                    <UserTypeSelection 
                        setUserRole={setUserRole} 
                        setPage={setPage} 
                        buttonClass={buttonClass}
                        primaryButtonClass={primaryButtonClass}
                    />
                );
            
            case 'credentials':
                return (
                    <div 
                        key={authMode} 
                        className="animate-in fade-in slide-in-from-right-10 duration-500 w-full max-w-lg mx-auto"
                    >
                        <CredentialsView 
                            userRole={userRole}
                            authMode={authMode}
                            setAuthMode={setAuthMode}
                            setPage={setPage}
                            onLogin={doLogin}
                            onRegister={doRegister}
                            catalogs={catalogs}
                            primaryButtonClass={primaryButtonClass}
                            successButtonClass={successButtonClass}
                            darkButtonClass={darkButtonClass}
                            buttonClass={buttonClass}
                        />
                    </div>
                );

            case "dashboard":
                return (
                    <div className="w-full max-w-5xl mx-auto p-8 bg-white rounded-2xl shadow-2xl border border-blue-200 animate-in fade-in duration-700">
                        <h3 className="text-2xl font-bold mb-6 text-gray-900">{user.role.toUpperCase()} Dashboard</h3>
                        {user.role === "admin" ? <AdminPanel showMessage={showMessage} catalogs={catalogs} buttonClass={buttonClass} primaryButtonClass={primaryButtonClass} dangerButtonClass={dangerButtonClass} /> :
                        user.role === "professor" ? <ProfessorPanel user={user} showMessage={showMessage} catalogs={catalogs} buttonClass={buttonClass} primaryButtonClass={successButtonClass} dangerButtonClass={dangerButtonClass} /> :
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

// --- CHILD COMPONENTS ---

function UserTypeSelection({ setUserRole, setPage, buttonClass, primaryButtonClass }) {
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

function CredentialsView({ onLogin, onRegister, userRole, setPage, catalogs, primaryButtonClass, successButtonClass, darkButtonClass, buttonClass, authMode, setAuthMode }) {
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
        if (loaded && degrees.length > 0 && sections.length > 0) {
            setDegree(degrees[0] || "");
            setSection(sections[0] || "");
        }
    }, [loaded, degrees, sections]);

    const handleRegisterSubmit = () => {
        onRegister({ srn, name, email: regEmail, password: regPassword, degree, semester, section });
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
                            {degrees.map(d => <option key={d}>{d}</option>)}
                        </Select>
                        <Select value={semester} onChange={e => setSemester(e.target.value)}>
                            {Array.from({ length: 8 }, (_, i) => i + 1).map(s => <option key={s}>{s}</option>)}
                        </Select>
                        <Select value={section} onChange={e => setSection(e.target.value)}>
                            {sections.map(s => <option key={s}>{s}</option>)}
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

function AdminPanel({ showMessage, catalogs, buttonClass, primaryButtonClass, dangerButtonClass }) {
    const { degrees, sections, loaded, fetchBasics } = catalogs;
    const [pending, setPending] = useState([]);
    const [newDegree, setNewDegree] = useState("");
    const [newSection, setNewSection] = useState("");
    const [subjectDegree, setSubjectDegree] = useState(degrees[0] || "");
    const [subjectSemester, setSubjectSemester] = useState("1");
    const [newSubject, setNewSubject] = useState(""); 

    const fetchPending = async () => {
        try {
            const res = await api.get("/admin/pending-students");
            setPending(res.data.pending || []);
        } catch {
            showMessage("Failed to fetch pending students.", 'error');
        }
    };

    useEffect(() => { 
        fetchPending(); 
        if (loaded && degrees.length > 0) {
             setSubjectDegree(degrees[0]);
        }
    }, [loaded, degrees]);

    const take = async (id, action) => {
        try {
            await api.post("/admin/approve-student", { student_id: id, action });
            showMessage(`Student ${action}d successfully.`, 'success');
            fetchPending();
        } catch {
            showMessage("Action failed.", 'error');
        }
    };
    
    const addCatalogItem = async (endpoint, name, successMsg) => {
        if (!name) return;
        try {
            await api.post(`/admin/${endpoint}`, { name });
            showMessage(successMsg, 'success');
            if (endpoint === 'degrees') setNewDegree("");
            if (endpoint === 'sections') setNewSection("");
            fetchBasics(); 
        } catch (e) {
            showMessage(e.response?.data?.message || `Add ${endpoint} failed.`, 'error');
        }
    };

    const addSubject = async () => {
        if (!subjectDegree || !subjectSemester || !newSubject) return showMessage("All fields required.", 'error');
        try {
            await api.post("/admin/subjects", { degree: subjectDegree, semester: subjectSemester, name: newSubject });
            showMessage("Subject added successfully.", 'success');
            setNewSubject("");
        } catch (e) {
            showMessage(e.response?.data?.message || "Add subject failed.", 'error');
        }
    };

    return (
        <div className="space-y-8">
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <h4 className="text-xl font-bold text-blue-700 mb-4 flex items-center"><User className="w-5 h-5 mr-2" /> Pending Student Approvals</h4>
                {pending.length === 0 && <div className="text-gray-500 text-center py-4">No pending students.</div>}
                {pending.map(s => (
                    <div key={s.id} className="flex flex-col sm:flex-row justify-between items-center py-3 border-b border-gray-100 last:border-b-0">
                        <div className="text-sm text-gray-700 font-medium truncate mb-2 sm:mb-0">
                            {s.name} ({s.srn}) — {s.degree} Sem {s.semester} Sec {s.section}
                        </div>
                        <div className="flex gap-2">
                            <button className={`${buttonClass} bg-green-600 hover:bg-green-700 text-sm w-20 py-1.5`} onClick={() => take(s.id, "approve")}>Approve</button>
                            <button className={`${buttonClass} ${dangerButtonClass} text-sm w-20 py-1.5`} onClick={() => take(s.id, "reject")}>Reject</button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 space-y-3">
                    <h4 className="text-lg font-bold text-blue-700 mb-3 flex items-center"><Settings className="w-5 h-5 mr-2" /> Manage Degrees</h4>
                    <Input placeholder="New degree (e.g., B.Tech)" value={newDegree} onChange={e => setNewDegree(e.target.value)} />
                    <button className={`${buttonClass} ${primaryButtonClass} w-full`} onClick={() => addCatalogItem('degrees', newDegree, "Degree added")}>Add Degree</button>
                </div>
                
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 space-y-3">
                    <h4 className="text-lg font-bold text-blue-700 mb-3 flex items-center"><Settings className="w-5 h-5 mr-2" /> Manage Sections</h4>
                    <Input placeholder="New section (e.g., D)" value={newSection} onChange={e => setNewSection(e.target.value)} />
                    <button className={`${buttonClass} ${primaryButtonClass} w-full`} onClick={() => addCatalogItem('sections', newSection, "Section added")}>Add Section</button>
                </div>
                
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 space-y-3">
                    <h4 className="text-lg font-bold text-blue-700 mb-3 flex items-center"><Book className="w-5 h-5 mr-2" /> Add Subject</h4>
                    <Select value={subjectDegree} onChange={e => setSubjectDegree(e.target.value)}>
                        {degrees.map(d => <option key={d}>{d}</option>)}
                    </Select>
                    <Select value={subjectSemester} onChange={e => setSubjectSemester(e.target.value)}>
                        {Array.from({length: 8}, (_, i) => i + 1).map(s => <option key={s}>{s}</option>)}
                    </Select>
                    <Input placeholder="Subject name" value={newSubject} onChange={e => setNewSubject(e.target.value)} />
                    <button className={`${buttonClass} ${primaryButtonClass} w-full`} onClick={addSubject}>Add Subject</button>
                </div>
            </div>
        </div>
    );
}

function ProfessorPanel({ user, showMessage, catalogs, buttonClass, primaryButtonClass, dangerButtonClass }) {
    const { degrees, subjects, fetchSubjects } = catalogs;
    const [title, setTitle] = useState("");
    const [degree, setDegree] = useState(user.degree || degrees[0] || "");
    const [semester, setSemester] = useState(user.semester ? String(user.semester) : "1");
    const [subject, setSubject] = useState("");
    const [documentType, setDocumentType] = useState("Notes");
    const [file, setFile] = useState(null);

    const [nTitle, setNTitle] = useState("");
    const [nMsg, setNMsg] = useState("");
    const [nSection, setNSection] = useState(user.section || ""); 
    const [nDeadline, setNDeadline] = useState("");
    const [attachment, setAttachment] = useState(null); 

    useEffect(() => {
        fetchSubjects(degree, semester);
    }, [degree, semester, fetchSubjects]);

    useEffect(() => {
        if (subjects.length && !subject) setSubject(subjects[0]);
        if (!subjects.includes(subject)) setSubject(subjects[0] || "");
    }, [subjects, subject]);

    const upload = async () => {
        if (!title || !file) return showMessage("Title and file are required.", 'error');
        
        const form = new FormData();
        form.append("title", title);
        form.append("degree", degree);
        form.append("semester", semester);
        form.append("subject", subject);
        form.append("document_type", documentType);
        form.append("file", file);
        
        try {
            await api.post("/upload-note", form); 
            showMessage("Note uploaded successfully!", 'success');
            setTitle(""); setFile(null);
            if (document.getElementById('noteFile')) document.getElementById('noteFile').value = '';
        } catch (err) {
            showMessage(err.response?.data?.message || "Upload failed", 'error');
        }
    };

    const postNotice = async () => {
        if (!nTitle || !nMsg || !nSection || !subject) return showMessage("Title, message, section, and subject are required.", 'error');
        
        const form = new FormData();
        form.append("title", nTitle);
        form.append("message", nMsg);
        form.append("degree", degree);
        form.append("semester", semester);
        form.append("section", nSection); 
        form.append("subject", subject);
        if (nDeadline) form.append("deadline", nDeadline);
        if (attachment) form.append("attachment", attachment);
        
        try {
            await api.post("/create-notice", form);
            showMessage("Notice posted successfully!", 'success');
            setNTitle(""); setNMsg(""); setNDeadline(""); setAttachment(null); setNSection(user.section || "");
            if (document.getElementById('noticeAttachment')) document.getElementById('noticeAttachment').value = '';
        } catch (err) {
            showMessage(err.response?.data?.message || "Notice failed", 'error');
        }
    };

    return (
        <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-lg border border-green-200 space-y-3">
                <h4 className="text-xl font-bold mb-4 text-green-700 flex items-center"><Book className="w-5 h-5 mr-2" /> Upload Study Material</h4>
                <Input placeholder="Title (e.g., Module 1 PPT)" value={title} onChange={e => setTitle(e.target.value)} />
                
                <div className="grid grid-cols-2 gap-3">
                    <Select value={degree} onChange={e => setDegree(e.target.value)}>
                        {degrees.map(d => <option key={d}>{d}</option>)}
                    </Select>
                    <Select value={semester} onChange={e => setSemester(e.target.value)}>
                        {Array.from({length: 8}, (_, i) => i + 1).map(s => <option key={s}>{s}</option>)}
                    </Select>
                </div>
                
                <Select value={subject} onChange={e => setSubject(e.target.value)} icon={Book}>
                    {Array.isArray(subjects) && subjects.map(s => <option key={s}>{s}</option>)}
                </Select>
                <Select value={documentType} onChange={e => setDocumentType(e.target.value)}>
                    <option>Notes</option><option>Question Bank</option><option>Reference Book</option>
                </Select>
                
                <label className="block text-sm text-gray-700 font-medium pt-2">Select File (PDF, DOCX, PPTX):</label>
                <input 
                    id="noteFile"
                    type="file" 
                    onChange={e => setFile(e.target.files[0])} 
                    className="w-full text-gray-600 bg-gray-100 rounded-lg p-3 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700 transition duration-200"
                />
                
                <button className={`${buttonClass} ${primaryButtonClass} w-full`} onClick={upload} disabled={!title || !file}>Upload Note</button>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg border border-red-200 space-y-3">
                <h4 className="text-xl font-bold mb-4 text-red-700 flex items-center"><Bell className="w-5 h-5 mr-2" /> Create Notice</h4>
                <Input placeholder="Title (e.g., Assignment 1 Due)" value={nTitle} onChange={e => setNTitle(e.target.value)} />
                <textarea className="w-full bg-white text-gray-800 placeholder-gray-500 border border-gray-300 rounded-xl py-3 px-4 focus:ring-2 focus:ring-red-500 outline-none transition duration-200 h-24" placeholder="Message details..." value={nMsg} onChange={e => setNMsg(e.target.value)} />
                
                <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="Target Section(s) (e.g., A or A,B)" value={nSection} onChange={e => setNSection(e.target.value)} />
                    <Input type="date" value={nDeadline} onChange={e => setNDeadline(e.target.value)} />
                    
                </div>
                
                <label className="block text-sm text-gray-700 font-medium pt-2">Attachment (Optional):</label>
                <input 
                    id="noticeAttachment"
                    type="file" 
                    onChange={e => setAttachment(e.target.files[0])} 
                    className="w-full text-gray-600 bg-gray-100 rounded-lg p-3 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-600 file:text-white hover:file:bg-red-700 transition duration-200"
                />
                
                <button className={`${buttonClass} ${dangerButtonClass} w-full`} onClick={postNotice} disabled={!nTitle || !nMsg || !nSection || !subject}>Post Notice</button>
            </div>
        </div>
    );
}

// --- Student Panel Component (FINAL ROBUST VERSION) ---
function StudentPanel({ user, showMessage, catalogs, buttonClass, primaryButtonClass }) {
    const { fetchSubjects, subjects } = catalogs;
    const [selectedSubject, setSelectedSubject] = useState(null); 
    const [notes, setNotes] = useState([]);
    const [notices, setNotices] = useState([]);
    const [isFetching, setIsFetching] = useState(false);
    
    // NOTE: The console log helper is removed for the final clean code, 
    // but the underlying logic is now stable.

    // 1. Memoized function to fetch content
    const fetchContent = useCallback(async (subjectToFetch) => {
        if (!subjectToFetch || !user.degree || !user.semester) {
            setNotes([]);
            setNotices([]);
            return;
        }
        
        setIsFetching(true);
        
        try {
            const [notesRes, noticesRes] = await Promise.all([
                api.get("/notes", { params: { degree: user.degree, semester: user.semester, subject: subjectToFetch } }),
                api.get("/notices", { params: { subject: subjectToFetch } })
            ]);
            setNotes(notesRes.data.notes || []);
            setNotices(noticesRes.data.notices || []);
            showMessage(`Content loaded for ${subjectToFetch}.`, 'success');
        } catch (e) {
            console.error("Content fetch failed:", e);
            showMessage("Failed to load content. Please check the backend connection or subject data.", 'error');
            setNotes([]);
            setNotices([]);
        } finally {
            setIsFetching(false);
        }
    }, [user.degree, user.semester, showMessage]); // Exclude selectedSubject here

    // 2. Fetch subjects based on user context (on mount)
    useEffect(() => {
        if (user && user.degree && user.semester) {
            fetchSubjects(user.degree, user.semester);
        } else {
            fetchSubjects(null, null); 
        }
    }, [user.degree, user.semester, fetchSubjects]);

    // 3. CRITICAL FIX: Subject setting and initial content fetch trigger
    useEffect(() => {
        let subjectToUse = selectedSubject;

        if (subjects.length > 0) {
            // A. If selected subject is null or invalid, choose the first one.
            if (!subjectToUse || !subjects.includes(subjectToUse)) {
                subjectToUse = subjects[0];
                setSelectedSubject(subjectToUse);
            }
        } else {
            // B. No subjects available, clear selection.
            setSelectedSubject(null);
            subjectToUse = null;
        }
        
        // C. Trigger the fetch with the determined subject.
        // NOTE: This runs whenever the subjects array changes (from empty to populated, or vice versa)
        if (subjectToUse) {
            fetchContent(subjectToUse);
        } else {
            // D. Clear previous content if no subject is available/selected
            setNotes([]);
            setNotices([]);
        }

    }, [subjects]); // Key trigger is the 'subjects' list changing

    // 4. Trigger content fetch when the user manually changes the select dropdown
    useEffect(() => {
        if (selectedSubject) {
            // We use a different function here to prevent an infinite loop 
            // with the subjects dependency above.
            fetchContent(selectedSubject);
        }
    }, [selectedSubject]); // Only runs when user changes the dropdown

    const handleRefresh = () => {
        fetchContent(selectedSubject);
    };


    // --- Conditional rendering guards for loading states ---
    
    if (!user.degree || !user.semester) {
        return (
            <div className="text-center p-10 bg-white rounded-xl shadow-md text-gray-500">
                Student profile missing degree/semester information. Please contact admin.
            </div>
        );
    }

    if (isFetching || (subjects.length > 0 && selectedSubject === null)) {
         return (
             <div className="text-center p-10 bg-white rounded-xl shadow-md text-gray-500 flex justify-center items-center">
                 <Loader2 className="animate-spin w-8 h-8 mr-3 text-blue-500" />
                 Loading subject data...
            </div>
        );
    }
    
    if (subjects.length === 0) {
        return (
            <div className="text-center p-10 bg-white rounded-xl shadow-md text-gray-500">
                 No subjects are currently defined for {user.degree} Sem {user.semester}.
            </div>
        );
    }
    
    return (
        <div className="space-y-8">
            <div className="bg-blue-50 p-6 rounded-xl border border-blue-200 shadow-inner">
                <strong className="text-xl text-blue-700 block mb-1">Your Course Context</strong>
                <div className="text-sm text-gray-600">{user.degree || 'Loading'} (Semester {user.semester || '...'} / Section {user.section || '...'})</div>
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center pt-4">
                    <label className="text-base text-gray-700 font-bold flex-shrink-0">Subject:</label>
                    <Select className="flex-1 max-w-xs" value={selectedSubject || ''} onChange={e => setSelectedSubject(e.target.value)} disabled={!subjects.length}>
                        {Array.isArray(subjects) && subjects.map(s => <option key={s}>{s}</option>)}
                    </Select>
                    <button className={`${buttonClass} bg-gray-400 hover:bg-gray-500 text-gray-900 text-sm sm:w-48 py-2.5`} onClick={handleRefresh} disabled={isFetching || !selectedSubject}>
                        {isFetching ? <Loader2 className="animate-spin w-5 h-5 mr-1" /> : <Book className="w-5 h-5 mr-1" />}
                        {isFetching ? 'Refreshing...' : 'Refresh Content'}
                    </button>
                </div>
            </div>

            <div>
                <h4 className="text-xl font-bold mt-4 mb-4 text-blue-700 flex items-center"><Book className="w-5 h-5 mr-2" /> Notes for "{selectedSubject || '...'}"</h4>
                {notes.length === 0 && <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 text-sm">No notes uploaded for {selectedSubject || 'this subject'} yet.</div>}
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
                {notices.length === 0 && <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 text-sm">No recent notices for {selectedSubject || 'this subject'} matching your context.</div>}
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
            
            <div className="mt-8">
                {/* FIX 8: Pass primaryButtonClass to AIChat to resolve ReferenceError */}
                <AIChat showMessage={showMessage} buttonClass={buttonClass} primaryButtonClass={primaryButtonClass} />
            </div>

        </div>
    );
}


// --- AI Chat Component (Fixed Prop usage) ---
function AIChat({ showMessage, buttonClass, primaryButtonClass }) { // <-- RECEIVING primaryButtonClass
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
            const res = await api.post("/chat", { question: q });
            setHistory(h => [...h, { role: "ai", text: res.data.answer }]);
        } catch (err) {
            showMessage(`Chat failed: ${err.response?.data?.message || "Could not connect to AI service."}`, 'error');
            setHistory(h => [...h, { role: "ai", text: "I'm sorry, I couldn't connect to the AI service. Please check the backend configuration." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !isLoading) askQuestion();
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-blue-200">
            <h4 className="text-xl font-bold mb-4 text-blue-700 flex items-center"><Briefcase className="w-5 h-5 mr-2" /> AI Study Assistant</h4>
            <div id="chat-history" className="h-96 overflow-y-auto border border-gray-300 rounded-xl p-4 bg-gray-50">
                <div className="flex flex-col space-y-3">
                    {history.map((msg, index) => (
                        <div key={index} className={`max-w-[80%] p-3 rounded-xl shadow-sm text-sm ${
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
                {/* FIX: Use primaryButtonClass which is now correctly passed */}
                <button className={`${buttonClass} w-24 py-3 ${primaryButtonClass}`} onClick={askQuestion} disabled={isLoading || !question.trim()}>
                    {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Ask'}
                </button>
            </div>
            <div className="text-xs text-center mt-2 text-gray-500">Powered by Gemini</div>
        </div>
    );
}


export default App;