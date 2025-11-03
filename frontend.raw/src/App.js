import React, { useEffect, useState } from "react";
import client, { setAuthToken } from "./api";

// Helpers
function useLocalUser() {
  const [user, setUser] = useState(null);
  useEffect(() => {
    const raw = localStorage.getItem("noteorbit_user");
    const token = localStorage.getItem("noteorbit_token");
    if (raw) setUser(JSON.parse(raw));
    if (token) setAuthToken(token);
  }, []);
  return [user, setUser];
}

function App() {
  const [user, setUser] = useLocalUser();
  const [page, setPage] = useState("login"); // login, register, dashboard, admin
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (user) setPage("dashboard");
  }, [user]);

  const doLogin = async (email, password) => {
    try {
      const res = await client.post("/login", { email, password });
      const { token, user: u } = res.data;
      localStorage.setItem("noteorbit_token", token);
      localStorage.setItem("noteorbit_user", JSON.stringify(u));
      setAuthToken(token);
      setUser(u);
      setMessage("Logged in");
      setPage("dashboard");
    } catch (err) {
      setMessage(err.response?.data?.message || "Login failed");
    }
  };

  const doRegister = async (payload) => {
    try {
      const res = await client.post("/register", payload);
      setMessage(res.data.message);
      setPage("login");
    } catch (err) {
      setMessage(err.response?.data?.message || "Registration failed");
    }
  };

  const doLogout = () => {
    localStorage.removeItem("noteorbit_token");
    localStorage.removeItem("noteorbit_user");
    setAuthToken(null);
    setUser(null);
    setPage("login");
  };

  return (
    <div className="app">
      <div className="header">
        <div>
          <h2>NoteOrbit</h2>
          <div className="small">AI-powered Semester Notes & Notices</div>
        </div>
        <div>
          {user ? (
            <>
              <span className="small" style={{marginRight:12}}>{user.name} ({user.role})</span>
              <button className="button" onClick={doLogout}>Logout</button>
            </>
          ) : (
            <div>
              <button className="button" onClick={()=>setPage("login")}>Login</button>
              <button style={{marginLeft:8}} className="button" onClick={()=>setPage("register")}>Register</button>
            </div>
          )}
        </div>
      </div>

      <div style={{marginTop:16}}>
        {message && <div className="card small">{message}</div>}
        {page === "login" && <Login onLogin={doLogin} onSwitch={() => setPage("register")}/>}
        {page === "register" && <Register onRegister={doRegister} onSwitch={() => setPage("login")}/>}
        {page === "dashboard" && user && <Dashboard user={user} setMessage={setMessage} setUser={setUser} />}
      </div>
    </div>
  );
}

/* -------------------
   Login Component
   -------------------*/
function Login({ onLogin, onSwitch }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <div className="card">
      <h3>Login</h3>
      <input className="input" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
      <input className="input" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
      <div style={{display:"flex", gap:8}}>
        <button className="button" onClick={()=>onLogin(email, password)}>Login</button>
        <button className="button" style={{background:"#4b5563"}} onClick={onSwitch}>Register</button>
      </div>
      <div className="small" style={{marginTop:10}}>Note: student accounts need admin approval.</div>
    </div>
  );
}

/* -------------------
   Register Component
   -------------------*/
function Register({ onRegister, onSwitch }) {
  const [srn, setSrn] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [degree, setDegree] = useState("BCA");
  const [semester, setSemester] = useState("1");
  const [section, setSection] = useState("A");

  const submit = () => {
    onRegister({ srn, name, email, password, degree, semester, section });
  };

  return (
    <div className="card">
      <h3>Student Register</h3>
      <input className="input" placeholder="SRN" value={srn} onChange={e=>setSrn(e.target.value)} />
      <input className="input" placeholder="Full Name" value={name} onChange={e=>setName(e.target.value)} />
      <input className="input" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
      <input className="input" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />

      <select className="input" value={degree} onChange={e=>setDegree(e.target.value)}>
        <option>BCA</option>
        <option>BE</option>
        <option>MCA</option>
        <option>MBA</option>
      </select>
      <select className="input" value={semester} onChange={e=>setSemester(e.target.value)}>
        <option>1</option><option>2</option><option>3</option><option>4</option>
        <option>5</option><option>6</option><option>7</option><option>8</option>
      </select>
      <select className="input" value={section} onChange={e=>setSection(e.target.value)}>
        <option>A</option><option>B</option><option>C</option>
      </select>

      <div style={{display:"flex", gap:8}}>
        <button className="button" onClick={submit}>Register</button>
        <button className="button" style={{background:"#4b5563"}} onClick={onSwitch}>Back to Login</button>
      </div>
    </div>
  );
}

/* -------------------
   Dashboard (multi-role)
   -------------------*/
function Dashboard({ user, setMessage, setUser }) {
  if (user.role === "admin") return <AdminPanel setMessage={setMessage} />;
  if (user.role === "student") return <StudentPanel user={user} setMessage={setMessage} />;
  if (user.role === "professor") return <ProfessorPanel user={user} setMessage={setMessage} />;
  return <div>Unknown role</div>;
}

/* -------------------
   Admin Panel (approve students)
   -------------------*/
function AdminPanel({ setMessage }) {
  const [pending, setPending] = useState([]);
  useEffect(()=>{ fetchPending(); }, []);

  const fetchPending = async () => {
    try {
      const res = await client.get("/admin/pending-students");
      setPending(res.data.pending || []);
    } catch (err) {
      setMessage("Failed to fetch pending");
    }
  };

  const take = async (id, action) => {
    try {
      await client.post("/admin/approve-student", { student_id: id, action });
      setMessage("Action success");
      fetchPending();
    } catch (err) {
      setMessage("Action failed");
    }
  };

  return (
    <div>
      <h3>Admin Dashboard - Pending Students</h3>
      {pending.length===0 && <div className="card small">No pending students</div>}
      {pending.map(s => (
        <div key={s.id} className="card">
          <div><strong>{s.name}</strong> ({s.srn})</div>
          <div className="small">{s.email} • {s.degree} Sem {s.semester} Sec {s.section}</div>
          <div style={{marginTop:8}}>
            <button className="button" onClick={()=>take(s.id,"approve")}>Approve</button>
            <button className="button" style={{background:"#ef4444", marginLeft:8}} onClick={()=>take(s.id,"reject")}>Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* -------------------
   Student Panel
   -------------------*/
function StudentPanel({ user, setMessage }) {
  const [notes, setNotes] = useState([]);
  const [notices, setNotices] = useState([]);

  useEffect(()=>{ fetchNotes(); fetchNotices(); }, []);

  const fetchNotes = async () => {
    try {
      const res = await client.get("/notes", { params: { degree: user.degree, semester: user.semester }});
      setNotes(res.data.notes || []);
    } catch (err) {
      setMessage("Failed to load notes");
    }
  };

  const fetchNotices = async () => {
    try {
      const res = await client.get("/notices");
      setNotices(res.data.notices || []);
    } catch (err) {
      setMessage("Failed to load notices");
    }
  };

  return (
    <div>
      <h3>Student Dashboard</h3>
      <div className="card">
        <strong>My Subjects</strong>
        <div className="small">Auto-loaded by degree {user.degree} • semester {user.semester}</div>
      </div>

      <div>
        <h4>Notes</h4>
        {notes.length===0 && <div className="card small">No notes yet</div>}
        {notes.map(n => (
          <div key={n.id} className="card">
            <div><strong>{n.title}</strong> <span className="small">({n.document_type})</span></div>
            <div className="small">{n.subject} • {n.degree} Sem {n.semester}</div>
            <div style={{marginTop:8}}>
              {n.file_url && <a className="button" href={n.file_url}>Download</a>}
            </div>
          </div>
        ))}
      </div>

      <div>
        <h4>Notices</h4>
        {notices.length===0 && <div className="card small">No notices</div>}
        {notices.map(n => (
          <div key={n.id} className="card notice">
            <div><strong>{n.subject}</strong> — {n.title}</div>
            <div className="small">{n.professor_name} • {new Date(n.created_at).toLocaleString()}</div>
            <div style={{marginTop:6}}>{n.message}</div>
            {n.attachment_url && <div style={{marginTop:8}}><a href={n.attachment_url} className="button">Attachment</a></div>}
            {n.deadline && <div className="small">Deadline: {new Date(n.deadline).toLocaleDateString()}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------
   Professor Panel
   -------------------*/
function ProfessorPanel({ user, setMessage }) {
  const [title, setTitle] = useState("");
  const [degree, setDegree] = useState("BCA");
  const [semester, setSemester] = useState("1");
  const [subject, setSubject] = useState("Python");
  const [documentType, setDocumentType] = useState("Notes");
  const [file, setFile] = useState(null);

  const upload = async () => {
    if(!file) return setMessage("Select file");
    const form = new FormData();
    form.append("title", title);
    form.append("degree", degree);
    form.append("semester", semester);
    form.append("subject", subject);
    form.append("document_type", documentType);
    form.append("file", file);
    try {
      await client.post("/upload-note", form, { headers: {'Content-Type': 'multipart/form-data'}});
      setMessage("Uploaded");
    } catch (err) {
      setMessage("Upload failed");
    }
  };

  const [nTitle,setNTitle] = useState("");
  const [nMsg,setNMsg] = useState("");
  const [nSection,setNSection] = useState("A");
  const [nDeadline,setNDeadline] = useState("");
  const [attachment,setAttachment] = useState(null);

  const postNotice = async () => {
    const form = new FormData();
    form.append("title", nTitle);
    form.append("message", nMsg);
    form.append("degree", degree);
    form.append("semester", semester);
    form.append("section", nSection);
    form.append("subject", subject);
    if (nDeadline) form.append("deadline", nDeadline);
    if (attachment) form.append("attachment", attachment);
    try {
      await client.post("/create-notice", form, { headers: {'Content-Type': 'multipart/form-data'}});
      setMessage("Notice posted");
    } catch (err) {
      setMessage("Notice failed");
    }
  }

  return (
    <div>
      <h3>Professor Dashboard</h3>
      <div className="card">
        <h4>Upload Note</h4>
        <input className="input" placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} />
        <select className="input" value={degree} onChange={e=>setDegree(e.target.value)}>
          <option>BCA</option><option>BE</option><option>MCA</option><option>MBA</option>
        </select>
        <select className="input" value={semester} onChange={e=>setSemester(e.target.value)}>
          <option>1</option><option>2</option><option>3</option><option>4</option>
          <option>5</option><option>6</option><option>7</option><option>8</option>
        </select>
        <input className="input" placeholder="Subject" value={subject} onChange={e=>setSubject(e.target.value)} />
        <select className="input" value={documentType} onChange={e=>setDocumentType(e.target.value)}>
          <option>Notes</option><option>Question Bank</option><option>Reference Book</option>
        </select>
        <input className="input" type="file" onChange={e=>setFile(e.target.files[0])} />
        <button className="button" onClick={upload}>Upload</button>
      </div>

      <div className="card">
        <h4>Create Notice</h4>
        <input className="input" placeholder="Title" value={nTitle} onChange={e=>setNTitle(e.target.value)} />
        <textarea className="input" placeholder="Message" value={nMsg} onChange={e=>setNMsg(e.target.value)} />
        <input className="input" placeholder="Section (A/B/C or A,B)" value={nSection} onChange={e=>setNSection(e.target.value)} />
        <input className="input" type="date" value={nDeadline} onChange={e=>setNDeadline(e.target.value)} />
        <input className="input" type="file" onChange={e=>setAttachment(e.target.files[0])} />
        <button className="button" onClick={postNotice}>Post Notice</button>
      </div>
    </div>
  );
}

export default App;
