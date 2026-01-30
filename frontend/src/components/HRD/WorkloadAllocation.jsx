// WorkloadAllocation.jsx - Assign Trainers to Sections
import React, { useState, useEffect } from 'react';
import { UserPlus, Save, Loader2, CheckCircle, Search } from 'lucide-react';
import { api } from '../../api';

const WorkloadAllocation = ({ token }) => {
    const [trainers, setTrainers] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [degrees, setDegrees] = useState([]);
    const [loading, setLoading] = useState(true);

    const [allocations, setAllocations] = useState([]); // List of existing allocations

    // Form
    const [selectedTrainer, setSelectedTrainer] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [degree, setDegree] = useState('B.Tech');
    const [semester, setSemester] = useState('1');
    const [section, setSection] = useState('A');

    useEffect(() => {
        fetchResources();
    }, []);

    const fetchResources = async () => {
        try {
            const [tRes, sRes, degRes] = await Promise.all([
                api.get('/hrd/chro/trainers', { headers: { Authorization: `Bearer ${token}` } }),
                api.get('/hrd/chro/subjects', { headers: { Authorization: `Bearer ${token}` } }),
                api.get('/admin/degrees') // Public endpoint
            ]);

            if (tRes.data.success) setTrainers(tRes.data.trainers);
            if (sRes.data.success) setSubjects(sRes.data.subjects);
            if (degRes.data.degrees) setDegrees(degRes.data.degrees);

            // TODO: Fetch existing allocations if endpoint exists
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAllocate = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                trainer_id: parseInt(selectedTrainer),
                hrd_subject_id: parseInt(selectedSubject),
                degree: degree,
                semester: parseInt(semester),
                section: section
            };

            const res = await api.post('/hrd/chro/allocate', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.success) {
                alert('Workload assigned successfully');
                // Could refresh list here
            }
        } catch (error) {
            alert(error.response?.data?.message || 'Allocation failed');
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-2xl font-bold text-white">Workload Allocation</h2>
                <p className="text-slate-400">Assign subjects and sections to trainers.</p>
            </div>

            <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
                <form onSubmit={handleAllocate} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                    <div className="space-y-1">
                        <label className="text-xs text-slate-400">Select Trainer</label>
                        <select
                            required
                            className="w-full bg-slate-900 border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={selectedTrainer}
                            onChange={e => setSelectedTrainer(e.target.value)}
                        >
                            <option value="">-- Choose Trainer --</option>
                            {trainers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs text-slate-400">Select Subject</label>
                        <select
                            required
                            className="w-full bg-slate-900 border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={selectedSubject}
                            onChange={e => setSelectedSubject(e.target.value)}
                        >
                            <option value="">-- Choose Subject --</option>
                            {subjects.map(s => <option key={s.id} value={s.id}>{s.name} (Sem {s.semester})</option>)}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs text-slate-400">Degree</label>
                        <select
                            className="w-full bg-slate-900 border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={degree}
                            onChange={e => setDegree(e.target.value)}
                        >
                            {degrees.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs text-slate-400">Semester</label>
                        <select
                            className="w-full bg-slate-900 border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={semester}
                            onChange={e => setSemester(e.target.value)}
                        >
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs text-slate-400">Section</label>
                        <select
                            className="w-full bg-slate-900 border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={section}
                            onChange={e => setSection(e.target.value)}
                        >
                            {['A', 'B', 'C', 'D', 'E'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    <div className="flex items-end">
                        <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-lg shadow-indigo-500/20">
                            Assign Workload
                        </button>
                    </div>
                </form>
            </div>

            {/* Could list existing allocations here if API supports list */}
        </div>
    );
};

export default WorkloadAllocation;
