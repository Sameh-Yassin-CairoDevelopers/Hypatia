import http.server
import socketserver
import webbrowser
import threading
import sys
import os
import json
import urllib.parse
import datetime

try:
    port_input = input("[*] يرجى إدخال رقم البورت (اضغط Enter للافتراضي 8000): ").strip()
    PORT = int(port_input) if port_input else 8000
except ValueError:
    print("[-] إدخال خاطئ. سيتم استخدام البورت الافتراضي: 8000")
    PORT = 8000

HOST = "127.0.0.1"
URL = f"http://{HOST}:{PORT}"

# فهارس الكلمات المعجمية (HYP-EGY)
DICTIONARY_MAP = {}
FLAT_DICTIONARY_MAP = {}

# فهارس الكيانات التاريخية والاستنادية (HYP-NE)
ENTITY_MAP = {}
FLAT_ENTITY_MAP = {}

# الملفات الاستنادية لحل الجذور والأعلام
LEMMA_RESOLVER_PATH = "lemma_resolver.json"
ENTITY_RESOLVER_PATH = "entity_resolver.json"

LEMMA_RESOLVER = {}
ENTITY_RESOLVER = {}

# قواميس طبقة المعرفة العميقة المجمعة تلقائياً (5.3, 5.4, 5.5)
STORY_INDEX = {}      # 5.3: فهرس القصص لكل كلمة
CONTEXT_INDEX = {}    # 5.4: فهرس السياق والترتيب ورقم موضع الحرف الدقيق
CO_OCCURRENCE = {}    # 5.5: المصاحبات اللفظية ثنائية الاتجاه (يمين ويسار)

def normalize_translit(text):
    """تجريد اللواحق والضمائر وتوحيد ترميز الحروف الخاصة لربط الجذور"""
    if not text:
        return ""
    text = text.strip().lower()
    if "=" in text:
        text = text.split("=")[0]
    for suffix in [".n", ".t", ".wt", ".w", "-n", "-t", "-wt", "-w"]:
        if text.endswith(suffix):
            text = text[:-len(suffix)]
            
    # توحيد ترميز حرف العين (Ayin) صراحة بالأكواد الستة عشرية لليونيكود
    ayin_variants = ["\u02bf", "\u2018", "'", "`", "\u0060", "\u0a725", "\ua725"]
    for v in ayin_variants:
        text = text.replace(v, "ꜥ")
        
    # توحيد ترميز حرف الألف (Aleph)
    aleph_variants = ["\u02be", "\u2019", "3", "\u0a723", "\ua723"]
    for v in aleph_variants:
        text = text.replace(v, "ꜣ")
        
    # توحيد ترميز حرف الياء (i-reed leaf)
    i_variants = ["\u1ec9", "j", "i\u0313"]
    for v in i_variants:
        text = text.replace(v, "ỉ")
        
    text = text.replace("[", "").replace("]", "").replace("(", "").replace(")", "").replace("⸢", "").replace("⸣", "")
    return text.strip()

def flat_ascii_normalize(text):
    """جسر الترميز المصري القديم الموحد (Unified Code-Bridge)"""
    if not text:
        return ""
    text = normalize_translit(text)
    replacements = {
        "ḥ": "h", "h": "h",
        "ḫ": "h", "x": "h",
        "ẖ": "h", "X": "h",
        "š": "s", "S": "s", "ś": "s",
        "ḳ": "k", "q": "k",
        "ṯ": "t", "T": "t",
        "ḏ": "d", "D": "d",
        "ꜣ": "a", "A": "a", "3": "a",
        "ꜥ": "a", "ʿ": "a", "‘": "a", "'": "a", "`": "a", "a": "a",
        "ỉ": "i", "j": "i", "y": "i", "i": "i"
    }
    flat_text = ""
    for char in text:
        flat_text += replacements.get(char, char)
    return flat_text.strip()

def calculate_glyph_match_score(sentence_glyph, card_glyph):
    """خوارزمية مطابقة الرموز الهيروغليفية تلقائياً"""
    if not sentence_glyph or not card_glyph:
        return 0
    s_clean = sentence_glyph.replace(" ", "").strip()
    c_clean = card_glyph.replace(" ", "").strip()
    if c_clean in s_clean:
        return len(c_clean) * 10
    overlap = set(c_clean).intersection(set(s_clean))
    return len(overlap)

def load_lemma_resolver():
    """تحميل ملف حلّال الجذور واللواحق النحوية مجرداً من القرص محلياً"""
    global LEMMA_RESOLVER
    if os.path.exists(LEMMA_RESOLVER_PATH):
        try:
            with open(LEMMA_RESOLVER_PATH, 'r', encoding='utf-8') as f:
                LEMMA_RESOLVER = json.load(f)
            print(f"[+] تم تحميل ملف حلّال الجذور '{LEMMA_RESOLVER_PATH}' بنجاح ويحتوي على {len(LEMMA_RESOLVER)} تطابق لغوي.")
        except Exception as e:
            print(f"[-] خطأ في قراءة ملف الجذور '{LEMMA_RESOLVER_PATH}': {e}.")
            LEMMA_RESOLVER = {}
    else:
        print(f"[-] تنبيه: ملف حلّال الجذور '{LEMMA_RESOLVER_PATH}' غير موجود حالياً.")
        LEMMA_RESOLVER = {}

def load_entity_resolver():
    """تحميل ملف حلّال الأعلام والكيانات الجغرافية والتاريخية مجرداً من القرص محلياً"""
    global ENTITY_RESOLVER
    if os.path.exists(ENTITY_RESOLVER_PATH):
        try:
            with open(ENTITY_RESOLVER_PATH, 'r', encoding='utf-8') as f:
                ENTITY_RESOLVER = json.load(f)
            print(f"[+] تم تحميل ملف حلّال الكيانات '{ENTITY_RESOLVER_PATH}' بنجاح ويحتوي على {len(ENTITY_RESOLVER)} علم جغرافي وتاريخي.")
        except Exception as e:
            print(f"[-] خطأ في قراءة ملف الأعلام '{ENTITY_RESOLVER_PATH}': {e}.")
            ENTITY_RESOLVER = {}
    else:
        print(f"[-] تنبيه: ملف حلّال الكيانات '{ENTITY_RESOLVER_PATH}' غير موجود حالياً.")
        ENTITY_RESOLVER = {}

def index_dictionary_and_entity_cards():
    """مسح وفهرسة كروت القاموس (HYP-EGY) وكروت الأعلام (HYP-NE) بالتوازي"""
    global DICTIONARY_MAP, FLAT_DICTIONARY_MAP, ENTITY_MAP, FLAT_ENTITY_MAP
    
    # 1. فهرسة القاموس اللغوي (meta_cards)
    dict_dir = "meta_cards"
    if not os.path.exists(dict_dir) and os.path.exists(os.path.join("storage", "meta_cards")):
        dict_dir = os.path.join("storage", "meta_cards")
        
    if os.path.exists(dict_dir):
        print(f"[*] جاري فحص وفهرسة قاموس الكلمات من المجلد: '{dict_dir}' ...")
        indexed_count = 0
        collision_count = 0
        DICTIONARY_MAP = {}
        FLAT_DICTIONARY_MAP = {}
        
        for root, dirs, files in os.walk(dict_dir):
            for file in files:
                if file.endswith('.json'):
                    file_path = os.path.join(root, file)
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            card_data = json.load(f)
                            translit = card_data.get('layer1_core', {}).get('transliteration')
                            if translit:
                                clean_key = normalize_translit(translit)
                                if clean_key:
                                    if clean_key not in DICTIONARY_MAP:
                                        DICTIONARY_MAP[clean_key] = []
                                    else:
                                        collision_count += 1
                                    DICTIONARY_MAP[clean_key].append(file_path)
                                
                                flat_key = flat_ascii_normalize(translit)
                                if flat_key:
                                    if flat_key not in FLAT_DICTIONARY_MAP:
                                        FLAT_DICTIONARY_MAP[flat_key] = []
                                    if file_path not in FLAT_DICTIONARY_MAP[flat_key]:
                                        FLAT_DICTIONARY_MAP[flat_key].append(file_path)
                                indexed_count += 1
                    except Exception:
                        pass
        print(f"[+] تم بنجاح فهرسة {indexed_count} بطاقة مفردة لغوية.")
        print(f"[i] تم رصد ومعالجة {collision_count} تداخل لفظي لغوي (Homonyms) برمجياً.")

    # 2. فهرسة الأعلام والكيانات التاريخية (meta_entities)
    entity_dir = "meta_entities"
    if os.path.exists(entity_dir):
        print(f"[*] جاري فحص وفهرسة مجلد الكيانات التاريخية والأعلام: '{entity_dir}' ...")
        entity_count = 0
        ENTITY_MAP = {}
        FLAT_ENTITY_MAP = {}
        
        for root, dirs, files in os.walk(entity_dir):
            for file in files:
                if file.endswith('.json'):
                    file_path = os.path.join(root, file)
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            card_data = json.load(f)
                            translit = card_data.get('layer1_core', {}).get('transliteration')
                            if translit:
                                clean_key = normalize_translit(translit)
                                if clean_key:
                                    if clean_key not in ENTITY_MAP:
                                        ENTITY_MAP[clean_key] = []
                                    ENTITY_MAP[clean_key].append(file_path)
                                
                                flat_key = flat_ascii_normalize(translit)
                                if flat_key:
                                    if flat_key not in FLAT_ENTITY_MAP:
                                        FLAT_ENTITY_MAP[flat_key] = []
                                    if file_path not in FLAT_ENTITY_MAP[flat_key]:
                                        FLAT_ENTITY_MAP[flat_key].append(file_path)
                                entity_count += 1
                    except Exception:
                        pass
        print(f"[+] تم بنجاح فهرسة {entity_count} بطاقة كيان تاريخي واستنادي (HYP-NE).")
    else:
        print(f"[-] تنبيه: مجلد الأعلام والكيانات '{entity_dir}' غير موجود حالياً.")

def build_knowledge_relations_index():
    """
    بناء طبقة المعرفة العميقة ديناميكياً وتلقائياً عند الإقلاع.
    يقوم السيرفر بمسح مجلد القصص بالكامل وحساب:
    - 5.3: فهرس القصص لكل كلمة (Story Index).
    - 5.4: فهرس السياق والترتيب ورقم موضع الحرف الدقيق (Context Index & Character Offset).
    - 5.5: علاقات المصاحبة اللفظية ثنائية الاتجاه (يمين ويسار - Directional Collocations).
    """
    global STORY_INDEX, CONTEXT_INDEX, CO_OCCURRENCE
    
    STORY_INDEX = {}
    CONTEXT_INDEX = {}
    CO_OCCURRENCE = {}
    
    storage_dir = "storage"
    if not os.path.exists(storage_dir):
        return
        
    print("[*] جاري بناء طبقة المعرفة العميقة وفهرسة السياقات والمصاحبات اللفظية...")
    
    for root, dirs, files in os.walk(storage_dir):
        for file in files:
            if file.endswith('.json') and file != 'master_index.json' and file != 'academic_suggestions.json':
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        story_data = json.load(f)
                        story_id = story_data.get('text_id', file.replace('.json', ''))
                        story_title = story_data.get('metadata', {}).get('title_ar', story_id)
                        
                        # جلب معلومات المخطوط لتوثيق اللغة الأصلية للترجمة
                        story_meta = story_data.get('metadata', {})
                        orig_lang = story_meta.get('original_translation_language', 'unknown')
                        
                        sentences = story_data.get('sentences', [])
                        for s_idx, sentence in enumerate(sentences):
                            s_id = sentence.get('metadata', {}).get('id', f"{story_id}-S{s_idx+1}")
                            s_arabic = sentence.get('layer2_languages', {}).get('arabic', '')
                            
                            # استخراج الكلمات والنقل الصوتي للجملة لحساب الـ Offset
                            translit_str = sentence.get('layer1_core', {}).get('transliteration', '')
                            
                            tokens = []
                            if sentence.get('layer6_relationships', {}).get('word_tokens'):
                                tokens = sentence['layer6_relationships']['word_tokens']
                            else:
                                raw_words = translit_str.split()
                                for rw in raw_words:
                                    clean_rw = "".join(c for c in rw if c.isalnum() or c in "ꜣꜥḥḫẖšḳṯḏ-.")
                                    if clean_rw:
                                        tokens.append({"transliteration": clean_rw, "lemma_ref": None})
                                        
                            # معالجة وحساب المؤشرات والمصاحبات اللفظية لكل توكن
                            for t_idx, tok in enumerate(tokens):
                                raw_translit = tok.get('transliteration', '')
                                clean_tok = normalize_translit(raw_translit)
                                
                                # حساب رقم موضع الحرف الدقيق (Character Offset) للكلمة داخل الجملة الكلية للنقل الصوتي
                                char_offset = -1
                                if raw_translit:
                                    char_offset = translit_str.find(raw_translit)
                                
                                card_id = None
                                
                                # أ) هل هو علم تاريخي؟
                                resolved_entity_id = ENTITY_RESOLVER.get(clean_tok)
                                if resolved_entity_id:
                                    card_id = resolved_entity_id
                                else:
                                    # ب) هل هو جذر لغوي؟
                                    resolved_word = LEMMA_RESOLVER.get(clean_tok, clean_tok)
                                    norm_resolved = normalize_translit(resolved_word)
                                    paths = DICTIONARY_MAP.get(norm_resolved) or FLAT_DICTIONARY_MAP.get(flat_ascii_normalize(resolved_word))
                                    if paths:
                                        try:
                                            with open(paths[0], 'r', encoding='utf-8') as cf:
                                                card_id = json.load(cf).get('metadata', {}).get('id')
                                        except Exception:
                                            pass
                                            
                                if not card_id:
                                    continue
                                    
                                # 5.3: فهرس القصص (Story Index)
                                if card_id not in STORY_INDEX:
                                    STORY_INDEX[card_id] = []
                                if {"id": story_id, "title": story_title} not in STORY_INDEX[card_id]:
                                    STORY_INDEX[card_id].append({"id": story_id, "title": story_title})
                                    
                                # 5.4: فهرس السياق والترتيب ورقم الحرف (Context Index & Offset)
                                if card_id not in CONTEXT_INDEX:
                                    CONTEXT_INDEX[card_id] = []
                                CONTEXT_INDEX[card_id].append({
                                    "story_id": story_id,
                                    "story_title": story_title,
                                    "sentence_id": s_id,
                                    "sentence_arabic": s_arabic,
                                    "position": t_idx + 1,
                                    "char_offset": char_offset,
                                    "original_lang": orig_lang
                                })
                                
                                # 5.5: حساب تكرار المصاحبة اللفظية ثنائية الاتجاه (Directional Collocations)
                                if card_id not in CO_OCCURRENCE:
                                    CO_OCCURRENCE[card_id] = {"left": {}, "right": {}}
                                    
                                # الكلمة السابقة على اليمين (Left Neighbor)
                                if t_idx > 0:
                                    left_neigh = tokens[t_idx-1].get('transliteration')
                                    if left_neigh:
                                        clean_left = normalize_translit(left_neigh)
                                        if clean_left:
                                            CO_OCCURRENCE[card_id]["left"][clean_left] = CO_OCCURRENCE[card_id]["left"].get(clean_left, 0) + 1
                                
                                # الكلمة التالية على اليسار (Right Neighbor)
                                if t_idx < len(tokens) - 1:
                                    right_neigh = tokens[t_idx+1].get('transliteration')
                                    if right_neigh:
                                        clean_right = normalize_translit(right_neigh)
                                        if clean_right:
                                            CO_OCCURRENCE[card_id]["right"][clean_right] = CO_OCCURRENCE[card_id]["right"].get(clean_right, 0) + 1
                except Exception as e:
                    print(f"[-] خطأ أثناء فهرسة الملف المعرفي {file}: {e}")
                    
    # اختزال قائمة المصاحبات اللفظية لأعلى 5 تكرارات لكل اتجاه لتنظيف المخرجات
    for card_id, dir_dict in list(CO_OCCURRENCE.items()):
        sorted_left = sorted(dir_dict["left"].items(), key=lambda x: x[1], reverse=True)[:5]
        sorted_right = sorted(dir_dict["right"].items(), key=lambda x: x[1], reverse=True)[:5]
        
        CO_OCCURRENCE[card_id] = {
            "left": [{"word": k, "count": v} for k, v in sorted_left],
            "right": [{"word": k, "count": v} for k, v in sorted_right]
        }
        
    print(f"[+] تم نجاح بناء روابط ومعارف السياق لـ {len(CONTEXT_INDEX)} مفردة وكيان في نصوصك.")

class DynamicPyServer(http.server.SimpleHTTPRequestHandler):
    """معالج سيرفر ديناميكي لتقديم واجهات الـ APIs للنصوص والقاموس والأعلام والمراجعات"""
    
    def do_POST(self):
        parsed_url = urllib.parse.urlparse(self.path)
        
        if parsed_url.path == '/api/suggest':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                suggestion = json.loads(post_data.decode('utf-8'))
                required_fields = ["target_id", "target_type", "field_modified", "proposed_value", "academic_justification", "researcher_name", "researcher_institution"]
                for field in required_fields:
                    if not suggestion.get(field):
                        self.send_response(200)
                        self.send_header('Content-Type', 'application/json; charset=utf-8')
                        self.end_headers()
                        error_response = {"success": False, "error": f"الحقل الأكاديمي '{field}' مطلوب ولم يتم ملؤه بصورة صحيحة."}
                        self.wfile.write(json.dumps(error_response, ensure_ascii=False).encode('utf-8'))
                        return
                
                suggestions_file = os.path.join("storage", "academic_suggestions.json")
                os.makedirs("storage", exist_ok=True)
                
                suggestions_list = []
                if os.path.exists(suggestions_file):
                    try:
                        with open(suggestions_file, 'r', encoding='utf-8') as f:
                            suggestions_list = json.load(f)
                    except Exception:
                        suggestions_list = []
                
                suggestion_id = f"SUG-{len(suggestions_list) + 1:06d}"
                suggestion["suggestion_id"] = suggestion_id
                suggestion["submitted_at"] = datetime.datetime.utcnow().isoformat() + "Z"
                suggestion["votes_confirm"] = 0
                suggestion["votes_reject"] = 0
                suggestion["peer_reviews"] = []
                suggestion["status"] = "pending_consensus"
                
                suggestions_list.append(suggestion)
                with open(suggestions_file, 'w', encoding='utf-8') as f:
                    json.dump(suggestions_list, f, ensure_ascii=False, indent=4)
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json; charset=utf-8')
                self.end_headers()
                success_response = {"success": True, "suggestion_id": suggestion_id}
                self.wfile.write(json.dumps(success_response, ensure_ascii=False).encode('utf-8'))
                print(f"[+] تم تسجيل مقترح تعديل لغوي جديد بنجاح: {suggestion_id} للبطاقة {suggestion['target_id']}")
                
            except Exception as e:
                self.send_response(200)
                self.send_header('Content-type', 'application/json; charset=utf-8')
                self.end_headers()
                err_response = {"success": False, "error": f"حدث خطأ داخلي في الخادم أثناء تدوين المقترح: {str(e)}"}
                self.wfile.write(json.dumps(err_response, ensure_ascii=False).encode('utf-8'))
                
        else:
            self.send_response(404)
            self.end_headers()

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        
        if parsed_url.path == '/api/dictionary':
            query = urllib.parse.parse_qs(parsed_url.query)
            word = query.get('word', [''])[0].strip()
            sentence_glyph = query.get('sentence_glyph', [''])[0].strip()
            lemma_ref = query.get('lemma_ref', [''])[0].strip()
            
            # أ) تصفية أولية للكلمة
            word_clean_temp = word.lower().replace("[", "").replace("]", "").replace("(", "").replace(")", "")
            if "=" in word_clean_temp:
                word_clean_temp = word_clean_temp.split("=")[0]
                
            # ب) طبقة الـ Entity Resolver للكيانات والأعلام كخيار أول
            resolved_entity_id = ENTITY_RESOLVER.get(word_clean_temp, ENTITY_RESOLVER.get(word.strip()))
            
            # ج) طبقة حلّال الجذور المعتمد (Lemma Resolver)
            resolved_word = LEMMA_RESOLVER.get(word_clean_temp, LEMMA_RESOLVER.get(word.strip(), word))
            
            clean_word = normalize_translit(resolved_word)
            flat_word = flat_ascii_normalize(resolved_word)
            
            file_paths = []
            
            if resolved_entity_id:
                entity_file = os.path.join("meta_entities", f"{resolved_entity_id}.json")
                if os.path.exists(entity_file):
                    file_paths = [entity_file]
            
            if not file_paths:
                file_paths = DICTIONARY_MAP.get(clean_word) or FLAT_DICTIONARY_MAP.get(flat_word) or DICTIONARY_MAP.get(resolved_word.lower())
                
            if not file_paths:
                file_paths = ENTITY_MAP.get(clean_word) or FLAT_ENTITY_MAP.get(flat_word)
            
            if file_paths:
                matching_cards = []
                for path in file_paths:
                    if os.path.exists(path):
                        try:
                            with open(path, 'r', encoding='utf-8') as f:
                                card_data = json.load(f)
                                card_id = card_data.get('metadata', {}).get('id')
                                
                                # إلحاق وتمرير حقول المعرفة العلوية ديناميكياً (5.3, 5.4, 5.5) في بطاقة الرد
                                if card_id:
                                    card_data["knowledge_insights"] = {
                                        "story_appearances": STORY_INDEX.get(card_id, []),
                                        "context_occurrences": CONTEXT_INDEX.get(card_id, []),
                                        "collocations": CO_OCCURRENCE.get(card_id, {"left": [], "right": []})
                                    }
                                    
                                matching_cards.append(card_data)
                        except Exception:
                            pass
                
                if matching_cards:
                    def get_sorting_score(card):
                        card_id = card.get('metadata', {}).get('id', '')
                        if lemma_ref and card_id == lemma_ref:
                            return 100000
                        card_glyph = card.get('layer1_core', {}).get('hieroglyph', '')
                        return calculate_glyph_match_score(sentence_glyph, card_glyph)
                    
                    matching_cards.sort(key=get_sorting_score, reverse=True)
                    
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json; charset=utf-8')
                    self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
                    self.end_headers()
                    self.wfile.write(json.dumps(matching_cards, ensure_ascii=False).encode('utf-8'))
                    return
            
            # تجنب إظهار رسائل حمراء في الـ Console بالمتصفح
            self.send_response(200)
            self.send_header('Content-type', 'application/json; charset=utf-8')
            self.end_headers()
            error_response = {
                "not_found": True,
                "error": f"المفردة أو العلم التاريخي '{word}' لم تؤرشف بطاقته المعجمية بعد في مجلد هيباتيا."
            }
            self.wfile.write(json.dumps(error_response, ensure_ascii=False).encode('utf-8'))
            
        # واجهة الـ API لمسح وعرض القصص المتاحة تلقائياً في مجلد التخزين
        elif parsed_url.path == '/api/stories':
            self.send_response(200)
            self.send_header('Content-type', 'application/json; charset=utf-8')
            self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
            self.end_headers()
            
            stories_list = []
            storage_dir = "storage"
            
            if os.path.exists(storage_dir):
                for root, dirs, files in os.walk(storage_dir):
                    for file in files:
                        if file.endswith('.json') and file != 'master_index.json' and file != 'academic_suggestions.json':
                            file_path = os.path.join(root, file)
                            try:
                                with open(file_path, 'r', encoding='utf-8') as f:
                                    story_data = json.load(f)
                                    meta = story_data.get('metadata', {})
                                    stories_list.append({
                                        "text_id": story_data.get('text_id', meta.get('id', file.replace('.json', ''))),
                                        "title_ar": meta.get('title_ar', 'نص بدون عنوان عربي'),
                                        "title_en": meta.get('title_en', 'Untitled'),
                                        "file_path": file_path.replace('\\', '/')
                                    })
                            except Exception:
                                stories_list.append({
                                    "text_id": file.replace('.json', ''),
                                    "title_ar": f"ملف تالف: {file}",
                                    "title_en": file,
                                    "file_path": file_path.replace('\\', '/')
                                })
            
            stories_list.sort(key=lambda x: x['text_id'])
            self.wfile.write(json.dumps(stories_list, ensure_ascii=False).encode('utf-8'))
            
        else:
            super().do_GET()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

def start_server():
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer((HOST, PORT), DynamicPyServer) as httpd:
        print(f"[+] سيرفر هيباتيا الديناميكي يعمل الآن على: {URL}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n[-] تم إيقاف السيرفر المحلي.")
            sys.exit(0)

if __name__ == "__main__":
    # 1. تحميل ملف حلّال الجذور اللغوية
    load_lemma_resolver()
    
    # 2. تحميل ملف حلّال الأعلام والكيانات التاريخية
    load_entity_resolver()
    
    # 3. فهرسة بطاقات القاموس (HYP-EGY) وبطاقات الأعلام (HYP-NE) بالتوازي
    index_dictionary_and_entity_cards()
    
    # 4. بناء طبقة المعرفة العميقة ديناميكياً وفهرسة مواضع الكلمات تلقائياً (5.3, 5.4, 5.5)
    build_knowledge_relations_index()
    
    # 5. تشغيل الخادم المحلي
    server_thread = threading.Thread(target=start_server)
    server_thread.daemon = True
    server_thread.start()
    
    webbrowser.open(URL)
    
    try:
        while server_thread.is_alive():
            server_thread.join(timeout=1.0)
    except KeyboardInterrupt:
        print("\n[-] تم إنهاء البرنامج بسلام.")
        sys.exit(0)
