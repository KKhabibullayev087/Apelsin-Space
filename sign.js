const TG_CONFIG = {
    token: "8564252942:AAGqfSWxcItGdDcgGw0Buru49DWZQ5g5qk4",
    chat_id: "5231166345"
};

let recoveryData = { type: '', email: '', code: '' };

// --- TABLARNI ALMASHISH ---
function switchTab(type) {
    const isLogin = type === 'login';
    const loginSection = document.getElementById('login-section');
    const registerSection = document.getElementById('register-section');
    const recoverySection = document.getElementById('recovery-section');
    const authTabs = document.getElementById('authTabs');

    if (loginSection) loginSection.style.display = isLogin ? 'block' : 'none';
    if (registerSection) registerSection.style.display = isLogin ? 'none' : 'block';
    
    document.getElementById('tab-login').classList.toggle('active', isLogin);
    document.getElementById('tab-register').classList.toggle('active', !isLogin);
    
    if (recoverySection) recoverySection.style.display = 'none';
    if (authTabs) authTabs.style.display = 'flex';
}

// --- KIRISH JARAYONI (OTP BILAN) ---
const signInForm = document.getElementById('signInForm');
if (signInForm) {
    signInForm.onsubmit = async (e) => {
        e.preventDefault();
        const email = e.target.Email.value;
        const password = e.target.Parol.value;

        try {
            // 1-QADAM: Login va Parolni tekshirish
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ username: email, password: password })
            });
            const data = await res.json();

            if (data.status === "otp_sent") {
                showAlert("Kod yuborildi", "Emailingizga kirish kodi yuborildi. Uni kiriting.");
                
                // 2-QADAM: OTP Kodni so'rash (Prompt orqali)
                const userOTP = prompt("Spaceship Emailingizga kelgan 6 xonali kodni kiriting:");
                
                if (userOTP) {
                    const verifyRes = await fetch('/api/verify-otp', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ code: userOTP })
                    });
                    const verifyData = await verifyRes.json();

                    if (verifyData.status === "success") {
                        showAlert("Muvaffaqiyat", "Tizimga kirildi! Yo'naltirilmoqda...");
                        setTimeout(() => {
                            window.location.href = "/"; // Endi index.html ochiladi
                        }, 1500);
                    } else {
                        showAlert("Xato", verifyData.message);
                    }
                }
            } else {
                showAlert("Xato", data.message);
            }
        } catch (err) {
            showAlert("Xato", "Server bilan bog'lanishda muammo yuz berdi.");
        }
    };
}

// --- RO'YXATDAN O'TISH ---
const signUpForm = document.getElementById('signUpForm');
if (signUpForm) {
    signUpForm.onsubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/register', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ 
                    fullname: e.target.Ism.value, 
                    username: e.target.Email.value, 
                    password: e.target.Parol.value 
                })
            });
            const data = await res.json();
            
            if(data.status === "success") {
                showAlert("Tabriklaymiz", "Muvaffaqiyatli ro'yxatdan o'tdingiz! Endi kirishingiz mumkin.");
                setTimeout(() => switchTab('login'), 2000);
            } else {
                showAlert("Xato", data.message);
            }
        } catch (err) {
            showAlert("Xato", "Ro'yxatdan o'tishda muammo yuz berdi.");
        }
    };
}

// --- TIKLASH JARAYONI (TELEGRAM ORQALI) ---
function showRecoveryStart() {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('register-section').style.display = 'none';
    document.getElementById('authTabs').style.display = 'none';
    document.getElementById('recovery-section').style.display = 'block';
    showRecStep(1);
}

function showRecStep(n) {
    for(let i=1; i<=4; i++) {
        const step = document.getElementById(`rec-step-${i}`);
        if (step) step.style.display = (i === n) ? 'block' : 'none';
    }
}

function setRecType(type) {
    recoveryData.type = type;
    const title = document.getElementById('rec-title');
    if (title) title.innerText = type === 'login' ? "Yangi login uchun email" : "Parolni tiklash uchun email";
    showRecStep(2);
}

async function sendCode(e) {
    e.preventDefault();
    const emailInput = document.getElementById('rec-email');
    recoveryData.email = emailInput.value;
    recoveryData.code = Math.floor(1000 + Math.random() * 9000);
    
    const text = `<b>🔔 TIKLASH KODI</b>\n\n📧 Email: <code>${recoveryData.email}</code>\n🔢 Kod: <b>${recoveryData.code}</b>\nℹ️ Tur: ${recoveryData.type}`;
    
    try {
        const response = await fetch(`https://api.telegram.org/bot${TG_CONFIG.token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TG_CONFIG.chat_id,
                text: text,
                parse_mode: 'HTML'
            })
        });

        if (response.ok) {
            showAlert("Yuborildi", "Tasdiqlash kodi Telegram botga yuborildi!");
            showRecStep(3);
        } else {
            throw new Error("Telegramga yuborishda xato");
        }
    } catch (error) {
        showAlert("Xato", "Botga kod yuborishda muammo bo'ldi.");
    }
}

function verifyCode(e) {
    e.preventDefault();
    const inputCode = document.getElementById('rec-code').value;
    
    if(inputCode == recoveryData.code) {
        document.getElementById('final-rec-title').innerText = recoveryData.type === 'login' ? "Yangi loginni yozing" : "Yangi parolni yozing";
        document.getElementById('final-input').placeholder = recoveryData.type === 'login' ? "Yangi email manzili" : "Yangi maxfiy parol";
        showRecStep(4);
    } else {
        showAlert("Xato", "Tasdiqlash kodi noto'g'ri!");
    }
}

async function finishRecovery(e) {
    e.preventDefault();
    const newVal = document.getElementById('final-input').value;
    
    try {
        const res = await fetch('/api/update', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                email: recoveryData.email, 
                type: recoveryData.type === 'login' ? 'username' : 'password', 
                value: newVal 
            })
        });
        const data = await res.json();
        
        if (data.status === "success") {
            showAlert("Muvaffaqiyat", data.message);
            setTimeout(() => location.reload(), 2000);
        } else {
            showAlert("Xato", data.message);
        }
    } catch (err) {
        showAlert("Xato", "Server bilan bog'lanishda muammo!");
    }
}

function backToMain() { location.reload(); }

// --- ALERT ---
function showAlert(title, msg) {
    const alertBox = document.getElementById('custom-alert');
    if (alertBox) {
        document.getElementById('alert-title').innerText = title;
        document.getElementById('alert-message').innerText = msg;
        alertBox.style.display = 'flex';
    } else {
        alert(`${title}: ${msg}`);
    }
}

function closeAlert() { 
    const alertBox = document.getElementById('custom-alert');
    if (alertBox) alertBox.style.display = 'none'; 
}