// WorkloadAllocation.jsx - Trainer-Subject-Section Assignment
import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Loader2, Trash2 } from 'lucide-react';
import { api } from '../../api';

const WorkloadAllocation = ({ token }) => {
    const [allocations, setAllocations] = useState([]);
    const [trainers, setTrainers] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({
        trainer_id: '',
        hrd_subject_id: '',
        degree: 'B.Tech',
        semester: 5,
        section: 'A'
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const [allocRes, trainRes, subRes] = await Promise.all([
                api.get('/hrd/allocations', { headers: { Authorization: `Bearer ${token}` } }),
                api.get('/hrd/chro/trainers', { headers: { Authorization: `Bearer ${token}` } }),
                api.get('/hrd/chro/subjects', { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setAllocations(allocRes.data.allocations || []);
            setTrainers(trainRes.data.trainers || []);
            setSubjects(subRes.data.subjects || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const createAllocation = async () => {
        setSaving(true);
        try {
            await api.post('/hrd/chro/allocate', form, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchData();
            setShowForm(false);
        } catch (e) { console.error(e); }
        finally { setSaving(false); }
    };

    if (loading) return <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-purple-400" /></div>;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <MapPin className="w-6 h-6 text-purple-400" /> Workload Allocation
                </h2>
                <button
                    onClick={() => setShowForm(true)}
                    className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-xl border border-purple-500/30 hover:bg-purple-500/30 transition flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> New Allocation
                </button>
            </div>

            {showForm && (
                <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4">Assign Trainer</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm text-slate-400 mb-2 block">Trainer</label>
                            <select
                                value={form.trainer_id}
                                onChange={e => setForm(p => ({ ...p, trainer_id: e.target.value }))}
                                className="w-full bg-slate-800/50 border border-white/10 rounded-xl p-3 text-white"
                            >
                                <option value="">Select...</option>
                                {trainers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm text-slate-400 mb-2 block">Subject</label>
                            <select
                                value={form.hrd_subject_id}
                                onChange={e => setForm(p => ({ ...p, hrd_subject_id: e.target.value }))}
                                className="w-full bg-slate-800/50 border border-white/10 rounded-xl p-3 text-white"
                            >
                                <option value="">Select...</option>
                                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm text-slate-400 mb-2 block">Degree</label>
                            <select
                                value={form.degree}
                                onChange={e => setForm(p => ({ ...p, degree: e.target.value }))}
                                className="w-full bg-slate-800/50 border border-white/10 rounded-xl p-3 text-white"
                            >
                                <option value="B.Tech">B.Tech</option>
                                <option value="M.Tech">M.Tech</option>
                                <option value="MBA">MBA</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm text-slate-400 mb-2 block">Semester</label>
                            <select
                                value={form.semester}
                                onChange={e => setForm(p => ({ ...p, semester: parseInt(e.target.value) }))}
                                className="w-full bg-slate-800/50 border border-white/10 rounded-xl p-3 text-white"
                            >
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm text-slate-400 mb-2 block">Section</label>
                            <select
                                value={form.section}
                                onChange={e => setForm(p => ({ ...p, section: e.target.value }))}
                                className="w-full bg-slate-800/50 border border-white/10 rounded-xl p-3 text-white"
                            >
                                {['A', 'B', 'C', 'D', 'E', 'F'].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-3 mt-4">
                        <button
                            onClick={createAllocation}
                            disabled={!form.trainer_id || !form.hrd_subject_id || saving}
                            className="px-6 py-2 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="animate-spin w-4 h-4" /> : 'Assign'}
                        </button>
                        <button onClick={() => setShowForm(false)} className="px-6 py-2 text-slate-400 hover:text-white">Cancel</button>
                    </div>
                </div>
            )}

            <div className="bg-slate-900/40 border border-white/10 rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-900/80 text-slate-400 text-sm uppercase font-semibold">
                        <tr>
                            <th className="p-4">Trainer</th>
                            <th className="p-4">Subject</th>
                            <th className="p-4">Degree</th>
                            <th className="p-4 text-center">Semester</th>
                            <th className="p-4 text-center">Section</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {allocations.map(a => (
                            <tr key={a.id} className="hover:bg-white/5">
                                <td className="p-4 text-white font-medium">{a.trainer_name}</td>
                                <td className="p-4 text-slate-300">{a.subject_name}</td>
                                <td className="p-4 text-slate-400">{a.degree}</td>
                                <td className="p-4 text-center">{a.semester}</td>
                                <td className="p-4 text-center">{a.section}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {allocations.length === 0 && (
                    <div className="p-12 text-center text-slate-500">No allocations yet.</div>
                )}
            </div>
        </div>
    );
};

export default WorkloadAllocation;
