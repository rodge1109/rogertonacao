import React, { useState, createContext, useContext, useEffect } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, ChevronRight, Check, X, Search } from 'lucide-react';

// Cart Context
const CartContext = createContext();

const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};

// Google Sheets API URL - UPDATE THIS WITH YOUR WEB APP URL
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyQNLHXp9Fzi0_mVxYmV7M0xSA2bqteLxIDzA96nAsaIObDEAhwGN9oX1lOAoY72BaL/exec';

// Fallback Menu Data (used if Google Sheets fetch fails)
const fallbackMenuData = [
  { id: 1, name: 'Margherita Pizza', category: 'Pizza', sizes: [{ name: 'Small', price: 10.99 }, { name: 'Medium', price: 12.99 }, { name: 'Large', price: 15.99 }], image: 'assets/images/food/pepperoni.png', description: 'Classic tomato sauce, mozzarella, fresh basil', popular: true },
  { id: 2, name: 'Pepperoni Pizza', category: 'Pizza', sizes: [{ name: 'Small', price: 12.99 }, { name: 'Medium', price: 14.99 }, { name: 'Large', price: 17.99 }], image: 'assets/images/food/burgerpizza.png', description: 'Loaded with pepperoni and mozzarella', popular: true },
  { id: 3, name: 'BBQ Chicken Pizza', category: 'Pizza', sizes: [{ name: 'Small', price: 13.99 }, { name: 'Medium', price: 15.99 }, { name: 'Large', price: 18.99 }], image: 'assets/images/food/pepperoni.png', description: 'BBQ sauce, grilled chicken, red onions', popular: false },
  { id: 4, name: 'Veggie Supreme', category: 'Pizza', sizes: [{ name: 'Small', price: 11.99 }, { name: 'Medium', price: 13.99 }, { name: 'Large', price: 16.99 }], image: 'assets/images/food/pepperoni.png', description: 'Mushrooms, peppers, olives, onions', popular: false },

  { id: 5, name: 'Classic Burger', category: 'Burgers', price: 9.99, image: 'assets/images/food/pepperoni.png', description: 'Beef patty, lettuce, tomato, cheese', popular: true },
  { id: 6, name: 'Bacon Cheeseburger', category: 'Burgers', price: 11.99, image: 'assets/images/food/pepperoni.png', description: 'Double beef, bacon, cheddar cheese', popular: true },
  { id: 7, name: 'Veggie Burger', category: 'Burgers', price: 10.99, image: 'assets/images/food/pepperoni.png', description: 'Plant-based patty, avocado, sprouts', popular: false },
  { id: 8, name: 'Chicken Burger', category: 'Burgers', price: 10.49, image: 'assets/images/food/pepperoni.png', description: 'Grilled chicken breast, mayo, lettuce', popular: false },

  { id: 9, name: 'Spaghetti Carbonara', category: 'Pasta', price: 13.99, image: 'assets/images/food/pepperoni.png', description: 'Creamy sauce, bacon, parmesan', popular: true },
  { id: 10, name: 'Penne Arrabiata', category: 'Pasta', price: 12.49, image: 'assets/images/food/pepperoni.png', description: 'Spicy tomato sauce, garlic, herbs', popular: false },
  { id: 11, name: 'Fettuccine Alfredo', category: 'Pasta', price: 13.49, image: 'assets/images/food/pepperoni.png', description: 'Rich cream sauce, parmesan cheese', popular: true },
  { id: 12, name: 'Lasagna', category: 'Pasta', price: 14.99, image: 'assets/images/food/pepperoni.png', description: 'Layered pasta, beef, ricotta, mozzarella', popular: false },

  { id: 13, name: 'Caesar Salad', category: 'Salads', price: 8.99, image: 'assets/images/food/pepperoni.png', description: 'Romaine, croutons, parmesan, caesar dressing', popular: true },
  { id: 14, name: 'Greek Salad', category: 'Salads', price: 9.49, image: 'assets/images/food/pepperoni.png', description: 'Feta, olives, cucumber, tomatoes', popular: false },
  { id: 15, name: 'Caprese Salad', category: 'Salads', price: 10.99, image: 'assets/images/food/pepperoni.png', description: 'Fresh mozzarella, tomatoes, basil', popular: false },

  { id: 16, name: 'Coca Cola', category: 'Drinks', price: 2.99, image: 'assets/images/food/pepperoni.png', description: 'Classic cola, 500ml', popular: true },
  { id: 17, name: 'Fresh Lemonade', category: 'Drinks', price: 3.49, image: 'assets/images/food/pepperoni.png', description: 'Freshly squeezed lemon juice', popular: true },
  { id: 18, name: 'Iced Tea', category: 'Drinks', price: 2.99, image: 'assets/images/food/pepperoni.png', description: 'Peach iced tea', popular: false },

  { id: 19, name: 'Chocolate Cake', category: 'Desserts', price: 6.99, image: 'assets/images/food/pepperoni.png', description: 'Rich chocolate layer cake', popular: true },
  { id: 20, name: 'Tiramisu', category: 'Desserts', price: 7.49, image: 'assets/images/food/pepperoni.png', description: 'Italian coffee-flavored dessert', popular: true },
];

const categories = ['All', 'Pizza', 'Burgers', 'Pasta', 'Salads', 'Drinks', 'Desserts'];

// Main App Component
export default function RestaurantApp() {
  const [cartItems, setCartItems] = useState([]);
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCart, setShowCart] = useState(false);
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [pendingOrderNumber, setPendingOrderNumber] = useState(null);

  // Products state
  const [menuData, setMenuData] = useState(fallbackMenuData);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [productsError, setProductsError] = useState(null);

  // State for patient appointment lookup
  const [appointmentToken, setAppointmentToken] = useState(null);

  // Check URL parameters for payment status (after GCash redirect) or patient appointment
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const payment = urlParams.get('payment');
    const orderNumber = urlParams.get('order');
    const page = urlParams.get('page');
    const token = urlParams.get('token');

    if (payment && orderNumber) {
      setPaymentStatus(payment);
      setPendingOrderNumber(orderNumber);
      setCurrentPage(payment === 'success' ? 'confirmation' : 'payment-failed');
      // Clear cart if payment successful
      if (payment === 'success') {
        setCartItems([]);
        localStorage.removeItem('pendingOrder');
      }
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (page === 'my-appointment') {
      // Patient appointment lookup page
      if (token) {
        setAppointmentToken(token);
      }
      setCurrentPage('my-appointment');
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Fetch products from Google Sheets on mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoadingProducts(true);
        setProductsError(null);

        const response = await fetch(GOOGLE_SCRIPT_URL);
        const data = await response.json();

        if (data.success && data.products && data.products.length > 0) {
          setMenuData(data.products);
        } else {
          setMenuData(fallbackMenuData);
          setProductsError('Using offline menu data');
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        setMenuData(fallbackMenuData);
        setProductsError('Using offline menu data');
      } finally {
        setIsLoadingProducts(false);
      }
    };

    fetchProducts();
  }, []);

  // Initialize OneSignal Push Notifications
  useEffect(() => {
    if (typeof window !== 'undefined' && window.OneSignalDeferred) {
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async function (OneSignal) {
        await OneSignal.init({
          appId: "22fa0af9-4790-4b61-9f6d-573237f0585d", // Replace with your OneSignal App ID
          notifyButton: {
            enable: true,
            size: 'small',
            position: 'bottom-right',
            prenotify: true,
            showCredit: false,
            text: {
              'tip.state.unsubscribed': 'Get order updates',
              'tip.state.subscribed': 'You\'re subscribed!',
              'tip.state.blocked': 'Notifications blocked',
              'message.prenotify': 'Click to receive order updates',
              'message.action.subscribed': 'Thanks for subscribing!',
              'dialog.main.title': 'Manage Notifications',
              'dialog.main.button.subscribe': 'SUBSCRIBE',
              'dialog.main.button.unsubscribe': 'UNSUBSCRIBE',
            }
          },
          welcomeNotification: {
            title: "Welcome to Kuchefnero!",
            message: "You'll receive order updates here."
          }
        });
      });
    }
  }, []);

  // Clear cart function
  const clearCart = () => {
    setCartItems([]);
  };

  const addToCart = (item, selectedSize = null) => {
    console.log('addToCart called:', { item, selectedSize, hasSizes: !!item.sizes });

    // For items with sizes, we need size info
    if (item.sizes && !selectedSize) {
      console.log('Opening size modal for:', item.name);
      setSelectedProduct(item);
      setShowSizeModal(true);
      return;
    }

    // Create cart item with size info if applicable
    const cartItem = selectedSize
      ? { ...item, selectedSize: selectedSize.name, price: selectedSize.price, displayName: `${item.name} (${selectedSize.name})` }
      : item;

    // Find existing item by id AND size (if applicable)
    const existingItem = cartItems.find(i =>
      i.id === item.id && (!selectedSize || i.selectedSize === selectedSize.name)
    );

    if (existingItem) {
      setCartItems(cartItems.map(i =>
        (i.id === item.id && (!selectedSize || i.selectedSize === selectedSize.name))
          ? { ...i, quantity: i.quantity + 1 }
          : i
      ));
    } else {
      setCartItems([...cartItems, { ...cartItem, quantity: 1 }]);
    }

    // Close modal if it was open
    setShowSizeModal(false);
    setSelectedProduct(null);
  };

  const removeFromCart = (id, selectedSize = null) => {
    setCartItems(cartItems.filter(item =>
      !(item.id === id && (!selectedSize || item.selectedSize === selectedSize))
    ));
  };

  const updateQuantity = (id, newQuantity, selectedSize = null) => {
    if (newQuantity === 0) {
      removeFromCart(id, selectedSize);
    } else {
      setCartItems(cartItems.map(item =>
        (item.id === id && (!selectedSize || item.selectedSize === selectedSize))
          ? { ...item, quantity: newQuantity }
          : item
      ));
    }
  };

  const getTotalItems = () => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const contextValue = {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    getTotalItems,
    getTotalPrice
  };

  return (
    <CartContext.Provider value={contextValue}>
      <style>{`
        /* ====================================================
           APPLE DESIGN SYSTEM — DESIGN.md Implementation
           ==================================================== */

        /* === ANIMATIONS === */
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn  { animation: fadeIn  0.7s cubic-bezier(0.16,1,0.3,1) forwards; }
        .animate-fadeUp  { animation: fadeUp  0.55s cubic-bezier(0.16,1,0.3,1) forwards; }
        .animate-delay-1 { animation-delay: 0.1s; opacity: 0; }
        .animate-delay-2 { animation-delay: 0.22s; opacity: 0; }
        .animate-delay-3 { animation-delay: 0.34s; opacity: 0; }

        /* === SCROLLBAR HIDE === */
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }

        /* === APPLE BUTTON ACTIVE MICRO-INTERACTION === */
        .btn-apple:active { transform: scale(0.95); }
        .btn-apple { transition: transform 0.15s ease, background-color 0.2s ease; }

        /* === APPLE GLOBAL NAV === */
        .apple-nav {
          background-color: #000000;
          height: 44px;
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 100;
          display: flex;
          align-items: center;
        }
        .apple-nav-link {
          font-family: 'SF Pro Text', system-ui, -apple-system, sans-serif;
          font-size: 12px;
          font-weight: 400;
          letter-spacing: -0.12px;
          color: rgba(255,255,255,0.85);
          text-decoration: none;
          transition: color 0.2s ease;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0 10px;
          line-height: 44px;
        }
        .apple-nav-link:hover { color: #ffffff; }

        /* === TYPOGRAPHY TOKENS === */
        .t-hero {
          font-family: 'SF Pro Display', system-ui, -apple-system, sans-serif;
          font-size: clamp(36px, 6vw, 56px);
          font-weight: 600;
          line-height: 1.07;
          letter-spacing: -0.28px;
        }
        .t-display-lg {
          font-family: 'SF Pro Display', system-ui, -apple-system, sans-serif;
          font-size: clamp(28px, 4vw, 40px);
          font-weight: 600;
          line-height: 1.1;
          letter-spacing: 0;
        }
        .t-display-md {
          font-family: 'SF Pro Text', system-ui, -apple-system, sans-serif;
          font-size: 34px;
          font-weight: 600;
          line-height: 1.47;
          letter-spacing: -0.374px;
        }
        .t-lead {
          font-family: 'SF Pro Display', system-ui, -apple-system, sans-serif;
          font-size: clamp(19px, 2.5vw, 28px);
          font-weight: 400;
          line-height: 1.14;
          letter-spacing: 0.196px;
        }
        .t-tagline {
          font-family: 'SF Pro Display', system-ui, -apple-system, sans-serif;
          font-size: 21px;
          font-weight: 600;
          line-height: 1.19;
          letter-spacing: 0.231px;
        }
        .t-body {
          font-family: 'SF Pro Text', system-ui, -apple-system, sans-serif;
          font-size: 17px;
          font-weight: 400;
          line-height: 1.47;
          letter-spacing: -0.374px;
        }
        .t-body-strong {
          font-family: 'SF Pro Text', system-ui, -apple-system, sans-serif;
          font-size: 17px;
          font-weight: 600;
          line-height: 1.24;
          letter-spacing: -0.374px;
        }
        .t-caption {
          font-family: 'SF Pro Text', system-ui, -apple-system, sans-serif;
          font-size: 14px;
          font-weight: 400;
          line-height: 1.43;
          letter-spacing: -0.224px;
        }
        .t-caption-strong {
          font-family: 'SF Pro Text', system-ui, -apple-system, sans-serif;
          font-size: 14px;
          font-weight: 600;
          line-height: 1.29;
          letter-spacing: -0.224px;
        }
        .t-fine-print {
          font-family: 'SF Pro Text', system-ui, -apple-system, sans-serif;
          font-size: 12px;
          font-weight: 400;
          line-height: 1.0;
          letter-spacing: -0.12px;
        }
        .t-dense-link {
          font-family: 'SF Pro Text', system-ui, -apple-system, sans-serif;
          font-size: 17px;
          font-weight: 400;
          line-height: 2.41;
          letter-spacing: 0;
        }

        /* === APPLE PILL BUTTON (primary) === */
        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background-color: #0066cc;
          color: #ffffff;
          font-family: 'SF Pro Text', system-ui, -apple-system, sans-serif;
          font-size: 17px;
          font-weight: 400;
          letter-spacing: -0.374px;
          border-radius: 9999px;
          padding: 11px 22px;
          border: none;
          cursor: pointer;
          text-decoration: none;
          transition: background-color 0.2s ease, transform 0.15s ease;
        }
        .btn-primary:hover  { background-color: #0071e3; }
        .btn-primary:active  { transform: scale(0.95); }
        .btn-primary:focus-visible { outline: 2px solid #0071e3; outline-offset: 2px; }

        /* === APPLE GHOST PILL (secondary) === */
        .btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background-color: transparent;
          color: #0066cc;
          font-family: 'SF Pro Text', system-ui, -apple-system, sans-serif;
          font-size: 17px;
          font-weight: 400;
          letter-spacing: -0.374px;
          border-radius: 9999px;
          padding: 10px 21px;
          border: 1px solid #0066cc;
          cursor: pointer;
          text-decoration: none;
          transition: background-color 0.2s ease, transform 0.15s ease;
        }
        .btn-secondary:hover  { background-color: rgba(0,102,204,0.06); }
        .btn-secondary:active { transform: scale(0.95); }

        /* btn-secondary on dark tile */
        .btn-secondary-dark {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background-color: transparent;
          color: #2997ff;
          font-family: 'SF Pro Text', system-ui, -apple-system, sans-serif;
          font-size: 17px;
          font-weight: 400;
          letter-spacing: -0.374px;
          border-radius: 9999px;
          padding: 10px 21px;
          border: 1px solid #2997ff;
          cursor: pointer;
          text-decoration: none;
          transition: background-color 0.2s ease, transform 0.15s ease;
        }
        .btn-secondary-dark:hover { background-color: rgba(41,151,255,0.08); }
        .btn-secondary-dark:active { transform: scale(0.95); }

        /* === TILE SYSTEM === */
        /* Each tile is full-bleed, no rounding. Color change IS the divider. */
        .tile { width: 100%; }
        .tile-light    { background-color: #ffffff; color: #1d1d1f; }
        .tile-parchment{ background-color: #f5f5f7; color: #1d1d1f; }
        .tile-dark     { background-color: #272729; color: #ffffff; }
        .tile-dark-2   { background-color: #2a2a2c; color: #ffffff; }
        .tile-black    { background-color: #000000; color: #ffffff; }

        /* Inner padding for tile content */
        .tile-pad { padding: 80px 24px; }
        @media (max-width: 640px) { .tile-pad { padding: 64px 20px; } }

        /* Max-width content container */
        .tile-inner    { max-width: 980px;  margin: 0 auto; }
        .tile-inner-lg { max-width: 1200px; margin: 0 auto; }

        /* === PRODUCT/IMAGERY SHADOW (THE ONE SHADOW) === */
        .img-shadow { box-shadow: rgba(0,0,0,0.22) 3px 5px 30px 0; }

        /* === UTILITY CARD (store-utility-card pattern) === */
        .util-card {
          background-color: #ffffff;
          border: 1px solid #e0e0e0;
          border-radius: 18px;
          padding: 24px;
          transition: transform 0.2s ease;
        }
        .util-card:hover { transform: translateY(-3px); }

        /* === TEXT LINKS === */
        .link-blue      { color: #0066cc; text-decoration: none; }
        .link-blue:hover{ text-decoration: underline; }
        .link-blue-dark      { color: #2997ff; text-decoration: none; }
        .link-blue-dark:hover{ text-decoration: underline; }

        /* === FOOTER DENSE-LINK COLUMNS === */
        .footer-col a, .footer-col button {
          display: block;
          color: #333333;
          font-family: 'SF Pro Text', system-ui, -apple-system, sans-serif;
          font-size: 17px;
          font-weight: 400;
          line-height: 2.41;
          letter-spacing: 0;
          text-decoration: none;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          text-align: left;
          transition: color 0.2s ease;
        }
        .footer-col a:hover, .footer-col button:hover { color: #0066cc; }
        .footer-col-head {
          font-family: 'SF Pro Text', system-ui, -apple-system, sans-serif;
          font-size: 14px;
          font-weight: 600;
          line-height: 1.29;
          letter-spacing: -0.224px;
          color: #1d1d1f;
          margin-bottom: 8px;
        }

        /* === BACKDROP FROSTED (sub-nav) === */
        .frosted {
          background-color: rgba(245,245,247,0.80);
          backdrop-filter: saturate(180%) blur(20px);
          -webkit-backdrop-filter: saturate(180%) blur(20px);
        }

        /* === HERO BACKGROUND === */
        .hero-bg-image { background-position: 70% center; }
        @media (min-width: 768px) { .hero-bg-image { background-position: center; } }

        /* === LEGACY COMPAT (keep appointment form, admin, etc. working) === */
        .btn-animated { transition: all 0.3s ease; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
      <div className="min-h-screen bg-stone-900">
        <Header
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
        {currentPage === 'home' && (
          <HomePage
            setCurrentPage={setCurrentPage}
          />
        )}
        {currentPage === 'menu' && (
          <MenuPage
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            searchQuery={searchQuery}
            menuData={menuData}
            isLoading={isLoadingProducts}
          />
        )}
        {currentPage === 'cart' && <CartPage setCurrentPage={setCurrentPage} />}
        {currentPage === 'checkout' && <CheckoutPage setCurrentPage={setCurrentPage} clearCart={clearCart} />}
        {currentPage === 'confirmation' && <ConfirmationPage setCurrentPage={setCurrentPage} orderNumber={pendingOrderNumber} paymentStatus={paymentStatus} />}
        {currentPage === 'payment-failed' && <PaymentFailedPage setCurrentPage={setCurrentPage} orderNumber={pendingOrderNumber} />}
        {currentPage === 'admin' && <AdminDashboard setCurrentPage={setCurrentPage} />}
        {currentPage === 'my-appointment' && <MyAppointment setCurrentPage={setCurrentPage} initialToken={appointmentToken} />}
        {showCart && <CartDrawer setShowCart={setShowCart} setCurrentPage={setCurrentPage} />}
        {showSizeModal && selectedProduct && (
          <SizeModal
            product={selectedProduct}
            onClose={() => {
              console.log('Closing size modal');
              setShowSizeModal(false);
              setSelectedProduct(null);
            }}
            onSelectSize={(size) => {
              console.log('Size selected:', size);
              addToCart(selectedProduct, size);
            }}
          />
        )}


      </div>
    </CartContext.Provider>
  );
}

// Size Selection Modal
function SizeModal({ product, onClose, onSelectSize }) {
  console.log('SizeModal rendering with product:', product);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        // Close when clicking backdrop
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative animate-fadeIn">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-all"
        >
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-2xl font-black text-green-600 mb-2">Select Size</h2>
        <p className="text-gray-600 font-bold mb-6">{product.name}</p>

        <div className="space-y-3">
          {product.sizes.map((size) => (
            <button
              key={size.name}
              onClick={() => onSelectSize(size)}
              className="w-full bg-gray-50 hover:bg-green-50 border-2 border-gray-200 hover:border-green-600 rounded-lg p-4 flex items-center justify-between transition-all group"
            >
              <span className="font-bold text-gray-800 group-hover:text-green-600">{size.name}</span>
              <span className="text-xl font-black text-green-600">Php {size.price.toFixed(2)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Appointment Form Component
function AppointmentForm() {
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    email: '',
    serviceType: '',
    preferredDate: '',
    preferredTime: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState({ type: '', message: '' });
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Fetch available slots when date changes
  useEffect(() => {
    const fetchAvailableSlots = async () => {
      if (!formData.preferredDate) {
        setAvailableSlots([]);
        return;
      }

      setLoadingSlots(true);
      try {
        const response = await fetch(`http://localhost:5000/api/available-slots?date=${formData.preferredDate}`);
        const data = await response.json();
        if (data.success) {
          setAvailableSlots(data.availableSlots);
          // Reset time if previously selected time is no longer available
          if (formData.preferredTime && !data.availableSlots.includes(formData.preferredTime)) {
            setFormData(prev => ({ ...prev, preferredTime: '' }));
          }
        }
      } catch (error) {
        console.error('Error fetching slots:', error);
        // Fallback to all slots if API fails
        setAvailableSlots(['9:00 AM', '10:00 AM', '11:00 AM', '2:00 PM', '3:00 PM', '4:00 PM']);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchAvailableSlots();
  }, [formData.preferredDate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus({ type: '', message: '' });

    try {
      const response = await fetch('http://localhost:5000/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setSubmitStatus({ type: 'success', message: data.message });
        setFormData({
          fullName: '',
          phoneNumber: '',
          email: '',
          serviceType: '',
          preferredDate: '',
          preferredTime: '',
          notes: ''
        });
      } else {
        setSubmitStatus({ type: 'error', message: data.message });
      }
    } catch (error) {
      setSubmitStatus({ type: 'error', message: 'Failed to connect to server. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#ffffe6]/5 backdrop-blur-md rounded-2xl shadow-2xl p-6 md:p-8 border border-white/20">
      <div className="flex justify-center mb-6">
        <div className="group inline-flex items-center gap-3 bg-[#E4FE7B]/10 backdrop-blur-md px-5 py-2.5 rounded-full border border-[#E4FE7B]/30 hover:border-[#E4FE7B]/60 hover:bg-[#E4FE7B]/20 transition-all duration-300 cursor-pointer">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E4FE7B] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#E4FE7B]"></span>
          </span>
          <span className="text-[#E4FE7B] text-xs font-semibold tracking-wider uppercase">Now Accepting New Clients</span>
        </div>
      </div>

      {submitStatus.message && (
        <div className={`mb-4 p-3 rounded-lg text-sm text-center ${submitStatus.type === 'success'
          ? 'bg-green-500/20 text-green-300 border border-green-500/30'
          : 'bg-red-500/20 text-red-300 border border-red-500/30'
          }`}>
          {submitStatus.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-white mb-1.5">Full Name</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Your full name"
              required
              className="w-full px-3 py-2.5 rounded-lg border border-white/30 bg-white/10 focus:border-[#E4FE7B] focus:ring-2 focus:ring-[#E4FE7B]/30 focus:outline-none transition-all text-white placeholder-white/50 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-1.5">Phone Number</label>
            <input
              type="tel"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              placeholder="Your phone number"
              required
              className="w-full px-3 py-2.5 rounded-lg border border-white/30 bg-white/10 focus:border-[#E4FE7B] focus:ring-2 focus:ring-[#E4FE7B]/30 focus:outline-none transition-all text-white placeholder-white/50 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-white mb-1.5">Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Your email"
              required
              className="w-full px-3 py-2.5 rounded-lg border border-white/30 bg-white/10 focus:border-[#E4FE7B] focus:ring-2 focus:ring-[#E4FE7B]/30 focus:outline-none transition-all text-white placeholder-white/50 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-1.5">Service Type</label>
            <select
              name="serviceType"
              value={formData.serviceType}
              onChange={handleChange}
              required
              className="w-full px-3 py-2.5 rounded-lg border border-white/30 bg-white/10 focus:border-[#E4FE7B] focus:ring-2 focus:ring-[#E4FE7B]/30 focus:outline-none transition-all text-white text-sm"
            >
              <option value="" className="bg-stone-800 text-white">Select a service</option>
              <option value="consultation" className="bg-stone-800 text-white">General Consultation</option>
              <option value="checkup" className="bg-stone-800 text-white">Health Checkup</option>
              <option value="dental" className="bg-stone-800 text-white">Dental Care</option>
              <option value="pediatric" className="bg-stone-800 text-white">Pediatric Care</option>
              <option value="laboratory" className="bg-stone-800 text-white">Laboratory Tests</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-white mb-1.5">Preferred Date</label>
            <input
              type="date"
              name="preferredDate"
              value={formData.preferredDate}
              onChange={handleChange}
              required
              className="w-full px-3 py-2.5 rounded-lg border border-white/30 bg-white/10 focus:border-[#E4FE7B] focus:ring-2 focus:ring-[#E4FE7B]/30 focus:outline-none transition-all text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-1.5">Preferred Time</label>
            <select
              name="preferredTime"
              value={formData.preferredTime}
              onChange={handleChange}
              required
              disabled={!formData.preferredDate || loadingSlots}
              className="w-full px-3 py-2.5 rounded-lg border border-white/30 bg-white/10 focus:border-[#E4FE7B] focus:ring-2 focus:ring-[#E4FE7B]/30 focus:outline-none transition-all text-white text-sm disabled:opacity-50"
            >
              <option value="" className="bg-stone-800 text-white">
                {!formData.preferredDate ? 'Select date first' : loadingSlots ? 'Loading...' : availableSlots.length === 0 ? 'No slots available' : 'Select a time'}
              </option>
              {availableSlots.map(slot => (
                <option key={slot} value={slot} className="bg-stone-800 text-white">{slot}</option>
              ))}
            </select>
            {formData.preferredDate && availableSlots.length === 0 && !loadingSlots && (
              <p className="text-red-400 text-xs mt-1">All slots are booked for this date. Please select another date.</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-white mb-1.5">Additional Notes (Optional)</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={2}
            placeholder="Any specific concerns..."
            className="w-full px-3 py-2.5 rounded-lg border border-white/30 bg-white/10 focus:border-[#E4FE7B] focus:ring-2 focus:ring-[#E4FE7B]/30 focus:outline-none transition-all resize-none text-white placeholder-white/50 text-sm"
          ></textarea>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-animated w-full bg-stone-900 text-[#E4FE7B] py-3 rounded-lg font-semibold text-base hover:bg-stone-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Booking...' : 'Book Appointment'}
        </button>
      </form>

      <div className="mt-4 pt-4 border-t border-white/20">
        <div className="flex flex-wrap justify-center gap-4 text-xs text-white/70">
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-[#E4FE7B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Quick Response</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-[#E4FE7B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Confirmed via SMS</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Admin Dashboard Component
function AdminDashboard({ setCurrentPage }) {
  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Admin section tabs
  const [activeTab, setActiveTab] = useState('appointments');

  // Dashboard state
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Reschedule state
  const [rescheduleModal, setRescheduleModal] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [isRescheduling, setIsRescheduling] = useState(false);

  // Calendar state
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth() + 1);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarData, setCalendarData] = useState({ appointments: [], blockedDates: [] });

  // Reports state
  const [reportStats, setReportStats] = useState(null);
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');

  // Settings state
  const [blockedDates, setBlockedDates] = useState([]);
  const [newBlockedDate, setNewBlockedDate] = useState('');
  const [newBlockedReason, setNewBlockedReason] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [newDoctorName, setNewDoctorName] = useState('');
  const [newDoctorSpec, setNewDoctorSpec] = useState('');
  const [services, setServices] = useState([]);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceDuration, setNewServiceDuration] = useState(30);
  const [newServicePrice, setNewServicePrice] = useState(0);

  // Print modal
  const [printAppointment, setPrintAppointment] = useState(null);

  // Check for existing session
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      verifyToken(token);
    }
  }, []);

  const verifyToken = async (token) => {
    try {
      const response = await fetch('http://localhost:5000/api/admin/verify', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.valid) {
        setIsLoggedIn(true);
        fetchAppointments();
      } else {
        localStorage.removeItem('adminToken');
      }
    } catch (error) {
      localStorage.removeItem('adminToken');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');

    try {
      const response = await fetch('http://localhost:5000/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();

      if (data.success) {
        localStorage.setItem('adminToken', data.token);
        setIsLoggedIn(true);
        fetchAppointments();
      } else {
        setLoginError(data.message || 'Invalid credentials');
      }
    } catch (error) {
      setLoginError('Login failed. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    const token = localStorage.getItem('adminToken');
    try {
      await fetch('http://localhost:5000/api/admin/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    localStorage.removeItem('adminToken');
    setIsLoggedIn(false);
    setUsername('');
    setPassword('');
  };

  const fetchAppointments = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append('query', searchQuery);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (filter !== 'all') params.append('status', filter);

      const url = params.toString()
        ? `http://localhost:5000/api/appointments/search?${params}`
        : 'http://localhost:5000/api/appointments';

      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setAppointments(data.appointments);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch when filters change
  useEffect(() => {
    if (isLoggedIn) {
      const debounce = setTimeout(() => {
        fetchAppointments();
      }, 300);
      return () => clearTimeout(debounce);
    }
  }, [searchQuery, startDate, endDate, filter, isLoggedIn]);

  const updateStatus = async (id, newStatus) => {
    setUpdatingId(id);
    try {
      const response = await fetch(`http://localhost:5000/api/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await response.json();
      if (data.success) {
        setAppointments(prev => prev.map(apt =>
          apt.id === id ? { ...apt, status: newStatus } : apt
        ));
      }
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setUpdatingId(null);
    }
  };

  // Reschedule functions
  const openRescheduleModal = async (apt) => {
    setRescheduleModal(apt);
    setNewDate(apt.preferred_date);
    setNewTime(apt.preferred_time);
    // Fetch available slots for current date
    await fetchAvailableSlots(apt.preferred_date);
  };

  const fetchAvailableSlots = async (date) => {
    try {
      const response = await fetch(`http://localhost:5000/api/available-slots?date=${date}`);
      const data = await response.json();
      if (data.success) {
        // Include the current time slot as it's the appointment's own slot
        const slots = [...data.availableSlots];
        if (rescheduleModal && rescheduleModal.preferred_date === date) {
          if (!slots.includes(rescheduleModal.preferred_time)) {
            slots.push(rescheduleModal.preferred_time);
            slots.sort();
          }
        }
        setAvailableSlots(slots);
      }
    } catch (error) {
      console.error('Error fetching slots:', error);
    }
  };

  const handleDateChange = async (date) => {
    setNewDate(date);
    setNewTime('');
    await fetchAvailableSlots(date);
  };

  const handleReschedule = async () => {
    if (!newDate || !newTime) return;

    setIsRescheduling(true);
    try {
      const response = await fetch(`http://localhost:5000/api/appointments/${rescheduleModal.id}/reschedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferredDate: newDate, preferredTime: newTime })
      });
      const data = await response.json();

      if (data.success) {
        setAppointments(prev => prev.map(apt =>
          apt.id === rescheduleModal.id
            ? { ...apt, preferred_date: newDate, preferred_time: newTime }
            : apt
        ));
        setRescheduleModal(null);
      } else {
        alert(data.message || 'Failed to reschedule');
      }
    } catch (error) {
      console.error('Reschedule error:', error);
      alert('Failed to reschedule appointment');
    } finally {
      setIsRescheduling(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'confirmed': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'completed': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'cancelled': return 'bg-red-500/20 text-red-300 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const stats = {
    total: appointments.length,
    pending: appointments.filter(a => a.status === 'pending').length,
    confirmed: appointments.filter(a => a.status === 'confirmed').length,
    completed: appointments.filter(a => a.status === 'completed').length,
    cancelled: appointments.filter(a => a.status === 'cancelled').length,
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
    setFilter('all');
  };

  // Fetch calendar data
  const fetchCalendarData = async () => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/calendar?month=${calendarMonth}&year=${calendarYear}`
      );
      const data = await response.json();
      if (data.success) {
        setCalendarData(data);
      }
    } catch (error) {
      console.error('Error fetching calendar:', error);
    }
  };

  // Fetch reports
  const fetchReports = async () => {
    try {
      const params = new URLSearchParams();
      if (reportStartDate) params.append('startDate', reportStartDate);
      if (reportEndDate) params.append('endDate', reportEndDate);

      const response = await fetch(`http://localhost:5000/api/reports/stats?${params}`);
      const data = await response.json();
      if (data.success) {
        setReportStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  };

  // Fetch blocked dates
  const fetchBlockedDates = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/blocked-dates');
      const data = await response.json();
      if (data.success) {
        setBlockedDates(data.blockedDates);
      }
    } catch (error) {
      console.error('Error fetching blocked dates:', error);
    }
  };

  // Add blocked date
  const addBlockedDate = async () => {
    if (!newBlockedDate) return;
    try {
      const response = await fetch('http://localhost:5000/api/blocked-dates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockedDate: newBlockedDate, reason: newBlockedReason })
      });
      const data = await response.json();
      if (data.success) {
        setBlockedDates([...blockedDates, data.blockedDate]);
        setNewBlockedDate('');
        setNewBlockedReason('');
      }
    } catch (error) {
      console.error('Error adding blocked date:', error);
    }
  };

  // Delete blocked date
  const deleteBlockedDate = async (id) => {
    try {
      await fetch(`http://localhost:5000/api/blocked-dates/${id}`, { method: 'DELETE' });
      setBlockedDates(blockedDates.filter(d => d.id !== id));
    } catch (error) {
      console.error('Error deleting blocked date:', error);
    }
  };

  // Fetch doctors
  const fetchDoctors = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/doctors');
      const data = await response.json();
      if (data.success) {
        setDoctors(data.doctors);
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  // Add doctor
  const addDoctor = async () => {
    if (!newDoctorName) return;
    try {
      const response = await fetch('http://localhost:5000/api/doctors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newDoctorName, specialization: newDoctorSpec })
      });
      const data = await response.json();
      if (data.success) {
        setDoctors([...doctors, data.doctor]);
        setNewDoctorName('');
        setNewDoctorSpec('');
      }
    } catch (error) {
      console.error('Error adding doctor:', error);
    }
  };

  // Delete doctor
  const deleteDoctor = async (id) => {
    try {
      await fetch(`http://localhost:5000/api/doctors/${id}`, { method: 'DELETE' });
      setDoctors(doctors.filter(d => d.id !== id));
    } catch (error) {
      console.error('Error deleting doctor:', error);
    }
  };

  // Fetch services
  const fetchServices = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/services');
      const data = await response.json();
      if (data.success) {
        setServices(data.services);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  // Add service
  const addService = async () => {
    if (!newServiceName) return;
    try {
      const response = await fetch('http://localhost:5000/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newServiceName, duration: newServiceDuration, price: newServicePrice })
      });
      const data = await response.json();
      if (data.success) {
        setServices([...services, data.service]);
        setNewServiceName('');
        setNewServiceDuration(30);
        setNewServicePrice(0);
      }
    } catch (error) {
      console.error('Error adding service:', error);
    }
  };

  // Delete service
  const deleteService = async (id) => {
    try {
      await fetch(`http://localhost:5000/api/services/${id}`, { method: 'DELETE' });
      setServices(services.filter(s => s.id !== id));
    } catch (error) {
      console.error('Error deleting service:', error);
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (filter !== 'all') params.append('status', filter);
    window.open(`http://localhost:5000/api/export/appointments?${params}`, '_blank');
  };

  // Send SMS
  const sendSMSReminder = async (apt) => {
    try {
      const response = await fetch('http://localhost:5000/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId: apt.id })
      });
      const data = await response.json();
      alert(data.message);
    } catch (error) {
      alert('Failed to send SMS');
    }
  };

  // Print appointment slip
  const printSlip = (apt) => {
    setPrintAppointment(apt);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Load data when tab changes
  useEffect(() => {
    if (isLoggedIn) {
      if (activeTab === 'calendar') fetchCalendarData();
      if (activeTab === 'reports') fetchReports();
      if (activeTab === 'settings') {
        fetchBlockedDates();
        fetchDoctors();
        fetchServices();
      }
    }
  }, [activeTab, isLoggedIn, calendarMonth, calendarYear]);

  // Login Page
  if (!isLoggedIn) {
    return (
      <div className="bg-stone-900 min-h-screen pt-[140px] md:pt-[100px] pb-24 flex items-center justify-center">
        <div className="w-full max-w-md px-4">
          <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-[#E4FE7B]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[#E4FE7B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white">Admin Login</h2>
              <p className="text-white/60 mt-2">Sign in to access the dashboard</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {loginError && (
                <div className="bg-red-500/20 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg text-sm">
                  {loginError}
                </div>
              )}

              <div>
                <label className="block text-white/70 text-sm mb-2">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#E4FE7B]/50"
                  placeholder="Enter username"
                  required
                />
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#E4FE7B]/50"
                  placeholder="Enter password"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3 bg-[#E4FE7B] text-stone-900 font-semibold rounded-lg hover:bg-[#d4ee6b] transition-all disabled:opacity-50"
              >
                {isLoggingIn ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <button
              onClick={() => setCurrentPage('home')}
              className="w-full mt-4 py-3 bg-white/10 text-white/70 rounded-lg hover:bg-white/20 transition-all text-sm"
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard
  return (
    <div className="bg-stone-900 min-h-screen pt-[140px] md:pt-[100px] pb-24">
      <div className="w-full px-4 md:px-8 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
            <p className="text-white/60">Manage your clinic</p>
          </div>
          <div className="flex gap-2 mt-4 md:mt-0">
            <button
              onClick={() => setCurrentPage('home')}
              className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all text-sm"
            >
              ← Home
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-all text-sm"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Admin Navigation Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 border-b border-white/10">
          {[
            { id: 'appointments', label: 'Appointments', icon: '📋' },
            { id: 'calendar', label: 'Calendar', icon: '📅' },
            { id: 'reports', label: 'Reports', icon: '📊' },
            { id: 'settings', label: 'Settings', icon: '⚙️' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-t-lg text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === tab.id
                ? 'bg-[#E4FE7B] text-stone-900'
                : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ==================== APPOINTMENTS TAB ==================== */}
        {activeTab === 'appointments' && (
          <>
            {/* Search & Filter Bar */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Search Input */}
                <div className="md:col-span-2">
                  <label className="block text-white/50 text-xs mb-1">Search Patient</label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, phone, or email..."
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#E4FE7B]/50 text-sm"
                  />
                </div>

                {/* Date Range */}
                <div>
                  <label className="block text-white/50 text-xs mb-1">From Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#E4FE7B]/50 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-white/50 text-xs mb-1">To Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#E4FE7B]/50 text-sm"
                  />
                </div>
              </div>

              {/* Clear Filters */}
              {(searchQuery || startDate || endDate) && (
                <button
                  onClick={clearFilters}
                  className="mt-3 text-sm text-[#E4FE7B] hover:underline"
                >
                  Clear all filters
                </button>
              )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-white/50 text-xs uppercase tracking-wider">Total</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <div className="bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/20">
                <p className="text-yellow-300/70 text-xs uppercase tracking-wider">Pending</p>
                <p className="text-2xl font-bold text-yellow-300">{stats.pending}</p>
              </div>
              <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/20">
                <p className="text-green-300/70 text-xs uppercase tracking-wider">Confirmed</p>
                <p className="text-2xl font-bold text-green-300">{stats.confirmed}</p>
              </div>
              <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/20">
                <p className="text-blue-300/70 text-xs uppercase tracking-wider">Completed</p>
                <p className="text-2xl font-bold text-blue-300">{stats.completed}</p>
              </div>
              <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/20">
                <p className="text-red-300/70 text-xs uppercase tracking-wider">Cancelled</p>
                <p className="text-2xl font-bold text-red-300">{stats.cancelled}</p>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${filter === f
                    ? 'bg-[#E4FE7B] text-stone-900'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {/* Appointments List */}
            {isLoading ? (
              <div className="text-center py-16">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#E4FE7B] mb-4"></div>
                <p className="text-white/60">Loading appointments...</p>
              </div>
            ) : appointments.length === 0 ? (
              <div className="text-center py-16 bg-white/5 rounded-xl border border-white/10">
                <p className="text-white/60">No appointments found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {appointments.map(apt => (
                  <div key={apt.id} className="bg-white/5 rounded-xl p-4 md:p-6 border border-white/10 hover:border-white/20 transition-all">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-white">{apt.full_name}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(apt.status)}`}>
                            {apt.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-white/60">
                          <p><span className="text-white/40">Service:</span> {apt.service_type}</p>
                          <p><span className="text-white/40">Date:</span> {apt.preferred_date}</p>
                          <p><span className="text-white/40">Time:</span> {apt.preferred_time}</p>
                          <p><span className="text-white/40">Phone:</span> {apt.phone_number}</p>
                          <p><span className="text-white/40">Email:</span> {apt.email}</p>
                          <p><span className="text-white/40">ID:</span> #{apt.id}</p>
                        </div>
                        {apt.notes && (
                          <p className="mt-2 text-sm text-white/50"><span className="text-white/40">Notes:</span> {apt.notes}</p>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2">
                        {/* Reschedule button - always show for non-cancelled/completed */}
                        {(apt.status === 'pending' || apt.status === 'confirmed') && (
                          <button
                            onClick={() => openRescheduleModal(apt)}
                            className="px-3 py-1.5 bg-purple-500/20 text-purple-300 rounded-lg text-sm hover:bg-purple-500/30 transition-all"
                          >
                            Reschedule
                          </button>
                        )}

                        {apt.status === 'pending' && (
                          <>
                            <button
                              onClick={() => updateStatus(apt.id, 'confirmed')}
                              disabled={updatingId === apt.id}
                              className="px-3 py-1.5 bg-green-500/20 text-green-300 rounded-lg text-sm hover:bg-green-500/30 transition-all disabled:opacity-50"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => updateStatus(apt.id, 'cancelled')}
                              disabled={updatingId === apt.id}
                              className="px-3 py-1.5 bg-red-500/20 text-red-300 rounded-lg text-sm hover:bg-red-500/30 transition-all disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {apt.status === 'confirmed' && (
                          <>
                            <button
                              onClick={() => updateStatus(apt.id, 'completed')}
                              disabled={updatingId === apt.id}
                              className="px-3 py-1.5 bg-blue-500/20 text-blue-300 rounded-lg text-sm hover:bg-blue-500/30 transition-all disabled:opacity-50"
                            >
                              Complete
                            </button>
                            <button
                              onClick={() => updateStatus(apt.id, 'cancelled')}
                              disabled={updatingId === apt.id}
                              className="px-3 py-1.5 bg-red-500/20 text-red-300 rounded-lg text-sm hover:bg-red-500/30 transition-all disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {(apt.status === 'cancelled' || apt.status === 'completed') && (
                          <button
                            onClick={() => updateStatus(apt.id, 'pending')}
                            disabled={updatingId === apt.id}
                            className="px-3 py-1.5 bg-white/10 text-white/70 rounded-lg text-sm hover:bg-white/20 transition-all disabled:opacity-50"
                          >
                            Reopen
                          </button>
                        )}
                        {/* SMS & Print buttons */}
                        <button
                          onClick={() => sendSMSReminder(apt)}
                          className="px-3 py-1.5 bg-cyan-500/20 text-cyan-300 rounded-lg text-sm hover:bg-cyan-500/30 transition-all"
                          title="Send SMS Reminder"
                        >
                          📱 SMS
                        </button>
                        <button
                          onClick={() => printSlip(apt)}
                          className="px-3 py-1.5 bg-white/10 text-white/70 rounded-lg text-sm hover:bg-white/20 transition-all"
                          title="Print Appointment Slip"
                        >
                          🖨️ Print
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Export Button */}
            <div className="mt-6 flex gap-2">
              <button
                onClick={exportToCSV}
                className="px-4 py-2 bg-green-500/20 text-green-300 rounded-lg hover:bg-green-500/30 transition-all text-sm flex items-center gap-2"
              >
                📥 Export to CSV
              </button>
            </div>
          </>
        )}

        {/* ==================== CALENDAR TAB ==================== */}
        {activeTab === 'calendar' && (
          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Calendar View</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (calendarMonth === 1) {
                      setCalendarMonth(12);
                      setCalendarYear(calendarYear - 1);
                    } else {
                      setCalendarMonth(calendarMonth - 1);
                    }
                  }}
                  className="p-2 bg-white/10 rounded-lg hover:bg-white/20 text-white"
                >
                  ←
                </button>
                <span className="text-white font-medium px-4">
                  {new Date(calendarYear, calendarMonth - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <button
                  onClick={() => {
                    if (calendarMonth === 12) {
                      setCalendarMonth(1);
                      setCalendarYear(calendarYear + 1);
                    } else {
                      setCalendarMonth(calendarMonth + 1);
                    }
                  }}
                  className="p-2 bg-white/10 rounded-lg hover:bg-white/20 text-white"
                >
                  →
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-white/50 text-sm py-2 font-medium">
                  {day}
                </div>
              ))}
              {(() => {
                const firstDay = new Date(calendarYear, calendarMonth - 1, 1).getDay();
                const daysInMonth = new Date(calendarYear, calendarMonth, 0).getDate();
                const days = [];

                for (let i = 0; i < firstDay; i++) {
                  days.push(<div key={`empty-${i}`} className="p-2"></div>);
                }

                for (let day = 1; day <= daysInMonth; day++) {
                  const dateStr = `${calendarYear}-${String(calendarMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const dayAppointments = calendarData.appointments?.filter(a => a.preferred_date === dateStr) || [];
                  const isBlocked = calendarData.blockedDates?.some(b => b.blocked_date === dateStr);
                  const isToday = dateStr === new Date().toISOString().split('T')[0];

                  days.push(
                    <div
                      key={day}
                      className={`min-h-[80px] p-1 rounded-lg border ${isBlocked ? 'bg-red-500/20 border-red-500/30' :
                        isToday ? 'bg-[#E4FE7B]/10 border-[#E4FE7B]/30' :
                          'bg-white/5 border-white/10'
                        }`}
                    >
                      <div className={`text-sm font-medium mb-1 ${isToday ? 'text-[#E4FE7B]' : 'text-white/70'}`}>
                        {day}
                      </div>
                      {isBlocked && (
                        <div className="text-xs text-red-300 truncate">Closed</div>
                      )}
                      {dayAppointments.slice(0, 2).map((apt, idx) => (
                        <div
                          key={idx}
                          className={`text-xs truncate px-1 rounded mb-0.5 ${apt.status === 'confirmed' ? 'bg-green-500/30 text-green-200' :
                            apt.status === 'pending' ? 'bg-yellow-500/30 text-yellow-200' :
                              apt.status === 'completed' ? 'bg-blue-500/30 text-blue-200' :
                                'bg-gray-500/30 text-gray-200'
                            }`}
                        >
                          {apt.preferred_time.split(' ')[0]} {apt.full_name.split(' ')[0]}
                        </div>
                      ))}
                      {dayAppointments.length > 2 && (
                        <div className="text-xs text-white/50">+{dayAppointments.length - 2} more</div>
                      )}
                    </div>
                  );
                }
                return days;
              })()}
            </div>
          </div>
        )}

        {/* ==================== REPORTS TAB ==================== */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            {/* Date Filter */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex flex-wrap gap-4 items-end">
                <div>
                  <label className="block text-white/50 text-xs mb-1">Start Date</label>
                  <input
                    type="date"
                    value={reportStartDate}
                    onChange={(e) => setReportStartDate(e.target.value)}
                    className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-white/50 text-xs mb-1">End Date</label>
                  <input
                    type="date"
                    value={reportEndDate}
                    onChange={(e) => setReportEndDate(e.target.value)}
                    className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
                  />
                </div>
                <button
                  onClick={fetchReports}
                  className="px-4 py-2 bg-[#E4FE7B] text-stone-900 rounded-lg font-medium text-sm"
                >
                  Generate Report
                </button>
              </div>
            </div>

            {reportStats && (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <p className="text-white/50 text-xs uppercase">Total Appointments</p>
                    <p className="text-3xl font-bold text-white">{reportStats.totals?.total || 0}</p>
                  </div>
                  <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/20">
                    <p className="text-green-300/70 text-xs uppercase">Completed</p>
                    <p className="text-3xl font-bold text-green-300">{reportStats.totals?.completed || 0}</p>
                  </div>
                  <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/20">
                    <p className="text-red-300/70 text-xs uppercase">Cancelled</p>
                    <p className="text-3xl font-bold text-red-300">{reportStats.totals?.cancelled || 0}</p>
                  </div>
                  <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/20">
                    <p className="text-blue-300/70 text-xs uppercase">Completion Rate</p>
                    <p className="text-3xl font-bold text-blue-300">
                      {reportStats.totals?.total > 0
                        ? Math.round((reportStats.totals.completed / reportStats.totals.total) * 100)
                        : 0}%
                    </p>
                  </div>
                </div>

                {/* By Service */}
                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <h3 className="text-lg font-semibold text-white mb-4">Appointments by Service</h3>
                  <div className="space-y-3">
                    {reportStats.byService?.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="text-white/70">{item.service_type}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#E4FE7B]"
                              style={{ width: `${(item.count / reportStats.totals.total) * 100}%` }}
                            />
                          </div>
                          <span className="text-white font-medium w-8 text-right">{item.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Peak Hours */}
                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <h3 className="text-lg font-semibold text-white mb-4">Popular Time Slots</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {reportStats.hourly?.map((item, idx) => (
                      <div key={idx} className="bg-white/5 rounded-lg p-3 text-center">
                        <p className="text-[#E4FE7B] font-medium">{item.time}</p>
                        <p className="text-white/50 text-sm">{item.count} bookings</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ==================== SETTINGS TAB ==================== */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Blocked Dates / Holidays */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">🚫 Blocked Dates / Holidays</h3>
              <div className="flex flex-wrap gap-3 mb-4">
                <input
                  type="date"
                  value={newBlockedDate}
                  onChange={(e) => setNewBlockedDate(e.target.value)}
                  className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
                />
                <input
                  type="text"
                  value={newBlockedReason}
                  onChange={(e) => setNewBlockedReason(e.target.value)}
                  placeholder="Reason (e.g., Holiday)"
                  className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 text-sm flex-1"
                />
                <button
                  onClick={addBlockedDate}
                  className="px-4 py-2 bg-[#E4FE7B] text-stone-900 rounded-lg font-medium text-sm"
                >
                  Add Date
                </button>
              </div>
              <div className="space-y-2">
                {blockedDates.map(bd => (
                  <div key={bd.id} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                    <div>
                      <span className="text-white font-medium">{bd.blocked_date}</span>
                      <span className="text-white/50 ml-2">- {bd.reason}</span>
                    </div>
                    <button
                      onClick={() => deleteBlockedDate(bd.id)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {blockedDates.length === 0 && (
                  <p className="text-white/40 text-sm">No blocked dates configured</p>
                )}
              </div>
            </div>

            {/* Doctors */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">👨‍⚕️ Doctors</h3>
              <div className="flex flex-wrap gap-3 mb-4">
                <input
                  type="text"
                  value={newDoctorName}
                  onChange={(e) => setNewDoctorName(e.target.value)}
                  placeholder="Doctor Name"
                  className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 text-sm"
                />
                <input
                  type="text"
                  value={newDoctorSpec}
                  onChange={(e) => setNewDoctorSpec(e.target.value)}
                  placeholder="Specialization"
                  className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 text-sm flex-1"
                />
                <button
                  onClick={addDoctor}
                  className="px-4 py-2 bg-[#E4FE7B] text-stone-900 rounded-lg font-medium text-sm"
                >
                  Add Doctor
                </button>
              </div>
              <div className="space-y-2">
                {doctors.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                    <div>
                      <span className="text-white font-medium">{doc.name}</span>
                      <span className="text-white/50 ml-2">- {doc.specialization}</span>
                    </div>
                    <button
                      onClick={() => deleteDoctor(doc.id)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {doctors.length === 0 && (
                  <p className="text-white/40 text-sm">No doctors configured</p>
                )}
              </div>
            </div>

            {/* Services */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">🏥 Services & Duration</h3>
              <div className="flex flex-wrap gap-3 mb-4">
                <input
                  type="text"
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  placeholder="Service Name"
                  className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 text-sm flex-1"
                />
                <input
                  type="number"
                  value={newServiceDuration}
                  onChange={(e) => setNewServiceDuration(parseInt(e.target.value))}
                  placeholder="Duration (min)"
                  className="w-24 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
                />
                <input
                  type="number"
                  value={newServicePrice}
                  onChange={(e) => setNewServicePrice(parseFloat(e.target.value))}
                  placeholder="Price"
                  className="w-24 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
                />
                <button
                  onClick={addService}
                  className="px-4 py-2 bg-[#E4FE7B] text-stone-900 rounded-lg font-medium text-sm"
                >
                  Add Service
                </button>
              </div>
              <div className="space-y-2">
                {services.map(svc => (
                  <div key={svc.id} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                    <div>
                      <span className="text-white font-medium">{svc.name}</span>
                      <span className="text-white/50 ml-2">- {svc.duration} min</span>
                      {svc.price > 0 && <span className="text-[#E4FE7B] ml-2">₱{svc.price}</span>}
                    </div>
                    <button
                      onClick={() => deleteService(svc.id)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {services.length === 0 && (
                  <p className="text-white/40 text-sm">No services configured</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reschedule Modal */}
      {rescheduleModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-stone-800 rounded-2xl p-6 w-full max-w-md border border-white/10">
            <h3 className="text-xl font-bold text-white mb-4">Reschedule Appointment</h3>
            <p className="text-white/60 text-sm mb-4">
              Patient: <span className="text-white">{rescheduleModal.full_name}</span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-white/70 text-sm mb-2">New Date</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#E4FE7B]/50"
                />
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-2">New Time</label>
                <select
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#E4FE7B]/50"
                >
                  <option value="">Select time slot</option>
                  {availableSlots.map(slot => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
                {availableSlots.length === 0 && newDate && (
                  <p className="text-red-400 text-sm mt-1">No slots available for this date</p>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setRescheduleModal(null)}
                className="flex-1 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleReschedule}
                disabled={!newDate || !newTime || isRescheduling}
                className="flex-1 py-3 bg-[#E4FE7B] text-stone-900 font-semibold rounded-lg hover:bg-[#d4ee6b] transition-all disabled:opacity-50"
              >
                {isRescheduling ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Appointment Slip */}
      {printAppointment && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 print:bg-white print:p-0">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md print:rounded-none print:shadow-none">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-stone-900">HealthCare Clinic</h2>
              <p className="text-stone-600 text-sm">Cantecson, Gairan, Bogo City, Cebu</p>
            </div>
            <div className="border-t border-b border-stone-200 py-4 mb-4">
              <h3 className="text-lg font-semibold text-stone-900 mb-3">Appointment Slip</h3>
              <div className="space-y-2 text-sm">
                <p><strong>Patient:</strong> {printAppointment.full_name}</p>
                <p><strong>Service:</strong> {printAppointment.service_type}</p>
                <p><strong>Date:</strong> {printAppointment.preferred_date}</p>
                <p><strong>Time:</strong> {printAppointment.preferred_time}</p>
                <p><strong>Reference #:</strong> {printAppointment.id}</p>
              </div>
            </div>
            <p className="text-xs text-stone-500 text-center">Please arrive 10 minutes before your scheduled time.</p>
            <div className="mt-6 flex gap-3 print:hidden">
              <button
                onClick={() => setPrintAppointment(null)}
                className="flex-1 py-2 bg-stone-200 text-stone-700 rounded-lg"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 bg-stone-900 text-white rounded-lg"
              >
                Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// My Appointment Page - Patient Self-Service
function MyAppointment({ setCurrentPage, initialToken }) {
  const [email, setEmail] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [appointment, setAppointment] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(false);

  // Auto-fetch if token provided
  useEffect(() => {
    if (initialToken) {
      fetchByToken(initialToken);
    }
  }, [initialToken]);

  const fetchByToken = async (token) => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`http://localhost:5000/api/patient/appointment/${token}`);
      const data = await response.json();
      if (data.success) {
        setAppointment(data.appointment);
      } else {
        setError(data.message || 'Appointment not found');
      }
    } catch (err) {
      setError('Failed to fetch appointment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLookup = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setAppointment(null);

    try {
      const response = await fetch('http://localhost:5000/api/patient/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, referenceId: parseInt(referenceId) })
      });
      const data = await response.json();

      if (data.success) {
        setAppointment(data.appointment);
      } else {
        setError(data.message || 'Appointment not found');
      }
    } catch (err) {
      setError('Failed to look up appointment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!appointment) return;

    setIsCancelling(true);
    try {
      const response = await fetch('http://localhost:5000/api/patient/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cancelToken: appointment.cancel_token,
          reason: cancelReason || 'Cancelled by patient'
        })
      });
      const data = await response.json();

      if (data.success) {
        setCancelSuccess(true);
        setShowCancelConfirm(false);
        setAppointment(prev => ({ ...prev, status: 'cancelled' }));
      } else {
        setError(data.message || 'Failed to cancel appointment');
      }
    } catch (err) {
      setError('Failed to cancel appointment. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'confirmed': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'completed': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'cancelled': return 'bg-red-500/20 text-red-300 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const canCancel = appointment &&
    appointment.status !== 'cancelled' &&
    appointment.status !== 'completed' &&
    new Date(appointment.preferred_date) >= new Date(new Date().setHours(0, 0, 0, 0));

  return (
    <div className="bg-stone-900 min-h-screen pt-[140px] md:pt-[100px] pb-24">
      <div className="w-full max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#E4FE7B]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#E4FE7B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">My Appointment</h1>
          <p className="text-white/60">View or cancel your appointment</p>
        </div>

        {/* Success Message */}
        {cancelSuccess && (
          <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4 mb-6 text-center">
            <svg className="w-12 h-12 text-green-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-green-300 font-semibold">Appointment Cancelled Successfully</p>
            <p className="text-green-300/70 text-sm mt-1">A confirmation email has been sent to you.</p>
          </div>
        )}

        {/* Lookup Form (only show if no appointment loaded) */}
        {!appointment && !isLoading && (
          <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
            <h2 className="text-lg font-semibold text-white mb-4">Find Your Appointment</h2>

            <form onSubmit={handleLookup} className="space-y-4">
              <div>
                <label className="block text-white/70 text-sm mb-2">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#E4FE7B]/50"
                  required
                />
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-2">Reference ID</label>
                <input
                  type="number"
                  value={referenceId}
                  onChange={(e) => setReferenceId(e.target.value)}
                  placeholder="Enter your reference number (e.g., 123)"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#E4FE7B]/50"
                  required
                />
                <p className="text-white/40 text-xs mt-1">Found in your confirmation email</p>
              </div>

              {error && (
                <div className="bg-red-500/20 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-[#E4FE7B] text-stone-900 font-semibold rounded-lg hover:bg-[#d4ee6b] transition-all disabled:opacity-50"
              >
                {isLoading ? 'Looking up...' : 'Find Appointment'}
              </button>
            </form>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#E4FE7B] mb-4"></div>
            <p className="text-white/60">Loading appointment...</p>
          </div>
        )}

        {/* Appointment Details */}
        {appointment && !isLoading && (
          <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Appointment Details</h2>
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(appointment.status)}`}>
                {appointment.status}
              </span>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Patient Name</p>
                  <p className="text-white font-medium">{appointment.full_name}</p>
                </div>
                <div>
                  <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Reference ID</p>
                  <p className="text-white font-medium">#{appointment.id}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Service</p>
                  <p className="text-white">{appointment.service_type}</p>
                </div>
                <div>
                  <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Phone</p>
                  <p className="text-white">{appointment.phone_number}</p>
                </div>
              </div>

              <div className="bg-[#E4FE7B]/10 rounded-xl p-4 border border-[#E4FE7B]/20">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[#E4FE7B]/70 text-xs uppercase tracking-wider mb-1">Date</p>
                    <p className="text-white font-semibold text-lg">{appointment.preferred_date}</p>
                  </div>
                  <div>
                    <p className="text-[#E4FE7B]/70 text-xs uppercase tracking-wider mb-1">Time</p>
                    <p className="text-white font-semibold text-lg">{appointment.preferred_time}</p>
                  </div>
                </div>
              </div>

              {appointment.notes && (
                <div>
                  <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Notes</p>
                  <p className="text-white/70 text-sm">{appointment.notes}</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-6 pt-6 border-t border-white/10 flex gap-3">
              <button
                onClick={() => {
                  setAppointment(null);
                  setEmail('');
                  setReferenceId('');
                  setCancelSuccess(false);
                }}
                className="flex-1 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all"
              >
                Look Up Another
              </button>

              {canCancel && (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="flex-1 py-3 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-all"
                >
                  Cancel Appointment
                </button>
              )}
            </div>
          </div>
        )}

        {/* Back Button */}
        <button
          onClick={() => setCurrentPage('home')}
          className="w-full mt-6 py-3 bg-white/10 text-white/70 rounded-lg hover:bg-white/20 transition-all text-sm"
        >
          ← Back to Home
        </button>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-stone-800 rounded-2xl p-6 w-full max-w-md border border-white/10">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white">Cancel Appointment?</h3>
              <p className="text-white/60 mt-2">This action cannot be undone.</p>
            </div>

            <div className="mb-4">
              <label className="block text-white/70 text-sm mb-2">Reason for cancellation (optional)</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Let us know why you're cancelling..."
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-red-500/50 resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all"
              >
                Keep Appointment
              </button>
              <button
                onClick={handleCancel}
                disabled={isCancelling}
                className="flex-1 py-3 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-all disabled:opacity-50"
              >
                {isCancelling ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Header Component — Apple global-nav style
function Header({ currentPage, setCurrentPage, searchQuery, setSearchQuery }) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <>
      {/* Global Nav — pure black, 44px, apple-nav */}
      <header
        className="apple-nav"
        style={{
          backgroundColor: '#000000',
          height: '44px',
          position: 'fixed',
          top: 0, left: 0, right: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div style={{ width: '100%', maxWidth: '1440px', margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

          {/* Logo */}
          <button
            onClick={() => setCurrentPage('home')}
            className="apple-nav-link"
            style={{ fontWeight: 600, fontSize: '14px', letterSpacing: '-0.12px', color: '#ffffff', padding: '0' }}
          >
            Roger Tonacao
          </button>

          {/* Center nav — desktop */}
          <nav className="hidden md:flex" style={{ gap: '0', alignItems: 'center' }}>
            <button onClick={() => setCurrentPage('home')} className="apple-nav-link"
              style={{ color: currentPage === 'home' ? '#ffffff' : 'rgba(255,255,255,0.7)' }}>Home</button>
            <button onClick={() => { setCurrentPage('home'); setTimeout(() => document.getElementById('services-section')?.scrollIntoView({ behavior: 'smooth' }), 100); }} className="apple-nav-link"
              style={{ color: 'rgba(255,255,255,0.7)' }}>Services</button>
            <button
              onClick={() => { setCurrentPage('home'); setTimeout(() => document.getElementById('about-section')?.scrollIntoView({ behavior: 'smooth' }), 100); }}
              className="apple-nav-link" style={{ color: 'rgba(255,255,255,0.7)' }}>About</button>
            <button
              onClick={() => { setCurrentPage('home'); setTimeout(() => document.getElementById('projects-section')?.scrollIntoView({ behavior: 'smooth' }), 100); }}
              className="apple-nav-link" style={{ color: 'rgba(255,255,255,0.7)' }}>Work</button>
            <button
              onClick={() => { setCurrentPage('home'); setTimeout(() => document.getElementById('location-section')?.scrollIntoView({ behavior: 'smooth' }), 100); }}
              className="apple-nav-link" style={{ color: 'rgba(255,255,255,0.7)' }}>Contact</button>
          </nav>

          {/* Right — CTA pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => { setCurrentPage('home'); setTimeout(() => document.getElementById('contact-section')?.scrollIntoView({ behavior: 'smooth' }), 100); }}
              className="btn-primary hidden md:inline-flex"
              style={{ fontSize: '14px', padding: '7px 18px', letterSpacing: '-0.12px' }}
            >
              Hire Me
            </button>
            {/* Mobile hamburger */}
            <button
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{ color: '#ffffff', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}
            >
              {mobileMenuOpen ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18" /></svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu drawer */}
      {mobileMenuOpen && (
        <div
          style={{
            position: 'fixed', top: '44px', left: 0, right: 0,
            backgroundColor: 'rgba(0,0,0,0.97)',
            backdropFilter: 'blur(20px)',
            zIndex: 99,
            padding: '12px 0 20px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {[
            { label: 'Home', action: () => { setCurrentPage('home'); setMobileMenuOpen(false); } },
            { label: 'Services', action: () => { setCurrentPage('home'); setMobileMenuOpen(false); setTimeout(() => document.getElementById('services-section')?.scrollIntoView({ behavior: 'smooth' }), 150); } },
            { label: 'About', action: () => { setCurrentPage('home'); setMobileMenuOpen(false); setTimeout(() => document.getElementById('about-section')?.scrollIntoView({ behavior: 'smooth' }), 150); } },
            { label: 'Work', action: () => { setCurrentPage('home'); setMobileMenuOpen(false); setTimeout(() => document.getElementById('projects-section')?.scrollIntoView({ behavior: 'smooth' }), 150); } },
            { label: 'Contact', action: () => { setCurrentPage('home'); setMobileMenuOpen(false); setTimeout(() => document.getElementById('location-section')?.scrollIntoView({ behavior: 'smooth' }), 150); } },
          ].map(item => (
            <button key={item.label} onClick={item.action}
              style={{ display: 'block', width: '100%', textAlign: 'center', padding: '12px 24px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.85)', fontFamily: "'SF Pro Text', system-ui, -apple-system, sans-serif", fontSize: '17px', letterSpacing: '-0.374px' }}
            >{item.label}</button>
          ))}
          <div style={{ padding: '12px 24px 0' }}>
            <button
              onClick={() => { setCurrentPage('home'); setMobileMenuOpen(false); setTimeout(() => document.getElementById('contact-section')?.scrollIntoView({ behavior: 'smooth' }), 150); }}
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', fontSize: '17px' }}
            >Hire Me</button>
          </div>
        </div>
      )}
    </>
  );
}

// Home Page — Apple DESIGN.md full-bleed tile system
function HomePage({ setCurrentPage }) {
  return (
    <div style={{ fontFamily: "'SF Pro Text', system-ui, -apple-system, BlinkMacSystemFont, sans-serif" }}>

      {/* ========================================================
          TILE 1 — HERO (DARK) — surface-tile-1 #272729
          Full-bleed, centered, photography-first
          ======================================================== */}
      <section
        id="appointment-section"
        className="tile tile-dark"
        style={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
        }}
      >
        {/* Background photo — full bleed */}
        <div
          className="hero-bg-image"
          style={{
            position: 'absolute', inset: 0,
            backgroundImage: "url('/assets/images/hero/hero-bg.png')",
            backgroundSize: 'cover',
          }}
        />

        {/* Content — responsive alignment */}
        <div
          className="relative z-10 w-full max-w-[1200px] mx-auto px-6 md:px-12 pt-32 pb-20 text-center md:text-left"
        >
          <div className="mx-auto md:mx-0 max-w-[500px]">

            {/* Status & Location badges */}
            <div className="animate-fadeUp flex flex-wrap justify-center md:justify-start gap-3 mb-6">
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '6px 14px', borderRadius: '9999px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#ffffff', fontSize: '13px', fontWeight: 500,
                backdropFilter: 'blur(10px)'
              }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#4ade80', boxShadow: '0 0 10px #4ade80' }}></span>
                Available for Freelance Projects
              </span>

              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '6px 14px', borderRadius: '9999px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#ffffff', fontSize: '13px', fontWeight: 500,
                backdropFilter: 'blur(10px)'
              }}>
                📍 Cebu, Philippines, Working Worldwide.
              </span>
            </div>

            {/* Hero headline */}
            <h1
              className="t-hero animate-fadeUp animate-delay-2"
              style={{ color: '#ffffff', marginBottom: '30px' }}
            >
              Hello, I am Roger!
            </h1>

            {/* Tagline */}
            <p
              className="t-lead animate-fadeUp animate-delay-3"
              style={{ color: 'rgba(255,255,255,0.72)', marginBottom: '40px' }}
            >

              I build websites and business software that help companies grow, automate, and succeed online.
            </p>

            {/* Two pill CTAs */}
            <div className="flex flex-wrap justify-center md:justify-start gap-4">
              <button
                onClick={() => document.getElementById('projects-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="btn-primary btn-apple"
              >
                View My Work
              </button>
              <button
                onClick={() => document.getElementById('contact-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="btn-secondary-dark btn-apple"
              >
                Get in Touch
              </button>
            </div>


          </div>
        </div>
      </section>

      {/* ========================================================
          TILE 2 — ABOUT (WHITE) — canvas #ffffff
          ======================================================== */}
      <section id="about-section" className="tile tile-light tile-pad">
        <div className="tile-inner">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '64px', alignItems: 'center' }}>

            {/* Left: Circular Photo + Headline + Bio */}
            <div>
              <p className="t-tagline" style={{ color: '#0066cc', marginBottom: '24px' }}>About Me</p>
              <h2 className="t-display-lg" style={{ color: '#1d1d1f', marginBottom: '24px' }}>
                I turn ideas into powerful digital solutions.
              </h2>
              <p className="t-body" style={{ color: '#6e6e73', marginBottom: '28px', maxWidth: '480px' }}>
                Freelance web developer with a passion for clean, user-friendly, high-performing websites. Strong background in systems development with a focus on business impact.
              </p>
              <img
                src="/assets/images/hero/signature.png"
                alt="Roger Tonacao signature"
                style={{ width: '200px', filter: 'contrast(1.1)' }}
              />
            </div>

            {/* Right: Info card */}
            <div className="util-card" style={{ borderRadius: '18px', padding: '32px' }}>
              {[
                {
                  label: 'Name',
                  value: 'Roger Tonacao',
                  icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0066cc" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                },
                {
                  label: 'Email',
                  value: 'hello@rogertonacao.com',
                  icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0066cc" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                },
                {
                  label: 'Location',
                  value: 'Bogo City, Cebu, Philippines',
                  icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0066cc" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                },
                {
                  label: 'Available for',
                  value: 'Freelance / Project Basis',
                  icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0066cc" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 0', borderBottom: i < 3 ? '1px solid #f0f0f0' : 'none' }}>
                  <div style={{ width: '40px', height: '40px', backgroundColor: 'rgba(0,102,204,0.08)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {item.icon}
                  </div>
                  <div>
                    <p className="t-caption" style={{ color: '#6e6e73', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '11px' }}>{item.label}</p>
                    <p className="t-body-strong" style={{ color: '#1d1d1f', margin: 0 }}>{item.value}</p>
                  </div>
                </div>
              ))}
              <div style={{ paddingTop: '20px' }}>
                <a href="https://res.cloudinary.com/doxih7ab3/image/upload/fl_attachment/v1784002768/CV_Roger_Tonacao_mzltxj.pdf.pdf" className="btn-primary btn-apple" style={{ fontSize: '15px', padding: '10px 20px' }}>
                  Download CV
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          TILE 3 — SERVICES (DARK tile-2) — #2a2a2c
          ======================================================== */}
      <section id="services-section" className="tile tile-dark-2 tile-pad">
        <div className="tile-inner" style={{ textAlign: 'center' }}>
          <p className="t-tagline" style={{ color: '#2997ff', marginBottom: '16px' }}>Services</p>
          <h2 className="t-display-lg" style={{ color: '#ffffff', marginBottom: '12px' }}>What I Can Help You With</h2>
          <p className="t-body" style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '56px', maxWidth: '480px', margin: '0 auto 56px' }}>
            End-to-end digital solutions tailored to your business needs.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1px', backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {[
              {
                title: 'Website Development',
                desc: 'Responsive, fast and SEO-friendly websites that convert.',
                icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2997ff" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              },
              {
                title: 'Web Applications',
                desc: 'Custom web-based systems tailored to your business.',
                icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2997ff" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
              },
              {
                title: 'Booking & Reservation',
                desc: 'Online booking systems for hotels, resorts, and services.',
                icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2997ff" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              },
              {
                title: 'E-commerce Solutions',
                desc: 'Secure and scalable online stores that drive sales.',
                icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2997ff" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              },
              {
                title: 'Mobile App Development',
                desc: 'Cross-platform mobile apps for Android and iOS.',
                icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2997ff" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
              },
              {
                title: 'UI/UX Design',
                desc: 'Clean, modern and user-centered designs.',
                icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2997ff" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              },
            ].map((service, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: '#272729',
                  padding: '40px 32px',
                  textAlign: 'left',
                  transition: 'background-color 0.2s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#2f2f31'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#272729'}
              >
                <div style={{ marginBottom: '20px' }}>{service.icon}</div>
                <h3 className="t-body-strong" style={{ color: '#ffffff', marginBottom: '8px' }}>{service.title}</h3>
                <p className="t-caption" style={{ color: 'rgba(255,255,255,0.55)', margin: 0 }}>{service.desc}</p>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '40px' }}>
            <button onClick={() => setCurrentPage('menu')} className="btn-primary btn-apple">
              Explore All Services
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================
          TILE 4 — FEATURED PROJECTS (PARCHMENT) — #f5f5f7
          ======================================================== */}
      <section id="projects-section" className="tile tile-parchment tile-pad">
        <div className="tile-inner-lg">
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '48px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <p className="t-tagline" style={{ color: '#0066cc', marginBottom: '12px' }}>Featured Projects</p>
              <h2 className="t-display-lg" style={{ color: '#1d1d1f', margin: 0 }}>Some Things I've Built</h2>
            </div>
          </div>

          {/* ── FEATURED PROJECT — LUMINA POS ── */}
          <a
            href="https://pos-1-fg7b.onrender.com/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: 'none', display: 'block' }}
          >
            <div
              className="util-card"
              style={{ overflow: 'hidden', padding: 0, borderRadius: '20px', marginBottom: '24px', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 16px 48px rgba(79,70,229,0.18)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>

                {/* Left — screenshot */}
                <div style={{ position: 'relative', minHeight: '320px', overflow: 'hidden', backgroundColor: '#4f46e5' }}>
                  <img
                    src="/assets/images/hero/lumina.png"
                    alt="LUMINA POS"
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill' }}
                  />
                  {/* Gradient fade into right panel */}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, transparent 70%, rgba(255,255,255,0.06) 100%)' }} />
                  {/* Badge */}
                  <span style={{
                    position: 'absolute', top: '16px', left: '16px',
                    backgroundColor: '#4f46e5', color: '#ffffff',
                    fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em',
                    padding: '4px 12px', borderRadius: '9999px', textTransform: 'uppercase',
                  }}>Featured Project</span>
                </div>

                {/* Right — narrative */}
                <div style={{ padding: '36px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: '#4f46e5', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>Point of Sale System · SaaS</p>
                  <h3 style={{ fontSize: '26px', fontWeight: 700, color: '#1d1d1f', margin: '0 0 16px', lineHeight: 1.2 }}>LUMINA POS</h3>

                  <p style={{ fontSize: '14px', lineHeight: 1.8, color: '#6e6e73', marginBottom: '14px' }}>
                    When I started building LUMINA POS, I wasn't trying to create just another point-of-sale system. I wanted to solve a problem I kept seeing among small and medium-sized businesses in the Philippines—expensive software, complicated setups, and limited access to modern business tools.
                  </p>
                  <p style={{ fontSize: '14px', lineHeight: 1.8, color: '#6e6e73', marginBottom: '14px' }}>
                    As the platform evolved, LUMINA POS became more than just a POS—it grew into a complete SaaS ecosystem for SMEs. It now includes inventory management, sales analytics, customer management, online reservations, digital payments, reporting, and AI-powered business automation.
                  </p>
                  <p style={{ fontSize: '14px', lineHeight: 1.8, color: '#6e6e73', marginBottom: '24px' }}>
                    Today, LUMINA POS is available as a SaaS subscription for just <strong style={{ color: '#1d1d1f' }}>USD $30/month</strong>, with full source code licensing available for a one-time fee of <strong style={{ color: '#1d1d1f' }}>USD  $9,000</strong>.
                  </p>

                  {/* Pricing pills */}
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '24px' }}>
                    <span style={{ backgroundColor: '#ede9fe', color: '#4f46e5', fontSize: '12px', fontWeight: 600, padding: '6px 14px', borderRadius: '9999px' }}>$30 / month SaaS</span>
                    <span style={{ backgroundColor: '#f3f4f6', color: '#374151', fontSize: '12px', fontWeight: 600, padding: '6px 14px', borderRadius: '9999px' }}> $9,000 Source License</span>
                  </div>

                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    color: '#4f46e5', fontSize: '13px', fontWeight: 600,
                  }}>
                    View Live Demo →
                  </span>
                </div>
              </div>
            </div>
          </a>

          {/* ── FEATURED PROJECT — NORTH HOMES PENSIONE ── */}
          <a
            href="https://www.northomespensione.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: 'none', display: 'block', marginBottom: '24px' }}
          >
            <div
              className="util-card"
              style={{ overflow: 'hidden', padding: 0, borderRadius: '20px', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 16px 48px rgba(13,148,136,0.18)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>

                {/* Left — narrative (flipped for visual variety) */}
                <div className="order-2 md:order-1" style={{ padding: '36px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: '#0d9488', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>Hotel Management System · AI-Powered</p>
                  <h3 style={{ fontSize: '26px', fontWeight: 700, color: '#1d1d1f', margin: '0 0 16px', lineHeight: 1.2 }}>Hotel Booking &amp; Management</h3>

                  <p style={{ fontSize: '14px', lineHeight: 1.8, color: '#6e6e73', marginBottom: '14px' }}>
                    My Hotel Booking Management System was developed from real-world hospitality experience. Having worked in the hotel industry in Boracay, I gained hands-on knowledge of front office operations, reservations, guest services, and property management — becoming proficient in <strong style={{ color: '#1d1d1f' }}>Fidelio</strong> and other industry-standard systems.
                  </p>
                  <p style={{ fontSize: '14px', lineHeight: 1.8, color: '#6e6e73', marginBottom: '14px' }}>
                    The system streamlines reservations, room management, guest profiles, billing, and reporting through an intuitive interface — enhanced with <strong style={{ color: '#1d1d1f' }}>AI-powered features</strong> to automate tasks, generate intelligent reports, and improve the overall guest experience.
                  </p>
                  <p style={{ fontSize: '14px', lineHeight: 1.8, color: '#6e6e73', marginBottom: '24px' }}>
                    Available as a complete software license for <strong style={{ color: '#1d1d1f' }}>USD $4,000</strong>, or with full source code ownership for <strong style={{ color: '#1d1d1f' }}>USD  $9,000</strong> — enterprise-grade hotel technology at a fraction of traditional costs.
                  </p>

                  {/* Pricing pills */}
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '24px' }}>
                    <span style={{ backgroundColor: '#ccfbf1', color: '#0d9488', fontSize: '12px', fontWeight: 600, padding: '6px 14px', borderRadius: '9999px' }}>$4,000 Software License</span>
                    <span style={{ backgroundColor: '#f3f4f6', color: '#374151', fontSize: '12px', fontWeight: 600, padding: '6px 14px', borderRadius: '9999px' }}> $9,000 Source Code</span>
                  </div>

                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#0d9488', fontSize: '13px', fontWeight: 600 }}>
                    Visit Website →
                  </span>
                </div>

                {/* Right — screenshot */}
                <div className="order-1 md:order-2" style={{ position: 'relative', minHeight: '320px', overflow: 'hidden', backgroundColor: '#0d9488' }}>
                  <img
                    src="/assets/images/hero/northomes.jpg"
                    alt="North Homes Pensione"
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill' }}
                  />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to left, transparent 70%, rgba(255,255,255,0.06) 100%)' }} />
                  <span style={{
                    position: 'absolute', top: '16px', right: '16px',
                    backgroundColor: '#0d9488', color: '#ffffff',
                    fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em',
                    padding: '4px 12px', borderRadius: '9999px', textTransform: 'uppercase',
                  }}>Featured Project</span>
                </div>
              </div>
            </div>
          </a>

          {/* ── FEATURED PROJECT — KINGS TOURIST TRANSPORT ── */}
          <a
            href="https://www.kingstouristtransport.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: 'none', display: 'block' }}
          >
            <div
              className="util-card"
              style={{ overflow: 'hidden', padding: 0, borderRadius: '20px', marginBottom: '24px' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 16px 48px rgba(37,99,235,0.18)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>

                {/* Left — image */}
                <div style={{ position: 'relative', minHeight: '320px', overflow: 'hidden', backgroundColor: '#1e40af' }}>
                  <img
                    src="/assets/images/hero/king.png"
                    alt="Kings Tourist Transport Services"
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill' }}
                  />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to left, transparent 70%, rgba(255,255,255,0.06) 100%)' }} />
                  <span style={{
                    position: 'absolute', top: '16px', left: '16px',
                    backgroundColor: '#2563eb', color: '#ffffff',
                    fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em',
                    padding: '4px 12px', borderRadius: '9999px', textTransform: 'uppercase',
                  }}>Featured Project</span>
                </div>

                {/* Right — narrative */}
                <div style={{ padding: '36px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>Transport Booking System · AI-Powered</p>
                  <h3 style={{ fontSize: '26px', fontWeight: 700, color: '#1d1d1f', margin: '0 0 16px', lineHeight: 1.2 }}>Kings Tourist Transport Services</h3>

                  <p style={{ fontSize: '14px', lineHeight: 1.8, color: '#6e6e73', marginBottom: '14px' }}>
                    A comprehensive digital platform designed to modernize transport reservation and business operations. Customers get a seamless online booking experience while administrators manage reservations, vehicles, drivers, and daily operations from a centralized dashboard.
                  </p>
                  <p style={{ fontSize: '14px', lineHeight: 1.8, color: '#6e6e73', marginBottom: '14px' }}>
                    Features include <strong style={{ color: '#1d1d1f' }}>AI-powered booking assistance</strong>, automated invoice generation, corporate billing, payment gateway integration, GPS &amp; vehicle tracking, driver scheduling, SMS/email notifications, and interactive analytics dashboards for real-time financial reporting.
                  </p>
                  <p style={{ fontSize: '14px', lineHeight: 1.8, color: '#6e6e73', marginBottom: '24px' }}>
                    Available as a one-time software license for <strong style={{ color: '#1d1d1f' }}>US$3,000</strong>, or with the complete source code for <strong style={{ color: '#1d1d1f' }}>US $9,000</strong> — scalable, secure, and customizable for fleets of any size.
                  </p>

                  {/* Pricing pills */}
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '24px' }}>
                    <span style={{ backgroundColor: '#dbeafe', color: '#2563eb', fontSize: '12px', fontWeight: 600, padding: '6px 14px', borderRadius: '9999px' }}>$3,000 Software License</span>
                    <span style={{ backgroundColor: '#f3f4f6', color: '#374151', fontSize: '12px', fontWeight: 600, padding: '6px 14px', borderRadius: '9999px' }}> $9,000 Source Code</span>
                  </div>

                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#2563eb', fontSize: '13px', fontWeight: 600 }}>
                    Visit kingstouristtransport.com →
                  </span>
                </div>
              </div>
            </div>
          </a>

          {/* ── FEATURED PROJECT — BYAHERO ── */}
          <div
            className="util-card"
            style={{ overflow: 'hidden', padding: 0, borderRadius: '20px', marginBottom: '24px' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 16px 48px rgba(234,88,12,0.18)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>

              {/* Left — image */}
              <div style={{ position: 'relative', minHeight: '320px', overflow: 'hidden', backgroundColor: '#ea580c' }}>
                <img
                  src="/assets/images/hero/byahero.png"
                  alt="BYAHERO"
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill' }}
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to left, transparent 70%, rgba(255,255,255,0.06) 100%)' }} />
                <span style={{
                  position: 'absolute', top: '16px', left: '16px',
                  backgroundColor: '#c2410c', color: '#ffffff',
                  fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em',
                  padding: '4px 12px', borderRadius: '9999px', textTransform: 'uppercase',
                }}>Featured Project</span>
              </div>

              {/* Right — narrative */}
              <div style={{ padding: '36px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: '#ea580c', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>Ride-Hailing App · Local Mobility</p>
                <h3 style={{ fontSize: '26px', fontWeight: 700, color: '#1d1d1f', margin: '0 0 16px', lineHeight: 1.2 }}>BYAHERO</h3>

                <p style={{ fontSize: '14px', lineHeight: 1.8, color: '#6e6e73', marginBottom: '14px' }}>
                  I built BYAHERO as a modern ride-hailing platform inspired by services like Uber, but with a different mission—to serve small cities and municipalities that are often overlooked by major transportation providers. I saw the need for an affordable, reliable, and locally managed ride-hailing solution that could improve mobility while creating new income opportunities for drivers. Today, BYAHERO is successfully operating in Northern Bogo, Cebu, proving that world-class transportation technology doesn't have to be limited to large metropolitan areas.
                </p>
                <p style={{ fontSize: '14px', lineHeight: 1.8, color: '#6e6e73', marginBottom: '14px' }}>
                  BYAHERO is a complete transportation ecosystem featuring dedicated mobile applications for Passengers and Riders, supported by a powerful Web-based Admin Dashboard. Passengers can easily book rides, track their drivers in real time, view trip history, and enjoy a seamless booking experience. Riders have access to trip management, earnings tracking, navigation tools, and account management, while administrators can oversee bookings, verify drivers, configure fares, monitor operations, generate reports, and manage the entire platform from a centralized dashboard. Built with scalability in mind, BYAHERO can be deployed and customized for virtually any city or municipality around the world.
                </p>
                <p style={{ fontSize: '14px', lineHeight: 1.8, color: '#6e6e73', marginBottom: '24px' }}>
                  I designed BYAHERO not only as a software product but as a business opportunity for entrepreneurs, transport cooperatives, and organizations looking to launch their own ride-hailing service. The platform is available through a one-time deployment license for <strong style={{ color: '#1d1d1f' }}>US$4,000</strong>, allowing clients to operate the system under their own brand. For those seeking complete ownership and unlimited customization, the full source code is available for <strong style={{ color: '#1d1d1f' }}>US$9,000</strong>. Whether you're starting a local transport network or expanding into new markets, BYAHERO provides a proven, production-ready solution that is built to grow with your business.
                </p>

                {/* Pricing pills */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '24px' }}>
                  <span style={{ backgroundColor: '#ffedd5', color: '#ea580c', fontSize: '12px', fontWeight: 600, padding: '6px 14px', borderRadius: '9999px' }}>$4,000 Software License</span>
                  <span style={{ backgroundColor: '#f3f4f6', color: '#374151', fontSize: '12px', fontWeight: 600, padding: '6px 14px', borderRadius: '9999px' }}>$9,000 Source Code</span>
                </div>

                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#ea580c', fontSize: '13px', fontWeight: 600 }}>
                  Inquire About This System →
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          TILE 5 — CONTACT (DARK) — #272729
          ======================================================== */}
      <section id="contact-section" className="tile tile-dark tile-pad">
        <div className="tile-inner" style={{ textAlign: 'center' }}>
          <p className="t-tagline" style={{ color: '#2997ff', marginBottom: '16px' }}>Get in Touch</p>
          <h2 className="t-display-lg" style={{ color: '#ffffff', marginBottom: '20px' }}>Let's Build Something Great</h2>
          <p className="t-body" style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '48px', maxWidth: '480px', margin: '0 auto 48px' }}>
            Have a project in mind? I'd love to hear about it. Send me a message and let's get started.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="mailto:hello@rogertonacao.com" className="btn-primary btn-apple">
              Email Me
            </a>
            <a href="https://www.facebook.com/rodge.tonacao" target="_blank" rel="noopener noreferrer" className="btn-secondary-dark btn-apple">
              Message on Facebook
            </a>
          </div>

          {/* Contact details */}
          <div style={{ display: 'flex', gap: '48px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '56px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '40px' }}>
            {[
              { label: 'Phone', value: '+63 927 623 0491' },
              { label: 'Email', value: 'hello@rogertonacao.com' },
              { label: 'Location', value: 'Bogo City, Cebu, PH' },
            ].map((item, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <p className="t-caption" style={{ color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>{item.label}</p>
                <p className="t-body-strong" style={{ color: '#ffffff', margin: 0 }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================
          FOOTER — PARCHMENT #f5f5f7  (Apple footer pattern)
          ======================================================== */}
      <footer id="location-section" className="tile tile-parchment" style={{ padding: '64px 24px 40px', borderTop: '1px solid #e0e0e0' }}>
        <div className="tile-inner-lg">
          {/* 4-column dense-link grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '32px', marginBottom: '40px' }}>

            {/* Brand column */}
            <div>
              <p className="footer-col-head" style={{ fontSize: '15px', marginBottom: '8px' }}>Roger Tonacao</p>
              <p className="t-fine-print" style={{ color: '#7a7a7a', lineHeight: 1.6, marginBottom: '16px' }}>
                Freelance Web Developer &amp; Digital Solutions Architect based in the Philippines.
              </p>
              {/* Social links */}
              <div style={{ display: 'flex', gap: '10px' }}>
                {[
                  { label: 'Facebook', href: 'https://www.facebook.com/rodge.tonacao', icon: <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg> },
                  { label: 'Instagram', href: 'https://www.instagram.com/rod110977', icon: <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg> },
                  { label: 'X', icon: <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg> },
                  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/roger-tonacao', icon: <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg> },
                ].map(social => (
                  <a
                    key={social.label}
                    href={social.href || '#'}
                    target={social.href ? "_blank" : undefined}
                    rel={social.href ? "noopener noreferrer" : undefined}
                    title={social.label}
                    style={{
                      width: '32px', height: '32px',
                      backgroundColor: 'rgba(0,0,0,0.06)',
                      borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#333333',
                      textDecoration: 'none',
                      transition: 'background-color 0.2s ease',
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,102,204,0.12)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.06)'}
                  >
                    {social.icon}
                  </a>
                ))}
              </div>
            </div>

            {/* Services column */}
            <div className="footer-col">
              <p className="footer-col-head">Services</p>
              <a href="#">Website Development</a>
              <a href="#">Web Applications</a>
              <a href="#">Booking Systems</a>
              <a href="#">E-commerce</a>
              <a href="#">Mobile Apps</a>
            </div>

            {/* Company column */}
            <div className="footer-col">
              <p className="footer-col-head">Company</p>
              <button onClick={() => setCurrentPage('home')}>Home</button>
              <button onClick={() => { setCurrentPage('home'); setTimeout(() => document.getElementById('services-section')?.scrollIntoView({ behavior: 'smooth' }), 100); }}>Services</button>
              <button onClick={() => setCurrentPage('my-appointment')}>My Appointment</button>
              <button onClick={() => setCurrentPage('admin')}>Admin</button>
            </div>

            {/* Contact column */}
            <div className="footer-col">
              <p className="footer-col-head">Contact</p>
              <a href="tel:+639276230491">+63 927 623 0491</a>
              <a href="mailto:hello@rogertonacao.com">hello@rogertonacao.com</a>
              <p className="t-fine-print" style={{ color: '#7a7a7a', lineHeight: 1.6 }}>San Vicente, Bogo City<br />Cebu, Philippines 6010</p>
            </div>
          </div>

          {/* Legal row */}
          <div style={{ borderTop: '1px solid #e0e0e0', paddingTop: '20px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
            <p className="t-fine-print" style={{ color: '#7a7a7a' }}>Copyright © 2026 Roger Tonacao. All rights reserved.</p>
            <div style={{ display: 'flex', gap: '20px' }}>
              <a href="#" className="t-fine-print link-blue">Privacy Policy</a>
              <a href="#" className="t-fine-print link-blue">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}

// Menu Page
function MenuPage({ selectedCategory, setSelectedCategory, searchQuery, menuData, isLoading }) {
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);

  // Fetch services from API
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/services');
        const data = await response.json();
        if (data.success) {
          setServices(data.services);
        }
      } catch (error) {
        console.error('Error fetching services:', error);
      } finally {
        setLoadingServices(false);
      }
    };
    fetchServices();
  }, []);

  // Service icons mapping
  const serviceIcons = {
    'General Consultation': '🩺',
    'Dental Cleaning': '🦷',
    'Eye Examination': '👁️',
    'Vaccination': '💉',
    'Laboratory Tests': '🧪',
    'Physical Therapy': '🏃',
    'default': '🏥'
  };

  // Service colors for deck cards
  const deckColors = [
    'from-[#E4FE7B] to-[#c5e04d]',
    'from-amber-100 to-amber-200',
    'from-orange-100 to-orange-200',
    'from-rose-100 to-rose-200',
    'from-violet-100 to-violet-200',
    'from-cyan-100 to-cyan-200',
  ];

  return (
    <div className="bg-stone-900 min-h-screen">
      {/* Hero Section */}
      <div className="relative py-16 px-8 text-center bg-gradient-to-b from-stone-800 to-stone-900">
        <div className="max-w-3xl mx-auto">
          <span className="inline-block px-4 py-1 bg-[#E4FE7B]/20 text-[#E4FE7B] rounded-full text-sm font-medium mb-4">
            Our Healthcare Services
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            Quality Care for Your
            <span className="text-[#E4FE7B]"> Well-being</span>
          </h1>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            Comprehensive healthcare services tailored to meet your needs. Scroll down to explore our services.
          </p>
        </div>
        {/* Scroll indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-[#E4FE7B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </div>

      {/* Sticky Deck Services */}
      <div className="relative px-4 md:px-8 pb-32">
        {loadingServices ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#E4FE7B] mb-4"></div>
            <p className="text-xl text-white/80 font-medium">Loading services...</p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            {services.map((service, index) => (
              <div
                key={service.id}
                className="sticky mb-4"
                style={{
                  top: `${160 + index * 20}px`,
                  zIndex: index + 1
                }}
              >
                <div
                  className={`bg-gradient-to-br ${deckColors[index % deckColors.length]} rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-300 hover:scale-[1.02]`}
                  style={{
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                  }}
                >
                  <div className="p-4 md:p-8">
                    {/* Always horizontal: Icon LEFT, Text RIGHT */}
                    <div className="flex flex-row items-start md:items-center gap-3 md:gap-6">
                      {/* Icon - Left side */}
                      <div className="flex-shrink-0">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-24 md:h-24 bg-white/80 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg">
                          <span className="text-2xl sm:text-3xl md:text-5xl">
                            {serviceIcons[service.name] || serviceIcons['default']}
                          </span>
                        </div>
                        {/* Mobile card number under icon */}
                        <div className="md:hidden mt-1 text-center">
                          <span className="text-xs font-bold text-stone-500">
                            #{String(index + 1).padStart(2, '0')}
                          </span>
                        </div>
                      </div>

                      {/* Content - Right side */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2 md:gap-3 mb-1 md:mb-2">
                          <h3 className="text-sm sm:text-base md:text-2xl font-bold text-stone-900 leading-tight">
                            {service.name}
                          </h3>
                          <span className="px-1.5 py-0.5 sm:px-2 sm:py-0.5 md:px-3 md:py-1 bg-stone-900/10 text-stone-700 rounded-full text-[10px] sm:text-xs md:text-sm font-medium">
                            {service.duration}min
                          </span>
                        </div>
                        <p className="text-stone-600 mb-2 md:mb-4 text-[11px] sm:text-xs md:text-base line-clamp-2">
                          {service.description || 'Professional healthcare service.'}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 md:gap-4">
                          <div className="text-base sm:text-lg md:text-3xl font-bold text-stone-900">
                            ₱{parseFloat(service.price).toLocaleString()}
                          </div>
                          <button
                            onClick={() => document.getElementById('appointment-section')?.scrollIntoView({ behavior: 'smooth' })}
                            className="px-2 py-1.5 sm:px-3 sm:py-2 md:px-6 md:py-3 bg-stone-900 text-[#E4FE7B] rounded-lg md:rounded-xl font-semibold hover:bg-stone-800 transition-all flex items-center gap-1 md:gap-2 shadow-lg text-[10px] sm:text-xs md:text-base"
                          >
                            <svg className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="hidden sm:inline">Book Now</span>
                            <span className="sm:hidden">Book</span>
                          </button>
                        </div>
                      </div>

                      {/* Card Number - Desktop only */}
                      <div className="hidden md:flex flex-shrink-0 w-16 h-16 bg-stone-900/10 rounded-full items-center justify-center">
                        <span className="text-2xl font-bold text-stone-700">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom accent line */}
                  <div className="h-1 bg-stone-900/20"></div>
                </div>
              </div>
            ))}

            {services.length === 0 && (
              <div className="text-center py-16">
                <p className="text-2xl text-white/40">No services available</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CTA Section */}
      <div className="bg-stone-800 py-16 px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Ready to Book Your Appointment?
          </h2>
          <p className="text-white/60 mb-6">
            Our team of healthcare professionals is ready to provide you with the best care.
          </p>
          <button
            onClick={() => document.getElementById('appointment-section')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-8 py-4 bg-[#E4FE7B] text-stone-900 rounded-xl font-bold text-lg hover:bg-[#d4ee6b] transition-all shadow-lg hover:shadow-xl"
          >
            Schedule Now
          </button>
        </div>
      </div>
    </div>
  );
}

// Menu Item Card (Legacy - kept for compatibility)
function MenuItem({ item }) {
  const { addToCart } = useCart();

  return (
    <div className="bg-[#ffffe6] rounded-xl shadow-lg hover:shadow-xl transition-all overflow-hidden group w-full flex flex-row h-auto min-h-[273px] sm:min-h-[293px] hover:-translate-y-1">
      {/* Left side - Product Image */}
      <div className="bg-stone-100 p-3 sm:p-4 flex items-center justify-center w-48 sm:w-54 md:w-60 flex-shrink-0 relative">
        {item.image && item.image.startsWith('assets/') ? (
          <img src={item.image} alt={item.name} className="object-contain w-full h-48 sm:h-54 md:h-60 rounded-lg group-hover:scale-110 transition-transform duration-300" />
        ) : (
          <div className="text-7xl sm:text-8xl md:text-9xl group-hover:scale-110 transition-transform duration-300">{item.image}</div>
        )}
        {item.popular && (
          <span className="absolute top-2 right-2 bg-stone-900 text-[#E4FE7B] px-2 py-1 rounded-full text-xs font-bold">
            Popular
          </span>
        )}
      </div>

      {/* Right side - Product Details */}
      <div className="p-4 sm:p-5 md:p-6 flex flex-col justify-start flex-1 min-w-0">
        <div className="mb-4">
          <h3 className="text-base sm:text-lg md:text-xl font-bold text-stone-900 mb-2 break-words">{item.name}</h3>
          <p className="text-stone-600 text-sm sm:text-base mb-3 line-clamp-2 font-normal">{item.description}</p>
        </div>
        <div className="flex flex-col gap-3 mt-auto">
          {item.sizes ? (
            <span className="text-sm sm:text-base md:text-lg font-semibold text-stone-900 break-words">
              From Php {Math.min(...item.sizes.map(s => s.price)).toFixed(2)}
            </span>
          ) : (
            <span className="text-sm sm:text-base md:text-lg font-semibold text-stone-900 break-words">Php {item.price.toFixed(2)}</span>
          )}
          <button
            onClick={() => addToCart(item)}
            className="btn-animated bg-stone-900 text-[#E4FE7B] px-4 sm:px-5 py-3 rounded-lg hover:bg-stone-800 transition-all flex items-center justify-center space-x-2 text-sm font-semibold w-full whitespace-nowrap"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Book Now</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Cart Drawer
function CartDrawer({ setShowCart, setCurrentPage }) {
  const { cartItems } = useCart();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end" onClick={() => setShowCart(false)}>
      <div className="bg-gray-100 w-full max-w-md h-full overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Your Cart</h2>
            <button onClick={() => setShowCart(false)} className="text-gray-500 hover:text-gray-700">
              <X className="w-6 h-6" />
            </button>
          </div>

          {cartItems.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Your cart is empty</p>
            </div>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                {cartItems.map((item, index) => (
                  <CartItemCard key={`${item.id}-${item.selectedSize || 'default'}-${index}`} item={item} />
                ))}
              </div>
              <button
                onClick={() => {
                  setShowCart(false);
                  setCurrentPage('cart');
                }}
                className="w-full bg-green-600 text-white py-4 rounded-full font-bold hover:bg-green-700 transition-all"
              >
                View Full Cart
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Cart Page
function CartPage({ setCurrentPage }) {
  const { cartItems, getTotalPrice } = useCart();
  const deliveryFee = 4.99;
  const tax = getTotalPrice() * 0.08;
  const total = getTotalPrice() + deliveryFee + tax;

  if (cartItems.length === 0) {
    return (
      <div className="bg-gray-50 min-h-screen py-8">
        <div className="w-full px-8 text-center">
          <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-800 mb-2">Your cart is empty</h2>
          <p className="text-sm text-gray-500 mb-6">Add some items to get started</p>
          <button
            onClick={() => setCurrentPage('menu')}
            className="bg-green-600 text-white px-6 py-2.5 rounded-md text-sm font-medium hover:bg-green-700 transition-all"
          >
            Browse Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="w-full px-8">
        <h1 className="text-2xl font-medium text-gray-800 mb-8 text-center">Your Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            {cartItems.map((item, index) => (
              <CartItemCard key={`${item.id}-${item.selectedSize || 'default'}-${index}`} item={item} detailed />
            ))}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-5 sticky top-[160px] md:top-[120px]">
              <h3 className="text-base font-medium text-gray-800 mb-4">Order Summary</h3>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>Php {getTotalPrice().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Delivery Fee</span>
                  <span>Php {deliveryFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Tax (8%)</span>
                  <span>Php {tax.toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="flex justify-between text-base font-medium">
                    <span>Total</span>
                    <span className="text-green-600">Php {total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setCurrentPage('checkout')}
                className="w-full bg-green-600 text-white py-2.5 rounded-md text-sm font-medium hover:bg-green-700 transition-all"
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Cart Item Card
function CartItemCard({ item, detailed = false }) {
  const { updateQuantity, removeFromCart } = useCart();

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 flex items-center gap-4">
      <div className="bg-gray-50 rounded-md flex items-center justify-center w-16 h-16">
        {item.image && item.image.startsWith('assets/') ? (
          <img src={item.image} alt={item.name} className="object-contain w-full h-full rounded" />
        ) : (
          <div className="text-3xl">{item.image}</div>
        )}
      </div>
      <div className="flex-1">
        <h3 className="font-medium text-gray-800 text-sm">{item.name}</h3>
        {item.selectedSize && <p className="text-gray-400 text-xs">Size: {item.selectedSize}</p>}
        <p className="text-green-600 font-medium text-sm">Php {item.price.toFixed(2)}</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => updateQuantity(item.id, item.quantity - 1, item.selectedSize)}
          className="bg-gray-100 hover:bg-gray-200 rounded-md p-1.5 transition-all"
        >
          <Minus className="w-3 h-3 text-gray-600" />
        </button>
        <span className="font-medium text-sm w-6 text-center">{item.quantity}</span>
        <button
          onClick={() => updateQuantity(item.id, item.quantity + 1, item.selectedSize)}
          className="bg-green-600 hover:bg-green-700 text-white rounded-md p-1.5 transition-all"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
      {detailed && (
        <button
          onClick={() => removeFromCart(item.id, item.selectedSize)}
          className="text-gray-400 hover:text-red-500 p-1 transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// Checkout Page
function CheckoutPage({ setCurrentPage, clearCart }) {
  const { getTotalPrice, cartItems } = useCart();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    zipCode: '',
    paymentMethod: 'cash',
    paymentReference: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState('checking'); // 'checking', 'subscribed', 'not-subscribed', 'denied'

  // Check notification subscription status on mount
  useEffect(() => {
    const checkNotificationStatus = async () => {
      try {
        if (window.OneSignalDeferred) {
          window.OneSignalDeferred.push(async function (OneSignal) {
            const permission = await OneSignal.Notifications.permission;
            const playerId = await OneSignal.User.PushSubscription.id;

            if (permission === false) {
              setNotificationStatus('denied');
            } else if (playerId) {
              setNotificationStatus('subscribed');
            } else {
              setNotificationStatus('not-subscribed');
            }
          });
        } else {
          setNotificationStatus('not-subscribed');
        }
      } catch (err) {
        console.log('Error checking notification status:', err);
        setNotificationStatus('not-subscribed');
      }
    };

    checkNotificationStatus();
  }, []);

  // Function to request notification permission
  const requestNotificationPermission = async () => {
    try {
      if (window.OneSignalDeferred) {
        window.OneSignalDeferred.push(async function (OneSignal) {
          await OneSignal.Notifications.requestPermission();
          // Check status after requesting
          const playerId = await OneSignal.User.PushSubscription.id;
          if (playerId) {
            setNotificationStatus('subscribed');
          } else {
            const permission = await OneSignal.Notifications.permission;
            if (permission === false) {
              setNotificationStatus('denied');
            }
          }
        });
      }
    } catch (err) {
      console.log('Error requesting notification permission:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate payment reference for Bank Transfer only (GCash uses PayMongo)
    if (formData.paymentMethod === 'bank' && !formData.paymentReference.trim()) {
      alert('Please enter the Bank reference number.');
      return;
    }

    setIsSubmitting(true);

    try {
      const deliveryFee = 4.99;
      const tax = getTotalPrice() * 0.08;
      const total = getTotalPrice() + deliveryFee + tax;

      // Format cart items as a string
      const itemsList = cartItems.map(item =>
        `${item.name}${item.selectedSize ? ` (${item.selectedSize})` : ''} (x${item.quantity}) - Php ${(item.price * item.quantity).toFixed(2)}`
      ).join(', ');

      // Format payment method display
      let paymentMethodDisplay = formData.paymentMethod;
      if (formData.paymentMethod === 'cash') {
        paymentMethodDisplay = 'Cash on Delivery';
      } else if (formData.paymentMethod === 'gcash') {
        paymentMethodDisplay = 'GCash';
      } else if (formData.paymentMethod === 'bank') {
        paymentMethodDisplay = `Bank Transfer (Ref: ${formData.paymentReference})`;
      }

      // Get OneSignal Player ID for customer notifications
      let playerId = null;
      try {
        if (window.OneSignalDeferred) {
          await new Promise((resolve) => {
            window.OneSignalDeferred.push(async function (OneSignal) {
              playerId = await OneSignal.User.PushSubscription.id;
              resolve();
            });
          });
        }
      } catch (err) {
        console.log('Could not get OneSignal player ID:', err);
      }

      // Send data to Google Sheets
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
          fullName: formData.name,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          barangay: formData.zipCode,
          paymentMethod: paymentMethodDisplay,
          paymentReference: formData.paymentReference || 'N/A',
          playerId: playerId || '',
          items: itemsList,
          subtotal: getTotalPrice().toFixed(2),
          deliveryFee: deliveryFee.toFixed(2),
          tax: tax.toFixed(2),
          total: total.toFixed(2)
        })
      });

      const result = await response.json();

      if (result.success) {
        // If GCash payment, redirect to PayMongo checkout
        if (result.requiresPayment && result.paymentUrl) {
          // Store order number for later reference
          localStorage.setItem('pendingOrder', result.orderNumber);
          // Redirect to GCash payment page
          window.location.href = result.paymentUrl;
        } else {
          // Clear cart and go to confirmation for non-GCash payments
          if (clearCart) clearCart();
          setCurrentPage('confirmation');
        }
      } else {
        alert('Error: ' + (result.error || 'Failed to process order'));
      }
    } catch (error) {
      console.error('Error processing order:', error);
      alert('There was an error processing your order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deliveryFee = 4.99;
  const tax = getTotalPrice() * 0.08;
  const total = getTotalPrice() + deliveryFee + tax;

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="w-full px-8">
        <h1 className="text-2xl font-medium text-gray-800 mb-8 text-center">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6 space-y-6">
              <div>
                <h3 className="text-base font-medium text-gray-700 mb-4">Delivery Address</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Full Name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border border-gray-300 focus:border-green-500 focus:outline-none text-sm"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border border-gray-300 focus:border-green-500 focus:outline-none text-sm"
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border border-gray-300 focus:border-green-500 focus:outline-none text-sm"
                  />
                  <input
                    type="text"
                    placeholder="ZIP Code"
                    required
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border border-gray-300 focus:border-green-500 focus:outline-none text-sm"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Street Address"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-gray-300 focus:border-green-500 focus:outline-none text-sm mt-3"
                />
                <input
                  type="text"
                  placeholder="City"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-gray-300 focus:border-green-500 focus:outline-none text-sm mt-3"
                />
              </div>

              {/* Notification Subscription Prompt */}
              {notificationStatus === 'checking' && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
                    <span className="text-sm text-gray-600">Checking notification status...</span>
                  </div>
                </div>
              )}

              {notificationStatus !== 'subscribed' && notificationStatus !== 'checking' && (
                <div className={`rounded-lg p-4 border-2 ${notificationStatus === 'denied'
                  ? 'bg-red-50 border-red-200'
                  : 'bg-yellow-50 border-yellow-300'
                  }`}>
                  <div className="flex items-start gap-3">
                    <div className="text-2xl flex-shrink-0">
                      {notificationStatus === 'denied' ? '🔕' : '🔔'}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-800 text-sm mb-1">
                        {notificationStatus === 'denied'
                          ? 'Notifications Blocked'
                          : 'Get Order Updates'}
                      </h4>
                      <p className="text-xs text-gray-600 mb-3">
                        {notificationStatus === 'denied'
                          ? 'You\'ve blocked notifications. Enable them in your browser settings to receive real-time order updates.'
                          : 'Enable push notifications to receive real-time updates when your order is being prepared, out for delivery, and delivered!'}
                      </p>
                      {notificationStatus === 'not-subscribed' && (
                        <button
                          type="button"
                          onClick={requestNotificationPermission}
                          className="bg-green-600 text-white px-4 py-2 rounded-md text-xs font-medium hover:bg-green-700 transition-all flex items-center gap-2"
                        >
                          <span>🔔</span>
                          <span>Enable Notifications</span>
                        </button>
                      )}
                      {notificationStatus === 'denied' && (
                        <p className="text-xs text-red-600 font-medium">
                          To enable: Click the lock icon in your browser's address bar → Allow notifications
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {notificationStatus === 'subscribed' && (
                <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">✅</div>
                    <div>
                      <h4 className="font-medium text-green-700 text-sm">Notifications Enabled</h4>
                      <p className="text-xs text-green-600">You'll receive updates when your order status changes!</p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-base font-medium text-gray-700 mb-4">Payment Method</h3>
                <div className="space-y-2">
                  <label className={`flex items-center space-x-3 p-3 border rounded-md cursor-pointer transition-all ${formData.paymentMethod === 'cash' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}>
                    <input
                      type="radio"
                      name="payment"
                      value="cash"
                      checked={formData.paymentMethod === 'cash'}
                      onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value, paymentReference: '' })}
                      className="w-4 h-4 text-green-600"
                    />
                    <span className="text-sm text-gray-700">Cash on Delivery</span>
                  </label>

                  <label className={`flex items-center space-x-3 p-3 border rounded-md cursor-pointer transition-all ${formData.paymentMethod === 'gcash' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}>
                    <input
                      type="radio"
                      name="payment"
                      value="gcash"
                      checked={formData.paymentMethod === 'gcash'}
                      onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                      className="w-4 h-4 text-green-600"
                    />
                    <span className="text-sm text-gray-700">GCash</span>
                  </label>

                  <label className={`flex items-center space-x-3 p-3 border rounded-md cursor-pointer transition-all ${formData.paymentMethod === 'bank' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}>
                    <input
                      type="radio"
                      name="payment"
                      value="bank"
                      checked={formData.paymentMethod === 'bank'}
                      onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                      className="w-4 h-4 text-green-600"
                    />
                    <span className="text-sm text-gray-700">Bank Transfer</span>
                  </label>
                </div>

                {/* Payment Instructions */}
                {formData.paymentMethod === 'cash' && (
                  <div className="mt-4 bg-gray-50 border border-gray-200 rounded-md p-4">
                    <h4 className="font-medium text-gray-700 text-sm mb-2">Cash on Delivery Instructions</h4>
                    <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                      <li>Prepare exact amount if possible</li>
                      <li>Payment will be collected upon delivery</li>
                      <li>Please have your order number ready</li>
                    </ul>
                  </div>
                )}

                {formData.paymentMethod === 'gcash' && (
                  <div className="mt-4 bg-green-50 border border-green-200 rounded-md p-4">
                    <h4 className="font-medium text-gray-700 text-sm mb-3">GCash Payment</h4>
                    <div className="space-y-3">
                      <div className="bg-white rounded-md p-3 border border-green-100">
                        <p className="text-xs text-gray-500 mb-1">Amount to pay:</p>
                        <p className="text-lg font-medium text-green-600">Php {(getTotalPrice() + 4.99 + getTotalPrice() * 0.08).toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <span>Secure payment via PayMongo</span>
                      </div>
                      <div className="text-xs text-gray-600 bg-white rounded-md p-3 border border-green-100">
                        <p className="font-medium mb-2">How it works:</p>
                        <ol className="list-decimal list-inside space-y-1">
                          <li>Click "Place Order" below</li>
                          <li>You'll be redirected to GCash to complete payment</li>
                          <li>After payment, you'll return here automatically</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                )}

                {formData.paymentMethod === 'bank' && (
                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-4">
                    <h4 className="font-medium text-gray-700 text-sm mb-3">Bank Transfer Instructions</h4>
                    <div className="space-y-3">
                      <div className="bg-white rounded-md p-3 border border-blue-100">
                        <p className="text-xs text-gray-500 mb-2">Transfer to:</p>
                        <p className="text-xs text-gray-600">Bank: BDO</p>
                        <p className="text-xs text-gray-600">Account Name: Kuchefnero Restaurant</p>
                        <p className="text-base font-medium text-gray-800">Account #: 1234-5678-9012</p>
                      </div>
                      <div className="bg-white rounded-md p-3 border border-blue-100">
                        <p className="text-xs text-gray-500 mb-1">Amount to transfer:</p>
                        <p className="text-lg font-medium text-blue-600">Php {(getTotalPrice() + 4.99 + getTotalPrice() * 0.08).toFixed(2)}</p>
                      </div>
                      <div className="text-xs text-gray-600 space-y-1">
                        <p className="font-medium">After transfer:</p>
                        <ol className="list-decimal list-inside space-y-1 ml-2">
                          <li>Keep your bank receipt/confirmation</li>
                          <li>Enter the reference number below</li>
                          <li>Send photo of receipt to our contact number</li>
                        </ol>
                      </div>
                      <input
                        type="text"
                        placeholder="Enter Bank Reference Number"
                        value={formData.paymentReference}
                        onChange={(e) => setFormData({ ...formData, paymentReference: e.target.value })}
                        className="w-full px-3 py-2 rounded-md border border-gray-300 focus:border-blue-500 focus:outline-none text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3 rounded-md font-medium transition-all text-sm ${isSubmitting
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
              >
                {isSubmitting ? 'Processing...' : `Place Order - Php ${total.toFixed(2)}`}
              </button>
            </form>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-5 sticky top-[160px] md:top-[120px]">
              <h3 className="text-base font-medium text-gray-800 mb-4">Order Summary</h3>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>Php {getTotalPrice().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Delivery Fee</span>
                  <span>Php {deliveryFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Tax (8%)</span>
                  <span>Php {tax.toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="flex justify-between text-base font-medium">
                    <span>Total</span>
                    <span className="text-green-600">Php {total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Confirmation Page
function ConfirmationPage({ setCurrentPage, orderNumber, paymentStatus }) {
  // Generate order number if not provided (for non-GCash orders)
  const displayOrderNumber = orderNumber || `ORD-${Date.now()}`;

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="w-full px-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-xl font-medium text-gray-800 mb-1">
            {paymentStatus === 'success' ? 'Payment Successful!' : 'Order Confirmed'}
          </h1>
          <p className="text-sm text-gray-500">
            {paymentStatus === 'success' ? 'Your GCash payment has been received' : 'Thank you for your order'}
          </p>
        </div>

        {/* Order Number */}
        <div className="bg-green-600 rounded-lg p-4 mb-6 text-center">
          <div className="text-xs text-green-200 mb-1">Order Number</div>
          <div className="text-xl font-medium text-white">{displayOrderNumber}</div>
        </div>

        {/* Order Status */}
        <div className="bg-white rounded-lg p-5 mb-6 shadow-sm">
          <h3 className="text-base font-medium text-gray-800 mb-4">Order Status</h3>

          <div className="space-y-0">
            {/* Order Confirmed */}
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="w-0.5 h-8 bg-green-500"></div>
              </div>
              <div className="pb-3">
                <div className="text-sm font-medium text-gray-800">Order Received</div>
                <div className="text-xs text-gray-500">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}, {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</div>
              </div>
            </div>

            {/* Preparing */}
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 rounded-full border-2 border-green-500 flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                </div>
                <div className="w-0.5 h-8 bg-gray-200"></div>
              </div>
              <div className="pb-3">
                <div className="text-sm font-medium text-gray-800">Preparing your order</div>
                <div className="text-xs text-gray-500">Estimated: 15-20 mins</div>
              </div>
            </div>

            {/* Out for Delivery */}
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex-shrink-0"></div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Out for delivery</div>
                <div className="text-xs text-gray-400">Estimated arrival: 25-30 mins</div>
              </div>
            </div>
          </div>
        </div>

        {/* SMS Notice */}
        <div className="text-center mb-6">
          <p className="text-xs text-gray-500">You will receive a text message with delivery updates</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => setCurrentPage('home')}
            className="flex-1 bg-green-600 text-white py-2.5 rounded-md text-sm font-medium hover:bg-green-700 transition-all"
          >
            Back to Home
          </button>
          <button
            onClick={() => setCurrentPage('menu')}
            className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-md text-sm font-medium hover:bg-gray-200 transition-all"
          >
            Order Again
          </button>
        </div>
      </div>
    </div>
  );
}

// Payment Failed Page
function PaymentFailedPage({ setCurrentPage, orderNumber }) {
  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="w-full px-8 max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-xl font-medium text-gray-800 mb-1">Payment Failed</h1>
          <p className="text-sm text-gray-500">Your GCash payment was not completed</p>
        </div>

        {/* Order Number */}
        {orderNumber && (
          <div className="bg-gray-200 rounded-lg p-4 mb-6 text-center">
            <div className="text-xs text-gray-500 mb-1">Order Number</div>
            <div className="text-xl font-medium text-gray-700">{orderNumber}</div>
          </div>
        )}

        {/* Message */}
        <div className="bg-white rounded-lg p-5 mb-6 shadow-sm">
          <h3 className="text-base font-medium text-gray-800 mb-3">What happened?</h3>
          <p className="text-sm text-gray-600 mb-4">
            Your payment was cancelled or failed to process. Your order has been saved but is awaiting payment.
          </p>
          <h3 className="text-base font-medium text-gray-800 mb-3">What can you do?</h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>• Try placing your order again with GCash</li>
            <li>• Choose a different payment method (Cash on Delivery)</li>
            <li>• Contact us if you need assistance</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setCurrentPage('checkout')}
            className="w-full bg-green-600 text-white py-2.5 rounded-md text-sm font-medium hover:bg-green-700 transition-all"
          >
            Try Again
          </button>
          <button
            onClick={() => setCurrentPage('home')}
            className="w-full bg-gray-100 text-gray-700 py-2.5 rounded-md text-sm font-medium hover:bg-gray-200 transition-all"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
