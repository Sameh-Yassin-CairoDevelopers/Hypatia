// ========================================================================
// Hypatia Project - Master Portal Router & Live Stats Controller (v2.2)
// Dedicated to serving index.html on GitHub Pages with Live Supabase Integration
// ========================================================================

const SUPABASE_URL = "https://nhkwdbhbmgnnzilrxulx.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oa3dkYmhibWdubnppbHJ4dWx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3NTc4NjksImV4cCI6MjEwMDMzMzg2OX0.d73X1zt-l48N5RCCJwxubFe_EZloUCs9_M3Pu2sIpTQ";

let _supabase = null;

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

// دالة جلب وإحصاء أعداد الكروت والأعلام والمخطوطات من سحابة Supabase مباشرة
async function fetchLiveStats() {
    const statsDisplay = document.getElementById('statsDisplay');
    if (!statsDisplay) return;

    try {
        // تهيئة عميل Supabase محلياً عبر المكتبة الممررة بالـ CDN
        if (typeof supabase !== 'undefined') {
            const { createClient } = supabase;
            _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        } else {
            throw new Error("مكتبة Supabase SDK لم يتم تحميلها بالمتصفح.");
        }

        // 1. جلب عدد الكلمات الإجمالي الفعلي في جدول lemmas سحابياً
        const { count: lemmaCount, error: err1 } = await _supabase
            .from('lemmas')
            .select('*', { count: 'exact', head: true });

        // 2. جلب عدد الأعلام والكيانات الاستنادية في جدول entities سحابياً
        const { count: entityCount, error: err2 } = await _supabase
            .from('entities')
            .select('*', { count: 'exact', head: true });

        // 3. جلب عدد القصص والمخطوطات في جدول stories سحابياً
        const { count: storyCount, error: err3 } = await _supabase
            .from('stories')
            .select('*', { count: 'exact', head: true });

        if (err1 || err2 || err3) {
            throw new Error("فشل الخادم في حساب أسطر أحد الجداول.");
        }

        // حقن الأرقام الحقيقية المحدثة وتنسيقها بالأرقام العربية الأنيقة
        statsDisplay.innerHTML = `
            المستودع السحابي يضم حالياً: 
            <strong>${lemmaCount.toLocaleString('ar-EG')}</strong> مفردة معجمية، 
            <strong>${entityCount.toLocaleString('ar-EG')}</strong> كياناً استنادياً تاريخياً (أعلام كالملوك والمدن)، و 
            <strong>${storyCount.toLocaleString('ar-EG')}</strong> مخطوطاً أدبياً وعلمياً مؤرشفاً بالكامل سحابياً.
        `;

    } catch (err) {
        console.log("تنبيه: فشل جلب الإحصاءات الحية: " + err.message);
        // التراجع الصامت والآمن في بيئة الأوفلاين لعرض الأرقام القياسية للاحتياط
        statsDisplay.innerHTML = `
            المستودع يضم حالياً: 
            <strong>٦,٥٤١</strong> مفردة معجمية، 
            <strong>١٠٠</strong> كيان استنادي تاريخي (أعلام)، و 
            <strong>٥٠٠</strong> مخطوط أدبي وعلمي مؤرشف بالكامل سحابياً.
            <br><span style="font-size:0.75rem; color:var(--muted-text)">[ملاحظة: تم تحميل الإحصاءات الاحتياطية الافتراضية محلياً نتيجة لعدم اتصال الشبكة بالسحابة حالياً].</span>
        `;
    }
}

// ربط وتشغيل البوابة المعرفية الكبرى عند اكتمال تحميل عناصر الصفحة
document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    fetchLiveStats();
    
    // تهيئة روابط التنقل للتأكد من ملاءمتها للمسارات النسبية وتنبيه المستخدم بالبوابات المستقبلية
    const actionButtons = document.querySelectorAll('.gateway-action-btn');
    actionButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const href = btn.getAttribute('href');
            if (href.startsWith('#/')) {
                e.preventDefault();
                alert(`[بوابة معجمية قيد الإنشاء]: بوابة "${btn.previousElementSibling.previousElementSibling.querySelector('h3').innerText}" سيتم ربطها وتفعيلها بالكامل في المخطط التطويري القادم لـ Stage 5 بناءً على العلاقات الدلالية والغراف العلائقي المكتمل.`);
            }
        });
    });
});
