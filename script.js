/**
 * ==============================================================================
 * PROJECT     : Apelsin Space - Unified Script
 * VERSION     : 16.0.0 (Profile & UI Fixed)
 * ==============================================================================
 */

// 1. KONFIGURATSIYA
const APELSIN_CONFIG = {
    founder: "Xabibullayev Azizjon",
    telegram: {
        token: "8564252942:AAGqfSWxcItGdDcgGw0Buru49DWZQ5g5qk4",
        chat_id: "5231166345"
    },
    games: {
        "Minecraft": "150,000 so'm",
        "GTA V": "220,000 so'm",
        "CS 2 (Prime)": "185,000 so'm",
        "FC 24": "480,000 so'm",
        "Valorant": "120,000 so'mdan"
    }
};

const AI_SETTINGS = {
    key: "m3A2qqlHmjezwk1DO21saJ3ATwzLyPFX",
    url: "https://api.mistral.ai/v1/chat/completions",
    model: "mistral-small"
};

// 2. TELEGRAMGA YUBORISH MARKAZI
async function sendToTelegram(text) {
    const url = `https://api.telegram.org/bot${APELSIN_CONFIG.telegram.token}/sendMessage`;
    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: APELSIN_CONFIG.telegram.chat_id,
                text: text,
                parse_mode: 'HTML'
            })
        });
    } catch (e) { console.error("Telegram xatoligi:", e); }
}

// 3. FOYDALANUVCHI SESSIYASINI TEKSHIRISH (Profil uchun)
function checkAuth() {
    fetch('/api/me')
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                document.getElementById('guest-links').style.display = 'none';
                document.getElementById('user-profile').style.display = 'flex';
                document.getElementById('welcome-msg').innerText = data.user.fullname;
                
                // Modalni to'ldirish
                document.getElementById('edit-fullname').value = data.user.fullname;
                document.getElementById('edit-username').value = data.user.username;
            }
        }).catch(e => console.log("Avtorizatsiya tekshirilmadi."));
}

// 4. PROFIL FUNKSIYALARI
window.toggleProfileModal = function() {
    const modal = document.getElementById('profileModal');
    if (modal) {
        modal.style.display = (modal.style.display === 'none' || modal.style.display === '') ? 'block' : 'none';
    }
};

window.saveProfileChanges = function() {
    const newFullname = document.getElementById('edit-fullname').value;
    if(!newFullname) return alert("Ismni kiriting");

    fetch('/api/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullname: newFullname })
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            alert("Ma'lumotlar yangilandi!");
            location.reload();
        } else {
            alert("Xatolik: " + data.message);
        }
    });
};

// 5. CHATBOT LOGIKASI
let chatHistory = [{
    role: "system",
    content: `Siz Apelsin Space AI yordamchisiz. Narxlar: ${JSON.stringify(APELSIN_CONFIG.games)}.`
}];

window.sendMessage = async function() {
    const input = document.getElementById('chat-input');
    const content = document.getElementById('chat-content');
    const val = input.value?.trim();
    if (!val) return;

    content.innerHTML += `<div class="msg user">${val}</div>`;
    input.value = "";
    content.scrollTop = content.scrollHeight;

    const loadingId = "ai-" + Date.now();
    content.innerHTML += `<div class="msg bot" id="${loadingId}">...</div>`;
    content.scrollTop = content.scrollHeight;

    try {
        const response = await fetch(AI_SETTINGS.url, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${AI_SETTINGS.key}`, 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
                model: AI_SETTINGS.model,
                messages: [...chatHistory, { role: "user", content: val }],
                temperature: 0.3
            })
        });

        const data = await response.json();
        const aiReply = data.choices[0].message.content;

        document.getElementById(loadingId).innerHTML = aiReply.replace(/\n/g, '<br>');
        content.scrollTop = content.scrollHeight;

        const chatLog = `<b>🤖 AI CHAT</b>\n<b>Mijoz:</b> ${val}\n<b>Bot:</b> ${aiReply}`;
        sendToTelegram(chatLog);
    } catch (e) {
        document.getElementById(loadingId).innerText = "Aloqa uzildi.";
    }
};

// 6. TIL VA TRANSLATION
const translations = {
    uz: {
        nav_1: "Xizmatlar", nav_3: "Aloqa",
        h_title: "Sizning G'oyangiz — Bizning Yechimimiz",
        h_sub: "Apelsin SPACE professional veb-dizayn va gaming loyihalari.",
        h_btn: "Xizmatlarni Ko'rish",
        p_name: "Ismingiz", p_email: "Emailingiz", p_msg: "Xabaringiz"
    },
    en: {
        nav_1: "Services", nav_3: "Contact",
        h_title: "Your Idea — Our Solution",
        h_sub: "Apelsin SPACE creates professional web design and gaming projects.",
        h_btn: "View Services",
        p_name: "Your Name", p_email: "Your Email", p_msg: "Your Message"
    }
};

function updateLanguage(lang) {
    document.querySelectorAll('[data-key]').forEach(el => {
        const key = el.getAttribute('data-key');
        if (translations[lang][key]) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = translations[lang][key];
            } else {
                el.textContent = translations[lang][key];
            }
        }
    });
    localStorage.setItem('site_lang', lang);
}

// 7. INITIALIZATION (Barcha eventlar shu yerda)
document.addEventListener('DOMContentLoaded', () => {
    checkAuth(); // Avtorizatsiyani tekshirish

    // Formani yuborish
    const contactForm = document.querySelector('.contact-form') || document.querySelector('form');
    contactForm?.addEventListener('submit', async function(e) {
        e.preventDefault();
        const btn = this.querySelector('button');
        btn.disabled = true;
        btn.innerText = "Yuborilmoqda...";

        const fd = new FormData(this);
        let msg = `<b>🚀 YANGI ARIZA</b>\n<b>Ism:</b> ${fd.get('Ism')}\n<b>Email:</b> ${fd.get('Email')}\n<b>Xabar:</b> ${fd.get('Xabar')}`;

        await sendToTelegram(msg);
        showAlert("Muvaffaqiyatli!", "Xabaringiz qabul qilindi.");
        this.reset();
        btn.disabled = false;
        btn.innerText = "Yuborish";
    });

    // Chat Enter tugmasi
    document.getElementById('chat-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') window.sendMessage();
    });

    // Tilni yuklash
    const savedLang = localStorage.getItem('site_lang') || 'uz';
    const langSel = document.getElementById('langSelect');
    if(langSel) {
        langSel.value = savedLang;
        langSel.addEventListener('change', (e) => updateLanguage(e.target.value));
    }
    updateLanguage(savedLang);

    // AOS Init
    if(typeof AOS !== 'undefined') AOS.init({ duration: 1000, once: true });

    // Cursor Effect
    const dot = document.getElementById('cursor-dot');
    const outline = document.getElementById('cursor-outline');
    let mx = 0, my = 0, ox = 0, oy = 0;
    window.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; if(dot) dot.style.transform = `translate(${mx - 4}px, ${my - 4}px)`; });
    const animateCursor = () => { ox += (mx - ox) * 0.15; oy += (my - oy) * 0.15; if(outline) outline.style.transform = `translate(${ox - 20}px, ${oy - 20}px)`; requestAnimationFrame(animateCursor); };
    animateCursor();
});

// 8. UI FUNKSIYALARI
window.showAlert = function(title, message) {
    const alertBox = document.getElementById('custom-alert');
    if(alertBox) {
        document.getElementById('alert-title').innerText = title;
        document.getElementById('alert-message').innerText = message;
        alertBox.style.display = 'flex';
        setTimeout(() => alertBox.classList.add('active'), 10);
    }
};

window.closeAlert = function() {
    const alertBox = document.getElementById('custom-alert');
    if(alertBox) {
        alertBox.classList.remove('active');
        setTimeout(() => alertBox.style.display = 'none', 300);
    }
};

window.toggleChat = function() {
    const win = document.getElementById('chat-window');
    if(win) win.style.display = (win.style.display === 'none' || win.style.display === '') ? 'flex' : 'none';
};

window.saveProfileChanges = async function() {
    const fullname = document.getElementById('edit-fullname').value;
    const email = document.getElementById('edit-username').value; // Bu yerda email nazarda tutilgan
    const password = document.getElementById('edit-password').value;

    if (!fullname || !email) {
        return alert("Ism va Email bo'sh bo'lmasligi kerak!");
    }

    try {
        const res = await fetch('/api/update-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                fullname: fullname, 
                email: email, 
                password: password // Agar bo'sh bo'lsa, server parolni o'zgartirmaydi
            })
        });
        
        const data = await res.json();
        
        if (data.status === 'success') {
            alert("Ma'lumotlar muvaffaqiyatli yangilandi!");
            location.reload();
        } else {
            alert("Xatolik: " + data.message);
        }
    } catch (e) {
        console.error("Yangilashda xato:", e);
        alert("Server bilan aloqa uzildi.");
    }
};

async function loadProfile() {
    const res = await fetch('/api/me');
    const data = await res.json();
    if(data.status === 'success') {
        // Ismni ekranga chiqarish
        document.getElementById('user-name').innerText = data.user.fullname;
        // Modal ichidagi inputlarga qiymat berish
        document.getElementById('edit-fullname').value = data.user.fullname;
        document.getElementById('edit-email').value = data.user.username;
    }
}
window.onload = loadProfile;