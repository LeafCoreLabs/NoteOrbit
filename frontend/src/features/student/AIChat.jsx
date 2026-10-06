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
import { Input } from "../../components/ui";

export default function AIChat({ showMessage, primaryButtonClass, buttonClass }) {
    const [question, setQuestion] = useState("");
    const [history, setHistory] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const fileInputRef = useRef(null);
    const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);

    const WELCOME_MSG = { role: "ai", text: "Hello! I am Orbit Bot, your academic assistant. Ask me anything about your studies, or upload notes for me to analyze." };

    // Fetch Sessions on Mount
    useEffect(() => {
        loadSessions();
        // Set initial view to empty/welcome
        setHistory([WELCOME_MSG]);
    }, []);

    const loadSessions = async () => {
        try {
            const res = await auth().get("/ai/sessions");
            setSessions(res.data.sessions || []);
        } catch (e) {
            console.error(e);
        }
    };

    const loadSession = async (sessionId) => {
        if (currentSessionId === sessionId) return;
        setIsLoading(true);
        setCurrentSessionId(sessionId);
        try {
            const res = await auth().get(`/ai/session/${sessionId}`);
            setHistory(res.data.messages || []);
        } catch (e) {
            showMessage("Failed to retrieve chat history", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const startNewChat = () => {
        setCurrentSessionId(null);
        setHistory([WELCOME_MSG]);
        setQuestion("");
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const deleteSession = async (e, sessionId) => {
        e.stopPropagation();
        e.preventDefault();
        console.log("Attempting to delete session:", sessionId);

        // Removed window.confirm as it was blocking execution in some environments
        // if (!window.confirm("Are you sure you want to delete this chat history?")) return;

        try {
            console.log("Sending DELETE request...");
            await auth().delete(`/ai/session/${sessionId}`);
            console.log("Delete success");
            setSessions(prev => prev.filter(s => s.id !== sessionId));
            if (currentSessionId === sessionId) startNewChat();
        } catch (e) {
            console.error("Delete Session Failed:", e);
            showMessage(`Failed to delete session: ${e.response?.data?.message || e.message}`, "error");
        }
    };

    // Auto-scroll logic
    useEffect(() => {
        const chatContainer = document.getElementById('chat-history');
        if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
    }, [history]);

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const askQuestion = async () => {
        if ((!question.trim() && !selectedFile) || isLoading) return;

        // Message to display
        const userMsgText = selectedFile ? `${question} [Attached: ${selectedFile.name}]` : question;
        const tempHistory = [...history, { role: "user", text: userMsgText }];
        setHistory(tempHistory);
        setQuestion("");
        setIsLoading(true);

        try {
            let res;
            const formData = new FormData();
            formData.append("question", question);
            if (currentSessionId) formData.append("session_id", currentSessionId);
            if (selectedFile) formData.append("file", selectedFile);

            // Using Multipart for everything to support file if present.
            // If no file, we can still use multipart, or switch to JSON. 
            // Previous code handled both. Let's send FormData always for simplicity now.

            res = await auth().post("/chat", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            // Update Session ID if new
            if (res.data.session_id && res.data.session_id !== currentSessionId) {
                setCurrentSessionId(res.data.session_id);
                loadSessions(); // Refresh list to show new title
            } else {
                // If existing session, just refresh list to update timestamp? Optional.
                loadSessions();
            }

            setHistory(h => [...h, { role: "ai", text: res.data.answer }]);
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";

        } catch (err) {
            if (err.response && err.response.status !== 401) {
                showMessage(`Chat failed: ${err.response?.data?.message || "Could not connect to AI service."}`, 'error');
            }
            setHistory(h => [...h, { role: "ai", text: "I'm sorry, I couldn't connect to the AI service." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !isLoading) askQuestion();
    };

    return (
        <div className="flex h-[600px] gap-4 relative isolate overflow-hidden">
            {/* Sidebar (History) - Mobile Drawer / Desktop Static */}
            <div className={`
                absolute inset-y-0 left-0 z-50 h-full w-3/4 max-w-xs bg-slate-900/95 backdrop-blur-2xl border-r border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-transform duration-300 ease-out
                md:static md:w-1/4 md:bg-slate-900/60 md:shadow-none md:translate-x-0 md:backdrop-blur-xl md:border md:rounded-xl md:flex md:flex-col
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:w-0 md:border-0 md:p-0'}
            `}>
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-slate-900 to-slate-800/50">
                    <h5 className="font-bold text-slate-200 flex items-center gap-2">
                        <History className="w-4 h-4 text-blue-400" /> History
                    </h5>
                    <div className="flex items-center gap-2">
                        {/* Mobile Close Button */}
                        <button onClick={() => setSidebarOpen(false)} className="md:hidden p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <button onClick={startNewChat} className="p-1.5 px-3 bg-blue-600 rounded-lg text-xs font-semibold text-white hover:bg-blue-500 flex items-center shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
                            <Plus className="w-3.5 h-3.5 mr-1.5" /> New
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-slate-900/50">
                    {sessions.map(s => (
                        <div
                            key={s.id}
                            onClick={() => { loadSession(s.id); setSidebarOpen(false); }}
                            className={`p-3 rounded-xl text-sm cursor-pointer flex justify-between items-center group transition-all border border-transparent ${currentSessionId === s.id
                                ? "bg-blue-600/20 text-blue-100 border-blue-500/30 shadow-sm"
                                : "text-slate-400 hover:bg-white/5 hover:text-slate-200"}`}
                        >
                            <div className="truncate pr-2 flex-grow font-medium">{s.title}</div>
                            <button
                                onClick={(e) => deleteSession(e, s.id)}
                                className="text-slate-500 hover:text-red-400 p-1.5 hover:bg-white/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 mobile-visible"
                                title="Delete Chat"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    {sessions.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-500 gap-2">
                            <MessageSquare className="w-8 h-8 opacity-20" />
                            <span className="text-xs">No recent chats</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile Overlay for Sidebar */}
            {sidebarOpen && (
                <div
                    className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Main Chat Area */}
            <div className="flex-1 w-full flex flex-col bg-slate-900/60 backdrop-blur-xl border border-white/10 md:border-blue-500/20 rounded-xl overflow-hidden relative shadow-2xl">
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-800/40 backdrop-blur-md z-10">
                    <div className="flex items-center text-blue-400 font-bold text-lg">
                        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="mr-3 p-1 rounded-lg hover:bg-white/5 transition-colors">
                            <Menu className="w-6 h-6" />
                        </button>
                        <div className="flex flex-col leading-none">
                            <span className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-blue-400" />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Orbit Bot</span>
                            </span>
                            <span className="text-[10px] font-normal text-slate-500 mt-1 hidden md:block">Powered by Llama 3.3</span>
                        </div>
                    </div>
                    <div className="text-xs font-medium px-3 py-1 bg-blue-500/10 text-blue-300 rounded-full border border-blue-500/20">
                        {currentSessionId ? "Active Session" : "New Chat"}
                    </div>
                </div>

                {/* Messages */}
                <div id="chat-history" className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/30 scroll-smooth">
                    {history.length === 0 && !isLoading && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-60">
                            <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
                                <Bot className="w-8 h-8 text-blue-400" />
                            </div>
                            <p className="text-sm font-medium">How can I help you today?</p>
                        </div>
                    )}
                    {history.map((msg, index) => (
                        <div key={index} className={`flex ${msg.role === "ai" ? "justify-start" : "justify-end"}`}>
                            <div className={`max-w-[85%] md:max-w-[75%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-md ${msg.role === "ai"
                                ? "bg-slate-800 text-slate-200 border border-white/5 rounded-tl-none"
                                : "bg-gradient-to-br from-blue-600 to-blue-700 text-white border border-blue-500/20 rounded-tr-none"
                                }`}>
                                <div className="markdown-prose">
                                    {msg.text}
                                </div>
                                <div className={`text-[10px] mt-1 opacity-50 ${msg.role === "ai" ? "text-slate-400" : "text-blue-100 text-right"}`}>
                                    {msg.role === "ai" ? "Orbit AI" : "You"}
                                </div>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-slate-800/80 p-3 rounded-2xl rounded-tl-none text-sm text-blue-300 flex items-center border border-white/5 shadow-sm">
                                <Loader2 className="animate-spin w-4 h-4 mr-2.5" />
                                <span className="font-medium animate-pulse">Thinking...</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area - Pinned Bottom */}
                <div className="p-3 md:p-4 bg-slate-900 border-t border-white/10 z-20">
                    <div className="flex flex-col space-y-2 max-w-4xl mx-auto">
                        {selectedFile && (
                            <div className="flex items-center justify-between bg-blue-900/20 border border-blue-500/30 px-3 py-2 rounded-lg animate-in slide-in-from-bottom-2">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <div className="bg-blue-600/20 p-1.5 rounded text-blue-400">
                                        <Paperclip className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="text-xs font-medium text-blue-200 truncate">{selectedFile.name}</span>
                                </div>
                                <button
                                    onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                                    className="text-slate-400 hover:text-red-400 p-1 rounded-full hover:bg-white/5"
                                >
                                    <XCircle className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        <div className="flex items-end gap-2 bg-slate-800/50 p-1.5 rounded-2xl border border-white/10 focus-within:ring-2 focus-within:ring-blue-500/50 focus-within:border-blue-500/50 transition-all shadow-sm">
                            <button
                                className="p-3 rounded-xl text-slate-400 hover:text-blue-400 hover:bg-slate-700/50 transition-colors"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isLoading}
                            >
                                <Paperclip className="w-5 h-5" />
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                className="hidden"
                                accept=".pdf,.txt,.md,.py,.js,.html,.css,.json,.docx,.doc,.pptx,.ppt"
                            />

                            <div className="relative flex-grow">
                                <Input
                                    className="w-full py-3 px-2 bg-transparent border-none focus:ring-0 text-slate-200 placeholder:text-slate-500 text-base"
                                    placeholder={selectedFile ? "Add a message..." : "Ask something..."}
                                    value={question}
                                    onChange={e => setQuestion(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    disabled={isLoading}
                                    autoComplete="off"
                                />
                            </div>

                            <button
                                className={`p-3 rounded-xl transition-all duration-200 ${!question.trim() && !selectedFile
                                    ? "bg-slate-700/50 text-slate-500 cursor-not-allowed"
                                    : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 active:scale-95"
                                    }`}
                                onClick={askQuestion}
                                disabled={isLoading || (!question.trim() && !selectedFile)}
                            >
                                {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <SendIcon className="w-5 h-5" />}
                            </button>
                        </div>

                        <div className="text-[10px] text-center text-slate-600 font-medium">
                            Powered by Llama 3.3
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ----------------------------------------------
// --- PROFESSOR MODULES ---

// --- PROFESSOR MODULE: Marks Upload (MODIFIED to use form fields) ---
