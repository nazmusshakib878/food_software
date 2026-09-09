/* =========================================================
   DATA.JS - Default Initial Store Data, Categories, Customers,
   Order Types, Printers, Inventory, Applications & Menu
   ========================================================= */

const DEFAULT_STORE = {
    nameAr: "نور فودز",
    nameEn: "NUR FOODES",
    companyName: "شركة صح للتجارة",
    companyNameAr: "شركة صح للتجارة",
    vatNumber: "300987654300003",
    taxRate: 15,
    currency: "SAR",
    currencyAr: "ر.س",
    adminPin: "1234",
    staffPin: "0000"
};

const DEFAULT_CATEGORIES = [
    { id: "meals", nameAr: "الوجبات - المشاوي", nameEn: "Meals - Grills", icon: "fa-burger" },
    { id: "sandwiches", nameAr: "السندوتشات - المشاوي", nameEn: "Sandwiches - Grills", icon: "fa-hotdog" },
    { id: "drinks", nameAr: "المشروبات غازية ومياه", nameEn: "Soft Drinks & Water", icon: "fa-bottle-water" },
    { id: "hot_drinks", nameAr: "المشروبات الساخنة ومخبوزات", nameEn: "Hot Drinks & Bakery", icon: "fa-mug-hot" }
];

const DEFAULT_ITEMS = [
    { 
        id: "item_tikka_sauce", 
        catId: "sandwiches", 
        arName: "صوص تيكا", 
        enName: "Tikka sauce", 
        subtitleAr: "صوص تيكا",
        subtitleEn: "Tikka sauce",
        price: 2.00, 
        code: "101", 
        available: true,
        image: "https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?auto=format&fit=crop&w=500&q=80"
    },
    { 
        id: "item_burger_ff_meal", 
        catId: "meals", 
        arName: "وجبة برجر / بطاطس", 
        enName: "Burger /FF Meal", 
        subtitleAr: "وجبة برجر مشوي ع الفحم",
        subtitleEn: "Charcoal-grilled burger meal",
        price: 18.50, 
        code: "102", 
        available: true,
        image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=80"
    },
    { 
        id: "item_meat_burger_meal", 
        catId: "meals", 
        arName: "وجبة برجر لحم", 
        enName: "Meat Burger Meal", 
        subtitleAr: "وجبة برجر لحم بقري",
        subtitleEn: "Beef burger meal",
        price: 19.50, 
        code: "103", 
        available: true,
        image: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=500&q=80"
    },
    { 
        id: "item_chicken_strips_meal", 
        catId: "meals", 
        arName: "وجبة دجاج استربس", 
        enName: "Chicken Strips Meal", 
        subtitleAr: "وجبة برجر دجاج",
        subtitleEn: "Chicken burger meal",
        price: 18.50, 
        code: "104", 
        available: true,
        image: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=500&q=80"
    },
    { 
        id: "item_meat_kebab", 
        catId: "sandwiches", 
        arName: "كباب لحم", 
        enName: "Meat Kebab", 
        subtitleAr: "كباب لحم مشوي",
        subtitleEn: "Meat kebab",
        price: 9.50, 
        code: "105", 
        available: true,
        image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=500&q=80"
    },
    { 
        id: "item_chicken_kebab", 
        catId: "sandwiches", 
        arName: "كباب دجاج", 
        enName: "Chicken Kebab", 
        subtitleAr: "كباب دجاج مشوي",
        subtitleEn: "Chicken kebab",
        price: 9.50, 
        code: "106", 
        available: true,
        image: "https://images.unsplash.com/photo-1603360946369-dc9bb6258143?auto=format&fit=crop&w=500&q=80"
    },
    { 
        id: "item_hashi_burger", 
        catId: "sandwiches", 
        arName: "برجر حاشي", 
        enName: "Hashi Burger", 
        subtitleAr: "برجر لحم حاشي",
        subtitleEn: "camel burger",
        price: 18.50, 
        code: "107", 
        available: true,
        image: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=500&q=80"
    },
    { 
        id: "item_hashi_kebab", 
        catId: "sandwiches", 
        arName: "كباب حاشي", 
        enName: "Hashi Kebab", 
        subtitleAr: "كباب لحم حاشي",
        subtitleEn: "camel kebab",
        price: 11.50, 
        code: "108", 
        available: true,
        image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=500&q=80"
    },
    { 
        id: "item_shrimp", 
        catId: "sandwiches", 
        arName: "روبيان", 
        enName: "Shrimp", 
        subtitleAr: "روبيان طازج",
        subtitleEn: "shrimp",
        price: 9.50, 
        code: "109", 
        available: true,
        image: "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=500&q=80"
    },
    { 
        id: "item_tandoori", 
        catId: "sandwiches", 
        arName: "تندوري", 
        enName: "Tandoori", 
        subtitleAr: "دجاج تندوري متبل",
        subtitleEn: "Tandoori",
        price: 10.50, 
        code: "110", 
        available: true,
        image: "https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?auto=format&fit=crop&w=500&q=80"
    },
    { 
        id: "item_fish_sandwich", 
        catId: "sandwiches", 
        arName: "سمك", 
        enName: "Fish sandwich", 
        subtitleAr: "سمك طازج",
        subtitleEn: "fish",
        price: 9.50, 
        code: "111", 
        available: true,
        image: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=500&q=80"
    },
    { 
        id: "item_shish_tawooq", 
        catId: "sandwiches", 
        arName: "شيش طاووق", 
        enName: "Shish Tawooq", 
        subtitleAr: "شيش طاووق مشوي",
        subtitleEn: "Shish Tawook",
        price: 9.50, 
        code: "112", 
        available: true,
        image: "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=500&q=80"
    },
    { 
        id: "item_charcoal_burger", 
        catId: "sandwiches", 
        arName: "برجر ع الفحم", 
        enName: "Charcoal Burger", 
        subtitleAr: "برجر مشوي ع الفحم",
        subtitleEn: "Charcoal-grilled burger",
        price: 12.50, 
        code: "113", 
        available: true,
        image: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&w=500&q=80"
    },
    { 
        id: "item_meat_burger", 
        catId: "sandwiches", 
        arName: "برجر لحم", 
        enName: "Meat Burger", 
        subtitleAr: "برجر لحم بقري",
        subtitleEn: "beef burger",
        price: 13.50, 
        code: "114", 
        available: true,
        image: "https://images.unsplash.com/photo-1553979459-d2229ba7433b?auto=format&fit=crop&w=500&q=80"
    },
    { 
        id: "item_chicken_strips_burger", 
        catId: "sandwiches", 
        arName: "برجر دجاج استربس", 
        enName: "Chicken Strips Burger", 
        subtitleAr: "شرائح برجر دجاج",
        subtitleEn: "Chicken burger slices",
        price: 12.50, 
        code: "115", 
        available: true,
        image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=500&q=80"
    },
    { 
        id: "item_tikka_sandwich", 
        catId: "sandwiches", 
        arName: "سندوتش تيكا", 
        enName: "Tikka Sandwich", 
        subtitleAr: "سندوتش تيكا",
        subtitleEn: "Tikka sandwich",
        price: 10.50, 
        code: "116", 
        available: true,
        image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=500&q=80"
    },
    { 
        id: "item_cheese", 
        catId: "sandwiches", 
        arName: "جبن", 
        enName: "Cheese", 
        subtitleAr: "جبن إضافي",
        subtitleEn: "cheese",
        price: 1.50, 
        code: "117", 
        available: true,
        image: "https://images.unsplash.com/photo-1452195100486-9cc805987862?auto=format&fit=crop&w=500&q=80"
    },
    { 
        id: "item_sauce", 
        catId: "sandwiches", 
        arName: "صوص", 
        enName: "Sauce", 
        subtitleAr: "صوص إضافي",
        subtitleEn: "sauce",
        price: 1.50, 
        code: "118", 
        available: true,
        image: "https://images.unsplash.com/photo-1472476443507-c7a5948772fc?auto=format&fit=crop&w=500&q=80"
    },
    { 
        id: "item_large_fries", 
        catId: "sandwiches", 
        arName: "بطاطس كبير", 
        enName: "Large Fries", 
        subtitleAr: "بطاطس كبير",
        subtitleEn: "large potatoes",
        price: 6.00, 
        code: "119", 
        available: true,
        image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=500&q=80"
    },
    { 
        id: "item_small_fries", 
        catId: "sandwiches", 
        arName: "بطاطس صغير", 
        enName: "Small Fries", 
        subtitleAr: "بطاطس صغير",
        subtitleEn: "small potatoes",
        price: 4.00, 
        code: "120", 
        available: true,
        image: "https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?auto=format&fit=crop&w=500&q=80"
    },
    { 
        id: "item_pepsi_can", 
        catId: "drinks", 
        arName: "بيبسي علبة", 
        enName: "Pepsi Can", 
        subtitleAr: "بيبسي علبة",
        subtitleEn: "Pepsi can",
        price: 3.50, 
        code: "121", 
        available: true,
        image: "https://images.unsplash.com/photo-1629203851122-3726ecdf080e?auto=format&fit=crop&w=500&q=80"
    },
    { 
        id: "item_mineral_water", 
        catId: "drinks", 
        arName: "مياه معدنية", 
        enName: "Mineral Water", 
        subtitleAr: "مياه معدنية",
        subtitleEn: "mineral water",
        price: 1.50, 
        code: "122", 
        available: true,
        image: "https://images.unsplash.com/photo-1559839914-17aae19cec71?auto=format&fit=crop&w=500&q=80"
    },
    { 
        id: "item_adani_tea", 
        catId: "hot_drinks", 
        arName: "شاي عدني", 
        enName: "Adani Tea", 
        subtitleAr: "شاي عدني",
        subtitleEn: "Adeni tea",
        price: 4.00, 
        code: "123", 
        available: true,
        image: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=500&q=80"
    },
    { 
        id: "item_arabic_coffee", 
        catId: "hot_drinks", 
        arName: "قهوة عربية", 
        enName: "Arabic Coffee", 
        subtitleAr: "قهوة عربية",
        subtitleEn: "Arabic coffee",
        price: 6.00, 
        code: "124", 
        available: true,
        image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=500&q=80"
    }
];

/* Customers & Order Sources */
const DEFAULT_CUSTOMERS = [
    { id: "cash", nameAr: "عميل نقدي", nameEn: "Cash Customer" },
    { id: "hungerstation", nameAr: "هنقرستيشن", nameEn: "Hungerstation" },
    { id: "jahiz", nameAr: "جاهز", nameEn: "Jahiz" },
    { id: "ninja", nameAr: "نينجا", nameEn: "Ninja" },
    { id: "management", nameAr: "طاقم الإدارة", nameEn: "Management Staff" },
    { id: "keeta", nameAr: "كيتا", nameEn: "Keeta" },
    { id: "mrsool", nameAr: "مرسول", nameEn: "Mrsool" },
    { id: "toyou", nameAr: "تو يو", nameEn: "ToYou" },
    { id: "thechefz", nameAr: "ذا شفز", nameEn: "The Chefz" },
    { id: "mosque", nameAr: "عميل المسجد", nameEn: "Mosque Customer" }
];

/* Order Types */
const DEFAULT_ORDER_TYPES = [
    { id: "local", nameAr: "محلي", nameEn: "Dine-in", icon: "fa-utensils" },
    { id: "delivery", nameAr: "توصيل", nameEn: "Delivery", icon: "fa-motorcycle" },
    { id: "receive", nameAr: "استلام", nameEn: "Pickup", icon: "fa-bag-shopping" },
    { id: "cars", nameAr: "خدمة السيارات", nameEn: "Drive-thru", icon: "fa-car" },
    { id: "delivery_d", nameAr: "توصيل سريع", nameEn: "Express Delivery", icon: "fa-truck-fast" }
];

/* Printers Configuration */
const DEFAULT_PRINTERS = [
    { id: "prn_1", name: "Cashier Thermal Printer", nameAr: "طابعة الكاشير الحرارية", role: "cashier", ip: "192.168.1.100", status: "online", isDefault: true },
    { id: "prn_2", name: "Kitchen Order Printer", nameAr: "طابعة بون المطبخ", role: "kitchen", ip: "192.168.1.101", status: "online", isDefault: true },
    { id: "prn_3", name: "Backoffice Reports Printer", nameAr: "طابعة تقارير الإدارة", role: "reports", ip: "192.168.1.102", status: "online", isDefault: true }
];

/* Payment Methods & Categories */
const DEFAULT_PAYMENT_METHODS = [
    { id: "cash", nameAr: "نقدي", nameEn: "Cash", categoryAr: "نقدي", categoryEn: "Cash" },
    { id: "mada_1", nameAr: "جهاز مدى 1", nameEn: "Mada Terminal 1", categoryAr: "مدى", categoryEn: "Mada" },
    { id: "mada_2", nameAr: "جهاز مدى 2", nameEn: "Mada Terminal 2", categoryAr: "مدى", categoryEn: "Mada" },
    { id: "visa", nameAr: "بطاقة ائتمانية", nameEn: "Credit Card", categoryAr: "بطاقات", categoryEn: "Card" },
    { id: "apps", nameAr: "تطبيقات التوصيل", nameEn: "Delivery Apps", categoryAr: "تطبيقات", categoryEn: "Applications" }
];

/* Delivery Applications */
const DEFAULT_APPLICATIONS = [
    { id: "hungerstation", nameAr: "هنقرستيشن", nameEn: "Hungerstation", commission: 15 },
    { id: "jahiz", nameAr: "جاهز", nameEn: "Jahiz", commission: 15 },
    { id: "ninja", nameAr: "نينجا", nameEn: "Ninja", commission: 12 },
    { id: "keeta", nameAr: "كيتا", nameEn: "Keeta", commission: 14 },
    { id: "mrsool", nameAr: "مرسول", nameEn: "Mrsool", commission: 15 },
    { id: "toyou", nameAr: "تو يو", nameEn: "ToYou", commission: 12 },
    { id: "thechefz", nameAr: "ذا شفز", nameEn: "The Chefz", commission: 16 }
];

/* Pre-configured Add-ons & Modifiers for Restaurant POS */
const POPULAR_ADDONS = [
    { id: 'extra_cheese', nameAr: 'جبنة إضافية', nameEn: 'Extra Cheese', price: 3.00 },
    { id: 'spicy', nameAr: 'حار سبايسي', nameEn: 'Spicy Hot', price: 1.50 },
    { id: 'extra_sauce', nameAr: 'صوص إضافي', nameEn: 'Extra Sauce', price: 2.00 },
    { id: 'double_meat', nameAr: 'لحم مضاعف', nameEn: 'Double Patty/Meat', price: 6.00 },
    { id: 'fries_addon', nameAr: 'إضافة بطاطس مقلية', nameEn: 'Add French Fries', price: 5.00 }
];

/* Preset Restaurant Photos for 1-Click Selection in Admin */
const IMAGE_PRESETS = [
    { labelAr: "مياه معدنية", labelEn: "Mineral Water", catId: "drinks", url: "https://images.unsplash.com/photo-1559839914-17aae19cec71?auto=format&fit=crop&w=400&q=80" },
    { labelAr: "بيبسي علبة", labelEn: "Pepsi Can", catId: "drinks", url: "https://images.unsplash.com/photo-1629203851122-3726ecdf080e?auto=format&fit=crop&w=400&q=80" },
    { labelAr: "كولا / غازيات", labelEn: "Cola Soda", catId: "drinks", url: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=400&q=80" },
    { labelAr: "عصير برتقال", labelEn: "Orange Juice", catId: "drinks", url: "https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=400&q=80" },
    { labelAr: "سفن اب / ليمون", labelEn: "7Up / Lemon", catId: "drinks", url: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=400&q=80" },
    { labelAr: "وجبة برجر", labelEn: "Burger Meal", catId: "meals", url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80" },
    { labelAr: "برجر مشوي", labelEn: "Beef Burger", catId: "meals", url: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=400&q=80" },
    { labelAr: "كباب لحم", labelEn: "Meat Kebab", catId: "sandwiches", url: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=400&q=80" },
    { labelAr: "كباب دجاج", labelEn: "Chicken Kebab", catId: "sandwiches", url: "https://images.unsplash.com/photo-1603360946369-dc9bb6258143?auto=format&fit=crop&w=400&q=80" },
    { labelAr: "شيش طاووق", labelEn: "Shish Tawooq", catId: "sandwiches", url: "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=400&q=80" },
    { labelAr: "بطاطس مقلية", labelEn: "French Fries", catId: "sandwiches", url: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=400&q=80" },
    { labelAr: "شاي عدني / كرك", labelEn: "Karak Tea", catId: "hot_drinks", url: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=400&q=80" },
    { labelAr: "قهوة عربي", labelEn: "Arabic Coffee", catId: "hot_drinks", url: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=400&q=80" },
    { labelAr: "كابتشينو", labelEn: "Cappuccino", catId: "hot_drinks", url: "https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=400&q=80" },
    { labelAr: "جمبري مقلي", labelEn: "Crispy Shrimp", catId: "sandwiches", url: "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=400&q=80" }
];

/* Default Inventory Tracking */
const DEFAULT_INVENTORY = [
    { id: "inv_1", nameAr: "لحم برجر حاشي", nameEn: "Hashi Burger Patties", unitAr: "قطعة", unitEn: "pcs", opening: 120, incoming: 50, sold: 42, damaged: 2, remaining: 126, cost: 6.50 },
    { id: "inv_2", nameAr: "لحم برجر بقري", nameEn: "Beef Burger Patties", unitAr: "قطعة", unitEn: "pcs", opening: 150, incoming: 60, sold: 58, damaged: 1, remaining: 151, cost: 5.00 },
    { id: "inv_3", nameAr: "شرائح صدور دجاج", nameEn: "Chicken Breast Strips", unitAr: "كجم", unitEn: "kg", opening: 45, incoming: 25, sold: 28, damaged: 0, remaining: 42, cost: 18.00 },
    { id: "inv_4", nameAr: "أسياخ كباب لحم", nameEn: "Meat Kebab Skewers", unitAr: "قطعة", unitEn: "pcs", opening: 200, incoming: 80, sold: 95, damaged: 3, remaining: 182, cost: 4.20 },
    { id: "inv_5", nameAr: "خبز برجر بالسمسم", nameEn: "Sesame Burger Buns", unitAr: "كيس", unitEn: "bag", opening: 80, incoming: 40, sold: 55, damaged: 2, remaining: 63, cost: 3.00 },
    { id: "inv_6", nameAr: "بطاطس مقلية مفرزة", nameEn: "Frozen French Fries", unitAr: "كيس", unitEn: "bag", opening: 35, incoming: 20, sold: 22, damaged: 1, remaining: 32, cost: 14.50 },
    { id: "inv_7", nameAr: "مياه معدنية معبأة", nameEn: "Bottled Mineral Water", unitAr: "كرتون", unitEn: "ctn", opening: 25, incoming: 15, sold: 18, damaged: 0, remaining: 22, cost: 16.00 },
    { id: "inv_8", nameAr: "مشروبات غازية بيبسي", nameEn: "Pepsi Soda Cans", unitAr: "صندوق", unitEn: "case", opening: 30, incoming: 20, sold: 25, damaged: 0, remaining: 25, cost: 55.00 }
];

/* Default Internal Orders */
const DEFAULT_INTERNAL_ORDERS = [
    { id: "INT-101", date: new Date().toISOString(), typeAr: "وجبة موظف", typeEn: "Staff Meal", requesterAr: "شيف أحمد", requesterEn: "Chef Ahmed", itemsCount: 3, total: 38.50, status: "approved" },
    { id: "INT-102", date: new Date(Date.now() - 3600000 * 4).toISOString(), typeAr: "فحص جودة الطهي", typeEn: "Quality Tasting", requesterAr: "مشرف الوردية", requesterEn: "Shift Supervisor", itemsCount: 2, total: 22.00, status: "completed" },
    { id: "INT-103", date: new Date(Date.now() - 3600000 * 24).toISOString(), typeAr: "ضيافة إدارة", typeEn: "Management Hospitality", requesterAr: "مدير المطعم", requesterEn: "Store Manager", itemsCount: 4, total: 54.00, status: "approved" }
];

/* Dictionary for Translations */
const i18n = {
    ar: {
        pos_nav: "نقطة البيع",
        total_due_label: "الإجمالي المطلوب:",
        tax_invoice_nav: "الفاتورة الضريبية",
        grid_8_col: "شبكة 8 أعمدة",
        split_pos: "عرض الكاشير المقسم",
        load_sample_order: "تحميل طلب ORD-1013",
        view_sample_invoice: "فاتورة ضريبية (الصورة 1)",
        review_order_btn: "مراجعة الطلب والسداد",
        search_placeholder: "بحث عن صنف أو كود...",
        receipt_modal_title: "فاتورة ضريبية مبسطة",

        kds_nav: "شاشة المطبخ",
        admin_nav: "لوحة الإدارة",
        login_nav: "الحساب",
        cart_nav: "الطلب",
        th_num: "#",
        th_total: "المجموع",
        th_price: "السعر",
        th_qty: "الكمية",
        th_item: "الصنف",
        additions: "الإضافات",
        subtotal: "المجموع الفرعي",
        tax_vat: "الضريبة",
        discount: "الخصم",
        total: "الإجمالي",
        pay_action: "دفع الحساب",
        btn_clear: "إلغاء",
        btn_cancel: "إلغاء الطلب",
        btn_cancel_action: "إلغاء",
        btn_discount: "الخصم",
        btn_notes: "الملاحظات",
        btn_more: "المزيد",
        btn_save: "حفظ الإعدادات",
        btn_close: "إغلاق",
        customer_lbl: "العميل:",
        order_type_lbl: "نوع الطلب:",
        dine_in: "محلي",
        takeaway: "سفري",
        delivery: "توصيل",
        table_num: "الطاولة:",
        cart_view: "عرض السلة والطلب",
        admin_overview: "نظرة عامة والمبيعات",
        admin_menu: "إدارة المنيو والأصناف",
        admin_cats: "الأقسام",
        admin_orders: "سجل الفواتير",
        admin_settings: "إعدادات المتجر والضريبة",
        kpi_today_sales: "مبيعات اليوم",
        kpi_total_orders: "إجمالي الطلبات",
        kpi_total_items: "الأصناف المتاحة",
        kpi_avg_ticket: "متوسط الفاتورة",
        recent_orders_title: "آخر الطلبات المسجلة",
        btn_add_item: "إضافة صنف جديد",
        btn_add_cat: "إضافة قسم جديد",
        paid_amount: "المبلغ المدفوع",
        all_cat: "الكل",
        z_report_btn: "تقرير إغلاق الوردية",
        kot_print: "بون المطبخ",
        reset_menu_btn: "إعادة تعيين القائمة الافتراضية",
        staff_mode_notice: "وضع الكاشير: تسجيل الطلبات، اختيار الطاولات، وإرسالها للمطبخ",
        export_excel_btn: "تصدير البيانات",

        // Bottom Nav
        nav_new: "جديد",
        nav_orders: "الطلبات",
        nav_tables: "الطاولات",
        nav_main: "الرئيسية",

        // Notes Modal
        notes_modal_title: "ملاحظات الطلب ورقم العميل",
        notes_label: "تعليمات وتجهيز الطلب",
        notes_placeholder: "اكتب أي تعليمات خاصة للشيف هنا...",
        phone_label: "رقم هاتف العميل",
        phone_placeholder: "0500000000...",
        btn_done: "تم الحفظ",

        // Discount Modal
        discount_modal_title: "تطبيق خصم على الفاتورة",
        opt_fixed_sar: "مبلغ ثابت",
        opt_percent: "نسبة مئوية (%)",
        lbl_discount_value: "قيمة الخصم المطلوبة",
        btn_apply_discount: "تطبيق الخصم",

        // More Panel
        more_panel_title: "إعدادات وتفضيلات الكاشير",
        lbl_language: "اللغة",
        lbl_orders_view: "طريقة عرض السلة",
        opt_briefly: "مختصر",
        opt_detailed: "مفصل",
        lbl_stay_category: "البقاء في القسم المختار بعد الإضافة",
        opt_exit: "الخروج (الكل)",
        opt_stay: "البقاء (نفس القسم)",
        lbl_sync_data: "مزامنة البيانات",
        lbl_sync_printers: "مزامنة الطابعات",
        lbl_shifts: "إدارة الورديات",
        lbl_printing_devices: "أجهزة الطباعة",
        lbl_logout: "تسجيل الخروج",
        btn_sync_now: "مزامنة الآن",
        btn_refresh: "تحديث",

        // PassCode Modal
        passcode_title: "رمز التحقق الأمني",
        passcode_subtitle: "أدخل مفتاح المستخدم أو الرمز السري للوصول للإعدادات المحمية",
        lbl_user_key: "رمز الدخول / المفتاح السري:",
        btn_verify: "تأكيد الدخول",

        // Printing Devices
        printers_title: "إدارة أجهزة الطباعة",
        printers_auto_print: "الطباعة التلقائية عند إتمام الطلب",
        btn_add_printer: "إضافة طابعة جديدة (+)",
        printer_role_cashier: "طابعة الكاشير والفواتير",
        printer_role_kitchen: "طابعة بون المطبخ",
        printer_role_reports: "طابعة التقارير والمحاسبة",
        btn_test_print: "اختبار الاتصال والطباعة",

        // Side Drawer & Modules
        drawer_title: "نظام إدارة المطعم",
        menu_reports: "التقارير",
        menu_payment_type_report: "تقرير طرق الدفع",
        menu_balancing_payments: "موازنة طرق الدفع",
        menu_apps_data_review: "مراجعة بيانات التطبيقات",
        menu_internal_orders: "الطلبات الداخلية",
        menu_inventory_auditing: "تدقيق الجرد",
        menu_daily_inventory: "المخزون اليومي",
        menu_daily_stock_calc: "حاسبة المخزون اليومي",

        // Sales Reports Submenu
        rep_invoices: "تقرير الفواتير",
        rep_items: "تقرير الأصناف",
        rep_shifts: "تقرير ورديات اليوم",
        rep_damaged: "تقرير الأصناف التالفة",
        rep_applications: "تقرير التطبيقات",
        rep_durations: "مدد الخدمة والإنجاز",
        rep_totals: "تقرير الإجماليات",
        rep_active_meals: "تقرير الوجبات النشطة",
        rep_meals: "تقرير مبيعات الوجبات",

        // Common Report UI
        from_date: "من تاريخ",
        to_date: "إلى تاريخ",
        btn_apply_filter: "تطبيق البحث",
        btn_print_report: "طباعة التقرير",
        btn_back: "رجوع",
        total_invoices_count: "عدد الفواتير:",
        sum_sales: "إجمالي المبيعات",
        sum_returns: "المرتجعات",
        sum_net: "الصافي",
        sum_total: "الإجمالي الكلي",

        // Balancing & Reconciliation
        th_category: "الفئة",
        th_payment_type: "طريقة الدفع",
        th_system_total: "المجموع في النظام",
        th_actual: "المبلغ الفعلي",
        th_diff: "الفارق (الفعلي - النظام)",
        th_last_balance: "آخر قيمة موازنة",
        btn_save_balancing: "حفظ الموازنة والاعتماد",

        // Application Review
        th_app: "التطبيق",
        th_total_returns: "إجمالي المرتجع",
        th_net_total: "صافي المبيعات",

        // Table Picker
        table_picker_title: "اختيار طاولة المحل",
        terrace_table: "جلسات خارجية",

        // Item Customizer
        customizer_title: "تخصيص إضافات الصنف",
        customizer_addons_help: "اختر الإضافات المطلوبة لهذا الصنف:",
        kitchen_notes_label: "ملاحظات وتوجيهات المطبخ:",
        save_changes: "حفظ التعديل",
        nav_main_screen: "شاشة البيع الرئيسية",
        nav_new_order: "طلب جديد",
        notes_title: "ملاحظات الطلب وبيانات العميل",
        more_settings_title: "الإعدادات والتفضيلات",
        view_order: "عرض الطلب",
        reports_nav: "التقارير",

        // Payment Modal
        pay_modal_title: "تأكيد السداد وإصدار الفاتورة",
        pay_method_cash: "نقدي",
        pay_method_card: "بطاقة مدى / شبكة",
        pay_method_online: "تطبيق / تحويل",
        btn_complete_order: "إتمام الطلب وطباعة الفاتورة",
        change_return: "المتبقي / الباقي للعميل",
        remaining_due: "المبلغ المتبقي على العميل",
        numpad_exact: "تماماً",

        // Login Modal
        login_modal_title: "تسجيل الدخول للنظام",
        login_modal_subtitle: "اختر نوع الحساب وأدخل الرمز (PIN)",
        login_role_staff: "كاشير",
        login_role_admin: "مدير",
        login_pin_lbl: "رمز المرور (PIN):",
        login_hint: "افتراضي: المدير (1234) | الكاشير (0000)",
        btn_login: "دخول",

        // Drawer
        drawer_brand_name: "نظام نقاط البيع والإدارة",
        drawer_sales_reports_title: "تقارير المبيعات والعمليات",
        drawer_rep_sales: "1. تقارير المبيعات",
        rep_sub_invoices: "تقارير الفواتير",
        rep_sub_items: "تقرير الأصناف",
        rep_sub_shifts: "تقارير الورديات اليومية",
        rep_sub_damaged: "تقرير التوالف والهالك",
        rep_sub_apps: "تقارير التطبيقات",
        rep_sub_durations: "أوقات إنجاز الخدمة",
        rep_sub_totals: "تقرير الإجماليات",
        rep_sub_active_meals: "الوجبات النشطة حالياً",
        rep_sub_meals_cat: "تقارير فئات الوجبات",

        // Admin Tables & Views
        th_order_id: "رقم الطلب",
        th_date_time: "الوقت والتاريخ",
        th_type: "النوع",
        th_cashier: "الكاشير",
        th_payment_method: "طريقة الدفع",
        th_actions: "الإجراءات",
        admin_menu_title: "قائمة الأصناف بالمنيو",
        btn_restore_images: "استعادة الصور الأصلية",
        th_image: "الصورة",
        th_name_ar: "الاسم بالعربي",
        th_name_en: "الاسم بالإنجليزي",
        th_category_col: "القسم",
        th_status: "الحالة",
        admin_cats_title: "تصنيفات المنيو",
        th_icon: "الأيقونة",
        th_cat_ar: "اسم القسم (عربي)",
        th_cat_en: "اسم القسم (EN)",
        th_linked_items: "الأصناف المرتبطة",
        admin_orders_title: "سجل الفواتير والمبيعات الشامل",
        search_orders_placeholder: "بحث برقم الفاتورة أو العميل...",
        opt_all_status: "كل الحالات",
        opt_completed: "مكتمل",
        opt_new_prep: "جديد / تحضير",
        opt_cancelled: "ملغي",
        th_items_col: "الأصناف",
        th_customer_col: "العميل",

        // Settings Form Labels
        lbl_store_name_ar: "اسم المطعم (عربي):",
        lbl_store_name_en: "اسم المطعم (English):",
        lbl_company_name: "اسم الشركة / الفرع:",
        lbl_vat_number: "الرقم الضريبي (VAT Number):",
        lbl_tax_rate: "نسبة الضريبة (%):",
        lbl_currency: "العملة:",
        lbl_admin_pin: "رمز المدير PIN:",
        lbl_staff_pin: "رمز الكاشير PIN:",

        // Item Modal (Admin)
        item_modal_title_add: "إضافة صنف جديد",
        lbl_item_ar_name: "الاسم بالعربي",
        lbl_item_en_name: "الاسم بالإنجليزي (English)",
        lbl_item_category: "القسم / التصنيف",
        lbl_item_price: "السعر (ريال / SAR)",
        lbl_item_img_url: "رابط صورة الصنف (Image URL):",
        lbl_item_img_hint: "(أو اختر من المعرض أدناه)",
        item_preview_live: "معاينة مباشرة للصورة",
        item_preview_sub: "ستظهر هذه الصورة في شاشة الكاشير",
        lbl_item_code: "كود الصنف (#Code):",
        lbl_item_available: "متوفر للطلب حالياً",
        item_placeholder_name: "مثال: برجر لحم مشوي",
        item_placeholder_code: "مثال: 101",
        btn_save_item: "حفظ الصنف",

        // Category Modal (Admin)
        cat_modal_title_add: "إضافة قسم جديد",
        lbl_cat_ar_name: "اسم القسم بالعربي",
        lbl_cat_en_name: "اسم القسم بالإنجليزي (English)",
        cat_placeholder_name: "مثال: مشويات وحلويات",
        lbl_cat_icon: "أيقونة القسم (FontAwesome Icon):",
        cat_icon_burger: "🍔 برجر / وجبات",
        cat_icon_hotdog: "🌭 سندوتشات",
        cat_icon_cold: "🥤 مشروبات باردة",
        cat_icon_hot: "☕ مشروبات ساخنة",
        cat_icon_pizza: "🍕 بيتزا ومعجنات",
        cat_icon_seafood: "🐟 مأكولات بحرية",
        cat_icon_dessert: "🍨 آيسكريم وحلى",
        btn_save_cat: "حفظ القسم",

        // KDS
        kds_count_new_lbl: "طلبات جديدة",
        kds_count_prep_lbl: "قيد التجهيز",
        kds_count_ready_lbl: "جاهز",
        btn_refresh_kds: "تحديث",

        // Customizer / Quick Notes
        quick_no_onion: "بدون بصل",
        quick_no_pickles: "بدون مخلل",
        quick_extra_sauce: "زيادة صوص",
        quick_no_mayo: "بدون مايونيز",
        quick_no_garlic: "بدون ثوم",
        quick_takeaway: "سفري",

        // Z-Report
        z_cashier_lbl: "الكاشير المسؤول:",
        z_first_order_lbl: "تاريخ أول طلب:",
        z_last_order_lbl: "تاريخ آخر طلب:",
        z_total_issued_lbl: "إجمالي الفواتير الصادرة:",
        z_cancelled_lbl: "الطلبات الملغاة:",
        z_gross_sales_lbl: "المبيعات قبل الضريبة:",
        z_total_disc_lbl: "إجمالي الخصومات:",
        z_vat_lbl: "ضريبة القيمة المضافة (15%):",
        z_cashier_sig: "توقيع الكاشير: ____________________",
        z_supervisor_sig: "توقيع المشرف: ____________________",

        // Action titles / buttons
        add_customer_title: "إضافة عميل",
        add_order_type_title: "إضافة نوع طلب",
        btn_print_receipt: "طباعة الفاتورة",
        btn_download_pdf: "تحميل PDF",
        btn_save_settings: "حفظ الإعدادات",
        returns_nav: "الطلبات والإرجاع",
        nav_returns_screen: "الطلبات والإرجاع",
        table_1: "طاولة 1",
        table_2: "طاولة 2",
        table_3: "طاولة 3",
        table_4: "طاولة 4",
        table_5: "طاولة 5",
        table_6: "طاولة 6",
        btn_login_kiosk: "تسجيل الدخول",
        about_app: "عن التطبيق",
        demo_admin_pin: "المدير: 1234",
        demo_cashier_pin: "كاشير: 0000"
    },
    en: {
        pos_nav: "POS Terminal",
        total_due_label: "Total Due:",
        tax_invoice_nav: "Tax Invoice",
        grid_8_col: "8-Column Catalog",
        split_pos: "POS Split View",
        load_sample_order: "Load Order ORD-1013",
        view_sample_invoice: "Tax Invoice (Image 1)",
        review_order_btn: "Review Order & Pay",
        search_placeholder: "Search product or code...",
        receipt_modal_title: "Simplified Tax Invoice",

        kds_nav: "Kitchen Display",
        admin_nav: "Admin Dashboard",
        login_nav: "Account",
        cart_nav: "Order",
        th_num: "#",
        th_total: "Total",
        th_price: "Price",
        th_qty: "Qty",
        th_item: "Item",
        additions: "Additions",
        subtotal: "Subtotal",
        tax_vat: "VAT",
        discount: "Discount",
        total: "Total",
        pay_action: "Pay & Checkout",
        btn_clear: "Clear",
        btn_cancel: "Cancel Order",
        btn_cancel_action: "Cancel",
        btn_discount: "Discount",
        btn_notes: "Notes",
        btn_more: "More",
        btn_save: "Save Settings",
        btn_close: "Close",
        customer_lbl: "Customer:",
        order_type_lbl: "Order Type:",
        dine_in: "Dine-in",
        takeaway: "Takeaway",
        delivery: "Delivery",
        table_num: "Table:",
        cart_view: "View Cart & Order",
        admin_overview: "Overview & Sales",
        admin_menu: "Menu & Items",
        admin_cats: "Categories",
        admin_orders: "Order History",
        admin_settings: "Store & Tax Settings",
        kpi_today_sales: "Today's Sales",
        kpi_total_orders: "Total Orders",
        kpi_total_items: "Available Items",
        kpi_avg_ticket: "Average Ticket",
        recent_orders_title: "Recent Completed Orders",
        btn_add_item: "Add New Product",
        btn_add_cat: "Add New Category",
        paid_amount: "Paid Amount",
        all_cat: "All Items",
        z_report_btn: "Shift Z-Report",
        kot_print: "Kitchen Ticket",
        reset_menu_btn: "Reset Menu to Defaults",
        staff_mode_notice: "Cashier Mode: Order Taking, Tables & Kitchen Dispatch",
        export_excel_btn: "Export Data",

        // Bottom Nav
        nav_new: "New",
        nav_orders: "Orders",
        nav_tables: "Tables",
        nav_main: "Main Screen",

        // Notes Modal
        notes_modal_title: "Order Notes & Client Phone",
        notes_label: "Special Preparation Instructions",
        notes_placeholder: "Type special customer or chef instructions here...",
        phone_label: "Client Phone Number",
        phone_placeholder: "05xxxxxxxx...",
        btn_done: "Done",

        // Discount Modal
        discount_modal_title: "Apply Order Discount",
        opt_fixed_sar: "Fixed Amount",
        opt_percent: "Percentage (%)",
        lbl_discount_value: "Discount Value",
        btn_apply_discount: "Apply Discount",

        // More Panel
        more_panel_title: "Settings & Preferences",
        lbl_language: "Language",
        lbl_orders_view: "Cart Orders View",
        opt_briefly: "Briefly",
        opt_detailed: "Detailed",
        lbl_stay_category: "Stay at selected category after adding",
        opt_exit: "Exit (All)",
        opt_stay: "Stay (Selected)",
        lbl_sync_data: "Sync Data",
        lbl_sync_printers: "Sync Printers",
        lbl_shifts: "Shift Management",
        lbl_printing_devices: "Printing Devices",
        lbl_logout: "Log Out",
        btn_sync_now: "Sync Now",
        btn_refresh: "Refresh",

        // PassCode Modal
        passcode_title: "Security PassCode",
        passcode_subtitle: "Enter user key or admin PIN to access protected modules",
        lbl_user_key: "User Key / Security PIN:",
        btn_verify: "Verify PassCode",

        // Printing Devices
        printers_title: "Printing Devices Management",
        printers_auto_print: "Automatic Printing upon order completion",
        btn_add_printer: "Add New Printer (+)",
        printer_role_cashier: "Cashier Receipt Printer",
        printer_role_kitchen: "Kitchen Ticket Printer",
        printer_role_reports: "Accounting & Reports Printer",
        btn_test_print: "Test Connection & Print",

        // Side Drawer & Modules
        drawer_title: "Restaurant Management ERP",
        menu_reports: "Reports",
        menu_payment_type_report: "Payment Type Report",
        menu_balancing_payments: "Balancing Payment Methods",
        menu_apps_data_review: "Applications Data Review",
        menu_internal_orders: "Internal Orders",
        menu_inventory_auditing: "Inventory Auditing",
        menu_daily_inventory: "Daily Inventory",
        menu_daily_stock_calc: "Daily Stock Calculator",

        // Sales Reports Submenu
        rep_invoices: "Invoice Reports",
        rep_items: "Items Report",
        rep_shifts: "Daily Shift Reports",
        rep_damaged: "Damaged Items Report",
        rep_applications: "Application Reports",
        rep_durations: "Service Durations",
        rep_totals: "Totals Report",
        rep_active_meals: "Active Meals Reports",
        rep_meals: "Meals Reports",

        // Common Report UI
        from_date: "From Date",
        to_date: "To Date",
        btn_apply_filter: "Apply Filter",
        btn_print_report: "Print Report",
        btn_back: "Back",
        total_invoices_count: "Total Invoices:",
        sum_sales: "Total Sales",
        sum_returns: "Returns",
        sum_net: "Net Sales",
        sum_total: "Grand Total",

        // Balancing & Reconciliation
        th_category: "Category",
        th_payment_type: "Payment Type",
        th_system_total: "System Total",
        th_actual: "Actual Amount",
        th_diff: "Difference (Actual - System)",
        th_last_balance: "Last Balancing Value",
        btn_save_balancing: "Save & Commit Balancing",

        // Application Review
        th_app: "Application",
        th_total_returns: "Total Returns",
        th_net_total: "Net Sales",

        // Table Picker
        table_picker_title: "Select Dine-in Table",
        terrace_table: "Outdoor Terrace",

        // Item Customizer
        customizer_title: "Customize Item Options",
        customizer_addons_help: "Select required modifiers for this item:",
        kitchen_notes_label: "Kitchen Preparation Notes:",
        save_changes: "Save Changes",
        nav_main_screen: "Main POS Screen",
        nav_new_order: "New Order",
        notes_title: "Order Notes & Customer Info",
        more_settings_title: "Settings & Preferences",
        view_order: "View Order",
        reports_nav: "Reports",

        // Payment Modal
        pay_modal_title: "Confirm Payment & Issue Invoice",
        pay_method_cash: "Cash",
        pay_method_card: "Card / Mada",
        pay_method_online: "Online / Transfer",
        btn_complete_order: "Complete Order & Issue Invoice",
        change_return: "Change Return",
        remaining_due: "Remaining Due",
        numpad_exact: "EXACT",

        // Login Modal
        login_modal_title: "System Login",
        login_modal_subtitle: "Select role and enter security PIN",
        login_role_staff: "Cashier",
        login_role_admin: "Admin",
        login_pin_lbl: "Security PIN:",
        login_hint: "Default: Admin (1234) | Cashier (0000)",
        btn_login: "Sign In",

        // Drawer
        drawer_brand_name: "POS & Management System",
        drawer_sales_reports_title: "Sales & Operations Reports",
        drawer_rep_sales: "1. Sales Reports",
        rep_sub_invoices: "Invoice Reports",
        rep_sub_items: "Items Report",
        rep_sub_shifts: "Daily Shift Reports",
        rep_sub_damaged: "Damaged Items Report",
        rep_sub_apps: "Application Reports",
        rep_sub_durations: "Service Durations",
        rep_sub_totals: "Totals Report",
        rep_sub_active_meals: "Active Meals",
        rep_sub_meals_cat: "Meal Category Reports",

        // Admin Tables & Views
        th_order_id: "Order ID",
        th_date_time: "Date & Time",
        th_type: "Type",
        th_cashier: "Cashier",
        th_payment_method: "Payment Method",
        th_actions: "Actions",
        admin_menu_title: "Menu Items Catalog",
        btn_restore_images: "Restore Original Images",
        th_image: "Image",
        th_name_ar: "Name (Arabic)",
        th_name_en: "Name (English)",
        th_category_col: "Category",
        th_status: "Status",
        admin_cats_title: "Menu Categories",
        th_icon: "Icon",
        th_cat_ar: "Category (Arabic)",
        th_cat_en: "Category (English)",
        th_linked_items: "Linked Items",
        admin_orders_title: "All Orders & Invoices History",
        search_orders_placeholder: "Search invoice # or customer...",
        opt_all_status: "All Statuses",
        opt_completed: "Completed",
        opt_new_prep: "New / Preparing",
        opt_cancelled: "Cancelled",
        th_items_col: "Items",
        th_customer_col: "Customer",

        // Settings Form Labels
        lbl_store_name_ar: "Store Name (Arabic):",
        lbl_store_name_en: "Store Name (English):",
        lbl_company_name: "Company / Branch Name:",
        lbl_vat_number: "VAT Number:",
        lbl_tax_rate: "Tax Rate (%):",
        lbl_currency: "Currency:",
        lbl_admin_pin: "Admin PIN:",
        lbl_staff_pin: "Cashier PIN:",

        // Item Modal (Admin)
        item_modal_title_add: "Add New Product",
        lbl_item_ar_name: "Name in Arabic",
        lbl_item_en_name: "Name in English",
        lbl_item_category: "Category",
        lbl_item_price: "Price (SAR)",
        lbl_item_img_url: "Product Image URL:",
        lbl_item_img_hint: "(Or choose from gallery below)",
        item_preview_live: "Live Image Preview",
        item_preview_sub: "This image will appear on the cashier POS screen",
        lbl_item_code: "Item Code (#Code):",
        lbl_item_available: "Available for ordering",
        item_placeholder_name: "e.g. Grilled Beef Burger",
        item_placeholder_code: "e.g. 101",
        btn_save_item: "Save Product",

        // Category Modal (Admin)
        cat_modal_title_add: "Add New Category",
        lbl_cat_ar_name: "Category Name (Arabic)",
        lbl_cat_en_name: "Category Name (English)",
        cat_placeholder_name: "e.g. Grills & Desserts",
        lbl_cat_icon: "Category Icon:",
        cat_icon_burger: "🍔 Burger / Meals",
        cat_icon_hotdog: "🌭 Sandwiches",
        cat_icon_cold: "🥤 Cold Drinks",
        cat_icon_hot: "☕ Hot Drinks",
        cat_icon_pizza: "🍕 Pizza & Pastries",
        cat_icon_seafood: "🐟 Seafood",
        cat_icon_dessert: "🍨 Ice Cream & Desserts",
        btn_save_cat: "Save Category",

        // KDS
        kds_count_new_lbl: "New Orders",
        kds_count_prep_lbl: "Preparing",
        kds_count_ready_lbl: "Ready",
        btn_refresh_kds: "Refresh",

        // Customizer / Quick Notes
        quick_no_onion: "No Onion",
        quick_no_pickles: "No Pickles",
        quick_extra_sauce: "Extra Sauce",
        quick_no_mayo: "No Mayo",
        quick_no_garlic: "No Garlic",
        quick_takeaway: "Takeaway",

        // Z-Report
        z_cashier_lbl: "Cashier in Charge:",
        z_first_order_lbl: "First Order Time:",
        z_last_order_lbl: "Last Order Time:",
        z_total_issued_lbl: "Total Invoices Issued:",
        z_cancelled_lbl: "Cancelled Orders:",
        z_gross_sales_lbl: "Gross Sales (Pre-Tax):",
        z_total_disc_lbl: "Total Discounts:",
        z_vat_lbl: "VAT (15%):",
        z_cashier_sig: "Cashier Signature: ____________________",
        z_supervisor_sig: "Supervisor Signature: ____________________",

        // Action titles / buttons
        add_customer_title: "Add Customer",
        add_order_type_title: "Add Order Type",
        btn_print_receipt: "Print Receipt",
        btn_download_pdf: "Download PDF",
        btn_save_settings: "Save Settings",
        returns_nav: "Orders",
        nav_returns_screen: "Orders History",
        table_1: "Table 1",
        table_2: "Table 2",
        table_3: "Table 3",
        table_4: "Table 4",
        table_5: "Table 5",
        table_6: "Table 6",
        btn_login_kiosk: "Log In",
        about_app: "About App",
        demo_admin_pin: "Manager: 1234",
        demo_cashier_pin: "Cashier: 0000"
    }
};

/* Language / Localization Display Helpers */
function formatPaymentMethod(method, lang = (typeof currentLang !== 'undefined' ? currentLang : 'ar')) {
    if (!method) return lang === 'ar' ? 'نقدي' : 'Cash';
    const m = String(method).toLowerCase();
    if (m.includes('cash') || m.includes('نقدي')) {
        return lang === 'ar' ? 'نقدي' : 'Cash';
    }
    if (m.includes('mada') || m.includes('مدى') || m.includes('card') || m.includes('بطاق') || m.includes('شبكة')) {
        return lang === 'ar' ? 'بطاقة مدى' : 'Card / Mada';
    }
    if (m.includes('online') || m.includes('transfer') || m.includes('تطبيق') || m.includes('تحويل')) {
        return lang === 'ar' ? 'تطبيق / تحويل' : 'Online / Transfer';
    }
    return method;
}

function formatOrderType(type, lang = (typeof currentLang !== 'undefined' ? currentLang : 'ar')) {
    if (!type) return lang === 'ar' ? 'محلي' : 'Dine-in';
    const t = String(type).toLowerCase();
    if (t.includes('local') || t.includes('dine') || t.includes('محلي')) {
        return lang === 'ar' ? 'محلي' : 'Dine-in';
    }
    if (t.includes('takeaway') || t.includes('receive') || t.includes('سفري') || t.includes('استلام')) {
        return lang === 'ar' ? 'سفري' : 'Takeaway';
    }
    if (t.includes('delivery') || t.includes('توصيل')) {
        return lang === 'ar' ? 'توصيل' : 'Delivery';
    }
    return type;
}
const SAMPLE_ORD_1013 = {
    id: "ORD-1013",
    seq: 1013,
    date: "2026-09-07T16:13:05",
    dateFormatted: "9/7/2026, 4:13:05 PM",
    type: "dine_in",
    orderType: "DINE-IN (Table 1)",
    orderTypeId: "local",
    table: "Table 1",
    cashier: "Nawaf Saeed",
    customer: "Walk-in Customer",
    paymentMethod: "cash",
    paidAmount: 206.43,
    change: 0.00,
    subtotal: 179.50,
    tax: 26.93,
    discount: 0.00,
    total: 206.43,
    items: [
        { id: "item_meat_burger", name: "Meat Burger", enName: "Meat Burger", arName: "برجر لحم", price: 13.50, qty: 5, total: 67.50 },
        { id: "item_chicken_strips_meal", name: "Chicken Strips Meal", enName: "Chicken Strips Meal", arName: "وجبة دجاج استربس", price: 18.50, qty: 1, total: 18.50 },
        { id: "item_tandoori", name: "Tandoori", enName: "Tandoori", arName: "تندوري", price: 10.50, qty: 1, total: 10.50 },
        { id: "item_fish_sandwich", name: "Fish sandwich", enName: "Fish sandwich", arName: "سمك", price: 9.50, qty: 1, total: 9.50 },
        { id: "item_shish_tawooq", name: "Shish Tawooq", enName: "Shish Tawooq", arName: "شيش طاووق", price: 9.50, qty: 5, total: 47.50 },
        { id: "item_chicken_strips_burger", name: "Chicken Strips Burger", enName: "Chicken Strips Burger", arName: "برجر دجاج استربس", price: 12.50, qty: 1, total: 12.50 },
        { id: "item_mineral_water", name: "Mineral Water", enName: "Mineral Water", arName: "مياه معدنية", price: 1.50, qty: 1, total: 1.50 },
        { id: "item_large_fries", name: "Large Fries", enName: "Large Fries", arName: "بطاطس كبير", price: 6.00, qty: 2, total: 12.00 }
    ]
};
