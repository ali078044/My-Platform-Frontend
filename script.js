// --- الإعدادات الرئيسية ---
// !!! هام جدًا: الصق رابط الـ API الذي نسخته هنا !!!
const API_URL = 'https://script.google.com/macros/s/AKfycbx5ruCcT-z7sNf2NXwg3g5nt4Wktuqe0pCVtUn4ep59dVrctswDklsxJQmMSzafIQwmxQ/exec';

// --- دالة مساعدة للتواصل مع الـ API ---
async function callApi(action, payload) {
    const response = await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ action, payload }),
        headers: {
            'Content-Type': 'text/plain;charset=utf-8', // Apps Script يتعامل مع text/plain أفضل في بعض الحالات
        },
    });
    return response.json();
}

// --- منطق صفحة تسجيل الدخول ---
function handleLoginPage() {
    const loginForm = document.getElementById('loginForm');
    const messageElement = document.getElementById('message');
    const submitBtn = document.getElementById('submitBtn');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            messageElement.textContent = 'جاري التحقق...';
            messageElement.className = '';
            submitBtn.disabled = true;

            const payload = {
                email: document.getElementById('email').value,
                password: document.getElementById('password').value,
            };

            const result = await callApi('login', payload);

            if (result.success) {
                messageElement.textContent = `مرحباً ${result.user.name}! ${result.message}`;
                messageElement.className = 'success';
                // لاحقًا: سنقوم بتخزين التوكن ونقل المستخدم لواجهة الطالب
                // localStorage.setItem('authToken', result.token);
                // window.location.href = 'student.html';
            } else {
                messageElement.textContent = result.message;
                messageElement.className = 'error';
            }
            submitBtn.disabled = false;
        });
    }
}

// --- منطق صفحة إنشاء حساب جديد ---
function handleRegisterPage() {
    const registerForm = document.getElementById('registerForm');
    const messageElement = document.getElementById('message');
    const submitBtn = document.getElementById('submitBtn');
    const secQSelect = document.getElementById('secQ');

    if (registerForm) {
        // 1. جلب أسئلة الأمان أولاً
        callApi('getSecurityQuestions', {}).then(result => {
            if (result.success && secQSelect) {
                secQSelect.innerHTML = result.questions
                    .map((q, index) => `<option value="${index}">${q}</option>`)
                    .join('');
            }
        });

        // 2. عند الضغط على زر التسجيل
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            messageElement.textContent = 'جاري التسجيل...';
            messageElement.className = '';
            submitBtn.disabled = true;

            const payload = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                password: document.getElementById('password').value,
                phone: document.getElementById('phone').value,
                dob: document.getElementById('dob').value,
                motherName: document.getElementById('motherName').value,
                secQIndex: document.getElementById('secQ').value,
                secQAnswer: document.getElementById('secA').value,
            };
            
            // تحقق بسيط من أن الحقول ليست فارغة
            for (const key in payload) {
                if (!payload[key]) {
                    messageElement.textContent = 'يرجى ملء جميع الحقول.';
                    messageElement.className = 'error';
                    submitBtn.disabled = false;
                    return;
                }
            }
            
            const result = await callApi('register', payload);

            if (result.success) {
                messageElement.textContent = result.message;
                messageElement.className = 'success';
                setTimeout(() => {
                    window.location.href = 'login.html'; // نقل المستخدم لصفحة الدخول بعد ثانيتين
                }, 2000);
            } else {
                messageElement.textContent = result.message;
                messageElement.className = 'error';
                submitBtn.disabled = false;
            }
        });
    }
}


// --- تشغيل الدوال بناءً على الصفحة الحالية ---
// هذا الكود يحدد أي صفحة نحن فيها (login أو register) ويشغل المنطق الخاص بها فقط
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('loginForm')) {
        handleLoginPage();
    }
    if (document.getElementById('registerForm')) {
        handleRegisterPage();
    }
});
