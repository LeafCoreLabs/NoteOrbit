// SubjectManagement.jsx - Admin for Managing HRD Curriculum
import React, { useState, useEffect } from 'react';
import { BookOpen, Trash2, Save, Loader2, Plus } from 'lucide-react';
import { api } from '../../api';

const SubjectManagement = ({ token }) => {
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [semester, setSemester] = useState('1');

    useEffect(() => {
        fetchSubjects();
    }, []);

    const fetchSubjects = async () => {
        try {
            const response = await api.get('/hrd/chro/subjects', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success) {
                setSubjects(response.data.subjects);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/hrd/chro/subjects', { name, semester: parseInt(semester) }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                alert('Subject created successfully');
                setShowForm(false);
                setName('');
                fetchSubjects();
            }
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to create subject');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure? This will remove allocations linked to this subject.')) return;
        try {
            await api.delete(`/hrd/chro/subjects/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchSubjects();
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white">Subject Management</h2>
                    <p className="text-slate-400">Define HRD curriculum subjects (e.g., Soft Skills).</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all font-semibold shadow-lg shadow-indigo-500/20"
                >
                    <Plus className="w-5 h-5" />
                    {showForm ? 'Cancel' : 'Add Subject'}
                </button>
            </div>

            {showForm && (
                <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6 animate-in fade-in z-10 relative">
                    <h3 className="text-lg font-bold text-white mb-4">New Subject Details</h3>
                    <form onSubmit={handleCreate} className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 space-y-1 w-full">
                            <label className="text-xs text-slate-400">Subject Name</label>
                            <input
                                required
                                className="w-full bg-slate-900 border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="e.g. Life Skills for Engineers I"
                            />
                        </div>
                        <div className="w-full md:w-32 space-y-1">
                            <label className="text-xs text-slate-400">Semester</label>
                            <select
                                className="w-full bg-slate-900 border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={semester}
                                onChange={e => setSemester(e.target.value)}
                            >
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Sem {s}</option>)}
                            </select>
                        </div>
                        <button type="submit" className="w-full md:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2">
                            <Save className="w-4 h-4" /> Save
                        </button>
                    </form>
                </div>
            )}

            {loading ? (
                <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-indigo-400" /></div>
            ) : (
                <div className="bg-slate-900/40 border border-white/10 rounded-2xl overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-900/80 text-slate-400 text-sm uppercase font-semibold">
                            <tr>
                                <th className="p-4">Subject Name</th>
                                <th className="p-4">Target Semester</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {subjects.map(s => (
                                <tr key={s.id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-4 font-medium text-white flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center">
                                            <BookOpen className="w-4 h-4" />
                                        </div>
                                        {s.name}
                                    </td>
                                    <td className="p-4 text-slate-300">Semester {s.semester}</td>
                                    <td className="p-4 text-right">
                                        <button
                                            onClick={() => handleDelete(s.id)}
                                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {subjects.length === 0 && <div className="p-8 text-center text-slate-500">No subjects found.</div>}
                </div>
            )}
        </div>
    );
};

export default SubjectManagement;
