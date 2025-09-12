// --- الإعدادات الرئيسية ---
const API_URL = 'https://script.google.com/macros/s/AKfycbzFAKxyL9kccuW0Mjw1Z9fed7iS2kRNDKROlbROKkqMhqkeKjkNAVnsCyAc9-8LPZ_5vw/exec';

// --- متغيرات لحالة الاختبار ---
let currentLessonQuestions = [];
let currentQuestionIndex = 0;
let userScore = 0;
let currentLessonName = '';

// --- دالة مساعدة للتواصل مع الـ API ---
async function callApi(action, payload = {}) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action, payload }),
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error('API Call Error:', action, error);
    return { success: false, message: `فشل الاتصال بالخادم: ${error.message}` };
  }
}

// --- الموجه الرئيسي للواجهة الأمامية ---
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;
  if (path.includes('student.html')) {
    handleStudentPage();
  } else if (path.includes('register.html')) {
    handleRegisterPage();
  } else if (path.includes('admin.html')) {
    handleAdminPage();
  } else {
    handleLoginPage();
  }
});


// ==========================================================
//              منطق صفحة تسجيل الدخول
// ==========================================================
function handleLoginPage() {
  const loginForm = document.getElementById('loginForm');
  if (!loginForm) return;
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const messageEl = document.getElementById('message');
    messageEl.textContent = 'جاري التحقق...';
    messageEl.className = '';

    const result = await callApi('login', { email, password });
    if (result.success) {
      localStorage.setItem('userData', JSON.stringify(result.user));
      // توجيه المستخدم حسب دوره
      if (result.user.role === 'admin') {
        window.location.href = 'admin.html';
      } else {
        window.location.href = 'student.html';
      }
    } else {
      messageEl.textContent = result.message;
      messageEl.className = 'error';
    }
  });
}


// ==========================================================
//              منطق صفحة إنشاء حساب
// ==========================================================
function handleRegisterPage() {
  const registerForm = document.getElementById('registerForm');
  if (!registerForm) return;

  // جلب أسئلة الأمان
  callApi('getSecurityQuestions').then(result => {
    if (result.success) {
      const select = document.getElementById('secQ');
      select.innerHTML = result.questions.map((q, i) => `<option value="${i}">${q}</option>`).join('');
    }
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const messageEl = document.getElementById('message');
    const userData = {
      name: document.getElementById('name').value,
      email: document.getElementById('email').value,
      phone: document.getElementById('phone').value,
      dob: document.getElementById('dob').value,
      motherName: document.getElementById('motherName').value,
      password: document.getElementById('password').value,
      secQIndex: document.getElementById('secQ').value,
      secQAnswer: document.getElementById('secA').value
    };
    messageEl.textContent = 'جاري التسجيل...';
    const result = await callApi('register', userData);
    if (result.success) {
      messageEl.textContent = result.message;
      messageEl.className = 'success';
      setTimeout(() => window.location.href = 'index.html', 2000);
    } else {
      messageEl.textContent = result.message;
      messageEl.className = 'error';
    }
  });
}


// ==========================================================
//                 منطق صفحة الطالب
// ==========================================================
function handleStudentPage() {
  const userDataString = localStorage.getItem('userData');
  if (!userDataString) { window.location.href = 'index.html'; return; }

  const userData = JSON.parse(userDataString);
  document.getElementById('studentName').textContent = `أهلاً بك, ${userData.name}`;
  document.getElementById('profilePic').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=FFCA28&color=212121`;
  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('userData');
    window.location.href = 'index.html';
  });
  loadClasses();
}

async function loadClasses() { const select = document.getElementById('classSelect'); const result = await callApi('getClasses'); if (result.success) { populateSelect(select, result.data, 'اختر الصف'); } else { select.innerHTML = `<option>${result.message}</option>`; } }
async function loadSubjects(selectedClass) { const select = document.getElementById('subjectSelect'); select.innerHTML = '<option>-- تحميل المواد... --</option>'; select.disabled = true; document.getElementById('chapterSelect').innerHTML = '<option>-- اختر الفصل --</option>'; document.getElementById('chapterSelect').disabled = true; const result = await callApi('getSubjects', { selectedClass }); if (result.success) { populateSelect(select, result.data, 'اختر المادة'); } }
async function loadChapters(selectedSubject) { const select = document.getElementById('chapterSelect'); select.innerHTML = '<option>-- تحميل الفصول... --</option>'; select.disabled = true; const payload = { selectedClass: document.getElementById('classSelect').value, selectedSubject }; const result = await callApi('getChapters', payload); if (result.success) { populateSelect(select, result.data, 'اختر الفصل'); } }
async function loadLessons() { const lessonsList = document.getElementById('lessonsList'); lessonsList.innerHTML = '<li class="empty-state"><div class="spinner"></div></li>'; const userData = JSON.parse(localStorage.getItem('userData')); const payload = { selectedClass: document.getElementById('classSelect').value, selectedSubject: document.getElementById('subjectSelect').value, selectedChapter: document.getElementById('chapterSelect').value, userEmail: userData.email }; if (!payload.selectedChapter) { lessonsList.innerHTML = '<li class="empty-state">اختر من القوائم أعلاه لعرض الدروس</li>'; return; } const result = await callApi('getLessons', payload); if (result.success && result.data.length > 0) { lessonsList.innerHTML = result.data.map(lesson => `<li onclick="showLessonDetail('${lesson.name.replace(/'/g, "\\'")}')"><span>${lesson.sequence}. ${lesson.name}</span> <span style="background: #e0e0e0; padding: 2px 8px; border-radius: 10px; font-size: 0.8em;">${lesson.score != null ? `الدرجة: ${lesson.score}` : 'لم يختبر'}</span></li>`).join(''); } else { lessonsList.innerHTML = '<li class="empty-state">لا توجد دروس متاحة.</li>'; } }
async function showLessonDetail(lessonName) { currentLessonName = lessonName; const selectionView = document.getElementById('selectionView'); const detailView = document.getElementById('lessonDetailView'); const lessonContent = document.getElementById('lessonContent'); selectionView.classList.add('hidden'); detailView.classList.remove('hidden'); document.getElementById('lessonTitle').textContent = lessonName; lessonContent.innerHTML = '<div class="spinner"></div>'; document.getElementById('quizPart').classList.add('hidden'); const payload = { selectedClass: document.getElementById('classSelect').value, selectedSubject: document.getElementById('subjectSelect').value, selectedChapter: document.getElementById('chapterSelect').value, lessonName }; const result = await callApi('getLessonContent', payload); if (result.success) { const lesson = result.data; let html = ''; if (lesson.objective) html += `<div class="lesson-part"><div class="part-header">الهدف</div><div class="content-box">${lesson.objective}</div></div>`; if (lesson.lessonText) html += `<div class="lesson-part"><div class="part-header">الشرح</div><div class="content-box">${lesson.lessonText}</div></div>`; if (lesson.videoLink) { const videoId = lesson.videoLink.match(/(?:v=|\/embed\/|youtu\.be\/)([\w-]{11})/); if(videoId) html += `<div class="lesson-part"><div class="part-header">فيديو</div><iframe src="https://www.youtube.com/embed/${videoId[1]}" frameborder="0" allowfullscreen></iframe></div>`; } lessonContent.innerHTML = html; if (lesson.questions && lesson.questions.length > 0) { currentLessonQuestions = lesson.questions; document.getElementById('quizPart').classList.remove('hidden'); startQuiz(); } } else { lessonContent.innerHTML = `<div class="empty-state">${result.message}</div>`; } }
function showSelectionView() { document.getElementById('selectionView').classList.remove('hidden'); document.getElementById('lessonDetailView').classList.add('hidden'); loadLessons(); }
function populateSelect(selectElement, options, defaultText) { selectElement.innerHTML = `<option value="">-- ${defaultText} --</option>`; if(options && options.length > 0) { selectElement.innerHTML += options.map(o => `<option value="${o}">${o}</option>`).join(''); selectElement.disabled = false; } else { selectElement.disabled = true; } }
function startQuiz() { currentQuestionIndex = 0; userScore = 0; document.getElementById('quizQuestion').classList.remove('hidden'); document.getElementById('quizResult').classList.add('hidden'); document.getElementById('quizNav').classList.remove('hidden'); document.getElementById('quizNextBtn').textContent = "التالي"; renderCurrentQuestion(); }
function renderCurrentQuestion() { const question = currentLessonQuestions[currentQuestionIndex]; document.getElementById('quizQuestionText').textContent = `${currentQuestionIndex + 1}. ${question.questionText}`; const optionsContainer = document.getElementById('quizOptions'); optionsContainer.innerHTML = question.options.map(option => `<label class="quiz-option"><input type="radio" name="answer" value="${option.replace(/"/g, "&quot;")}"/> ${option}</label>`).join(''); document.querySelectorAll('.quiz-option input').forEach(input => { input.addEventListener('change', () => { document.querySelectorAll('.quiz-option').forEach(label => label.classList.remove('selected')); if(input.checked) { input.parentElement.classList.add('selected'); } }); }); }
function handleQuizNav() { const selectedOption = document.querySelector('.quiz-option input:checked'); if (!selectedOption) { alert('الرجاء اختيار إجابة.'); return; } const correctAnswer = currentLessonQuestions[currentQuestionIndex].correctAnswer; if (selectedOption.value === correctAnswer) { userScore++; } currentQuestionIndex++; if (currentQuestionIndex < currentLessonQuestions.length) { renderCurrentQuestion(); } else { finishQuiz(); } }
async function finishQuiz() { const finalScore = (userScore / currentLessonQuestions.length) * 10; document.getElementById('quizQuestion').classList.add('hidden'); document.getElementById('quizNav').classList.add('hidden'); const resultContainer = document.getElementById('quizResult'); resultContainer.classList.remove('hidden'); document.getElementById('quizScore').textContent = `${finalScore.toFixed(1)} / 10`; const userData = JSON.parse(localStorage.getItem('userData')); const payload = { userEmail: userData.email, selectedClass: document.getElementById('classSelect').value, selectedSubject: document.getElementById('subjectSelect').value, selectedChapter: document.getElementById('chapterSelect').value, lessonName: currentLessonName, score: finalScore.toFixed(1) }; await callApi('saveQuizResult', payload); }


// ==========================================================
//                 منطق صفحة المعلم (Admin)
// ==========================================================
function handleAdminPage() {
    const userDataString = localStorage.getItem('userData');
    if (!userDataString || JSON.parse(userDataString).role !== 'admin') {
        // إذا لم يكن المستخدم مسجلاً كـ admin، أعد توجيهه لصفحة الدخول
        window.location.href = 'index.html';
        return;
    }

    const userData = JSON.parse(userDataString);
    document.getElementById('adminName').textContent = `لوحة تحكم: ${userData.name}`;
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('userData');
        window.location.href = 'index.html';
    });

    // --- إعداد Quill Editors ---
    const quillOptions = { theme: 'snow', modules: { toolbar: [['bold', 'italic'], [{ 'list': 'ordered' }, { 'list': 'bullet' }]] } };
    const editors = {
        objective: new Quill('#objective', quillOptions),
        didYouKnow: new Quill('#didYouKnow', quillOptions),
        lessonText: new Quill('#lessonText', quillOptions),
        summary: new Quill('#summary', quillOptions)
    };

    // --- إعداد بيانات القوائم المنسدلة ---
    const classes = ["الأول متوسط", "الثاني متوسط", "الثالث متوسط", "الرابع اعدادي", "الخامس اعدادي", "السادس اعدادي"];
    const subjects = ["الاسلامية", "اللغة العربية", "اللغة الانكليزية", "الرياضيات", "الاجتماعيات", "العلوم", "الكيمياء", "الفيزياء", "الأحياء", "الحاسوب"];
    const chapters = Array.from({ length: 10 }, (_, i) => `الفصل ${i + 1}`);
    populateSelect(document.getElementById('class'), classes, 'اختر الصف');
    populateSelect(document.getElementById('subject'), subjects, 'اختر المادة');
    populateSelect(document.getElementById('chapter'), chapters, 'اختر الفصل');

    // --- إنشاء حقول الأسئلة ---
    const questionsContainer = document.getElementById('questionsContainer');
    let questionsHTML = '';
    for (let i = 1; i <= 10; i++) {
        questionsHTML += `<div class="question-block"><h4>السؤال ${i}</h4>
            <input type="text" id="q${i}_text" placeholder="نص السؤال">
            <input type="text" id="q${i}_opt1" placeholder="خيار 1">
            <input type="text" id="q${i}_opt2" placeholder="خيار 2">
            <input type="text" id="q${i}_opt3" placeholder="خيار 3">
            <input type="text" id="q${i}_opt4" placeholder="خيار 4">
            <input type="text" id="q${i}_ans" placeholder="رقم الإجابة الصحيحة (1-4)">
        </div>`;
    }
    questionsContainer.innerHTML = questionsHTML;

    // --- منطق التنقل بين الخطوات ---
    let currentStep = 1;
    const steps = document.querySelectorAll('.step');
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');
    const submitBtn = document.getElementById('submitBtn');

    function showStep(stepIndex) {
        steps.forEach(step => step.classList.remove('active'));
        steps[stepIndex - 1].classList.add('active');
        prevBtn.style.visibility = stepIndex > 1 ? 'visible' : 'hidden';
        nextBtn.style.display = stepIndex < 3 ? 'inline-block' : 'none';
        submitBtn.style.display = stepIndex === 3 ? 'inline-block' : 'none';
    }

    nextBtn.addEventListener('click', () => { if (currentStep < 3) currentStep++; showStep(currentStep); });
    prevBtn.addEventListener('click', () => { if (currentStep > 1) currentStep--; showStep(currentStep); });
    
    // --- منطق إرسال الفورم ---
    const form = document.getElementById('addLessonForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const statusDiv = document.getElementById('status');
        statusDiv.textContent = 'جاري الحفظ...';
        statusDiv.className = '';

        // جمع البيانات
        const lessonData = {
            class: document.getElementById('class').value,
            subject: document.getElementById('subject').value,
            chapter: document.getElementById('chapter').value,
            lessonName: document.getElementById('lessonName').value,
            lessonNumber: document.getElementById('lessonNumber').value,
            objective: editors.objective.root.innerHTML,
            didYouKnow: editors.didYouKnow.root.innerHTML,
            lessonText: editors.lessonText.root.innerHTML,
            summary: editors.summary.root.innerHTML,
            pdfLink: document.getElementById('pdfLink').value,
            videoLink: document.getElementById('videoLink').value,
            questions: []
        };
        for (let i = 1; i <= 10; i++) {
            lessonData.questions.push({
                text: document.getElementById(`q${i}_text`).value,
                opt1: document.getElementById(`q${i}_opt1`).value,
                opt2: document.getElementById(`q${i}_opt2`).value,
                opt3: document.getElementById(`q${i}_opt3`).value,
                opt4: document.getElementById(`q${i}_opt4`).value,
                ans: document.getElementById(`q${i}_ans`).value
            });
        }
        
        const result = await callApi('addLesson', lessonData);
        statusDiv.textContent = result.message;
        statusDiv.className = result.success ? 'success' : 'error';
        if (result.success) {
            form.reset();
            Object.values(editors).forEach(editor => editor.setText(''));
            currentStep = 1;
            showStep(1);
        }
    });
}

