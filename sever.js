const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const session = require('express-session');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 3000;

// 1. Ma'lumotlar bazasi
const db = new sqlite3.Database(path.join(__dirname, 'users.db'));
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fullname TEXT,
        username TEXT UNIQUE,
        password TEXT
    )`);
});

// 2. Middleware (Frontenddan keladigan har qanday formatni o'qish uchun)
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: 'apelsin_secret_key',
    resave: true,
    saveUninitialized: false,
    cookie: { 
        maxAge: 24 * 60 * 60 * 1000,
        secure: false 
    }
}));

app.use(express.static(__dirname));

// 3. Nodemailer sozlamalari
const transporter = nodemailer.createTransport({
    host: "mail.spacemail.com",
    port: 465,
    secure: true, 
    auth: { user: "info@apelsin.space", pass: "Azizjon_08" },
    tls: { rejectUnauthorized: false }
});

// --- YO'LLAR (ROUTES) ---

// RO'YXATDAN O'TISH
app.post('/api/register', async (req, res) => {
    // Frontenddan kelayotgan barcha ehtimoliy nomlarni tekshiramiz
    const fullname = req.body.fullname || req.body.name || req.body.full_name;
    const email = req.body.email || req.body.username || req.body.user_email;
    const password = req.body.password || req.body.pass || req.body.user_password;

    console.log("Qabul qilingan ma'lumot:", { fullname, email, password });

    if (!fullname || !email || !password) {
        return res.json({ 
            status: "error", 
            message: "Ma'lumot yetarli emas! (Server fullname, email va password kutmoqda)" 
        });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run(`INSERT INTO users (fullname, username, password) VALUES (?, ?, ?)`, 
        [fullname, email.trim().toLowerCase(), hashedPassword], function(err) {
            if (err) return res.json({ status: "error", message: "Bu email band!" });
            res.json({ status: "success" });
        });
    } catch (e) {
        res.json({ status: "error", message: "Tizimda xato" });
    }
});

// LOGIN
app.post('/api/login', (req, res) => {
    const username = req.body.username || req.body.email;
    const password = req.body.password;

    if (!username || !password) {
        return res.json({ status: "error", message: "Login va parolni kiriting" });
    }

    db.get("SELECT * FROM users WHERE username = ?", [username.trim().toLowerCase()], async (err, row) => {
        if (err || !row) return res.json({ status: "error", message: "Foydalanuvchi topilmadi!" });

        const isMatch = await bcrypt.compare(password, row.password);
        if (isMatch) {
            const otpCode = Math.floor(100000 + Math.random() * 900000);
            req.session.pendingUser = row; 
            req.session.tempOTP = otpCode;

            transporter.sendMail({
                from: '"APELSIN" <info@apelsin.space>',
                to: username,
                subject: 'Tasdiqlash kodi',
                html: `<h1>Kod: ${otpCode}</h1>`
            }, (error) => {
                if (error) return res.json({ status: "error", message: "Email yuborilmadi" });
                res.json({ status: "otp_sent" });
            });
        } else {
            res.json({ status: "error", message: "Parol noto'g'ri" });
        }
    });
});

// OTP TASDIQLASH
app.post('/api/verify-otp', (req, res) => {
    const { code } = req.body;
    if (req.session.tempOTP && String(code) === String(req.session.tempOTP)) {
        req.session.user = req.session.pendingUser;
        delete req.session.tempOTP;
        res.json({ status: "success" });
    } else {
        res.json({ status: "error", message: "Kod xato" });
    }
});

// PROFIL YANGILASH
app.post('/api/update-profile', async (req, res) => {
    if (!req.session.user) return res.json({ status: 'error' });
    const { fullname, email, password } = req.body;
    const userId = req.session.user.id;

    try {
        let sql = "UPDATE users SET fullname = ?, username = ? WHERE id = ?";
        let params = [fullname, email.trim().toLowerCase(), userId];

        if (password && password.trim() !== "") {
            const hashedPassword = await bcrypt.hash(password, 10);
            sql = "UPDATE users SET fullname = ?, username = ?, password = ? WHERE id = ?";
            params = [fullname, email.trim().toLowerCase(), hashedPassword, userId];
        }

        db.run(sql, params, function(err) {
            if (err) return res.json({ status: 'error', message: "Email band" });
            req.session.user.fullname = fullname;
            req.session.user.username = email;
            res.json({ status: 'success' });
        });
    } catch (e) { res.json({ status: 'error' }); }
});

app.get('/api/me', (req, res) => {
    if (req.session.user) res.json({ status: "success", user: req.session.user });
    else res.json({ status: "error" });
});

app.get('/api/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, req.session.user ? 'index.html' : 'sign.html'));
});

app.listen(PORT, () => console.log(`🚀 Server http://localhost:${PORT} da tayyor`));