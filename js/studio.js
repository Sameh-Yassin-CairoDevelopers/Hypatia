<!DOCTYPE html>
<html lang="ar" data-theme="papyrus">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>مرسم هيباتيا الرقمي - Authoring Studio Cloud</title>
    
    <!-- استدعاء ملف التنسيقات المشترك الموحد من مجلد css -->
    <link rel="stylesheet" href="css/main.css">

    <!-- جلب مكتبة Supabase SDK الرسمية من خوادم الـ CDN لتفعيل الحفظ والتأصيل السحابي الفوري -->
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
</head>
<body>

    <!-- 1. شريط التحكم والعمليات الرئيسي للمرسم -->
    <header class="studio-header">
        <a href="index.html" style="text-decoration: none; display: inline-flex; align-items: center; gap: 5px; color: var(--accent-color); font-family: 'Amiri', serif; font-size: 1.1rem; font-weight: bold;">↩️ عودة للبوابة الرئيسية</a>
        <h1>مرسم تحقيق المخطوطات والقصص سباعية الطبقات ✒️</h1>
        <div class="btn-group">
            <button class="btn" onclick="triggerFileInput()">📂 رفع ملف قصة JSON</button>
            <input type="file" id="fileInput" accept=".json" style="display: none;" onchange="loadJSONFile(event)">
            
            <button class="btn" onclick="createNewStory()">➕ إنشاء مخطوط فارغ</button>
            <button class="btn btn-primary" onclick="openPreviewModal()">👁️ معاينة قراءة البردية</button>
            <button class="btn btn-success" onclick="saveStoryToSupabase()">💾 حفظ وتأصيل سحابي فوري</button>
            <button class="btn" style="background-color: var(--border-color);" onclick="openExportModal()">📥 تصدير مخصص وتصفية المخرجات</button>
        </div>
    </header>

    <!-- 2. مساحة العمل الكلية للمحرر -->
    <div class="studio-workspace">
        
        <!-- اللوحة اليمنى للبيانات التعريفية للمخطوط لتكون من اليمين دائماً وبدقة كاملة -->
        <aside class="meta-panel" id="metaPanel">
            <h2>البيانات التعريفية للمخطوط</h2>
            
            <div class="form-group">
                <label>معرّف المخطوط الكلي (Text ID):</label>
                <input type="text" id="textId" placeholder="مثال: EGY-501" required>
            </div>

            <div class="form-group">
                <label>عنوان المخطوط بالعربية:</label>
                <input type="text" id="titleAr" placeholder="عنوان البردية بالعربية..." required>
            </div>

            <div class="form-group">
                <label>عنوان المخطوط بالإنجليزية:</label>
                <input type="text" id="titleEn" placeholder="عنوان البردية بالإنجليزية..." required>
            </div>

            <div class="form-group">
                <label>أصل البردية بالمتاحف (Catalog No):</label>
                <input type="text" id="museumCatalog" placeholder="مثال: Papyrus Berlin P. 6619 Recto">
            </div>

            <div class="form-group">
                <label>معرّف الـ TLA المستقر (TLA ID):</label>
                <input type="text" id="stableTlaId" placeholder="مثال: TM-124057">
            </div>

            <div class="form-group">
                <label>لغة الترجمة الأصلية المرافقة:</label>
                <select id="origLang">
                    <option value="German">الألمانية (German) 🇩🇪</option>
                    <option value="English">الإنجليزية (English) 🇬🇧</option>
                    <option value="French">الفرنسية (French) 🇫🇷</option>
                    <option value="unknown">غير محدد (unknown)</option>
                </select>
            </div>

            <div class="form-group">
                <label>العالم والمراجع الأثري:</label>
                <input type="text" id="scholarlyEditor" value="Hypatia Builder" placeholder="اسم العالم المحقق...">
            </div>

            <div class="form-group">
                <label>وصف وخلفية تاريخية عن البردية:</label>
                <textarea id="descriptionAr" placeholder="اكتب هنا تاريخ المخطوط ومحتواه العلمي والأثري بالتفصيل..."></textarea>
            </div>
        </aside>

        <!-- فاصل السحب والتحجيم الرأسي لخدمة اللوحة اليمنى -->
        <div class="resize-splitter" id="splitter1"></div>

        <!-- اللوحة اليسرى العريضة لسرد أسطر المخطوط -->
        <main class="editor-panel">
            <h2>
                <span>الأسطر والجمل المضافة للمخطوط</span>
                <button class="btn btn-primary" onclick="addNewSentence()">➕ أضف جملة جديدة للبردية</button>
            </h2>
            <div id="sentencesContainer" style="display: flex; flex-direction: column; gap: 15px;">
                <!-- كروت الأسطر تضاف تلقائياً هنا من الـ JS الفعّال -->
            </div>
        </main>
    </div>

    <!-- 3. شاشة التصدير والتصفية المستقلة والتفصيلية (Advanced Export Modal) -->
    <div id="exportModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3>تصدير مخصص وتصفية طبقات الملف</h3>
                <button class="modal-close" onclick="closeExportModal()">✕</button>
            </div>
            
            <div class="form-group">
                <label for="exportFileType">صيغة الملف المطلوب تصديره:</label>
                <select id="exportFileType">
                    <option value="json">ملف هيباتيا سباعي الطبقات القياسي (JSON)</option>
                    <option value="txt">ملف تقرير دراسي للباحثين مبوب (TXT)</option>
                </select>
            </div>

            <div class="form-group">
                <label>حدد الحقول والطبقات المراد دمجها وحقنها في الملف المصدر:</label>
                <div class="checkbox-group">
                    <label class="checkbox-item"><input type="checkbox" id="incGlyphs" checked> الرسم الفرعوني (الهيروغليفي)</label>
                    <label class="checkbox-item"><input type="checkbox" id="incTranslit" checked> النقل الصوتي (Transliteration)</label>
                    <label class="checkbox-item"><input type="checkbox" id="incArabic" checked> الترجمة العربية</label>
                    <label class="checkbox-item"><input type="checkbox" id="incEnglish" checked> الترجمة الإنجليزية</label>
                    <label class="checkbox-item"><input type="checkbox" id="incGerman" checked> الترجمة الألمانية</label>
                    <label class="checkbox-item"><input type="checkbox" id="incFrench" checked> الترجمة الفرنسية</label>
                    <label class="checkbox-item"><input type="checkbox" id="incNotes" checked> الملاحظات والتعليقات الأثرية للسطر</label>
                </div>
            </div>

            <button class="btn btn-success" style="width: 100%; font-size:1rem; padding: 12px;" onclick="runCustomExport()">إتمام التصدير والتحميل الفوري</button>
        </div>
    </div>

    <!-- 4. شاشة عرض ومعاينة قراءة البردية الكبرى التفاعلية (Zen Preview Modal) -->
    <div id="previewModal" class="modal">
        <div class="preview-modal-content">
            <div class="modal-header">
                <h3 id="previewStoryTitle">📖 معاينة قراءة البردية - نمط العرض الأكاديمي</h3>
                <button class="modal-close" onclick="closePreviewModal()">✕ أغلق المعاينة</button>
            </div>

            <div class="display-filters">
                <span style="font-weight: bold; font-size: 0.85rem; margin-left: 5px;">طبقات العرض النشطة في المعاينة:</span>
                <label class="filter-item"><input type="checkbox" id="prevGlyphs" checked onchange="updatePreviewVisibility()"> الرسم الفرعوني</label>
                <label class="filter-item"><input type="checkbox" id="prevArabic" checked onchange="updatePreviewVisibility()"> الترجمة العربية</label>
                <label class="filter-item"><input type="checkbox" id="prevId" checked onchange="updatePreviewVisibility()"> معرّف السطر</label>
                <label class="filter-item"><input type="checkbox" id="prevTranslit" checked onchange="updatePreviewVisibility()"> النقل الصوتي</label>
                <label class="filter-item"><input type="checkbox" id="prevEnglish" checked onchange="updateVisibility()"> الإنجليزية</label>
                <label class="filter-item"><input type="checkbox" id="prevGerman" checked onchange="updateVisibility()"> الألمانية</label>
                <label class="filter-item"><input type="checkbox" id="prevFrench" checked onchange="updateVisibility()"> الفرنسية</label>
                <label class="filter-item"><input type="checkbox" id="prevNotes" checked onchange="updatePreviewVisibility()"> الملاحظات الأثرية</label>
            </div>

            <div class="preview-scroll-area" id="previewScrollArea">
                <!-- تعبأ ديناميكياً من مدخلات المحرر الحالية -->
            </div>
        </div>
    </div>

    <!-- استدعاء ملف التشغيل السحابي والتحقيقي المستقر لمرسم هيباتيا -->
    <script src="js/studio.js"></script>
</body>
</html>
