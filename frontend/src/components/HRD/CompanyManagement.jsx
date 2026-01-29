// CompanyManagement.jsx - CRUD for Company Management
import React, { useState, useEffect } from 'react';
import {
    Building2, Plus, Edit, Trash2, Eye, Search, X, Save, Loader2
} from 'lucide-react';
import axios from 'axios';

const CompanyManagement = ({ token }) => {
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingCompany, setEditingCompany] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        sector: '',
        website: '',
        hr_name: '',
        hr_email: '',
        hr_phone: ''
    });

    useEffect(() => {
        fetchCompanies();
    }, []);

    const fetchCompanies = async () => {
        try {
            const response = await axios.get('/hrd/companies', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCompanies(response.data.companies || []);
        } catch (error) {
            console.error('Failed to fetch companies:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (editingCompany) {
                await axios.put(`/hrd/companies/${editingCompany.id}`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post('/hrd/companies', formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            fetchCompanies();
            handleCloseModal();
        } catch (error) {
            console.error('Failed to save company:', error);
            alert('Failed to save company');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this company?')) return;

        try {
            await axios.delete(`/hrd/companies/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchCompanies();
        } catch (error) {
            console.error('Failed to delete company:', error);
        }
    };

    const handleEdit = (company) => {
        setEditingCompany(company);
        setFormData({
            name: company.name || '',
            sector: company.sector || '',
            website: company.website || '',
            hr_name: company.hr_name || '',
            hr_email: company.hr_email || '',
            hr_phone: company.hr_phone || ''
        });
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingCompany(null);
        setFormData({
            name: '',
            sector: '',
            website: '',
            hr_name: '',
            hr_email: '',
            hr_phone: ''
        });
    };

    const filteredCompanies = companies.filter(company =>
        company.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.sector?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Company Management</h1>
                    <p className="text-slate-400">Manage recruitment companies and contacts</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/30 transition-all flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    <span>Add Company</span>
                </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search companies..."
                    className="w-full bg-slate-900/60 backdrop-blur-xl text-white placeholder-slate-500 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition"
                />
            </div>

            {/* Companies Grid */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                </div>
            ) : filteredCompanies.length === 0 ? (
                <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-12 text-center">
                    <Building2 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400 mb-4">No companies found</p>
                    <button
                        onClick={() => setShowModal(true)}
                        className="text-indigo-400 hover:text-indigo-300 font-semibold"
                    >
                        Add your first company
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCompanies.map((company) => (
                        <div
                            key={company.id}
                            className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all group"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                                    <Building2 className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleEdit(company)}
                                        className="p-2 hover:bg-blue-500/10 rounded-lg transition-colors text-blue-400"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(company.id)}
                                        className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-red-400"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <h3 className="text-white font-bold text-lg mb-1">{company.name}</h3>
                            <p className="text-indigo-400 text-sm mb-4">{company.sector || 'Not specified'}</p>

                            {company.hr_name && (
                                <div className="space-y-2 text-sm">
                                    <div>
                                        <p className="text-slate-500">HR Contact</p>
                                        <p className="text-slate-300">{company.hr_name}</p>
                                    </div>
                                    {company.hr_email && (
                                        <div>
                                            <p className="text-slate-500">Email</p>
                                            <p className="text-slate-300 truncate">{company.hr_email}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-white">
                                {editingCompany ? 'Edit Company' : 'Add New Company'}
                            </h2>
                            <button
                                onClick={handleCloseModal}
                                className="text-slate-400 hover:text-white transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-slate-300 mb-2 font-medium">Company Name *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-slate-300 mb-2 font-medium">Sector</label>
                                <input
                                    type="text"
                                    value={formData.sector}
                                    onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                                    placeholder="e.g., IT, Finance, Manufacturing"
                                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-slate-300 mb-2 font-medium">Website</label>
                                <input
                                    type="url"
                                    value={formData.website}
                                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                    placeholder="https://example.com"
                                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-slate-300 mb-2 font-medium">HR Name</label>
                                    <input
                                        type="text"
                                        value={formData.hr_name}
                                        onChange={(e) => setFormData({ ...formData, hr_name: e.target.value })}
                                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-slate-300 mb-2 font-medium">HR Phone</label>
                                    <input
                                        type="tel"
                                        value={formData.hr_phone}
                                        onChange={(e) => setFormData({ ...formData, hr_phone: e.target.value })}
                                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-slate-300 mb-2 font-medium">HR Email</label>
                                <input
                                    type="email"
                                    value={formData.hr_email}
                                    onChange={(e) => setFormData({ ...formData, hr_email: e.target.value })}
                                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
                                />
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
                                    className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    <span>{editingCompany ? 'Update' : 'Create'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CompanyManagement;
