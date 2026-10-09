"use client";
import { useCallback } from "react";
import { useI18n } from "./i18n";
export const copyTranslations: Record<string, string> = {
  "Anonymous PDF": "Anonim PDF",
  "Review a copy with personal details removed":
    "Kişisel bilgileri çıkarılmış kopyayı inceleyin",
  "Anonymous preview": "Anonim önizleme",
  "Download anonymous PDF": "Anonim PDF indir",
  "Preparing anonymous preview…": "Anonim önizleme hazırlanıyor…",
  "Could not prepare anonymous preview.": "Anonim önizleme hazırlanamadı.",
  "Review the redacted preview before downloading. Names, photo, contact details, and known personal values have been removed. Review free text for indirect identifiers or details we cannot recognize.":
    "İndirmeden önce önizlemeyi inceleyin. Ad, fotoğraf, iletişim bilgileri ve bilinen kişisel değerler çıkarıldı. Serbest metindeki dolaylı kimlik bilgilerini ve tanınamayan ayrıntıları kendiniz kontrol edin.",
  "Application email drafts": "Başvuru e-posta taslakları",
  "Prepare and edit a template from saved job details. No email is sent and no AI request is needed.":
    "Kayıtlı ilan bilgilerinden bir şablon hazırlayıp düzenleyin. E-posta gönderilmez ve yapay zekâ çağrısı yapılmaz.",
  "Email type": "E-posta türü",
  "Application follow-up": "Başvuru takibi",
  "Interview thank-you": "Mülakat sonrası teşekkür",
  "Offer discussion": "Teklif görüşmesi",
  "Recipient name (optional)": "Alıcı adı (isteğe bağlı)",
  "Terms you want to discuss": "Görüşmek istediğiniz koşullar",
  "Enter your own expectations; no salary figure is assumed.":
    "Beklentilerinizi kendiniz girin; maaş tutarı varsayılmaz.",
  "Save job changes before preparing an email.":
    "E-posta hazırlamadan önce ilan değişikliklerini kaydedin.",
  "Replace the existing email draft?":
    "Mevcut e-posta taslağı değiştirilsin mi?",
  "Prepare email draft": "E-posta taslağı hazırla",
  "Email subject": "E-posta konusu",
  "Email text": "E-posta metni",
  "Verify placeholders and all facts before sending. This editable draft is stored only in this browser.":
    "Göndermeden önce yer tutucuları ve tüm bilgileri doğrulayın. Düzenlenebilir taslak yalnızca bu tarayıcıda saklanır.",
  "Email draft copied.": "E-posta taslağı kopyalandı.",
  "Could not copy. Select the text or download the draft.":
    "Kopyalanamadı. Metni seçin veya taslağı indirin.",
  "Copy email draft": "E-posta taslağını kopyala",
  "Download email draft": "E-posta taslağını indir",
  "Job listing URL (optional)": "İlan bağlantısı (isteğe bağlı)",

  "Create a CV from the library": "Kütüphaneden CV oluştur",
  "A focused CV from your career archive":
    "Kariyer arşivinizden hedefe uygun CV",
  "Choose a saved job, review matching snippets and create a separate draft.":
    "Kayıtlı bir ilan seçin, eşleşen parçacıkları inceleyin ve ayrı bir taslak oluşturun.",
  "Close builder": "Oluşturucuyu kapat",
  "Saved target job": "Kayıtlı hedef ilan",
  "Loading jobs…": "İlanlar yükleniyor…",
  "Choose a saved job": "Kayıtlı bir ilan seçin",
  "Save a target job before creating a CV from the library.":
    "Kütüphaneden CV oluşturmadan önce bir hedef ilan kaydedin.",
  "Open target jobs": "Hedef ilanları aç",
  "Suggestions use text matches, not a proficiency score. Only selected original text is copied; employers, dates and qualifications are never invented.":
    "Öneriler metin eşleşmelerine dayanır; yetkinlik puanı değildir. Yalnızca seçilen özgün metin kopyalanır; işveren, tarih veya nitelik uydurulmaz.",
  "Choose career evidence": "Kariyer kanıtlarını seçin",
  "Select text matches": "Metin eşleşmelerini seç",
  Selected: "Seçilen",
  "Add a career snippet before creating a CV.":
    "CV oluşturmadan önce bir kariyer parçacığı ekleyin.",
  "Text matches": "Metin eşleşmeleri",
  "No direct text match; available for manual selection":
    "Doğrudan metin eşleşmesi yok; elle seçilebilir",
  "Not mentioned in selected evidence":
    "Seçilen kanıtlarda geçmeyen gereksinimler",
  "Review gaps yourself; missing terms will not be added to the CV.":
    "Eksikleri kendiniz değerlendirin; eksik terimler CV’ye eklenmez.",
  "Personal details": "Kişisel bilgiler",
  "First name": "Ad",
  "Last name": "Soyad",
  "Email (optional)": "E-posta (isteğe bağlı)",
  "I will complete missing personal details in the editor.":
    "Eksik kişisel bilgileri editörde tamamlayacağım.",
  "Selected snippets become a career achievements section. Complete employment history, education and contact details before exporting.":
    "Seçilen parçacıklar kariyer başarıları bölümüne eklenir. Dışa aktarmadan önce iş geçmişini, eğitim ve iletişim bilgilerini tamamlayın.",
  "Creating draft…": "Taslak oluşturuluyor…",
  "Create selected CV draft": "Seçilenlerden CV taslağı oluştur",
  "Reload saved jobs": "Kayıtlı ilanları yeniden yükle",
  "Your separate draft is ready. Review and complete it before sending.":
    "Ayrı taslağınız hazır. Göndermeden önce inceleyip tamamlayın.",
  "Open created CV": "Oluşturulan CV’yi aç",
  "Selected career achievements": "Seçilen kariyer başarıları",

  "Delete job": "İlanı sil",
  "Delete this job?": "Bu ilan silinsin mi?",
  "Delete job permanently": "İlanı kalıcı olarak sil",
  "Job deleted. Your CVs are unchanged.":
    "İlan silindi. Özgeçmişleriniz korunuyor.",
  "This permanently removes the job, its application history, saved letter and submitted copies. Your original and tailored CVs stay in your document list. Unsaved edits to this job will also be discarded.":
    "İlan, başvuru geçmişi, kayıtlı ön yazı ve gönderilen kopyalar kalıcı olarak silinir. Asıl ve ilana özel özgeçmişleriniz belge listesinde kalır. Bu ilandaki kaydedilmemiş düzenlemeler de silinir.",
  "Review saved CV": "Kayıtlı CV’yi değerlendir",
  "Close review": "Değerlendirmeyi kapat",
  "Review the saved document without changing it. Open the editor to make changes after reviewing suggestions.":
    "Kayıtlı belgeyi değiştirmeden değerlendirin. Önerileri inceledikten sonra değişiklik yapmak için editörü açın.",
  "Enable AI reviews in Settings before starting.":
    "Başlamadan önce Ayarlar’dan AI incelemelerini etkinleştirin.",
  "Review target": "Değerlendirme hedefi",
  "General CV review": "Genel CV değerlendirmesi",
  "Saved jobs could not be loaded. General review is still available.":
    "Kayıtlı ilanlar yüklenemedi. Genel değerlendirmeyi kullanabilirsiniz.",
  "Add a description or requirements to this job before reviewing against it.":
    "İlana göre değerlendirme yapmadan önce ilan açıklamasını veya gereksinimlerini ekleyin.",
  "Start AI review": "AI değerlendirmesini başlat",
  "AI review results": "AI değerlendirme sonuçları",
  "No recommendations in this review.": "Bu değerlendirmede öneri yok.",
  "Open editor to make changes": "Düzenlemek için editörü aç",
  "Review CV": "CV’yi değerlendir",

  Search: "Ara",
  Redo: "Yinele",
  "CV language": "CV dili",
  Market: "Pazar",
  "Editing panel": "Düzenleme paneli",
  "Nothing added yet": "Henüz eklenmedi",
  "Compare versions": "Sürümleri karşılaştır",
  Zoom: "Yakınlaştır",
  Fit: "Sığdır",
  "Enter a model ID to enable AI reviews.":
    "AI incelemelerini etkinleştirmek için model kimliğini girin.",
  "Confirm backup password": "Yedek parolasını tekrar girin",
  "Restore password (encrypted backups only)":
    "Geri yükleme parolası (yalnızca şifreli yedekler)",
  "Show password": "Parolayı göster",
  "Hide password": "Parolayı gizle",
  "Passwords do not match.": "Parolalar eşleşmiyor.",
  "Use at least 12 characters.": "En az 12 karakter kullanın.",

  "Settings sections": "Ayar bölümleri",
  "On this page": "Bu sayfada",
  "Workspace backup": "Çalışma alanı yedeği",
  "Workspace appearance": "Çalışma alanı görünümü",
  "Workspace storage": "Çalışma alanı depolaması",
  "Your data and AI": "Verileriniz ve yapay zeka",
  "AI on request": "İstek üzerine AI",
  Version: "Sürüm",
  "Language and theme are saved in this browser.":
    "Dil ve tema bu tarayıcıda kaydedilir.",
  "Choose the appearance that feels comfortable while editing.":
    "Düzenlerken rahat ettiğiniz görünümü seçin.",
  "Where your documents are stored and when content is shared.":
    "Belgelerinizin nerede saklandığını ve içeriğin ne zaman paylaşıldığını görün.",
  "CVs and photos are stored by your configured API. Protect the database and exported backup files.":
    "Özgeçmişler ve fotoğraflar yapılandırdığınız API tarafından saklanır. Veritabanını ve yedek dosyalarını koruyun.",
  "When AI is enabled, requested reviews send career content to the selected provider. CV photos and contact fields are excluded; free text may still contain personal details.":
    "AI etkinleştirildiğinde istediğiniz incelemeler kariyer içeriğini seçilen sağlayıcıya gönderir. CV fotoğrafı ve iletişim alanları gönderilmez; serbest metinde kişisel bilgiler bulunabilir.",
  "CV photo (optional)": "CV fotoğrafı (isteğe bağlı)",
  "Choose CV photo": "CV fotoğrafı seç",
  Photo: "Fotoğraf",
  "Upload photo": "Fotoğraf yükle",
  "Change photo": "Fotoğrafı değiştir",
  "Remove photo": "Fotoğrafı kaldır",
  "Show photo on CV": "Fotoğrafı CV üzerinde göster",
  "Selected CV photo": "Seçilen CV fotoğrafı",
  "Choose a PNG, JPEG or WebP image up to 5 MB.":
    "En fazla 5 MB boyutunda PNG, JPEG veya WebP görseli seçin.",
  "This image could not be read. Try another photo.":
    "Görsel okunamadı. Başka bir fotoğraf deneyin.",
  "Upload a portrait if you want to include one. The image is cropped to a square and stored with this CV.":
    "İsterseniz bir portre yükleyin. Görsel kare olarak kırpılır ve bu CV ile saklanır.",
  "PNG, JPEG or WebP · up to 5 MB. Save the draft to keep your changes.":
    "PNG, JPEG veya WebP · en fazla 5 MB. Değişiklikleri saklamak için taslağı kaydedin.",
  "Active CVs": "Aktif özgeçmişler",
  "Deleted documents": "Silinen belgeler",
  "Deleted document": "Silinen belge",
  "Document list": "Belge listesi",
  "Delete this CV?": "Bu özgeçmiş silinsin mi?",
  "Move to deleted documents": "Silinen belgelere taşı",
  "Delete CV permanently?": "Özgeçmiş kalıcı olarak silinsin mi?",
  "Delete permanently": "Kalıcı olarak sil",
  "The CV will move to deleted documents. You can restore it there, and its history will be kept.":
    "Özgeçmiş silinen belgelere taşınır. Oradan geri yükleyebilirsiniz; sürüm geçmişi korunur.",
  "This removes the CV and its revision history permanently. Linked jobs will be unlinked; submitted copies stay unchanged.":
    "Özgeçmiş ve sürüm geçmişi kalıcı olarak silinir. İlan bağlantıları kaldırılır; gönderilmiş kopyalar korunur.",
  "Could not delete CV.": "Özgeçmiş silinemedi.",
  "PDF · ATS review and import": "PDF · ATS inceleme ve içe aktarma",
  "Import method": "İçe aktarma yöntemi",
  "Existing PDF CV": "Mevcut PDF özgeçmiş",
  "Review a PDF, then make it editable":
    "PDF dosyasını inceleyin, ardından düzenlenebilir hale getirin",
  "Check the original PDF with local ATS heuristics. Preview extracted content before creating a new CV. No AI provider is used.":
    "Orijinal PDF dosyasını yerel ATS kurallarıyla kontrol edin. Yeni CV oluşturmadan önce çıkarılan içeriği inceleyin. AI sağlayıcısı kullanılmaz.",
  "Choose a PDF CV": "PDF özgeçmiş seç",
  "Choose a PDF up to 4 MB.": "En fazla 4 MB boyutunda bir PDF seçin.",
  "Upload PDF CV": "PDF özgeçmiş yükle",
  "Text-based PDF · up to 4 MB and 10 pages. Scanned files need OCR before import.":
    "Metin tabanlı PDF · en fazla 4 MB ve 10 sayfa. Taranan belgeler içe aktarma öncesinde OCR gerektirir.",
  "Review PDF and preview import":
    "PDF dosyasını incele ve içe aktarmayı önizle",
  "Reading PDF…": "PDF okunuyor…",
  "PDF review failed.": "PDF incelemesi başarısız oldu.",
  "Import failed.": "İçe aktarma başarısız oldu.",
  "Original PDF · ATS heuristic": "Orijinal PDF · ATS sezgisel değerlendirmesi",
  "Inspect extracted text": "Çıkarılan metni incele",
  "Editable draft preview": "Düzenlenebilir taslak önizlemesi",
  "Create editable CV": "Düzenlenebilir CV oluştur",
  "I reviewed the extraction and will check the fields in the editor.":
    "Çıkarılan içeriği inceledim ve alanları editörde kontrol edeceğim.",
  "This uses the app's CV layout. The PDF's original layout is not preserved. Ambiguous experience lines stay together so you can organize them in the editor.":
    "Uygulamanın CV düzeni kullanılır. PDF dosyasının özgün düzeni korunmaz. Belirsiz deneyim satırları editörde düzenlemeniz için birlikte tutulur.",
  "A transparent file-readability heuristic, not an external ATS score or a job-match prediction. It measures extracted text and recognized headings; columns and reading order still need your review.":
    "Şeffaf bir dosya okunabilirliği değerlendirmesidir; harici ATS puanı veya ilan uyumu tahmini değildir. Çıkarılan metni ve tanınan başlıkları ölçer; sütunları ve okuma sırasını kontrol etmeniz gerekir.",
  "extracted words": "çıkarılan kelime",
  "Leave with unsaved changes? Drafts are recoverable on this device.":
    "Kaydedilmemiş değişikliklerle çıkılsın mı? Taslaklar bu cihazda kurtarılabilir.",
  "This backup was already restored in this browser. Add another copy?":
    "Bu yedek bu tarayıcıda daha önce geri yüklendi. Bir kopya daha eklensin mi?",
  "Review suggested wording": "Önerilen metni incele",
  Tip: "İpucu",

  "Recovered draft": "Kurtarılan taslak",
  "Failed to load resume": "Özgeçmiş yüklenemedi",
  "Resolve save conflict": "Kayıt çakışmasını çöz",
  "A newer revision is available": "Daha yeni bir sürüm var",
  "Your draft is preserved. Both choices save it as a separate CV before loading the server revision.":
    "Taslağınız korunuyor. İki seçenek de sunucudaki sürümü yüklemeden önce taslağı ayrı bir özgeçmiş olarak kaydeder.",
  "Compare changes": "Değişiklikleri karşılaştır",
  "Keep draft copy and load server revision":
    "Taslağın kopyasını sakla ve son sürümü yükle",
  "Open draft copy in a new tab": "Taslak kopyasını yeni sekmede aç",
  "The draft copy was saved. Open it from the CV list.":
    "Taslağın kopyası kaydedildi. Özgeçmiş listesinden açabilirsiniz.",
  "Local draft recovery is unavailable. Save regularly.":
    "Yerel taslak kurtarma kullanılamıyor. Düzenli olarak kaydedin.",
  "Could not read the recovered draft.": "Kurtarılan taslak okunamadı.",
  "The recovered draft is invalid or uses an unsupported version.":
    "Kurtarılan taslak geçersiz veya desteklenmeyen bir sürüm kullanıyor.",
  "Another tab has a separate draft for this CV. Saving uses revision checks.":
    "Başka bir sekmede bu özgeçmişin ayrı bir taslağı var. Kayıtta sürüm kontrolü yapılır.",

  "Apply suggestion": "Öneriyi uygula",
  "Skip suggestion": "Öneriyi atla",
  "Undo this suggestion": "Uygulamayı geri al",
  "Show skipped suggestion": "Öneriyi yeniden göster",
  "Suggestion skipped.": "Öneri atlandı.",
  "Applied to draft.": "Taslağa uygulandı.",
  After: "Önerilen metin",
  Evidence: "Dayanak",
  "(Empty field)": "(Boş alan)",
  "high priority": "Yüksek öncelik",
  "medium priority": "Orta öncelik",
  "low priority": "Düşük öncelik",
  "Verify every claim before applying. This changes the draft; use Save Draft to keep it.":
    "Uygulamadan önce bilgileri doğrulayın. Öneri taslağı değiştirir; kalıcı olması için Taslağı Kaydet'i kullanın.",
  "This field changed since the review. Run a new review to avoid overwriting your edits.":
    "Bu alan incelemeden sonra değişti. Düzenlemeleriniz korunuyor; güncel öneri için yeniden inceleme yapın.",
  "Advice only: no safe field replacement was identified.":
    "Bu bir tavsiyedir. Güvenli bir alan değişikliği belirlenemediği için otomatik uygulanmaz.",
  "Download a backup": "Yedek indir",
  "Restore a backup": "Yedeği geri yükle",
  "Choose a JSON backup. For an encrypted backup, enter its password in the password field.":
    "JSON yedek dosyasını seçin. Şifreli yedek için parola alanına yedeğin parolasını girin.",
  "Add the backup contents as new records? Existing records will remain unchanged.":
    "Yedek içeriği yeni kayıtlar olarak eklensin mi? Mevcut kayıtlar korunacaktır.",
  "Local rule checks": "Yerel kural kontrolleri",
  "Rule findings": "Yerel kural bulguları",
  "How are these scores calculated?": "Bu puanlar nasıl hesaplanıyor?",
  "These checks run locally without AI. They check document structure, contact details, duplicate or long bullets and other predefined rules. AI wording suggestions above are separate.":
    "Bu kontroller yapay zeka kullanmadan yerelde çalışır. Belge düzeni, iletişim bilgileri, tekrarlanan veya uzun maddeler ve tanımlı diğer kurallar kontrol edilir. Yukarıdaki AI metin önerileri ayrı bir değerlendirmedir.",
  "ATS score = earned points ÷ 80 × 100. Job relevance is excluded here. Missing email subtracts 10 contact points; missing phone subtracts 5. Other rule findings reduce their related dimension.":
    "ATS puanı = kazanılan puan ÷ 80 × 100. İlanla uyum burada puanlanmaz. Eksik e-posta iletişimden 10, eksik telefon 5 puan düşürür. Diğer kural bulguları ilgili boyutun puanını azaltır.",
  "Content quality starts at 100 and deducts 15/10/5 for critical/important/warning findings in experience, projects or summary. Informational findings do not reduce the score. A score of 100 only means these rules found no penalized issues; it does not mean the text cannot be improved.":
    "İçerik kalitesi 100'den başlar; deneyim, proje veya özetteki kritik/önemli/uyarı bulguları için sırasıyla 15/10/5 puan düşülür. Bilgi amaçlı bulgular puanı düşürmez. 100 puan yalnızca puan kesilen sorun bulunmadığını belirtir; metnin geliştirilemeyeceği anlamına gelmez.",
  "No local rule findings. AI may still suggest wording improvements or ask for missing context.":
    "Yerel kurallarda bulgu yok. AI yine de metin iyileştirmeleri önerebilir veya eksik bağlam hakkında soru sorabilir.",
  "Internal document heuristic. Job relevance is not assessed here; use Jobs to compare a specific description. Not an external ATS endorsement.":
    "Uygulamanın yerel belge kontrolüdür. İlanla uyum için Hedef İlanlar'da eşleştirme yapın. Harici bir ATS onayı değildir.",
  Cancel: "İptal",
  "AI editorial score": "Yapay zeka değerlendirme puanı",
  clarity: "Anlaşılırlık",
  evidence: "Kanıtlar",
  completeness: "Bütünlük",
  relevance: "İlanla uyum",
  Strengths: "Güçlü yönler",
  "Recommended improvements": "İyileştirme önerileri",
  "Details to add or verify": "Eklenecek veya doğrulanacak bilgiler",
  "Add a target job to assess relevance.":
    "İlanla uyumu değerlendirmek için hedef ilan ekleyin.",
  "Draft or review options changed. Run a new review for an updated score.":
    "Taslak veya inceleme seçenekleri değişti. Güncel puan için yeniden inceleme yapın.",
  "Overall = earned points ÷ assessed maximum × 100. Without a target job, relevance is excluded.":
    "Toplam = kazanılan puan ÷ değerlendirilen en yüksek puan × 100. Hedef ilan yoksa ilanla uyum puanlamaya dahil edilmez.",
  "AI resume coach": "Yapay zeka ile CV incelemesi",
  "Get an explained score, strengths, gaps, and suggested wording for this draft. Suggestions never change your resume automatically.":
    "Taslağınızın güçlü yönlerini, eksiklerini ve metin önerilerini gerekçeli bir puanla inceleyin. Öneriler yalnızca onayladığınızda uygulanır.",
  "Review sends career content to the configured provider. Contact fields are omitted; free text may still identify you.":
    "İnceleme, kariyer içeriğini seçtiğiniz sağlayıcıya gönderir. İletişim alanları çıkarılır; serbest metinde kişisel bilgiler bulunabilir.",
  "Target job description (optional)": "Hedef ilan açıklaması (isteğe bağlı)",
  "Feedback language": "Değerlendirme dili",
  "Review current draft with AI": "Taslağı yapay zeka ile incele",
  "Reviewing…": "İnceleniyor…",
  "Review could not be completed": "İnceleme tamamlanamadı",
  "The AI provider's request limit or quota was reached. Wait and try again, or check your quota in the provider dashboard.":
    "Yapay zeka sağlayıcısının istek sınırına veya kotasına ulaşıldı. Bir süre sonra tekrar deneyin ya da sağlayıcı panelinden kotanızı kontrol edin.",
  "The AI provider is temporarily unavailable. Try again shortly.":
    "Yapay zeka sağlayıcısına geçici olarak erişilemiyor. Biraz sonra tekrar deneyin.",
  "The AI provider did not respond in time. Try again or select a faster model in Settings.":
    "Yapay zeka sağlayıcısı zamanında yanıt vermedi. Tekrar deneyin veya Ayarlar'dan daha hızlı bir model seçin.",
  "Job-specific resume copy": "İlana özel CV kopyası",
  "Create a separate copy of this draft for a target job, then review and accept tailored suggestions in the copy. Your original and job tracker links stay unchanged.":
    "Hedef ilan için taslağınızın ayrı bir kopyasını oluşturun ve önerileri bu kopyada değerlendirin. Asıl CV ve ilan bağlantıları korunur.",
  "Use a saved job": "Kayıtlı ilan kullan",
  "Enter manually": "Elle gir",
  "Target company": "Hedef şirket",
  "Target role": "Hedef pozisyon",
  "Uses the target job description below. A role and description are required.":
    "Aşağıdaki ilan açıklaması kullanılır. Kopya oluşturmak için pozisyon ve açıklama gereklidir.",
  "Creating copy…": "Kopya oluşturuluyor…",
  "Create job-specific copy": "İlana özel kopya oluştur",
  "AI enabled": "Yapay zeka etkin",
  "AI disabled": "Yapay zeka kapalı",
  "Gemini API key": "Gemini API anahtarı",
  "Saved keys are encrypted on the backend and excluded from workspace backups. Leave the key field blank to keep it. Changing provider or URL clears the old key unless you enter a replacement. In Docker, use http://host.docker.internal:11434 for host Ollama.":
    "Kayıtlı anahtarlar API'de şifrelenir ve çalışma alanı yedeklerine eklenmez. Korumak için anahtar alanını boş bırakın. Sağlayıcı veya adres değiştiğinde yeni anahtar girilmezse eskisi silinir. Docker'da bilgisayarınızdaki Ollama için http://host.docker.internal:11434 kullanın.",
  "Maximum backup size": "En büyük yedek boyutu",
  "Tailor CV to this job": "İlana göre CV düzenleme",
  "Highlight existing evidence in a new CV copy. No skills or achievements are invented; the original stays unchanged.":
    "Mevcut kanıtları yeni bir CV kopyasında öne çıkarın. Yetkinlik veya başarı eklenmez; özgün CV korunur.",
  "Save job changes before generating suggestions.":
    "Önerileri hazırlamadan önce ilan değişikliklerini kaydedin.",
  "Preparing suggestions…": "Öneriler hazırlanıyor…",
  "Suggest relevant bullets": "İlgili maddeleri öner",
  "No existing bullets match these requirements. Review the job requirements or CV evidence.":
    "Bu gereksinimlerle eşleşen mevcut madde bulunamadı. İlan gereksinimlerini veya CV kanıtlarını gözden geçirin.",
  "Requirements without CV evidence": "CV’de kanıtı bulunmayan gereksinimler",
  "These are wording gaps, not proof that you lack the skill. Add details only if you can verify them.":
    "Bunlar metindeki eksiklerdir; yetkinliğinizin olmadığı anlamına gelmez. Yalnızca doğrulayabildiğiniz bilgileri ekleyin.",
  "Selected bullets and their entries move to the top. All existing content is preserved.":
    "Seçilen maddeler ve bağlı kayıtları öne taşınır. Mevcut içeriğin tamamı korunur.",
  "Create tailored CV copy": "İlana özel CV kopyası oluştur",
  "Open tailored CV": "İlana özel CV’yi aç",
  "The linked CV or job changed. Generate new suggestions.":
    "Bağlı CV veya ilan değişti. Önerileri yeniden hazırlayın.",
  "Backup password (at least 12 characters)":
    "Yedek parolası (en az 12 karakter)",
  "A password encrypts the backup. Keep it safe: it cannot be recovered. Leave empty for a plain JSON backup.":
    "Parola yedeği şifreler. Güvenli saklayın: kaybolursa kurtarılamaz. Düz JSON yedek için boş bırakın.",
  "Enter the backup password before restoring.":
    "Geri yüklemeden önce yedek parolasını girin.",
  Download: "İndir",
  "Download format": "İndirme biçimi",
  "Preparing download…": "İndirme hazırlanıyor…",
  "Download failed.": "İndirme başarısız oldu.",
  "Preserves the preview layout": "Önizlemedeki düzeni korur",
  "Editable document with matching template styling":
    "Şablon stilinde düzenlenebilir Word belgesi",
  "Download DOCX": "DOCX indir",
  "Editable Word document; page layout may differ from PDF.":
    "Düzenlenebilir Word belgesi; sayfa düzeni PDF’den farklı olabilir.",
  Review: "Gözden geçir",
  "Checking PDF…": "PDF kontrol ediliyor…",
  Complete: "Tamam",
  "Ready to apply": "Başvuruya hazır kontrolü",
  "Check application": "Başvuruyu kontrol et",
  "Checks use the saved linked CV and its actual PDF. They are preparation reminders, not a hiring score.":
    "Kontroller bağlı CV’nin kayıtlı sürümünü ve gerçek PDF çıktısını kullanır. Bunlar hazırlık hatırlatmalarıdır; işe alım puanı değildir.",
  "Save application edits before checking or downloading.":
    "Kontrol veya indirme öncesinde başvuru düzenlemelerini kaydedin.",
  "Name and surname are filled": "Ad ve soyad doldurulmuş",
  "Contact email has a valid format": "İletişim e-postasının biçimi geçerli",
  "Professional headline is filled": "Mesleki unvan doldurulmuş",
  "No common draft placeholders found": "Yaygın taslak ifadeler bulunmadı",
  "Cover letter is saved": "Ön yazı kaydedilmiş",
  "Checked revision": "Kontrol edilen sürüm",
  "items to review": "gözden geçirilecek madde",
  "PDF check incomplete": "PDF kontrolü tamamlanamadı",
  "Actual PDF": "Gerçek PDF",
  "No PDF layout issues detected.": "PDF yerleşiminde sorun tespit edilmedi.",
  "Application package": "Başvuru paketi",
  "Download package": "Paketi indir",
  "One ZIP with cv.pdf and cover-letter.txt, named for the company and position. Downloading does not submit the application.":
    "Şirket ve pozisyon adıyla tek ZIP: cv.pdf ve cover-letter.txt. İndirme, başvuruyu göndermez.",
  "Save a cover letter in Documents to include it in the package.":
    "Pakete eklemek için Belgeler sekmesinde ön yazıyı kaydedin.",
  "Package downloaded. It contains the current saved CV and cover letter.":
    "Paket indirildi. Güncel kayıtlı CV ve ön yazıyı içerir.",
  "Could not download the application package.": "Başvuru paketi indirilemedi.",
  "Add Custom Sections": "Özel bölüm ekle",
  "Add Languages": "Dil ekle",
  "Add Certifications": "Sertifika ekle",

  "Application dossier": "Başvuru dosyası",
  "Application files": "Başvuru dosyaları",
  "Your career workspace": "Kariyer çalışma alanınız",
  "A clear view of every opportunity, and the story you send with it.":
    "Her fırsatın ayrıntıları, başvuru belgeleriniz ve sıradaki adım bir arada.",
  "Application list": "Başvuru listesi",
  "Application sections": "Başvuru bölümleri",
  Overview: "Genel bakış",
  "Job details": "İlan bilgileri",
  Documents: "Belgeler",
  "Open job listing": "İlanı aç",
  "Link a CV": "CV bağla",
  "Not scheduled": "Planlanmadı",
  "Application status": "Başvuru durumu",
  "Dates and notes": "Tarihler ve notlar",
  "CV match": "CV eşleşmesi",
  "Compared CV": "Karşılaştırılan CV",
  "Calculating…": "Hesaplanıyor…",
  "Not assessed": "Değerlendirilmedi",
  "Link a CV to compare the requirements in this application.":
    "Bu başvurunun gereksinimlerini karşılaştırmak için bir CV bağlayın.",
  "Missing requirements": "Eksik gereksinimler",
  "Match insights": "Eşleşme notları",
  "Requirement evidence": "Gereksinim kanıtları",
  "Evidence in your CV": "CV'deki kanıtlar",
  matched: "eşleşme",
  sources: "kaynak",
  "Open in CV": "CV'de aç",
  "No matching evidence yet. Review the requirements and linked CV.":
    "Henüz eşleşen kanıt yok. Gereksinimleri ve bağlı CV'yi gözden geçirin.",
  "Saved listing": "Kayıtlı ilan",
  "Application CV": "Başvuru CV'si",
  "Open in studio": "Stüdyoda aç",
  "Choose the CV you want to use for this application.":
    "Bu başvuruda kullanmak istediğiniz CV'yi seçin.",
  "Submitted copies": "Gönderilen kopyalar",
  "Saved copies capture the CV as it was when the application was submitted.":
    "Kayıtlı kopyalar, başvuru gönderildiği andaki CV'yi saklar.",
  "No submitted copies yet.": "Henüz gönderilen kopya yok.",
  "Download submitted copy": "Gönderilen kopyayı indir",
  "Could not load submitted copies": "Gönderilen kopyalar yüklenemedi",
  "Could not compare requirements. Save the job or compare again to retry.":
    "Gereksinimler karşılaştırılamadı. Tekrar denemek için ilanı kaydedin veya yeniden karşılaştırın.",
  "Choose an application to open its file.":
    "Dosyasını açmak için bir başvuru seçin.",
  "Working…": "İşleniyor…",
  "Add requirements from any occupation": "İlanın gereksinimlerini ekleyin",

  Close: "Kapat",
  "Add Education": "Eğitim Ekle",
  "Add Project": "Proje Ekle",
  "Redo last draft edit": "Son düzenlemeyi yinele",
  "Drag to reorder": "Sıralamak için sürükle",
  "Drag a handle onto another handle, or use the arrow buttons.":
    "Bir tutamağı başka bir tutamağın üzerine sürükleyin veya ok düğmelerini kullanın.",
  "Move down": "Aşağı taşı",
  "Section order": "Bölüm sırası",
  "Restore template order": "Şablon sırasına dön",
  "Page length assistant": "Sayfa uzunluğu yardımcısı",
  "Target page count": "Hedef sayfa sayısı",
  "Suggestions are measured using real PDFs. Changes are only applied when you approve them.":
    "Öneriler gerçek PDF dosyaları ölçülerek hazırlanır. Değişiklikler yalnızca siz uyguladığınızda geçerli olur.",
  "Find layout suggestions": "Düzen önerileri bul",
  "The draft changed. Run the check again.":
    "Taslak değişti. Kontrolü yeniden çalıştırın.",
  "The document already fits the target.":
    "Belge zaten hedef sayfa sayısına sığıyor.",
  "Apply layout": "Düzeni uygula",
  "No text is removed or rewritten by layout suggestions.":
    "Düzen önerileri hiçbir metni silmez veya yeniden yazmaz.",
  "Compact spacing": "Sıkı aralıklar",
  "Compact spacing and margins": "Sıkı aralıklar ve dar kenar boşlukları",
  "Compact layout with 9.5 pt text": "9.5 punto yazıyla sıkı düzen",
  "Review long bullets and repeated details before removing content.":
    "İçerik silmeden önce uzun maddeleri ve tekrar eden ayrıntıları gözden geçirin.",
  "Keep the most relevant experiences and projects for this application.":
    "Bu başvuru için en ilgili deneyimleri ve projeleri öne çıkarın.",
  "Search and commands": "Arama ve işlemler",
  "Search CV or actions": "CV veya işlem ara",
  "No matching content or actions.": "Eşleşen içerik veya işlem yok.",
  "Upcoming and overdue tasks": "Yaklaşan ve geciken işler",
  "Scheduled tasks through the next 14 days; overdue dates stay visible until updated.":
    "Önümüzdeki 14 gündeki planlı işler; geciken tarihler güncellenene kadar görünür kalır.",
  "No scheduled tasks in this period.": "Bu dönem için planlı iş yok.",
  Interview: "Görüşme",
  "Follow-up": "Takip",
  Overdue: "Gecikmiş",
  "Interview date and time": "Görüşme tarihi ve saati",
  "Follow-up date": "Takip tarihi",
  "Cover letter": "Ön yazı",
  "Letter language": "Ön yazı dili",
  "Use configured AI connection": "Ayarlanmış AI bağlantısını kullan",
  "Local drafts quote CV evidence. AI sends the saved CV without contact fields and the saved job description to your configured provider.":
    "Yerel taslak CV’deki ifadeleri kullanır. AI, iletişim alanları çıkarılmış kayıtlı CV’yi ve kayıtlı ilan metnini ayarladığınız sağlayıcıya gönderir.",
  "Save the job first to generate from the current requirements.":
    "Güncel gereksinimlerle oluşturmak için önce ilanı kaydedin.",
  "Replace the existing letter draft?":
    "Mevcut ön yazı taslağı değiştirilsin mi?",
  "Generate letter draft": "Ön yazı taslağı oluştur",
  "Letter text": "Ön yazı metni",
  "Download letter": "Ön yazıyı indir",
  "Review the draft before sending. Only use claims you can substantiate.":
    "Göndermeden önce taslağı gözden geçirin. Yalnızca doğrulayabildiğiniz ifadeleri kullanın.",
  "Add Experience": "Deneyim Ekle",
  "Save Draft": "Taslağı Kaydet",
  "Download PDF": "PDF İndir",
  "Item removed.": "Öğe kaldırıldı.",
  Undo: "Geri al",
  "Work Experience": "İş Deneyimi",
  "Professional Summary": "Profesyonel Özet",
  "Skill Groups": "Yetenek Grupları",
  summary: "Özet",
  experience: "Deneyim",
  education: "Eğitim",
  projects: "Projeler",
  skills: "Yetkinlikler",
  profile: "Profil",
  certifications: "Sertifikalar",
  languages: "Diller",
  customSections: "Özel bölümler",

  page: "sayfa",
  pages: "sayfa",
  "Estimated page boundaries. Exact PDF pages shows final pagination.":
    "Sayfa sınırları yaklaşık olarak gösterilir. Kesin sayfalama için Gerçek PDF sayfalarını seçin.",
  "Dashed lines mark approximate A4 page boundaries. Select Exact PDF pages to check actual page breaks before printing.":
    "Kesikli çizgiler yaklaşık A4 sayfa sınırlarını gösterir. Yazdırmadan önce kesin sayfa sonlarını kontrol etmek için Gerçek PDF sayfalarını seçin.",
  "Live layout preserves A4 width and margins; long documents continue vertically. Select Exact PDF pages to check actual page breaks before printing.":
    "Canlı düzen A4 genişliğini ve kenar boşluklarını korur; uzun belgeler aşağı doğru devam eder. Yazdırmadan önce sayfa sonlarını kontrol etmek için Gerçek PDF sayfalarını seçin.",
  "Education highlights": "Eğitimde öne çıkanlar",
  "Add highlight": "Madde ekle",
  "Project achievements": "Proje başarıları",
  "Remove bullet": "Maddeyi kaldır",
  "Remove experience": "Deneyimi kaldır",
  "Remove education": "Eğitimi kaldır",
  "Remove project": "Projeyi kaldır",
  "Remove skill group": "Yetkinlik grubunu kaldır",
  "Role summary": "Rol özeti",
  "Technologies (comma-separated)": "Teknolojiler (virgülle ayırın)",
  "Skills (comma-separated)": "Yetkinlikler (virgülle ayırın)",
  "Skill category": "Yetkinlik kategorisi",
  "Add a detail you want to include in your CV.":
    "Özgeçmişinizde yer vermek istediğiniz bir ayrıntı ekleyin.",
  "Add an entry to start this section.":
    "Bu bölüme başlamak için bir kayıt ekleyin.",
  "Close panel": "Paneli kapat",
  "Apply source changes before switching tabs or saving.":
    "Sekme değiştirmeden veya kaydetmeden önce kaynak değişikliklerini uygulayın.",
  "Search resumes": "Özgeçmiş ara",
  "Find a document…": "Belge ara…",
  "Document studio": "Belge stüdyosu",
  "All documents": "Tüm belgeler",
  "YOUR PERSONAL STUDIO": "KİŞİSEL STÜDYONUZ",
  "A little space.": "Biraz alan.",
  "A clearer story.": "Daha net bir hikâye.",
  "Shape your experience into a document that feels like you.":
    "Deneyiminizi sizi yansıtan bir belgeye dönüştürün.",
  "ON YOUR DESK": "MASANIZDA",
  "Your latest document, ready for its next chapter.":
    "Son belgeniz, bir sonraki adımınız için hazır.",
  Revision: "Sürüm",
  "Continue editing": "Düzenlemeye devam et",
  "Continue working": "Çalışmaya devam et",
  "LATEST DOCUMENT": "SON BELGE",
  "A FRESH PAGE": "YENİ BİR SAYFA",
  "Every story starts somewhere.": "Her hikâyenin bir başlangıcı var.",
  "Start a CV or bring an existing document into your workspace.":
    "Yeni bir özgeçmiş oluşturun ya da mevcut belgenizi içe aktarın.",
  "Your documents": "Belgeleriniz",
  "THE COLLECTION": "KOLEKSİYON",
  "Room for a new story": "Yeni bir hikâyeye yer açın",
  "Begin with a blank page": "Boş bir sayfayla başlayın",
  "WHAT’S NEXT": "SIRADAKİ ADIM",
  "Stories in motion": "Yolculuğunuz sürüyor",
  "Add a target job to start shaping your next application.":
    "Bir hedef ilan ekleyerek sonraki başvurunuzu hazırlamaya başlayın.",
  "Thoughtfully written. Entirely yours.": "Özenle yazılmış. Tamamen size ait.",
  "DOCUMENT STUDIO": "BELGE STÜDYOSU",
  "Focus on document": "Belgeye odaklan",
  "Show tools": "Araçları göster",
  "MAKE IT YOURS": "SİZİ YANSITSIN",
  "Document tools": "Belge araçları",
  "Close tools": "Araçları kapat",
  "Editing tools": "Düzenleme araçları",
  "Undo last draft edit": "Son düzenlemeyi geri al",
  "Unsaved draft": "Kaydedilmemiş taslak",
  Saved: "Kaydedildi",
  "Preview unavailable": "Önizleme kullanılamıyor",
  "Loading preview…": "Önizleme yükleniyor…",
  "Generating…": "Hazırlanıyor…",
  "Preview zoom": "Önizleme yakınlaştırması",
  "Fit width": "Genişliğe sığdır",
  "Edit section": "Bölümü düzenle",
  "Select a section on the page to edit it.":
    "Düzenlemek için sayfadaki bir bölümü seçin.",
  Remove: "Kaldır",
  "Move up": "Yukarı taşı",
  Add: "Ekle",
  "All fields, history, library and backups":
    "Tüm alanlar, geçmiş, kütüphane ve yedekler",
  "Download lossless JSON": "Kayıpsız JSON indir",
  "Undo field edit": "Alan düzenlemesini geri al",
  "Load revision history": "Sürüm geçmişini yükle",
  "Browse career library": "Kariyer kütüphanesine göz at",
  "Restore revision": "Sürümü geri yükle",
  "Insert into": "Eklenecek bölüm",
  Summary: "Özet",
  achievements: "başarılar",
  Tags: "Etiketler",
  "Unapplied source recovered.": "Uygulanmamış kaynak bulundu.",
  "Recover source": "Kaynağı kurtar",
  "Discard recovered source": "Kurtarılan kaynağı sil",
  Validate: "Doğrula",
  "Apply to draft": "Taslağa uygula",
  "Apply source changes to the draft before switching tabs. Save stores the draft. Markdown is available through Import and Export because it cannot preserve every field.":
    "Sekme değiştirmeden önce kaynak değişikliklerini taslağa uygulayın. Kaydet, taslağı saklar. Markdown tüm alanları koruyamadığından yalnızca içe ve dışa aktarmada kullanılabilir.",
  "Exact PDF pages": "Gerçek PDF sayfaları",
  "Live content": "Canlı içerik",
  "Print preview · A4": "Baskı önizlemesi · A4",
  Retry: "Yeniden dene",
  "Live content updates as you type. Exact PDF pages includes final pagination and browser zoom controls.":
    "Canlı içerik yazarken güncellenir. Gerçek PDF sayfalarında son sayfa düzeni ve tarayıcı yakınlaştırma kontrolleri bulunur.",
  "Edit job, requirements and submitted copies":
    "İlanı, gereksinimleri ve gönderilen kopyaları düzenle",
  "Linked resume": "Bağlı özgeçmiş",
  None: "Yok",
  "Save job": "İlanı kaydet",
  "Requirements to compare (one per line)":
    "Karşılaştırılacak gereksinimler (her satıra bir tane)",
  "Compare these requirements": "Bu gereksinimleri karşılaştır",
  "Matching checks explicit terms; it does not verify experience or predict hiring outcomes.":
    "Eşleştirme belirtilen terimleri kontrol eder; deneyimi doğrulamaz veya işe alım sonucunu tahmin etmez.",
  "Load submitted copies": "Gönderilen kopyaları yükle",
  "Download submitted copy (": "Gönderilen kopyayı indir (",
  "Workspace backup and restore": "Çalışma alanı yedekleme ve geri yükleme",
  "Includes resumes, jobs, library, revision history and submitted snapshots. Keep backups private. Restore adds copies and preserves existing records.":
    "Özgeçmişleri, ilanları, kütüphaneyi, sürüm geçmişini ve gönderilen kopyaları içerir. Yedekleri gizli tutun. Geri yükleme kopyalar ekler ve mevcut kayıtları korur.",
  "Download workspace backup": "Çalışma alanı yedeğini indir",
  "Restore backup": "Yedeği geri yükle",
  "Reload to retry": "Yeniden denemek için sayfayı yükle",
  Dismiss: "Kapat",
  Profile: "Profil",
  "First Name": "Ad",
  "Last Name": "Soyad",
  Headline: "Mesleki unvan",
  Email: "E-posta",
  Phone: "Telefon",
  Location: "Konum",
  Website: "Web sitesi",
  Links: "Bağlantılar",
  Label: "Etiket",
  Url: "Adres",
  Experience: "Deneyim",
  Company: "Şirket",
  Position: "Pozisyon",
  "Start Date": "Başlangıç tarihi",
  "End Date": "Bitiş tarihi",
  Current: "Devam ediyor",
  Bullets: "Başarı maddeleri",
  Technologies: "Teknolojiler",
  Education: "Eğitim",
  Institution: "Kurum",
  Degree: "Derece",
  "Field Of Study": "Çalışma alanı",
  Grade: "Not",
  Highlights: "Öne çıkanlar",
  Projects: "Projeler",
  Name: "Ad",
  Role: "Rol",
  Skills: "Yetkinlikler",
  Category: "Kategori",
  Certifications: "Sertifikalar",
  Issuer: "Veren kurum",
  "Issue Date": "Veriliş tarihi",
  "Expiry Date": "Son geçerlilik tarihi",
  "Credential Url": "Sertifika adresi",
  "Credential Id": "Sertifika numarası",
  Languages: "Diller",
  Language: "Dil",
  Proficiency: "Seviye",
  "Custom Sections": "Özel bölümler",
  Title: "Başlık",
  Items: "Öğeler",
  Subtitle: "Alt başlık",
  Date: "Tarih",
  Description: "Açıklama",
  Design: "Tasarım",
  Template: "Şablon",
  "Font Family": "Yazı tipi",
  "Font Size": "Yazı boyutu",
  Spacing: "Aralık",
  Margins: "Kenar boşlukları",
  "Accent Color": "Vurgu rengi",
  Visibility: "Görünürlük",
};
Object.assign(copyTranslations, {
  "LLM connection settings": "LLM bağlantı ayarları",
  "Enter your Gemini model ID": "Gemini model kimliğinizi girin",
  "Enter an available model ID": "Kullanılabilir bir model kimliği girin",
  "Stored on backend; leave blank to keep":
    "API'de kayıtlı; korumak için boş bırakın",
  "No key stored": "Kayıtlı anahtar yok",
  "Local processing · no legal compliance certification":
    "Yerel işleme · yasal uyumluluk sertifikası değildir",
  "Storage configured by your local API":
    "Depolama yerel API'nizde yapılandırılır",
  "Content extends beyond the A4 layout. Inspect the exact PDF pages.":
    "İçerik A4 düzeninin dışına taşıyor. Gerçek PDF sayfalarını inceleyin.",
  profile: "Profil",
  experience: "Deneyim",
  projects: "Projeler",
  skills: "Beceriler",
  metadata: "Belge bilgileri",
  summary: "Özet",
  education: "Eğitim",
  design: "Tasarım",
  visibility: "Görünürlük",
  "Start date": "Başlangıç tarihi",
  "End date": "Bitiş tarihi",
  Present: "Devam ediyor",
  "Custom sections": "Özel bölümler",
  "Edit content": "İçeriği düzenle",
  Preview: "Önizleme",
  "Compare revisions and variants": "Sürümleri ve varyantları karşılaştır",
  "Load comparison choices": "Karşılaştırma seçeneklerini yükle",
  "Compare current draft with": "Mevcut taslağı şununla karşılaştır",
  "Select a revision or resume": "Bir sürüm veya özgeçmiş seçin",
  Revision: "Sürüm",
  "Show differences": "Farkları göster",
  Differences: "Farklar",
  Before: "Önce",
  "Current draft": "Mevcut taslak",
  "Before → current draft": "Önce → mevcut taslak",
  "Comparison does not change your document.":
    "Karşılaştırma belgenizi değiştirmez.",
  "Check PDF output": "PDF çıktısını kontrol et",
  "Checking PDF…": "PDF kontrol ediliyor…",
  Pages: "Sayfa sayısı",
  Page: "Sayfa",
  "No automated PDF issues found.": "Otomatik kontrolde PDF sorunu bulunmadı.",
  "Automated checks are advisory. Inspect Exact PDF pages before sending.":
    "Otomatik kontroller öneri niteliğindedir. Göndermeden önce gerçek PDF sayfalarını inceleyin.",
  "Page contains no extractable text.": "Sayfada okunabilir metin bulunamadı.",
  "Last page has very little content; consider spacing or margin changes.":
    "Son sayfada çok az içerik var; aralıkları veya kenar boşluklarını gözden geçirin.",
  "A section heading appears at the end of the page.":
    "Bir bölüm başlığı sayfanın sonunda yalnız kalmış.",
  "Document exceeds two pages. Check whether every section is needed.":
    "Belge iki sayfayı aşıyor. Her bölümün gerekli olup olmadığını kontrol edin.",
  "Body font is below 9 pt and may be difficult to read.":
    "Metin boyutu 9 punto altında; okumak zor olabilir.",
  "Unsaved job draft · stored in this browser":
    "Kaydedilmemiş ilan taslağı · bu tarayıcıda saklanıyor",
  Saved: "Kaydedildi",
  "Application timeline": "Başvuru zaman çizelgesi",
  "No recorded status history for this older application.":
    "Bu eski başvuru için kayıtlı durum geçmişi yok.",
  Company: "Şirket",
  Position: "Pozisyon",
  Location: "Konum",
  Url: "Bağlantı",
  Notes: "Notlar",
  saved: "Kaydedildi",
  applied: "Başvuruldu",
  interview: "Görüşme",
  offer: "Teklif",
  rejected: "Reddedildi",
  archived: "Arşivlendi",
  "ATS heuristic average": "ATS sezgisel puan ortalaması",
  "active resumes": "aktif özgeçmiş",
  "Analysis unavailable": "Analiz kullanılamıyor",
  "Not assessed": "Değerlendirilmedi",
  "Internal ATS heuristic; not an external ATS endorsement.":
    "Uygulama içi ATS sezgisel puanıdır; harici ATS onayı değildir.",
  "Technical variant (optional)": "Teknik varyant (isteğe bağlı)",
  "Concise variant (optional)": "Kısa varyant (isteğe bağlı)",
  "Snippet title": "Madde başlığı",
  Achievement: "Başarı maddesi",
  "Edit snippet": "Maddeyi düzenle",
  "LLM connection": "LLM bağlantısı",
  "Enable AI reviews": "Yapay zeka incelemelerini etkinleştir",
  Provider: "Sağlayıcı",
  "API base URL": "API adresi",
  "Model ID": "Model kimliği",
  "API key (optional for local servers)":
    "API anahtarı (yerel sunucular için isteğe bağlı)",
  "Remove stored key": "Kayıtlı anahtarı kaldır",
  "Save connection": "Bağlantıyı kaydet",
  "Test saved connection": "Kayıtlı bağlantıyı test et",
  "Save changes before testing.": "Testten önce değişiklikleri kaydedin.",
  "Working…": "İşlem sürüyor…",
  "Connection settings saved.": "Bağlantı ayarları kaydedildi.",
  "Connect Gemini, an OpenAI-compatible API, or local Ollama. Resume reviews run only when you request them in Review. The selected server receives resume content and optional job text; cloud providers may charge for requests.":
    "Gemini, OpenAI uyumlu API veya yerel Ollama bağlayın. CV incelemeleri yalnızca İnceleme ekranında istediğinizde çalışır. Seçilen sunucu CV içeriğini ve isteğe bağlı ilan metnini alır; bulut sağlayıcıları ücret talep edebilir.",
  "Keys are stored in the backend settings file, excluded from workspace backups, and never returned to this page. Protect that file with your OS account permissions. Changing provider or URL clears the old key unless you enter a replacement. In Docker, use http://host.docker.internal:11434 for host Ollama.":
    "Anahtarlar API ayar dosyasında saklanır, yedeklere eklenmez ve bu sayfaya geri gönderilmez. Dosyayı işletim sistemi izinleriyle koruyun. Sağlayıcı veya adres değiştiğinde yeni bir anahtar girmediyseniz eski anahtar silinir. Docker'da bilgisayarınızdaki Ollama için http://host.docker.internal:11434 kullanın.",
  "Use a Gemini API key and model ID from Google AI Studio. The default URL connects to the Gemini Developer API.":
    "Google AI Studio'dan Gemini API anahtarı ve model kimliği kullanın. Varsayılan adres Gemini Developer API'ye bağlanır.",
});
export function useCopy() {
  const { language } = useI18n();
  return useCallback(
    (text: string) =>
      language === "tr" ? copyTranslations[text] || text : text,
    [language],
  );
}
Object.assign(copyTranslations, {
  "Your career archive": "Kariyer arşiviniz",
  "Search and filter snippets": "Maddeleri ara ve filtrele",
  "Keep verified achievements here, then reuse them in your resumes.":
    "Doğrulanmış başarılarınızı burada saklayın, özgeçmişlerinizde yeniden kullanın.",
  "e.g. Reduced API response time": "Örn. API yanıt süresini azalttım",
  "e.g. Backend development": "Örn. Backend geliştirme",
  "Describe what you did, how you did it, and the measurable result.":
    "Ne yaptığınızı, nasıl yaptığınızı ve ölçülebilir sonucunu yazın.",
  "Alternative wording": "Alternatif anlatımlar",
  "Optional versions of the same achievement. Add only details you can verify.":
    "Aynı başarının isteğe bağlı anlatımları. Yalnızca doğrulayabileceğiniz ayrıntıları ekleyin.",
  "Emphasize the tools, methods, and technical impact.":
    "Araçları, yöntemleri ve teknik etkiyi öne çıkarın.",
  "Summarize the achievement in one short sentence.":
    "Başarıyı kısa bir cümlede özetleyin.",
  "Separate tags with commas. Use them to find this achievement later.":
    "Etiketleri virgülle ayırın. Bu maddeyi daha sonra bulmak için kullanın.",
  "Loading snippets…": "Maddeler yükleniyor…",
  "Could not save the snippet.": "Madde kaydedilemedi.",
  "Enter an achievement before saving.":
    "Kaydetmeden önce başarı maddesini yazın.",
  "Career Achievement": "Kariyer başarısı",
  "Delete snippet": "Maddeyi sil",
  "Delete this career snippet from the library?":
    "Bu kariyer maddesi kütüphaneden silinsin mi?",
  technical: "Teknik",
  concise: "Kısa",
});
