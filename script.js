// ===== CONFIG =====
const API = 'http://localhost:5000/api';

// ===== PRODUCTS DATA (fallback if backend offline) =====
const products = [
  { id:1,  name:'Classic White Tee',      category:'men',   price:2499, oldPrice:3499, discount:29, icon:'fas fa-tshirt',  image:'images/white-tee.jpg',     description:'Premium cotton, relaxed fit. Crafted for everyday luxury.' },
  { id:2,  name:'Oversize Black Tee',      category:'men',   price:2799, oldPrice:3999, discount:30, icon:'fas fa-tshirt',  image:'images/black-tee.jpg',     description:'Signature oversized silhouette. The ZENVYAR essential.' },
  { id:3,  name:'Slim Fit Trousers',       category:'men',   price:3499, oldPrice:4999, discount:30, icon:'fas fa-male',   image:'images/slim-trousers.jpg', description:'Tailored for the modern man. Clean lines, premium fabric.' },
  { id:4,  name:'Linen Shirt',             category:'men',   price:2999, oldPrice:3999, discount:25, icon:'fas fa-tshirt',  image:'images/linen-shirt.jpg',   description:'Breathable luxury linen. Minimal design, maximum comfort.' },
  { id:5,  name:'Premium Suit',            category:'men',   price:8999, oldPrice:12999,discount:31, icon:'fas fa-tshirt',  image:'images/suit-men.jpg',      description:'Tailored premium suit. Crafted for the distinguished man.' },
  { id:6,  name:'Casual Chinos',           category:'men',   price:2299, oldPrice:3299, discount:30, icon:'fas fa-male',   image:'images/chinos.jpg',        description:'Relaxed everyday chinos. Comfort meets style.' },
  { id:7,  name:'Minimal Dress',           category:'women', price:3999, oldPrice:5499, discount:27, icon:'fas fa-female', image:'images/minimal-dress.jpg', description:'Effortless elegance. Designed for the confident woman.' },
  { id:8,  name:'Silk Blouse',             category:'women', price:3299, oldPrice:4499, discount:27, icon:'fas fa-female', image:'images/silk-blouse.jpg',   description:'Pure silk, premium finish. Timeless and refined.' },
  { id:9,  name:'Formal Kurta',            category:'women', price:4499, oldPrice:6499, discount:31, icon:'fas fa-female', image:'images/formal-kurta.jpg',  description:'Elegant formal kurta. Crafted for special occasions.' },
  { id:10, name:'Embroidered Suit',        category:'women', price:6999, oldPrice:9999, discount:30, icon:'fas fa-female', image:'images/embroidered-suit.jpg',description:'Hand-embroidered luxury suit. A masterpiece of craft.' },
  { id:11, name:'Casual Lawn Set',         category:'women', price:2799, oldPrice:3999, discount:30, icon:'fas fa-female', image:'images/lawn-set.jpg',      description:'Soft lawn fabric. Perfect for everyday elegance.' },
  { id:12, name:'Evening Gown',            category:'women', price:7499, oldPrice:10999,discount:32, icon:'fas fa-female', image:'images/evening-gown.jpg',  description:'Flowing evening gown. Luxury redefined.' },
  { id:13, name:'Junior Classic Tee',      category:'kids',  price:1499, oldPrice:1999, discount:25, icon:'fas fa-child',  image:'images/junior-tee.jpg',    description:'Soft cotton for young ones. Comfortable all day.' },
  { id:14, name:'Junior Joggers',          category:'kids',  price:1799, oldPrice:2499, discount:28, icon:'fas fa-child',  image:'images/junior-joggers.jpg',description:'Comfortable everyday wear for the little ones.' },
  { id:15, name:'Junior Polo Shirt',       category:'kids',  price:1299, oldPrice:1799, discount:28, icon:'fas fa-child',  image:'images/junior-polo.jpg',   description:'Classic polo for young style.' },
  { id:16, name:'Junior Formal Set',       category:'kids',  price:2499, oldPrice:3499, discount:29, icon:'fas fa-child',  image:'images/junior-formal.jpg', description:'Formal set for special occasions.' },
  { id:17, name:'Junior Hoodie',           category:'kids',  price:1999, oldPrice:2799, discount:29, icon:'fas fa-child',  image:'images/junior-hoodie.jpg', description:'Cozy hoodie for cool days.' },
  { id:18, name:'Junior Casual Dress',     category:'kids',  price:1699, oldPrice:2299, discount:26, icon:'fas fa-child',  image:'images/junior-dress.jpg',  description:'Cute casual dress for girls.' },
];

// Active discount (admin can set this)
let activeDiscount = null; // e.g. { percent: 20, label: 'EID SALE' }

// Load cart from localStorage on startup
let cart = JSON.parse(localStorage.getItem('tv_cart') || '[]');
let currentFilter = 'all';

// ===== RENDER PRODUCTS =====
function renderProducts(filter, tabEl) {
  if (filter !== undefined) currentFilter = filter;

  if (tabEl) {
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    tabEl.classList.add('active');
  }

  const search = (document.getElementById('search-input')?.value || '').toLowerCase();
  let filtered = currentFilter === 'all' ? [...products] : products.filter(p => p.category === currentFilter);
  if (search) filtered = filtered.filter(p => p.name.toLowerCase().includes(search));

  const grid = document.getElementById('products-grid');
  if (!grid) return;

  if (!filtered.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:4rem;color:#ccc;font-family:Montserrat,sans-serif;font-size:0.72rem;letter-spacing:0.3em;text-transform:uppercase">No products found</div>`;
    return;
  }

  grid.innerHTML = filtered.map(p => {
    const finalPrice = activeDiscount ? Math.round(p.price * (1 - activeDiscount.percent / 100)) : p.price;
    const showDiscount = activeDiscount || p.discount;
    const discountLabel = activeDiscount ? activeDiscount.percent : p.discount;
    const displayOldPrice = activeDiscount ? p.price : p.oldPrice;

    return `
    <div class="product-card fade-up" onclick="window.location.href='product.html?id=${p.id}'">
      <div class="product-img">
        ${p.image ? `<img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">` : ''}
        <i class="${p.icon} product-img-icon" style="${p.image ? 'display:none' : ''}"></i>
        ${showDiscount ? `<span class="product-discount-badge">-${discountLabel}%</span>` : ''}
      </div>
      <div class="product-info">
        <h3>${p.name}</h3>
        <div class="product-price-row">
          <span class="product-price">Rs. ${finalPrice.toLocaleString()}</span>
          ${showDiscount ? `<span class="product-old-price">Rs. ${displayOldPrice.toLocaleString()}</span>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');

  requestAnimationFrame(() => {
    document.querySelectorAll('.product-card.fade-up').forEach((el, i) => {
      setTimeout(() => el.classList.add('visible'), i * 60);
    });
  });
}

function filterProducts(cat, tabEl) { renderProducts(cat, tabEl); }
function searchProducts() { renderProducts(currentFilter); }

// ===== DISCOUNT CONTROL (call from admin or promo) =====
function setDiscount(percent, label) {
  activeDiscount = percent ? { percent, label: label || `${percent}% OFF` } : null;
  renderProducts();
  // Show promo banner if active
  const banner = document.getElementById('promo-banner');
  if (banner) {
    if (activeDiscount) {
      banner.textContent = `🎉 ${activeDiscount.label} — ${activeDiscount.percent}% off on all products!`;
      banner.style.display = 'block';
    } else {
      banner.style.display = 'none';
    }
  }
}

// ===== CART =====
function addToCart(id, size) {
  const p = products.find(pr => String(pr.id) === String(id));
  if (!p) return;
  const finalPrice = activeDiscount ? Math.round(p.price * (1 - activeDiscount.percent / 100)) : p.price;
  const key = `${id}-${size || 'default'}`;
  const existing = cart.find(c => c.cartKey === key);
  if (existing) existing.qty++;
  else cart.push({ ...p, price: finalPrice, qty: 1, size: size || '', cartKey: key });
  // Sync to localStorage so checkout.js can read it
  localStorage.setItem('tv_cart', JSON.stringify(cart));
  updateCart();
  openCartPanel();
  showToastMsg('Added to bag');
}

function showToastMsg(msg) {
  let t = document.getElementById('global-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'global-toast';
    t.style.cssText = 'position:fixed;bottom:2rem;left:50%;transform:translateX(-50%) translateY(20px);background:#111;color:#fff;padding:.7rem 1.8rem;font-family:Montserrat,sans-serif;font-size:.62rem;font-weight:300;letter-spacing:.2em;text-transform:uppercase;opacity:0;transition:all .3s;z-index:9999;white-space:nowrap;pointer-events:none';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  t.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(t._t);
  t._t = setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(-50%) translateY(20px)'; }, 2200);
}

function removeFromCart(key) {
  cart = cart.filter(c => c.cartKey !== key);
  localStorage.setItem('tv_cart', JSON.stringify(cart));
  updateCart();
}

function changeCartQty(key, val) {
  const item = cart.find(c => c.cartKey === key);
  if (!item) return;
  item.qty = Math.max(1, item.qty + val);
  localStorage.setItem('tv_cart', JSON.stringify(cart));
  updateCart();
}

function updateCart() {
  const count = cart.reduce((s, c) => s + c.qty, 0);
  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);

  const dot = document.getElementById('cart-dot');
  if (dot) dot.style.display = count > 0 ? 'block' : 'none';

  const totalEl = document.getElementById('cart-total');
  if (totalEl) totalEl.textContent = `Rs. ${total.toLocaleString()}`;

  const footer = document.getElementById('cart-footer');
  if (footer) footer.style.display = cart.length > 0 ? 'block' : 'none';

  const itemsEl = document.getElementById('cart-items');
  if (!itemsEl) return;

  if (!cart.length) {
    itemsEl.innerHTML = `<div class="cart-empty"><i class="fas fa-shopping-bag"></i><p>Your bag is empty</p></div>`;
    return;
  }

  itemsEl.innerHTML = cart.map(c => `
    <div class="cart-item">
      <div class="cart-item-img">
        ${c.image ? `<img src="${c.image}" alt="${c.name}" onerror="this.style.display='none'">` : `<i class="${c.icon}"></i>`}
      </div>
      <div class="cart-item-info">
        <h4>${c.name}${c.size ? ` <small style="color:#bbb;font-weight:300">(${c.size})</small>` : ''}</h4>
        <p>Rs. ${c.price.toLocaleString()}</p>
        <div class="cart-qty-row">
          <button class="cart-qty-btn" onclick="changeCartQty('${c.cartKey}', -1)">−</button>
          <span>${c.qty}</span>
          <button class="cart-qty-btn" onclick="changeCartQty('${c.cartKey}', 1)">+</button>
        </div>
      </div>
      <button class="cart-item-remove" onclick="removeFromCart('${c.cartKey}')"><i class="fas fa-times"></i></button>
    </div>
  `).join('');
}

function openCartPanel() {
  document.getElementById('cart-panel')?.classList.add('open');
  document.getElementById('cart-overlay')?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function toggleCart() {
  const panel = document.getElementById('cart-panel');
  const overlay = document.getElementById('cart-overlay');
  if (!panel) return;
  const isOpen = panel.classList.toggle('open');
  overlay?.classList.toggle('open', isOpen);
  document.body.style.overflow = isOpen ? 'hidden' : '';
}

function goToCheckout() {
  if (!cart.length) return;
  localStorage.setItem('tv_cart', JSON.stringify(cart));
  window.location.href = 'checkout.html';
}

// ===== ACCOUNT PANEL =====
function openAccPanel() {
  const body = document.getElementById('acc-panel-body');
  const user = getUser();
  if (body) {
    const userSection = user
      ? `<div style="padding:1.2rem 0.8rem 0.5rem;border-bottom:1px solid #f5f5f5;margin-bottom:0.5rem">
           <p style="font-family:'Montserrat',sans-serif;font-size:0.7rem;font-weight:400;letter-spacing:0.1em;color:#333">${user.name}</p>
           <p style="font-family:'Montserrat',sans-serif;font-size:0.62rem;font-weight:300;color:#aaa;margin-top:0.2rem">${user.email}</p>
         </div>`
      : `<div class="fp-menu-item" onclick="window.location.href='login.html'"><i class="far fa-user"></i> Login / Register</div>`;

    const adminLink = user?.role === 'admin'
      ? `<div class="fp-menu-item" onclick="window.location.href='admin.html'"><i class="fas fa-cog"></i> Admin Panel</div>` : '';

    const logoutLink = user
      ? `<div class="fp-menu-item" onclick="doLogout()" style="color:#e74c3c"><i class="fas fa-sign-out-alt"></i> Logout</div>` : '';

    body.innerHTML = `
      ${userSection}
      <div class="fp-menu-item" onclick="window.location.href='orders.html'"><i class="fas fa-shopping-bag"></i> My Orders</div>
      <div class="fp-menu-item" onclick="window.location.href='track.html'"><i class="fas fa-map-marker-alt"></i> Track Order</div>
      <div class="fp-menu-item" onclick="window.location.href='return.html'"><i class="fas fa-undo-alt"></i> Return / Refund</div>
      <div class="fp-menu-item" onclick="window.open('https://wa.me/923091452442','_blank')"><i class="fab fa-whatsapp"></i> Contact Us</div>
      ${adminLink}
      ${logoutLink}
    `;
  }
  document.getElementById('acc-panel')?.classList.add('open');
  document.getElementById('acc-overlay')?.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeAccPanel() {
  document.getElementById('acc-panel')?.classList.remove('open');
  document.getElementById('acc-overlay')?.classList.remove('open');
  document.body.style.overflow = '';
}
function doLogout() {
  clearAuth();
  closeAccPanel();
}

// ===== MENU PANEL =====
function toggleMenu() {
  const panel = document.getElementById('menu-panel');
  const overlay = document.getElementById('menu-overlay');
  if (!panel) return;
  const isOpen = panel.classList.toggle('open');
  overlay?.classList.toggle('open', isOpen);
  document.body.style.overflow = isOpen ? 'hidden' : '';
}
function closeMenu() {
  document.getElementById('menu-panel')?.classList.remove('open');
  document.getElementById('menu-overlay')?.classList.remove('open');
  document.body.style.overflow = '';
}

// ===== SEARCH TOGGLE =====
function toggleSearch() {
  const wrap = document.getElementById('search-wrap');
  if (!wrap) return;
  wrap.classList.toggle('open');
  if (wrap.classList.contains('open')) {
    setTimeout(() => document.getElementById('search-input')?.focus(), 300);
  }
}

// ===== HEADER SCROLL =====
window.addEventListener('scroll', () => {
  const header = document.getElementById('site-header');
  if (!header) return;
  header.classList.toggle('scrolled', window.scrollY > 60);
});

// ===== SCROLL ANIMATIONS =====
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.12 });

function initScrollAnimations() {
  document.querySelectorAll('.scroll-line, .fade-up').forEach(el => observer.observe(el));
}

// ===== LOAD FROM BACKEND =====
async function loadFromBackend() {
  try {
    const res = await fetch(`${API}/products`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error();
    const data = await res.json();
    if (data && data.length > 0) {
      products.length = 0;
      data.forEach(p => products.push({
        id:          p._id,
        name:        p.name,
        category:    p.category,
        price:       p.price,
        oldPrice:    p.oldPrice || p.price,
        discount:    p.discount || 0,
        icon:        'fas fa-tshirt',
        image:       p.images?.[0] ? `http://localhost:5000${p.images[0]}` : null,
        description: p.description || '',
        sizes:       p.sizes || [],
      }));
      renderProducts();
    }
  } catch (_) { /* backend offline — use local fallback */ }
}

// ===== AUTH HELPERS =====
function getToken() { return localStorage.getItem('zv_token'); }
function getUser()  { return JSON.parse(localStorage.getItem('zv_user') || 'null'); }
function setAuth(token, user) {
  localStorage.setItem('zv_token', token);
  localStorage.setItem('zv_user', JSON.stringify(user));
}
function clearAuth() {
  localStorage.removeItem('zv_token');
  localStorage.removeItem('zv_user');
}

// ===== HERO SLIDER =====
let heroIdx = 0;
let heroTimer = null;
function goHeroSlide(n) {
  const slides = document.querySelectorAll('.hero-slide');
  const dots   = document.querySelectorAll('.hero-dot');
  if (!slides.length) return;
  slides[heroIdx].classList.remove('active');
  dots[heroIdx]?.classList.remove('active');
  heroIdx = n % slides.length;
  slides[heroIdx].classList.add('active');
  dots[heroIdx]?.classList.add('active');
  clearInterval(heroTimer);
  heroTimer = setInterval(() => goHeroSlide(heroIdx + 1), 6000);
}
function startHeroSlider() {
  heroTimer = setInterval(() => goHeroSlide(heroIdx + 1), 6000);
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  renderProducts();
  updateCart();
  initScrollAnimations();
  loadFromBackend();
  startHeroSlider();
});
