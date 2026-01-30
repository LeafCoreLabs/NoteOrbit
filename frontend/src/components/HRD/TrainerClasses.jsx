// TrainerClasses.jsx - View Assigned Sections
import React, { useState, useEffect } from 'react';
import { BookOpen, Calendar, ChevronRight, Users, Loader2 } from 'lucide-react';
import { api } from '../../api';

const TrainerClasses = ({ token, onSelectClass }) => {
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchClasses();
    }, []);

    const fetchClasses = async () => {
        try {
            // This endpoint should return allocations for the logged-in trainer
            const response = await api.get('/hrd/trainer/classes', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success) {
                setClasses(response.data.classes);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-emerald-400" /></div>;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-2xl font-bold text-white">My Classes</h2>
                <p className="text-slate-400">Select a class to manage attendance and marks.</p>
            </div>

            {classes.length === 0 ? (
                <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-8 text-center">
                    <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-white">No Classes Assigned</h3>
                    <p className="text-slate-400">Contact the CHRO if you believe this is an error.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {classes.map((cls) => (
                        <div
                            key={cls.id}
                            onClick={() => onSelectClass(cls)}
                            className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:border-emerald-500/50 hover:bg-slate-800/60 transition-all cursor-pointer group relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -translate-y-12 translate-x-12 group-hover:bg-emerald-500/20 transition-all" />

                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/30">
                                    <BookOpen className="w-6 h-6" />
                                </div>
                                <span className="px-2 py-1 bg-slate-800 rounded-lg text-xs text-slate-300 border border-white/5 font-mono">
                                    SEM {cls.semester}
                                </span>
                            </div>

                            <h3 className="text-xl font-bold text-white mb-1 group-hover:text-emerald-400 transition-colors">
                                {cls.subject_name}
                            </h3>
                            <div className="flex items-center gap-2 text-slate-400 text-sm mb-4">
                                <span className="font-semibold text-white">{cls.degree}</span>
                                <span>•</span>
                                <span>Section {cls.section}</span>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                <div className="flex items-center gap-2 text-slate-400 text-sm">
                                    <Users className="w-4 h-4" />
                                    <span>{cls.student_count || 0} Students</span>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-500 group-hover:translate-x-1 transition-transform group-hover:text-emerald-400" />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TrainerClasses;
