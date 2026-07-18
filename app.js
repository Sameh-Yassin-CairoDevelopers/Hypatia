/* =========================================================================
   Hypatia Project - Serverless Client-Side Edition
   Master JavaScript Application Logic (app.js)
   ========================================================================= */

let currentFontSize = 26; // تقليص الخط درجتين معياريتين لرفع التماسك البصري
let activeStoryData = null; // تخزين معلومات المخطوط النشط بالكامل لخدمة زر التفاصيل لمرة واحدة فقط

// قائمة المخطوطات والقصص الـ 13 المعتمدة والآمنة للتراجع التلقائي محلياً (Fallback)
const fallbackStories = [
    { id: "EGY-010", title_ar: "EGY-010: الملك نيفركارع والقائد ساسينيت", file_path: "corpus/stories/EGY-010.json" },
    { id: "EGY-011", title_ar: "EGY-011: قصة الراعي والجميلة", file_path: "corpus/stories/EGY-011.json" },
    { id: "EGY-013", title_ar: "EGY-013: متع صيد الأسماك والطيور", file_path: "corpus/stories/EGY-013.json" },
    { id: "EGY-040", title_ar: "EGY-040: تعاليم كاجمني السلوكية والأخلاقية", file_path: "corpus/stories/EGY-040.json" },
    { id: "EGY-042", title_ar: "EGY-042: تعاليم الأمير حور جد ف", file_path: "corpus/stories/EGY-042.json" },
    { id: "EGY-086", title_ar: "EGY-086: نقش كوروسكو العسكري الحدودي", file_path: "corpus/stories/EGY-086.json" },
    { id: "EGY-101", title_ar: "EGY-101: قصة الاختطاف والبحر الرمزية", file_path: "corpus/stories/EGY-101.json" },
    { id: "EGY-104", title_ar: "EGY-104: قصة الملك أمازيس والبحار", file_path: "corpus/stories/EGY-104.json" },
    { id: "EGY-106", title_ar: "EGY-106: قصة الأمير وأبو الهول بالديموطيقية", file_path: "corpus/stories/EGY-106.json" },
    { id: "EGY-120", title_ar: "EGY-120: لوحة سي-عنخ بوادي الحمامات لشق الآبار", file_path: "corpus/stories/EGY-120.json" },
    { id: "EGY-132", title_ar: "EGY-132: لوحة قارطة لمجاعات عصر الانتقال الأول", file_path: "corpus/stories/EGY-132.json" },
    { id: "EGY-159", title_ar: "EGY-159: تعويذة حورس الذهبي (كتاب الموتى - الفصل 77)", file_path: "corpus/stories/EGY-159.json" },
    { id: "EGY-501", title_ar: "EGY-501: برديات برلين الرياضية (المسألة الأولى - معادلة الدرجة الثانية)", file_path: "corpus/stories/EGY-501.json" }
];

let activeStories = []; // مصفوفة مرنة لتقبل تبادل وعرض القصص ديناميكياً

// قواميس طبقة المعرفة العميقة المحسوبة محلياً في الذاكرة (Browser memory)
let STORY_INDEX = {};
let CONTEXT_INDEX = {};
let CO_OCCURRENCE = {};
let LEMMA_RESOLVER = {};
let ENTITY_RESOLVER = {};

function normalize_translit_js(text) {
    if (!text) return "";
    text = text.trim().toLowerCase();
    if (text.includes("=")) {
        text = text.split("=")[0];
    }
    const suffixes = [".n", ".t", ".wt", ".w", "-n", "-t", "-wt", "-w"];
    for (let suf of suffixes) {
        if (text.endsWith(suf)) {
            text = text.substring(0, text.length - suf.length);
        }
    }
    // توحيد ترميز حرف العين والألف والياء صراحة بالأكواد الستة عشرية لليونيكود
    text = text.replace(/[\u02bf\u2018'`\u0060\u0a725\ua725]/g, "ꜥ");
    text = text.replace(/[\u02be\u20193\u0a723\ua723]/g, "ꜣ");
    text = text.replace(/[\u1ec9j]/g, "ỉ");
    text = text.replace(/[\[\]\(\)\u2e22\u2e23]/g, "");
    return text.trim();
}

function flat_ascii_normalize_js(text) {
    if (!text) return "";
    text = normalize_translit_js(text);
    const replacements = {
        "ḥ": "h", "h": "h", "ḫ": "h", "x": "h", "ẖ": "h", "X": "h",
        "š": "s", "S": "s", "ś": "s", "ḳ": "k", "q": "k",
        "ṯ": "t", "T": "t", "ḏ": "d", "D": "d",
        "ꜣ": "a", "A": "a", "3": "a", "ꜥ": "a", "ʿ": "a", "‘": "a", "'": "a", "`": "a", "a": "a",
        "ỉ": "i", "j": "i", "y": "i", "i": "i"
    };
    let flat = "";
    for (let char of text) {
        flat += replacements[char] || char;
    }
    return flat.trim();
}

// بناء طبقة المعرفة العميقة في أجزاء من الثانية تلقائياً داخل متصفح الباحث (In-Memory Processing)
async function buildClientSideKnowledgeIndex() {
    try {
        // 1. جلب وحل الجذور والأعلام الاستنادية أونلاين من مجلد resolvers المعتمد
        const res1 = await fetch('resolvers/lemma_resolver.json');
        LEMMA_RESOLVER = await res1.json();
        const res2 = await fetch('resolvers/entity_resolver.json');
        ENTITY_RESOLVER = await res2.json();
        
        // تصفير فهارس المعرفة قبل إعادة البناء لمنع التكرار
        STORY_INDEX = {};
        CONTEXT_INDEX = {};
        CO_OCCURRENCE = {};

        // 2. تدوير وجلب كافة القصص المتوفرة وبناء الفهارس (5.3, 5.4, 5.5) ديناميكياً
        for (let story of activeStories) {
            try {
                const response = await fetch(story.file_path);
                if (!response.ok) continue;
                const data = await response.json();
                
                const storyId = data.text_id || story.id;
                const storyTitle = (data.metadata && data.metadata.title_ar) ? data.metadata.title_ar : story.title_ar;
                const origLang = (data.metadata && data.metadata.original_translation_language) ? data.metadata.original_translation_language : 'unknown';
                
                const sentences = data.sentences || [];
                sentences.forEach((sentence, s_idx) => {
                    const s_id = (sentence.metadata && sentence.metadata.id) ? sentence.metadata.id : `${storyId}-S${s_idx+1}`;
                    const s_arabic = (sentence.layer2_languages && sentence.layer2_languages.arabic) ? sentence.layer2_languages.arabic : '';
                    const translit_str = (sentence.layer1_core && sentence.layer1_core.transliteration) ? sentence.layer1_core.transliteration : '';
                    
                    let tokens = [];
                    if (sentence.layer6_relationships && sentence.layer6_relationships.word_tokens) {
                        tokens = sentence.layer6_relationships.word_tokens;
                    } else if (translit_str) {
                        const raw_words = translit_str.split(/\s+/);
                        raw_words.forEach(rw => {
                            const clean_rw = rw.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").trim();
                            if (clean_rw) tokens.push({ transliteration: clean_rw });
                        });
                    }
                    
                    tokens.forEach((tok, t_idx) => {
                        const raw_translit = tok.get('transliteration', tok.transliteration) || '';
                        const clean_tok = normalize_translit_js(raw_translit);
                        
                        // مطابقة وحل المعرّفات المجرّدة (دعم الأولوية لمعرف lemma_ref المباشر)
                        let card_id = tok.lemma_ref || ENTITY_RESOLVER[clean_tok];
                        if (!card_id) {
                            const resolved_word = LEMMA_RESOLVER[clean_tok] || clean_tok;
                            const norm_resolved = normalize_translit_js(resolved_word);
                            card_id = LEMMA_RESOLVER[norm_resolved] || LEMMA_RESOLVER[flat_ascii_normalize_js(resolved_word)] || null;
                        }
                        
                        if (!card_id) return;
                        
                        // أ) 5.3: Story Index
                        if (!STORY_INDEX[card_id]) STORY_INDEX[card_id] = [];
                        if (!STORY_INDEX[card_id].some(s => s.id === storyId)) {
                            STORY_INDEX[card_id].push({ id: storyId, title: storyTitle });
                        }
                        
                        // ب) 5.4: Context Index & Character Offset
                        if (!CONTEXT_INDEX[card_id]) CONTEXT_INDEX[card_id] = [];
                        const char_offset = translit_str.indexOf(raw_translit);
                        CONTEXT_INDEX[card_id].push({
                            story_id: storyId,
                            story_title: storyTitle,
                            sentence_id: s_id,
                            sentence_arabic: s_arabic,
                            position: t_idx + 1,
                            char_offset: char_offset,
                            original_lang: origLang
                        });
                        
                        // ج) 5.5: المصاحبات اللفظية ثنائية الاتجاه يمين ويسار
                        if (!CO_OCCURRENCE[card_id]) CO_OCCURRENCE[card_id] = { "left": {}, "right": {} };
                        
                        if (t_idx > 0) {
                            const left_neigh = tokens[t_idx-1].transliteration;
                            if (left_neigh) {
                                const clean_ln = normalize_translit_js(left_neigh);
                                if (clean_ln) {
                                    CO_OCCURRENCE[card_id]["left"][clean_ln] = (CO_OCCURRENCE[card_id]["left"][clean_ln] || 0) + 1;
                                }
                            }
                        }
                        if (t_idx < tokens.length - 1) {
                            const right_neigh = tokens[t_idx+1].transliteration;
                            if (right_neigh) {
                                const clean_rn = normalize_translit_js(right_neigh);
                                if (clean_rn) {
                                    CO_OCCURRENCE[card_id]["right"][clean_rn] = (CO_OCCURRENCE[card_id]["right"][clean_rn] || 0) + 1;
                                }
                            }
                        }
                    });
                });
            } catch(e) {
                console.log("تنبيه جلب قصة: " + story.id);
            }
        }
        
        // اختزال وترتيب المصاحبات اللفظية لأعلى 5 تكرارات لكل اتجاه
        for (let card_id in CO_OCCURRENCE) {
            const sorted_left = Object.entries(CO_OCCURRENCE[card_id].left).sort((a,b) => b[1] - a[1]).slice(0, 5);
            const sorted_right = Object.entries(CO_OCCURRENCE[card_id].right).sort((a,b) => b[1] - a[1]).slice(0, 5);
            
            CO_OCCURRENCE[card_id] = {
                "left": sorted_left.map(x => ({ "word": x[0], "count": x[1] })),
                "right": sorted_right.map(x => ({ "word": x[0], "count": x[1] }))
            };
        }
        console.log("[+] تم بنجاح بناء طبقة المعرفة والترابط محلياً في الذاكرة لـ " + Object.keys(CONTEXT_INDEX).length + " علم ومفردة.");
        
    } catch(e) {
        console.log("خطأ في بناء الفهرس المحلي: " + e.message);
    }
}

function calculate_glyph_match_score_js(sentence_glyph, card_glyph) {
    if (!sentence_glyph || !card_glyph) return 0;
    const s_clean = sentence_glyph.replace(/\s+/g, "");
    const c_clean = card_glyph.replace(/\s+/g, "");
    
    if (s_clean.includes(c_clean)) {
        return c_clean.length * 10;
    }
    
    let overlap = 0;
    const s_set = new Set(s_clean);
    for (let char of c_clean) {
        if (s_set.has(char)) overlap++;
    }
    return overlap;
}

// دالة التحكم بطي 75% من الهيدر
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

// دالة فتح وعرض نافذة معلومات البردية الكلية (About Story)
function openAboutModal() {
    if (!activeStoryData) return;
    const modal = document.getElementById('aboutStoryModal');
    const content = document.getElementById('aboutStoryContent');
    modal.style.display = 'flex';
    
    const meta = activeStoryData.metadata || {};
    content.innerHTML = `
        <div class="drawer-row"><strong>الاسم الأكاديمي للمخطوط:</strong> <span style="font-size:1.4rem; color:var(--accent-color); font-weight:bold;">${meta.title_en || 'N/A'}</span></div>
        <div class="drawer-row"><strong>المعرّف الكلي:</strong> <span>${activeStoryData.text_id || 'N/A'}</span></div>
        <div class="drawer-row"><strong>الرقم المرجعي في المتاحف (Catalog No):</strong> <span>${meta.catalog_number || 'N/A'}</span></div>
        <div class="drawer-row"><strong>العالم والمصحح المعتمد:</strong> <span>${meta.scholarly_editor || 'N/A'}</span></div>
        <div class="drawer-row"><strong>العصر والحقبة التاريخية:</strong> <span>${meta.historical_period || 'N/A'}</span></div>
        <div class="drawer-row"><strong>مكان الحفظ الحالي:</strong> <span>${meta.current_location || 'N/A'}</span></div>
        <div class="drawer-row"><strong>لغة الترجمة الأصلية المصاحبة:</strong> <span style="font-weight:bold;">${meta.original_translation_language || 'N/A'}</span></div>
        <div class="drawer-row"><strong>وصف المخطوط:</strong> <span style="font-size:1.05rem; line-height:1.4; display:block; margin-top:5px;">${meta.description_ar || 'تمت فهرستها وحفظ سياقاتها اللغوية بالكامل في مستودع هيباتيا للأدب المصري القديم.'}</span></div>
    `;
}

// دالة تصدير المخطوط النشط ديناميكياً بصيغة .txt بناءً على خيارات العرض المحددة فقط
function exportActiveStory() {
    if (!activeStoryData) {
        alert("يرجى اختيار قصة أو مخطوط أولاً ليتم تصديره.");
        return;
    }

    const meta = activeStoryData.metadata || {};
    const title = meta.title_ar || activeStoryData.text_id;
    const filename = `${activeStoryData.text_id}_${title.replace(/\s+/g, '_')}.txt`;

    // 1. رصد خيارات العرض المحددة حالياً من المستخدم
    const showGlyphs = document.getElementById('showGlyphs').checked;
    const showArabic = document.getElementById('showArabic').checked;
    const showId = document.getElementById('showId').checked;
    const showTranslit = document.getElementById('showTranslit').checked;
    const showEnglish = document.getElementById('showEnglish').checked;
    const showGerman = document.getElementById('showGerman').checked;
    const showFrench = document.getElementById('showFrench').checked;
    const showNotes = document.getElementById('showNotes').checked;

    let exportText = `==================================================\n`;
    exportText += `مستودع هيباتيا للأدب المصري القديم - تصدير مخطوط\n`;
    exportText += `==================================================\n\n`;
    exportText += `المخطوط: ${title}\n`;
    exportText += `المعرّف الكلي: ${activeStoryData.text_id}\n`;
    exportText += `الرقم المرجعي: ${meta.catalog_number || 'N/A'}\n`;
    exportText += `تاريخ التصدير: ${new Date().toLocaleString('ar-EG')}\n\n`;
    exportText += `--------------------------------------------------\n\n`;

    // 2. تدوير أسطر المخطوط وبناء النص التصديري بناءً على الفلاتر فقط
    activeStoryData.sentences.forEach(sentence => {
        if (showId) {
            exportText += `المعرّف: ${sentence.metadata.id}\n`;
        }
        if (showGlyphs) {
            exportText += `الرسم الفرعوني: ${sentence.layer1_core.hieroglyph || 'N/A'}\n`;
        }
        if (showTranslit) {
            exportText += `النقل الصوتي: ${sentence.layer1_core.transliteration || 'N/A'}\n`;
        }
        if (showArabic) {
            exportText += `الترجمة العربية: ${sentence.layer2_languages.arabic || 'N/A'}\n`;
        }
        if (showEnglish) {
            exportText += `الترجمة الإنجليزية: ${sentence.layer2_languages.english || 'N/A'}\n`;
        }
        if (showGerman) {
            exportText += `الترجمة الألمانية: ${sentence.layer2_languages.german || 'N/A'}\n`;
        }
        if (showFrench) {
            const fr = sentence.layer2_languages.french || 'unknown';
            exportText += `الترجمة الفرنسية: ${fr !== 'unknown' ? fr : 'N/A'}\n`;
        }
        if (showNotes) {
            const nt = (sentence.layer7_research && sentence.layer7_research.notes) ? sentence.layer7_research.notes : 'unknown';
            exportText += `الملاحظة الأثرية: ${nt !== 'unknown' ? nt : 'N/A'}\n`;
        }
        exportText += `\n--------------------------------------------------\n\n`;
    });

    // 3. توليد وحفظ الملف كـ Blob محلياً
    const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// دالة التحكم بفتح وإغلاق الأكورديون يدوياً للبطاقات الجانبية
function toggleAccordion(headerElement) {
    const body = headerElement.nextElementSibling;
    const isOpen = body.classList.contains('open');
    
    // إغلاق جميع الأكورديونات الأخرى للحفاظ على الترتيب والجاذبية البصرية
    document.querySelectorAll('.accordion-body').forEach(el => el.classList.remove('open'));
    document.querySelectorAll('.accordion-header').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.accordion-header .arrow').forEach(el => el.innerText = '▼');
    
    if (!isOpen) {
        body.classList.add('open');
        headerElement.classList.add('active');
        headerElement.querySelector('.arrow').innerText = '▲';
    }
}

// دالة جلب وعرض وقرن بطاقة المفردة الفعلية مع دعم المتشابهات اللفظية والـ Knowledge Insights المتقدمة (5.3, 5.4, 5.5) السيرفرلس بالكامل
async function openWordCard(wordText, sentenceGlyphs, tokenElement, lemmaRef = "") {
    const drawer = document.getElementById('dictionaryDrawer');
    const content = document.getElementById('dictionaryContent');
    
    // تفعيل التميز اللوني الثابت للكلمة المختارة
    document.querySelectorAll('.word-token').forEach(el => el.classList.remove('active-token'));
    if (tokenElement) {
        tokenElement.classList.add('active-token');
    }

    drawer.style.display = 'flex';
    content.innerHTML = "<p style='font-size:0.95rem; color:var(--muted-text)'>جاري فحص وقراءة بطاقة المفردة في القاموس...</p>";
    
    try {
        // أ) مطابقة اللفظ للحصول على المعرّف الفرعي الكلي (Lemma / Entity)
        const clean_tok = normalize_translit_js(wordText);
        let card_id = ENTITY_RESOLVER[clean_tok];
        if (!card_id) {
            const resolved_word = LEMMA_RESOLVER[clean_tok] || clean_tok;
            const norm_resolved = normalize_translit_js(resolved_word);
            card_id = LEMMA_RESOLVER[norm_resolved] || LEMMA_RESOLVER[flat_ascii_normalize_js(resolved_word)] || null;
        }

        // ب) إذا لم نجد معرّف معتمد، نبحث بالحرف الصرف
        if (!card_id) {
            card_id = lemmaRef || null;
        }

        if (!card_id) {
            throw new Error("المفردة أو العلم التاريخي '" + wordText + "' لم تؤرشف بطاقته المعجمية بعد في مجلد هيباتيا.");
        }

        // ج) تحديد مسار الملف الساكن الحقيقي (EGY أو NE) لقراءته من جيت هاب هاب بايجز مباشرة
        const isEntity = card_id.startsWith('HYP-NE-');
        const file_path = isEntity ? `metadata/meta_entities/${card_id}.json` : `metadata/meta_cards/${card_id}.json`;

        const response = await fetch(file_path);
        if (!response.ok) {
            throw new Error("لم يتم العثور على ملف البطاقة المخصصة: " + file_path);
        }
        
        const card = await response.json(); 
        let accumulatedHtml = "";

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

        // د) سحب معطيات طبقة المعرفة العميقة المحسوبة تلقائياً في الذاكرة (5.3, 5.4, 5.5)
        let knowledgeHTML = "";
        const appearances = STORY_INDEX[card_id] || [];
        const contexts = CONTEXT_INDEX[card_id] || [];
        const collocations = CO_OCCURRENCE[card_id] || { "left": [], "right": [] };

        let storyLinks = "";
        if (appearances.length > 0) {
            appearances.forEach(app => {
                storyLinks += `<span style="font-size:0.85rem; background-color:var(--border-color); padding:1px 6px; border-radius:3px; margin:2px; display:inline-block;">📖 ${app.id} (${app.title.split(':')[0]})</span>`;
            });
        } else {
            storyLinks = "<span>لم تظهر في قصص أخرى بعد.</span>";
        }

        let contextLines = "";
        if (contexts.length > 0) {
            contexts.forEach((ctx, c_idx) => {
                let langBadge = "";
                if (ctx.original_lang === 'German') langBadge = "<span class='source-badge german'>ألماني 🇩🇪</span>";
                else if (ctx.original_lang === 'English') langBadge = "<span class='source-badge english'>إنجليزي 🇬🇧</span>";
                else if (ctx.original_lang === 'French') langBadge = "<span class='source-badge french'>فرنسي 🇫🇷</span>";

                contextLines += `<div style="font-size:0.85rem; margin-bottom:5px; border-bottom:1px dotted var(--border-color); padding-bottom:3px; color:var(--muted-text);">
                    <strong>[موضع ${c_idx+1}]</strong> في السطر <strong>${ctx.sentence_id}</strong> من قصة ${ctx.story_title.split(':')[0]} ${langBadge}: 
                    <span style="display:block; font-style:italic; margin-top:2px;">"${ctx.sentence_arabic}" (موقع الكلمة: ${ctx.position} | إزاحة الحرف: ${ctx.char_offset})</span>
                </div>`;
            });
        } else {
            contextLines = "<span>لا يوجد سياقات مؤرشفة.</span>";
        }

        let collocsLeft = "";
        let collocsRight = "";
        const leftList = collocations.left || [];
        const rightList = collocations.right || [];
        
        if (leftList.length > 0) {
            leftList.forEach(col => {
                collocsLeft += `<span class="colloc-badge">👉 ${col.word} (${col.count} مرات)</span>`;
            });
        } else { collocsLeft = "<span>لا يوجد مصاحبات تسبقها.</span>"; }
        
        if (rightList.length > 0) {
            rightList.forEach(col => {
                collocsRight += `<span class="colloc-badge">👈 ${col.word} (${col.count} مرات)</span>`;
            });
        } else { collocsRight = "<span>لا يوجد مصاحبات تليها.</span>"; }

        knowledgeHTML = `
            <div class="insight-section">
                <div class="drawer-row"><strong>📖 5.3: فهرس المخطوطات المكتشفة تلقائياً:</strong> <div>${storyLinks}</div></div>
                <div class="drawer-row" style="margin-top:8px;"><strong>👉 الكلمات المجاورة الأكثر تكراراً على اليمين (تسبقها):</strong> <div>${collocsLeft}</div></div>
                <div class="drawer-row" style="margin-top:8px;"><strong>👈 الكلمات المجاورة الأكثر تكراراً على اليسار (تليها):</strong> <div>${collocsRight}</div></div>
                <div class="drawer-row" style="margin-top:8px;"><strong>🔍 5.4: مواضع وسياقات الظهور الفعلي:</strong> <div style="max-height:120px; overflow-y:auto; background:var(--card-bg); padding:8px; border-radius:6px;">${contextLines}</div></div>
            </div>
        `;

        accumulatedHtml += `
            <div class="accordion-header active">
                <span>${id} - ${arMeaning.split('،')[0]}</span>
                <span class="arrow">▲</span>
            </div>
            <div class="accordion-body open">
                <div class="drawer-row" style="font-size:0.85rem; color: var(--muted-text); margin-top:15px;"><strong>البطاقة المعجمية:</strong> <span>${id}</span></div>
                <div class="drawer-row"><strong>المفردة بالنقل الصوتي:</strong> <span style="color:var(--accent-color); font-weight:bold;">${translit}</span></div>
                <div class="drawer-row"><strong>الرسم المقترح:</strong> <span style="font-size: 1.9rem; letter-spacing: 1px; display:block; margin-top:5px;">${glyphs !== 'unknown' ? glyphs : '𓏃'}</span></div>
                
                <!-- عرض حقول الأعلام والملوك والمدن الإضافية -->
                ${entityFieldsHTML}
                
                <div class="drawer-row"><strong>المعنى العربي:</strong> <span style="font-weight:bold;">${arMeaning}</span></div>
                <div class="drawer-row"><strong>المعنى الإنجليزي:</strong> <span>${enMeaning}</span></div>
                <div class="drawer-row"><strong>المصدر الأكاديمي:</strong> <span style="font-size: 0.85rem; color: var(--muted-text);">${sourceName}</span></div>
                
                <!-- حقن مخرجات طبقة المعرفة العميقة المجمعة تلقائياً -->
                ${knowledgeHTML}
            </div>
        `;

        content.innerHTML = accumulatedHtml;

    } catch (err) {
        content.innerHTML = `
            <div class="drawer-row"><strong>المفردة بالنقل الصوتي:</strong> <span style="color:var(--accent-color); font-weight:bold;">${wordText}</span></div>
            <p style="color: red; font-size: 0.9rem; line-height:1.4;">${err.message}</p>
            <p style="font-size: 0.8rem; color: var(--muted-text); line-height:1.4;">تأكد من مطابقة الترميز والحروف الخاصة في مجلد meta_cards.</p>
        `;
    }
}

// دالة جلب قائمة القصص المتاحة ديناميكياً وتلقائياً بالكامل من جيت هاب (GitHub Contents API) لتكون أوتوماتيكية 100%
async function fetchStoriesList() {
    const listContainer = document.getElementById('storiesList');
    listContainer.innerHTML = "<p style='font-size: 0.85rem; color: var(--muted-text);'>جاري فحص المخطوطات سحابياً...</p>";
    
    try {
        // استعلام واجهة جيت هاب لاستخراج الملفات من مجلد corpus/stories تلقائياً لتكون أوتوماتيكية 100%
        const response = await fetch('https://api.github.com/repos/Sameh-Yassin-CairoDevelopers/Hypatia/contents/corpus/stories');
        if (!response.ok) throw new Error("CORS / Offline / Rate Limit");
        
        const files = await response.json();
        activeStories = [];
        
        // تدوير وفحص كافة الملفات داخل المجلد وتصفيتها برمجياً
        for (let file of files) {
            if (file.name.endsWith('.json')) {
                // جلب محتويات الملف الفعلي لقراءة معطيات العنوان العربي للمخطوط
                const res = await fetch(file.download_url);
                if (res.ok) {
                    const data = await res.json();
                    activeStories.push({
                        id: data.text_id || file.name.replace('.json', ''),
                        title_ar: `${data.text_id || file.name.replace('.json', '')}: ${data.metadata ? data.metadata.title_ar : 'نص بدون عنوان'}`,
                        file_path: file.download_url
                    });
                }
            }
        }
        
        // ترتيب المخطوطات والقصص تصاعدياً
        activeStories.sort((a, b) => a.id.localeCompare(b.id));
        console.log("[+] تم بنجاح فحص وجلب " + activeStories.length + " مخطوط تلقائياً من جيت هاب!");
        
    } catch (err) {
        // حالة تراجع تلقائية (Fallback) لضمان التشغيل المحلي أوفلاين في جهازك بسلام
        console.log("[-] تفعيل خيار التراجع التلقائي وقراءة قائمة المخطوطات المثبتة محلياً: " + err.message);
        activeStories = fallbackStories;
    }

    // رسم وبناء القائمة الجانبية للنصوص والقصص المكتشفة تلقائياً
    listContainer.innerHTML = "";
    if (activeStories.length === 0) {
        listContainer.innerHTML = `<p style="font-size: 0.9rem; color: red;">لم يتم العثور على أي ملفات قصص.</p>`;
        return;
    }

    activeStories.forEach((story, index) => {
        const link = document.createElement('div');
        link.className = `story-link ${index === 0 ? 'active' : ''}`;
        link.id = `link-${story.id}`;
        link.innerText = story.title_ar;
        link.onclick = () => {
            document.querySelectorAll('.story-link').forEach(el => el.classList.remove('active'));
            link.classList.add('active');
            loadStory(story.file_path);
        };
        listContainer.appendChild(link);
    });

    // بناء طبقة المعرفة العميقة في الذاكرة لجميع القصص، ثم تحميل أول قصة تلقائياً
    await buildClientSideKnowledgeIndex();
    loadStory(activeStories[0].file_path);
}

async function loadStory(filePath) {
    const container = document.getElementById('storyContainer');
    container.innerHTML = "<p>جاري تحميل المخطوط وتنسيق أسطره لغوياً...</p>";
    
    try {
        const response = await fetch(filePath);
        if (!response.ok) throw new Error("فشل قراءة ملف المخطوط.");
        
        const data = await response.json();
        activeStoryData = data; // تخزين معلومات المخطوط النشط بالكامل لخدمة زر التفاصيل
        container.innerHTML = ""; 

        // تحديث عنوان المخطوط النشط في الهيدر الثابت ديناميكياً
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

            // رصد وتوليد حقل الملاحظات والترجمة الفرنسية إن وجدت
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
                    <!-- عرض الفرنسية والملاحظات ديناميكياً -->
                    ${frenchHTML}
                    ${notesHTML}
                </div>
            `;
            container.appendChild(card);
        });

        updateVisibility();

    } catch (err) {
        container.innerHTML = `<p style="color:red">فشل تحميل المخطوط: {${err.message}}</p>`;
    }
}

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
                target.style.flex = 'none'; // إلغاء الـ flex للتأكد من مواءمة العرض بالسحب
            }
        };
        document.onmouseup = function() {
            document.onmousemove = null;
            document.onmouseup = null;
        };
    };
}

window.onload = () => {
    fetchStoriesList();
    initResize('splitter1', 'sidebar', false);
    initResize('splitter2', 'dictionaryDrawer', true);
};
</script>
</body>
</html>