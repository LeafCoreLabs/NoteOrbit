// TrainerAttendance.jsx - Mark Attendance for HRD Sessions
import React, { useState, useEffect } from 'react';
import { CalendarCheck, Save, Loader2, Check, X, Search } from 'lucide-react';
import { api } from '../../api';

const TrainerAttendance = ({ token, allocation }) => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
    const [statusMap, setStatusMap] = useState({}); // { student_id: 'Present' | 'Absent' }
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (allocation) fetchStudents();
    }, [allocation]);

    const fetchStudents = async () => {
        if (!allocation) return;
        setLoading(true);
        try {
            // Fetch students for this allocation (Subject + Section)
            // Backend should handle filtering by degree/sem/section from allocation_id or params
            const response = await api.get(`/hrd/students?allocation_id=${allocation.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success) {
                const studs = response.data.students || [];
                setStudents(studs);
                // Default all to Present
                const initialStatus = {};
                studs.forEach(s => initialStatus[s.id] = 'Present');
                setStatusMap(initialStatus);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = (studentId) => {
        setStatusMap(prev => ({
            ...prev,
            [studentId]: prev[studentId] === 'Present' ? 'Absent' : 'Present'
        }));
    };

    const handleSubmit = async () => {
        try {
            const attendanceData = Object.entries(statusMap).map(([sid, status]) => ({
                student_id: sid,
                status: status
            }));

            const payload = {
                allocation_id: allocation.id,
                date: attendanceDate,
                students: attendanceData
            };

            const res = await api.post('/hrd/trainer/attendance', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.success) {
                alert('Attendance submitted successfully!');
            }
        } catch (error) {
            alert('Failed to submit attendance');
        }
    };

    if (!allocation) return (
        <div className="flex flex-col items-center justify-center p-12 text-slate-400">
            <CalendarCheck className="w-16 h-16 mb-4 opacity-50" />
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
                    <h2 className="text-2xl font-bold text-white">Mark Attendance</h2>
                    <p className="text-slate-400">{allocation.subject_name} ({allocation.section})</p>
                </div>
                <div className="flex items-center gap-4">
                    <input
                        type="date"
                        value={attendanceDate}
                        onChange={e => setAttendanceDate(e.target.value)}
                        className="bg-slate-800 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                        onClick={handleSubmit}
                        className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                    >
                        <Save className="w-4 h-4" /> Submit
                    </button>
                </div>
            </div>

            <div className="bg-slate-900/40 border border-white/10 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-white/10 flex items-center gap-3">
                    <Search className="w-5 h-5 text-slate-500" />
                    <input
                        placeholder="Search student by name or USN..."
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
                                    <th className="p-4 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredStudents.map(s => {
                                    const isPresent = statusMap[s.id] === 'Present';
                                    return (
                                        <tr
                                            key={s.id}
                                            className={`hover:bg-white/5 transition-colors cursor-pointer ${isPresent ? '' : 'bg-red-500/5'}`}
                                            onClick={() => toggleStatus(s.id)}
                                        >
                                            <td className="p-4 font-medium text-white">{s.name}</td>
                                            <td className="p-4 text-slate-300 font-mono text-xs">{s.usn}</td>
                                            <td className="p-4 text-center">
                                                <button
                                                    className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${isPresent
                                                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                                            : 'bg-red-500/10 border-red-500/30 text-red-400'
                                                        }`}
                                                >
                                                    {isPresent ? 'Present' : 'Absent'}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TrainerAttendance;
