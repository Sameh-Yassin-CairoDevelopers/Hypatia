import os
import sys
import subprocess

# =========================================================================
# Hypatia Project - Cloud Serverless Edition
# Automatic GitHub Deployment Script (Stage 5.11)
# Version : 1.0 (Zero-Dependency & Thread Safe)
# =========================================================================

# رابط مستودعك الرسمي المعتمد في جيت هاب
REPOSITORY_URL = "https://github.com/Sameh-Yassin-CairoDevelopers/Hypatia.git"

def create_gitignore_file():
    """توليد ملف .gitignore لحماية النسخ الاحتياطية وملفات الكاش محلياً قبل الرفع"""
    gitignore_path = ".gitignore"
    if not os.path.exists(gitignore_path):
        print("[*] جاري توليد ملف .gitignore لحماية مجلدات النسخ الاحتياطية والكاش...")
        content = """# Hypatia Project - Git Ignore
backups/
storage/backups_original/
__pycache__/
.DS_Store
.vscode/
.hypatia/
"""
        try:
            with open(gitignore_path, "w", encoding="utf-8") as f:
                f.write(content)
            print("[+] تم إنشاء ملف .gitignore بنجاح.")
        except Exception as e:
            print(f"[-] تنبيه: فشل إنشاء ملف .gitignore: {e}")

def run_git_command(command_str):
    """تنفيذ أوامر جيت هاب محلياً على جهازك ومراقبة استجابة الأكواد بسلامة كاملة"""
    print(f"[*] جاري تنفيذ الأمر: {command_str}")
    result = subprocess.run(
        command_str, 
        capture_output=True, 
        text=True, 
        shell=True, 
        encoding="utf-8", 
        errors="ignore"
    )
    if result.returncode != 0:
        print(f"[-] خطأ أثناء تنفيذ الأمر:\n{result.stderr.strip()}")
        return False, result.stderr
    
    if result.stdout.strip():
        print(f"[+] نجاح الاستجابة:\n{result.stdout.strip()}")
    else:
        print("[+] تم بنجاح.")
    print()
    return True, result.stdout

def main():
    print("=" * 65)
    print("         سكريبت الرفع التلقائي لملفات هيباتيا الـ 6,541 إلى GitHub       ")
    print("=" * 65)
    
    # 1. توليد ملف الحماية للتراجع عن النسخ الاحتياطية
    create_gitignore_file()
    
    # 2. التحقق من وجود أداة جيت محلياً في جهازك
    success, out = run_git_command("git --version")
    if not success:
        print("[-] خطأ: أداة Git غير مثبتة على جهازك أو غير مضافة لمتغيرات البيئة (PATH). يرجى تثبيتها لتتمكن من رفع آلاف الملفات بسلام.")
        return

    # 3. تهيئة مستودع جيت محلي (git init)
    if not os.path.exists(".git"):
        run_git_command("git init")
    
    # 4. ربط المستودع برابط مستودعك السحابي الرسمي
    # إزالة أي ريموت قديم وإعادة ضبطه برابطك الجديد
    run_git_command("git remote remove origin")
    run_git_command(f"git remote add origin {REPOSITORY_URL}")
    
    # 5. أرشفة وفهرسة الـ 6,541 ملف بالكامل للمستودع
    print("[*] جاري أرشفة وضغط كافة الملفات (6,541 كارت وأعلام وقصص)... يرجى الانتظار قليلاً...")
    success, _ = run_git_command("git add .")
    if not success:
        print("[-] فشل أرشفة الملفات.")
        return

    # 6. تدوين التغيير وحفظ الـ Commit
    commit_msg = "Initialize Hypatia Stage 5.0 Serverless Repository"
    success, _ = run_git_command(f'git commit -m "{commit_msg}"')
    if not success:
        # ربما لا توجد تغييرات جديدة لرفعها
        pass

    # 7. توجيه الفرع الرئيسي لـ main
    run_git_command("git branch -M main")
    
    # 8. الدفع والرفع الفوري للسحاب (git push)
    print("=" * 65)
    print("[*] جاري بدء الرفع السحابي لـ GitHub الآن...")
    print("[*] تنبيه: في حال ظهور نافذة منبثقة من ويندوز، يرجى الضغط على Sign in with browser لتسجيل الدخول الفوري بضغطة زر واحدة.")
    print("=" * 65)
    
    success, _ = run_git_command("git push -u origin main")
    
    if success:
        print("=" * 65)
        print("[+] مبروك! تم رفع كامل ملفات مشروعك الـ 6,541 والكيانات والواجهة بنجاح إلى GitHub!")
        print(f"[+] موقعك متاح الآن أونلاين على مدار 24 ساعة عبر الرابط:")
        # صياغة رابط الـ GitHub Pages الافتراضي لمتصفحك
        parts = REPOSITORY_URL.replace("https://github.com/", "").replace(".git", "").split("/")
        if len(parts) >= 2:
            print(f"    https://{parts[0]}.github.io/{parts[1]}/")
        print("=" * 65)
    else:
        print("[-] فشل رفع الملفات. يرجى التأكد من اتصال الإنترنت وصلاحيات مستودعك والتحقق من حسابك.")

if __name__ == "__main__":
    main()
