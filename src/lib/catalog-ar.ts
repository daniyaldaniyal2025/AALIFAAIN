import type { Language } from '@/stores/app-store'

type Localized = { name: string; description: string }

const productsAr: Record<string, Localized> = {
  'Beldi Soap': {
    name: 'صابون بلدي',
    description: 'صابون مغربي أسود تقليدي مصنوع من الزيتون، مثالي للتنظيف العميق والتقشير.',
  },
  'Kessa Glove': {
    name: 'قفاز الكيسة',
    description: 'قفاز مغربي أصيل لتقشير البشرة ومنحها نعومة وإشراقاً.',
  },
  'Kessa for Back': {
    name: 'كيسة الظهر',
    description: 'قفاز تقشير بمقبض طويل مصمم للمناطق صعبة الوصول في الظهر.',
  },
  'Tbrima Powder': {
    name: 'بودرة التبريمة',
    description: 'بودرة تبريمة طبيعية لطقوس الجمال المغربية التقليدية.',
  },
  'Ghassoul Clay': {
    name: 'طين الغاسول',
    description: 'طين غاسول مغربي نقي لتنظيف عميق للشعر والبشرة.',
  },
  'Nila Powder': {
    name: 'بودرة النيلة',
    description: 'بودرة نيلة مغربية أصيلة لتفتيح البشرة وتوحيد لونها.',
  },
  'Aker Fassi': {
    name: 'عكر فاسي',
    description: 'أحمر شفاه وأحمر خدود مغربي تقليدي بلون جمال طبيعي.',
  },
  "Feet Clay M'hekka": {
    name: 'طين القدمين محكة',
    description: 'طين مغربي متخصص للعناية بالقدمين وتنعيم البشرة الخشنة.',
  },
  "Face M'hekka": {
    name: 'محكة الوجه',
    description: 'أداة قناع وجه مغربية تقليدية لتوزيع المنتج بالتساوي.',
  },
  'Nila Face Mask': {
    name: 'قناع النيلة للوجه',
    description: 'قناع نيلة جاهز لتفتيح البشرة وإنعاشها فوراً.',
  },
  'Charcoal Face Mask': {
    name: 'قناع الفحم للوجه',
    description: 'قناع فحم منشّط لتنظيف المسام بعمق وإزالة السموم.',
  },
  'Snail and Shell Face Mask': {
    name: 'قناع الحلزون والقوقعة',
    description: 'قناع بمخاط الحلزون لترطيب البشرة وإصلاحها.',
  },
  'Nila Soap Bar': {
    name: 'قالب صابون النيلة',
    description: 'صابون نيلة مصنوع يدوياً للتنظيف اليومي وتفتيح البشرة.',
  },
  'Donkey Milk Soap Bar': {
    name: 'صابون حليب الأتان',
    description: 'صابون فاخر بحليب الأتان للترطيب ومقاومة علامات التقدم في السن.',
  },
  'Goat Milk Soap Bar': {
    name: 'صابون حليب الماعز',
    description: 'صابون لطيف بحليب الماعز للبشرة الحساسة والجافة.',
  },
  'Camel Milk Soap Bar': {
    name: 'صابون حليب الإبل',
    description: 'صابون فاخر بحليب الإبل غني بالفيتامينات والمعادن الطبيعية.',
  },
  'Argan Oil': {
    name: 'زيت الأركان',
    description: 'زيت أركان مغربي نقي، ذهب سائل لتغذية الشعر والبشرة.',
  },
  'Prickly Pear Oil': {
    name: 'زيت التين الشوكي',
    description: 'زيت بذور التين الشوكي النادر لعناية فاخرة ضد علامات الشيخوخة.',
  },
  'Sidr Powder': {
    name: 'بودرة السدر',
    description: 'بودرة سدر طبيعية لتنظيف الشعر وترطيبه.',
  },
  'Skin 1004 Centella Ampoule': {
    name: 'أمبولة سكين 1004 بالسينتيلا',
    description: 'أمبولة مركّزة بخلاصة السينتيلا الآسيوية لتهدئة البشرة المتهيجة.',
  },
  'Skin 1004 Centella Toning Toner': {
    name: 'تونر سكين 1004 بالسينتيلا',
    description: 'تونر لطيف مشبع بالسينتيلا لبشرة متوازنة ومنتعشة.',
  },
  'Skin 1004 Centella Ampoule Foam': {
    name: 'غسول رغوة سكين 1004 بالسينتيلا',
    description: 'غسول رغوي منخفض الحموضة بالسينتيلا للتنظيف اليومي اللطيف.',
  },
  'Skin 1004 Hyalu-Cica Water-Fit Sun Serum': {
    name: 'سيروم الشمس هيالو-سيكا من سكين 1004',
    description: 'سيروم شمس خفيف بحمض الهيالورونيك والسينتيلا لحماية من الأشعة فوق البنفسجية.',
  },
  'Skin 1004 Hyalu-Cica Brightening Toner': {
    name: 'تونر التفتيح هيالو-سيكا من سكين 1004',
    description: 'تونر مفتح يجمع حمض الهيالورونيك والسينتيلا لبشرة مشرقة.',
  },
  'Skin 1004 Probio-Cica Intensive Ampoule': {
    name: 'أمبولة بروبيو-سيكا المكثفة من سكين 1004',
    description: 'أمبولة مكثفة بالبروبيوتيك والسينتيلا لإصلاح حاجز البشرة.',
  },
  'Skin 1004 Centella Tea-Trica Purifying Toner': {
    name: 'تونر التنقية تي-تريكا من سكين 1004',
    description: 'تونر منقّي بشجرة الشاي والسينتيلا للبشرة المعرضة لحب الشباب.',
  },
  'Skin 1004 Centella Poremizing Fresh Ampoule': {
    name: 'أمبولة تضييق المسام من سكين 1004',
    description: 'أمبولة لتقليل مظهر المسام ومنح البشرة ملمساً أنعم.',
  },
  'Skin 1004 Centella Tone Brightening Capsule Ampoule': {
    name: 'أمبولة كبسولات تفتيح اللون من سكين 1004',
    description: 'أمبولة كبسولات لتفتيح البشرة ومنحها إشراقاً متجانساً.',
  },
  'Skin 1004 Centella Madagascar Travel Kit': {
    name: 'طقم السفر مدغشقر بالسينتيلا من سكين 1004',
    description: 'طقم عناية بحجم السفر يضم أساسيات السينتيلا.',
  },
  'Skin 1004 Centella Ampoule Kit': {
    name: 'طقم أمبولات السينتيلا من سكين 1004',
    description: 'مجموعة أمبولات بالحجم الكامل لعناية متكاملة بالسينتيلا.',
  },
  'Skin 1004 Centella Air-Fit Suncream Light': {
    name: 'واقي الشمس إير-فت الخفيف من سكين 1004',
    description: 'واقي شمس خفيف جداً يمنح إحساساً كالهواء على البشرة.',
  },
  'Skin 1004 Centella Hyalu-Cica Silky-Fit Sun Stick': {
    name: 'ستيك الشمس سيلكي-فت من سكين 1004',
    description: 'ستيك شمس عملي لحماية سهلة من الأشعة أثناء التنقل.',
  },
  'Skin 1004 Niacinamide 10 Boosting Shot Ampoule': {
    name: 'أمبولة النياسيناميد 10 من سكين 1004',
    description: 'أمبولة نياسيناميد عالية التركيز لتفتيح البشرة والعناية بالمسام.',
  },
  'Skin 1004 Retinol 0.2 Boosting Shot Ampoule': {
    name: 'أمبولة الريتينول 0.2 من سكين 1004',
    description: 'أمبولة ريتينول لطيفة لمقاومة علامات التقدم في السن وتجديد البشرة.',
  },
  'Skin 1004 Centella Poremizing Light Gel Cream': {
    name: 'كريم جل خفيف لتضييق المسام من سكين 1004',
    description: 'كريم جل مرطب خفيف للبشرة الدهنية والمختلطة.',
  },
  'Dr. Althea 345 Relief Cream': {
    name: 'كريم د. ألثيا 345 للتهدئة',
    description: 'كريم متعدد المفعول لتهدئة البشرة المتضررة وإصلاحها.',
  },
  'Dr. Althea 147 Barrier Cream': {
    name: 'كريم الحاجز 147 من د. ألثيا',
    description: 'كريم لتقوية حاجز البشرة ومنحها مرونة وصحة.',
  },
  'Dr. Althea Aqua Marine Watery Cream': {
    name: 'كريم أكوا مارين المائي من د. ألثيا',
    description: 'كريم ترطيب عميق بمكونات بحرية لبشرة ممتلئة وندية.',
  },
  'Dr. Althea Pure Grinding Cleansing Balm': {
    name: 'بلسم التنظيف بيور غرايندينغ من د. ألثيا',
    description: 'بلسم تنظيف مبتكر لإزالة المكياج بفعالية.',
  },
  'Dr. Althea PDRN Reju Cream': {
    name: 'كريم التجديد PDRN من د. ألثيا',
    description: 'كريم تجديد فاخر بتقنية PDRN لعناية متقدمة ضد الشيخوخة.',
  },
  'Dr. Althea Gentle Vitamin C Serum': {
    name: 'سيروم فيتامين سي اللطيف من د. ألثيا',
    description: 'سيروم فيتامين سي لطيف وفعّال لتفتيح البشرة والحماية من الأكسدة.',
  },
  'Dr. Althea Skin Relief Essence': {
    name: 'إيسنس تهدئة البشرة من د. ألثيا',
    description: 'خلاصة مهدئة لراحة فورية للبشرة.',
  },
  'Feel Great Bulk Pack - 30 Days': {
    name: 'باقة فيل غريت لمدة 30 يوماً',
    description: 'باقة مكملات عافية متكاملة لمدة 30 يوماً للصحة والحيوية.',
  },
  Shilajit: {
    name: 'الشيلاجيت',
    description: 'راتنج شيلاجيت طبيعي فاخر للطاقة والقوة والتجدد.',
  },
}

const categoriesAr: Record<string, Localized> = {
  morocco: {
    name: 'المغرب',
    description: 'منتجات جمال مغربية تقليدية، طبيعية وأصيلة ومجرّبة عبر الزمن',
  },
  korea: {
    name: 'كوريا',
    description: 'عناية كورية فاخرة بتركيبات مبتكرة لبشرة مشرقة',
  },
  supplements: {
    name: 'المكملات',
    description: 'مكملات الصحة والعافية للجمال من الداخل',
  },
  clothing: {
    name: 'الملابس',
    description: 'قريباً — مجموعة أزياء فاخرة',
  },
  fragrances: {
    name: 'العطور',
    description: 'قريباً — عطور راقية',
  },
}

export function localizeProductName(language: Language, name: string) {
  if (language !== 'ar') return name
  return productsAr[name]?.name ?? name
}

export function localizeProductDescription(
  language: Language,
  name: string,
  description: string | null | undefined,
) {
  if (language !== 'ar') return description ?? ''
  return productsAr[name]?.description ?? description ?? ''
}

export function localizeCategoryDescription(
  language: Language,
  slug: string | undefined,
  description: string | null | undefined,
) {
  if (language !== 'ar' || !slug) return description ?? ''
  return categoriesAr[slug]?.description ?? description ?? ''
}

export function productMatchesQuery(
  name: string,
  description: string | null | undefined,
  query: string,
) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const arabic = productsAr[name]
  return (
    name.toLowerCase().includes(q) ||
    (description?.toLowerCase().includes(q) ?? false) ||
    (arabic?.name.toLowerCase().includes(q) ?? false) ||
    (arabic?.description.toLowerCase().includes(q) ?? false)
  )
}
