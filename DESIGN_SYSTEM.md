# 🎨 My Dream School — Dizayn Tizimi (Design System)

> **Maqsad:** Barcha dashboard sahifalari (Admin, Director, Hisobchi, HR, Reception, Call-center, Supervisor, Teacher, Student) bir xil dizayn standartiga rioya qilsin. Yangi dashboard yoki sahifa qo'shganda **shu hujjatdan foydalanib**, kattaliklarni, ranglarni va responsiv qoidalarni bir xilda qo'llang.

---

## 1. 📐 Responsiv Breakpoint'lar (Eng muhim qoida)

Loyihada **5 ta asosiy ekran o'lchami** mavjud. Har bir sahifa shu 5 ta o'lchamga **alohida** moslashtirilishi shart.

| Qurilma         | Diapazon            | CSS Media Query                                  |
|-----------------|---------------------|--------------------------------------------------|
| **📱 Kichik telefon** | `≤ 480px`          | `@media (max-width: 480px)`                      |
| **📱 Telefon**         | `481px – 767px`    | `@media (min-width: 481px) and (max-width: 767px)` |
| **📲 Planshet**        | `768px – 991px`    | `@media (min-width: 768px) and (max-width: 991px)` |
| **💻 Noutbuk**         | `992px – 1199px`   | `@media (min-width: 992px) and (max-width: 1199px)` |
| **🖥️ Kompyuter**       | `≥ 1200px`         | `@media (min-width: 1200px)` (default — base)    |

### Qoidalar:
- **Base CSS** (`@media`siz qism) — bu **kompyuter (≥1200px)** uchun yoziladi.
- Har bir breakpoint **alohida** override qiladi: layout, font-size, padding, gap, grid columns.
- **HECH QACHON** faqat `max-width: 768px` ishlatib qolmang — kamida 3 ta breakpoint kerak (telefon, planshet, noutbuk).
- Mobil layoutda **menu sidebar yopilgan holatda** bo'ladi (hamburger menyu).
- Planshet va undan kichikroq ekranlarda **sidebar overlay** rejimiga o'tadi.

### Grid columns standarti:
| Element             | Kompyuter | Noutbuk | Planshet | Telefon | K.telefon |
|---------------------|-----------|---------|----------|---------|-----------|
| Balance kartalar    | 4         | 4       | 2        | 2       | 1         |
| Statistika kartalar | 4         | 3       | 2        | 2       | 1         |
| Chart row           | 2         | 2       | 1        | 1       | 1         |
| Mini stat (header)  | 3-4       | 3       | 2        | 1       | 1         |
| Filter inputs       | inline    | inline  | inline   | stacked | stacked   |

---

## 2. 🎨 Rang Palitra (Color Palette)

### 2.1 Brand ranglari (asosiy)
```css
--primary-blue:    #1e3a8a;  /* Brend ko'k — header, navigation */
--secondary-blue:  #1e40af;  /* Hover holat */
--light-blue:      #3b82f6;  /* Accent — tugmalar, link */
--primary-gold:    #fbbf24;  /* Brend tilla — accent */
--dark-blue:       #1e1b4b;  /* Eng quyuq variant — yorug' fon ustida text */
```

### 2.2 Rol-based accent (har rol uchun)
| Rol         | Accent rang     | Hex       | Gradient                                    |
|-------------|-----------------|-----------|---------------------------------------------|
| Admin       | Ko'k            | `#3b82f6` | `linear-gradient(135deg,#1e3a8a,#3b82f6)`   |
| Director    | Indigo          | `#6366f1` | `linear-gradient(135deg,#4338ca,#6366f1)`   |
| **Hisobchi** | **Sariq/Oltin** | **`#d97706`** | **`linear-gradient(135deg,#92400e,#d97706)`** |
| HR          | Pushti          | `#ec4899` | `linear-gradient(135deg,#be185d,#ec4899)`   |
| Reception   | Binafsha        | `#8b5cf6` | `linear-gradient(135deg,#6d28d9,#8b5cf6)`   |
| Call-center | Cyan            | `#06b6d4` | `linear-gradient(135deg,#0e7490,#06b6d4)`   |
| Supervisor  | To'q sariq      | `#f59e0b` | `linear-gradient(135deg,#b45309,#f59e0b)`   |
| Teacher     | Yashil-ko'k     | `#0d9488` | `linear-gradient(135deg,#0f766e,#0d9488)`   |
| Student     | Sariq           | `#eab308` | `linear-gradient(135deg,#ca8a04,#eab308)`   |

### 2.3 Holat (Status) ranglar
```css
--success:    #10b981;  /* yashil — to'langan, muvaffaqiyatli */
--warning:    #f59e0b;  /* sariq — kutilmoqda, qisman */
--error:      #ef4444;  /* qizil — qarz, xato */
--info:       #3b82f6;  /* ko'k — informatsion */

/* Yumshoq fonlar */
--success-bg: #d1fae5;  --success-text: #065f46;
--warning-bg: #fef3c7;  --warning-text: #92400e;
--error-bg:   #fee2e2;  --error-text:   #991b1b;
--info-bg:    #dbeafe;  --info-text:    #1e40af;
```

### 2.4 Neytral ranglar (text/fon)
```css
--bg-page:     #f8fafc;  /* sahifa asosiy fon (eng yorug') */
--bg-elevated: #ffffff;  /* karta, modal fon (oq) */
--bg-muted:    #f1f5f9;  /* ikkilamchi fon */
--border:      #e2e8f0;  /* border default */
--border-soft: #f1f5f9;  /* yumshoq border */

--text-primary:   #1e293b;  /* asosiy yozuv */
--text-secondary: #475569;  /* ikkilamchi yozuv */
--text-muted:     #64748b;  /* susayttirilgan */
--text-light:     #94a3b8;  /* eng yorug' (placeholder) */
```

### 2.5 To'lov turlari (Payment types)
```css
--pay-cash:  #10b981;   /* Naqd */
--pay-card:  #8b5cf6;   /* Karta */
--pay-bank:  #f59e0b;   /* Bank o'tkazmasi */
```

---

## 3. ✏️ Tipografika (Typography)

### Font oilasi
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
```

### Font kattaliklari (Type scale)
| Token        | Kattaligi | Qo'llanilishi                              |
|--------------|-----------|--------------------------------------------|
| `--fs-xs`    | `0.6875rem` (11px) | Mayda yozuv, badge, helper      |
| `--fs-sm`    | `0.75rem` (12px)   | Caption, sidebar text           |
| `--fs-base`  | `0.875rem` (14px)  | Default body text               |
| `--fs-md`    | `1rem` (16px)      | Karta sarlavhasi, link          |
| `--fs-lg`    | `1.125rem` (18px)  | Section sarlavhasi              |
| `--fs-xl`    | `1.25rem` (20px)   | Page sarlavhasi (kichik)        |
| `--fs-2xl`   | `1.5rem` (24px)    | Page sarlavhasi (asosiy)        |
| `--fs-3xl`   | `2rem` (32px)      | Hero, dashboard sarlavhasi      |
| `--fs-stat`  | `2.5rem` (40px)    | Statistika qiymati              |

### Font og'irlik
- `400` — body
- `500` — emphasis
- `600` — link, label
- `700` — sarlavha (h3, h4)
- `800` — asosiy sarlavha (h1, h2)
- `900` — yirik statistika qiymati

### Mobil moslamasi
Telefon va kichikroq ekranda **font-size 2-4px kichraytiriladi**:
- `--fs-3xl` → `1.5rem` (mobile)
- `--fs-2xl` → `1.25rem` (mobile)
- `--fs-xl`  → `1.125rem` (mobile)

---

## 4. 📏 Bo'shliq (Spacing) tizimi

8px base grid:
```css
--space-0: 0;
--space-1: 0.25rem;  /* 4px  */
--space-2: 0.5rem;   /* 8px  */
--space-3: 0.75rem;  /* 12px */
--space-4: 1rem;     /* 16px */
--space-5: 1.25rem;  /* 20px */
--space-6: 1.5rem;   /* 24px */
--space-8: 2rem;     /* 32px */
--space-10: 2.5rem;  /* 40px */
--space-12: 3rem;    /* 48px */
```

### Container padding (sahifa ichi)
| Ekran      | Container padding |
|------------|-------------------|
| Kompyuter  | `2rem` (32px)     |
| Noutbuk    | `1.75rem` (28px)  |
| Planshet   | `1.5rem` (24px)   |
| Telefon    | `1rem` (16px)     |
| K.telefon  | `0.75rem` (12px)  |

### Gap (grid/flex)
- Karta ichi (compact): `0.75rem`
- Karta orasidagi gap: `1.25rem` – `1.5rem`
- Section orasidagi gap: `2rem`

---

## 5. 🔲 Border Radius

```css
--radius-sm:  6px;   /* mayda chiplar */
--radius:     10px;  /* tugma, input */
--radius-md:  12px;  /* karta, modal */
--radius-lg:  16px;  /* big section, hero */
--radius-xl:  20px;  /* modal, asosiy hero */
--radius-full: 999px; /* pill, badge */
```

---

## 6. 💎 Soya (Shadow)

```css
--shadow-sm:  0 1px 4px rgba(0,0,0,0.04);             /* yumshoq */
--shadow:     0 4px 12px rgba(0,0,0,0.06);            /* karta default */
--shadow-md:  0 4px 20px rgba(0,0,0,0.08);            /* karta hover/section */
--shadow-lg:  0 8px 30px rgba(0,0,0,0.12);            /* modal, ko'tarilgan element */
--shadow-xl:  0 25px 50px rgba(0,0,0,0.25);           /* modal overlay */

/* Rangli soyalar (CTA tugma) */
--shadow-primary: 0 4px 12px rgba(59, 130, 246, 0.3);
--shadow-success: 0 4px 12px rgba(16, 185, 129, 0.3);
--shadow-error:   0 4px 12px rgba(239, 68, 68, 0.3);
```

---

## 7. 🧩 Komponent Standartlari

### 7.1 Header (yuqori panel)
| Ekran     | Height | Padding (horizontal) | Logo height |
|-----------|--------|----------------------|-------------|
| Kompyuter | `85px` | `2rem`               | `56px`      |
| Noutbuk   | `80px` | `1.5rem`             | `48px`      |
| Planshet  | `76px` | `1rem`               | `44px`      |
| Telefon   | `70px` | `0.75rem`            | `40px`      |
| K.telefon | `64px` | `0.5rem`             | `34px`      |

### 7.2 Sidebar
| Ekran     | Width  | Holat                                          |
|-----------|--------|------------------------------------------------|
| Kompyuter | `240px` | doimo ochiq, fixed                            |
| Noutbuk   | `200px` | doimo ochiq, fixed                            |
| Planshet  | `200px` | **overlay** rejimida (hamburger bilan)        |
| Telefon   | `180px` | **overlay** rejimida (hamburger bilan)        |

### 7.3 Karta (Card)
```css
background: #ffffff;
border-radius: 16px;
padding: 1.5rem;
box-shadow: 0 4px 20px rgba(0,0,0,0.08);
border: 1px solid #e2e8f0; /* yoki yo'q */
transition: all 0.3s ease;
```
Hover:
```css
transform: translateY(-4px);
box-shadow: 0 8px 30px rgba(0,0,0,0.12);
```

### 7.4 Tugma (Button)
| Tip       | Background                                  | Padding             | Border radius |
|-----------|---------------------------------------------|---------------------|---------------|
| Primary   | `linear-gradient(135deg,#1e3a8a,#3b82f6)`   | `0.75rem 1.5rem`    | `10px`        |
| Success   | `linear-gradient(135deg,#047857,#10b981)`   | `0.75rem 1.5rem`    | `10px`        |
| Danger    | `linear-gradient(135deg,#dc2626,#ef4444)`   | `0.75rem 1.5rem`    | `10px`        |
| Outline   | `transparent` + `2px solid` brand           | `0.75rem 1.5rem`    | `10px`        |
| Icon-only | gradient                                    | `width:42px height:42px` | `10px`   |

### 7.5 Badge / Chip
```css
padding: 0.375rem 0.75rem;
border-radius: 8px;
font-weight: 700;
font-size: 0.8rem;
white-space: nowrap;
```
Variantlar: `green / yellow / red / blue / gray` (yuqoridagi status palitra)

### 7.6 Input / Select
```css
padding: 0.75rem 1rem;
border: 2px solid #e2e8f0;
border-radius: 10px;
font-size: 0.9375rem;
background: #f8fafc;
```
Focus:
```css
border-color: #3b82f6;
background: #ffffff;
outline: none;
```

### 7.7 Modal
```css
background: white;
border-radius: 20px;
max-width: 90%; /* yoki 1100px asosiy */
max-height: 90vh;
box-shadow: 0 25px 50px rgba(0,0,0,0.25);
```
Mobile: `max-width: 95%; max-height: 95vh;`

### 7.8 Toast / Notification
- Position: `fixed; bottom:20px; right:20px;` (mobile: `left:10px; right:10px; bottom:10px;`)
- z-index: `1500`
- Animation: `slide-up 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)`

---

## 8. ⏱️ Animation va Transition

```css
--ease-default: cubic-bezier(0.4, 0, 0.2, 1);
--ease-bounce:  cubic-bezier(0.34, 1.56, 0.64, 1);

--dur-fast:   150ms;
--dur:        250ms;
--dur-slow:   400ms;
```

Default transition:
```css
transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
```

Hover scale:
```css
transform: translateY(-2px); /* yoki translateY(-4px) for big cards */
```

---

## 9. 🗂️ Sidebar (Navigation) standartlari

### Nav-link
```css
display: flex;
gap: 10px;
padding: 10px 12px;
border-radius: 10px;
font-size: 0.875rem;
font-weight: 500;
color: #64748b;
border: 1px solid transparent;
```

### Active state (rol rangi bilan)
Hisobchi uchun (pul/oltin mavzu):
```css
background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
color: #78350f;
border: 1px solid #fcd34d;
font-weight: 700;
```

### Sidebar profile (top)
- Avatar: `48px × 48px`, `border-radius: 14px`, gradient fon
- Name: `0.875rem`, `700`
- Role badge: `0.7rem`, `600`, soft-bg + `padding: 1px 6px`

---

## 10. 📊 Chart standartlari (Chart.js)

### Chart wrapper height
| Ekran     | Default | Katta chart |
|-----------|---------|-------------|
| Kompyuter | `300px` | `380px`     |
| Noutbuk   | `280px` | `340px`     |
| Planshet  | `260px` | `300px`     |
| Telefon   | `220px` | `260px`     |

### Asosiy ranglar (chart)
```js
backgroundColor: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899']
```

### Options default
```js
{ responsive: true, maintainAspectRatio: false }
```

---

## 11. 🔤 Sarlavha hierarxiyasi (Page structure)

```
<h1>  Sahifa nomi          (header — 1.25rem mobile, 2rem desktop)
<h2>  Section sarlavhasi   (1.25rem mobile, 1.5rem desktop)
<h3>  Sub-section          (1rem mobile, 1.125rem desktop)
<h4>  Karta sarlavhasi     (0.95rem mobile, 1rem desktop)
```

---

## 12. ✅ Yangi sahifa qo'shganda CHECKLIST

- [ ] **5 ta breakpoint hammasi** uchun layout test qilindi (≤480, 481-767, 768-991, 992-1199, ≥1200)
- [ ] Container `padding` qiymatlari §4 ga mos
- [ ] Ranglar `--var` shaklida yoki yuqoridagi palitra'dan
- [ ] Sarlavha hierarxiyasi to'g'ri (h1→h2→h3)
- [ ] Tugmalar primary/success/danger/outline standartiga mos
- [ ] Karta `border-radius: 16px`, `box-shadow` standartiga mos
- [ ] Grid columns §1 jadvaliga mos
- [ ] Mobil ekranda **hamburger menyu** ishlaydi
- [ ] Sidebar **overlay rejimi** mobil/planshetda ishlaydi
- [ ] Chart wrapper **height** §10 ga mos
- [ ] Modal mobil ekranda `95vh` va `95%` ga moslashgan
- [ ] **HECH QAYERDA `overflow-x: visible`** dashboard sahifasida (gorizontal scroll bo'lmasin)
- [ ] `box-sizing: border-box` barcha kartalar/elementlarda mavjud

---

## 13. 🧱 Tezkor CSS snippet (har page boshida)

```css
.page-container {
  padding: 2rem;
  min-height: 100vh;
  background: linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%);
  box-sizing: border-box;
  max-width: 100%;
  overflow-x: hidden;
}

/* === Noutbuk === */
@media (min-width: 992px) and (max-width: 1199px) {
  .page-container { padding: 1.75rem; }
}

/* === Planshet === */
@media (min-width: 768px) and (max-width: 991px) {
  .page-container { padding: 1.5rem; }
}

/* === Telefon === */
@media (min-width: 481px) and (max-width: 767px) {
  .page-container { padding: 1rem; }
}

/* === Kichik telefon === */
@media (max-width: 480px) {
  .page-container { padding: 0.75rem; }
}
```

---

## 14. 🚫 Mumkin bo'lmagan amaliyot (Anti-patterns)

- ❌ `position: absolute` bilan asosiy layout yasash
- ❌ `width: 100vw` (scroll bar bilan muommo)
- ❌ Faqat `@media (max-width: 768px)` ishlatish (4-5 ta kerak)
- ❌ Inline `style={}` bilan ko'p CSS yozish (ko'pdan-ko'p element uchun)
- ❌ Bir xil ranglar uchun har joyda turli hex kod (palitra'dan foydalaning)
- ❌ Sidebar fixed bo'lib ekran ostiga tushib qolishi
- ❌ Karta yoki tablitsani ekran sig'maydigan kenglikda qoldirish (overflow-x: auto yoki responsive grid kerak)

---

> **Eslatma:** Yangi dashboard yoki sahifa ochishdan oldin **shu hujjatni qaytadan o'qib chiqing**. Har bir o'zgartirish standartga mos kelishi shart. Yangi rol qo'shilsa — §2.2 ga rang qo'shing.

**Oxirgi yangilanish:** 2026-05-24 — Hisobchi dashboard mavzusi yashildan sariq/oltin rangga o'zgartirildi (pul/oltin bilan assotsiatsiya uchun).
