// ========================================================================
// Hypatia Project - Scriptorium Reader Controller (v2.1 - Serverless)
// Dedicated to serving stories.html locally & on GitHub Pages
// ========================================================================

let currentFontSize = 26; // تقليص الخط درجتين معياريتين لرفع التماسك البصري
let activeStoryData = null; // تخزين معطيات المخطوط الحالي لزر المعلومات الكلية
let lemmaResolver = null;
let entityResolver = null;

// 1. خوارزمية تنظيف وموائمة النواة اللغوية باليونيكود الصريح محلياً بالمتصفح
function normalizeTranslit(text) {
    if (!text) return "";
    let clean = text.strip_text_func ? text.strip_text_func() : text.trim().toLowerCase();
    
    if (clean.includes("=")) {
        clean = clean.split("=")[0];
    }
    
    // تجريد لواحق الجمع والتأنيث والماضي التام
    const suffixes = [".n", ".t", ".wt", ".w", "-n", "-t", "-wt", "-w"];
    for (let suf of suffixes) {
        if (clean.endsWith(suf)) {
            clean = clean.substring(0, clean.length - suf.length);
        }
    }

    // توحيد ترميز حرف العين (Ayin)
    const ayinVariants = ["\u02bf", "\u2018", "'", "`", "\u0060", "\u0a725", "\ua725"];
    for (let v of ayinVariants) {
        clean = clean.split(v).join("ꜥ");
    }

    // توحيد ترميز حرف الألف (Aleph)
    const alephVariants = ["\u02be", "\u2019", "3", "\u0a723", "\ua723"];
    for (let v of alephVariants) {
        clean = clean.split(v).join("ꜣ");
    }

    // توحيد ترميز حرف الياء (ỉ)
    const iVariants = ["\u1ec9", "j", "i\u0313"];
    for (let v of iVariants) {
        clean = clean.split(v).join("ỉ");
    }

    return clean.replace(/[\[\]\(\)⸢⸣]/g, "").trim();
}

function flatAsciiNormalize(text) {
    if (!text) return "";
    let clean = normalizeTranslit(text);
    const replacements = {
        "ḥ": "h", "ḫ": "h", "x": "h",
        "ẖ": "h", "x": "h",
        "š": "s", "s": "s", "ś": "s",
        "ḳ": "k", "q": "k",
        "ṯ": "t", "t": "t",
        "ḏ": "d", "d": "d",
        "ꜣ": "a", "a": "a",
        "ꜥ": "a", "a": "a",
        "ỉ": "i", "j": "i", "y": "i", "i": "i"
    };
    let flat = "";
    for (let char of clean) {
        flat += replacements[char] || char;
    }
    return flat.trim();
}

// 2. تحميل وتخزين الملفات الاستنادية (Resolvers) في ذاكرة المتصفح لمرة واحدة
async function loadResolvers() {
    if (lemmaResolver && entityResolver) return;
    
    // أ) التحقق من وجود المتغيرات العامة الممررة عبر السكريبتات الثابتة لتخطي الـ CORS أوفلاين
    if (typeof HYPATIA_LEMMA_RESOLVER !== 'undefined' && typeof HYPATIA_ENTITY_RESOLVER !== 'undefined') {
        lemmaResolver = HYPATIA_LEMMA_RESOLVER;
        entityResolver = HYPATIA_ENTITY_RESOLVER;
        return;
    }

    // ب) التراجع التلقائي لجلب الملفات عبر الـ fetch في البيئة السيرفرية
    try {
        const resLemma = await fetch('resolvers/lemma_resolver.json');
        lemmaResolver = await resLemma.json();
        const resEntity = await fetch('resolvers/entity_resolver.json');
        entityResolver = await resEntity.json();
    } catch (err) {
        console.log("تنبيه: فشل جلب الملفات الاستنادية عبر الـ fetch. تأكد من استدعاء ملفات الـ .js الاستنادية محلياً لفك الحظر.");
        lemmaResolver = {};
        entityResolver = {};
    }
}

// دالة تعيين السمة البصرية
function setTheme(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
    localStorage.setItem('hypatia_theme_v2', themeName);
}

// دالة التحكم بحجم الخطوط
function changeFontSize(size) {
    currentFontSize = parseInt(size);
    const glyphs = document.querySelectorAll('.glyphs-display');
    const arTranslations = document.querySelectorAll('.arabic-display');
    glyphs.forEach(el => el.style.fontSize = size + 'px');
    arTranslations.forEach(el => el.style.fontSize = (size - 6) + 'px');
}

// دالة طي خيارات العرض المتقدمة
function toggleHeaderSettings(btn) {
    const settings = document.getElementById('headerSettings');
    if (settings.style.display === 'none') {
        settings.style.display = 'flex';
        btn.innerText = "خيارات العرض ▲";
    } else {
        settings.style.display = 'none';
        btn.innerText = "خيارات العرض ▼";
    }
}

function closeAboutModal() {
    document.getElementById('aboutStoryModal').style.display = 'none';
}

function openAboutModal() {
    if (!activeStoryData) return;
    const modal = document.getElementById('aboutStoryModal');
    const content = document.getElementById('aboutStoryContent');
    modal.style.display = 'flex';
    
    const meta = activeStoryData.metadata || {};
    content.innerHTML = `
        <div class="drawer-row"><strong>الاسم الأكاديمي للمخطوط:</strong> <span style="font-size:1.3rem; color:var(--accent-color); font-weight:bold;">${meta.title_en || 'N/A'}</span></div>
        <div class="drawer-row"><strong>المعرّف الكلي:</strong> <span>${activeStoryData.text_id || 'N/A'}</span></div>
        <div class="drawer-row"><strong>الرقم المرجعي بالمتاحف:</strong> <span>${meta.museum_catalog_no || 'N/A'}</span></div>
        <div class="drawer-row"><strong>المطابقة بـ TLA ID:</strong> <span>${meta.stable_tla_id || 'N/A'}</span></div>
        <div class="drawer-row"><strong>المحرر والمراجع الأكاديمي:</strong> <span>${meta.scholarly_editor || 'N/A'}</span></div>
        <div class="drawer-row"><strong>لغة الترجمة المصاحبة:</strong> <span>${meta.original_translation_language || 'N/A'}</span></div>
        <div class="drawer-row"><strong>وصف وخلفية أثرية:</strong> <span style="font-size:1.05rem; line-height:1.4; display:block; margin-top:5px;">${meta.description_ar || 'تمت أرشفتها وتحقيق نصوصها وسياقاتها بالكامل في مستودع هيباتيا.'}</span></div>
    `;
}

// آلية طي القائمة الجانبية بالسحب والزر
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
sidebarToggle.onclick = () => {
    sidebar.classList.toggle('collapsed');
    sidebarToggle.innerText = sidebar.classList.contains('collapsed') ? "☰ فتح" : "☰ القائمة";
};

// برمجة فواصل السحب وتوسيع الألواح بالماوس (Resizable Panels) مع قفل الأبعاد لضمان السحب التام
function initResize(splitterId, targetId, isRightToLeft) {
    const splitter = document.getElementById(splitterId);
    const target = document.getElementById(targetId);
    
    splitter.onmousedown = function(e) {
        e.preventDefault();
        document.onmousemove = function(moveEvent) {
            let newWidth;
            if (isRightToLeft) {
                newWidth = window.innerWidth - moveEvent.clientX;
            } else {
                newWidth = moveEvent.clientX;
            }
            if (newWidth > 150 && newWidth < 450) {
                target.style.width = newWidth + 'px';
                target.style.minWidth = newWidth + 'px';
                target.style.maxWidth = newWidth + 'px';
                target.style.flex = 'none';
            }
        };
        document.onmouseup = function() {
            document.onmousemove = null;
            document.onmouseup = null;
        };
    };
}
initResize('splitter1', 'sidebar', false);
initResize('splitter2', 'dictionaryDrawer', true);

function updateVisibility() {
    const configs = [
        { id: 'showGlyphs', selector: '.glyphs-display' },
        { id: 'showArabic', selector: '.arabic-display' },
        { id: 'showId', selector: '.metadata-row' },
        { id: 'showTranslit', selector: '.translit-row' },
        { id: 'showEnglish', selector: '.english-row' },
        { id: 'showGerman', selector: '.german-row' },
        { id: 'showFrench', selector: '.french-row' },
        { id: 'showNotes', selector: '.notes-row' }
    ];

    configs.forEach(cfg => {
        const isChecked = document.getElementById(cfg.id).checked;
        const elements = document.querySelectorAll(cfg.selector);
        elements.forEach(el => {
            el.style.display = isChecked ? '' : 'none';
        });
    });
}

function closeDrawer() {
    document.getElementById('dictionaryDrawer').style.display = 'none';
    document.querySelectorAll('.word-token').forEach(el => el.classList.remove('active-token'));
}

function closeModal() {
    document.getElementById('suggestionModal').style.display = 'none';
}

// دالة التحكم بطي الأكورديون الفردي
function toggleAccordion(headerElement) {
    const body = headerElement.nextElementSibling;
    const isOpen = body.classList.contains('open');
    
    document.querySelectorAll('.accordion-body').forEach(el => el.classList.remove('open'));
    document.querySelectorAll('.accordion-header').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.accordion-header .arrow').forEach(el => el.innerText = '▼');
    
    if (!isOpen) {
        body.classList.add('open');
        headerElement.classList.add('active');
        headerElement.querySelector('.arrow').innerText = '▲';
    }
}

// دالة رصد وتجهيز بيانات التعديل المقترح
function openSuggestionModal(targetId, targetType, element) {
    const modal = document.getElementById('suggestionModal');
    modal.style.display = 'flex';
    
    document.getElementById('modalTargetId').value = targetId;
    document.getElementById('modalTargetType').value = targetType;
    
    document.getElementById('proposedValue').value = '';
    document.getElementById('academicJustification').value = '';
    document.getElementById('researcherName').value = '';
    document.getElementById('researcherInstitution').value = '';
    
    const selectField = document.getElementById('fieldModified');
    selectField.innerHTML = ""; 
    
    let initialCurrentValue = "";

    if (targetType === 'sentence') {
        const card = element.closest('.sentence-card');
        const arabic = card.querySelector('.arabic-display').innerText;
        const glyphs = card.querySelector('.glyphs-display').innerText;
        
        selectField.innerHTML = `
            <option value="arabic_translation" data-val="${arabic.replace(/"/g, '&quot;')}">الترجمة العربية للسطر</option>
            <option value="hieroglyph" data-val="${glyphs.replace(/"/g, '&quot;')}">الرسم الهيروغليفي</option>
        `;
        initialCurrentValue = arabic;
    } else {
        const body = element.closest('.accordion-body') || element.closest('.card-container');
        const arMeaning = body ? body.querySelector('.drawer-row:nth-child(4) span').innerText : 'N/A';
        const glyphs = body ? body.querySelector('.drawer-row:nth-child(3) span').innerText : 'N/A';
        const enMeaning = body ? body.querySelector('.drawer-row:nth-child(5) span').innerText : 'N/A';
        
        selectField.innerHTML = `
            <option value="arabic_meaning" data-val="${arMeaning.replace(/"/g, '&quot;')}">المعنى العربي بالقاموس</option>
            <option value="hieroglyph" data-val="${glyphs.replace(/"/g, '&quot;')}">الرسم الهيروغليفي المقترح</option>
            <option value="english_meaning" data-val="${enMeaning.replace(/"/g, '&quot;')}">المعنى الإنجليزي بالقاموس</option>
        `;
        initialCurrentValue = arMeaning;
    }
    
    document.getElementById('currentValue').value = initialCurrentValue;

    selectField.onchange = function() {
        const selectedOption = this.options[this.selectedIndex];
        document.getElementById('currentValue').value = selectedOption.getAttribute('data-val') || '';
    };
}

// دالة إرسال وتصدير مقترح الباحث اللغوي (مع التراجع التلقائي والذكي في بيئة جيت هاب لتحميل الملف يدوياً)
async function submitSuggestion(event) {
    event.preventDefault();
    
    const submitBtn = document.getElementById('modalSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.innerText = "جاري الحفظ والتدقيق...";

    const targetId = document.getElementById('modalTargetId').value;
    const targetType = document.getElementById('modalTargetType').value;
    const fieldModified = document.getElementById('fieldModified').value;
    const currentValue = document.getElementById('currentValue').value;
    const proposedValue = document.getElementById('proposedValue').value;
    const academicJustification = document.getElementById('academicJustification').value;
    const researcherName = document.getElementById('researcherName').value;
    const researcherInstitution = document.getElementById('researcherInstitution').value;

    const suggestionPayload = {
        target_id: targetId,
        target_type: targetType,
        field_modified: fieldModified,
        current_value: currentValue,
        proposed_value: proposedValue,
        academic_justification: academicJustification,
        researcher_name: researcherName,
        researcher_institution: researcherInstitution
    };

    // التحقق مما إذا كان الموقع يعمل على استضافة جيت هاب الثابتة أو القرص محلياً (لا تسمح بـ POST للقرص)
    const isStaticGitHub = window.location.hostname.includes("github.io") || window.location.protocol === "file:";

    if (isStaticGitHub) {
        // ميزة تراجع ذكية: تنزيل الاقتراح كملف JSON ليرسله الباحث للمدير يدوياً لفك حظر الـ CORS
        const jsonString = JSON.stringify(suggestionPayload, null, 4);
        const blob = new Blob([jsonString], { type: "application/json;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `suggest_${targetId}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        alert("[أوفلاين / جيت هاب]: تم توليد وتحميل اقتراحك كملف JSON بنجاح!\n\nيرجى إرسال هذا الملف يدوياً لمدير المنصة (Sameh) لمراجعته وإدراجه ببرنامج المراجعات. شكراً جزيلاً لإسهامك العلمي.");
        closeModal();
        submitBtn.disabled = false;
        submitBtn.innerText = "إرسال الاقتراح للتدقيق والمراجعة البشرية";
        return;
    }

    try {
        const response = await fetch('/api/suggest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(suggestionPayload)
        });

        const resData = await response.json();

        if (response.ok && resData.success !== false) {
            alert("تم تسجيل اقتراحك اللغوي بنجاح!\n\nسيخضع للتدقيق والمراجعة البشرية الأكاديمية اللامركزية بواسطة اللجان المتخصصة قبل إقراره بصفة نهائية في التحديث القادم للمستودع.");
            closeModal();
        } else {
            throw new Error(resData.error || "فشل إرسال الاقتراح اللغوي.");
        }
    } catch (err) {
        alert("خطأ في الاتصال بالسيرفر: " + err.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "إرسال الاقتراح للتدقيق والمراجعة البشرية";
    }
}

// دالة جلب وعرض القصص من الفهرس الثابت لـ جيت هاب (Stories List)
async function fetchStoriesList() {
    const listContainer = document.getElementById('storiesList');
    try {
        // سحب الفهرس الثابت لسلامة السيرفرلس
        const response = await fetch('corpus/stories_list.json');
        const stories = await response.json();

        if (stories.length === 0) {
            listContainer.innerHTML = `<p style="font-size: 0.9rem; color: red;">لم يتم العثور على ملفات قصص مؤرشفة.</p>`;
            return;
        }

        listContainer.innerHTML = ""; 
        
        stories.forEach((story, index) => {
            const link = document.createElement('div');
            link.className = `story-link ${index === 0 ? 'active' : ''}`;
            link.id = `link-${story.text_id}`;
            link.innerText = `${story.text_id}: ${story.title_ar}`;
            link.onclick = () => {
                document.querySelectorAll('.story-link').forEach(el => el.classList.remove('active'));
                link.classList.add('active');
                loadStory(story.file_path);
            };
            listContainer.appendChild(link);
        });

        loadStory(stories[0].file_path);

    } catch (err) {
        listContainer.innerHTML = `<p style="color:red; font-size:0.85rem;">يرجى إنشاء ملف 'corpus/stories_list.json' للفهرسة السيرفرلس.</p>`;
    }
}

// دالة الربط والتحليل السياقي وقراءة الكروت لـ جيت هاب سيرفرلس بالكامل
async function openWordCard(wordText, sentenceGlyphs, tokenElement, lemmaRef = "") {
    const drawer = document.getElementById('dictionaryDrawer');
    const content = document.getElementById('dictionaryContent');
    
    document.querySelectorAll('.word-token').forEach(el => el.classList.remove('active-token'));
    if (tokenElement) {
        tokenElement.classList.add('active-token');
    }

    drawer.style.display = 'flex';
    content.innerHTML = "<p style='font-size:0.95rem; color:var(--muted-text)'>جاري فحص وقراءة بطاقة المفردة في القاموس...</p>";
    
    try {
        await loadResolvers();
        const cleanWord = normalizeTranslit(wordText);
        const flatWord = flatAsciiNormalize(wordText);

        // أ) طبقة حلّال الأعلام (Entity Resolver) لـ HYP-NE كأسبقية أولى
        let targetId = entityResolver[cleanWord] || entityResolver[wordText.toLowerCase()];
        let isEntity = false;
        let filePath = "";

        if (targetId) {
            isEntity = true;
            filePath = `metadata/meta_entities/${targetId}.json`;
        } else {
            // ب) طبقة حلّال الجذور (Lemma Resolver) لـ HYP-EGY
            targetId = lemmaRef || lemmaResolver[cleanWord] || lemmaResolver[flatWord] || lemmaResolver[wordText.toLowerCase()];
            if (targetId) {
                filePath = `metadata/meta_cards/${targetId}.json`;
            }
        }

        if (!filePath) {
            throw new Error(`المفردة أو العلم التاريخي '${wordText}' (الجذر المنقّح: '${cleanWord}') لم تؤرشف بطاقته المعجمية بعد في مجلد هيباتيا.`);
        }

        // ج) جلب ملف الجيسون الفردي نسبياً ومباشرة عبر الـ fetch السيرفرلس
        const response = await fetch(filePath);
        if (!response.ok) throw new Error("لم يتم العثور على بطاقة الكلمة الفردية.");
        
        const card = await response.json();
        content.innerHTML = ""; 

        const id = card.metadata ? card.metadata.id : 'N/A';
        const translit = card.layer1_core ? card.layer1_core.transliteration : wordText;
        const glyphs = card.layer1_core ? card.layer1_core.hieroglyph : 'unknown';
        const arMeaning = card.layer2_languages ? card.layer2_languages.arabic : 'N/A';
        const enMeaning = card.layer2_languages ? card.layer2_languages.english : 'N/A';
        const sourceName = card.layer5_sources && card.layer5_sources.sources ? card.layer5_sources.sources[0].name : 'N/A';

        let entityFieldsHTML = "";
        if (isEntity && card.layer3_grammar) {
            const entityClass = card.layer3_grammar.entity_class || 'N/A';
            const dynasty = card.layer3_grammar.dynasty_association || 'N/A';
            const period = card.layer3_grammar.chronological_period || 'N/A';
            const titles = card.layer4_writing ? card.layer4_writing.standard_titles : 'N/A';
            
            entityFieldsHTML = `
                <div class="drawer-row" style="color:var(--accent-color); font-weight:bold;"><strong>تصنيف الكيان:</strong> <span>${entityClass}</span></div>
                <div class="drawer-row"><strong>الأسرة الحاكمة:</strong> <span>${dynasty}</span></div>
                <div class="drawer-row"><strong>الحقبة التاريخية:</strong> <span>${period}</span></div>
                <div class="drawer-row"><strong>الألقاب والنعوت:</strong> <span style="font-size:0.92rem; line-height:1.4;">${titles}</span></div>
            `;
        }

        // دمج طبقة المعرفة العميقة إن توفرت بالخلفية
        let knowledgeHTML = "";
        if (card.knowledge_insights) {
            const appearances = card.knowledge_insights.story_appearances || [];
            const contexts = card.knowledge_insights.context_occurrences || [];
            const collocations = card.knowledge_insights.collocations || { "left": [], "right": [] };

            let storyLinks = "";
            appearances.forEach(app => {
                storyLinks += `<span style="font-size:0.85rem; background-color:var(--border-color); padding:1px 6px; border-radius:3px; margin:2px; display:inline-block;">📖 ${app.id}</span>`;
            });

            let contextLines = "";
            contexts.forEach((ctx, c_idx) => {
                let langBadge = "";
                if (ctx.original_lang === 'German') langBadge = "<span class='source-badge german'>ألماني 🇩🇪</span>";
                else if (ctx.original_lang === 'English') langBadge = "<span class='source-badge english'>إنجليزي 🇬🇧</span>";
                else if (ctx.original_lang === 'French') langBadge = "<span class='source-badge french'>فرنسي 🇫🇷</span>";

                contextLines += `<div style="font-size:0.85rem; margin-bottom:5px; border-bottom:1px dotted var(--border-color); padding-bottom:3px; color:var(--muted-text);">
                    <strong>[موضع ${c_idx+1}]</strong> في السطر <strong>${ctx.sentence_id}</strong> ${langBadge}: 
                    <span style="display:block; font-style:italic; margin-top:2px;">"${ctx.sentence_arabic}"</span>
                </div>`;
            });

            let collocsLeft = "";
            let collocsRight = "";
            (collocations.left || []).forEach(col => {
                collocsLeft += `<span class="colloc-badge">👉 ${col.word} (${col.count})</span>`;
            });
            (collocations.right || []).forEach(col => {
                collocsRight += `<span class="colloc-badge">👈 ${col.word} (${col.count})</span>`;
            });

            knowledgeHTML = `
                <div class="insight-section">
                    <div class="drawer-row"><strong>📖 5.3: فهرس المخطوطات المكتشفة:</strong> <div>${storyLinks || 'لا يوجد'}</div></div>
                    <div class="drawer-row" style="margin-top:8px;"><strong>👉 الكلمات المجاورة على اليمين (تسبقها):</strong> <div>${collocsLeft || 'لا يوجد'}</div></div>
                    <div class="drawer-row" style="margin-top:8px;"><strong>👈 الكلمات المجاورة على اليسار (تليها):</strong> <div>${collocsRight || 'لا يوجد'}</div></div>
                    <div class="drawer-row" style="margin-top:8px;"><strong>🔍 5.4: مواضع وسياقات الظهور:</strong> <div style="max-height:120px; overflow-y:auto; background:var(--card-bg); padding:8px; border-radius:6px;">${contextLines || 'لا يوجد'}</div></div>
                </div>
            `;
        }

        content.innerHTML = `
            <div class="accordion-header active">
                <span>${id} - ${arMeaning.split('،')[0]}</span>
            </div>
            <div class="accordion-body open" style="display:block;">
                <button class="suggest-btn" onclick="openSuggestionModal('${id}', '${isEntity ? 'dictionary_card_ne' : 'dictionary_card'}', this)">📝 اقترح تعديلاً</button>
                <div class="drawer-row" style="font-size:0.85rem; color: var(--muted-text); margin-top:35px;"><strong>البطاقة المعجمية:</strong> <span>${id}</span></div>
                <div class="drawer-row"><strong>المفردة بالنقل الصوتي:</strong> <span style="color:var(--accent-color); font-weight:bold;">${translit}</span></div>
                <div class="drawer-row"><strong>الرسم المقترح:</strong> <span style="font-size: 1.9rem; letter-spacing: 1px; display:block; margin-top:5px;">${glyphs !== 'unknown' ? glyphs : '𓏃'}</span></div>
                
                ${entityFieldsHTML}
                
                <div class="drawer-row"><strong>المعنى العربي:</strong> <span style="font-weight:bold;">${arMeaning}</span></div>
                <div class="drawer-row"><strong>المعنى الإنجليزي:</strong> <span>${enMeaning}</span></div>
                <div class="drawer-row"><strong>المصدر الأكاديمي:</strong> <span style="font-size: 0.85rem; color: var(--muted-text);">${sourceName}</span></div>
                
                ${knowledgeHTML}
            </div>
        `;

    } catch (err) {
        content.innerHTML = `
            <div class="drawer-row"><strong>المفردة بالنقل الصوتي:</strong> <span style="color:var(--accent-color); font-weight:bold;">${wordText}</span></div>
            <p style="color: red; font-size: 0.9rem; line-height:1.4;">${err.message}</p>
            <p style="font-size: 0.8rem; color: var(--muted-text); line-height:1.4;">يرجى تدوينها في Resolvers أو إنشاء بطاقتها لتظهر تلقائياً.</p>
        `;
    }
}

async function loadStory(filePath) {
    const container = document.getElementById('storyContainer');
    container.innerHTML = "<p>جاري تحميل النص بالكامل من الملف الموحد...</p>";
    
    try {
        const response = await fetch(filePath);
        if (!response.ok) throw new Error("فشل قراءة الملف.");
        
        const data = await response.json();
        activeStoryData = data; 
        container.innerHTML = ""; 

        document.getElementById('activeStoryLabel').innerText = `📖 المخطوط الحالي: ${data.metadata.title_ar || data.text_id}`;

        data.sentences.forEach(sentence => {
            const card = document.createElement('div');
            card.className = 'sentence-card';
            
            const sentenceGlyphEscaped = (sentence.layer1_core.hieroglyph || "").replace(/'/g, "\\'");
            
            let tokensHTML = "";
            if (sentence.layer6_relationships && sentence.layer6_relationships.word_tokens && sentence.layer6_relationships.word_tokens.length > 0) {
                sentence.layer6_relationships.word_tokens.forEach(tok => {
                    const lemmaRefEscaped = (tok.lemma_ref || "").replace(/'/g, "\\'");
                    tokensHTML += `<span class="word-token" onclick="openWordCard('${tok.transliteration}', '${sentenceGlyphEscaped}', this, '${lemmaRefEscaped}')">${tok.transliteration}</span>`;
                });
            } else if (sentence.layer1_core.transliteration) {
                const words = sentence.layer1_core.transliteration.split(/\s+/);
                words.forEach(word => {
                    const cleanWord = word.trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
                    if (cleanWord) {
                        tokensHTML += `<span class="word-token" onclick="openWordCard('${cleanWord}', '${sentenceGlyphEscaped}', this, '')">${cleanWord}</span>`;
                    }
                });
            }

            const frenchText = sentence.layer2_languages.french || 'unknown';
            const sentenceNotes = (sentence.layer7_research && sentence.layer7_research.notes) ? sentence.layer7_research.notes : 'unknown';

            let frenchHTML = "";
            if (frenchText !== 'unknown' && frenchText !== '') {
                frenchHTML = `<div class="detail-row french-row"><strong>الفرنسية:</strong> <span>${frenchText}</span></div>`;
            }

            let notesHTML = "";
            if (sentenceNotes !== 'unknown' && sentenceNotes !== '') {
                notesHTML = `<div class="detail-row notes-row" style="color:var(--accent-color); font-style:italic;"><strong>الملاحظة الأثرية:</strong> <span>${sentenceNotes}</span></div>`;
            }

            card.innerHTML = `
                <button class="suggest-btn" onclick="openSuggestionModal('${sentence.metadata.id}', 'sentence', this)">📝 اقترح تعديلاً</button>
                <div class="glyphs-display" style="font-size: ${currentFontSize}px; margin-top:20px;">${sentence.layer1_core.hieroglyph}</div>
                <div class="arabic-display" style="font-size: ${currentFontSize - 6}px">${sentence.layer2_languages.arabic}</div>
                
                <div class="details-section">
                    <div class="detail-row metadata-row">
                        <strong>المعرّف:</strong> <span>${sentence.metadata.id}</span>
                    </div>
                    <div class="detail-row translit-row">
                        <strong>النقل الصوتي:</strong> <span>${tokensHTML || 'لا يوجد'}</span>
                    </div>
                    <div class="detail-row english-row">
                        <strong>الإنجليزية:</strong> <span>${sentence.layer2_languages.english || 'N/A'}</span>
                    </div>
                    <div class="detail-row german-row">
                        <strong>الألمانية:</strong> <span>${sentence.layer2_languages.german || 'N/A'}</span>
                    </div>
                    ${frenchHTML}
                    ${notesHTML}
                </div>
            `;
            container.appendChild(card);
        });

        updateVisibility();

    } catch (err) {
        container.innerHTML = `<p style="color:red">فشل تحميل القصة: {${err.message}}</p>`;
    }
}

// دالة تصدير المخطوط النشط حالياً كتقرير دراسي مبوب .txt للمستخدم مباشرة
function exportActiveStoryTXT() {
    if (!activeStoryData) {
        alert("يرجى تحميل قصة أولاً للتصدير.");
        return;
    }

    const textId = activeStoryData.text_id;
    const meta = activeStoryData.metadata || {};
    
    // رصد خيارات الفلاتر النشطة بالويب لتصدير ما يراه المستخدم عيناه فقط
    const incGlyphs = document.getElementById('showGlyphs').checked;
    const incTranslit = document.getElementById('showTranslit').checked;
    const incArabic = document.getElementById('showArabic').checked;
    const incEnglish = document.getElementById('showEnglish').checked;
    const incGerman = document.getElementById('showGerman').checked;
    const incFrench = document.getElementById('showFrench').checked;
    const incNotes = document.getElementById('showNotes').checked;

    let outputTxt = `========================================================================\n`;
    outputTxt += `              مستودع هيباتيا للأدب المصري القديم - تقرير أثري مصفى\n`;
    outputTxt += `========================================================================\n\n`;
    outputTxt += `المخطوط بالعربية : ${meta.title_ar || 'N/A'}\n`;
    outputTxt += `المخطوط بالإنجليزية: ${meta.title_en || 'N/A'}\n`;
    outputTxt += `المعرّف الكلي     : ${textId}\n`;
    outputTxt += `المتحف / البردية   : ${meta.museum_catalog_no || 'N/A'}\n`;
    outputTxt += `المحرر الأكاديمي   : ${meta.scholarly_editor || 'N/A'}\n`;
    outputTxt += `تاريخ التصدير     : ${new Date().toLocaleDateString('ar-EG')}\n`;
    outputTxt += `------------------------------------------------------------------------\n\n`;

    activeStoryData.sentences.forEach((sentence, index) => {
        const seq = index + 1;
        const sId = sentence.metadata.id;
        outputTxt += `[جملة ${seq} - المعرّف: ${sId}]\n`;
        
        if (incGlyphs) outputTxt += `الرسم الفرعوني : ${sentence.layer1_core.hieroglyph || ''}\n`;
        if (incTranslit) outputTxt += `النقل الصوتي   : ${sentence.layer1_core.transliteration || ''}\n`;
        if (incArabic) outputTxt += `الترجمة العربية : ${sentence.layer2_languages.arabic || ''}\n`;
        if (incEnglish) outputTxt += `الترجمة الإنجليزية: ${sentence.layer2_languages.english || ''}\n`;
        if (incGerman) outputTxt += `الترجمة الألمانية : ${sentence.layer2_languages.german || ''}\n`;
        if (incFrench) {
            const fr = sentence.layer2_languages.french;
            if (fr && fr !== 'unknown') outputTxt += `الترجمة الفرنسية  : ${fr}\n`;
        }
        if (incNotes) {
            const nt = sentence.layer7_research?.notes;
            if (nt && nt !== 'unknown') outputTxt += `الملاحظة الأثرية : ${nt}\n`;
        }
        
        outputTxt += `\n------------------------------------------------------------------------\n\n`;
    });

    // تحميل وتنزيل التقرير
    const blob = new Blob([outputTxt], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${textId}_تقرير_تحقيق_أثري.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

window.onload = () => {
    fetchStoriesList();
};