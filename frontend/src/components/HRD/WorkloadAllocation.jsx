// WorkloadAllocation.jsx - Trainer-Subject-Section Assignment
import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Loader2, Trash2 } from 'lucide-react';
import { api } from '../../api';

const WorkloadAllocation = ({ token, catalogs }) => {
    const { degrees, fetchSections } = catalogs;
    const [allocations, setAllocations] = useState([]);
    const [trainers, setTrainers] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({
        trainer_id: '',
        hrd_subject_id: '',
        degree: '',
        semester: 1
    });
    const [availableSections, setAvailableSections] = useState([]);
    const [selectedSections, setSelectedSections] = useState([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchData();
        if (degrees && degrees.length > 0 && !form.degree) {
            setForm(p => ({ ...p, degree: degrees[0] }));
        }
    }, [degrees]);

    // Fetch sections when degree or semester changes
    useEffect(() => {
        if (form.degree && form.semester && fetchSections) {
            fetchSections(form.degree, form.semester).then(secs => {
                setAvailableSections(secs || []);
                setSelectedSections([]); // Reset on criteria change
            });
        }
    }, [form.degree, form.semester, fetchSections]);

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

    const toggleSection = (sec) => {
        setSelectedSections(prev =>
            prev.includes(sec) ? prev.filter(s => s !== sec) : [...prev, sec]
        );
    };

    const createAllocation = async () => {
        if (!form.degree || selectedSections.length === 0) {
            alert("Please ensure Degree and at least one Section are selected.");
            return;
        }
        setSaving(true);
        try {
            await api.post('/hrd/chro/allocate', { ...form, sections: selectedSections }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchData();
            setShowForm(false);
            setSelectedSections([]);
        } catch (e) { console.error(e); }
        finally { setSaving(false); }
    };

    const deleteAllocation = async (id) => {
        if (!window.confirm("Are you sure you want to remove this allocation?")) return;
        try {
            await api.delete(`/hrd/chro/deallocate/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchData();
        } catch (e) { console.error(e); }
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
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
                                className="w-full bg-slate-800/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                                {degrees.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm text-slate-400 mb-2 block">Semester</label>
                            <select
                                value={form.semester}
                                onChange={e => setForm(p => ({ ...p, semester: parseInt(e.target.value) }))}
                                className="w-full bg-slate-800/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="text-sm text-slate-400 mb-3 block">Select Sections</label>
                        {availableSections.length > 0 ? (
                            <div className="flex flex-wrap gap-3">
                                {availableSections.map(sec => (
                                    <button
                                        key={sec}
                                        onClick={() => toggleSection(sec)}
                                        className={`px-4 py-2 rounded-xl border transition-all ${selectedSections.includes(sec)
                                                ? 'bg-purple-500 text-white border-purple-500 shadow-lg shadow-purple-500/20'
                                                : 'bg-slate-800/50 border-white/10 text-slate-400 hover:border-white/20'
                                            }`}
                                    >
                                        Section {sec}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <p className="text-amber-400 text-sm">No sections found for the selected Degree/Semester.</p>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={createAllocation}
                            disabled={!form.trainer_id || !form.hrd_subject_id || selectedSections.length === 0 || saving}
                            className="px-6 py-2 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="animate-spin w-4 h-4" /> : 'Assign Capacity'}
                        </button>
                        <button onClick={() => setShowForm(false)} className="px-6 py-2 text-slate-400 hover:text-white">Cancel</button>
                    </div>
                </div>
            ) || null}

            <div className="bg-slate-900/40 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-900/80 text-slate-400 text-xs uppercase tracking-wider font-bold">
                        <tr>
                            <th className="p-4 border-b border-white/5">Trainer</th>
                            <th className="p-4 border-b border-white/5">Subject</th>
                            <th className="p-4 border-b border-white/5 text-center">Batch Details</th>
                            <th className="p-4 border-b border-white/5 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {allocations.map(a => (
                            <tr key={a.id} className="hover:bg-white/5 transition-colors group">
                                <td className="p-4">
                                    <div className="text-white font-semibold">{a.trainer_name}</div>
                                    <div className="text-[10px] text-slate-500 uppercase mt-0.5 tracking-tighter">Certified Professional</div>
                                </td>
                                <td className="p-4">
                                    <div className="text-slate-200">{a.subject_name}</div>
                                </td>
                                <td className="p-4 text-center">
                                    <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-400 border border-white/5">
                                        {a.degree} • Sem {a.semester} • Sec {a.section}
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    <button
                                        onClick={() => deleteAllocation(a.id)}
                                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {allocations.length === 0 && (
                    <div className="p-16 text-center text-slate-500 font-medium">No workload allocations found. Start by assigning a trainer.</div>
                )}
            </div>
        </div>
    );
};

export default WorkloadAllocation;
