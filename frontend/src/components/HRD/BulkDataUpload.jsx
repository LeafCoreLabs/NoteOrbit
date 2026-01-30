// BulkDataUpload.jsx - CSV Data Ingestion for Trainers
import React, { useState } from 'react';
import { Upload, FileSpreadsheet, Loader2, CheckCircle } from 'lucide-react';
import { api } from '../../api';

const BulkDataUpload = ({ token }) => {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState(null);

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        setResult(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await api.post('/hrd/trainer/upload-csv', formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            setResult(res.data);
            setFile(null);
        } catch (e) {
            setResult({ success: false, message: e.response?.data?.message || 'Upload failed' });
        }
        finally { setUploading(false); }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Upload className="w-6 h-6 text-indigo-400" /> Bulk Data Upload
            </h2>

            <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
                <div className="text-center">
                    <div className="w-20 h-20 rounded-2xl bg-indigo-500/20 flex items-center justify-center mx-auto mb-6">
                        <FileSpreadsheet className="w-10 h-10 text-indigo-400" />
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2">Upload Student Data CSV</h3>
                    <p className="text-slate-400 text-sm mb-6">
                        CSV should contain columns: SRN, GPA, Backlogs (optional)
                    </p>

                    <div className="max-w-md mx-auto">
                        <label className="block">
                            <input
                                type="file"
                                accept=".csv"
                                onChange={e => setFile(e.target.files[0])}
                                className="hidden"
                            />
                            <div className="border-2 border-dashed border-white/20 rounded-xl p-8 cursor-pointer hover:border-indigo-500/50 transition">
                                {file ? (
                                    <p className="text-indigo-400 font-medium">{file.name}</p>
                                ) : (
                                    <p className="text-slate-500">Click to select CSV file</p>
                                )}
                            </div>
                        </label>

                        <button
                            onClick={handleUpload}
                            disabled={!file || uploading}
                            className="mt-4 w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-50"
                        >
                            {uploading ? <Loader2 className="animate-spin w-4 h-4" /> : <Upload className="w-4 h-4" />}
                            Upload & Process
                        </button>
                    </div>

                    {result && (
                        <div className={`mt-6 p-4 rounded-xl ${result.success ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                            {result.success ? <CheckCircle className="w-5 h-5 inline mr-2" /> : null}
                            {result.message}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BulkDataUpload;
