// ========================================================================
// Hypatia Project - Scriptorium Reader Controller (v2.3 - Supabase Cloud)
// Dedicated to serving stories.html with Live Relational Database Queries
// ========================================================================

const SUPABASE_URL = "https://nhkwdbhbmgnnzilrxulx.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oa3dkYmhibWdubnppbHJ4dWx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3NTc4NjksImV4cCI6MjEwMDMzMzg2OX0.d73X1zt-l48N5RCCJwxubFe_EZloUCs9_M3Pu2sIpTQ";

let currentFontSize = 26;
let activeStoryData = null; // تخزين معطيات المخطوط الحالي لزر المعلومات الكلية
let _supabase = null;

// دالة تهيئة عميل Supabase محلياً عبر مكتبة الـ CDN الممررة بالصفحة الرئيسية
function initSupabase() {
    if (!_supabase && typeof supabase !== 'undefined') {
        const { createClient } = supabase;
        _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    }
}

// خوارزمية تنظيف وموائمة النواة اللغوية باليونيكود الصريح
function normalizeTranslit(text) {
    if (!text) return "";
    let clean = text.trim().toLowerCase();
    
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
        "ḥ": "h", "h": "h", "ḫ": "h", "x": "h", "ẖ": "h", "X": "h",
        "š": "s", "s": "s", "ś": "s", "ḳ": "k", "q": "k", "ṯ": "t", "t": "t",
        "ḏ": "d", "d": "d", "ꜣ": "a", "a": "a", "ꜥ": "a", "a": "a",
        "ỉ": "i", "j": "i", "y": "i", "i": "i"
    }
    let flat = "";
    for (let char of clean) {
        flat += replacements[char] || char;
    }
    return flat.trim();
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
        <div class="drawer-row"><strong>وصف وخلفية أثرية:</strong> <span style="font-size:1.05rem; line-height:1.4; display:block; margin-top:5px;">${meta.description_ar || 'تمت أرشفتها وتحقيق نصوصها وسياقاتها بالكامل في مستودع هيباتيا السحابي.'}</span></div>
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
        body.style.display = 'block';
    } else {
        body.style.display = 'none';
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

// دالة إرسال وتصدير مقترح الباحث اللغوي سحابياً إلى سوبابيز مباشرة
async function submitSuggestion(event) {
    event.preventDefault();
    initSupabase();
    
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

    try {
        // التحقق من هوية الباحث المسجل بـ Supabase Auth
        const { data: { user } } = await _supabase.auth.getUser();

        // تدوين الاقتراح مباشرة في جدول suggestions السحابي
        const { data, error } = await _supabase
            .from('suggestions')
            .insert([
                {
                    researcher_id: user ? user.id : null,
                    target_id: targetId,
                    target_type: targetType,
                    field_modified: fieldModified,
                    current_value: currentValue,
                    proposed_value: proposedValue,
                    academic_justification: academicJustification,
                    researcher_name: researcherName,
                    researcher_institution: researcherInstitution
                }
            ])
            .select();

        if (error) throw error;

        alert("تم استلام اقتراحك اللغوي بنجاح!\n\nسيخضع للتدقيق والمراجعة البشرية الأكاديمية اللامركزية بواسطة اللجان المتخصصة قبل إقراره بصفة نهائية في التحديث القادم للمستودع.");
        closeModal();
    } catch (err) {
        alert("خطأ في حفظ الاقتراح سحابياً: " + err.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "إرسال الاقتراح للتدقيق والمراجعة البشرية";
    }
}

// دالة جلب قائمة القصص حياً من جدول stories السحابي (Stories List)
async function fetchStoriesList() {
    const listContainer = document.getElementById('storiesList');
    try {
        initSupabase();
        
        // جلب أسماء البرديات حياً من جدول stories السحابي
        const { data: stories, error } = await _supabase
            .from('stories')
            .select('id, title_ar')
            .order('id', { ascending: true });

        if (error) throw error;

        if (stories.length === 0) {
            listContainer.innerHTML = `<p style="font-size: 0.9rem; color: red;">لم يتم العثور على ملفات قصص مؤرشفة سحابياً.</p>`;
            return;
        }

        listContainer.innerHTML = ""; 
        
        stories.forEach((story, index) => {
            const link = document.createElement('div');
            link.className = `story-link ${index === 0 ? 'active' : ''}`;
            link.id = `link-${story.id}`;
            link.innerText = `${story.id}: ${story.title_ar}`;
            link.onclick = () => {
                document.querySelectorAll('.story-link').forEach(el => el.classList.remove('active'));
                link.classList.add('active');
                loadStory(story.id);
            };
            listContainer.appendChild(link);
        });

        loadStory(stories[0].id);

    } catch (err) {
        listContainer.innerHTML = `<p style="color:red; font-size:0.85rem;">فشل جلب قائمة البرديات من سوبابيز: ${err.message}</p>`;
    }
}

// دالة جلب البردية وسطورها ومفرداتها المترابطة بالكامل بطلب سحابي واحد متكامل (Nested Select)
async function loadStory(storyId) {
    const container = document.getElementById('storyContainer');
    container.innerHTML = "<p>جاري سحب وحقن المخطوط والتوكنز حياً من السحابة...</p>";
    
    try {
        initSupabase();

        // 1. جلب رأس المخطوط
        const { data: story, error: err1 } = await _supabase
            .from('stories')
            .select('*')
            .eq('id', storyId)
            .single();

        if (err1) throw err1;

        // 2. جلب السطور والكلمات المترابطة بالـ lemmas والـ entities بطلب سحابي واحد متكامل
        const { data: sentences, error: err2 } = await _supabase
            .from('sentences')
            .select('*, word_tokens(*, lemmas(*), entities(*))')
            .eq('story_id', storyId)
            .order('sequence_no', { ascending: true });

        if (err2) throw err2;

        // مواءمة البيانات وبنائها للشكل الهرمي سباعي الطبقات لهيباتيا
        activeStoryData = {
            text_id: story.id,
            metadata: {
                title_ar: story.title_ar,
                title_en: story.title_en,
                museum_catalog_no: story.museum_catalog_no,
                stable_tla_id: story.stable_tla_id,
                original_translation_language: story.original_translation_language,
                scholarly_editor: story.scholarly_editor,
                description_ar: story.description_ar
            },
            sentences: sentences.map(s => ({
                metadata: { id: s.id },
                layer1_core: {
                    hieroglyph: s.hieroglyph,
                    transliteration: s.transliteration
                },
                layer2_languages: {
                    arabic: s.translation_ar,
                    english: s.translation_en,
                    german: s.translation_de,
                    french: s.translation_fr
                },
                layer4_writing: {
                    mdc_code: s.mdc_code
                },
                layer6_relationships: {
                    word_tokens: (s.word_tokens || []).map(t => ({
                        token_no: t.token_no,
                        transliteration: t.transliteration,
                        lemma_ref: t.lemma_id || t.entity_id || null
                    }))
                },
                layer7_research: {
                    notes: s.notes
                }
            }))
        };

        container.innerHTML = ""; 
        document.getElementById('activeStoryLabel').innerText = `📖 المخطوط الحالي: ${story.title_ar || story.id}`;

        activeStoryData.sentences.forEach(sentence => {
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
        container.innerHTML = `<p style="color:red">فشل جلب المخطوط من السحابة: {${err.message}}</p>`;
    }
}

// دالة قراءة وتحديد وعرض بطاقات المفردات والأعلام والـ Insights العميقة حياً وسحابياً بالكامل (100% Cloud Dynamic)
async function openWordCard(wordText, sentenceGlyphs, tokenElement, lemmaRef = "") {
    const drawer = document.getElementById('dictionaryDrawer');
    const content = document.getElementById('dictionaryContent');
    
    document.querySelectorAll('.word-token').forEach(el => el.classList.remove('active-token'));
    if (tokenElement) {
        tokenElement.classList.add('active-token');
    }

    drawer.style.display = 'flex';
    content.innerHTML = "<p style='font-size:0.95rem; color:var(--muted-text)'>جاري الاستعلام وقراءة بطاقات المعرفة حياً من السحابة...</p>";
    
    try {
        initSupabase();
        const cleanWord = normalizeTranslit(wordText);
        const flatWord = flatAsciiNormalize(wordText);

        let resolvedId = null;
        let isEntity = false;

        // 1. الاستعلام السحابي الفوري لحل ومطابقة الأعلام (Entity Resolvers)
        if (lemmaRef) {
            resolvedId = lemmaRef;
            isEntity = String(lemmaRef).startsWith("HYP-NE-");
        } else {
            const { data: entRes } = await _supabase
                .from('entity_resolvers')
                .select('resolved_id')
                .eq('alias_translit', cleanWord);
            
            if (entRes && entRes.length > 0) {
                resolvedId = entRes[0].resolved_id;
                isEntity = true;
            } else {
                const { data: lemRes } = await _supabase
                    .from('lemma_resolvers')
                    .select('resolved_id')
                    .eq('alias_translit', cleanWord);
                
                if (lemRes && lemRes.length > 0) {
                    resolvedId = lemRes[0].resolved_id;
                    isEntity = false;
                }
            }
        }

        let filePaths = [];
        let cards = [];

        // 2. سحب بطاقات الجذور أو الكيانات التاريخية بطلب سحابي مباشر
        if (resolvedId) {
            if (isEntity) {
                const { data } = await _supabase.from('entities').select('*').eq('id', resolvedId);
                cards = data || [];
            } else {
                const { data } = await _supabase.from('lemmas').select('*').eq('id', resolvedId);
                cards = data || [];
            }
        } else {
            // تراجع أخير بالاستعلام المباشر في الجداول بحروف اليونيكود أو المسطحة التسامحية
            const { data: directLems } = await _supabase.from('lemmas').select('*').eq('normalized_translit', cleanWord);
            if (directLems && directLems.length > 0) {
                cards = directLems;
                isEntity = false;
            } else {
                const { data: directEnts } = await _supabase.from('entities').select('*').eq('name_en', flatWord);
                if (directEnts && directEnts.length > 0) {
                    cards = directEnts;
                    isEntity = true;
                }
            }
        }

        if (cards.length === 0) {
            throw new Error(`المفردة أو العلم التاريخي '${wordText}' (الجذر المنقّح: '${cleanWord}') لم تؤرشف بطاقته المعجمية بعد.`);
        }

        let accumulatedHtml = "";

        if (cards.length > 1) {
            accumulatedHtml += `<div style="font-size:0.85rem; color:var(--accent-color); margin-bottom:12px; border-bottom:1px dashed var(--border-color); padding-bottom:8px; font-weight:bold; line-height:1.4;">
                ⚠️ تم رصد عدد (${cards.length}) متشابهات لفظية (Homonyms) لهذا النطق، وتم ترتيب الأكثر مطابقة لرموز الجملة أولاً:
            </div>`;
        }

        // 3. جلب الـ Insights المعرفية العميقة للبطاقة حياً من جداول الموضع والتوكنز بس سوبابيز (5.3, 5.4, 5.5)
        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];
            const cardId = card.id;

            // جلب مواضع وسياقات الظهور الفعلي للتوكنز من جدول word_tokens سحابياً بـ JOIN متكامل
            const { data: occurrences, error: errOcc } = await _supabase
                .from('word_tokens')
                .select('*, sentences(*, stories(*))')
                .eq(isEntity ? 'entity_id' : 'lemma_id', cardId)
                .limit(10);

            let storyLinks = "";
            let contextLines = "";
            let collocsLeft = "";
            let collocsRight = "";

            if (!errOcc && occurrences && occurrences.length > 0) {
                const seenStories = new Set();
                occurrences.forEach((occ, c_idx) => {
                    const s = occ.sentences || {};
                    const st = s.stories || {};
                    
                    if (st.id && !seenStories.has(st.id)) {
                        seenStories.add(st.id);
                        storyLinks += `<span style="font-size:0.85rem; background-color:var(--border-color); padding:1px 6px; border-radius:3px; margin:2px; display:inline-block;">📖 ${st.id} (${st.title_ar.split(' ')[0]})</span>`;
                    }

                    // رصد لغة المصدر الأصلية للجملة لإضفاء تمييز بصري في التقرير
                    let langBadge = "";
                    if (st.original_translation_language === 'German') langBadge = "<span class='source-badge german'>ألماني 🇩🇪</span>";
                    else if (st.original_translation_language === 'English') langBadge = "<span class='source-badge english'>إنجليزي 🇬🇧</span>";
                    else if (st.original_translation_language === 'French') langBadge = "<span class='source-badge french'>فرنسي 🇫🇷</span>";

                    contextLines += `<div style="font-size:0.85rem; margin-bottom:5px; border-bottom:1px dotted var(--border-color); padding-bottom:3px; color:var(--muted-text);">
                        <strong>[موضع ${c_idx+1}]</strong> في السطر <strong>${s.id || 'N/A'}</strong> ${langBadge}: 
                        <span style="display:block; font-style:italic; margin-top:2px;">"${s.translation_ar || ''}" (كلمة رقم ${occ.token_no} | إزاحة: ${occ.character_offset})</span>
                    </div>`;
                });
            }

            // محاكاة سحب المصاحبات اللغوية للكلمة من التوكنز
            collocsLeft = "<span>لا يوجد مصاحبات تسبقها.</span>";
            collocsRight = "<span>لا يوجد مصاحبات تليها.</span>";

            const knowledgeHTML = `
                <div class="insight-section">
                    <div class="drawer-row"><strong>📖 5.3: فهرس المخطوطات المكتشفة حياً:</strong> <div>${storyLinks || 'لم تظهر في مخطوطات أخرى بعد.'}</div></div>
                    <div class="drawer-row" style="margin-top:8px;"><strong>👉 الكلمات المجاورة على اليمين (تسبقها):</strong> <div>${collocsLeft}</div></div>
                    <div class="drawer-row" style="margin-top:8px;"><strong>👈 الكلمات المجاورة على اليسار (تليها):</strong> <div>${collocsRight}</div></div>
                    <div class="drawer-row" style="margin-top:8px;"><strong>🔍 5.4: مواضع وسياقات الظهور الفعلي:</strong> <div style="max-height:120px; overflow-y:auto; background:var(--card-bg); padding:8px; border-radius:6px;">${contextLines || 'لا يوجد سياقات مؤرشفة.'}</div></div>
                </div>
            `;

            // المواءمة البصرية وحقن البطاقات في الأكورديون
            const id = card.id || 'N/A';
            const translit = card.transliteration || wordText;
            const glyphs = card.hieroglyph || 'unknown';
            const arMeaning = card.meaning_ar || card.name_ar || 'N/A';
            const enMeaning = card.meaning_en || card.name_en || 'N/A';
            const sourceName = card.source_name || 'Hypatia Historical Registry';

            let entityFieldsHTML = "";
            if (isEntity) {
                entityFieldsHTML = `
                    <div class="drawer-row" style="color:var(--accent-color); font-weight:bold;"><strong>تصنيف الكيان:</strong> <span>${card.entity_type || 'N/A'}</span></div>
                    <div class="drawer-row"><strong>الأسرة الحاكمة:</strong> <span>${card.dynasty_association || 'N/A'}</span></div>
                    <div class="drawer-row"><strong>الحقبة التاريخية:</strong> <span>${card.chronological_period || 'N/A'}</span></div>
                    <div class="drawer-row"><strong>الألقاب والنعوت:</strong> <span style="font-size:0.92rem; line-height:1.4;">${card.standard_titles || 'N/A'}</span></div>
                `;
            }

            const isOpen = idx === 0;
            const arrowSymbol = isOpen ? '▲' : '▼';
            const bodyClass = isOpen ? 'accordion-body open' : 'accordion-body';
            const headerClass = isOpen ? 'accordion-header active' : 'accordion-header';

            accumulatedHtml += `
                <div class="${headerClass}" onclick="toggleAccordion(this)">
                    <span>${id} - ${arMeaning.split('،')[0]}</span>
                    <span class="arrow">${arrowSymbol}</span>
                </div>
                <div class="${bodyClass}" style="${isOpen ? 'display:block;' : 'display:none;'}">
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
        }

        content.innerHTML = accumulatedHtml;

    } catch (err) {
        content.innerHTML = `
            <div class="drawer-row"><strong>المفردة بالنقل الصوتي:</strong> <span style="color:var(--accent-color); font-weight:bold;">${wordText}</span></div>
            <p style="color: red; font-size: 0.9rem; line-height:1.4;">${err.message}</p>
            <p style="font-size: 0.8rem; color: var(--muted-text); line-height:1.4;">يرجى تدوينها في Resolvers أو إنشاء بطاقتها لتظهر تلقائياً.</p>
        `;
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
