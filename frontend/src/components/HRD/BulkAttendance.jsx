// BulkAttendance.jsx - Batch Attendance Marking for Trainers
import React, { useState, useEffect } from 'react';
import { ClipboardList, Check, X, Loader2, Save } from 'lucide-react';
import { api } from '../../api';

const BulkAttendance = ({ token, classes }) => {
    const [selectedClass, setSelectedClass] = useState(null);
    const [students, setStudents] = useState([]);
    const [attendance, setAttendance] = useState({});
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (selectedClass) fetchStudents();
    }, [selectedClass]);

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/hrd/students?allocation_id=${selectedClass.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                const sList = res.data.students || [];
                setStudents(sList);
                // Initialize all as Absent
                const init = {};
                sList.forEach(s => init[s.id] = 'Absent');
                setAttendance(init);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const toggleAttendance = (studentId) => {
        setAttendance(prev => ({
            ...prev,
            [studentId]: prev[studentId] === 'Present' ? 'Absent' : 'Present'
        }));
    };

    const markAllPresent = () => {
        const all = {};
        students.forEach(s => all[s.id] = 'Present');
        setAttendance(all);
    };

    const saveAttendance = async () => {
        setSaving(true);
        try {
            const payload = {
                hrd_subject_id: selectedClass.subject_id,
                date: date,
                attendance: Object.entries(attendance).map(([id, status]) => ({
                    student_id: parseInt(id),
                    status: status
                }))
            };
            await api.post('/hrd/trainer/attendance', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (e) { console.error(e); }
        finally { setSaving(false); }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <ClipboardList className="w-6 h-6 text-indigo-400" /> Bulk Attendance
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Class Selection */}
                <div>
                    <label className="text-sm text-slate-400 mb-2 block">Select Class</label>
                    <select
                        value={selectedClass?.id || ''}
                        onChange={e => setSelectedClass(classes.find(c => c.id === parseInt(e.target.value)))}
                        className="w-full bg-slate-800/50 border border-white/10 rounded-xl p-3 text-white"
                    >
                        <option value="">Choose...</option>
                        {classes.map(c => (
                            <option key={c.id} value={c.id}>{c.subject_name} - Sec {c.section}</option>
                        ))}
                    </select>
                </div>

                {/* Date */}
                <div>
                    <label className="text-sm text-slate-400 mb-2 block">Date</label>
                    <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="w-full bg-slate-800/50 border border-white/10 rounded-xl p-3 text-white"
                    />
                </div>

                {/* Mark All Present */}
                {selectedClass && (
                    <div className="flex items-end">
                        <button
                            onClick={markAllPresent}
                            className="px-4 py-3 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30 hover:bg-emerald-500/30 transition"
                        >
                            ✓ Mark All Present
                        </button>
                    </div>
                )}
            </div>

            {/* Student List */}
            {loading ? (
                <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-indigo-400" /></div>
            ) : selectedClass && students.length > 0 ? (
                <div className="bg-slate-900/40 border border-white/10 rounded-2xl overflow-hidden">
                    <div className="max-h-[500px] overflow-y-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-900/80 text-slate-400 text-sm uppercase font-semibold sticky top-0">
                                <tr>
                                    <th className="p-4">Student</th>
                                    <th className="p-4">USN</th>
                                    <th className="p-4 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {students.map(s => (
                                    <tr key={s.id} className="hover:bg-white/5">
                                        <td className="p-4 text-white font-medium">{s.name}</td>
                                        <td className="p-4 text-slate-400 font-mono text-xs">{s.srn}</td>
                                        <td className="p-4 text-center">
                                            <button
                                                onClick={() => toggleAttendance(s.id)}
                                                className={`w-10 h-10 rounded-full flex items-center justify-center transition ${attendance[s.id] === 'Present'
                                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                                    }`}
                                            >
                                                {attendance[s.id] === 'Present' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="p-4 border-t border-white/10">
                        <button
                            onClick={saveAttendance}
                            disabled={saving}
                            className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium rounded-xl flex items-center gap-2 hover:opacity-90 transition disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                            Save Attendance
                        </button>
                    </div>
                </div>
            ) : selectedClass ? (
                <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-12 text-center">
                    <p className="text-slate-400">No students found for this class.</p>
                </div>
            ) : null}
        </div>
    );
};

export default BulkAttendance;
