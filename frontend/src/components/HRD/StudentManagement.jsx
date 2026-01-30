// StudentManagement.jsx - View Students (Shared for CHRO/Trainer)
import React, { useState, useEffect } from 'react';
import { Users, Search, Loader2 } from 'lucide-react';
import { api } from '../../api';
import NeuralStudentProfile from './NeuralStudentProfile';

const StudentManagement = ({ token, allocation }) => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState(null);

    useEffect(() => {
        fetchStudents();
    }, [allocation]);

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

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.usn?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-2xl font-bold text-white">Student Directory</h2>
                <p className="text-slate-400">
                    {allocation
                        ? `Students in ${allocation.subject_name} (Section ${allocation.section})`
                        : "All Registered Students"
                    }
                </p>
            </div>

            <div className="bg-slate-900/40 border border-white/10 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-white/10 flex items-center gap-3">
                    <Search className="w-5 h-5 text-slate-500" />
                    <input
                        placeholder="Search student..."
                        className="bg-transparent border-none outline-none text-white w-full placeholder-slate-600"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>

                {loading ? (
                    <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-indigo-400" /></div>
                ) : (
                    <div className="max-h-[600px] overflow-y-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-900/80 text-slate-400 text-sm uppercase font-semibold sticky top-0 backdrop-blur-md">
                                <tr>
                                    <th className="p-4">Student</th>
                                    <th className="p-4">USN</th>
                                    <th className="p-4 text-center">Semester</th>
                                    {!allocation && <th className="p-4 text-center">Section</th>}
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredStudents.map(s => (
                                    <tr key={s.id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4 font-medium text-white flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                                                {s.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            {s.name}
                                        </td>
                                        <td className="p-4 text-slate-300 font-mono text-xs">{s.usn}</td>
                                        <td className="p-4 text-center">{s.semester}</td>
                                        {!allocation && <td className="p-4 text-center">{s.section}</td>}
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={() => setSelectedStudentId(s.id)}
                                                className="px-3 py-1 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-lg text-xs font-medium border border-indigo-500/20 transition-colors"
                                            >
                                                Neural Profile
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredStudents.length === 0 && <div className="p-8 text-center text-slate-500">No students found.</div>}
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
