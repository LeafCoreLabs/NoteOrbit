// OfferManagement.jsx - Create and manage placement offers
import React, { useState, useEffect } from 'react';
import {
    FileText, Plus, IndianRupee, MapPin, Calendar, User,
    CheckCircle, XCircle, Clock, Loader2, Eye, X
} from 'lucide-react';
import { api } from '../../api';

const OfferManagement = ({ token }) => {
    const [offers, setOffers] = useState([]);
    const [drives, setDrives] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [filterStatus, setFilterStatus] = useState('all');
    const [formData, setFormData] = useState({
        drive_id: '',
        student_id: '',
        role: '',
        ctc: '',
        location: '',
        joining_date: ''
    });

    useEffect(() => {
        fetchOffers();
        fetchDrives();
    }, []);

    const fetchOffers = async () => {
        try {
            const response = await api.get('/hrd/offers', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOffers(response.data.offers || []);
        } catch (error) {
            console.error('Failed to fetch offers:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDrives = async () => {
        try {
            const response = await api.get('/hrd/drives', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDrives(response.data.drives || []);
        } catch (error) {
            console.error('Failed to fetch drives:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await api.post('/hrd/offers', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchOffers();
            handleCloseModal();
            alert('Offer created and student notified via email!');
        } catch (error) {
            console.error('Failed to create offer:', error);
            alert('Failed to create offer');
        } finally {
            setLoading(false);
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setFormData({
            drive_id: '',
            student_id: '',
            role: '',
            ctc: '',
            location: '',
            joining_date: ''
        });
    };

    const StatusBadge = ({ status }) => {
        const config = {
            pending: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Clock },
            accepted: { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle },
            rejected: { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle }
        };
        const { color, icon: Icon } = config[status] || config.pending;

        return (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${color} flex items-center gap-1`}>
                <Icon className="w-3 h-3" />
                {status?.toUpperCase()}
            </span>
        );
    };

    const filteredOffers = offers.filter(offer =>
        filterStatus === 'all' || offer.status === filterStatus
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Offer Management</h1>
                    <p className="text-slate-400">Create and track placement offers</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/30 transition-all flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    <span>Create Offer</span>
                </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {['all', 'pending', 'accepted', 'rejected'].map((status) => (
                    <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition-all ${filterStatus === status
                            ? 'bg-purple-500 text-white'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                    >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                        {status !== 'all' && (
                            <span className="ml-2 px-2 py-0.5 bg-white/10 rounded-full">
                                {offers.filter(o => o.status === status).length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Offers Grid/List */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
                </div>
            ) : filteredOffers.length === 0 ? (
                <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-12 text-center">
                    <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400 mb-4">No offers found</p>
                    {filterStatus === 'all' && (
                        <button
                            onClick={() => setShowModal(true)}
                            className="text-purple-400 hover:text-purple-300 font-semibold"
                        >
                            Create your first offer
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredOffers.map((offer) => (
                        <div
                            key={offer.id}
                            className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all"
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <h3 className="text-white font-bold text-lg">{offer.student_name}</h3>
                                            <p className="text-slate-400 text-sm">{offer.student_email}</p>
                                        </div>
                                        <StatusBadge status={offer.status} />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                                        <div className="flex items-center gap-2 text-sm">
                                            <FileText className="w-4 h-4 text-purple-400" />
                                            <span className="text-slate-300">{offer.role}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <IndianRupee className="w-4 h-4 text-emerald-400" />
                                            <span className="text-slate-300">{offer.ctc} LPA</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <MapPin className="w-4 h-4 text-blue-400" />
                                            <span className="text-slate-300">{offer.location || 'TBD'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Offer Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl p-8 w-full max-w-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-white">Create Placement Offer</h2>
                            <button onClick={handleCloseModal} className="text-slate-400 hover:text-white">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-slate-300 mb-2 font-medium">Placement Drive *</label>
                                <select
                                    value={formData.drive_id}
                                    onChange={(e) => setFormData({ ...formData, drive_id: e.target.value })}
                                    required
                                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500/50 outline-none"
                                >
                                    <option value="">Select Drive</option>
                                    {drives.map(d => (
                                        <option key={d.id} value={d.id}>{d.title} - {d.company_name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-slate-300 mb-2 font-medium">Role *</label>
                                    <input
                                        type="text"
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        required
                                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500/50 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-300 mb-2 font-medium">CTC (LPA) *</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={formData.ctc}
                                        onChange={(e) => setFormData({ ...formData, ctc: e.target.value })}
                                        required
                                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500/50 outline-none"
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
                                    className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
                                    <span>Create & Send</span>
                                </button>
                            </div>
                        </form>

                        <p className="text-xs text-slate-500 mt-4 text-center">
                            Student will be automatically notified via email
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OfferManagement;
