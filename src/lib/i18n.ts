'use client'

import { useCallback } from 'react'
import { useAppStore, type Language } from '@/stores/app-store'
import {
  localizeCategoryDescription,
  localizeProductDescription,
  localizeProductName,
} from '@/lib/catalog-ar'

const categoryAr: Record<string, string> = {
  morocco: 'المغرب',
  korea: 'كوريا',
  supplements: 'المكملات',
  clothing: 'الملابس',
  fragrances: 'العطور',
}

const ar: Record<string, string> = {
  Home: 'الرئيسية',
  Shop: 'المتجر',
  About: 'من نحن',
  Wishlist: 'المفضلة',
  Cart: 'السلة',
  Admin: 'الإدارة',
  'Sign In': 'تسجيل الدخول',
  'Sign Out': 'تسجيل الخروج',
  'My Profile': 'ملفي الشخصي',
  'Admin Dashboard': 'لوحة الإدارة',
  'Create Account': 'إنشاء حساب',
  Navigation: 'التنقل',
  Navigate: 'تصفح',
  Categories: 'التصنيفات',
  'Shop All': 'تسوق الكل',
  'About Us': 'من نحن',
  Morocco: 'المغرب',
  Korea: 'كوريا',
  Supplements: 'المكملات',
  Clothing: 'الملابس',
  Fragrances: 'العطور',
  'Flagship of Standards': 'راية المعايير',
  'Curated beauty, wellness, knowledge, and style from around the globe — where heritage meets refinement.':
    'جمال وعافية ومعرفة وأناقة منتقاة من أنحاء العالم — حيث يلتقي التراث بالرقي.',
  'Explore Collection': 'استكشف المجموعة',
  'Get in Touch': 'تواصل معنا',
  Contact: 'تواصل معنا',
  'Follow Us': 'تابعنا',
  'Join us for new arrivals, beauty insights, and exclusive offers.':
    'انضم إلينا لتصلك أحدث المنتجات ونصائح الجمال والعروض الحصرية.',
  'All rights reserved.': 'جميع الحقوق محفوظة.',
  'Curated with Purpose. Inspired by the World. Defined by Excellence.':
    'منتقاة بهدف. مستلهمة من العالم. معرّفة بالتميّز.',
  'Dammam, Saudi Arabia': 'الدمام، المملكة العربية السعودية',
  'Premium Beauty & Skincare': 'جمال وعناية فاخرة',
  'Discover Beauty,': 'اكتشف الجمال،',
  Redefined: 'بصورة جديدة',
  'Authentic Moroccan traditions meet innovative Korean skincare. Experience the best of both worlds.':
    'تلتقي تقاليد المغرب الأصيلة بعناية البشرة الكورية المبتكرة. عِش أفضل ما في العالمين.',
  'Shop Now': 'تسوق الآن',
  'Explore Categories': 'استكشف التصنيفات',
  'Shop by Category': 'تسوق حسب التصنيف',
  'Explore our curated collections from around the world': 'استكشف مجموعاتنا المنتقاة من حول العالم',
  'Coming Soon': 'قريباً',
  products: 'منتجات',
  'Curated Selection': 'مختارات منتقاة',
  'Featured Products': 'منتجات مميزة',
  'Hand-picked favorites just for you — our most loved products':
    'مفضلات مختارة بعناية من أجلك — أكثر منتجاتنا حباً',
  'View All Products': 'عرض كل المنتجات',
  'Hot Deals': 'عروض مميزة',
  'Special Offers': 'عروض خاصة',
  "Don't miss out — limited time discounts on premium beauty products":
    'لا تفوّت الخصومات المحدودة على منتجات الجمال الفاخرة',
  'View All Deals': 'عرض كل العروض',
  'Why Choose Alifaain?': 'لماذا تختار أليف عين؟',
  'We deliver excellence in every aspect of your shopping experience':
    'نقدم التميّز في كل جانب من تجربة تسوقك',
  'Authentic Products': 'منتجات أصلية',
  '100% genuine products sourced directly from trusted suppliers.':
    'منتجات أصلية 100٪ من موردين موثوقين مباشرة.',
  'Premium Quality': 'جودة فاخرة',
  'Only the finest ingredients and formulations make it to our store.':
    'لا يصل إلى متجرنا إلا أجود المكونات والتركيبات.',
  'Fast Delivery': 'توصيل سريع',
  'Quick and reliable shipping across Saudi Arabia and beyond.':
    'شحن سريع وموثوق داخل المملكة العربية السعودية وخارجها.',
  'Secure Payment': 'دفع آمن',
  'Safe and encrypted payment processing for your peace of mind.':
    'معالجة دفع آمنة ومشفّرة لراحة بالك.',
  'Stay in the Loop': 'ابقَ على اطلاع',
  'Subscribe for exclusive offers, beauty tips, and new arrivals':
    'اشترك لتحصل على عروض حصرية ونصائح جمال وأحدث المنتجات',
  'Enter your email': 'أدخل بريدك الإلكتروني',
  Subscribe: 'اشترك',
  Featured: 'مميز',
  Add: 'أضف',
  'Added to cart': 'أُضيف إلى السلة',
  'has been added to your cart.': 'أُضيف إلى سلتك.',
  'has been added.': 'تمت إضافته.',
  'Added to wishlist': 'أُضيف إلى المفضلة',
  'Removed from wishlist': 'أُزيل من المفضلة',
  'saved to your favorites.': 'حُفظ في مفضلتك.',
  'removed from your wishlist.': 'أُزيل من مفضلتك.',
  Saved: 'محفوظ',
  'Add to Wishlist': 'أضف إلى المفضلة',
  'Save to Wishlist': 'احفظ في المفضلة',
  'In Wishlist': 'في المفضلة',
  'Remove from wishlist': 'إزالة من المفضلة',
  'Add to wishlist': 'أضف إلى المفضلة',
  Apply: 'تطبيق',
  'Try': 'جرّب',
  'for 10% off': 'لخصم 10٪',
  'Welcome to Alif Aain — Where Timeless Elegance Meets': 'مرحباً بك في أليف عين — حيث تلتقي الأناقة الخالدة بـ',
  'Modern Discovery': 'الاكتشاف العصري',
  'At Alif Aain, we believe that true luxury is not defined by excess, but by discernment.':
    'في أليف عين نؤمن أن الفخامة الحقيقية لا تُقاس بالإسراف، بل بحسن الاختيار.',
  'Curated with Purpose.': 'منتقاة بهدف.',
  'Inspired by the World.': 'مستلهمة من العالم.',
  'It is found in the thoughtful selection of exceptional products, the appreciation of authentic craftsmanship, and the pursuit of a life lived with intention.':
    'تتجلى في الاختيار المتأني للمنتجات الاستثنائية، وتقدير الحرفة الأصيلة، والسعي لحياة تُعاش بقصد.',
  "Founded with a vision to bring the world's finest treasures together under one distinguished destination, Alif Aain is a curated marketplace for those who value quality, heritage, and sophistication. From the sun-kissed argan groves of Morocco to the innovative skincare laboratories of Seoul, from the ancient botanical wisdom of India to the pages of transformative literature, we invite you to discover a world where global excellence meets refined living.":
    'تأسست أليف عين برؤية تجمع أرقى كنوز العالم في وجهة واحدة مميزة، وهي سوق منتقاة لمن يقدّرون الجودة والتراث والرقي. من بساتين الأركان في المغرب إلى مختبرات العناية في سيول، ومن حكمة الهند النباتية إلى صفحات الأدب الملهم، ندعوك لاكتشاف عالم يلتقي فيه التميّز العالمي بالعيش الرفيع.',
  'At the heart of our brand lies a simple yet unwavering principle: excellence without compromise. This commitment is reflected in our promise to be the Flagship of Standards—a destination where every product is carefully selected, every partnership is thoughtfully cultivated, and every customer experience is held to the highest level of distinction.':
    'في قلب علامتنا مبدأ بسيط وثابت: التميّز بلا تنازل. وينعكس ذلك في وعدنا بأن نكون راية المعايير — وجهة يُنتقى فيها كل منتج بعناية، وتُبنى فيها كل شراكة بوعي، وتُصان فيها تجربة كل عميل بأعلى درجات التميّز.',
  'More than a marketplace, Alif Aain is a celebration of culture, beauty, wellness, knowledge, and style. We are curators of a refined lifestyle, bringing together the world\'s most exceptional products for those who appreciate authenticity, quality, and timeless elegance.':
    'أليف عين أكثر من سوق؛ إنها احتفاء بالثقافة والجمال والعافية والمعرفة والأناقة. نحن قيّمون لنمط حياة راقٍ، نجمع أرقى منتجات العالم لمن يقدّرون الأصالة والجودة والأناقة الخالدة.',
  'Explore Products': 'استكشف المنتجات',
  'Our Philosophy': 'فلسفتنا',
  'Every Product Has a': 'لكل منتج',
  'Story Worth Telling': 'قصة تستحق أن تُروى',
  'Each item within our collection is chosen with purpose—not only for its quality and effectiveness, but also for the heritage, craftsmanship, and values it represents. Our approach is guided by a commitment to authenticity, excellence, and sophistication, ensuring that every product enriches daily life and transforms ordinary moments into extraordinary experiences.':
    'يُختار كل منتج في مجموعتنا بهدف — ليس لجودته وفعاليته فحسب، بل أيضاً للتراث والحرفة والقيم التي يمثلها. ويوجهنا التزام بالأصالة والتميّز والرقي، ليُثري كل منتج الحياة اليومية ويحوّل اللحظات العادية إلى تجارب استثنائية.',
  'Whether it is a luxurious skincare ritual, a signature fragrance, an inspiring book, a wellness essential, or a beautifully crafted garment, our purpose is to help our customers embrace a lifestyle defined by refinement, confidence, and purpose.':
    'سواء كانت طقساً فاخراً للعناية، أو عطراً مميزاً، أو كتاباً ملهماً، أو أساس عافية، أو قطعة أنيقة، فغايتنا أن نساعد عملاءنا على أسلوب حياة يحدده الرقي والثقة والهدف.',
  Authenticity: 'الأصالة',
  'Every product reflects genuine heritage, craftsmanship, and values.':
    'كل منتج يعكس تراثاً أصيلاً وحرفة وقيمًا حقيقية.',
  Excellence: 'التميّز',
  'We uphold the highest standards in quality and customer experience.':
    'نحافظ على أعلى المعايير في الجودة وتجربة العميل.',
  Sophistication: 'الرقي',
  'We curate products that transform everyday moments into something extraordinary.':
    'ننتقي منتجات تحوّل لحظات اليوم إلى شيء استثنائي.',
  'Our Collection': 'مجموعتنا',
  'The Many Facets of': 'جوانب',
  'Modern Living': 'الحياة العصرية',
  'Our carefully curated selection reflects the many facets of modern living—and this is only the beginning.':
    'تعكس مجموعتنا المنتقاة جوانب الحياة العصرية — وهذه ليست إلا البداية.',
  Skincare: 'العناية بالبشرة',
  'Authentic organic Moroccan beauty traditions, advanced Korean skincare innovations, and time-honoured Indian formulations rooted in centuries of wellness wisdom.':
    'تقاليد جمال مغربية عضوية أصيلة، وابتكارات كورية متقدمة، وتركيبات هندية عريقة متجذرة في قرون من حكمة العافية.',
  'Wellness & Supplements': 'العافية والمكملات',
  'Thoughtfully sourced products designed to support vitality, balance, and overall well-being.':
    'منتجات مختارة بعناية لدعم الحيوية والتوازن والعافية العامة.',
  'Exquisite perfumes that leave a lasting impression and express individuality with elegance.':
    'عطور راقية تترك أثراً وتعبّر عن التفرد بأناقة.',
  Literature: 'الأدب',
  'Books that educate, inspire, challenge perspectives, and enrich the mind.':
    'كتب تثقف وتُلهم وتوسّع الأفق وتُثري العقل.',
  'Fashion & Apparel': 'الأزياء والملابس',
  'Carefully selected clothing that embodies sophistication, confidence, and timeless style.':
    'ملابس مختارة بعناية تجسّد الرقي والثقة والأناقة الخالدة.',
  'As Alif Aain continues to grow, we will introduce even more exceptional products, brands, and discoveries from around the world—each chosen according to the same uncompromising standards that define our name.':
    'مع نمو أليف عين سنقدّم المزيد من المنتجات والعلامات والاكتشافات الاستثنائية من حول العالم — كل منها وفق المعايير الصارمة التي تعرّف اسمنا.',
  'Our Promise': 'وعدنا',
  'Excellence Without': 'التميّز بلا',
  Compromise: 'تنازل',
  'Every product that bears the Alif Aain name has been thoughtfully vetted and selected to meet the highest standards of excellence.':
    'كل منتج يحمل اسم أليف عين خضع لمراجعة دقيقة واختير ليبلغ أعلى معايير التميّز.',
  'We collaborate with trusted artisans, heritage producers, innovative creators, and respected brands who share our dedication to craftsmanship, integrity, and quality. Our commitment extends beyond commerce; it is reflected in every detail of the experience we create for our customers.':
    'نتعاون مع حرفيين موثوقين ومنتجي تراث ومبدعين وعلامات محترمة يشاركوننا الالتزام بالحرفة والنزاهة والجودة. ويمتد التزامنا إلى ما بعد البيع؛ فهو حاضر في كل تفصيل من التجربة التي نصنعها لعملائنا.',
  'When you choose Alif Aain, you are not simply making a purchase—you are investing in quality, embracing global craftsmanship, and choosing products that reflect a higher standard of living.':
    'حين تختار أليف عين فأنت لا تشتري فحسب — أنت تستثمر في الجودة، وتحتضن الحرفة العالمية، وتختار منتجات تعكس مستوى أرقى من العيش.',
  'Trusted Partners': 'شركاء موثوقون',
  'Highest Standards': 'أعلى المعايير',
  'Expert Curated': 'منتقاة بخبرة',
  'Verified Authentic': 'أصالة موثّقة',
  'Our Vision': 'رؤيتنا',
  'Where Heritage Meets': 'حيث يلتقي التراث بـ',
  Innovation: 'الابتكار',
  'To become a globally trusted destination for discerning individuals seeking the finest products from across the world—where heritage meets innovation, tradition meets modernity, and luxury becomes a way of life.':
    'أن نصبح وجهة عالمية موثوقة لأصحاب الذوق الباحثين عن أرقى المنتجات من أنحاء العالم — حيث يلتقي التراث بالابتكار، والتقليد بالحداثة، وتصبح الفخامة أسلوب حياة.',
  'Bringing together beauty, wellness, knowledge, and style from around the globe for those who demand nothing less than the exceptional.':
    'نجمع الجمال والعافية والمعرفة والأناقة من حول العالم لمن لا يقبل بأقل من الاستثنائي.',
  'Alif Aain — Flagship of Standards.': 'أليف عين — راية المعايير.',
  'Discover the Exceptional': 'اكتشف الاستثنائي',
  'Explore our curated collection of beauty, wellness, knowledge, and style from around the globe.':
    'استكشف مجموعتنا المنتقاة من الجمال والعافية والمعرفة والأناقة من حول العالم.',
  'Contact Us': 'تواصل معنا',
  "We'd Love to": 'يسعدنا أن',
  'Hear From You': 'نسمع منك',
  "Whether you have a question about our products, need skincare advice, or just want to say hello — we're here for you.":
    'سواء كان لديك سؤال عن منتجاتنا، أو تحتاج نصيحة للعناية، أو أردت مجرد التحية — نحن هنا من أجلك.',
  'Email Us': 'راسلنا',
  'We reply within 24 hours': 'نرد خلال 24 ساعة',
  'Call Us': 'اتصل بنا',
  'Sun–Thu, 06:00–15:00 GMT': 'الأحد–الخميس، 06:00–15:00 بتوقيت غرينتش',
  'Visit Us': 'زُرنا',
  'King Fahd Road, Dammam': 'طريق الملك فهد، الدمام',
  'Business Hours': 'ساعات العمل',
  'Sun–Thu: 06:00–15:00 GMT': 'الأحد–الخميس: 06:00–15:00 بتوقيت غرينتش',
  '9:00 AM–6:00 PM Saudi Arabia (GMT+3) · Fri–Sat closed':
    '9:00 صباحاً–6:00 مساءً بتوقيت السعودية (غرينتش+3) · الجمعة والسبت مغلق',
  'Send Us a Message': 'أرسل لنا رسالة',
  "Fill out the form below and we'll get back to you as soon as possible.":
    'املأ النموذج وسنعود إليك في أقرب وقت.',
  'Your Name': 'اسمك',
  'Email Address': 'البريد الإلكتروني',
  Subject: 'الموضوع',
  'Select a topic': 'اختر موضوعاً',
  'General Inquiry': 'استفسار عام',
  'Product Question': 'سؤال عن منتج',
  'Order Support': 'دعم الطلبات',
  'Wholesale Inquiry': 'استفسار جملة',
  'Partnership Opportunity': 'فرصة شراكة',
  Feedback: 'ملاحظات',
  Message: 'الرسالة',
  'Tell us how we can help...': 'أخبرنا كيف يمكننا مساعدتك...',
  'Sending...': 'جارٍ الإرسال...',
  'Send Message': 'إرسال الرسالة',
  'Message Sent!': 'تم إرسال الرسالة!',
  "Thank you for reaching out. We'll get back to you within 24 hours.":
    'شكراً لتواصلك. سنرد عليك خلال 24 ساعة.',
  'Our Flagship Store': 'متجرنا الرئيسي',
  'Visit Us in Dammam': 'زُرنا في الدمام',
  'King Fahd Road, Dammam, Saudi Arabia': 'طريق الملك فهد، الدمام، المملكة العربية السعودية',
  'Follow Us on Social Media': 'تابعنا على وسائل التواصل',
  'Stay updated with our latest products, beauty tips, and exclusive offers.':
    'ابقَ على اطلاع بأحدث منتجاتنا ونصائح الجمال والعروض الحصرية.',
  'Frequently Asked Questions': 'الأسئلة الشائعة',
  'What are your shipping options?': 'ما خيارات الشحن لديكم؟',
  'Free shipping on orders over 200 SAR across Saudi Arabia.':
    'شحن مجاني للطلبات التي تزيد عن 200 ريال داخل المملكة.',
  'Are your products authentic?': 'هل منتجاتكم أصلية؟',
  'Yes, 100% genuine products sourced directly from trusted suppliers.':
    'نعم، منتجات أصلية 100٪ من موردين موثوقين مباشرة.',
  'What is your return policy?': 'ما سياسة الإرجاع؟',
  '30-day hassle-free returns on all unopened products.':
    'إرجاع خلال 30 يوماً دون تعقيد لجميع المنتجات غير المفتوحة.',
  'Browse our entire collection across all categories': 'تصفح مجموعتنا الكاملة عبر كل التصنيفات',
  'product found': 'منتج',
  'products found': 'منتجات',
  'All Products': 'كل المنتجات',
  Soon: 'قريباً',
  'Search products...': 'ابحث عن المنتجات...',
  'Sort by': 'ترتيب',
  'Name A-Z': 'الاسم أ-ي',
  'Name Z-A': 'الاسم ي-أ',
  'Price: Low-High': 'السعر: من الأقل',
  'Price: High-Low': 'السعر: من الأعلى',
  'Price Range (SAR)': 'نطاق السعر (ريال)',
  'Add to Cart': 'أضف إلى السلة',
  'Low Stock': 'كمية محدودة',
  'Product Not Found': 'المنتج غير موجود',
  'Browse Products': 'تصفح المنتجات',
  'Back to Products': 'العودة إلى المنتجات',
  'OFF': 'خصم',
  Save: 'وفّر',
  'Only': 'متبقٍ',
  'left in stock': 'فقط في المخزون',
  'In Stock': 'متوفر',
  'Out of Stock': 'غير متوفر',
  'Quantity:': 'الكمية:',
  'Related Products': 'منتجات ذات صلة',
  'added to your cart.': 'أُضيف إلى سلتك.',
  'Your Cart is Empty': 'سلتك فارغة',
  "Looks like you haven't added anything yet.": 'يبدو أنك لم تضف شيئاً بعد.',
  'Continue Shopping': 'متابعة التسوق',
  'Shopping Cart': 'سلة التسوق',
  Remove: 'إزالة',
  'Order Summary': 'ملخص الطلب',
  Subtotal: 'المجموع الفرعي',
  Coupon: 'قسيمة',
  Shipping: 'الشحن',
  Free: 'مجاني',
  'Add {amount} more for free shipping!': 'أضف {amount} إضافية للشحن المجاني!',
  Total: 'الإجمالي',
  'Proceed to Checkout': 'المتابعة للدفع',
  'Your Wishlist is Empty': 'قائمة المفضلة فارغة',
  'Save products you love and come back to them anytime.':
    'احفظ المنتجات التي تحبها وعد إليها في أي وقت.',
  'My Wishlist': 'مفضلتي',
  'saved item': 'عنصر محفوظ',
  'saved items': 'عناصر محفوظة',
  'View Cart': 'عرض السلة',
  'Move to Cart': 'انقل إلى السلة',
  'Currently out of stock': 'غير متوفر حالياً',
  Removed: 'تمت الإزالة',
  'removed from wishlist.': 'أُزيل من المفضلة.',
  'Nothing to Checkout': 'لا يوجد ما يُدفع',
  'Your cart is empty.': 'سلتك فارغة.',
  Checkout: 'الدفع',
  Information: 'البيانات',
  Payment: 'الدفع',
  'Back to Cart': 'العودة إلى السلة',
  'Customer Information': 'بيانات العميل',
  'Full Name *': 'الاسم الكامل *',
  'Your full name': 'اسمك الكامل',
  'Email Address *': 'البريد الإلكتروني *',
  'Phone Number': 'رقم الجوال',
  'Continue to Payment': 'المتابعة إلى الدفع',
  Edit: 'تعديل',
  'Payment Method': 'طريقة الدفع',
  'Credit / Debit Card': 'بطاقة ائتمان / مدى',
  'Visa, Mastercard': 'فيزا، ماستركارد',
  Mada: 'مدى',
  'Saudi debit cards': 'بطاقات الخصم السعودية',
  'Apple Pay': 'Apple Pay',
  'Quick & secure': 'سريع وآمن',
  'Cash on Delivery': 'الدفع عند الاستلام',
  'Pay when received': 'ادفع عند الاستلام',
  'Card Details': 'بيانات البطاقة',
  'Cardholder Name': 'اسم حامل البطاقة',
  'Name on card': 'الاسم على البطاقة',
  'Card Number': 'رقم البطاقة',
  'Expiry Date': 'تاريخ الانتهاء',
  'CVC/CVV': 'CVC/CVV',
  'Your payment is secured with 256-bit SSL encryption': 'دفعتك محمية بتشفير SSL بعمق 256 بت',
  "Click \"Pay Now\" to confirm with Apple Pay. You'll see a confirmation prompt on your device.":
    'اضغط «ادفع الآن» للتأكيد عبر Apple Pay. ستظهر رسالة تأكيد على جهازك.',
  'Pay when your order arrives. A small COD fee of SAR 10 may apply. Please have exact change ready.':
    'ادفع عند وصول طلبك. قد تُطبق رسوم دفع عند الاستلام بقيمة 10 ريالات. يُرجى تجهيز المبلغ.',
  'Processing...': 'جارٍ المعالجة...',
  Pay: 'ادفع',
  'COD Fee': 'رسوم الدفع عند الاستلام',
  'Secure checkout • 256-bit SSL': 'دفع آمن • تشفير SSL بعمق 256 بت',
  'Payment Successful!': 'تم الدفع بنجاح!',
  'Thank you for your purchase.': 'شكراً لشرائك.',
  'Order ID:': 'رقم الطلب:',
  'Transaction:': 'رقم العملية:',
  'Payment Confirmed': 'تم تأكيد الدفع',
  'Back to Home': 'العودة للرئيسية',
  'Payment Failed': 'فشل الدفع',
  'Your payment could not be processed.': 'تعذر معالجة دفعتك.',
  'Try Again': 'حاول مرة أخرى',
  'Processing Payment': 'جارٍ معالجة الدفع',
  'Please wait while we process your payment...': 'يرجى الانتظار بينما نعالج دفعتك...',
  'Do not close this page.': 'لا تغلق هذه الصفحة.',
  'Missing fields': 'حقول ناقصة',
  'Please fill in your name and email.': 'يرجى إدخال الاسم والبريد الإلكتروني.',
  'Missing card details': 'بيانات البطاقة ناقصة',
  'Please fill in all card fields.': 'يرجى تعبئة جميع حقول البطاقة.',
  'Welcome Back': 'مرحباً بعودتك',
  'Admin Portal': 'بوابة الإدارة',
  'Secure access to your dashboard. Manage products, orders, and more.':
    'دخول آمن إلى لوحتك. أدِر المنتجات والطلبات والمزيد.',
  'Sign in to your Alifaain account and explore our premium beauty collections.':
    'سجّل الدخول إلى حسابك في أليف عين واستكشف مجموعات الجمال الفاخرة.',
  'Secured admin access': 'دخول إداري محمي',
  'Trusted by thousands': 'موثوق من الآلاف',
  'Sign in to admin dashboard': 'تسجيل الدخول إلى لوحة الإدارة',
  'Sign in to your Alifaain account': 'سجّل الدخول إلى حسابك في أليف عين',
  Email: 'البريد',
  Mobile: 'الجوال',
  'Admin Email': 'بريد المسؤول',
  'Mobile Number': 'رقم الجوال',
  Password: 'كلمة المرور',
  'Enter admin password': 'أدخل كلمة مرور المسؤول',
  'Enter your password': 'أدخل كلمة المرور',
  'Remember me': 'تذكرني',
  'Sign In as Admin': 'دخول كمسؤول',
  'Demo Credentials': 'بيانات تجريبية',
  'Demo Mobile Login': 'دخول تجريبي بالجوال',
  "Don't have an account?": 'ليس لديك حساب؟',
  'Create one': 'أنشئ حساباً',
  'Admin?': 'مسؤول؟',
  'Sign in to admin panel': 'الدخول إلى لوحة الإدارة',
  'Admin access is restricted to authorized personnel only.':
    'الوصول الإداري مقصور على المخولين فقط.',
  'Back to customer sign in': 'العودة لتسجيل دخول العملاء',
  'Please fill in all fields': 'يرجى تعبئة جميع الحقول',
  'Welcome, Admin!': 'مرحباً أيها المسؤول!',
  'Welcome back!': 'مرحباً بعودتك!',
  'You have been signed in to the admin dashboard.': 'تم تسجيل دخولك إلى لوحة الإدارة.',
  'You have been signed in successfully.': 'تم تسجيل دخولك بنجاح.',
  'Invalid credentials': 'بيانات الدخول غير صحيحة',
  'Join Alifaain': 'انضم إلى أليف عين',
  'Create an account to unlock exclusive offers and track your beauty journey.':
    'أنشئ حساباً لتحصل على عروض حصرية وتتابع رحلتك مع الجمال.',
  Secure: 'آمن',
  Premium: 'فاخر',
  'Fast Ship': 'شحن سريع',
  'Join Alifaain for the best beauty experience': 'انضم إلى أليف عين لأفضل تجربة جمال',
  'Full Name': 'الاسم الكامل',
  '(optional)': '(اختياري)',
  'Add your mobile number to sign in with phone later': 'أضف رقم جوالك لتسجيل الدخول به لاحقاً',
  'At least 6 characters': '6 أحرف على الأقل',
  Weak: 'ضعيفة',
  Medium: 'متوسطة',
  Strong: 'قوية',
  'Confirm Password': 'تأكيد كلمة المرور',
  'Confirm your password': 'أكد كلمة المرور',
  'Passwords match': 'كلمتا المرور متطابقتان',
  'Passwords do not match': 'كلمتا المرور غير متطابقتين',
  'I agree to the': 'أوافق على',
  'Terms of Service': 'شروط الخدمة',
  and: 'و',
  'Privacy Policy': 'سياسة الخصوصية',
  'Already have an account?': 'لديك حساب بالفعل؟',
  'Account Created!': 'تم إنشاء الحساب!',
  'Name must be at least 2 characters': 'يجب أن يكون الاسم حرفين على الأقل',
  'Please enter a valid email': 'يرجى إدخال بريد إلكتروني صحيح',
  'Please enter a valid email address': 'يرجى إدخال بريد إلكتروني صحيح',
  'Please enter a valid mobile number': 'يرجى إدخال رقم جوال صحيح',
  'Password must be at least 6 characters': 'يجب أن تكون كلمة المرور 6 أحرف على الأقل',
  'You must accept the terms and conditions': 'يجب الموافقة على الشروط والأحكام',
  'Not Signed In': 'لم تسجل الدخول',
  'Please sign in to view your profile.': 'يرجى تسجيل الدخول لعرض ملفك.',
  'Signed out': 'تم تسجيل الخروج',
  'You have been signed out successfully.': 'تم تسجيل خروجك بنجاح.',
  Details: 'البيانات',
  Orders: 'الطلبات',
  Danger: 'خطر',
  'Account Details': 'بيانات الحساب',
  'Used for mobile sign-in and order updates': 'يُستخدم لتسجيل الدخول بالجوال وتحديثات الطلب',
  'Add your mobile number to sign in with phone': 'أضف رقم جوالك لتسجيل الدخول بالهاتف',
  'Save Changes': 'حفظ التغييرات',
  'Change Password': 'تغيير كلمة المرور',
  'Current Password': 'كلمة المرور الحالية',
  'New Password': 'كلمة المرور الجديدة',
  'Confirm New Password': 'تأكيد كلمة المرور الجديدة',
  Error: 'خطأ',
  'Loading Alifaain...': 'جارٍ تحميل أليف عين...',
  'Overview of your store performance': 'نظرة عامة على أداء المتجر',
  Products: 'المنتجات',
  Staff: 'الموظفون',
  'Manage Products': 'إدارة المنتجات',
  'total products': 'إجمالي المنتجات',
  Dashboard: 'لوحة التحكم',
  'Add Product': 'إضافة منتج',
  'Manage Orders': 'إدارة الطلبات',
  'total orders': 'إجمالي الطلبات',
  Refresh: 'تحديث',
  'Manage your product categories': 'إدارة تصنيفات المنتجات',
  'Add Category': 'إضافة تصنيف',
  'Staff Management': 'إدارة الموظفين',
  'Manage admin access and permissions': 'إدارة صلاحيات الدخول الإداري',
  'Admin Access Required': 'يلزم صلاحية إدارية',
  'Access Denied': 'الوصول مرفوض',
  'Saudi Arabia': 'المملكة العربية السعودية',
  UAE: 'الإمارات',
  Kuwait: 'الكويت',
  Bahrain: 'البحرين',
  Qatar: 'قطر',
  Oman: 'عُمان',
  Egypt: 'مصر',
  'United States': 'الولايات المتحدة',
  'United Kingdom': 'المملكة المتحدة',
  Europe: 'أوروبا',
  India: 'الهند',
  Pakistan: 'باكستان',
  Bangladesh: 'بنغلاديش',
  Philippines: 'الفلبين',
  Malaysia: 'ماليزيا',
  Turkey: 'تركيا',
  Jordan: 'الأردن',
  Lebanon: 'لبنان',
  Iraq: 'العراق',
  'South Korea': 'كوريا الجنوبية',
  'Moroccan Beauty Week': 'أسبوع الجمال المغربي',
  'Up to 30% OFF': 'خصم حتى 30٪',
  'Discover authentic Moroccan skincare with exclusive discounts on Argan Oil, Nila Powder & more':
    'اكتشف العناية المغربية الأصيلة بخصومات حصرية على زيت الأركان ومسحوق النيلة والمزيد',
  'Shop Morocco': 'تسوق المغرب',
  'K-Beauty Festival': 'مهرجان الجمال الكوري',
  'Save up to 25%': 'وفّر حتى 25٪',
  'Premium Korean skincare essentials — Centella, Hyalu-Cica & Retinol at unbeatable prices':
    'أساسيات العناية الكورية الفاخرة — السينتيلا وهيالو-سيكا والريتينول بأسعار مميزة',
  'Shop Korea': 'تسوق كوريا',
  'Wellness Sale': 'تخفيضات العافية',
  '20% OFF Supplements': 'خصم 20٪ على المكملات',
  'Boost your inner beauty with our premium Shilajit & wellness packs':
    'عزّز جمالك من الداخل مع الشيلاجيت الفاخر وباقات العافية',
  'Shop Supplements': 'تسوق المكملات',
  'Free Shipping': 'شحن مجاني',
  'Orders over 200 SAR': 'للطلبات فوق 200 ريال',
  'Enjoy free delivery across Saudi Arabia on all orders above 200 SAR':
    'استمتع بتوصيل مجاني داخل المملكة لجميع الطلبات فوق 200 ريال',
  'Start Shopping': 'ابدأ التسوق',
  'Clear Filters': 'مسح عوامل التصفية',
  'No products found': 'لا توجد منتجات',
  'Try adjusting your filters or search query.': 'جرّب تعديل عوامل التصفية أو عبارة البحث.',
  'Total Products': 'إجمالي المنتجات',
  'Total Orders': 'إجمالي الطلبات',
  'Total Revenue': 'إجمالي الإيرادات',
  'Paid Revenue': 'الإيرادات المحصّلة',
  'Recent Orders': 'أحدث الطلبات',
}

export function translate(language: Language, text: string, vars?: Record<string, string | number>) {
  let out = language === 'ar' ? (ar[text] ?? text) : text
  if (vars) {
    for (const [key, value] of Object.entries(vars)) {
      out = out.replaceAll(`{${key}}`, String(value))
    }
  }
  return out
}

export function translateCategory(language: Language, slug: string | undefined, name: string) {
  if (language !== 'ar' || !slug) return name
  return categoryAr[slug] ?? translate(language, name)
}

export function useI18n() {
  const language = useAppStore((state) => state.language)
  const setLanguage = useAppStore((state) => state.setLanguage)

  const t = useCallback(
    (text: string, vars?: Record<string, string | number>) => translate(language, text, vars),
    [language]
  )

  const tc = useCallback(
    (slug: string | undefined, name: string) => translateCategory(language, slug, name),
    [language]
  )

  const pn = useCallback(
    (name: string) => localizeProductName(language, name),
    [language]
  )

  const pd = useCallback(
    (name: string, description: string | null | undefined) => localizeProductDescription(language, name, description),
    [language]
  )

  const cdesc = useCallback(
    (slug: string | undefined, description: string | null | undefined) => localizeCategoryDescription(language, slug, description),
    [language]
  )

  return {
    language,
    setLanguage,
    t,
    tc,
    pn,
    pd,
    cdesc,
    dir: language === 'ar' ? ('rtl' as const) : ('ltr' as const),
  }
}
