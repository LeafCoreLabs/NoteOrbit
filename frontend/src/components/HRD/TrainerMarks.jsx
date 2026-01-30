// TrainerMarks.jsx - Enter Marks for HRD Subjects
import React, { useState, useEffect } from 'react';
import { ClipboardCheck, Save, Loader2, Search } from 'lucide-react';
import { api } from '../../api';

const TrainerMarks = ({ token, allocation }) => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [marksMap, setMarksMap] = useState({}); // { student_id: marks }
    const [maxMarks, setMaxMarks] = useState(100);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (allocation) fetchStudentsAndMarks();
    }, [allocation]);

    const fetchStudentsAndMarks = async () => {
        if (!allocation) return;
        setLoading(true);
        try {
            // Fetch students + existing marks
            const response = await api.get(`/hrd/students?allocation_id=${allocation.id}&include_marks=true`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success) {
                const studs = response.data.students || [];
                setStudents(studs);

                // Initialize map with existing marks or empty
                const initialMarks = {};
                studs.forEach(s => {
                    if (s.marks !== undefined && s.marks !== null) {
                        initialMarks[s.id] = s.marks;
                    }
                });
                setMarksMap(initialMarks);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkChange = (studentId, value) => {
        // Validate input (0 to maxMarks)
        if (value > maxMarks) return;
        if (value < 0) return;

        setMarksMap(prev => ({
            ...prev,
            [studentId]: value
        }));
    };

    const handleSubmit = async () => {
        try {
            const marksData = Object.entries(marksMap).map(([sid, mark]) => ({
                student_id: sid,
                marks: parseInt(mark)
            }));

            const payload = {
                allocation_id: allocation.id,
                marks_data: marksData,
                max_marks: maxMarks
            };

            const res = await api.post('/hrd/trainer/marks', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.success) {
                alert('Marks updated successfully!');
            }
        } catch (error) {
            alert('Failed to update marks');
        }
    };

    if (!allocation) return (
        <div className="flex flex-col items-center justify-center p-12 text-slate-400">
            <ClipboardCheck className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg">Please select a class from "My Classes" first.</p>
        </div>
    );

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.usn?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white">Enter Marks</h2>
                    <p className="text-slate-400">{allocation.subject_name} ({allocation.section})</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-slate-900 border border-white/10 rounded-lg px-3 py-2">
                        <span className="text-xs text-slate-400 uppercase font-bold">Max Marks:</span>
                        <input
                            type="number"
                            value={maxMarks}
                            onChange={e => setMaxMarks(e.target.value)}
                            className="w-16 bg-transparent text-white outline-none font-mono font-bold text-right"
                        />
                    </div>
                    <button
                        onClick={handleSubmit}
                        className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                    >
                        <Save className="w-4 h-4" /> Save All
                    </button>
                </div>
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
                    <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-emerald-400" /></div>
                ) : (
                    <div className="max-h-[500px] overflow-y-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-900/80 text-slate-400 text-sm uppercase font-semibold sticky top-0 backdrop-blur-md">
                                <tr>
                                    <th className="p-4">Student</th>
                                    <th className="p-4">USN</th>
                                    <th className="p-4 w-32 text-center">Marks Obtained</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredStudents.map(s => (
                                    <tr key={s.id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4 font-medium text-white">{s.name}</td>
                                        <td className="p-4 text-slate-300 font-mono text-xs">{s.usn}</td>
                                        <td className="p-4 text-center">
                                            <input
                                                type="number"
                                                min="0"
                                                max={maxMarks}
                                                value={marksMap[s.id] || ''}
                                                onChange={e => handleMarkChange(s.id, e.target.value)}
                                                placeholder="-"
                                                className="w-20 bg-slate-800 border border-white/10 rounded-lg px-2 py-1 text-center text-white focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TrainerMarks;
