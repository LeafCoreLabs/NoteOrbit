import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import gsap from "gsap";
import {
    LogIn, UserPlus, LogOut, ArrowLeft, ArrowRight, Loader2, CheckCircle, XCircle, ChevronDown,
    Book, Bell, Settings, Briefcase, User, Mail, Lock, GraduationCap, ClipboardList,
    BriefcaseBusiness, IndianRupee, Award, MessageSquare, Upload, RefreshCw,
    Trash2, Save, Home, Search, Download, Check, Atom, Star, Sparkles, Plus, Filter, Eye, EyeOff, Edit,
    BrainCircuit, AlertTriangle, Target, Lightbulb, Send as SendIcon, Paperclip, Menu, History, Bot, BarChart3
} from "lucide-react";
import { api, auth, unauth } from "../api";
import { setAuthToken } from "../api/auth";
import { cents_to_rupees_str } from "../utils/format";
import { useCatalogs } from "../hooks/useCatalogs";
import { useLocalUser } from "../hooks/useLocalUser";
import { OrbitLogo, MessageBar, WelcomeLoader } from "../components/ui";
import ParticleBackground from "../components/ParticleBackground";
import WelcomeScreen from "../features/auth/WelcomeScreen";
import AdminPanel from "../features/admin/AdminPanel";
import StudentPanel from "../features/student/StudentPanel";

function App() {
    const [user, setUser, isLoading] = useLocalUser();
    const [page, setPage] = useState("welcome");
    const [userRole, setUserRole] = useState("Student");
    const [authMode, setAuthMode] = useState("login");
    const [message, setMessage] = useState({ text: null, type: null });
    const [isLoginTransition, setIsLoginTransition] = useState(false); // NEW: Login Transition State
    const catalogs = useCatalogs();

    useEffect(() => {
        if (!isLoading) {
            if (user) {
                setPage("dashboard");
            } else {
                setPage("welcome");
            }
        }
    }, [user, isLoading]);

    // Scroll to top when page changes to credentials (fixes mobile scroll issue)
    useEffect(() => {
        if (page === 'credentials') {
            // Immediate scroll to top, then smooth scroll to form
            window.scrollTo({ top: 0, behavior: 'auto' });
            // Small delay to ensure DOM is ready, then scroll to credentials form
            setTimeout(() => {
                const credentialsForm = document.getElementById('credentials-form');
                if (credentialsForm) {
                    credentialsForm.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
                } else {
                    // Fallback: scroll window to top
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            }, 150);
        }
    }, [page]);

    const showMessage = (text, type = 'error') => setMessage({ text, type });
    const clearMessage = () => setMessage({ text: null, type: null });

    // Auto-dismiss alert after 3 seconds
    useEffect(() => {
        if (message.text) {
            const timer = setTimeout(() => {
                clearMessage();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    const getBackendRole = (uiRole) => {
        return uiRole ? uiRole.toLowerCase() : null;
    };

    const doLogin = async (identifier, password, overrideRole = null) => {
        clearMessage();
        const roleToUse = overrideRole || userRole;
        const expectedRole = getBackendRole(roleToUse);
        if (!expectedRole) return showMessage("Please select a valid role first.", 'error');

        try {
            // Using unauth() for login/register endpoint.
            // Send proper payload based on role
            let payload = { password, role: expectedRole };
            payload.email = identifier; // Backend expects 'email' key even for SRN identifier for parents

            const res = await unauth().post("/login", payload);

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

            // TRIGGER TRANSITION ANIMATION
            setIsLoginTransition(true);
            setTimeout(() => {
                setAuthToken(token);
                localStorage.setItem("noteorbit_user", JSON.stringify(u));
                setUser(u);
                showMessage("Logged in successfully.", 'success');
                setPage("dashboard");
                setIsLoginTransition(false);
            }, 2000); // 2 Second Wait Animation

        } catch (err) {
            // Note: Login/Register should not get a 401 error,  
            // but the general 4xx/5xx handling is still here.
            showMessage(err.response?.data?.message || err.message || "Login failed");
            throw err; // Re-throw so CredentialsView stops loading & doesn't vanish
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
        setPage("welcome");
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

        if (page === 'dashboard' && !user) {
            setPage('welcome');
            return <div className="text-center p-10 text-gray-500">Redirecting...</div>;
        }

        if (user && page === "dashboard") {
            return (
                <div className="w-full max-w-5xl mx-auto animate-in fade-in duration-700">
                    {user.role === "admin" ? (
                        <AdminPanel
                            user={user}
                            showMessage={showMessage}
                            catalogs={catalogs}
                            buttonClass={buttonClass}
                            primaryButtonClass={primaryButtonClass}
                            dangerButtonClass={dangerButtonClass}
                            onLogout={doLogout}
                        />
                    ) : user.role === "student" ? (
                        <StudentPanel
                            user={user}
                            showMessage={showMessage}
                            catalogs={catalogs}
                            buttonClass={buttonClass}
                            primaryButtonClass={primaryButtonClass}
                            onLogout={doLogout}
                        />
                    ) : (
                        <div className="p-8 text-center text-slate-400 bg-slate-900/60 rounded-2xl border border-white/10">
                            <p className="text-lg font-semibold text-white mb-2">Access Restricted</p>
                            <p className="text-sm mb-4">Only Student and Admin portals are active.</p>
                            <button
                                onClick={doLogout}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
                            >
                                Log out
                            </button>
                        </div>
                    )}
                </div>
            );
        }

        // Unauthenticated Welcome Screen (60/40 Split View)
        return (
            <WelcomeScreen
                userRole={userRole}
                setUserRole={setUserRole}
                authMode={authMode}
                setAuthMode={setAuthMode}
                onLogin={doLogin}
                onRegister={doRegister}
                showMessage={showMessage}
                catalogs={catalogs}
            />
        );
    };

    return (
        <div className={`${user ? 'min-h-screen p-2 sm:p-4 lg:p-6 overflow-x-hidden' : 'min-h-screen lg:h-screen w-full overflow-y-auto lg:overflow-hidden p-2 sm:p-3 lg:px-6 lg:py-2.5'} bg-transparent font-sans text-white selection:bg-blue-500/30 selection:text-blue-200 relative`}>
            {/* Global Background Elements */}
            <ParticleBackground />
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] opacity-20" />
            </div>

            <div className={`${user ? 'w-full' : 'w-full h-full flex flex-col justify-between'} relative z-10`}>
                {/* Header only rendered when logged in to dashboard */}
                {user && (
                    <div className="max-w-6xl mx-auto header flex justify-between items-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/10 mb-8 sticky top-2 z-50 shadow-2xl">
                        <div className="flex flex-col">
                            <OrbitLogo />
                        </div>
                        <div className="flex items-center space-x-3">
                            <span className="text-sm font-medium text-slate-300 mr-4 hidden sm:inline">
                                {user.name} <span className="text-blue-400 uppercase">({user.role})</span>
                            </span>
                            <button
                                className="flex items-center gap-2 px-3 py-1.5 bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 text-red-400 hover:text-red-300 rounded-lg transition-colors font-medium text-sm"
                                onClick={doLogout}
                            >
                                <LogOut className="w-4 h-4" /> Logout
                            </button>
                        </div>
                    </div>
                )}

                {/* NEW: Login Transition Overlay */}
                {isLoginTransition && <WelcomeLoader />}

                <div className="w-full">
                    <MessageBar message={message.text} type={message.type} onClose={clearMessage} />
                </div>

                <div className={`${user ? 'mt-1 sm:mt-2' : 'flex-1 min-h-0 flex flex-col'}`}>
                    {renderContent()}
                </div>

                {/* Dashboard Branded Footer */}
                {user && (
                    <footer className="max-w-5xl mx-auto mt-14 mb-6 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
                        <div>
                            <span>NoteOrbit v2.3 Academic ERP • Sapthagiri NPS University</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <a
                                href="https://leafcorelabs.in"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-emerald-300 transition-colors font-medium flex items-center gap-1"
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                <span>LeafCore Labs</span>
                            </a>
                            <span>•</span>
                            <a
                                href="https://beingthatcrew.in"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-cyan-300 transition-colors font-medium flex items-center gap-1"
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                                <span>Being That Crew (BTC)</span>
                            </a>
                        </div>
                    </footer>
                )}
            </div>
        </div>
    );
}

export default App;
