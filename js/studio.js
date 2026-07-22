// ========================================================================
// Hypatia Project - Scriptorium Authoring Studio Controller (v2.1)
// Dedicated to serving studio.html locally & on GitHub Pages
// ========================================================================

let sentenceCount = 0;

function triggerFileInput() {
    document.getElementById('fileInput').click();
}

function openExportModal() {
    document.getElementById('exportModal').style.display = 'flex';
}

function closeExportModal() {
    document.getElementById('exportModal').style.display = 'none';
}

function toggleExportOptions() {
    // دالة فارغة ممهدة لأي خيارات تصفية مستقبلية
}

function closePreviewModal() {
    document.getElementById('previewModal').style.display = 'none';
}

// دالة تصفية الطبقات المرئية للسطور داخل نافذة المعاينة الكبرى
function updatePreviewVisibility() {
    const configs = [
        { id: 'prevGlyphs', selector: '.preview-glyphs' },
        { id: 'prevArabic', selector: '.preview-arabic' },
        { id: 'prevId', selector: '.metadata-row' },
        { id: 'prevTranslit', selector: '.preview-row:nth-child(2)' },
        { id: 'prevEnglish', selector: '.preview-row:nth-child(3)' },
        { id: 'prevGerman', selector: '.preview-row:nth-child(4)' },
        { id: 'prevFrench', selector: '.french-row' },
        { id: 'prevNotes', selector: '.notes-row' }
    ];

    configs.forEach(cfg => {
        const isChecked = document.getElementById(cfg.id).checked;
        const elements = document.getElementById('previewScrollArea').querySelectorAll(cfg.selector);
        elements.forEach(el => {
            el.style.display = isChecked ? '' : 'none';
        });
    });
}

// دالة إنشاء مخطوط فارغ وتصفية البيانات القديمة
function createNewStory() {
    if (confirm("هل أنت متأكد من إنشاء مخطوط فارغ؟ سيتم مسح أي تعديلات غير محفوظة حالياً.")) {
        document.getElementById('textId').value = "EGY-XXX";
        document.getElementById('titleAr').value = "";
        document.getElementById('titleEn').value = "";
        document.getElementById('museumCatalog').value = "";
        document.getElementById('stableTlaId').value = "";
        document.getElementById('origLang').value = "unknown";
        document.getElementById('scholarlyEditor').value = "Hypatia Builder";
        document.getElementById('descriptionAr').value = "";
        
        document.getElementById('sentencesContainer').innerHTML = "";
        sentenceCount = 0;
        addNewSentence();
    }
}

// دالة قراءة وتحليل ملف جيسون هيباتيا القياسي المستورد وتوزيعه في المحرر
function loadJSONFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            document.getElementById('textId').value = data.text_id || "EGY-XXX";
            const meta = data.metadata || {};
            document.getElementById('titleAr').value = meta.title_ar || "";
            document.getElementById('titleEn').value = meta.title_en || "";
            document.getElementById('museumCatalog').value = meta.museum_catalog_no || "";
            document.getElementById('stableTlaId').value = meta.stable_tla_id || "";
            document.getElementById('origLang').value = meta.original_translation_language || "unknown";
            document.getElementById('scholarlyEditor').value = meta.scholarly_editor || "Hypatia Builder";
            document.getElementById('descriptionAr').value = meta.description_ar || "";

            const container = document.getElementById('sentencesContainer');
            container.innerHTML = "";
            sentenceCount = 0;

            if (data.sentences && data.sentences.length > 0) {
                data.sentences.forEach(sentence => {
                    addNewSentence(sentence);
                });
            } else {
                addNewSentence();
            }

        } catch (err) {
            alert("خطأ في قراءة وتحليل ملف جيسون: " + err.message);
        }
    };
    reader.readAsText(file);
}

// دالة تبديل التبويبات الداخلية لكل كارت سطر لعزل ومنع التداخل وتوفير المساحة
function switchCardTab(button, tabName) {
    const card = button.closest('.sentence-editor-card');
    card.querySelectorAll('.card-tab').forEach(t => t.classList.remove('active'));
    button.classList.add('active');
    
    card.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    card.querySelector(`.tab-${tabName}`).style.display = 'block';
}

// دالة تفاعلية لإضافة خلية مفردة مستقلة لربط الليما يدوياً
function addTokenRow(cardId, tokenData = null) {
    const grid = document.querySelector(`#card-${cardId} .tokens-grid-container`);
    const row = document.createElement('div');
    row.className = 'token-input-row';
    
    const translit = tokenData ? tokenData.transliteration : '';
    const lemmaRef = tokenData ? (tokenData.lemma_ref || '') : '';

    row.innerHTML = `
        <input type="text" class="token-field token-translit" value="${translit}" placeholder="المفردة (مثال: Dd)" required style="direction:ltr; text-align:left;">
        <input type="text" class="token-field token-lemma" value="${lemmaRef}" placeholder="معرّف الليما (مثال: HYP-EGY-006527)" style="direction:ltr; text-align:left;">
        <button type="button" class="btn btn-danger" style="padding: 2px 6px; font-size: 0.8rem;" onclick="this.closest('.token-input-row').remove()">✕</button>
    `;
    grid.appendChild(row);
}

// دالة إنشاء كارت إدخال جملة جديدة مبوب بالكامل (Tabs) مع التنسيق الرأسي المنظم والتحويل اللغوي الصحيح للحقول
function addNewSentence(data = null) {
    sentenceCount++;
    const container = document.getElementById('sentencesContainer');
    
    const card = document.createElement('div');
    card.className = 'sentence-editor-card';
    card.id = `card-${sentenceCount}`;

    const meta = data ? (data.metadata || {}) : {};
    const core = data ? (data.layer1_core || {}) : {};
    const lang = data ? (data.layer2_languages || {}) : {};
    const grammar = data ? (data.layer3_grammar || {}) : {};
    const writing = data ? (data.layer4_writing || {}) : {};
    const sourceItem = data ? (data.layer5_sources?.sources?.[0] || {}) : {};
    const research = data ? (data.layer7_research || {}) : {};

    card.innerHTML = `
        <div class="card-header">
            <h4>السطر اللغوي رقم #<span class="seq-no-display">${sentenceCount}</span></h4>
            <button class="btn btn-danger" style="padding: 2px 8px; font-size:0.8rem;" onclick="deleteSentenceCard(${sentenceCount})">✕ حذف السطر</button>
        </div>
        
        <div class="card-tabs">
            <button type="button" class="card-tab active" onclick="switchCardTab(this, 'core')">1. النواة الأساسية</button>
            <button type="button" class="card-tab" onclick="switchCardTab(this, 'lang')">2. التراجم واللغات</button>
            <button type="button" class="card-tab" onclick="switchCardTab(this, 'grammar')">3. النحو والمفردات</button>
            <button type="button" class="card-tab" onclick="switchCardTab(this, 'sources')">4. التوثيق والملاحظات</button>
        </div>
        
        <!-- التبويب الأول: نواة النص هيروغليفي (رأسي بالكامل ومعرّف السطر) -->
        <div class="tab-content tab-core" style="display: block;">
            <div class="vertical-inputs-stack">
                <div class="form-group">
                    <label>معرّف السطر الفريد (Sentence ID):</label>
                    <input type="text" class="sentence-id" value="${meta.id || 'HYP-TXT-XXXXXX-S' + String(sentenceCount).padStart(2, '0')}" required style="direction:ltr; text-align:left;">
                </div>
                <div class="form-group">
                    <label>الرسم الهيروغليفي (اليونيكود):</label>
                    <input type="text" class="hieroglyph-val" value="${core.hieroglyph || ''}" placeholder="𓊹𓏏𓂋𓏏𓂀" required style="font-size: 1.4rem;">
                </div>
            </div>
        </div>

        <!-- التبويب الثاني: الترجمات الأربعة مصفوفة رأسياً أسفل بعضها مع كبر الحجم لتسهيل الكتابة -->
        <div class="tab-content tab-lang">
            <div class="vertical-inputs-stack">
                <div class="form-group">
                    <label>الترجمة العربية للسطر الكامل:</label>
                    <textarea class="arabic-val" required placeholder="اكتب الترجمة العربية للسطر هنا..." style="height: 60px;">${lang.arabic || ''}</textarea>
                </div>
                <div class="form-group">
                    <label>الترجمة الإنجليزية للسطر الكامل:</label>
                    <textarea class="english-val" required placeholder="Write English translation here..." style="height: 60px;">${lang.english || ''}</textarea>
                </div>
                <div class="form-group">
                    <label>الترجمة الألمانية للسطر الكامل:</label>
                    <textarea class="german-val" placeholder="Schreiben Sie die deutsche Übersetzung hier..." style="height: 60px;">${lang.german || 'unknown'}</textarea>
                </div>
                <div class="form-group">
                    <label>الترجمة الفرنسية للسطر الكامل:</label>
                    <textarea class="french-val" placeholder="Écrivez la traduction française ici..." style="height: 60px;">${lang.french || 'unknown'}</textarea>
                </div>
            </div>
        </div>

        <!-- التبويب الثالث: النحو والمفردات اللغوية مع النقل الصوتي وكود مانشيل لراحة المستخدم الأكاديمية -->
        <div class="tab-content tab-grammar">
            <div class="vertical-inputs-stack">
                <div class="form-group">
                    <label>النقل الصوتي (Transliteration):</label>
                    <input type="text" class="translit-val" value="${core.transliteration || ''}" placeholder="ky Dd n=k" required style="direction:ltr; text-align:left;">
                </div>
                <div class="form-group">
                    <label>كود المانشيل (Mdc Code):</label>
                    <input type="text" class="mdc-code" value="${writing.mdc_code || ''}" placeholder="ky Dd n=k" style="direction:ltr; text-align:left;">
                </div>
                <div class="form-group">
                    <label>نوع الجملة (Sentence Type):</label>
                    <input type="text" class="sentence-type" value="${grammar.sentence_type || 'unknown'}" placeholder="nominal_sentence">
                </div>
                <div class="form-group">
                    <label>البنية اللغوية (Syntax Structure):</label>
                    <input type="text" class="syntax-structure" value="${grammar.syntax_structure || 'unknown'}">
                </div>
                <div class="form-group">
                    <label style="display: flex; justify-content: space-between; align-items: center;">
                        <span>مفردات السطر وربط الـ Leema الفردية:</span>
                        <button type="button" class="btn btn-primary" style="padding: 2px 8px; font-size: 0.8rem;" onclick="addTokenRow(${sentenceCount})">➕ أضف مفردة جديدة</button>
                    </label>
                    <div class="tokens-editor-area">
                        <div class="tokens-grid-container">
                            <!-- المفردات الخلايا تضاف ديناميكياً هنا -->
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- التبويب الرابع: مراجع المخطوطات والتعليقات والتحليل اللغوي -->
        <div class="tab-content tab-sources">
            <div class="vertical-inputs-stack">
                <div class="form-group">
                    <label>معرّف المخطوط الأثري:</label>
                    <input type="text" class="source-id" value="${sourceItem.id || 'MUSEUM-BERLIN-XXXX'}" placeholder="معرّف الأثر بالعام...">
                </div>
                <div class="form-group">
                    <label>اسم المخطوط المعتمد بالكامل:</label>
                    <input type="text" class="source-name" value="${sourceItem.name || ''}" placeholder="اسم البردية الرسمي...">
                </div>
                <div class="form-group">
                    <label>الملاحظة والتعليق الأثري والبحثي للجملة:</label>
                    <textarea class="notes-val" placeholder="اكتب هنا الملاحظات النحوية أو التاريخية الهامة للسطر..." style="height: 80px;">${research.notes || ''}</textarea>
                </div>
            </div>
        </div>
    `;
    container.appendChild(card);
    
    // توزيع وخلق خلايا المفردات الفردية للربط من الـ word_tokens المستوردة
    const targetCardId = sentenceCount;
    if (data && data.layer6_relationships && data.layer6_relationships.word_tokens) {
        data.layer6_relationships.word_tokens.forEach(tok => {
            addTokenRow(targetCardId, tok);
        });
    } else {
        addTokenRow(targetCardId); // إنشاء خلية فارغة أولى افتراضية لراحة الإدخال
    }

    reorderSequenceNumbers();
}

function deleteSentenceCard(id) {
    if (confirm("هل أنت متأكد من حذف هذا السطر بالكامل؟")) {
        const card = document.getElementById(`card-${id}`);
        if (card) {
            card.remove();
            reorderSequenceNumbers();
        }
    }
}

function reorderSequenceNumbers() {
    const cards = document.querySelectorAll('.sentence-editor-card');
    cards.forEach((card, index) => {
        card.querySelector('.seq-no-display').innerText = index + 1;
    });
}

// دالة عرض ومعاينة قراءة البردية الكبرى التفاعلية المصححة بنسبة 100% وخالية من عوائق الكونسول
function openPreviewModal() {
    const modal = document.getElementById('previewModal');
    const scrollArea = document.getElementById('previewScrollArea');
    const titleLabel = document.getElementById('previewStoryTitle');
    
    const titleAr = document.getElementById('titleAr').value.trim() || "مخطوط غير معنون";
    const textId = document.getElementById('textId').value.trim() || "EGY-XXX";
    
    titleLabel.innerText = `📖 معاينة قراءة المخطوط: ${titleAr} (${textId})`;
    modal.style.display = 'flex';
    scrollArea.innerHTML = ""; // تصفية الساحة

    const cards = document.querySelectorAll('.sentence-editor-card');
    if (cards.length === 0) {
        scrollArea.innerHTML = "<p>لا توجد أسطر مكتوبة لمعاينتها حالياً.</p>";
        return;
    }

    // بناء وعرض أسطر البردية بشكل مباشر في المعاينة تماثل الويب الرئيسي تماماً
    cards.forEach((card, index) => {
        const seq = index + 1;
        const sId = card.querySelector('.sentence-id').value.trim();
        const glyphs = card.querySelector('.hieroglyph-val').value.trim();
        const arabic = card.querySelector('.arabic-val').value.trim();
        const translit = card.querySelector('.translit-val').value.trim();
        const english = card.querySelector('.english-val').value.trim();
        const german = card.querySelector('.german-val').value.trim();
        const french = card.querySelector('.french-val').value.trim();
        const notes = card.querySelector('.notes-val').value.trim();

        const previewCard = document.createElement('div');
        previewCard.className = 'preview-sentence-card';
        
        // تفكيك المفردات المسجلة لعرضها ككبسولات في المعاينة
        const tokenRows = card.querySelectorAll('.token-input-row');
        let tokensHTML = "";
        tokenRows.forEach(row => {
            const translitVal = row.querySelector('.token-translit').value.trim();
            if (translitVal) {
                tokensHTML += `<span class="word-token">${translitVal}</span>`;
            }
        });

        // تصحيح فك التراجم الفرنسية والملاحظات لتلافي خطأ التوقف في الـ Console
        let frenchHTML = "";
        if (french && french !== 'unknown' && french !== '') {
            frenchHTML = `<div class="preview-row french-row"><strong>الفرنسية:</strong> <span>${french}</span></div>`;
        }

        let notesHTML = "";
        if (notes && notes !== 'unknown' && notes !== '') {
            notesHTML = `<div class="preview-row notes-row" style="color:var(--accent-color); font-style:italic;"><strong>الملاحظة الأثرية:</strong> <span>${notes}</span></div>`;
        }

        previewCard.innerHTML = `
            <div class="preview-glyphs">${glyphs}</div>
            <div class="preview-arabic">${arabic}</div>
            
            <div class="preview-details">
                <div class="preview-row metadata-row"><strong>المعرّف:</strong> <span>${sId}</span></div>
                <div class="preview-row translit-row"><strong>النقل الصوتي:</strong> <span>${tokensHTML || 'لا يوجد'}</span></div>
                <div class="preview-row english-row"><strong>الإنجليزية:</strong> <span>${english || 'N/A'}</span></div>
                <div class="preview-row german-row"><strong>الألمانية:</strong> <span>${german || 'N/A'}</span></div>
                ${frenchHTML}
                ${notesHTML}
            </div>
        `;
        scrollArea.appendChild(previewCard);
    });

    updatePreviewVisibility();
}

// دالة تصفية الطبقات المرئية للسطور داخل نافذة المعاينة التفاعلية المصححة للحدث prevFrench
function updatePreviewVisibility() {
    const configs = [
        { id: 'prevGlyphs', selector: '.preview-glyphs' },
        { id: 'prevArabic', selector: '.preview-arabic' },
        { id: 'prevId', selector: '.metadata-row' },
        { id: 'prevTranslit', selector: '.preview-row:nth-child(2)' },
        { id: 'prevEnglish', selector: '.preview-row:nth-child(3)' },
        { id: 'prevGerman', selector: '.preview-row:nth-child(4)' },
        { id: 'prevFrench', selector: '.french-row' },
        { id: 'prevNotes', selector: '.notes-row' }
    ];

    configs.forEach(cfg => {
        const isChecked = document.getElementById(cfg.id).checked;
        const elements = document.getElementById('previewScrollArea').querySelectorAll(cfg.selector);
        elements.forEach(el => {
            el.style.display = isChecked ? '' : 'none';
        });
    });
}

// دالة التصدير والتصفية المخصصة والمستقلة الفائقة القوة (JSON أو TXT)
function runCustomExport() {
    const fileType = document.getElementById('exportFileType').value;
    const textId = document.getElementById('textId').value.trim();
    
    const incGlyphs = document.getElementById('incGlyphs').checked;
    const incTranslit = document.getElementById('incTranslit').checked;
    const incArabic = document.getElementById('incArabic').checked;
    const incEnglish = document.getElementById('incEnglish').checked;
    const incGerman = document.getElementById('incGerman').checked;
    const incFrench = document.getElementById('incFrench').checked;
    const incNotes = document.getElementById('incNotes').checked;

    if (!textId) {
        alert("يرجى ملء معرّف المخطوط الكلي أولاً للتصدير.");
        return;
    }

    if (fileType === 'json') {
        const output = {
            "text_id": textId,
            "metadata": {
                "title_ar": document.getElementById('titleAr').value.trim(),
                "title_en": document.getElementById('titleEn').value.trim(),
                "museum_catalog_no": document.getElementById('museumCatalog').value.trim(),
                "stable_tla_id": document.getElementById('stableTlaId').value.trim(),
                "original_translation_language": document.getElementById('origLang').value,
                "scholarly_editor": document.getElementById('scholarlyEditor').value.trim(),
                "description_ar": document.getElementById('descriptionAr').value.trim()
            },
            "sentences": []
        };

        const cards = document.querySelectorAll('.sentence-editor-card');
        cards.forEach((card, index) => {
            const sentence = {
                "metadata": {
                    "id": card.querySelector('.sentence-id').value.trim(),
                    "schema_version": "1.0",
                    "status": "verified_translation",
                    "created_by": document.getElementById('scholarlyEditor').value.trim(),
                    "created_at": new Date().toISOString()
                },
                "layer1_core": {
                    "text_id": textId,
                    "sequence_no": index + 1,
                    "entity_type": "sentence"
                }
            };

            if (incTranslit) sentence["layer1_core"]["transliteration"] = card.querySelector('.translit-val').value.trim();
            if (incGlyphs) sentence["layer1_core"]["hieroglyph"] = card.querySelector('.hieroglyph-val').value.trim();

            sentence["layer2_languages"] = {};
            if (incArabic) sentence["layer2_languages"]["arabic"] = card.querySelector('.arabic-val').value.trim();
            if (incEnglish) sentence["layer2_languages"]["english"] = card.querySelector('.english-val').value.trim();
            if (incGerman) sentence["layer2_languages"]["german"] = card.querySelector('.german-val').value.trim();
            if (incFrench) sentence["layer2_languages"]["french"] = card.querySelector('.french-val').value.trim();

            sentence["layer3_grammar"] = {
                "sentence_type": card.querySelector('.sentence-type').value.trim(),
                "syntax_structure": card.querySelector('.syntax-structure').value.trim()
            };

            sentence["layer4_writing"] = {
                "mdc_code": card.querySelector('.mdc-code').value.trim()
            };

            sentence["layer5_sources"] = {
                "sources": [
                    {
                        "id": card.querySelector('.source-id').value.trim(),
                        "name": card.querySelector('.source-name').value.trim(),
                        "type": "manuscript",
                        "status": "verified"
                    }
                ]
            };

            // تجميع وحفظ المفردات الفردية وربط الليما (الطبقة السادسة) بشكل أوتوماتيكي دقيق
            const tokenRows = card.querySelectorAll('.token-input-row');
            const wordTokensArray = [];
            tokenRows.forEach((row, t_idx) => {
                const translitVal = row.querySelector('.token-translit').value.trim();
                const lemmaRefVal = row.querySelector('.token-lemma').value.trim();
                if (translitVal) {
                    wordTokensArray.push({
                        "token_no": t_idx + 1,
                        "transliteration": translitVal,
                        "lemma_ref": lemmaRefVal || null
                    });
                }
            });
            sentence["layer6_relationships"] = { "word_tokens": wordTokensArray };

            if (incNotes) {
                sentence["layer7_research"] = { "notes": card.querySelector('.notes-val').value.trim() };
            }

            output.sentences.push(sentence);
        });

        downloadFile(JSON.stringify(output, null, 4), `${textId}.json`, "application/json");

    } else {
        let outputTxt = `========================================================================\n`;
        outputTxt += `              مستودع هيباتيا للأدب المصري القديم - تقرير أثري مصفى\n`;
        outputTxt += `========================================================================\n\n`;
        outputTxt += `المخطوط بالعربية : ${document.getElementById('titleAr').value.trim()}\n`;
        outputTxt += `المخطوط بالإنجليزية: ${document.getElementById('titleEn').value.trim()}\n`;
        outputTxt += `المعرّف الكلي     : ${textId}\n`;
        outputTxt += `المتحف / البردية   : ${document.getElementById('museumCatalog').value.trim()}\n`;
        outputTxt += `المحرر الأكاديمي   : ${document.getElementById('scholarlyEditor').value.trim()}\n`;
        outputTxt += `تاريخ التصدير     : ${new Date().toLocaleDateString('ar-EG')}\n`;
        outputTxt += `------------------------------------------------------------------------\n\n`;

        const cards = document.querySelectorAll('.sentence-editor-card');
        cards.forEach((card, index) => {
            const seq = index + 1;
            const id = card.querySelector('.sentence-id').value.trim();
            outputTxt += `[جملة ${seq} - المعرّف: ${id}]\n`;
            
            if (incGlyphs) outputTxt += `الرسم الفرعوني : ${card.querySelector('.hieroglyph-val').value.trim()}\n`;
            if (incTranslit) outputTxt += `النقل الصوتي   : ${card.querySelector('.translit-val').value.trim()}\n`;
            if (incArabic) outputTxt += `الترجمة العربية : ${card.querySelector('.arabic-val').value.trim()}\n`;
            if (incEnglish) outputTxt += `الترجمة الإنجليزية: ${card.querySelector('.english-val').value.trim()}\n`;
            if (incGerman) outputTxt += `الترجمة الألمانية : ${card.querySelector('.german-val').value.trim()}\n`;
            if (incFrench) outputTxt += `الترجمة الفرنسية  : ${card.querySelector('.french-val').value.trim()}\n`;
            if (incNotes) outputTxt += `الملاحظة الأثرية : ${card.querySelector('.notes-val').value.trim()}\n`;
            
            outputTxt += `\n------------------------------------------------------------------------\n\n`;
        });

        downloadFile(outputTxt, `${textId}_audit_report.txt`, "text/plain;charset=utf-8");
    }
    closeExportModal();
}

function downloadFile(content, fileName, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
}

window.onload = () => {
    addNewSentence();
};