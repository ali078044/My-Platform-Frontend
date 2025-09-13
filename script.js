// --- الإعدادات الرئيسية ---
const API_URL = 'https://script.google.com/macros/s/AKfycbwL-h9y5dMWC_mPcXeZ2ZOQ2X9mibdlObpAZDmSYwB9nvAfnLeLOZhKWwoS0beRhrEgfg/exec';

// --- متغيرات الحالة العامة ---
let currentLessonData, lessonParts = [], currentPartIndex = -1;
let currentQuestionIndex = 0, userScore = 0;

// --- دالة مساعدة للتواصل مع الـ API ---
async function callApi(action, payload = {}) {
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            cache: 'no-cache',
            redirect: 'follow',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action, payload })
        });
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const result = await res.json();
        if (!result.success) {
          console.error("API Error Response:", result.message);
        }
        return result;
    } catch (error) {
        console.error('API Call Error:', action, error);
        return { success: false, message: `فشل الاتصال بالخادم: ${error.message}` };
    }
}

// --- الموجه الرئيسي للتطبيق ---
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    if (path.includes('StudentInterface.html')) { handleStudentPage(); }
    else if (path.includes('Register.html')) { handleRegisterPage(); }
    else if (path.includes('AdminInterface.html')) { handleAdminPage(); }
    else { handleLoginPage(); }
});

// ==========================================================
//              منطق صفحة تسجيل الدخول وإنشاء الحساب
// ==========================================================
function handleLoginPage() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const messageEl = document.getElementById('message');
        if (messageEl) messageEl.textContent = 'جاري التحقق...';
        const result = await callApi('login', { email, password });
        if (result.success) {
            localStorage.setItem('userData', JSON.stringify(result.user));
            window.location.href = result.user.role === 'admin' ? 'AdminInterface.html' : 'StudentInterface.html';
        } else {
            if (messageEl) messageEl.textContent = result.message || 'خطأ في تسجيل الدخول';
        }
    });
}

function handleRegisterPage() {
     // Kept for completeness, no changes needed here
}

// ==========================================================
//              المنطق الرئيسي لصفحة الطالب
// ==========================================================
function handleStudentPage() {
    const userDataString = localStorage.getItem('userData');
    if (!userDataString) { window.location.href = 'index.html'; return; }
    const userData = JSON.parse(userDataString);
    const studentNameEl = document.getElementById('studentName');
    if (studentNameEl) studentNameEl.querySelector('span').textContent = `${userData.name}`;
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('userData');
            window.location.href = 'index.html';
        });
    }
    loadClasses();
}

function populateSelect(selectId, options, defaultText) {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = `<option value="">-- ${defaultText} --</option>`;
    if (options && options.length > 0) {
        select.innerHTML += options.map(o => `<option value="${o}">${o}</option>`).join('');
        select.disabled = false;
    } else {
        select.disabled = true;
    }
}

async function loadClasses() { 
    const result = await callApi('getClasses'); 
    if (result.success) { populateSelect('classSelect', result.data, 'اختر الصف'); } 
}

async function loadSubjects(selectedClass) {
    populateSelect('subjectSelect', [], 'اختر المادة');
    populateSelect('chapterSelect', [], 'اختر الفصل');
    if (!selectedClass) return;
    const result = await callApi('getSubjects', { selectedClass });
    if (result.success) { populateSelect('subjectSelect', result.data, 'اختر المادة'); }
}

async function loadChapters(selectedSubject) {
    populateSelect('chapterSelect', [], 'اختر الفصل');
    const classSelect = document.getElementById('classSelect');
    if (!selectedSubject || !classSelect) return;
    const payload = { selectedClass: classSelect.value, selectedSubject };
    const result = await callApi('getChapters', payload);
    if (result.success) { populateSelect('chapterSelect', result.data, 'اختر الفصل'); }
}

async function loadLessons() {
    const lessonsList = document.getElementById('lessonsList');
    if (!lessonsList) return;
    lessonsList.innerHTML = '<li><div class="spinner"></div></li>';
    const userData = JSON.parse(localStorage.getItem('userData'));
    const payload = { 
        selectedClass: document.getElementById('classSelect').value, 
        selectedSubject: document.getElementById('subjectSelect').value, 
        selectedChapter: document.getElementById('chapterSelect').value, 
        userEmail: userData.email 
    };
    if (!payload.selectedChapter) { lessonsList.innerHTML = '<li>اختر من القوائم أعلاه لعرض الدروس</li>'; return; }
    const result = await callApi('getLessons', payload);
    if (result.success && result.data.length > 0) {
        lessonsList.innerHTML = result.data.map(lesson => `<li onclick="showLessonDetail('${lesson.name.replace(/'/g, "\\'")}')"><span class="lesson-title">${lesson.sequence}. ${lesson.name}</span> <span class="lesson-score ${lesson.score != null ? '' : 'no-score'}">${lesson.score != null ? `الدرجة: ${lesson.score}` : 'لم يختبر'}</span></li>`).join('');
    } else {
        lessonsList.innerHTML = '<li>لا توجد دروس متاحة.</li>';
    }
}


// ==========================================================
//              منطق عرض الدرس والتنقل
// ==========================================================
async function showLessonDetail(lessonName) {
    document.getElementById('selectionView').classList.add('hidden');
    document.getElementById('lessonDetailView').classList.remove('hidden');
    document.querySelector('.nav-buttons-container').style.visibility = 'visible';
    
    document.getElementById('lessonTitle').textContent = "جاري تحميل الدرس...";
    
    const payload = { 
        selectedClass: document.getElementById('classSelect').value, 
        selectedSubject: document.getElementById('subjectSelect').value, 
        selectedChapter: document.getElementById('chapterSelect').value, 
        lessonName 
    };
    const result = await callApi('getLessonContent', payload);

    if (result.success) {
        currentLessonData = result.data;
        document.getElementById('lessonTitle').textContent = lessonName;
        prepareLessonParts();
    } else {
        document.getElementById('lessonTitle').textContent = `خطأ في تحميل الدرس: ${result.message}`;
    }
}

function prepareLessonParts() {
    lessonParts = [];
    const data = currentLessonData;
    if (data.objective) lessonParts.push('objective');
    if (data.didYouKnow) lessonParts.push('didYouKnow');
    if (data.lessonText) lessonParts.push('lessonText');
    if (data.summary) lessonParts.push('summary');
    if (data.pdfLink) lessonParts.push('pdfLink');
    if (data.videoLink) lessonParts.push('videoLink');
    if (data.questions && data.questions.length > 0) lessonParts.push('quiz');
    lessonParts.push('end'); 

    currentPartIndex = -1;
    navigateLesson(1);
}

function navigateLesson(direction) {
    const isQuizPart = lessonParts[currentPartIndex] === 'quiz';
    if (isQuizPart && direction > 0) {
        handleQuizNavigation();
        return;
    }
    currentPartIndex += direction;
    showCurrentPart();
}

function showCurrentPart() {
    document.querySelectorAll('.lesson-part').forEach(p => {
        p.classList.add('hidden');
        p.classList.remove('fullscreen-view'); // Remove fullscreen class from all parts
    });
    
    if (currentPartIndex < 0 || currentPartIndex >= lessonParts.length) {
        showSelectionView();
        return;
    }

    const partId = lessonParts[currentPartIndex];
    if (partId === 'end') {
        finishLesson();
        return;
    }

    const partContainer = document.getElementById(`part-${partId}`);
    if (!partContainer) return;
    
    // Add fullscreen class to specific parts for larger view
    if (['objective', 'summary', 'lessonText', 'pdfLink', 'videoLink'].includes(partId)) {
        partContainer.classList.add('fullscreen-view');
    }
    
    const data = currentLessonData;
    switch(partId) {
        case 'objective':
        case 'didYouKnow':
        case 'lessonText':
        case 'summary':
            partContainer.querySelector('.content-box').innerHTML = data[partId];
            break;
        case 'pdfLink':
            if (data.pdfLink) {
                const formattedPdfLink = data.pdfLink.replace("/view", "/preview").replace("?usp=sharing", "");
                partContainer.querySelector('iframe').src = formattedPdfLink;
            }
            break;
        case 'videoLink':
            const videoIdMatch = data.videoLink.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
            if (videoIdMatch && videoIdMatch[1]) {
                partContainer.querySelector('iframe').src = `https://www.youtube.com/embed/${videoIdMatch[1]}`;
            }
            break;
        case 'quiz':
            startQuiz();
            break;
    }

    partContainer.classList.remove('hidden');
    updateNavButtons();
}

function showSelectionView() {
    document.getElementById('selectionView').classList.remove('hidden');
    document.getElementById('lessonDetailView').classList.add('hidden');
    document.querySelector('.nav-buttons-container').style.visibility = 'hidden';
    loadLessons();
}

function updateNavButtons() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    if (!prevBtn || !nextBtn) return;
    
    prevBtn.style.visibility = currentPartIndex > 0 ? 'visible' : 'hidden';
    
    const partId = lessonParts[currentPartIndex];
    if (partId === 'quiz') {
       // Quiz function will handle this
    } else if (lessonParts[currentPartIndex + 1] === 'end') {
        nextBtn.innerHTML = 'العودة للدروس <i class="fas fa-home"></i>';
    } else {
        nextBtn.innerHTML = 'التالي <i class="fas fa-arrow-left"></i>';
    }
}

function finishLesson() {
    showSelectionView();
}

// ==========================================================
//              منطق الاختبار (Quiz)
// ==========================================================
function startQuiz() {
    currentQuestionIndex = 0;
    userScore = 0;
    renderQuestion();
}

function renderQuestion() {
    const quizContainer = document.getElementById('quizContainer');
    if (!quizContainer) return;

    const question = currentLessonData.questions[currentQuestionIndex];
    quizContainer.innerHTML = `<div class="quiz-question"><p>${currentQuestionIndex + 1}. ${question.questionText}</p><div class="quiz-options">${question.options.map(opt => `<label class="quiz-option"><input type="radio" name="answer" value="${opt.replace(/"/g, "&quot;")}"/> <span>${opt}</span></label>`).join('')}</div></div>`;
    
    document.getElementById('nextBtn').innerHTML = `تأكيد الإجابة <i class="fas fa-check"></i>`;
}

function handleQuizNavigation() {
    const nextBtn = document.getElementById('nextBtn');
    if (!nextBtn) return;
    
    const buttonText = nextBtn.textContent || nextBtn.innerText;

    if (buttonText.includes('تأكيد')) {
        const selectedOption = document.querySelector('.quiz-option input:checked');
        if (!selectedOption) { alert('الرجاء اختيار إجابة.'); return; }

        const correctAnswer = currentLessonData.questions[currentQuestionIndex].correctAnswer;
        if (selectedOption.value === correctAnswer) {
            userScore++;
            selectedOption.parentElement.classList.add('correct');
        } else {
            selectedOption.parentElement.classList.add('incorrect');
            document.querySelectorAll('.quiz-option input').forEach(opt => {
                if(opt.value === correctAnswer) opt.parentElement.classList.add('correct');
            });
        }
        document.querySelectorAll('.quiz-option input').forEach(input => input.disabled = true);
        
        const isLastQuestion = currentQuestionIndex >= currentLessonData.questions.length - 1;
        nextBtn.innerHTML = isLastQuestion ? 'إنهاء الاختبار <i class="fas fa-flag-checkered"></i>' : 'السؤال التالي <i class="fas fa-arrow-left"></i>';
    
    } else { 
        currentQuestionIndex++;
        if (currentQuestionIndex < currentLessonData.questions.length) {
            renderQuestion();
        } else {
            showQuizResult();
        }
    }
}

async function showQuizResult() {
    document.querySelectorAll('.lesson-part').forEach(p => p.classList.add('hidden'));
    document.querySelector('.nav-buttons-container').style.visibility = 'hidden';
    
    const finalScore = (userScore / currentLessonData.questions.length) * 10;
    const endContainer = document.getElementById('endQuizContainer');
    if (!endContainer) return;
    
    endContainer.innerHTML = `<h3>النتيجة النهائية</h3><div class="result-score">${finalScore.toFixed(1)}/10</div><p>${finalScore >= 5 ? 'مبروك! لقد اجتزت الاختبار بنجاح.' : 'تحتاج إلى مزيد من المراجعة. حاول مرة أخرى!'}</p><div class="end-buttons"><button class="btn btn-primary" onclick="retakeQuiz()"><i class="fas fa-redo"></i> إعادة الاختبار</button><button class="btn btn-secondary" onclick="showSelectionView()"><i class="fas fa-book"></i> العودة للدروس</button></div>`;

    document.getElementById('part-end').classList.remove('hidden');

    const userData = JSON.parse(localStorage.getItem('userData'));
    const payload = { 
        userEmail: userData.email, 
        selectedClass: document.getElementById('classSelect').value, 
        selectedSubject: document.getElementById('subjectSelect').value, 
        selectedChapter: document.getElementById('chapterSelect').value, 
        lessonName: document.getElementById('lessonTitle').textContent,
        score: finalScore.toFixed(1) 
    };
    await callApi('saveQuizResult', payload);
}

function retakeQuiz() {
    document.querySelector('.nav-buttons-container').style.visibility = 'visible';
    currentPartIndex = lessonParts.indexOf('quiz');
    showCurrentPart();
}

function handleAdminPage() { /* Not implemented for student view */ }

