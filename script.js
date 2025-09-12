// --- الإعدادات الرئيسية ---
const API_URL = 'https://script.google.com/macros/s/AKfycbzYvHK3uzV57xHHKPkY2Jq3QxqMl8qUbvxm0LO2aZFAdJXHB7rIE71jbwCGwDSmEpFlmg/exec';

// --- دالة مساعدة للتواصل مع الـ API ---
async function callApi(action, payload = {}) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action, payload }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
    } catch (error) {
        console.error('API Call Error:', error);
        return { success: false, message: `فشل الاتصال: ${error.message}` };
    }
}

// --- منطق صفحة تسجيل الدخول ---
function handleLoginPage() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const messageElement = document.getElementById('message');
        const submitBtn = document.getElementById('submitBtn');
        messageElement.textContent = 'جاري التحقق...';
        submitBtn.disabled = true;

        const payload = {
            email: document.getElementById('email').value,
            password: document.getElementById('password').value,
        };
        const result = await callApi('login', payload);

        if (result.success) {
            // تخزين بيانات المستخدم في المتصفح
            localStorage.setItem('userData', JSON.stringify(result.user));
            // نقل المستخدم إلى واجهة الطالب
            window.location.href = 'student.html';
        } else {
            messageElement.textContent = result.message;
            messageElement.className = 'error';
        }
        submitBtn.disabled = false;
    });
}

// --- منطق صفحة إنشاء حساب ---
function handleRegisterPage() {
    const registerForm = document.getElementById('registerForm');
    if (!registerForm) return;

    const secQSelect = document.getElementById('secQ');
    callApi('getSecurityQuestions').then(result => {
        if (result.success) {
            secQSelect.innerHTML = result.questions
                .map((q, index) => `<option value="${index}">${q}</option>`)
                .join('');
        }
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const messageElement = document.getElementById('message');
        const submitBtn = document.getElementById('submitBtn');
        messageElement.textContent = 'جاري التسجيل...';
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
        const result = await callApi('register', payload);

        if (result.success) {
            messageElement.textContent = result.message;
            messageElement.className = 'success';
            setTimeout(() => { window.location.href = 'index.html'; }, 2000);
        } else {
            messageElement.textContent = result.message;
            messageElement.className = 'error';
            submitBtn.disabled = false;
        }
    });
}

// --- منطق صفحة الطالب ---
function handleStudentPage() {
    // التحقق من وجود بيانات مستخدم، وإلا يتم إرجاعه لصفحة الدخول
    const userDataString = localStorage.getItem('userData');
    if (!userDataString) {
        window.location.href = 'index.html';
        return;
    }
    const userData = JSON.parse(userDataString);

    // عرض بيانات المستخدم
    document.getElementById('studentName').textContent = `أهلاً بك, ${userData.name}`;
    document.getElementById('profilePic').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=FFCA28&color=212121`;

    // تسجيل الخروج
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('userData');
        window.location.href = 'index.html';
    });
    
    // تحميل الصفوف عند فتح الصفحة
    loadClasses();
}

async function loadClasses() {
    const select = document.getElementById('classSelect');
    const result = await callApi('getClasses');
    if (result.success) {
        populateSelect(select, result.data, '-- اختر الصف --');
    } else {
        // --- إضافة جديدة: إظهار رسالة خطأ للمستخدم ---
        select.innerHTML = '<option>-- فشل تحميل الصفوف --</option>';
        console.error('API Error:', result.message); // تسجيل الخطأ في الكونسول للمطور
    }
}

async function loadSubjects(selectedClass) {
    const subjectSelect = document.getElementById('subjectSelect');
    const chapterSelect = document.getElementById('chapterSelect');
    populateSelect(subjectSelect, [], '-- اختر المادة --');
    subjectSelect.disabled = true;
    populateSelect(chapterSelect, [], '-- اختر الفصل --');
    chapterSelect.disabled = true;
    document.getElementById('lessonsList').innerHTML = '<li class="empty-state">اختر من القوائم أعلاه لعرض الدروس</li>';

    if (!selectedClass) return;
    const result = await callApi('getSubjects', { selectedClass });
    if (result.success) {
        populateSelect(subjectSelect, result.data, '-- اختر المادة --');
        subjectSelect.disabled = false;
    }
}

async function loadChapters(selectedSubject) {
    const chapterSelect = document.getElementById('chapterSelect');
    populateSelect(chapterSelect, [], '-- اختر الفصل --');
    chapterSelect.disabled = true;
     document.getElementById('lessonsList').innerHTML = '<li class="empty-state">اختر من القوائم أعلاه لعرض الدروس</li>';

    if (!selectedSubject) return;
    const selectedClass = document.getElementById('classSelect').value;
    const result = await callApi('getChapters', { selectedClass, selectedSubject });
    if (result.success) {
        populateSelect(chapterSelect, result.data, '-- اختر الفصل --');
        chapterSelect.disabled = false;
    }
}

async function loadLessons() {
    const lessonsList = document.getElementById('lessonsList');
    lessonsList.innerHTML = '<li class="empty-state"><div class="spinner"></div></li>';

    const payload = {
        selectedClass: document.getElementById('classSelect').value,
        selectedSubject: document.getElementById('subjectSelect').value,
        selectedChapter: document.getElementById('chapterSelect').value,
        userEmail: JSON.parse(localStorage.getItem('userData')).email
    };
    
    if(!payload.selectedChapter) {
        lessonsList.innerHTML = '<li class="empty-state">اختر من القوائم أعلاه لعرض الدروس</li>';
        return;
    }

    const result = await callApi('getLessons', payload);

    if (result.success && result.data.length > 0) {
        lessonsList.innerHTML = result.data.map(lesson => {
            const scoreHtml = lesson.score != null 
                ? `<span class="lesson-score">${parseFloat(lesson.score).toFixed(1)}/10</span>` 
                : `<span class="lesson-score no-score">لم يختبر</span>`;
            return `<li><span class="lesson-title">${lesson.sequence}. ${lesson.name}</span> ${scoreHtml}</li>`;
        }).join('');
    } else {
        lessonsList.innerHTML = '<li class="empty-state">لا توجد دروس متاحة في هذا الفصل بعد.</li>';
    }
}

function populateSelect(selectElement, options, defaultText) {
    selectElement.innerHTML = `<option value="">${defaultText}</option>`;
    options.forEach(option => {
        selectElement.innerHTML += `<option value="${option}">${option}</option>`;
    });
}

// --- الموجه الرئيسي للواجهة الأمامية ---
document.addEventListener('DOMContentLoaded', () => {
    // يحدد أي صفحة نحن فيها ويشغل الكود الخاص بها فقط
    const page = window.location.pathname.split('/').pop();
    if (page === 'index.html' || page === 'login.html' || page === '') {
        handleLoginPage();
    } else if (page === 'register.html') {
        handleRegisterPage();
    } else if (page === 'student.html') {
        handleStudentPage();
    }
});



