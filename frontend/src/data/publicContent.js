export const navLinks = [
  { id: 'about', label: 'Biz haqimizda' },
  { id: 'courses', label: 'Kurslar' },
  { id: 'teachers', label: "O'qituvchilar" },
  { id: 'subjects', label: 'Fanlar' },
  { id: 'news', label: 'Yangiliklar' },
  { id: 'contact', label: 'Aloqa' }
];

export const heroFeatures = [
  { icon: 'users', label: "Tajribali o'qituvchilar" },
  { icon: 'layers', label: 'Amaliy loyihalar' },
  { icon: 'globe', label: "Ingliz tilida ta'lim" },
  { icon: 'monitor', label: 'Zamonaviy texnologiyalar' }
];

export const heroStats = [
  {
    value: '500+',
    label: "Muvaffaqiyatli bitiruvchilar",
    icon: 'graduationCap',
    tone: 'gold'
  },
  {
    value: '95%',
    label: "Ishga joylashish darajasi",
    icon: 'briefcase',
    tone: 'blue'
  },
  {
    value: '50+',
    label: "Malakali o'qituvchilar",
    icon: 'users',
    tone: 'teal'
  }
];

export const resultsStats = [
  { value: '500+', label: "Muvaffaqiyatli bitiruvchilar" },
  { value: '50+', label: "Malakali o'qituvchilar" },
  { value: '95%', label: 'Ishga joylashgan bitiruvchilar' },
  { value: '10+', label: 'Yillik tajriba' }
];

export const resultCards = [
  {
    icon: 'briefcase',
    title: "Yirik kompaniyalarda ishlaydi",
    desc: "Google, Amazon, EPAM, Uzum va boshqa yetakchi kompaniyalarda."
  },
  {
    icon: 'rocket',
    title: "O'z biznesini boshlagan",
    desc: "50+ bitiruvchi o'z startaplari va bizneslarini yo'lga qo'ygan."
  },
  {
    icon: 'graduationCap',
    title: "Xalqaro universitetlarga o'qishga kirdi",
    desc: "100+ bitiruvchi xalqaro universitetlarda ta'lim olmoqda."
  }
];

export const aboutStats = [
  { value: '2019', label: 'Yil asos solingan' },
  { value: '500+', label: "O'quvchilar" },
  { value: '10+', label: "Yo'nalishlar" },
  { value: '5+', label: 'Xalqaro sertifikatlar' }
];

export const aboutPoints = [
  "Xalqaro standartlarga asoslangan dasturlar",
  "Tajribali va amaliyotchi ustozlar",
  "Zamonaviy kampus va texnopark muhiti",
  "Bitiruvchilar uchun karyera qo'llab-quvvatlash"
];

const commonFaq = [
  {
    q: "Kurs qanday formatda o'tadi?",
    a: "Darslar haftada 3 marta, online va offline formatda olib boriladi. Amaliy mashg'ulotlarga alohida vaqt ajratiladi."
  },
  {
    q: "Boshlang'ich bilim kerakmi?",
    a: "Yo'q. Kurslar 0 dan boshlanadi va bosqichma-bosqich professional darajaga olib chiqadi."
  },
  {
    q: "Sertifikat beriladimi?",
    a: "Ha. Kursni muvaffaqiyatli tugatgan barcha o'quvchilarga sertifikat beriladi."
  },
  {
    q: "To'lovni bo'lib to'lash mumkinmi?",
    a: "Ha, oylik to'lov variantlari mavjud. Batafsil ma'lumot uchun biz bilan bog'laning."
  }
];

export const courses = [
  {
    slug: 'full-stack-development',
    title: 'Full Stack Development',
    category: 'IT',
    tagline: 'Web texnologiyalari, amaliy loyihalar',
    duration: '12 oy',
    level: '0 dan professionalgacha',
    price: "4 900 000 so'm",
    tone: 'blue',
    imageAlt: "Bu yerda Full Stack Development kursi uchun dasturlash darsi rasmi bo'lishi kerak",
    description:
      "Zamonaviy web texnologiyalar yordamida to'liq stack dasturchi bo'ling. Frontend va backend ko'nikmalarini o'rganib, real loyihalarda ishlash orqali professional darajaga chiqing.",
    outcomes: [
      'HTML, CSS, JavaScript asoslari',
      'React va zamonaviy frontend',
      'Node.js va Express backend',
      'MongoDB va PostgreSQL',
      'Amaliy loyihalar va portfolio',
      "Karyera va ish topish ko'nikmalari"
    ],
    modules: [
      { title: 'HTML, CSS va JavaScript asoslari', desc: "Web sahifalarni yaratish va interaktivlikni qo'shish." },
      { title: 'React va zamonaviy frontend', desc: "Komponentlar, state, routing va API bilan ishlash." },
      { title: 'Node.js va Express', desc: 'Backend serverlar va REST API yaratish.' },
      { title: "Ma'lumotlar bazasi", desc: 'MongoDB va PostgreSQL bilan ishlash.' },
      { title: 'Amaliy loyihalar', desc: 'Portfolio uchun real loyihalar ustida ishlash.' },
      { title: 'Karyera va ish topish', desc: 'CV, portfolio va texnik suhbatlarga tayyorlanish.' }
    ],
    teacher: {
      name: 'Azizbek Karimberdiyev',
      role: 'Full Stack Development',
      tone: 'blue',
      alt: "Bu yerda Azizbek Karimberdiyevning portret rasmi bo'lishi kerak"
    },
    stats: [
      { icon: 'calendar', value: '12 oy', label: 'Davomiylik' },
      { icon: 'target', value: '0 dan', label: 'Darajaga' },
      { icon: 'layers', value: '6+', label: 'Amaliy loyiha' },
      { icon: 'award', value: 'Sertifikat', label: 'Bitiruvda' }
    ],
    features: [
      '12 oy davomiylik',
      '6+ amaliy loyiha',
      'Sertifikat',
      'Karyera yordami',
      'Online va offline'
    ],
    faq: commonFaq
  },
  {
    slug: 'business-analytics',
    title: 'Business Analytics',
    category: 'Biznes',
    tagline: "Ma'lumotlar tahlili va biznes qarorlari",
    duration: '10 oy',
    level: "Boshlang'ich",
    price: "4 200 000 so'm",
    tone: 'teal',
    imageAlt: "Bu yerda Business Analytics kursi uchun ma'lumotlar tahlili darsi rasmi bo'lishi kerak",
    description:
      "Ma'lumotlarga asoslangan biznes qarorlar qabul qilishni o'rganing. Excel, SQL, Power BI va Python yordamida tahlil qilish ko'nikmalarini egallang.",
    outcomes: [
      "Excel va ma'lumotlar bilan ishlash",
      'SQL va ma\'lumotlar bazalari',
      'Power BI vizualizatsiyasi',
      'Python asoslari',
      'Biznes prognozlash',
      'Amaliy keyslar'
    ],
    modules: [
      { title: "Excel va ma'lumotlar", desc: "Jadvallar, formulalar va tahliliy hisobotlar." },
      { title: "SQL va ma'lumotlar bazalari", desc: "Ma'lumotlarni saqlash, filtrlash va birlashtirish." },
      { title: 'Power BI', desc: 'Interaktiv dashboard va vizualizatsiya yaratish.' },
      { title: 'Python asoslari', desc: "Pandas va NumPy bilan ma'lumotlarni tahlil qilish." },
      { title: 'Biznes prognozlash', desc: 'Trendlarni aniqlash va qarorlar uchun prognozlar.' },
      { title: 'Amaliy keyslar', desc: 'Haqiqiy biznes muammolari ustida ishlash.' }
    ],
    teacher: {
      name: 'Malika Tursunova',
      role: 'Business Analytics',
      tone: 'teal',
      alt: "Bu yerda Malika Tursunovaning portret rasmi bo'lishi kerak"
    },
    stats: [
      { icon: 'calendar', value: '10 oy', label: 'Davomiylik' },
      { icon: 'target', value: "Boshlang'ich", label: 'Daraja' },
      { icon: 'chart', value: '5+', label: 'Amaliy keys' },
      { icon: 'award', value: 'Sertifikat', label: 'Bitiruvda' }
    ],
    features: [
      '10 oy davomiylik',
      '5+ amaliy keys',
      'Sertifikat',
      'Karyera yordami',
      'Online va offline'
    ],
    faq: commonFaq
  },
  {
    slug: 'cybersecurity-ai',
    title: 'Cybersecurity & AI',
    category: 'IT',
    tagline: "Kiberxavfsizlik va sun'iy intellekt",
    duration: '12 oy',
    level: "O'rta",
    price: "5 400 000 so'm",
    tone: 'indigo',
    imageAlt: "Bu yerda Cybersecurity & AI kursi uchun kiberxavfsizlik laboratoriyasi rasmi bo'lishi kerak",
    description:
      "Kiberxavfsizlik va sun'iy intellekt sohasida chuqur bilim oling. Tarmoq xavfsizligi, ethical hacking va AI yechimlarini amaliyotda qo'llang.",
    outcomes: [
      'Tarmoq xavfsizligi asoslari',
      'Ethical hacking',
      'Kriptografiya',
      "Sun'iy intellekt asoslari",
      'Xavfsizlik auditi',
      'Amaliy laboratoriyalar'
    ],
    modules: [
      { title: 'Tarmoq xavfsizligi', desc: 'Tarmoqlar, protokollar va himoya usullari.' },
      { title: 'Ethical hacking', desc: 'Zaifliklarni topish va xavfsizlikni mustahkamlash.' },
      { title: 'Kriptografiya', desc: "Ma'lumotlarni shifrlash va xavfsiz almashish." },
      { title: "Sun'iy intellekt", desc: 'Machine learning va AI modellari asoslari.' },
      { title: 'Xavfsizlik auditi', desc: 'Tizimlarni tekshirish va risklarni baholash.' },
      { title: 'Amaliy laboratoriyalar', desc: 'Real stsenariylar bo\'yicha amaliy mashqlar.' }
    ],
    teacher: {
      name: 'Javohir Raimov',
      role: 'Cybersecurity & AI',
      tone: 'indigo',
      alt: "Bu yerda Javohir Raimovning portret rasmi bo'lishi kerak"
    },
    stats: [
      { icon: 'calendar', value: '12 oy', label: 'Davomiylik' },
      { icon: 'shield', value: "O'rta", label: 'Daraja' },
      { icon: 'cpu', value: '8+', label: 'Laboratoriya' },
      { icon: 'award', value: 'Sertifikat', label: 'Bitiruvda' }
    ],
    features: [
      '12 oy davomiylik',
      '8+ laboratoriya',
      'Sertifikat',
      'Karyera yordami',
      'Online va offline'
    ],
    faq: commonFaq
  },
  {
    slug: 'mobile-development',
    title: 'Mobile Development',
    category: 'IT',
    tagline: 'iOS va Android ilovalar',
    duration: '10 oy',
    level: "Boshlang'ich",
    price: "4 800 000 so'm",
    tone: 'purple',
    imageAlt: "Bu yerda Mobile Development kursi uchun mobil ilova yaratish jarayoni rasmi bo'lishi kerak",
    description:
      "iOS va Android uchun zamonaviy mobil ilovalar yaratishni o'rganing. Flutter, Dart va API integratsiyasi bilan portfolio yig'ing.",
    outcomes: [
      'Dart va Flutter asoslari',
      'Mobil UI/UX dizayn',
      'State management',
      'API integratsiyasi',
      'iOS va Android nashri',
      'Portfolio loyihasi'
    ],
    modules: [
      { title: 'Dart va Flutter', desc: 'Mobil ilovalar uchun asosiy til va framework.' },
      { title: 'Mobil UI/UX', desc: 'Zamonaviy va qulay interfeyslar yaratish.' },
      { title: 'State management', desc: "Ilova holatini boshqarish va optimallashtirish." },
      { title: 'API integratsiyasi', desc: 'Backend xizmatlari bilan ulanish.' },
      { title: 'Nashr qilish', desc: 'App Store va Google Play ga chiqarish.' },
      { title: 'Portfolio loyihasi', desc: 'Yakuniy loyihani noldan yaratish.' }
    ],
    teacher: {
      name: 'Azizbek Karimberdiyev',
      role: 'Mobile Development',
      tone: 'purple',
      alt: "Bu yerda Azizbek Karimberdiyevning portret rasmi bo'lishi kerak"
    },
    stats: [
      { icon: 'calendar', value: '10 oy', label: 'Davomiylik' },
      { icon: 'smartphone', value: "Boshlang'ich", label: 'Daraja' },
      { icon: 'layers', value: '4+', label: 'Ilova' },
      { icon: 'award', value: 'Sertifikat', label: 'Bitiruvda' }
    ],
    features: [
      '10 oy davomiylik',
      '4+ mobil ilova',
      'Sertifikat',
      'Karyera yordami',
      'Online va offline'
    ],
    faq: commonFaq
  },
  {
    slug: 'ielts-general-english',
    title: 'IELTS & General English',
    category: 'Til',
    tagline: "Ingliz tilini xalqaro darajada o'rganish",
    duration: '8 oy',
    level: 'A1–C1',
    price: "3 600 000 so'm",
    tone: 'gold',
    imageAlt: "Bu yerda IELTS & General English kursi uchun ingliz tili darsi rasmi bo'lishi kerak",
    description:
      "Ingliz tilini xalqaro darajada o'rganing. IELTS imtihoniga tayyorlaning va akademik hamda professional muloqot ko'nikmalarini rivojlantiring.",
    outcomes: [
      'Listening va Speaking',
      'Reading va Writing',
      'Grammar va vocabulary',
      'IELTS strategiyalari',
      'Mock testlar',
      'Akademik yozuv'
    ],
    modules: [
      { title: 'Listening va Speaking', desc: "Talaffuz, tinglash va erkin muloqot." },
      { title: 'Reading va Writing', desc: 'Matn tushunish va akademik yozuv.' },
      { title: 'Grammar va vocabulary', desc: "Til asoslari va so'z boyligini oshirish." },
      { title: 'IELTS strategiyalari', desc: 'Imtihon formatiga mos tayyorgarlik.' },
      { title: 'Mock testlar', desc: 'Real imtihon sharoitida sinov.' },
      { title: 'Akademik yozuv', desc: 'Essay va report yozish ko\'nikmalari.' }
    ],
    teacher: {
      name: 'Dilnoza Saidova',
      role: 'IELTS & English',
      tone: 'gold',
      alt: "Bu yerda Dilnoza Saidovaning portret rasmi bo'lishi kerak"
    },
    stats: [
      { icon: 'calendar', value: '8 oy', label: 'Davomiylik' },
      { icon: 'globe', value: 'A1–C1', label: 'Daraja' },
      { icon: 'book', value: '6+', label: 'Mock test' },
      { icon: 'award', value: 'Sertifikat', label: 'Bitiruvda' }
    ],
    features: [
      '8 oy davomiylik',
      '6+ mock test',
      'Sertifikat',
      'Karyera yordami',
      'Online va offline'
    ],
    faq: commonFaq
  },
  {
    slug: 'graphic-design',
    title: 'Graphic Design',
    category: 'Dizayn',
    tagline: 'Dizayn va kreativ mahorat',
    duration: '8 oy',
    level: "Boshlang'ich",
    price: "3 900 000 so'm",
    tone: 'rose',
    imageAlt: "Bu yerda Graphic Design kursi uchun dizayn jarayoni rasmi bo'lishi kerak",
    description:
      "Brending, UI dizayn va vizual kommunikatsiya asoslarini o'rganing. Figma va Adobe vositalarida professional darajadagi portfolio yarating.",
    outcomes: [
      'Dizayn asoslari',
      'Figma va Adobe vositalari',
      'Brending va logo',
      'UI dizayn',
      'Portfolio yaratish',
      'Freelance va karyera'
    ],
    modules: [
      { title: 'Dizayn asoslari', desc: 'Kompozitsiya, ranglar va tipografiya.' },
      { title: 'Figma va Adobe', desc: 'Zamonaviy dizayn vositalarida ishlash.' },
      { title: 'Brending va logo', desc: 'Brend identifikatsiyasi va logotip yaratish.' },
      { title: 'UI dizayn', desc: 'Web va mobil interfeyslar dizayni.' },
      { title: 'Portfolio', desc: 'Kuchli portfolio loyihalarini yig\'ish.' },
      { title: 'Freelance va karyera', desc: 'Mijozlar bilan ishlash va daromad topish.' }
    ],
    teacher: {
      name: 'Shahzoda Nurmatova',
      role: 'Graphic Design',
      tone: 'rose',
      alt: "Bu yerda Shahzoda Nurmatovaning portret rasmi bo'lishi kerak"
    },
    stats: [
      { icon: 'calendar', value: '8 oy', label: 'Davomiylik' },
      { icon: 'palette', value: "Boshlang'ich", label: 'Daraja' },
      { icon: 'penTool', value: '6+', label: 'Loyiha' },
      { icon: 'award', value: 'Sertifikat', label: 'Bitiruvda' }
    ],
    features: [
      '8 oy davomiylik',
      '6+ portfolio loyihasi',
      'Sertifikat',
      'Karyera yordami',
      'Online va offline'
    ],
    faq: commonFaq
  }
];

export const teachers = [
  {
    name: 'Azizbek Karimberdiyev',
    role: 'Full Stack Development',
    tone: 'blue',
    alt: "Bu yerda Azizbek Karimberdiyevning portret rasmi bo'lishi kerak"
  },
  {
    name: 'Malika Tursunova',
    role: 'Business Analytics',
    tone: 'teal',
    alt: "Bu yerda Malika Tursunovaning portret rasmi bo'lishi kerak"
  },
  {
    name: 'Javohir Raimov',
    role: 'Cybersecurity & AI',
    tone: 'indigo',
    alt: "Bu yerda Javohir Raimovning portret rasmi bo'lishi kerak"
  },
  {
    name: 'Dilnoza Saidova',
    role: 'IELTS & English',
    tone: 'gold',
    alt: "Bu yerda Dilnoza Saidovaning portret rasmi bo'lishi kerak"
  }
];

export const subjects = [
  { name: 'Dasturlash', icon: 'code' },
  { name: "Ma'lumotlar tahlili", icon: 'chart' },
  { name: 'Kiberxavfsizlik', icon: 'shield' },
  { name: 'Biznes va menejment', icon: 'briefcase' },
  { name: 'Ingliz tili', icon: 'globe' },
  { name: 'Dizayn', icon: 'palette' },
  { name: "Sun'iy intellekt", icon: 'cpu' },
  { name: 'Mobil ilovalar', icon: 'smartphone' }
];

export const gallery = [
  {
    tone: 'blue',
    alt: "Bu yerda My Dream School binosining tashqi ko'rinishi rasmi bo'lishi kerak"
  },
  {
    tone: 'teal',
    alt: "Bu yerda o'quvchilar guruhi rasmi bo'lishi kerak"
  },
  {
    tone: 'indigo',
    alt: "Bu yerda zamonaviy sinfxona rasmi bo'lishi kerak"
  },
  {
    tone: 'gold',
    alt: "Bu yerda bitiruvchilar rasmi bo'lishi kerak"
  },
  {
    tone: 'purple',
    alt: "Bu yerda maktab kutubxonasi rasmi bo'lishi kerak"
  }
];

export const news = [
  {
    date: '12.09.2024',
    category: 'Yangilik',
    title: 'Yangi IT laboratoriyasi ochildi',
    excerpt:
      "Zamonaviy texnologiyalar bilan jihozlangan yangi laboratoriya o'quvchilar uchun ochildi.",
    tone: 'blue',
    alt: "Bu yerda yangi IT laboratoriyasi rasmi bo'lishi kerak"
  },
  {
    date: '05.09.2024',
    category: 'Hamkorlik',
    title: 'Xalqaro hamkorlik shartnomasi imzolandi',
    excerpt:
      "My Dream School xalqaro universitetlar bilan hamkorlikni yo'lga qo'ydi.",
    tone: 'teal',
    alt: "Bu yerda xalqaro hamkorlik shartnomasini imzolash rasmi bo'lishi kerak"
  },
  {
    date: '28.08.2024',
    category: 'Yutuq',
    title: "Bitiruvchilarimizning yangi yutuqlari",
    excerpt:
      "Bitiruvchilarimiz xalqaro tanlovlarda yuqori natijalarga erishdi.",
    tone: 'gold',
    alt: "Bu yerda bitiruvchilarning yutuqlari rasmi bo'lishi kerak"
  }
];

export const contactItems = [
  {
    icon: 'mapPin',
    label: 'Manzil',
    value: "Beruniy shahri, Qoraqalpog'iston Respublikasi"
  },
  {
    icon: 'phone',
    label: 'Telefon',
    value: '+998 90 123 45 67',
    href: 'tel:+998901234567'
  },
  {
    icon: 'mail',
    label: 'Email',
    value: 'info@mydreamschool.uz',
    href: 'mailto:info@mydreamschool.uz'
  },
  {
    icon: 'clock',
    label: 'Ish vaqti',
    value: 'Dushanba–Juma, 09:00–18:00'
  }
];

export const courseCategories = ['Barchasi', 'IT', 'Biznes', 'Til', 'Dizayn'];

export const getCourseBySlug = (slug) => courses.find((course) => course.slug === slug);
