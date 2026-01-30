// MyApplications.jsx - Student Application History
import React, { useState, useEffect } from 'react';
import { FileText, Building2, Calendar, CheckCircle, Clock, XCircle, Loader2 } from 'lucide-react';
import { api } from '../../api';

const MyApplications = ({ token }) => {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchApplications();
    }, []);

    const fetchApplications = async () => {
        try {
            // Using /student/placement/applications or /hrd/student/applications
            // Assuming this endpoint exists based on the plan
            const response = await api.get('/student/placement/applications', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success) {
                setApplications(response.data.applications || []);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'accepted': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            case 'rejected': return 'text-red-400 bg-red-500/10 border-red-500/20';
            case 'interview': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
            case 'offer': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
            default: return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
        }
    };

    if (loading) return <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-cyan-400" /></div>;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-2xl font-bold text-white">Application History</h2>
                <p className="text-slate-400">Track the status of your job applications.</p>
            </div>

            <div className="bg-slate-900/40 border border-white/10 rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-900/80 text-slate-400 text-sm uppercase font-semibold">
                        <tr>
                            <th className="p-4">Company</th>
                            <th className="p-4">Role</th>
                            <th className="p-4">Applied Date</th>
                            <th className="p-4">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {applications.map(app => (
                            <tr key={app.id} className="hover:bg-white/5 transition-colors">
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                                            <Building2 className="w-5 h-5" />
                                        </div>
                                        <div className="font-medium text-white">{app.company_name}</div>
                                    </div>
                                </td>
                                <td className="p-4 text-slate-300">{app.drive_title}</td>
                                <td className="p-4 text-slate-400 text-sm flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    {new Date(app.applied_at).toLocaleDateString()}
                                </td>
                                <td className="p-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1 w-fit ${getStatusColor(app.status)}`}>
                                        {app.status === 'Applied' && <Clock className="w-3 h-3" />}
                                        {app.status === 'Accepted' && <CheckCircle className="w-3 h-3" />}
                                        {app.status === 'Rejected' && <XCircle className="w-3 h-3" />}
                                        {app.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {applications.length === 0 && (
                    <div className="p-12 text-center text-slate-500">
                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No applications yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyApplications;
