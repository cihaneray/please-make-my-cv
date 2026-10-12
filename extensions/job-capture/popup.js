(() => {
  "use strict";

  const i18n = {
    tr: {
      readyToTransfer:
        "Bilgiler hazır. Aktarmadan önce alanları son kez inceleyin.",
      title: "İş İlanı Yakalama",
      subtitle: "İş detaylarını güvenle yakalayın ve inceleyin.",
      capture: "Sayfayı Yakala",
      send: "Uygulamaya Gönder",
      company: "Şirket *",
      position: "Pozisyon *",
      source: "Kaynak Bağlantısı *",
      description: "İş Tanımı *",
      location: "Lokasyon (isteğe bağlı)",
      privacyTitle: "Gizlilik Bildirimi",
      privacyDesc:
        "Çerezler, oturum tokenları veya form girdi değerleri asla okunmaz. Ancak çıkarılan sayfa metni kişisel ayrıntılar içerebileceğinden aktarmadan önce alanları manuel olarak inceleyin. Yalnızca değişmez (literal) özel/yerel IP adresleri engellenir (DNS bazlı genel alan adı garantisi verilemez); lütfen yalnızca genel iş ilanı sayfalarını seçin.",
      errNoTab: "Aktif sekme bulunamadı veya erişilemedi.",
      errRestrictedUrl:
        "Yalnızca genel HTTP/HTTPS iş ilanı sayfaları desteklenir (localhost, değişmez özel IP ve IPv6 adresleri engellenmiştir).",
      errCredentials:
        "URL içinde kullanıcı adı/şifre kimlik bilgileri bulunamaz.",
      errLongUrl:
        "URL uzunluğu güvenlik sınırını aşıyor (maks. 2048 karakter).",
      errCaptureFailed: "Sayfadan iş ilanı verisi okunamadı.",
      errMissingFields:
        "Lütfen göndermeden önce Şirket, Pozisyon, Kaynak Bağlantısı ve İş Tanımı alanlarını doldurun.",
      errPayloadTooLarge:
        "Yük boyutu güvenlik sınırını aşıyor (maks. 80.000 karakter).",
      errSendFailed: "Hedef sekme açılamadı veya aktarım başarısız oldu.",
      successCaptured:
        "İş detayları okundu. Lütfen inceleyin ve ardından Uygulamaya Gönder butonuna tıklayın.",
      busyCapturing: "Taranıyor...",
      busySending: "Gönderiliyor...",
      step1: "Yakala",
      step2: "İncele",
      step3: "Aktar",
      partialCaptured:
        "Bazı alanlar eksik yakalandı. Lütfen eksik alanları tamamlayın ve inceleyin.",
      linkedInUnrecognized:
        "LinkedIn iş ilanı detay paneli bulunamadı. İlanı açıp açıklamanın yüklenmesini bekleyin ve tekrar yakalayın. Metin seçmeniz gerekmez.",
      conflictingPanels:
        "Birden fazla çelişen ilan paneli tespit edildi; alanlar güvenle belirlenemediği için boş bırakıldı.",
    },
    en: {
      readyToTransfer:
        "Details are ready. Review the fields before transferring.",
      title: "Job Capture",
      subtitle: "Capture and review job details safely.",
      capture: "Capture Page",
      send: "Send to App",
      company: "Company *",
      position: "Position *",
      source: "Source URL *",
      description: "Job Description *",
      location: "Location (optional)",
      privacyTitle: "Privacy Notice",
      privacyDesc:
        "Never reads cookies, tokens, or form input values. However, extracted page text may contain personal details, so review all fields manually before transfer. Only literal private network and IP addresses are blocked (DNS resolution of public hostnames cannot be verified); please only use public job pages.",
      errNoTab: "No active tab found or accessible.",
      errRestrictedUrl:
        "Only public HTTP/HTTPS job pages are supported (localhost, literal private IP, and IPv6 addresses are blocked).",
      errCredentials: "URLs containing embedded credentials are not allowed.",
      errLongUrl: "URL exceeds maximum length (max 2048 characters).",
      errCaptureFailed: "Could not extract job data from the active page.",
      errMissingFields:
        "Please fill in Company, Position, Source URL, and Description before sending.",
      errPayloadTooLarge:
        "Payload exceeds safe transfer length (max 80,000 characters).",
      errSendFailed: "Failed to open target application tab.",
      successCaptured:
        "Job details extracted. Please review and click Send to App.",
      busyCapturing: "Capturing...",
      busySending: "Sending...",
      step1: "Capture",
      step2: "Review",
      step3: "Transfer",
      partialCaptured:
        "Partial job details extracted. Please complete missing fields and review before sending.",
      linkedInUnrecognized:
        "Could not find the active LinkedIn job detail panel. Open a job, wait for the description to load and capture again. No text selection is needed.",
      conflictingPanels:
        "Multiple conflicting job detail panels detected; fields left blank because active job could not be confidently identified.",
    },
  };

  const lang =
    navigator.language && navigator.language.toLowerCase().startsWith("tr")
      ? "tr"
      : "en";
  const strings = i18n[lang];
  let captured = false;
  let busy = false;

  const els = {
    title: document.getElementById("ui-title"),
    subtitle: document.getElementById("ui-subtitle"),
    btnCapture: document.getElementById("btn-capture"),
    btnSend: document.getElementById("btn-send"),
    status: document.getElementById("status"),
    company: document.getElementById("field-company"),
    position: document.getElementById("field-position"),
    source: document.getElementById("field-source"),
    description: document.getElementById("field-description"),
    location: document.getElementById("field-location"),
    lblLocation: document.getElementById("lbl-location"),
    lblCompany: document.getElementById("lbl-company"),
    lblPosition: document.getElementById("lbl-position"),
    lblSource: document.getElementById("lbl-source"),
    lblDescription: document.getElementById("lbl-description"),
    descCount: document.getElementById("desc-count"),
    privacyTitle: document.getElementById("privacy-title"),
    privacyDesc: document.getElementById("privacy-desc"),
    step1Label: document.getElementById("step-1-label"),
    step2Label: document.getElementById("step-2-label"),
    step3Label: document.getElementById("step-3-label"),
  };

  function applyLocalization() {
    if (els.title) els.title.textContent = strings.title;
    if (els.subtitle) els.subtitle.textContent = strings.subtitle;
    if (els.btnCapture) els.btnCapture.textContent = strings.capture;
    if (els.btnSend) els.btnSend.textContent = strings.send;
    if (els.lblCompany) els.lblCompany.textContent = strings.company;
    if (els.lblPosition) els.lblPosition.textContent = strings.position;
    if (els.lblSource) els.lblSource.textContent = strings.source;
    if (els.lblDescription)
      els.lblDescription.textContent = strings.description;
    els.lblLocation.textContent = strings.location;
    if (els.privacyTitle) els.privacyTitle.textContent = strings.privacyTitle;
    if (els.privacyDesc) els.privacyDesc.textContent = strings.privacyDesc;
    if (els.step1Label) els.step1Label.textContent = strings.step1;
    if (els.step2Label) els.step2Label.textContent = strings.step2;
    if (els.step3Label) els.step3Label.textContent = strings.step3;
  }

  function showStatus(message, isError = false) {
    if (!els.status) return;
    els.status.textContent = message;
    els.status.className = "status " + (isError ? "error" : "info");
  }

  function hideStatus() {
    if (!els.status) return;
    els.status.className = "status hidden";
    els.status.textContent = "";
  }

  function updateCounter() {
    if (els.descCount && els.description) {
      els.descCount.textContent = els.description.value.length;
    }
  }

  function isPrivateHost(hostname) {
    if (!hostname || typeof hostname !== "string") return true;
    const host = hostname.trim().toLowerCase();

    if (host.length > 255 || host.length === 0) return true;

    // Reject all literal IPv6 formats (including [brackets] or colons)
    if (host.includes(":") || host.startsWith("[") || host.endsWith("]")) {
      return true;
    }

    // Reject localhost, local names, and internal single-label or domain suffix hostnames
    if (
      host === "localhost" ||
      host.endsWith(".localhost") ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      !host.includes(".")
    ) {
      return true;
    }

    // Parse IPv4 addresses
    const ipv4Match = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (ipv4Match) {
      const b1 = parseInt(ipv4Match[1], 10);
      const b2 = parseInt(ipv4Match[2], 10);
      const b3 = parseInt(ipv4Match[3], 10);
      const b4 = parseInt(ipv4Match[4], 10);

      if ([b1, b2, b3, b4].some((b) => Number.isNaN(b) || b < 0 || b > 255)) {
        return true;
      }

      // 0.0.0.0/8 (Current network)
      if (b1 === 0) return true;
      // 10.0.0.0/8 (Private network)
      if (b1 === 10) return true;
      // 100.64.0.0/10 (Carrier-grade NAT: 100.64.0.0 - 100.127.255.255)
      if (b1 === 100 && b2 >= 64 && b2 <= 127) return true;
      // 127.0.0.0/8 (Loopback)
      if (b1 === 127) return true;
      // 169.254.0.0/16 (Link-local)
      if (b1 === 169 && b2 === 254) return true;
      // 172.16.0.0/12 (Private network: 172.16.0.0 - 172.31.255.255)
      if (b1 === 172 && b2 >= 16 && b2 <= 31) return true;
      // 192.168.0.0/16 (Private network)
      if (b1 === 192 && b2 === 168) return true;
      // Multicast & Reserved (224.0.0.0/4 and 240.0.0.0/4)
      if (b1 >= 224) return true;
    }

    return false;
  }

  function validateUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== "string") {
      return { valid: false, error: strings.errRestrictedUrl };
    }

    const trimmed = rawUrl.trim();
    if (trimmed.length > 2048) {
      return { valid: false, error: strings.errLongUrl };
    }

    let parsed;
    try {
      parsed = new URL(trimmed);
    } catch (e) {
      return { valid: false, error: strings.errRestrictedUrl };
    }

    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return { valid: false, error: strings.errRestrictedUrl };
    }

    if (parsed.username || parsed.password) {
      return { valid: false, error: strings.errCredentials };
    }

    if (isPrivateHost(parsed.hostname)) {
      return { valid: false, error: strings.errRestrictedUrl };
    }

    if (parsed.href.length > 2048) {
      return { valid: false, error: strings.errLongUrl };
    }

    return { valid: true, url: parsed.href };
  }

  function updateTransferState() {
    els.btnSend.disabled =
      busy ||
      !captured ||
      ![els.company, els.position, els.description, els.source].every((field) =>
        field.value.trim(),
      ) ||
      !validateUrl(els.source.value.trim()).valid;
  }

  async function handleCapture() {
    hideStatus();
    busy = true;
    els.btnCapture.disabled = true;
    els.btnSend.disabled = true;
    const originalCaptureText = els.btnCapture.textContent;
    els.btnCapture.textContent = strings.busyCapturing;

    try {
      const [activeTab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!activeTab || !activeTab.id || !activeTab.url) {
        showStatus(strings.errNoTab, true);
        return;
      }

      const urlValidation = validateUrl(activeTab.url);
      if (!urlValidation.valid) {
        showStatus(urlValidation.error, true);
        return;
      }

      const results = await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        files: ["capture.js"],
      });

      if (!results || !results[0] || !results[0].result) {
        showStatus(strings.errCaptureFailed, true);
        return;
      }

      const data = results[0].result;
      els.company.value = (data.company || "").slice(0, 255);
      els.position.value = (data.position || "").slice(0, 255);
      els.description.value = (data.description || "").slice(0, 20000);
      els.location.value = (data.location || "").slice(0, 255);
      els.source.value = (data.sourceUrl || activeTab.url || "").slice(0, 2048);
      updateCounter();

      captured = true;

      // Localized full or partial extraction feedback
      if (data.warning === "conflicting_panels") {
        showStatus(strings.conflictingPanels, true);
      } else if (data.warning === "unrecognized_linkedin") {
        showStatus(strings.linkedInUnrecognized, true);
      } else if (
        !els.company.value ||
        !els.position.value ||
        !els.description.value
      ) {
        showStatus(strings.partialCaptured, false);
      } else {
        showStatus(strings.successCaptured, false);
      }
    } catch (err) {
      showStatus(err.message || strings.errCaptureFailed, true);
    } finally {
      busy = false;
      els.btnCapture.disabled = false;
      els.btnCapture.textContent = originalCaptureText;
      updateTransferState();
    }
  }

  async function handleSend() {
    hideStatus();
    const company = (els.company.value || "").trim().slice(0, 255);
    const position = (els.position.value || "").trim().slice(0, 255);
    const description = (els.description.value || "").trim().slice(0, 20000);
    const sourceUrl = (els.source.value || "").trim().slice(0, 2048);

    if (!company || !position || !description || !sourceUrl) {
      showStatus(strings.errMissingFields, true);
      return;
    }

    const urlCheck = validateUrl(sourceUrl);
    if (!urlCheck.valid) {
      showStatus(urlCheck.error, true);
      return;
    }

    const payload = {
      location: els.location.value.trim().slice(0, 255),
      company,
      position,
      description,
      sourceUrl: urlCheck.url,
    };

    const encodedPayload = encodeURIComponent(JSON.stringify(payload));
    if (encodedPayload.length > 80000) {
      showStatus(strings.errPayloadTooLarge, true);
      return;
    }

    els.btnSend.disabled = true;
    busy = true;
    els.btnCapture.disabled = true;
    const originalSendText = els.btnSend.textContent;
    els.btnSend.textContent = strings.busySending;

    try {
      const targetUrl =
        "http://localhost:3000/jobs#job-import=" + encodedPayload;
      await chrome.tabs.create({ url: targetUrl });
      window.close();
    } catch (err) {
      showStatus(err.message || strings.errSendFailed, true);
      busy = false;
      updateTransferState();
      els.btnCapture.disabled = false;
      els.btnSend.textContent = originalSendText;
    }
  }

  document.documentElement.lang = lang;
  document
    .getElementById("job-form")
    .addEventListener("submit", (event) => event.preventDefault());
  applyLocalization();
  if (els.description) els.description.addEventListener("input", updateCounter);
  [els.company, els.position, els.description, els.source].forEach((field) =>
    field.addEventListener("input", () => {
      updateTransferState();
      if (captured && !busy)
        showStatus(
          els.btnSend.disabled
            ? strings.partialCaptured
            : strings.readyToTransfer,
          false,
        );
    }),
  );
  if (els.btnCapture) els.btnCapture.addEventListener("click", handleCapture);
  if (els.btnSend) els.btnSend.addEventListener("click", handleSend);
})();
