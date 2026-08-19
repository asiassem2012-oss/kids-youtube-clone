// ============================================
// script.js - جميع الوظائف المشتركة
// ============================================

// ===== المتغيرات العامة =====
let allVideos = [];
let currentFilteredVideos = [];
let currentPage = 1;
const videosPerPage = 12;
let selectedCategory = 'all';
const DEFAULT_PIN = "1234";

// ===== عناصر DOM =====
const videosContainer = document.getElementById('videos_container');
const searchInput = document.getElementById('search_input');

// ===== تحميل الفيديوهات من Firestore =====
function loadVideos() {
    if (!videosContainer) return;
    db.collection('videos').orderBy('timestamp', 'desc').get()
        .then(snapshot => {
            if (snapshot.empty) {
                videosContainer.innerHTML = '<p class="no_videos">📭 لا توجد فيديوهات حالياً. أضف فيديو من لوحة التحكم.</p>';
                return;
            }
            allVideos = [];
            snapshot.forEach(doc => {
                let data = doc.data();
                data.id = doc.id;
                if (!data.thumbnail && data.youtubeId) {
                    data.thumbnail = `https://img.youtube.com/vi/${data.youtubeId}/hqdefault.jpg`;
                }
                allVideos.push(data);
            });
            currentFilteredVideos = [...allVideos];
            renderVideos(true);
            setupCategoryButtons();
            setupInfiniteScroll();
        })
        .catch(err => {
            console.error('خطأ في جلب الفيديوهات من Firestore:', err);
            if (videosContainer) videosContainer.innerHTML = '<p class="no_videos">⚠️ حدث خطأ في تحميل الفيديوهات.</p>';
        });
}

// ===== عرض الفيديوهات =====
function renderVideos(isNewFilter = false) {
    if (!videosContainer) return;
    if (isNewFilter) {
        videosContainer.innerHTML = '';
        currentPage = 1;
    }

    if (currentFilteredVideos.length === 0 && currentPage === 1) {
        videosContainer.innerHTML = '<p class="no_videos">لا توجد فيديوهات في هذه الفئة.</p>';
        return;
    }

    const startIndex = (currentPage - 1) * videosPerPage;
    const endIndex = Math.min(startIndex + videosPerPage, currentFilteredVideos.length);
    const pageVideos = currentFilteredVideos.slice(startIndex, endIndex);

    if (pageVideos.length === 0) return;

    const videosHTML = pageVideos.map(video => `
        <div class="video" data-id="${video.id}">
            <div class="thumnail">
                <a href="watch.html?id=${video.id}">
                    <img src="${video.thumbnail}" alt="${video.title}" loading="lazy">
                </a>
            </div>
            <div class="video_details">
                <div class="creator_img">
                    <img src="${video.profilePic || 'images/profile.jpg'}" alt="${video.creator}">
                </div>
                <div class="title">
                    <a href="watch.html?id=${video.id}" class="video_title">${video.title}</a>
                    <a href="#" class="video_creator">${video.creator || 'Assem Code'}</a>
                    <span>${video.views || '0 views'} • ${video.time || 'اليوم'}</span>
                </div>
            </div>
        </div>
    `).join('');

    videosContainer.insertAdjacentHTML('beforeend', videosHTML);
}

// ===== التمرير اللانهائي =====
function setupInfiniteScroll() {
    let isLoading = false;
    window.addEventListener('scroll', () => {
        if (isLoading) return;
        const scrollHeight = document.documentElement.scrollHeight;
        const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
        const clientHeight = document.documentElement.clientHeight;

        if (scrollTop + clientHeight >= scrollHeight - 400) {
            if (currentPage * videosPerPage < currentFilteredVideos.length) {
                isLoading = true;
                currentPage++;
                renderVideos(false);
                isLoading = false;
            }
        }
    });
}

// ===== أزرار التصنيفات =====
function setupCategoryButtons() {
    const chips = document.querySelectorAll('.category_chip');
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            selectedCategory = chip.getAttribute('data-category');
            filterVideos();
        });
    });
}

function filterVideos() {
    if (selectedCategory === 'all') {
        currentFilteredVideos = [...allVideos];
    } else {
        currentFilteredVideos = allVideos.filter(v => v.category === selectedCategory);
    // الكود القديم المسبب للخطأ:
// myElement.style.display = 'block';

// الكود المعدل الآمن:
const myElement = document.getElementById('element-id');
if (myElement) {
    myElement.style.display = 'block';
}
    }

    renderVideos(true);
}

// ===== البحث =====
function setupSearch() {
    if (!searchInput) return;
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (window.location.pathname.includes('watch.html')) return;
        currentFilteredVideos = allVideos.filter(v =>
            v.title.toLowerCase().includes(query) ||
            (v.creator && v.creator.toLowerCase().includes(query))
        );
        renderVideos(true);
    });
}

// ===== سجل المشاهدة =====
function addToHistory(video) {
    let history = JSON.parse(localStorage.getItem('yt_history')) || [];
    history = history.filter(v => v.id !== video.id);
    history.unshift(video);
    if (history.length > 50) history = history.slice(0, 50);
    localStorage.setItem('yt_history', JSON.stringify(history));
}

// ===== صفحة المشاهدة =====
function loadWatchPage() {
    if (!window.location.pathname.includes('watch.html')) return;

    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('id');

    if (!videoId) {
        const titleEl = document.querySelector('.watch_title');
        if (titleEl) titleEl.innerText = 'معرف الفيديو غير موجود';
        return;
    }

    db.collection('videos').doc(videoId).get()
        .then(doc => {
            if (!doc.exists) {
                const titleEl = document.querySelector('.watch_title');
                if (titleEl) titleEl.innerText = 'الفيديو غير موجود';
                return;
            }
            const video = { id: doc.id, ...doc.data() };

            document.title = `${video.title} - YouTube Clone`;
            const titleEl = document.querySelector('.watch_title');
            if (titleEl) titleEl.innerText = video.title;

            const iframe = document.querySelector('.video_player_box iframe');
            if (iframe && video.youtubeId) {
                iframe.src = `https://www.youtube.com/embed/${video.youtubeId}?autoplay=1&enablejsapi=1`;
            }

            addToHistory(video);

            const channelPic = document.getElementById('channel_pic');
            const channelName = document.getElementById('channel_name');
            const subsCount = document.getElementById('subscribers_count');
            if (channelPic) channelPic.src = video.profilePic || 'images/profile.jpg';
            if (channelName) channelName.innerText = video.creator || 'Assem Code';
            if (subsCount) subsCount.innerText = '150K Subscribers';

            loadRecommendations(videoId);
        })
        .catch(err => {
            console.error('خطأ في تحميل الفيديو:', err);
            const titleEl = document.querySelector('.watch_title');
            if (titleEl) titleEl.innerText = 'حدث خطأ في التحميل';
        });
}

function loadRecommendations(currentId) {
    const recContainer = document.getElementById('recommended_container');
    if (!recContainer) return;

    db.collection('videos').limit(20).get()
        .then(snapshot => {
            let html = '';
            snapshot.forEach(doc => {
                const v = { id: doc.id, ...doc.data() };
                if (v.id === currentId) return;
                const thumb = v.thumbnail || `https://img.youtube.com/vi/${v.youtubeId}/hqdefault.jpg`;
                html += `
                    <div class="side_video">
                        <a href="watch.html?id=${v.id}">
                            <img src="${thumb}" alt="${v.title}">
                        </a>
                        <div class="side_video_info">
                            <a href="watch.html?id=${v.id}">${v.title}</a>
                            <p>${v.creator || 'غير معروف'}</p>
                            <span>${v.views || '0 views'}</span>
                        </div>
                    </div>
                `;
            });
            recContainer.innerHTML = html || '<p style="color:var(--text-secondary);">لا توجد مقترحات</p>';
        })
        .catch(() => {
            recContainer.innerHTML = '<p style="color:var(--text-secondary);">حدث خطأ في تحميل المقترحات</p>';
        });
}

// ===== الرقابة الأبوية =====
function initParentalControl() {
    const parentBtn = document.getElementById('parent_btn');
    const overlay = document.getElementById('parent_overlay');
    const unlockBtn = document.getElementById('unlock_btn');
    const pinInput = document.getElementById('parent_pin_input');

    function checkDailyLock() {
        const lockDate = localStorage.getItem('timer_lock_date');
        const today = new Date().toDateString();
        if (lockDate === today) {
            if (overlay) overlay.style.display = 'flex';
            stopVideoIfPlaying();
        } else {
            if (lockDate) localStorage.removeItem('timer_lock_date');
            checkTimerCountdown();
        }
    }

    function checkTimerCountdown() {
        const expireTime = localStorage.getItem('timer_expire_time');
        if (!expireTime) return;
        const remaining = expireTime - Date.now();
        if (remaining <= 0) {
            lockSite();
        } else {
            setTimeout(lockSite, remaining);
        }
    }

    function lockSite() {
        const today = new Date().toDateString();
        localStorage.setItem('timer_lock_date', today);
        localStorage.removeItem('timer_expire_time');
        if (overlay) overlay.style.display = 'flex';
        stopVideoIfPlaying();
    }

    function stopVideoIfPlaying() {
        const iframe = document.querySelector('.video_player_box iframe');
        if (iframe) iframe.src = '';
    }

    if (parentBtn) {
        parentBtn.addEventListener('click', () => {
            const enteredPin = prompt("أدخل الرقم السري لولي الأمر (الافتراضي: 1234):");
            if (enteredPin === DEFAULT_PIN) {
                const minutes = parseInt(prompt("أدخل وقت المشاهدة المسموح به بالدقائق:"), 10);
                if (minutes && minutes > 0) {
                    const expireTime = Date.now() + (minutes * 60 * 1000);
                    localStorage.setItem('timer_expire_time', expireTime);
                    localStorage.removeItem('timer_lock_date');
                    alert(`تم ضبط الوقت لـ ${minutes} دقيقة بنجاح!`);
                } else {
                    alert('الرجاء إدخال عدد دقائق صحيح.');
                }
            } else if (enteredPin !== null) {
                alert("الرقم السري غير صحيح!");
            }
        });
    }

    if (unlockBtn && pinInput) {
        unlockBtn.addEventListener('click', () => {
            if (pinInput.value === DEFAULT_PIN) {
                localStorage.removeItem('timer_lock_date');
                localStorage.removeItem('timer_expire_time');
                overlay.style.display = 'none';
                pinInput.value = '';
                alert("تم فتح الموقع بنجاح!");
            } else {
                alert("الرمز السري غير صحيح!");
            }
        });
    }

    checkDailyLock();
}

// ===== تشغيل كل شيء عند تحميل الصفحة =====
document.addEventListener('DOMContentLoaded', () => {
    // نتحقق إذا كنا في الصفحة الرئيسية
    if (!window.location.pathname.includes('watch.html') && !window.location.pathname.includes('admin.html')) {
        loadVideos();
        setupSearch();
    }
    if (window.location.pathname.includes('watch.html')) {
        loadWatchPage();
    }
    initParentalControl();
});

// تصدير الدوال للاستخدام في admin.html إذا لزم الأمر
// (admin.html له كود خاص به، لكنه يستخدم نفس Firebase)
// ==========================================
// Kidoz Ads Integration - Kids YouTube Clone
// Publisher ID: 15840
// ==========================================
