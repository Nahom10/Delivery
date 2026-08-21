/**
 * AllFreshMart i18n — full English / Amharic translation-key system.
 * Import { t, useLanguage, detectLanguage } from './i18n.js';
 */

const translations = {
  en: {
    // Header
    welcome: 'WELCOME',
    appName: 'AllFreshMart',
    language: 'አማ',
    whatWouldYouBuy: 'What would you buy today?',
    morningGreeting: 'Morning, {name}',
    categories: 'Categories',
    seeAll: 'See all',
    freshProducts: 'Fresh Products',

    // Product Details & Reviews
    productDetails: 'Product Details',
    description: 'Description',
    readMore: 'Read more…',
    readLess: 'Show less',
    recommendation: 'Recommendation',
    addToCart: 'Add to Cart',
    reviews: '{rating} ({count} reviews)',
    priceTotal: 'Price Total',
    freeDeliveryTag: 'You Have Free Delivery',

    // Cart & Coupons
    myCart: 'My Cart',
    basket: 'Your basket',
    freshPicks: 'Fresh picks',
    viewBasket: 'View basket',
    basketEmpty: 'Your basket is waiting',
    basketEmptyHint: 'Add something fresh to get started.',
    pickupTotal: 'Pickup total',
    continueCheckout: 'Continue to checkout',
    checkoutNow: 'Checkout Now',
    itemCount: '{count} item',
    itemCountPlural: '{count} items',
    couponBanner: 'You Have {count} Coupons',
    applyCoupon: 'Apply',
    couponApplied: 'Coupon Applied: {discount}% OFF',
    couponCodePlaceholder: 'Enter promo code (e.g. FRESH30)',
    subtotal: 'Subtotal',
    deliveryFeeLabel: 'Delivery',
    total: 'Total',
    discountSaved: 'Discount',

    // Navigation & Tabs
    navHome: 'Home',
    navOffers: 'Offers',
    navCart: 'Cart',
    navOrders: 'Orders',
    navProfile: 'Account',

    // Tracking & Timeline
    orderTracking: 'Order Tracking',
    driverLabel: 'Courier Driver',
    orderPlaced: 'Order Placed',
    pickUpWarehouse: 'Pick Up (Warehouse / Store)',
    shippedCourier: 'Shipped by Courier',
    orderDeliveredStatus: 'Order Delivered',
    orderCollected: 'Order Collected',
    contactSupport: 'Call Rider / Support',

    // Search
    search: 'Search vegetables, fruits, and more',
    filterAll: 'All',

    // Banners / Promotions
    freshRightNow: 'FRESH RIGHT NOW',
    shopOffer: 'Shop offer',
    onlyForALittleWhile: 'ONLY FOR A LITTLE WHILE',
    todaysDeals: "Today's Deals",
    swipe: 'Swipe →',

    // Catalog
    all: 'All',
    freshInStore: 'Fresh in store',
    searchResults: 'Search results',
    items: '{count} items',
    noMatch: 'No fresh match yet',
    noMatchHint: 'Try another search or category.',

    // Product
    add: 'Add',

    // Checkout
    checkoutTitle: 'CHECKOUT · DELIVERY DETAILS',
    howDeliver: 'How should we get it to you?',
    pickup: 'Pickup',
    delivery: 'Delivery',
    free: 'Free',
    liveFee: 'Live fee',
    collectAt: 'Collect at AllFreshMart',
    pickupFreeNotify: "Pickup is free. We'll notify you when it's ready.",

    // Payment
    paymentMethod: 'PAYMENT METHOD',
    cash: 'Cash',
    telebirr: 'Telebirr',
    payCash: 'Pay cash',
    onDelivery: 'on delivery',
    atPickup: 'at pickup',
    cashDesc: 'Pay when you receive your order.',
    payTelebirr: 'Pay with Telebirr',
    telebirrDesc: 'Secure mobile payment via Telebirr.',
    securePayment: 'Secure payment',

    // Telebirr flow
    openPayment: 'Open Telebirr payment',
    sandboxPayment: 'Complete sandbox payment',
    paymentPending: 'Payment is pending',
    paymentPaid: 'Payment confirmed ✓',
    paymentFailed: 'Payment failed',
    checkingPayment: 'Checking payment status…',
    waitingPayment: 'WAITING FOR PAYMENT',
    waitingPaymentDesc: 'Complete your Telebirr payment, then return here.',
    retryPayment: 'Check payment status',

    // Address
    placeYourPin: '1. Place your pin',
    pinDescription: 'We calculate the delivery fee from this exact point.',
    useMyLocation: '⌖ Use my location',
    finding: 'Finding…',
    savedAddresses: 'SAVED ADDRESSES',
    helpRider: '2. HELP THE RIDER FIND YOU',
    addressLabel: 'Address label',
    houseNumber: 'House number',
    blockCluster: 'Block / cluster',
    floorUnit: 'Floor / unit',
    streetArea: 'Street / area',
    areaNbh: 'Area / neighbourhood',
    landmark: 'Landmark',
    landmarkPlaceholder: 'Nearest well-known place',
    deliveryNotes: 'Delivery notes',
    deliveryNotesPlaceholder: 'Call on arrival, gate code, etc.',

    // Delivery quote
    calculatingFee: 'Calculating delivery fee',
    checkingRoute: 'Checking route and service area…',
    freeDelivery: 'Free delivery',
    deliveryFee: '{amount} delivery',
    drivingRoute: 'Driving route',
    estimatedRoute: 'Estimated route',
    deliveryUnavailable: 'Delivery unavailable',

    // Order totals
    totalIncDelivery: 'Total including delivery',
    totalAtStore: 'Total due at store',
    placeOrder: 'Place order',
    placingOrder: 'Placing your order…',
    placeOrderAmount: 'Place order — {amount}',
    phoneNote: 'Need to share your phone number? Tap "Share phone number" in the AllFreshMart bot chat before checkout.',

    // Confirmation
    orderReceived: 'ORDER RECEIVED',
    weveGotIt: "We've got it!",
    orderIs: 'Order {id} is {status}.',
    payAmount: 'Pay {amount} in cash {method}.',
    riderOnWay: 'Your rider is on the way',
    nextShopPrep: 'Next: shop preparation',
    nextShopConfirm: 'Next: shop confirmation',
    statusUpdates: "We'll send status updates from the AllFreshMart bot.",
    backToMarket: 'Back to the market',

    // Order History
    orderHistory: 'Order history',
    myOrders: 'MY ORDERS',
    noOrders: 'No orders yet',
    noOrdersHint: 'Your orders will appear here after checkout.',
    viewDetails: 'View details',

    // Loading / Error
    loading: "Gathering today's fresh picks…",
    errorTitle: "Couldn't open the market",
    tryAgain: 'Try again',

    // Operations — Staff
    shopStaff: 'SHOP STAFF',
    orderBoard: 'Order board',
    refresh: 'Refresh',
    assignRider: 'Assign a rider',
    rider: 'Rider',
    mark: 'Mark {status}',
    noOrdersYet: 'No orders yet.',
    deliveryLabel: '🛵 Delivery',
    pickupLabel: '🏪 Pickup',

    // Operations — Rider
    deliveryRider: 'DELIVERY RIDER',
    myDeliveries: 'My deliveries',
    shareLocation: 'Share location',
    sharing: 'Sharing…',
    startDelivery: 'Start delivery',
    captureProof: 'Capture delivery proof',
    noAssigned: 'No assigned deliveries.',
    deliveryProof: 'Delivery proof',
    customerName: 'Customer confirmation name',
    customerNamePlaceholder: 'Customer name',
    photoProof: 'Photo proof (optional)',
    confirmDelivery: 'Confirm delivery',
    landmarkPrefix: 'Landmark: ',
    imageTooLarge: 'Select an image smaller than 3 MB.',
    proofPreview: 'Delivery proof preview',
    openingOperations: 'Opening operations…',
    operationsAccessError: 'Operations access requires a real staff/rider Telegram account in production. Local preview: add ?role=staff or ?role=rider.',

    // Statuses
    placed: 'Placed',
    confirmed: 'Confirmed',
    preparing: 'Preparing',
    ready_for_pickup: 'Ready For Pickup',
    out_for_delivery: 'Out For Delivery',
    delivered: 'Delivered',
    collected: 'Collected',
    completed: 'Completed',
    cancelled: 'Cancelled',
    refunded: 'Refunded',
  },

  am: {
    // Header
    welcome: 'እንኳን ደህና መጡ',
    appName: 'AllFreshMart',
    language: 'EN',
    whatWouldYouBuy: 'ዛሬ ምን መግዛት ይፈልጋሉ?',
    morningGreeting: 'እንደምን አደሩ፣ {name}',
    categories: 'ምድቦች',
    seeAll: 'ሁሉንም ይመልከቱ',
    freshProducts: 'ትኩስ ምርቶች',

    // Product Details & Reviews
    productDetails: 'የምርት ዝርዝር',
    description: 'መግለጫ',
    readMore: 'ተጨማሪ ያንብቡ…',
    readLess: 'ያሳንሱ',
    recommendation: 'የሚመከሩ ምርቶች',
    addToCart: 'ወደ ቅርጫት ጨምር',
    reviews: '{rating} ({count} አስተያየቶች)',
    priceTotal: 'ጠቅላላ ዋጋ',
    freeDeliveryTag: 'ነፃ ማድረሻ አለዎት',

    // Cart & Coupons
    myCart: 'የእኔ ቅርጫት',
    basket: 'የእርስዎ ቅርጫት',
    freshPicks: 'ትኩስ ምርቶች',
    viewBasket: 'ቅርጫት ይመልከቱ',
    basketEmpty: 'ቅርጫትዎ ባዶ ነው',
    basketEmptyHint: 'ለመጀመር ትኩስ ምርት ይጨምሩ።',
    pickupTotal: 'ጠቅላላ',
    continueCheckout: 'ወደ ክፍያ ይቀጥሉ',
    checkoutNow: 'አሁን ይክፈሉ',
    itemCount: '{count} ምርት',
    itemCountPlural: '{count} ምርቶች',
    couponBanner: '{count} የቅናሽ ኩፖኖች አሉዎት',
    applyCoupon: 'ተግብር',
    couponApplied: 'ኩፖን ተተግብሯል: {discount}% ቅናሽ',
    couponCodePlaceholder: 'የቅናሽ ኮድ ያስገቡ (ለምሳሌ FRESH30)',
    subtotal: 'ድምር',
    deliveryFeeLabel: 'ማድረሻ',
    total: 'ጠቅላላ',
    discountSaved: 'ቅናሽ',

    // Navigation & Tabs
    navHome: 'መነሻ',
    navOffers: 'ቅናሾች',
    navCart: 'ቅርጫት',
    navOrders: 'ትዕዛዞች',
    navProfile: 'መለያ',

    // Tracking & Timeline
    orderTracking: 'ትዕዛዝ መከታተያ',
    driverLabel: 'አድራሽ ሾፌር',
    orderPlaced: 'ትዕዛዝ ገብቷል',
    pickUpWarehouse: 'ከመጋዘን ተነስቷል',
    shippedCourier: 'በሾፌሩ እየተጓጓዘ ነው',
    orderDeliveredStatus: 'ትዕዛዙ ደርሷል',
    orderCollected: 'ትዕዛዙ ተወስዷል',
    contactSupport: 'ሾፌሩን ይደውሉ',

    // Search
    search: 'አትክልቶችን፣ ፍራፍሬዎችን እና ሌሎችን ይፈልጉ',
    filterAll: 'ሁሉም',

    // Checkout
    checkoutTitle: 'ክፍያ · የማድረሻ ዝርዝሮች',
    howDeliver: 'እንዴት ልናደርስዎት?',
    pickup: 'በመደብር ይውሰዱ',
    delivery: 'ዴሊቨሪ',
    free: 'ነፃ',
    liveFee: 'የአሁኑ ዋጋ',
    collectAt: 'ከ AllFreshMart ይውሰዱ',
    pickupFreeNotify: 'በመደብር መውሰድ ነፃ ነው። ዝግጁ ሲሆን እናሳውቅዎታለን።',

    // Payment
    paymentMethod: 'የክፍያ ዘዴ',
    cash: 'ጥሬ ገንዘብ',
    telebirr: 'ቴሌብር',
    payCash: 'በጥሬ ገንዘብ ይክፈሉ',
    onDelivery: 'በአድራሻ ሲደርስ',
    atPickup: 'ሲወስዱ',
    cashDesc: 'ትዕዛዝዎን ሲቀበሉ ይክፈሉ።',
    payTelebirr: 'በቴሌብር ይክፈሉ',
    telebirrDesc: 'ደህንነቱ የተጠበቀ የሞባይል ክፍያ በቴሌብር።',
    securePayment: 'ደህንነቱ የተጠበቀ ክፍያ',

    // Telebirr flow
    openPayment: 'የቴሌብር ክፍያን ይክፈቱ',
    sandboxPayment: 'የሙከራ ክፍያን ያጠናቅቁ',
    paymentPending: 'ክፍያ በመጠባበቅ ላይ ነው',
    paymentPaid: 'ክፍያ ተረጋግጧል ✓',
    paymentFailed: 'ክፍያ አልተሳካም',
    checkingPayment: 'የክፍያ ሁኔታ እየተረጋገጠ ነው…',
    waitingPayment: 'ክፍያ በመጠባበቅ ላይ',
    waitingPaymentDesc: 'የቴሌብር ክፍያዎን ያጠናቅቁ፣ ከዚያ ወደዚህ ይመለሱ።',
    retryPayment: 'የክፍያ ሁኔታን ያረጋግጡ',

    // Address
    placeYourPin: '1. ፒንዎን ያስቀምጡ',
    pinDescription: 'ከዚህ ነጥብ ላይ የማድረሻ ክፍያውን እናሰላለን።',
    useMyLocation: '⌖ ቦታዬን ተጠቀም',
    finding: 'በመፈለግ ላይ…',
    savedAddresses: 'የተቀመጡ አድራሻዎች',
    helpRider: '2. ሸማቹን ለመርዳት',
    addressLabel: 'የአድራሻ መለያ',
    houseNumber: 'የቤት ቁጥር',
    blockCluster: 'ብሎክ / ክላስተር',
    floorUnit: 'ፎቅ / ክፍል',
    streetArea: 'ጎዳና / አካባቢ',
    areaNbh: 'አካባቢ / ሰፈር',
    landmark: 'ምልክት',
    landmarkPlaceholder: 'ቅርብ ታዋቂ ቦታ',
    deliveryNotes: 'የማድረሻ ማስታወሻ',
    deliveryNotesPlaceholder: 'ሲደርሱ ይደውሉ፣ የበር ኮድ፣ ወዘተ.',

    // Delivery quote
    calculatingFee: 'የማድረሻ ክፍያ በማስላት ላይ',
    checkingRoute: 'መስመር እና የአገልግሎት ቦታ በመመርመር ላይ…',
    freeDelivery: 'ነፃ ማድረስ',
    deliveryFee: '{amount} ማድረስ',
    drivingRoute: 'የመንዳት ርቀት',
    estimatedRoute: 'የተገመተ ርቀት',
    deliveryUnavailable: 'ማድረስ አይቻልም',

    // Order totals
    totalIncDelivery: 'ማድረሻን ጨምሮ ጠቅላላ',
    totalAtStore: 'በመደብር የሚከፈል ጠቅላላ',
    placeOrder: 'ትዕዛዝ ያስገቡ',
    placingOrder: 'ትዕዛዝ በማስገባት ላይ…',
    placeOrderAmount: 'ትዕዛዝ ያስገቡ — {amount}',
    phoneNote: 'ስልክ ቁጥርዎን ማጋራት ይፈልጋሉ? ከመክፈልዎ በፊት በ AllFreshMart ቦት ውስጥ "ስልክ ቁጥር አጋራ" ይጫኑ።',

    // Confirmation
    orderReceived: 'ትዕዛዝ ተቀብለናል',
    weveGotIt: 'ተረድተናል!',
    orderIs: 'ትዕዛዝ {id} {status} ነው።',
    payAmount: 'በጥሬ ገንዘብ {amount} ይክፈሉ {method}።',
    riderOnWay: 'ሸማቹ መጥቷል',
    nextShopPrep: 'ቀጣይ: የመደብር ዝግጅት',
    nextShopConfirm: 'ቀጣይ: የመደብር ማረጋገጫ',
    statusUpdates: 'ከ AllFreshMart ቦት የሁኔታ ማሻሻያዎችን እንልካለን።',
    backToMarket: 'ወደ ገበያ ተመለስ',

    // Order History
    orderHistory: 'የትዕዛዝ ታሪክ',
    myOrders: 'ትዕዛዞቼ',
    noOrders: 'ገና ምንም ትዕዛዝ የለም',
    noOrdersHint: 'ትዕዛዞችዎ ከክፍያ በኋላ እዚህ ይታያሉ።',
    viewDetails: 'ዝርዝሮችን ይመልከቱ',

    // Loading / Error
    loading: 'የዛሬ ትኩስ ምርቶችን በማሰባሰብ ላይ…',
    errorTitle: 'ገበያውን መክፈት አልተቻለም',
    tryAgain: 'እንደገና ሞክር',

    // Operations — Staff
    shopStaff: 'የመደብር ሰራተኛ',
    orderBoard: 'የትዕዛዝ ሰሌዳ',
    refresh: 'አዲስ',
    assignRider: 'ሸማች ይመድቡ',
    rider: 'ሸማች',
    mark: '{status} ምልክት ያድርጉ',
    noOrdersYet: 'ገና ትዕዛዝ የለም።',
    deliveryLabel: '🛵 ማድረስ',
    pickupLabel: '🏪 ይውሰዱ',

    // Operations — Rider
    deliveryRider: 'ሸማች',
    myDeliveries: 'ማድረሻዎቼ',
    shareLocation: 'ቦታ አጋራ',
    sharing: 'በማጋራት ላይ…',
    startDelivery: 'ማድረስ ጀምር',
    captureProof: 'የማድረሻ ማስረጃ ያንሱ',
    noAssigned: 'ምንም የተመደበ ማድረሻ የለም።',
    deliveryProof: 'የማድረሻ ማስረጃ',
    customerName: 'የደንበኛ ማረጋገጫ ስም',
    customerNamePlaceholder: 'የደንበኛ ስም',
    photoProof: 'ፎቶ ማስረጃ (አማራጭ)',
    confirmDelivery: 'ማድረሻ ያረጋግጡ',
    landmarkPrefix: 'ምልክት: ',
    imageTooLarge: 'ከ3 ሜባ በታች ምስል ይምረጡ።',
    proofPreview: 'የማድረሻ ማስረጃ ቅድመ እይታ',
    openingOperations: 'ኦፕሬሽኖች በመክፈት ላይ…',
    operationsAccessError: 'የኦፕሬሽን መዳረሻ በምርት ውስጥ እውነተኛ የሰራተኛ/ሸማች ቴሌግራም መለያ ይፈልጋል። የአካባቢ ቅድመ እይታ: ?role=staff ወይም ?role=rider ይጨምሩ።',

    // Statuses
    placed: 'ገብቷል',
    confirmed: 'ተረጋግጧል',
    preparing: 'በመዘጋጀት ላይ',
    ready_for_pickup: 'ለመውሰድ ዝግጁ',
    out_for_delivery: 'ለማድረስ ወጥቷል',
    delivered: 'ደርሷል',
    collected: 'ተወስዷል',
    completed: 'ተጠናቅቋል',
    cancelled: 'ተሰርዟል',
    refunded: 'ተመላሽ ሆኗል',
  }
};

/**
 * Translate a key with optional interpolation.
 * t('en', 'items', { count: 5 }) → "5 items"
 */
export function t(lang, key, params = {}) {
  const value = translations[lang]?.[key] || translations.en[key] || key;
  if (!params || typeof value !== 'string') return value;
  return value.replace(/\{(\w+)\}/g, (_, name) => params[name] ?? `{${name}}`);
}

/**
 * Detect the best language from Telegram or browser.
 */
export function detectLanguage() {
  const app = typeof window !== 'undefined' && window.Telegram?.WebApp;
  const tgLang = app?.initDataUnsafe?.user?.language_code;
  if (tgLang === 'am' || tgLang === 'amh') return 'am';
  if (typeof navigator !== 'undefined') {
    const navLang = navigator.language?.toLowerCase();
    if (navLang?.startsWith('am')) return 'am';
  }
  return 'en';
}

/**
 * Format status string for display.
 */
export function localizedStatus(lang, status) {
  return translations[lang]?.[status] || translations.en[status] || status.replaceAll('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Get product name in the given language.
 */
export function localizedProductName(product, lang) {
  return lang === 'am' && product.nameAm ? product.nameAm : product.name;
}
