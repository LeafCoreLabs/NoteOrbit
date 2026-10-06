import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import gsap from "gsap";
import {
    LogIn, UserPlus, LogOut, ArrowLeft, ArrowRight, Loader2, CheckCircle, XCircle, ChevronDown,
    Book, Bell, Settings, Briefcase, User, Mail, Lock, GraduationCap, ClipboardList,
    BriefcaseBusiness, IndianRupee, Award, MessageSquare, Upload, RefreshCw,
    Trash2, Save, Home, Search, Download, Check, Atom, Star, Sparkles, Plus, Filter, Eye, EyeOff, Edit,
    BrainCircuit, AlertTriangle, Target, Lightbulb, Send as SendIcon, Paperclip, Menu, History, Bot, BarChart3
} from "lucide-react";
import { api, auth, unauth } from "../../api";
import { setAuthToken } from "../../api/auth";
import { cents_to_rupees_str } from "../../utils/format";
import { Input, Select } from "../../components/ui";

export default function AdminHostelManagement({ showMessage, buttonClass, primaryButtonClass, catalogs }) {
    const { degrees, sections, fetchBasics } = catalogs;

    // States for Hostel/Room CRUD
    const [hostels, setHostels] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [isHostelLoading, setIsHostelLoading] = useState(false);

    const [newHostelName, setNewHostelName] = useState('');
    const [newHostelAddress, setNewHostelAddress] = useState('');

    const [newRoomHostelId, setNewRoomHostelId] = useState('');
    const [newRoomNumber, setNewRoomNumber] = useState('');
    const [newRoomCapacity, setNewRoomCapacity] = useState(1);

    // MODIFIED: Renamed state variable from studentToAssign to srnToAssign
    const [srnToAssign, setSrnToAssign] = useState('');
    const [roomToAssign, setRoomToAssign] = useState('');

    // States for Global View
    const [globalHostelData, setGlobalHostelData] = useState([]);

    const fetchHostelData = useCallback(async () => {
        setIsHostelLoading(true);
        try {
            const [hostelRes, roomRes, globalRes] = await Promise.all([
                auth().get("/admin/hostel/hostels"),
                auth().get("/admin/hostel/rooms"),
                auth().get("/admin/hostel/hostels") // Same endpoint used for global view/list
            ]);
            setHostels(hostelRes.data.hostels || []);
            setRooms(roomRes.data.rooms || []);
            setGlobalHostelData(globalRes.data.hostels || []);

            // Initialize dropdowns
            if (hostelRes.data.hostels.length > 0) {
                setNewRoomHostelId(hostelRes.data.hostels[0].id);
            }
            if (roomRes.data.rooms.length > 0) {
                setRoomToAssign(roomRes.data.rooms[0].id);
            } else {
                setNewRoomHostelId('');
                setRoomToAssign('');
            }

        } catch (e) {
            if (e.response && e.response.status !== 401) {
                showMessage(e.response?.data?.message || "Failed to fetch hostel data.", 'error');
            }
            setHostels([]); setRooms([]); setGlobalHostelData([]);
        } finally {
            setIsHostelLoading(false);
        }
    }, [showMessage]);

    useEffect(() => {
        fetchHostelData();
    }, [fetchHostelData]);


    // --- Handlers ---
    const handleAddHostel = async () => {
        if (!newHostelName.trim()) return showMessage("Hostel Name is required.", 'error');
        try {
            await auth().post("/admin/hostel/hostels", { name: newHostelName, address: newHostelAddress });
            showMessage(`Hostel **${newHostelName}** added!`, 'success');
            setNewHostelName('');
            setNewHostelAddress('');
            fetchHostelData();
        } catch (e) {
            showMessage(e.response?.data?.message || "Failed to add hostel.", 'error');
        }
    };

    const handleAddRoom = async () => {
        if (!newRoomHostelId || !newRoomNumber.trim() || newRoomCapacity < 1) return showMessage("All room fields are required and capacity must be > 0.", 'error');
        try {
            await auth().post("/admin/hostel/rooms", {
                hostel_id: newRoomHostelId,
                room_number: newRoomNumber,
                capacity: parseInt(newRoomCapacity)
            });
            showMessage(`Room **${newRoomNumber}** added!`, 'success');
            setNewRoomNumber('');
            setNewRoomCapacity(1);
            fetchHostelData();
        } catch (e) {
            showMessage(e.response?.data?.message || "Failed to add room.", 'error');
        }
    };

    // MODIFIED: Function updated to use 'srn' state variable and pass 'srn' in payload
    const handleAssignRoom = async () => {
        if (!srnToAssign.trim() || !roomToAssign) return showMessage("Student SRN and Room must be selected.", 'error');
        try {
            await auth().post("/admin/hostel/assign-room", {
                srn: srnToAssign, // <<-- KEY CHANGED TO SRN
                room_id: roomToAssign
            });
            showMessage(`Room assigned successfully to SRN ${srnToAssign}!`, 'success'); // Updated message
            setSrnToAssign('');
            fetchHostelData();
        } catch (e) {
            showMessage(e.response?.data?.message || "Failed to assign room.", 'error');
        }
    };

    const renderGlobalHostelView = () => (
        <div className="space-y-4">
            <h5 className="text-xl font-bold text-blue-400">Hostel Overview (One Go)</h5>
            {isHostelLoading ? <div className="text-center p-4"><Loader2 className="animate-spin w-5 h-5 mx-auto text-blue-500" /></div> : globalHostelData.length === 0 ? <div className="text-slate-500">No hostels defined.</div> : (
                <div className="overflow-x-auto rounded-xl border border-white/10">
                    <table className="min-w-full divide-y divide-white/10 shadow-md bg-slate-900/60 backdrop-blur-xl">
                        <thead className="bg-slate-800/80">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Hostel</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Rooms</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Capacity</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Occupancy</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Vacant Beds</th>
                            </tr>
                        </thead>
                        <tbody className="bg-slate-900/40 divide-y divide-white/10">
                            {globalHostelData.map(h => (
                                <tr key={h.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-200">{h.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{h.total_rooms}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{h.total_capacity}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{h.current_occupancy}</td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${h.vacant_beds > 0 ? 'text-green-400' : 'text-red-400'}`}>{h.vacant_beds}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-6">
            <h4 className="text-2xl font-bold text-blue-400 flex items-center"><Home className="w-6 h-6 mr-2" /> Hostel Management</h4>

            {renderGlobalHostelView()}

            <div className="grid lg:grid-cols-3 gap-6 pt-4 border-t border-white/10">

                {/* Add Hostel */}
                <div className="bg-slate-900/60 backdrop-blur-xl p-5 rounded-xl shadow-lg border border-yellow-500/20 space-y-3">
                    <h5 className="text-xl font-bold text-yellow-400">Add New Hostel</h5>
                    <Input placeholder="Hostel Name" value={newHostelName} onChange={e => setNewHostelName(e.target.value)} />
                    <Input placeholder="Address (Optional)" value={newHostelAddress} onChange={e => setNewHostelAddress(e.target.value)} />
                    <button className={`${buttonClass} ${primaryButtonClass}`} onClick={handleAddHostel}>Create Hostel</button>
                </div>

                {/* Add Room */}
                <div className="bg-slate-900/60 backdrop-blur-xl p-5 rounded-xl shadow-lg border border-yellow-500/20 space-y-3">
                    <h5 className="text-xl font-bold text-yellow-400">Add Room to Hostel</h5>
                    <Select value={newRoomHostelId} onChange={e => setNewRoomHostelId(parseInt(e.target.value) || '')} disabled={!hostels.length}>
                        <option value="" className="text-slate-900">Select Hostel</option>
                        {(hostels || []).map(h => <option key={h.id} value={h.id} className="text-slate-900">{h.name}</option>)}
                    </Select>
                    <Input placeholder="Room Number (e.g., 101A)" value={newRoomNumber} onChange={e => setNewRoomNumber(e.target.value)} />
                    <Input type="number" placeholder="Capacity (e.g., 2)" value={newRoomCapacity} onChange={e => setNewRoomCapacity(parseInt(e.target.value) || 1)} min="1" />
                    <button className={`${buttonClass} ${primaryButtonClass}`} onClick={handleAddRoom} disabled={!newRoomHostelId || !newRoomNumber}>Add Room</button>
                </div>

                {/* Assign Room */}
                <div className="bg-slate-900/60 backdrop-blur-xl p-5 rounded-xl shadow-lg border border-yellow-500/20 space-y-3">
                    <h5 className="text-xl font-bold text-yellow-400">Assign Room to Student</h5>
                    <Input placeholder="Student SRN (e.g., SRN001)" value={srnToAssign} onChange={e => setSrnToAssign(e.target.value)} /> {/* MODIFIED: Input changed to SRN */}
                    <Select value={roomToAssign} onChange={e => setRoomToAssign(parseInt(e.target.value) || '')} disabled={!rooms.length}>
                        <option value="" className="text-slate-900">Select Room (Hostel - Room # - Occupancy)</option>
                        {(rooms || []).map(r => (
                            <option key={r.id} value={r.id} disabled={r.occupancy >= r.capacity} className="text-slate-900">
                                {r.hostel_name} - {r.room_number} ({r.occupancy}/{r.capacity})
                            </option>
                        ))}
                    </Select>
                    <button className={`${buttonClass} ${primaryButtonClass}`} onClick={handleAssignRoom} disabled={!srnToAssign || !roomToAssign}>Assign Room</button>
                    <p className="text-xs text-red-400">Note: Must use Student **SRN**.</p> {/* MODIFIED: Note changed */}
                </div>
            </div>
        </div>
    );
}

// --- NEW ADMIN MODULE: Student List Filter ---
