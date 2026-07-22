// ========================================================================
// Hypatia Project - Master Portal Router & Theme Controller (v2.1)
// Dedicated to serving index.html on GitHub Pages
// ========================================================================

// دالة تعيين وحفظ السمة البصرية (Theme) في التخزين المحلي للمتصفح (Local Storage)
// لتظل ثابتة ومستقرة وموحدة عبر كافة بوابات وصفحات المنصة المفتوحة
function setTheme(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
    localStorage.setItem('hypatia_theme_v2', themeName);
}

// تحميل السمة البصرية المفضلة المخزنة تلقائياً عند الإقلاع الأول للموقع
function initTheme() {
    const savedTheme = localStorage.getItem('hypatia_theme_v2') || 'papyrus';
    setTheme(savedTheme);
}

// ربط وتشغيل البوابة المعرفية الكبرى عند اكتمال تحميل عناصر الصفحة
document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    
    // تهيئة روابط التنقل للتأكد من ملاءمتها للمسارات النسبية وتنبيه المستخدم بالبوابات المستقبلية
    const actionButtons = document.querySelectorAll('.gateway-action-btn');
    actionButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const href = btn.getAttribute('href');
            if (href.startsWith('#/')) {
                e.preventDefault();
                alert(`[بوابة معجمية قيد الإنشاء]: بوابة "${btn.previousElementSibling.previousElementSibling.querySelector('h3').innerText}" سيتم ربطها وتفعيلها بالكامل في المخطط التطويري القادم لـ Stage 5 بناءً على العلاقات الدلالية.`);
            }
        });
    });
});