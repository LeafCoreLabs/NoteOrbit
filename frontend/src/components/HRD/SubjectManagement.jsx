// SubjectManagement.jsx - HRD Subject/Curriculum Management
import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Loader2, Trash2 } from 'lucide-react';
import { api } from '../../api';

const SubjectManagement = ({ token }) => {
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [newSubject, setNewSubject] = useState({ name: '', semester: 1 });
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchSubjects(); }, []);

    const fetchSubjects = async () => {
        try {
            const res = await api.get('/hrd/chro/subjects', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setSubjects(res.data.subjects || []);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const createSubject = async () => {
        setSaving(true);
        try {
            const res = await api.post('/hrd/chro/subjects', newSubject, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                fetchSubjects();
                setShowForm(false);
                setNewSubject({ name: '', semester: 1 });
            }
        } catch (e) { console.error(e); }
        finally { setSaving(false); }
    };

    if (loading) return <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-purple-400" /></div>;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <BookOpen className="w-6 h-6 text-purple-400" /> HRD Subjects
                </h2>
                <button
                    onClick={() => setShowForm(true)}
                    className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-xl border border-purple-500/30 hover:bg-purple-500/30 transition flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Add Subject
                </button>
            </div>

            {showForm && (
                <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4">New Subject</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm text-slate-400 mb-2 block">Subject Name</label>
                            <input
                                value={newSubject.name}
                                onChange={e => setNewSubject(p => ({ ...p, name: e.target.value }))}
                                placeholder="e.g. Life Skills"
                                className="w-full bg-slate-800/50 border border-white/10 rounded-xl p-3 text-white"
                            />
                        </div>
                        <div>
                            <label className="text-sm text-slate-400 mb-2 block">Semester</label>
                            <select
                                value={newSubject.semester}
                                onChange={e => setNewSubject(p => ({ ...p, semester: parseInt(e.target.value) }))}
                                className="w-full bg-slate-800/50 border border-white/10 rounded-xl p-3 text-white"
                            >
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-3 mt-4">
                        <button
                            onClick={createSubject}
                            disabled={!newSubject.name || saving}
                            className="px-6 py-2 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="animate-spin w-4 h-4" /> : 'Create'}
                        </button>
                        <button onClick={() => setShowForm(false)} className="px-6 py-2 text-slate-400 hover:text-white">Cancel</button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subjects.map(sub => (
                    <div key={sub.id} className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
                        <div className="flex items-start justify-between">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center mb-3">
                                <BookOpen className="w-5 h-5 text-purple-400" />
                            </div>
                        </div>
                        <h3 className="text-white font-bold">{sub.name}</h3>
                        <p className="text-slate-400 text-sm">Semester {sub.semester}</p>
                    </div>
                ))}
            </div>

            {subjects.length === 0 && !showForm && (
                <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-12 text-center">
                    <BookOpen className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-400">No subjects configured. Add one to get started.</p>
                </div>
            )}
        </div>
    );
};

export default SubjectManagement;
