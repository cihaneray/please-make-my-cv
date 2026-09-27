---
ruleset: cv-language-tr-en
version: 1.0.0
updated_at: 2026-09-27
authority: "TDK 2026 Yazım Kılavuzu & International Professional Standards"
---

# Turkish / English CV Language & Localization Rules

These rules apply in addition to the main [CV Expert Skill](../skills/cv-expert/SKILL.md).

## 1. Language and Market Are Independent Variables
Always maintain:
- `language`: `tr` | `en`
- `target_market`: `TR` | `US` | `UK` | `EU` | `GLOBAL` | `OTHER`

**Never assume: English CV = US Resume.**

Examples:
- `language: en, target_market: TR`: English CV tailored for a Turkish or multinational employer in Türkiye.
- `language: en, target_market: US`: US-style English resume (no photo, strict anti-bias rules).
- `language: en, target_market: EU`: English-language European CV (Europass or international format).
- `language: tr, target_market: TR`: Turkish CV for domestic Turkish market.

## 2. Proper Names
Never translate personal names. Preserve:
- candidate name
- company names
- product names
- technology names
- registered brand names

*Example:*
"Türk Hava Yolları" must not automatically become "Turkish Airlines" unless the organization officially uses that English name in the targeted role and using it improves clarity. Prefer official organization naming.

## 3. Turkish Characters
Preserve Unicode Turkish characters by default:
`Ç Ğ İ Ö Ş Ü ç ğ ı ö ş ü`

Do not convert:
- Bozkurt → Bozkurt
- Cihan → Cihan
- İstanbul → Istanbul

unless transliteration is explicitly required by an external legacy system. Personal and organization names must not be damaged merely because the CV is written in English.

## 4. Turkish Writing Authority (TDK 2026)
For Turkish spelling and punctuation, prefer current **TDK (Türk Dil Kurumu) 2026** conventions:
- Punctuation rules
- Official abbreviations
- Capitalization
- Compound words
- Proper apostrophe usage for proper nouns

Do not apply English punctuation conventions blindly to Turkish prose.

## 5. Turkish Percentages and Numbers
Use Turkish conventions in Turkish CV text:
- `%25` (percent sign placed before the number without space), **not** `25 %` or `25%`.
- In English text, use `25%` or `25 percent`.
- Keep numeric formatting internally consistent. Do not alter source metrics.

## 6. Turkish Section Headings
Preferred standard headings:
- Profil
- Profesyonel Özet
- Deneyim / İş Deneyimi
- Eğitim
- Projeler
- Teknik Beceriler / Beceriler
- Sertifikalar
- Yabancı Diller
- Yayınlar
- Ödüller
- Gönüllülük

Prefer conventional headings over creative names to maintain ATS compatibility.

## 7. English Section Headings
Preferred standard headings:
- Summary / Professional Summary
- Experience / Professional Experience
- Education
- Projects
- Technical Skills / Skills
- Certifications
- Languages
- Publications
- Awards
- Volunteer Experience

Avoid creative headings like "My Journey", "Things I Built", "What I Know".

## 8. Turkish Bullet Style
- Prefer direct, active, and natural Turkish.
- The pronoun "ben" is unnecessary and should be omitted.
- **Prefer:** "FastAPI kullanarak dahili REST API'leri geliştirdim."
- **Avoid:** "Ben FastAPI kullanarak dahili REST API'leri geliştirdim."
- Prefer strong active verbs: *Geliştirdim, Tasarladım, Analiz ettim, Entegre ettim, Otomatikleştirdim, İyileştirdim*.
- Avoid awkward passive constructions where the candidate performed the action.
- Ensure consistency within the resume rather than mechanically forcing one rigid suffix.

## 9. English Bullet Style
- Do not use first-person pronouns (`I`, `me`, `my`) in standard resume bullets.
- **Avoid:** "I developed...", "I worked on...", "My responsibility was..."
- **Prefer:** "Developed...", "Designed...", "Implemented...", "Analyzed..."
- For previous roles, use past tense (*Developed, Engineered*).
- For current roles, use present tense for ongoing responsibilities (*Develop, Maintain*).

## 10. Turkish AI-Slop Detection
Flag unnecessarily artificial, empty Turkish corporate buzzwords:
- "yenilikçi çözümler sunarak değer yarattım"
- "dinamik süreçlerde aktif rol aldım"
- "katma değer sağlayan projeler geliştirdim"
- "uçtan uca süreçlerde görev aldım"
- "yüksek motivasyonla çalışmalar yürüttüm"

unless backed by concrete technical contributions.

## 11. English AI-Slop Detection
Flag generic buzzword phrases:
- "Leveraged cutting-edge technologies"
- "Spearheaded transformative initiatives"
- "Drove unparalleled results"
- "Dynamic and results-driven professional"
- "Passionate technology enthusiast"
- "Proven track record of excellence"

Prefer concise, factual engineering language.

## 12. Translation Is Localization
CV translation must not be literal machine translation. Translate intent while preserving facts.
- *Turkish:* "Ekibin algoritma tarafında karşılaştığı problemlerin çözümüne katkı sağladım."
- *Poor literal translation:* "I contributed to the solution of problems encountered by the team on the algorithm side."
- *Better localization:* "Contributed to resolving algorithm-related performance issues encountered by the engineering team."

## 13. Seniority Integrity During Translation
Never translate a title in a way that inflates seniority:
- Uzman → Specialist / Professional (not Senior/Lead)
- Uzman Yardımcısı → Assistant Specialist / Associate
- Mühendis → Engineer
- Kıdemli Mühendis → Senior Engineer
- Sorumlu → Lead / Responsible
- Takım Lideri → Team Lead
- Stajyer → Intern

When uncertain, preserve the original title or use a neutral equivalent.

## 14. Academic Degrees
Use international equivalents without altering academic level:
- Lisans → Bachelor's Degree (B.S. / B.A.)
- Yüksek Lisans → Master's Degree (M.S. / M.A.)
- Doktora → Ph.D. / Doctoral Degree
- Ön Lisans → Associate Degree

Keep official English names for universities when established (e.g. "Middle East Technical University", "Boğaziçi University", "Istanbul Technical University"). Do not invent unofficial English names.

## 15. Technology Names
Do not translate technology and framework names:
- Keep `Python`, `FastAPI`, `PostgreSQL`, `Docker`, `Kubernetes`, `Google Cloud`, `Splunk`, `Burp Suite`, `OWASP ZAP` exactly in their official form.

## 16. Terminology Consistency
Select one term and use it consistently throughout the document.
Do not randomly alternate between "Software Developer", "Software Engineer", "Developer", "Engineer" when referring to the same position.

## 17. English Technical Terminology in Turkish CVs
Technical terms may remain in English inside Turkish CVs when standard in the tech industry:
- `backend`, `REST API`, `deployment`, `CI/CD`, `machine learning`, `cloud`
Avoid awkward Turkish calques, but also avoid unnecessary English where a clear Turkish word exists.

## 18. Personal Information & Privacy Policy by Market
### US Market Default
- **Do not include:** photograph, age, date of birth, marital status, nationality, religion, health details.
- References should not be listed unless explicitly requested.

### Türkiye Market Default
- Professional photograph is **OPTIONAL** (never penalized if absent).
- Do not automatically add: date of birth, marital status, nationality, military status, driver's license, full street address.
- These can be enabled if the user explicitly specifies them or if the application requires them.

### EU / International
- Adhere to GDPR principles. Keep optional fields configurable.

## 19. Sensitive Information (KVKK / GDPR)
Never recommend adding sensitive personal data:
- T.C. Kimlik Numarası (TCKN), passport numbers
- Bank accounts (IBAN)
- Political or philosophical opinions, religious beliefs
- Health conditions or biometric data
Treat candidate privacy as a first-class architectural concern.

## 20. Photograph Policy
Photo configuration:
```yaml
photo:
  mode: disabled | optional | requested | required_by_application
```
- Do not make a photograph mandatory.
- Never lower CV quality scores solely due to the absence of a photo.

## 21. Address Format
Prefer city and country:
- Turkish: `Ankara, Türkiye` or `İstanbul, Türkiye`
- English: `Ankara, Türkiye` or `Istanbul, Türkiye`
Do not require full home street address or apartment numbers.

## 22. References Policy
- Do not add "References available upon request" by default.
- Never include another person's phone, email, or address without explicit candidate confirmation.

## 23. Date Formatting
Maintain consistent date styles across the resume:
- Turkish option 1: `Eyl 2024 – Haz 2026`
- Turkish option 2: `09/2024 – 06/2026`
- English option: `Sep 2024 – Jun 2026`
- Current role:
  - Turkish: `Eyl 2025 – Devam Ediyor`
  - English: `Sep 2025 – Present`

Do not translate "Devam Ediyor" to literal English words like "Continuing".

## 24. Turkish vs. English Summary Style
- **Turkish Summary:** Factual, direction-focused positioning without hollow adjectives ("Kendini geliştirmeye açık, takım çalışmasına yatkın...").
- **English Summary:** Objective value proposition highlighting domains, technical focus, and proven experience.

## 25. English CV for Turkish Employers (`language: en, target_market: TR`)
- Written in clean professional English.
- Respects Turkish market norms: optional photo allowed, Turkish degree equivalents clear, location formatted as "Istanbul, Türkiye".
- Does not strip local context.

## 26. Turkish CV for International Roles
Flag when a Turkish CV is used for an English job posting:
"The target job posting is in English and appears to target an international candidate pool. Consider preparing an English version."

## 27. Output Language Contract
- Analysis feedback and explanations should match the user's interface language.
- Proposed content changes must match the CV's language.

## 28. Final Localization Principle
Translate meaning. Localize conventions. Preserve facts. Never translate a candidate into a different candidate.
