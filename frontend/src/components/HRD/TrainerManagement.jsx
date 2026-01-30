// TrainerManagement.jsx - Admin for Onboarding Trainers
import React, { useState, useEffect } from 'react';
import { UserPlus, Trash2, Mail, Lock, User, Save, Loader2, CheckCircle, Search } from 'lucide-react';
import { api } from '../../api';

const TrainerManagement = ({ token }) => {
    const [trainers, setTrainers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        phone: '',
        employee_id: ''
    });

    useEffect(() => {
        fetchTrainers();
    }, []);

    const fetchTrainers = async () => {
        try {
            const response = await api.get('/hrd/chro/trainers', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success) {
                setTrainers(response.data.trainers);
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
            const res = await api.post('/hrd/chro/trainers', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                alert('Trainer added successfully');
                setShowForm(false);
                setFormData({ name: '', email: '', password: '', phone: '', employee_id: '' });
                fetchTrainers();
            }
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to create trainer');
        }
    };

    const handleDelete = async (trainerId) => {
        if (!confirm('Are you sure you want to deactivate this trainer?')) return;
        try {
            await api.delete(`/hrd/chro/trainers/${trainerId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchTrainers();
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white">Trainer Management</h2>
                    <p className="text-slate-400">Onboard and manage training faculty.</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all font-semibold shadow-lg shadow-indigo-500/20"
                >
                    <UserPlus className="w-5 h-5" />
                    {showForm ? 'Cancel' : 'Add Trainer'}
                </button>
            </div>

            {showForm && (
                <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6 animate-in fade-in z-10 relative">
                    <h3 className="text-lg font-bold text-white mb-4">New Trainer Details</h3>
                    <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs text-slate-400">Full Name</label>
                            <input
                                required
                                className="w-full bg-slate-900 border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Prof. Alan Turing"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-slate-400">Email Address</label>
                            <input
                                required type="email"
                                className="w-full bg-slate-900 border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                placeholder="trainer@college.edu"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-slate-400">Password</label>
                            <input
                                required type="password"
                                className="w-full bg-slate-900 border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                placeholder="******"
                            />
                        </div>
                        <div className="col-span-1 md:col-span-2 text-right">
                            <button type="submit" className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center gap-2 ml-auto">
                                <Save className="w-4 h-4" /> Save Trainer
                            </button>
                        </div>
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
                                <th className="p-4">Name</th>
                                <th className="p-4">Email</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {trainers.map(t => (
                                <tr key={t.id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-4 font-medium text-white flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
                                            {t.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        {t.name}
                                    </td>
                                    <td className="p-4 text-slate-300">{t.email}</td>
                                    <td className="p-4">
                                        <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded border border-emerald-500/20">Active</span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <button
                                            onClick={() => handleDelete(t.id)}
                                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {trainers.length === 0 && <div className="p-8 text-center text-slate-500">No trainers found.</div>}
                </div>
            )}
        </div>
    );
};

export default TrainerManagement;
