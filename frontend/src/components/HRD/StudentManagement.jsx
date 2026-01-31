// StudentManagement.jsx - View Students (Shared for CHRO/Trainer)
import React, { useState, useEffect } from 'react';
import { Users, Search, Loader2, Filter, X } from 'lucide-react';
import { api } from '../../api';
import NeuralStudentProfile from './NeuralStudentProfile';

const StudentManagement = ({ token, allocation, catalogs }) => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState(null);

    // Filter State
    const [filterDegree, setFilterDegree] = useState('');
    const [filterSemester, setFilterSemester] = useState('');
    const [filterSection, setFilterSection] = useState('');
    const [availableSections, setAvailableSections] = useState([]);

    // Get degrees from catalogs or use default
    const degrees = catalogs?.degrees || [];

    useEffect(() => {
        fetchStudents();
    }, [allocation]);

    // Fetch sections when degree or semester changes
    useEffect(() => {
        if (filterDegree && filterSemester && catalogs?.fetchSections) {
            catalogs.fetchSections(filterDegree, parseInt(filterSemester)).then(secs => {
                setAvailableSections(secs || []);
                if (filterSection && !secs?.includes(filterSection)) {
                    setFilterSection(''); // Reset if previous selection is invalid
                }
            });
        } else {
            setAvailableSections([]);
            setFilterSection('');
        }
    }, [filterDegree, filterSemester, catalogs]);

    const fetchStudents = async () => {
        setLoading(true);
        try {
            let url = '/hrd/students';
            if (allocation) {
                url += `?allocation_id=${allocation.id}`;
            }
            const response = await api.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success) {
                setStudents(response.data.students || []);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const clearFilters = () => {
        setFilterDegree('');
        setFilterSemester('');
        setFilterSection('');
        setSearchQuery('');
    };

    const hasActiveFilters = filterDegree || filterSemester || filterSection || searchQuery;

    // Only show students if at least one filter is active (for CHRO view)
    const filteredStudents = hasActiveFilters ? students.filter(s => {
        const matchesSearch = !searchQuery ||
            s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.srn?.toLowerCase().includes(searchQuery.toLowerCase());
        // Case-insensitive degree matching
        const matchesDegree = !filterDegree || s.degree?.toLowerCase() === filterDegree.toLowerCase();
        const matchesSemester = !filterSemester || String(s.semester) === filterSemester;
        const matchesSection = !filterSection || s.section === filterSection;
        return matchesSearch && matchesDegree && matchesSemester && matchesSection;
    }) : [];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Users className="w-6 h-6 text-indigo-400" /> Student Directory
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">
                        {allocation
                            ? `Students in ${allocation.subject_name} (Section ${allocation.section})`
                            : `Showing ${filteredStudents.length} of ${students.length} students`
                        }
                    </p>
                </div>
                {hasActiveFilters && (
                    <button
                        onClick={clearFilters}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl hover:bg-amber-500/20 transition-colors self-start md:self-center"
                    >
                        <X className="w-4 h-4" /> Clear Filters
                    </button>
                )}
            </div>

            {/* Filter Bar - Only for CHRO (when no allocation prop) */}
            {!allocation && (
                <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-4 text-slate-400">
                        <Filter className="w-4 h-4" />
                        <span className="text-sm font-medium">Filter Students</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="text-xs text-slate-500 mb-1 block">Degree</label>
                            <select
                                value={filterDegree}
                                onChange={e => setFilterDegree(e.target.value)}
                                className="w-full bg-slate-800/50 border border-white/10 rounded-xl p-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">All Degrees</option>
                                {degrees.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 mb-1 block">Semester</label>
                            <select
                                value={filterSemester}
                                onChange={e => setFilterSemester(e.target.value)}
                                className="w-full bg-slate-800/50 border border-white/10 rounded-xl p-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">All Semesters</option>
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 mb-1 block">Section</label>
                            <select
                                value={filterSection}
                                onChange={e => setFilterSection(e.target.value)}
                                className="w-full bg-slate-800/50 border border-white/10 rounded-xl p-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                disabled={availableSections.length === 0}
                            >
                                <option value="">All Sections</option>
                                {availableSections.map(s => <option key={s} value={s}>Section {s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 mb-1 block">Search</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    placeholder="Name or SRN..."
                                    className="w-full bg-slate-800/50 border border-white/10 rounded-xl p-3 pl-10 text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Student Table */}
            <div className="bg-slate-900/40 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                {/* Search for Trainer View */}
                {allocation && (
                    <div className="p-4 border-b border-white/10 flex items-center gap-3">
                        <Search className="w-5 h-5 text-slate-500" />
                        <input
                            placeholder="Search student..."
                            className="bg-transparent border-none outline-none text-white w-full placeholder-slate-600"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                )}

                {loading ? (
                    <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-indigo-400" /></div>
                ) : (
                    <div className="max-h-[600px] overflow-y-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-900/80 text-slate-400 text-xs uppercase tracking-wider font-bold sticky top-0 backdrop-blur-md z-10">
                                <tr>
                                    <th className="p-4 border-b border-white/5">Student</th>
                                    <th className="p-4 border-b border-white/5">SRN</th>
                                    {!allocation && <th className="p-4 border-b border-white/5">Degree</th>}
                                    <th className="p-4 text-center border-b border-white/5">Sem</th>
                                    {!allocation && <th className="p-4 text-center border-b border-white/5">Sec</th>}
                                    <th className="p-4 text-right border-b border-white/5">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredStudents.map(s => (
                                    <tr key={s.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="p-4 font-medium text-white flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-lg">
                                                {s.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            {s.name}
                                        </td>
                                        <td className="p-4 text-slate-300 font-mono text-xs">{s.srn}</td>
                                        {!allocation && <td className="p-4 text-slate-400 text-sm">{s.degree}</td>}
                                        <td className="p-4 text-center">
                                            <span className="px-2 py-0.5 bg-slate-800 rounded text-xs text-slate-400 border border-white/5">{s.semester}</span>
                                        </td>
                                        {!allocation && <td className="p-4 text-center text-slate-400 text-sm">{s.section}</td>}
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={() => setSelectedStudentId(s.id)}
                                                className="px-3 py-1.5 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-lg text-xs font-semibold border border-indigo-500/20 transition-all opacity-80 group-hover:opacity-100"
                                            >
                                                Neural Profile
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredStudents.length === 0 && (
                            <div className="p-16 text-center">
                                {hasActiveFilters ? (
                                    <p className="text-slate-500 font-medium">No students match the current filters.</p>
                                ) : (
                                    <div className="space-y-2">
                                        <Filter className="w-10 h-10 mx-auto text-slate-600" />
                                        <p className="text-slate-400 font-medium">Use the filters above</p>
                                        <p className="text-slate-600 text-sm">Select a Degree, Semester, or Section to view students.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {selectedStudentId && (
                <NeuralStudentProfile
                    token={token}
                    studentId={selectedStudentId}
                    onClose={() => setSelectedStudentId(null)}
                />
            )}
        </div>
    );
};

export default StudentManagement;
