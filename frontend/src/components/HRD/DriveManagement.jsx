// DriveManagement.jsx - Full Placement Drive Management
import React, { useState, useEffect } from 'react';
import {
    Briefcase, Plus, Edit, Eye, Calendar, MapPin, DollarSign, Users,
    Search, X, Save, Loader2, Filter, CheckCircle, XCircle, Tag
} from 'lucide-react';
import axios from 'axios';

const DriveManagement = ({ token }) => {
    const [drives, setDrives] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [selectedDrive, setSelectedDrive] = useState(null);
    const [applicants, setApplicants] = useState([]);
    const [formData, setFormData] = useState({
        company_id: '',
        title: '',
        role: '',
        description: '',
        ctc_min: '',
        ctc_max: '',
        location: '',
        drive_type: 'on_campus',
        eligibility_criteria: {
            cgpa_min: '',
            branches: [],
            max_backlogs: '',
            year: 4
        },
        application_start: '',
        application_end: ''
    });

    useEffect(() => {
        fetchDrives();
        fetchCompanies();
    }, []);

    const fetchDrives = async () => {
        try {
            const response = await axios.get('/hrd/drives', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDrives(response.data.drives || []);
        } catch (error) {
            console.error('Failed to fetch drives:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCompanies = async () => {
        try {
            const response = await axios.get('/hrd/companies', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCompanies(response.data.companies || []);
        } catch (error) {
            console.error('Failed to fetch companies:', error);
        }
    };

    const fetchDriveDetails = async (driveId) => {
        try {
            const response = await axios.get(`/hrd/drives/${driveId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSelectedDrive(response.data.drive);
            setApplicants(response.data.applicants || []);
            setShowDetails(true);
        } catch (error) {
            console.error('Failed to fetch drive details:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await axios.post('/hrd/drives', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchDrives();
            handleCloseModal();
        } catch (error) {
            console.error('Failed to create drive:', error);
            alert('Failed to create drive');
        } finally {
            setLoading(false);
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setFormData({
            company_id: '',
            title: '',
            role: '',
            description: '',
            ctc_min: '',
            ctc_max: '',
            location: '',
            drive_type: 'on_campus',
            eligibility_criteria: {
                cgpa_min: '',
                branches: [],
                max_backlogs: '',
                year: 4
            },
            application_start: '',
            application_end: ''
        });
    };

    const StatusBadge = ({ status }) => {
        const colors = {
            open: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
            closed: 'bg-red-500/20 text-red-400 border-red-500/30',
            completed: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
        };
        return (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${colors[status] || colors.open}`}>
                {status?.toUpperCase()}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Placement Drives</h1>
                    <p className="text-slate-400">Manage placement drives and track applications</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-emerald-500/30 transition-all flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    <span>Create Drive</span>
                </button>
            </div>

            {/* Drives List */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
                </div>
            ) : drives.length === 0 ? (
                <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-12 text-center">
                    <Briefcase className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400 mb-4">No drives created yet</p>
                    <button
                        onClick={() => setShowModal(true)}
                        className="text-emerald-400 hover:text-emerald-300 font-semibold"
                    >
                        Create your first drive
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {drives.map((drive) => (
                        <div
                            key={drive.id}
                            className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all group"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="text-white font-bold text-lg mb-1">{drive.title}</h3>
                                    <p className="text-emerald-400 text-sm">{drive.company_name}</p>
                                </div>
                                <StatusBadge status={drive.status} />
                            </div>

                            <div className="space-y-2 mb-4">
                                <div className="flex items-center gap-2 text-sm text-slate-300">
                                    <Briefcase className="w-4 h-4" />
                                    <span>{drive.role}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-300">
                                    <DollarSign className="w-4 h-4" />
                                    <span>{drive.ctc_min} - {drive.ctc_max} LPA</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-300">
                                    <MapPin className="w-4 h-4" />
                                    <span>{drive.location || 'Multiple Locations'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-300">
                                    <Users className="w-4 h-4" />
                                    <span>{drive.applicant_count || 0} Applicants</span>
                                </div>
                            </div>

                            <button
                                onClick={() => fetchDriveDetails(drive.id)}
                                className="w-full bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-xl font-semibold hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-2"
                            >
                                <Eye className="w-4 h-4" />
                                <span>View Details</span>
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Drive Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl p-8 w-full max-w-3xl my-8">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-white">Create Placement Drive</h2>
                            <button onClick={handleCloseModal} className="text-slate-400 hover:text-white">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-slate-300 mb-2 font-medium">Company *</label>
                                    <select
                                        value={formData.company_id}
                                        onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                                        required
                                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none"
                                    >
                                        <option value="">Select Company</option>
                                        {companies.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-slate-300 mb-2 font-medium">Role *</label>
                                    <input
                                        type="text"
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        required
                                        placeholder="e.g., Software Engineer"
                                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-slate-300 mb-2 font-medium">Drive Title *</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    required
                                    placeholder="e.g., Campus Recruitment 2024"
                                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-slate-300 mb-2 font-medium">Min CTC (LPA) *</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={formData.ctc_min}
                                        onChange={(e) => setFormData({ ...formData, ctc_min: e.target.value })}
                                        required
                                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-300 mb-2 font-medium">Max CTC (LPA) *</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={formData.ctc_max}
                                        onChange={(e) => setFormData({ ...formData, ctc_max: e.target.value })}
                                        required
                                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="flex-1 bg-slate-800 text-white px-6 py-3 rounded-xl font-semibold hover:bg-slate-700 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    <span>Create Drive</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Drive Details Modal */}
            {showDetails && selectedDrive && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl p-8 w-full max-w-4xl my-8">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-white">{selectedDrive.title}</h2>
                            <button onClick={() => setShowDetails(false)} className="text-slate-400 hover:text-white">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="mb-6">
                            <h3 className="text-lg font-semibold text-white mb-4">Applicants ({applicants.length})</h3>
                            {applicants.length === 0 ? (
                                <p className="text-slate-400 text-center py-8">No applicants yet</p>
                            ) : (
                                <div className="space-y-3">
                                    {applicants.map((app) => (
                                        <div key={app.id} className="bg-slate-800/50 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                                            <div>
                                                <p className="text-white font-semibold">{app.student_name}</p>
                                                <p className="text-slate-400 text-sm">{app.student_email}</p>
                                            </div>
                                            <StatusBadge status={app.status} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DriveManagement;
