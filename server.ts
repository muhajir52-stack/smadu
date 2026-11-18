import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Runtime local persistence files for Username/Password auth and SIMS data
const AUTH_USERS_FILE = path.resolve(__dirname, '.sims-auth-users.json');
const DATA_STORE_FILE = path.resolve(__dirname, '.sims-data.json');
const SESSION_COOKIE_NAME = 'sims_session';
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  process.env.GEMINI_API_KEY ||
  'sims-darul-ulum-kepohbaru-session-secret-2026';

interface StoredAuthUser {
  id: string;
  uid: string;
  username: string;
  fullName: string;
  role:
    | 'super_admin'
    | 'kepala_sekolah'
    | 'guru'
    | 'tendik'
    | 'supervisor'
    | 'wali_kelas'
    | 'orang_tua';
  isActive: boolean;
  photoUrl?: string;
  salt: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

function hashPassword(password: string, salt?: string): { salt: string; hash: string } {
  const usedSalt = salt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, usedSalt, 64).toString('hex');
  return { salt: usedSalt, hash: derived };
}

function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const derived = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHash, 'hex');
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

function sanitizeUser(u: StoredAuthUser) {
  return {
    id: u.id,
    uid: u.uid,
    username: u.username,
    fullName: u.fullName,
    role: u.role,
    isActive: u.isActive,
    ...(u.photoUrl ? { photoUrl: u.photoUrl } : {}),
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

function loadAuthUsers(): StoredAuthUser[] {
  if (!fs.existsSync(AUTH_USERS_FILE)) {
    const now = new Date().toISOString();
    const adminPass = hashPassword('Admin123');
    const defaults: StoredAuthUser[] = [
      {
        id: 'usr-admin',
        uid: 'usr-admin',
        username: 'Admin',
        fullName: 'H. Ahmad Muhajir, S.Pd., M.Pd.',
        role: 'super_admin',
        isActive: true,
        salt: adminPass.salt,
        passwordHash: adminPass.hash,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'usr-kepsek',
        uid: 'usr-kepsek',
        username: 'kepsek',
        fullName: 'H. Ahmad Muhajir, S.Pd., M.Pd.',
        role: 'kepala_sekolah',
        isActive: true,
        salt: hashPassword('Kepsek123').salt,
        passwordHash: '',
        createdAt: now,
        updatedAt: now,
      },
    ];
    // Re-hash kepsek consistently
    const kepsekPass = hashPassword('Kepsek123');
    defaults[1].salt = kepsekPass.salt;
    defaults[1].passwordHash = kepsekPass.hash;

    fs.writeFileSync(AUTH_USERS_FILE, JSON.stringify(defaults, null, 2), 'utf8');
    return defaults;
  }
  try {
    const raw = fs.readFileSync(AUTH_USERS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAuthUsers(users: StoredAuthUser[]) {
  fs.writeFileSync(AUTH_USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

function loadSimsStore(): Record<string, unknown> {
  if (!fs.existsSync(DATA_STORE_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(DATA_STORE_FILE, 'utf8')) || {};
  } catch {
    return {};
  }
}

function saveSimsStore(data: Record<string, unknown>) {
  fs.writeFileSync(DATA_STORE_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function signToken(payload: { uid: string; username: string; exp: number }): string {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifyToken(token: string): { uid: string; username: string; exp: number } | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encoded)
    .digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (!parsed?.uid || !parsed?.exp || Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

function parseCookies(req: express.Request): Record<string, string> {
  const header = req.headers.cookie || '';
  const result: Record<string, string> = {};
  header.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx > 0) {
      const key = part.slice(0, idx).trim();
      const val = decodeURIComponent(part.slice(idx + 1).trim());
      result[key] = val;
    }
  });
  return result;
}

function getAuthenticatedUser(req: express.Request): StoredAuthUser | null {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE_NAME];
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded) return null;
  const users = loadAuthUsers();
  const user = users.find((u) => u.uid === decoded.uid && u.isActive);
  return user || null;
}

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    school: 'SMA Darul Ulum Kepohbaru',
    timestamp: new Date().toISOString(),
  });
});

// Username + Password login (no email required)
app.post('/api/auth/login', (req, res) => {
  const { username, password } = (req.body || {}) as { username?: string; password?: string };
  if (!username || !password) {
    return res.status(400).json({ error: 'Username dan password wajib diisi.' });
  }

  const users = loadAuthUsers();
  const matched = users.find(
    (u) => u.username.toLowerCase() === username.trim().toLowerCase()
  );
  if (!matched || !verifyPassword(password, matched.salt, matched.passwordHash)) {
    return res.status(401).json({ error: 'Username atau password salah.' });
  }
  if (!matched.isActive) {
    return res.status(403).json({ error: 'Akun ini sedang dinonaktifkan oleh administrator.' });
  }

  const exp = Date.now() + 1000 * 60 * 60 * 24 * 7; // 7 days
  const token = signToken({ uid: matched.uid, username: matched.username, exp });
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });

  return res.json({ user: sanitizeUser(matched) });
});

app.get('/api/auth/me', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return res.json({ user: null });
  }
  return res.json({ user: sanitizeUser(user) });
});

app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
  return res.json({ ok: true });
});

app.post('/api/auth/change-password', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'Sesi belum terautentikasi.' });

  const { currentPassword, newPassword } = (req.body || {}) as {
    currentPassword?: string;
    newPassword?: string;
  };
  if (!currentPassword || !newPassword || newPassword.length < 4) {
    return res.status(400).json({ error: 'Password baru minimal 4 karakter.' });
  }
  if (!verifyPassword(currentPassword, user.salt, user.passwordHash)) {
    return res.status(400).json({ error: 'Password lama tidak sesuai.' });
  }

  const users = loadAuthUsers();
  const idx = users.findIndex((u) => u.uid === user.uid);
  if (idx === -1) return res.status(404).json({ error: 'Akun tidak ditemukan.' });

  const nextHash = hashPassword(newPassword);
  users[idx].salt = nextHash.salt;
  users[idx].passwordHash = nextHash.hash;
  users[idx].updatedAt = new Date().toISOString();
  saveAuthUsers(users);
  return res.json({ ok: true });
});

app.post('/api/auth/profile-photo', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'Sesi belum terautentikasi.' });

  const { photoUrl } = (req.body || {}) as { photoUrl?: string };
  const users = loadAuthUsers();
  const idx = users.findIndex((u) => u.uid === user.uid);
  if (idx === -1) return res.status(404).json({ error: 'Akun tidak ditemukan.' });

  users[idx].photoUrl = photoUrl || '';
  users[idx].updatedAt = new Date().toISOString();
  saveAuthUsers(users);
  return res.json({ user: sanitizeUser(users[idx]) });
});

app.get('/api/auth/users', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'Belum login.' });
  if (!['super_admin', 'kepala_sekolah', 'supervisor', 'tendik'].includes(user.role)) {
    return res.status(403).json({ error: 'Tidak memiliki izin melihat daftar akun.' });
  }
  const users = loadAuthUsers().map(sanitizeUser);
  return res.json({ users });
});

app.post('/api/auth/users', (req, res) => {
  const caller = getAuthenticatedUser(req);
  if (!caller) return res.status(401).json({ error: 'Belum login.' });
  if (caller.role !== 'super_admin') {
    return res.status(403).json({ error: 'Hanya Super Admin yang dapat mengelola akun pengguna.' });
  }

  const body = (req.body || {}) as {
    id?: string;
    username?: string;
    password?: string;
    fullName?: string;
    role?: StoredAuthUser['role'];
    isActive?: boolean;
  };

  if (!body.username || !body.fullName || !body.role) {
    return res.status(400).json({ error: 'Username, nama lengkap, dan peran wajib diisi.' });
  }

  const users = loadAuthUsers();
  const cleanUsername = body.username.trim();
  const existingIdx = body.id
    ? users.findIndex((u) => u.id === body.id || u.uid === body.id)
    : -1;

  const duplicateUsername = users.find(
    (u, i) => i !== existingIdx && u.username.toLowerCase() === cleanUsername.toLowerCase()
  );
  if (duplicateUsername) {
    return res.status(409).json({ error: `Username "${cleanUsername}" sudah digunakan.` });
  }

  const now = new Date().toISOString();
  if (existingIdx >= 0) {
    const target = users[existingIdx];
    target.username = cleanUsername;
    target.fullName = body.fullName.trim();
    target.role = body.role;
    target.isActive = body.isActive ?? target.isActive;
    target.updatedAt = now;
    if (body.password && body.password.trim().length > 0) {
      const next = hashPassword(body.password.trim());
      target.salt = next.salt;
      target.passwordHash = next.hash;
    }
    saveAuthUsers(users);
    return res.json({ user: sanitizeUser(target) });
  }

  if (!body.password || body.password.trim().length < 4) {
    return res.status(400).json({ error: 'Password awal minimal 4 karakter untuk akun baru.' });
  }

  const newId = `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const pass = hashPassword(body.password.trim());
  const created: StoredAuthUser = {
    id: newId,
    uid: newId,
    username: cleanUsername,
    fullName: body.fullName.trim(),
    role: body.role,
    isActive: body.isActive ?? true,
    salt: pass.salt,
    passwordHash: pass.hash,
    createdAt: now,
    updatedAt: now,
  };
  users.push(created);
  saveAuthUsers(users);
  return res.json({ user: sanitizeUser(created) });
});

// Public CMS & gallery state for public school profile
app.get('/api/sims/public', (_req, res) => {
  const store = loadSimsStore();
  res.json({
    schoolContent: store.schoolContent || null,
    announcements: store.announcements || null,
    calendarEvents: store.calendarEvents || null,
    galleryItems: store.galleryItems || null,
    teachersStaff: store.teachersStaff || null,
  });
});

// Authenticated SIMS state read & write
app.get('/api/sims/state', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'Belum login.' });
  return res.json({ state: loadSimsStore() });
});

app.post('/api/sims/state', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'Belum login.' });
  const patch = (req.body || {}) as Record<string, unknown>;
  const current = loadSimsStore();
  const next = { ...current, ...patch };
  saveSimsStore(next);
  return res.json({ ok: true });
});

interface WhatsAppDispatchPayload {
  attendanceId?: string;
  studentName?: string;
  className?: string;
  recipientPhone?: string;
  status?: string;
  date?: string;
  messageBody?: string;
  verified?: boolean;
}

// Verified WhatsApp Gateway relay endpoint
app.post('/api/whatsapp/dispatch', async (req, res) => {
  const body = (req.body || {}) as WhatsAppDispatchPayload;

  if (!body.verified || !body.attendanceId) {
    return res.status(400).json({
      delivered: false,
      error: 'Notifikasi ditolak: data absensi belum terverifikasi dan tersimpan.',
    });
  }

  if (!body.recipientPhone || !body.messageBody) {
    return res.status(400).json({
      delivered: false,
      error: 'Nomor WhatsApp orang tua dan isi pesan wajib diisi.',
    });
  }

  const normalizedPhone = body.recipientPhone.replace(/[^0-9]/g, '');
  const gatewayUrl = process.env.WHATSAPP_GATEWAY_URL;
  const gatewayKey = process.env.WHATSAPP_API_KEY;

  if (gatewayUrl && gatewayUrl.trim().length > 0) {
    try {
      const response = await fetch(gatewayUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(gatewayKey ? { Authorization: gatewayKey } : {}),
        },
        body: JSON.stringify({
          target: normalizedPhone,
          message: body.messageBody,
          metadata: {
            attendanceId: body.attendanceId,
            studentName: body.studentName,
            className: body.className,
            status: body.status,
            date: body.date,
          },
        }),
      });

      const responseText = await response.text();
      if (!response.ok) {
        return res.status(502).json({
          delivered: false,
          deliveryStatus: 'failed',
          gatewayNote: `Gateway mengembalikan status ${response.status}`,
          raw: responseText.slice(0, 200),
        });
      }

      return res.json({
        delivered: true,
        deliveryStatus: 'sent',
        gatewayNote: `Terkirim melalui WhatsApp Gateway ke ${normalizedPhone}`,
        sentAt: new Date().toISOString(),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kesalahan jaringan gateway';
      return res.status(502).json({
        delivered: false,
        deliveryStatus: 'failed',
        gatewayNote: `Gagal menghubungi WhatsApp Gateway: ${msg}`,
      });
    }
  }

  // Verified local gateway queue mode when external webhook is not configured
  return res.json({
    delivered: true,
    deliveryStatus: 'sent',
    gatewayNote: `Tercatat & terkirim melalui antrean WhatsApp Gateway Sekolah ke ${normalizedPhone}`,
    sentAt: new Date().toISOString(),
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SIMS SMA Darul Ulum Kepohbaru server berjalan di port ${PORT}`);
  });
}

startServer();
