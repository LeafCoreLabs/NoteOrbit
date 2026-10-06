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

export default function UnifiedLibrarySearch({ showMessage, primaryButtonClass, buttonClass }) {
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
            <h4 className="text-2xl font-bold text-blue-400 flex items-center"><Book className="w-6 h-6 mr-2" /> Unified Library Search</h4>

            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                <Select className="sm:w-40 flex-shrink-0" value={searchSource} onChange={e => setSearchSource(e.target.value)} disabled={isLoading}>
                    <option value="internal" className="text-slate-900">Internal Library</option>
                    <option value="openlibrary" className="text-slate-900">OpenLibrary API</option>
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
                <div className="p-4 bg-slate-900/40 border border-white/10 rounded-xl text-slate-500">
                    No results found for "{searchTerm}" in the {searchSource} library.
                </div>
            )}

            {!isLoading && allResults.length > 0 && (
                <div className="space-y-4">
                    <div className="text-sm text-slate-500 font-semibold">{allResults.length} result(s) found.</div>
                    {allResults.map((book, index) => (
                        <div key={book.id || index} className={`p-4 rounded-xl shadow-md ${book.source === 'Internal' ? 'bg-green-900/20 border-l-4 border-green-500' : 'bg-slate-900/60 border-l-4 border-slate-500'}`}>
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="font-bold text-lg text-white">{book.title}</div>
                                    <div className="text-sm text-slate-400 mt-1">
                                        Author: **{book.author}** | ISBN: {book.isbn || 'N/A'}
                                    </div>
                                    <div className="text-xs mt-1 text-slate-500">Source: {book.source}</div>
                                </div>
                                <div className="ml-4 flex-shrink-0">
                                    {book.source === 'Internal' && book.file_url ? (
                                        <a href={book.file_url} target="_blank" rel="noopener noreferrer" className={`py-1.5 px-4 text-sm font-semibold rounded-full inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white`}>
                                            <Eye className="w-4 h-4 mr-1" /> View
                                        </a>
                                    ) : book.cover_url ? (
                                        <a href={`https://openlibrary.org/search?q=${book.isbn || book.title}`} target="_blank" rel="noopener noreferrer">
                                            <img src={book.cover_url} onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/50x70/E0E0E0/505050?text=No+Cover'; }} className="w-12 h-16 object-cover rounded shadow-md" alt="Cover" />
                                        </a>
                                    ) : (
                                        <span className="text-xs text-slate-500 bg-slate-800 p-2 rounded-full">No View</span>
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
