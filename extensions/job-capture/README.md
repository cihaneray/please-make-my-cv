# İlan aktarma eklentisi / Job capture extension

Chrome ve Edge için Manifest V3 eklentisi. Docker veya yerel uygulama `http://localhost:3000` adresinde çalışmalıdır.

## Kurulum

1. Chrome’da `chrome://extensions`, Edge’de `edge://extensions` açın.
2. Geliştirici modunu açıp **Paketlenmemiş öğe yükle** seçin.
3. Bu repodaki `extensions/job-capture` klasörünü seçin.

Güncellemeden sonra eklentiler ekranında **Yenile** düğmesine basın ve açık LinkedIn ilan sekmesini yeniden yükleyin. Eklenti sistemin açık/koyu temasını izler; uygulamadaki elle seçilmiş tema tarayıcı eklentisine aktarılmaz.

## Kullanım

Eklenti, 1. Yakala &rarr; 2. İncele &rarr; 3. Aktar adımlarından oluşan numaralı bir akış sunar:

1. **Sayfayı Yakala**: Herkese açık HTTP/HTTPS ilan sayfasında eklentiyi açın ve **Sayfayı Yakala** düğmesine basın.
   - **LinkedIn Desteği**: LinkedIn üzerinde oturum açık veya misafir (guest) görünümlerinde yalnızca aktif ve görünür olan iş detayı paneli taranır (`top-card`, `#job-details` vb.). Arama sonuç listelerindeki kartlar veya önerilen diğer ilanlar dahil edilmez. Çelişen birden çok panel varsa alanlar boş bırakılarak güvenli uyarı verilir.
   - **LinkedIn URL Kanonikleştirme**: `?currentJobId=...` parametreleri ve `/jobs/view/slug-id` bağlantıları `https://www.linkedin.com/jobs/view/{id}/` biçiminde güvenle standartlaştırılır; izleme (tracking) parametreleri temizlenir.
   - **Tüm Sayfa Dökümü Önleme**: Tanınmayan LinkedIn sayfalarında tüm sayfa metni (navigasyon, öneriler, maaş listeleri) açıklamaya kopyalanmaz.
   - **Biçimlendirme**: Açıklama metninde satır sonları ve liste maddeleri (bullet points) korunur.
   - **Otomatik LinkedIn Okuma**: Metin seçmeye gerek yoktur. Sayfada seçili metin varsa bile yok sayılır; başlık, şirket ve açıklama kendi ilan elementlerinden okunur. Açık ilan kimliğiyle eşleşen panel tercih edilir; henüz yüklenmeyen veya belirsiz panellerde yeniden yakalama uyarısı verilir.
   - **Diğer Siteler**: Tek bir yapılandırılmış JSON-LD verisi varsa öncelikle o okunur; yoksa güvenli seçim veya görünür metin kullanılır.
2. **İncele ve Düzenle**: Yakalanan veriler açılan formda incelenebilir veya elle düzenlenebilir. Eksik alanlar varsa eklenti yerelleştirilmiş durum bildirimiyle kullanıcıyı bilgilendirir.
3. **Uygulamaya Gönder**: Doğrulamalar geçildikten sonra veriler `http://localhost:3000/jobs#job-import=` adresine aktarılır. Otomatik kayıt yapılmaz; kayıt işlemi yerel uygulama içerisinden kullanıcı onayıyla gerçekleştirilir.

### Gizlilik ve Güvenlik

- İzinler yalnızca `activeTab` ve `scripting` ile sınırlıdır; geniş tarayıcı depolama izni istenmez.
- Çerezler, kimlik doğrulama tokenları veya form girdi değerleri asla okunmaz.
- Değişmez yerel/özel IP adresleri engellenir.
- Uzak API veya AI çağrısı yapılmaz, harici kaynak/varlık (font, script vb.) yüklenmez.

---

## English

Manifest V3 browser extension for Chrome and Edge. Connects with the local application running at `http://localhost:3000`.

### Installation

1. Open `chrome://extensions` in Chrome or `edge://extensions` in Edge.
2. Enable Developer mode and click **Load unpacked**.
3. Select the `extensions/job-capture` directory from this repository.

### Usage Flow

The extension uses this numbered flow: 1. Capture &rarr; 2. Review &rarr; 3. Transfer.

1. **Capture Page**: Navigate to any public HTTP/HTTPS job page and click **Capture Page**.
   - **LinkedIn Adapters**: Directly extracts the active visible job detail panel for both guest (`.top-card-layout`, `.description__text`) and signed-in (`.job-details-jobs-unified-top-card`, `#job-details`) views. Ignores search result cards, recommendations, and navigation elements. If multiple conflicting detail panels are visible, fields remain blank with a clear explanation.
   - **Canonical LinkedIn URL**: Canonicalizes `/jobs/search/?currentJobId=12345` and `/jobs/view/slug-12345` to `https://www.linkedin.com/jobs/view/12345/`, stripping all tracking parameters across all hosts.
   - **No Full Body Dump**: Avoids dumping page navigation or recommendations into the description on unrecognized LinkedIn views.
   - **Formatting Preservation**: Preserves paragraph line breaks and bulleted list items in the job description.
   - **Automatic LinkedIn Capture**: No text selection is needed. Any selected text is ignored; title, company and the complete description are read from their job elements. An explicitly identified panel matching the URL job ID is preferred; loading or ambiguous details produce a clear retry message.
   - **Other Sites**: A single valid JSON-LD JobPosting takes priority; multiple postings fall back to safe selection or visible text.
2. **Review & Edit**: Review all extracted fields in the popup form. Localized status alerts indicate whether extraction is complete or partial. You can edit the fields manually.
3. **Send to App**: Transfers data to `http://localhost:3000/jobs#job-import=`. Never autosaves; saving occurs only after explicit review inside the local web application.

### Security & Privacy

- Uses only `activeTab` and `scripting` permissions (no broad browser storage permissions).
- Strictly blocks private IP addresses, localhost target URLs, credentials, and cookies/inputs.
- No network requests, no remote assets, no analytics or AI calls.

## Paketleme / Packaging

Repo kökünden / From the repository root:

```sh
python extensions/package_job_capture.py
python -m unittest discover -s extensions/tests
```

`output/extensions/cv-job-capture-1.1.0.zip` ve SHA-256 dosyası üretilir. Yalnızca sabit izinli çalışma dosyaları, ikonlar ve bu rehber dahil edilir; ortam dosyaları, loglar ve kullanıcı verileri paketlenmez. Aynı kaynak aynı ZIP'i üretir. Yeni sürümde önce `manifest.json` içindeki `version` değerini artırın.

ZIP'i kalıcı bir klasöre açıp **Paketlenmemiş öğe yükle** ile o klasörü seçin. ZIP doğrudan yüklenmez. Güncellemede klasör içeriğini yenileyip eklenti ekranında **Yenile** düğmesine basın. Chrome Web Store/Edge Add-ons yayını bu yerel paketleme işleminin parçası değildir.

The script produces a ZIP and SHA-256 checksum under `output/extensions`. Only explicitly listed runtime files, icons and this guide are included. Extract the ZIP into a permanent directory and choose that directory using **Load unpacked**. Update the extracted files and reload the extension after updates. Increment `manifest.json`'s version before creating a new release. Store publishing is a separate step.

### LinkedIn semantic UI

Version 1.1.1 also supports job pages with generated CSS classes, paragraph titles and expandable description boxes. Employer bindings must match the current job ID; the About-the-job section is read separately from About-the-company text. After replacing a ZIP installation, reload it in chrome://extensions or edge://extensions.

Version 1.2.0 captures LinkedIn location into an optional editable field and transfers it to the application location field. Posting age and applicant counts are excluded. Missing locations do not block transfer.
