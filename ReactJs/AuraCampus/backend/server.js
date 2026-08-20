// AuraCampus MERN Backend — Express + MongoDB
// Full API: auth (with enrollment login + forgot password + profile update),
// subjects, timetable, attendance (QR + public landing), assignments (real
// uploads), quizzes (multi-year, per-teacher/subject), notices (real Resend
// email), lost & found, file upload proxy to Emergent Object Storage.

const path = require("path");
import("dotenv").config({ path: path.join(__dirname, ".env") });
const ACADEMIC_YEARS = ["1", "2", "3", "4"];
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { MongoClient } = require("mongodb");
const crypto = require("crypto");

const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME || "auracampus";
const JWT_SECRET = process.env.JWT_SECRET || "changeme";
const PORT = Number(process.env.NODE_PORT || 8002);
const EMERGENT_LLM_KEY = process.env.EMERGENT_LLM_KEY || "";
const EMERGENT_EMAIL_KEY = process.env.EMERGENT_EMAIL_KEY || "";
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || "AuraCampus";
const INTEGRATION_PROXY_URL = (process.env.INTEGRATION_PROXY_URL || "https://integrations.emergentagent.com").replace(/\/$/, "");
const FRONTEND_URL = process.env.FRONTEND_URL || "";
const APP_NAME = "auracampus";

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// ----- constants exposed to frontend -----
const DEPARTMENTS = [
  "Computer Engineering",
  "Information Technology",
  "Electronics & Telecommunication",
  "Mechanical Engineering",
  "Civil Engineering",
  "Electrical Engineering",
  "Chemical Engineering",
  "Artificial Intelligence & Data Science",
  "Biotechnology",
  "Administration",
];
const CLASSES = ["FE-A", "FE-B", "SE-A", "SE-B", "TE-A", "TE-B", "BE-A", "BE-B"];

// ----- Mongo -----
let db;
const client = new MongoClient(MONGO_URL);
async function connectDb() {
  await client.connect();
  db = client.db(DB_NAME);
  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  await db.collection("users").createIndex({ id: 1 }, { unique: true });
  await db.collection("users").createIndex({ enrollment_number: 1 }, { unique: true, sparse: true });
  await db.collection("subjects").createIndex({ id: 1 }, { unique: true });
  await db.collection("assignments").createIndex({ id: 1 }, { unique: true });
  await db.collection("quizzes").createIndex({ id: 1 }, { unique: true });
  await db.collection("attendance_sessions").createIndex({ token: 1 });
  await db.collection("timetable").createIndex({ id: 1 }, { unique: true });
  await db.collection("password_resets").createIndex({ expires_at: 1 });
  console.log("[express] Mongo connected:", DB_NAME);
}

// ----- helpers -----
const clean = (d) => { if (!d) return d; const c = { ...d }; delete c._id; return c; };
const nowIso = () => new Date().toISOString();
const hashPw = (p) => bcrypt.hashSync(p, 10);
const checkPw = (p, h) => { try { return bcrypt.compareSync(p, h); } catch { return false; } };
const createToken = (id, role) => jwt.sign({ sub: id, role }, JWT_SECRET, { expiresIn: "7d" });

function auth(req, res, next) {
  const h = req.headers.authorization || "";
  const t = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!t) return res.status(401).json({ detail: "Not authenticated" });
  try {
    const p = jwt.verify(t, JWT_SECRET);
    req.userId = p.sub; req.role = p.role; next();
  } catch { res.status(401).json({ detail: "Invalid or expired token" }); }
}
async function loadUser(req, res, next) {
  const u = await db.collection("users").findOne({ id: req.userId });
  if (!u) return res.status(401).json({ detail: "User not found" });
  const { password_hash, ...safe } = clean(u);
  req.user = safe; next();
}
const requireRole = (r) => (req, res, next) => req.role === r ? next() : res.status(403).json({ detail: `${r} access required` });

// ----- meta -----
app.get("/api/", (req, res) => res.json({ ok: true, app: "AuraCampus", stack: "MERN" }));
app.get("/api/meta", (req, res) => res.json({ departments: DEPARTMENTS, classes: CLASSES, academic_years: ACADEMIC_YEARS }));

// -----  Email (Resend) -----
async function sendEmail({ to, subject, html, replyTo }) {
  if (!EMERGENT_EMAIL_KEY) { console.warn("[email] EMERGENT_EMAIL_KEY missing; skipping"); return null; }
  const payload = { to: Array.isArray(to) ? to : [to], subject, html, from_name: EMAIL_FROM_NAME };
  if (replyTo) payload.contact_email = replyTo;
  try {
    const r = await fetch(`${INTEGRATION_PROXY_URL}/api/v1/email/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Email-Key": EMERGENT_EMAIL_KEY },
      body: JSON.stringify(payload),
    });
    if (!r.ok) { console.warn("[email] failed", r.status, await r.text()); return null; }
    return await r.json();
  } catch (e) { console.warn("[email] error", e.message); return null; }
}

//  Object Storage -----
let storageKey = null;
async function initStorage(force = false) {
  if (storageKey && !force) return storageKey;
  const r = await fetch(`${INTEGRATION_PROXY_URL}/objstore/api/v1/storage/init`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emergent_key: EMERGENT_LLM_KEY }),
  });
  if (!r.ok) throw new Error("storage init failed " + r.status);
  const j = await r.json();
  storageKey = j.storage_key;
  return storageKey;
}
async function putObject(objPath, bytes, contentType) {
  const key = await initStorage();
  const r = await fetch(`${INTEGRATION_PROXY_URL}/objstore/api/v1/storage/objects/${objPath}`, {
    method: "PUT", headers: { "X-Storage-Key": key, "Content-Type": contentType }, body: bytes,
  });
  if (!r.ok) throw new Error("upload failed " + r.status);
  return await r.json();
}
async function getObject(objPath) {
  const key = await initStorage();
  const r = await fetch(`${INTEGRATION_PROXY_URL}/objstore/api/v1/storage/objects/${objPath}`, {
    headers: { "X-Storage-Key": key },
  });
  if (!r.ok) throw new Error("download failed " + r.status);
  return { data: Buffer.from(await r.arrayBuffer()), contentType: r.headers.get("content-type") || "application/octet-stream" };
}

// Upload with base64 payload (avoids multer + preserves binary in JSON body)
app.post("/api/upload", auth, loadUser, async (req, res) => {
  try {
    const { filename, content_type, data_base64 } = req.body || {};
    if (!filename || !data_base64) return res.status(400).json({ detail: "filename and data_base64 required" });
    const ext = filename.includes(".") ? filename.split(".").pop() : "bin";
    const objPath = `${APP_NAME}/uploads/${req.user.id}/${uuidv4()}.${ext}`;
    const buf = Buffer.from(data_base64, "base64");
    const ct = content_type || "application/octet-stream";
    const info = await putObject(objPath, buf, ct);
    const rec = {
      id: uuidv4(), storage_path: info.path, original_filename: filename,
      content_type: ct, size: info.size, user_id: req.user.id,
      is_deleted: false, created_at: nowIso(),
    };
    await db.collection("files").insertOne(rec);
    res.json({ id: rec.id, storage_path: info.path, url: `/api/files/${info.path}`, original_filename: filename, size: info.size });
  } catch (e) {
    console.error("[upload]", e);
    res.status(500).json({ detail: "Upload failed. " + e.message });
  }
});

app.get("/api/files/*", async (req, res) => {
  try {
    const p = req.params[0];
    const rec = await db.collection("files").findOne({ storage_path: p, is_deleted: false });
    if (!rec) return res.status(404).json({ detail: "File not found" });
    const { data, contentType } = await getObject(p);
    res.setHeader("Content-Type", rec.content_type || contentType);
    res.setHeader("Content-Disposition", `inline; filename="${rec.original_filename}"`);
    res.send(data);
  } catch (e) { res.status(500).json({ detail: e.message }); }
});

// ================ AUTH ================
app.post("/api/auth/signup", async (req, res) => {
  const { name, email, password, role, phone, department, class_name, subjects, enrollment_number, academic_year } = req.body || {};
  if (!["teacher", "student"].includes(role)) return res.status(400).json({ detail: "Invalid role" });
  if (!name || !email || !password) return res.status(400).json({ detail: "Missing required fields" });
  if (role === "student" && !enrollment_number) return res.status(400).json({ detail: "Enrollment number is required" });
  const e = String(email).toLowerCase();
  if (await db.collection("users").findOne({ email: e })) return res.status(400).json({ detail: "Email already registered" });
  if (enrollment_number && await db.collection("users").findOne({ enrollment_number })) {
    return res.status(400).json({ detail: "Enrollment number already registered" });
  }
  const id = uuidv4();
  const doc = {
    id, name, email: e, phone: phone || "", role,
    department: department || "", class_name: class_name || "", academic_year: academic_year || "",
    subjects: subjects || [], enrollment_number: enrollment_number || null,
    password_hash: hashPw(password), created_at: nowIso(),
  };
  await db.collection("users").insertOne(doc);
  const { password_hash, ...safe } = clean(doc);
  res.json({ token: createToken(id, role), user: safe });
});

// login with email OR enrollment_number
app.post("/api/auth/login", async (req, res) => {
  const { email, enrollment_number, password, role } = req.body || {};
  const q = enrollment_number ? { enrollment_number: String(enrollment_number).trim() } : { email: String(email || "").toLowerCase() };
  const u = await db.collection("users").findOne(q);
  if (!u || !checkPw(password, u.password_hash)) return res.status(401).json({ detail: "Invalid credentials" });
  if (role && u.role !== role) return res.status(403).json({ detail: `This account is not a ${role}. Please switch role.` });
  const { password_hash, ...safe } = clean(u);
  res.json({ token: createToken(u.id, u.role), user: safe });
});

app.get("/api/auth/me", auth, loadUser, (req, res) => res.json({ user: req.user }));
app.post("/api/auth/logout", (req, res) => res.json({ ok: true }));

app.patch("/api/auth/profile", auth, loadUser, async (req, res) => {
  const allowed = ["name", "phone", "department", "class_name", "academic_year", "subjects"];
  const patch = {};
  for (const k of allowed) if (k in req.body) patch[k] = req.body[k];
  if (Object.keys(patch).length === 0) return res.json({ user: req.user });
  await db.collection("users").updateOne({ id: req.user.id }, { $set: patch });
  const u = await db.collection("users").findOne({ id: req.user.id });
  const { password_hash, ...safe } = clean(u);
  res.json({ user: safe });
});

app.post("/api/auth/change-password", auth, loadUser, async (req, res) => {
  const { current_password, new_password } = req.body || {};
  const u = await db.collection("users").findOne({ id: req.user.id });
  if (!checkPw(current_password || "", u.password_hash)) return res.status(400).json({ detail: "Current password incorrect" });
  await db.collection("users").updateOne({ id: req.user.id }, { $set: { password_hash: hashPw(new_password) } });
  res.json({ ok: true });
});

app.post("/api/auth/forgot-password", async (req, res) => {
  const { identifier } = req.body || {}; // email OR enrollment_number
  if (!identifier) return res.status(400).json({ detail: "Provide email or enrollment number" });
  const q = identifier.includes("@")
    ? { email: identifier.toLowerCase() }
    : { $or: [{ enrollment_number: identifier }, { email: identifier.toLowerCase() }] };
  const u = await db.collection("users").findOne(q);
  // do not reveal existence
  if (u) {
    const token = crypto.randomBytes(24).toString("hex");
    const expires_at = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await db.collection("password_resets").insertOne({ token, user_id: u.id, expires_at, used: false, created_at: nowIso() });
    const link = `${FRONTEND_URL}/reset-password?token=${token}`;
    const html = `
      <table style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #eee;border-radius:12px">
        <tr><td>
          <h2 style="color:#4F46E5;margin:0 0 12px 0">Reset your AuraCampus password</h2>
          <p>Hi ${u.name},</p>
          <p>Click the button below to reset your password. This link expires in 1 hour.</p>
          <p style="margin:24px 0"><a href="${link}" style="background:#4F46E5;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:600">Reset password</a></p>
          <p style="color:#64748b;font-size:12px">Or paste this URL into your browser: ${link}</p>
        </td></tr>
      </table>`;
    await sendEmail({ to: u.email, subject: "Reset your AuraCampus password", html });
    console.log(`[reset] token for ${u.email}: ${token}`);
  }
  res.json({ ok: true, message: "If the account exists, a reset email has been sent." });
});

app.post("/api/auth/reset-password", async (req, res) => {
  const { token, new_password } = req.body || {};
  const rec = await db.collection("password_resets").findOne({ token });
  if (!rec || rec.used || new Date(rec.expires_at) < new Date()) return res.status(400).json({ detail: "Invalid or expired token" });
  await db.collection("users").updateOne({ id: rec.user_id }, { $set: { password_hash: hashPw(new_password) } });
  await db.collection("password_resets").updateOne({ token }, { $set: { used: true } });
  res.json({ ok: true });
});

// ================ SUBJECTS ================
app.get("/api/subjects", auth, loadUser, async (req, res) => {
  const q = req.user.role === "teacher" ? { teacher_id: req.user.id } : {};
  const docs = await db.collection("subjects").find(q).toArray();
  res.json(docs.map(clean));
});
app.post("/api/subjects", auth, loadUser, requireRole("teacher"), async (req, res) => {
  const { name, code, color } = req.body || {};
  const doc = { id: uuidv4(), name, code, color: color || "indigo", teacher_id: req.user.id, teacher_name: req.user.name, created_at: nowIso() };
  await db.collection("subjects").insertOne(doc);
  res.json(clean(doc));
});

// ================ TIMETABLE ================
// day: 0..6 (Mon..Sun), start_time / end_time: "HH:MM"
app.get("/api/timetable", auth, loadUser, async (req, res) => {
  let q = {};
  if (req.user.role === "teacher") q.teacher_id = req.user.id;
  else q.class_name = req.user.class_name || "";
  const docs = await db.collection("timetable").find(q).toArray();
  res.json(docs.map(clean).sort((a, b) => (a.day - b.day) || a.start_time.localeCompare(b.start_time)));
});
app.post("/api/timetable", auth, loadUser, requireRole("teacher"), async (req, res) => {
  const { subject_id, class_name, day, start_time, end_time, room } = req.body || {};
  const subj = await db.collection("subjects").findOne({ id: subject_id });
  const doc = {
    id: uuidv4(), subject_id, subject_name: subj ? subj.name : "",
    subject_color: subj ? subj.color : "indigo",
    class_name, day: Number(day), start_time, end_time, room: room || "",
    teacher_id: req.user.id, teacher_name: req.user.name, created_at: nowIso(),
  };
  await db.collection("timetable").insertOne(doc);
  res.json(clean(doc));
});
app.delete("/api/timetable/:id", auth, loadUser, requireRole("teacher"), async (req, res) => {
  await db.collection("timetable").deleteOne({ id: req.params.id, teacher_id: req.user.id });
  res.json({ ok: true });
});

// ================ ATTENDANCE ================
app.post("/api/attendance/session", auth, loadUser, requireRole("teacher"), async (req, res) => {
  const { subject_id, class_name, duration_min = 10 } = req.body || {};
  const subject = await db.collection("subjects").findOne({ id: subject_id });
  const token = crypto.randomBytes(10).toString("base64url");
  const doc = {
    id: uuidv4(), token, subject_id, subject_name: subject ? subject.name : "",
    class_name, teacher_id: req.user.id, teacher_name: req.user.name,
    created_at: nowIso(),
    expires_at: new Date(Date.now() + duration_min * 60000).toISOString(), active: true,
  };
  await db.collection("attendance_sessions").insertOne(doc);
  res.json(clean(doc));
});

app.get("/api/attendance/session/:id", auth, async (req, res) => {
  const s = await db.collection("attendance_sessions").findOne({ id: req.params.id });
  if (!s) return res.status(404).json({ detail: "Session not found" });
  const marks = await db.collection("attendance_marks").find({ session_id: s.id }).toArray();
  const out = clean(s); out.marks = marks.map(clean); res.json(out);
});

// PUBLIC endpoint: student's mobile browser hits this after scanning QR.
app.get("/api/attendance/public/:token", async (req, res) => {
  const s = await db.collection("attendance_sessions").findOne({ token: req.params.token });
  if (!s) return res.status(404).json({ detail: "Invalid attendance code" });
  const expired = new Date(s.expires_at) < new Date();
  res.json({
    id: s.id, token: s.token, subject_name: s.subject_name, class_name: s.class_name,
    teacher_name: s.teacher_name, expires_at: s.expires_at, expired,
  });
});

app.post("/api/attendance/mark", auth, loadUser, requireRole("student"), async (req, res) => {
  const { token } = req.body || {};
  const session = await db.collection("attendance_sessions").findOne({ token });
  if (!session) return res.status(404).json({ detail: "Invalid attendance code" });
  if (new Date(session.expires_at) < new Date()) return res.status(400).json({ detail: "Session expired" });
  const existing = await db.collection("attendance_marks").findOne({ session_id: session.id, student_id: req.user.id });
  if (existing) return res.json({ ok: true, message: "Already marked", record: clean(existing) });
  const rec = {
    id: uuidv4(), session_id: session.id, subject_id: session.subject_id,
    subject_name: session.subject_name, student_id: req.user.id, student_name: req.user.name,
    class_name: session.class_name, marked_at: nowIso(),
  };
  await db.collection("attendance_marks").insertOne(rec);
  res.json({ ok: true, message: "Attendance marked", record: clean(rec) });
});

app.get("/api/attendance/report", auth, loadUser, async (req, res) => {
  if (req.user.role === "student") {
    const [marks, sessions] = await Promise.all([
      db.collection("attendance_marks").find({ student_id: req.user.id }).toArray(),
      db.collection("attendance_sessions").find({ class_name: req.user.class_name || "" }).toArray(),
    ]);
    const by = {};
    for (const s of sessions) { by[s.subject_name] = by[s.subject_name] || { total: 0, present: 0 }; by[s.subject_name].total++; }
    for (const m of marks) { by[m.subject_name] = by[m.subject_name] || { total: 0, present: 0 }; by[m.subject_name].present++; }
    const summary = Object.entries(by).map(([subject, v]) => ({
      subject, total: v.total, present: v.present,
      percent: v.total ? Math.round((v.present / v.total) * 100) : 0,
    }));
    return res.json({ summary });
  }
  const sessions = await db.collection("attendance_sessions").find({ teacher_id: req.user.id }).toArray();
  const sessionIds = sessions.map(s => s.id);
  const marks = await db.collection("attendance_marks").find({ session_id: { $in: sessionIds } }).toArray();
  const classes = [...new Set(sessions.map(s => s.class_name))];
  const students = await db.collection("users").find({ role: "student", class_name: { $in: classes } }).toArray();
  const totals = {};
  for (const s of sessions) { const k = `${s.class_name}|${s.subject_name}`; totals[k] = (totals[k] || 0) + 1; }
  const perStudent = {};
  for (const stu of students) perStudent[stu.id] = { student_id: stu.id, student_name: stu.name, email: stu.email, enrollment_number: stu.enrollment_number || "", class_name: stu.class_name || "", subjects: {} };
  for (const m of marks) {
    if (!perStudent[m.student_id]) continue;
    perStudent[m.student_id].subjects[m.subject_name] = (perStudent[m.student_id].subjects[m.subject_name] || 0) + 1;
  }
  const report = []; const defaulters = [];
  for (const stu of Object.values(perStudent)) {
    const rows = []; let overallTotal = 0, overallPresent = 0;
    for (const [k, total] of Object.entries(totals)) {
      const [cls, subj] = k.split("|");
      if (cls !== stu.class_name) continue;
      const present = stu.subjects[subj] || 0;
      rows.push({ subject: subj, total, present, percent: total ? Math.round((present / total) * 100) : 0 });
      overallTotal += total; overallPresent += present;
    }
    const overall_percent = overallTotal ? Math.round((overallPresent / overallTotal) * 100) : 0;
    const entry = { ...stu, rows, overall_percent }; delete entry.subjects;
    report.push(entry);
    if (overallTotal > 0 && overall_percent < 75) defaulters.push(entry);
  }
  res.json({ report, defaulters });
});

// ================ ASSIGNMENTS ================
app.post("/api/assignments", auth, loadUser, requireRole("teacher"), async (req, res) => {
  const { title, description, subject_id, class_name, due_date, file_url, file_id } = req.body || {};
  const subject = await db.collection("subjects").findOne({ id: subject_id });
  const doc = {
    id: uuidv4(), title, description, subject_id,
    subject_name: subject ? subject.name : "", class_name, due_date,
    file_url: file_url || "", file_id: file_id || "",
    teacher_id: req.user.id, teacher_name: req.user.name, created_at: nowIso(),
  };
  await db.collection("assignments").insertOne(doc);
  res.json(clean(doc));
});

app.get("/api/assignments", auth, loadUser, async (req, res) => {
  const q = req.user.role === "teacher" ? { teacher_id: req.user.id } : { class_name: req.user.class_name || "" };
  if (req.query.subject_id) q.subject_id = req.query.subject_id;
  const docs = await db.collection("assignments").find(q).sort({ created_at: -1 }).toArray();
  const out = [];
  for (const d of docs) {
    const subs = await db.collection("submissions").find({ assignment_id: d.id }).toArray();
    const c = clean(d);
    c.submissions_count = subs.length;
    if (req.user.role === "student") {
      const mine = subs.find(s => s.student_id === req.user.id);
      c.my_submission = mine ? clean(mine) : null;
    }
    out.push(c);
  }
  res.json(out);
});

app.get("/api/assignments/:aid/submissions", auth, loadUser, requireRole("teacher"), async (req, res) => {
  const a = await db.collection("assignments").findOne({ id: req.params.aid });
  if (!a) return res.status(404).json({ detail: "Not found" });
  const subs = await db.collection("submissions").find({ assignment_id: a.id }).toArray();
  const students = await db.collection("users").find({ role: "student", class_name: a.class_name }).toArray();
  const byStu = Object.fromEntries(subs.map(s => [s.student_id, s]));
  const rows = students.map(stu => {
    const s = byStu[stu.id];
    return { student_id: stu.id, student_name: stu.name, email: stu.email, enrollment_number: stu.enrollment_number || "", submitted: !!s, submission: s ? clean(s) : null };
  });
  res.json({ assignment: clean(a), rows });
});

app.post("/api/assignments/:aid/submit", auth, loadUser, requireRole("student"), async (req, res) => {
  const a = await db.collection("assignments").findOne({ id: req.params.aid });
  if (!a) return res.status(404).json({ detail: "Not found" });
  const existing = await db.collection("submissions").findOne({ assignment_id: a.id, student_id: req.user.id });
  const doc = {
    assignment_id: a.id, student_id: req.user.id, student_name: req.user.name,
    text_content: req.body.text_content || "", file_url: req.body.file_url || "",
    file_id: req.body.file_id || "", file_name: req.body.file_name || "",
    submitted_at: nowIso(), grade: existing?.grade || "", feedback: existing?.feedback || "",
  };
  if (existing) { doc.id = existing.id; await db.collection("submissions").updateOne({ id: existing.id }, { $set: doc }); }
  else { doc.id = uuidv4(); await db.collection("submissions").insertOne(doc); }
  res.json(clean(doc));
});

app.post("/api/assignments/:aid/grade/:sid", auth, loadUser, requireRole("teacher"), async (req, res) => {
  const r = await db.collection("submissions").updateOne(
    { assignment_id: req.params.aid, student_id: req.params.sid },
    { $set: { grade: req.body.grade || "", feedback: req.body.feedback || "", graded_at: nowIso() } }
  );
  if (r.matchedCount === 0) return res.status(404).json({ detail: "Submission not found" });
  res.json({ ok: true });
});

// ================ QUIZZES ================
app.post("/api/quizzes", auth, loadUser, requireRole("teacher"), async (req, res) => {
  const { title, subject_id, class_name, duration_min, questions, academic_year } = req.body || {};
  const subject = await db.collection("subjects").findOne({ id: subject_id });
  const doc = {
    id: uuidv4(), title, subject_id, subject_name: subject ? subject.name : "",
    class_name, academic_year: academic_year || "", duration_min: duration_min || 15,
    questions: questions || [], teacher_id: req.user.id, teacher_name: req.user.name,
    created_at: nowIso(),
  };
  await db.collection("quizzes").insertOne(doc);
  res.json(clean(doc));
});

app.get("/api/quizzes", auth, loadUser, async (req, res) => {
  const q = req.user.role === "teacher" ? { teacher_id: req.user.id } : { class_name: req.user.class_name || "" };
  if (req.query.subject_id) q.subject_id = req.query.subject_id;
  if (req.query.academic_year) q.academic_year = req.query.academic_year;
  const docs = await db.collection("quizzes").find(q).sort({ created_at: -1 }).toArray();
  const out = [];
  for (const d of docs) {
    const c = clean(d);
    c.question_count = (c.questions || []).length;
    if (req.user.role === "student") {
      const att = await db.collection("quiz_attempts").findOne({ quiz_id: c.id, student_id: req.user.id });
      c.my_attempt = att ? clean(att) : null;
      c.questions = (c.questions || []).map(q => ({ question: q.question, options: q.options, points: q.points || 1 }));
    }
    out.push(c);
  }
  res.json(out);
});

app.post("/api/quizzes/:qid/attempt", auth, loadUser, requireRole("student"), async (req, res) => {
  const quiz = await db.collection("quizzes").findOne({ id: req.params.qid });
  if (!quiz) return res.status(404).json({ detail: "Not found" });
  const existing = await db.collection("quiz_attempts").findOne({ quiz_id: quiz.id, student_id: req.user.id });
  if (existing) return res.status(400).json({ detail: "Already attempted" });
  const answers = req.body.answers || [];
  let score = 0, total = 0; const details = [];
  quiz.questions.forEach((q, i) => {
    const pts = q.points || 1; total += pts;
    const picked = answers[i] ?? -1;
    const correct = picked === q.correct_index;
    if (correct) score += pts;
    details.push({ picked, correct_index: q.correct_index, correct });
  });
  const percent = total ? Math.round((score / total) * 100) : 0;
  const doc = {
    id: uuidv4(), quiz_id: quiz.id, quiz_title: quiz.title, subject_name: quiz.subject_name,
    student_id: req.user.id, student_name: req.user.name, score, total, percent, details, attempted_at: nowIso(),
  };
  await db.collection("quiz_attempts").insertOne(doc);
  res.json(clean(doc));
});

app.get("/api/quizzes/:qid/analytics", auth, loadUser, requireRole("teacher"), async (req, res) => {
  const quiz = await db.collection("quizzes").findOne({ id: req.params.qid });
  if (!quiz) return res.status(404).json({ detail: "Not found" });
  const attempts = await db.collection("quiz_attempts").find({ quiz_id: quiz.id }).toArray();
  const scores = attempts.map(a => a.percent);
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const top = scores.length ? Math.max(...scores) : 0;
  const low = scores.length ? Math.min(...scores) : 0;
  const dist = { "0-40": 0, "40-60": 0, "60-80": 0, "80-100": 0 };
  scores.forEach(s => { if (s < 40) dist["0-40"]++; else if (s < 60) dist["40-60"]++; else if (s < 80) dist["60-80"]++; else dist["80-100"]++; });
  res.json({ quiz: clean(quiz), attempts: attempts.map(clean), stats: { avg, top, low, count: attempts.length, distribution: dist } });
});

// ================ NOTICES (real email) ================
app.post("/api/notices", auth, loadUser, async (req, res) => {
  const { title, body, audience = "all" } = req.body || {};
  const doc = {
    id: uuidv4(), title, body, audience,
    author_id: req.user.id, author_name: req.user.name, author_role: req.user.role,
    created_at: nowIso(),
  };
  await db.collection("notices").insertOne(doc);
  // Dispatch email in background
  (async () => {
    let filter = {};
    if (audience === "teachers") filter = { role: "teacher" };
    else if (audience === "students") filter = { role: "student" };
    const users = await db.collection("users").find(filter, { projection: { email: 1, name: 1, _id: 0 } }).toArray();
    const recipients = users.map(u => u.email).filter(Boolean);
    const html = `
      <table style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:auto;padding:24px;border:1px solid #eee;border-radius:12px">
        <tr><td>
          <div style="color:#4F46E5;font-size:12px;font-weight:700;letter-spacing:2px">AURACAMPUS NOTICE</div>
          <h2 style="margin:8px 0 12px 0;color:#0f172a">${title}</h2>
          <p style="color:#334155;line-height:1.6;white-space:pre-wrap">${body}</p>
          <p style="color:#64748b;font-size:12px;margin-top:24px">Posted by ${req.user.name} • ${new Date().toLocaleString()}</p>
        </td></tr>
      </table>`;
    // send one-by-one (small volume) to keep individual delivery
    let sent = 0;
    for (const to of recipients.slice(0, 200)) {
      const r = await sendEmail({ to, subject: `[AuraCampus] ${title}`, html });
      if (r) sent++;
    }
    console.log(`[notice] '${title}' delivered=${sent}/${recipients.length}`);
  })().catch(e => console.error("[notice-email]", e));
  res.json(clean(doc));
});

app.get("/api/notices", auth, loadUser, async (req, res) => {
  const q = { $or: [{ audience: "all" }, { audience: `${req.user.role}s` }] };
  const docs = await db.collection("notices").find(q).sort({ created_at: -1 }).toArray();
  res.json(docs.map(clean));
});

// ================ LOST & FOUND ================
app.post("/api/lostfound", auth, loadUser, async (req, res) => {
  const { title, description, location, kind = "lost", photo_url } = req.body || {};
  const doc = {
    id: uuidv4(), title, description, location, kind, photo_url: photo_url || "",
    author_id: req.user.id, author_name: req.user.name, author_role: req.user.role,
    resolved: false, created_at: nowIso(),
  };
  await db.collection("lostfound").insertOne(doc);
  res.json(clean(doc));
});
app.get("/api/lostfound", auth, async (req, res) => {
  const docs = await db.collection("lostfound").find({}).sort({ created_at: -1 }).toArray();
  res.json(docs.map(clean));
});
app.post("/api/lostfound/:id/resolve", auth, async (req, res) => {
  await db.collection("lostfound").updateOne({ id: req.params.id }, { $set: { resolved: true } });
  res.json({ ok: true });
});

// ================ DASHBOARD ================
app.get("/api/dashboard/stats", auth, loadUser, async (req, res) => {
  if (req.user.role === "teacher") {
    const [subjects, assignments, quizzes, attendance_sessions] = await Promise.all([
      db.collection("subjects").countDocuments({ teacher_id: req.user.id }),
      db.collection("assignments").countDocuments({ teacher_id: req.user.id }),
      db.collection("quizzes").countDocuments({ teacher_id: req.user.id }),
      db.collection("attendance_sessions").countDocuments({ teacher_id: req.user.id }),
    ]);
    return res.json({ subjects, assignments, quizzes, attendance_sessions });
  }
  const cls = req.user.class_name || "";
  const [assignments, quizzes, my_marks, total_sessions] = await Promise.all([
    db.collection("assignments").countDocuments({ class_name: cls }),
    db.collection("quizzes").countDocuments({ class_name: cls }),
    db.collection("attendance_marks").countDocuments({ student_id: req.user.id }),
    db.collection("attendance_sessions").countDocuments({ class_name: cls }),
  ]);
  const attendance_percent = total_sessions ? Math.round((my_marks / total_sessions) * 100) : 0;
  res.json({ assignments, quizzes, attendance_percent, total_sessions });
});

// ================ SEED + BOOT ================
async function seed() {
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@auracampus.com").toLowerCase();
  const adminPass = process.env.ADMIN_PASSWORD || "admin123";
  let admin = await db.collection("users").findOne({ email: adminEmail });
  let adminId;
  if (!admin) {
    adminId = uuidv4();
    await db.collection("users").insertOne({
      id: adminId, name: "AuraCampus Admin", email: adminEmail, role: "teacher",
      phone: "", department: "Administration", class_name: "", academic_year: "",
      subjects: ["Data Structures", "Web Technology"], enrollment_number: null,
      password_hash: hashPw(adminPass), created_at: nowIso(),
    });
    console.log("[seed] admin created:", adminEmail);
  } else adminId = admin.id;

  if (!(await db.collection("users").findOne({ email: "teacher@auracampus.com" }))) {
    await db.collection("users").insertOne({
      id: uuidv4(), name: "Prof. Anita Sharma", email: "teacher@auracampus.com", role: "teacher",
      phone: "9999999999", department: "Computer Engineering", class_name: "", academic_year: "",
      subjects: ["Data Structures", "Web Technology"], enrollment_number: null,
      password_hash: hashPw("teacher123"), created_at: nowIso(),
    });
  }
  const stu = await db.collection("users").findOne({ email: "student@auracampus.com" });
  if (!stu) {
    await db.collection("users").insertOne({
      id: uuidv4(), name: "Rohan Verma", email: "student@auracampus.com", role: "student",
      phone: "8888888888", department: "Computer Engineering", class_name: "SE-A", academic_year: "2025-26",
      subjects: [], enrollment_number: "AC2025001",
      password_hash: hashPw("student123"), created_at: nowIso(),
    });
  } else if (!stu.enrollment_number) {
    await db.collection("users").updateOne({ email: "student@auracampus.com" }, { $set: { enrollment_number: "AC2025001", academic_year: "2025-26" } });
  }

  const scount = await db.collection("subjects").countDocuments({ teacher_id: adminId });
  if (scount === 0) {
    const seeds = [
      { name: "Data Structures", code: "CS201", color: "indigo" },
      { name: "Web Technology", code: "CS305", color: "orange" },
      { name: "Database Management", code: "CS303", color: "teal" },
      { name: "Operating Systems", code: "CS302", color: "purple" },
    ];
    for (const s of seeds) {
      await db.collection("subjects").insertOne({
        id: uuidv4(), ...s, teacher_id: adminId, teacher_name: "AuraCampus Admin", created_at: nowIso(),
      });
    }
  }
}

(async () => {
  try {
    await connectDb();
    await seed();
    try { await initStorage(); console.log("[storage] initialized"); }
    catch (e) { console.warn("[storage] init deferred:", e.message); }
    app.listen(PORT, "127.0.0.1", () => console.log(`[express] listening on ${PORT}`));
  } catch (e) { console.error("[express] fatal:", e); process.exit(1); }
})();

process.on("SIGTERM", async () => { try { await client.close(); } catch {} process.exit(0); });
process.on("SIGINT", async () => { try { await client.close(); } catch {} process.exit(0); });
// Drop old strict enrollment_number index if present, then rebuild as partial
  // (unique only among string values — nulls/missing are allowed for teachers)
  try {
    const idx = await db.collection("users").indexes();
    for (const i of idx) {
      if (i.key && i.key.enrollment_number === 1 && !i.partialFilterExpression) {
        await db.collection("users").dropIndex(i.name);
      }
    }
  } catch {}
  await db.collection("users").createIndex(
    { enrollment_number: 1 },
    { unique: true, partialFilterExpression: { enrollment_number: { $type: "string" } } }
  );
  // Teacher: auto-create Subject docs so they show up in dropdowns immediately
  if (role === "teacher" && Array.isArray(subjects)) {
    const palette = ["indigo", "orange", "teal", "purple", "pink"];
    let idx = 0;
    for (const sname of subjects) {
      const s = String(sname).trim();
      if (!s) continue;
      await db.collection("subjects").insertOne({
        id: uuidv4(), name: s, code: s.split(/\s+/).map(w => w[0]).join("").toUpperCase() || "SUB",
        color: palette[idx++ % palette.length],
        teacher_id: id, teacher_name: name, created_at: nowIso(),
      });
    }
  }
 
// 2. Geofence Configuration & Helper
const CAMPUS_CONFIG = {
  LATITUDE: 18.6508,
  LONGITUDE: 73.7663,
  MAX_DISTANCE_METERS: 100
};

function calculateDistanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const radLat1 = (lat1 * Math.PI) / 180;
  const radLat2 = (lat2 * Math.PI) / 180;
  const deltaLat = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(radLat1) *
      Math.cos(radLat2) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ==========================================
// 3. PLACE YOUR CODE HERE (ROUTES SECTION)
// ==========================================
app.post("/attendance/mark", requireAuth, async (req, res) => {
  try {
    const { token, latitude, longitude } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        error: "Location verification failed. GPS coordinates are required."
      });
    }

    const distanceMeters = calculateDistanceInMeters(
      CAMPUS_CONFIG.LATITUDE,
      CAMPUS_CONFIG.LONGITUDE,
      parseFloat(latitude),
      parseFloat(longitude)
    );

    if (distanceMeters > CAMPUS_CONFIG.MAX_DISTANCE_METERS) {
      return res.status(403).json({
        error: `Off-campus attempt detected (${Math.round(distanceMeters)}m away). You must be at Pimpri Chinchwad Polytechnic to mark attendance.`
      });
    }

    // Existing Database & Attendance Logic Here...

    return res.json({ message: "Attendance marked successfully!" });
  } catch (err) {
    return res.status(500).json({ error: "Failed to process attendance." });
  }
});

// 4. Start Server (Must be at the very bottom)
app.listen(5000, () => console.log("Server running on port 5000"));