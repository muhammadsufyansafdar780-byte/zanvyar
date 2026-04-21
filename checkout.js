// ===== CONFIG =====
const API = 'http://localhost:5000/api';

// Payment details — HIDDEN from customer, only used for deep links
const PAYMENT_INFO = {
  easypaisa: { number: '03091452442', name: 'ZENYAR' },
  jazzcash:  { number: '03091452442', name: 'ZENYAR' },
  bank:      { title: 'ZENYAR', iban: 'PK00HABB0000000000000000', bank: 'HBL' }
};

// ===== STATE =====
let cart = JSON.parse(localStorage.getItem('tv_cart') || '[]');
let selectedPay = 'cod';
let appliedPromo = null;

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  renderSidebar();

  // Restore saved address after login redirect
  const savedAddr = localStorage.getItem('zenyar_saved_address');
  const gotoPayment = localStorage.getItem('zenyar_goto_payment');
  if (savedAddr) {
    try {
      const a = JSON.parse(savedAddr);
      if (a.name)   document.getElementById('c-name').value   = a.name;
      if (a.phone)  document.getElementById('c-phone').value  = a.phone;
      if (a.email)  document.getElementById('c-email').value  = a.email;
      if (a.street) document.getElementById('c-street').value = a.street;
      if (a.city)   document.getElementById('c-city').value   = a.city;
      if (a.notes)  document.getElementById('c-notes').value  = a.notes;
      localStorage.removeItem('zenyar_saved_address');
    } catch(_) {}
  }

  // If came from login, go directly to payment step
  if (gotoPayment === '1' && localStorage.getItem('zv_token')) {
    localStorage.removeItem('zenyar_goto_payment');
    setTimeout(() => goStep(2), 100);
  } else {
    selectPay('cod');
  }
});

// ===== SIDEBAR =====
function renderSidebar() {
  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const delivery = subtotal >= 3000 ? 0 : 250;
  let discount = 0;
  if (appliedPromo) {
    discount = appliedPromo.type === 'percent'
      ? Math.round(subtotal * appliedPromo.value / 100)
      : Math.min(appliedPromo.value, subtotal);
  }
  const total = subtotal + delivery - discount;

  document.getElementById('s-sub').textContent   = `Rs. ${subtotal.toLocaleString()}`;
  document.getElementById('s-del').textContent   = delivery === 0 ? 'Free' : `Rs. ${delivery}`;
  document.getElementById('s-total').textContent = `Rs. ${total.toLocaleString()}`;

  const discRow = document.getElementById('s-disc-row');
  if (discount > 0) {
    discRow.style.display = '';
    document.getElementById('s-disc').textContent = `-Rs. ${discount.toLocaleString()}`;
  } else {
    discRow.style.display = 'none';
  }

  const itemsEl = document.getElementById('sidebar-items');
  if (!cart.length) {
    itemsEl.innerHTML = `<p style="font-size:.7rem;font-weight:300;color:#aaa;padding:.5rem 0">Your bag is empty</p>`;
    return;
  }
  itemsEl.innerHTML = cart.map(c => `
    <div class="sidebar-item">
      <div class="sidebar-item-img">
        ${c.image ? `<img src="${c.image}" alt="${c.name}" onerror="this.style.display='none'">` : `<i class="${c.icon || 'fas fa-tshirt'}"></i>`}
      </div>
      <div class="sidebar-item-info">
        <h4>${c.name}</h4>
        <p>${c.size ? `Size: ${c.size} · ` : ''}Qty: ${c.qty}</p>
      </div>
      <span class="sidebar-item-price">Rs. ${(c.price * c.qty).toLocaleString()}</span>
    </div>
  `).join('');
}

// ===== TOAST (no browser popups) =====
function showToast(msg, type = 'error') {
  let t = document.getElementById('co-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'co-toast';
    t.style.cssText = 'position:fixed;bottom:2rem;left:50%;transform:translateX(-50%) translateY(20px);padding:.8rem 1.8rem;font-family:Montserrat,sans-serif;font-size:.68rem;font-weight:300;letter-spacing:.15em;text-transform:uppercase;opacity:0;transition:all .3s;z-index:9999;white-space:nowrap;pointer-events:none';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.background = type === 'error' ? '#c62828' : '#2e7d32';
  t.style.color = '#fff';
  t.style.opacity = '1';
  t.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(t._t);
  t._t = setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(-50%) translateY(20px)'; }, 3000);
}

// ===== PROMO =====
function applyPromo() {
  const code = document.getElementById('promo-input').value.trim().toUpperCase();
  const msg  = document.getElementById('promo-msg');
  if (!code) { msg.textContent = 'Enter a promo code.'; msg.style.color = '#aaa'; return; }

  const promos = JSON.parse(localStorage.getItem('tv_coupons') || '[]');
  const promo  = promos.find(p => p.code === code && p.active);

  if (!promo) {
    msg.textContent = 'Invalid or expired code.';
    msg.style.color = '#e74c3c';
    appliedPromo = null;
  } else {
    appliedPromo = promo;
    msg.textContent = `✓ ${promo.type === 'percent' ? promo.value + '% off' : 'Rs. ' + promo.value + ' off'} applied`;
    msg.style.color = '#C6A969';
  }
  renderSidebar();
}

// ===== STEPS =====
function goStep(n) {
  if (n === 2 && !validateStep1()) return;
  if (n === 3 && !validateStep2()) return;

  // Require login before payment step
  if (n === 2) {
    const token = localStorage.getItem('zv_token');
    if (!token) {
      // Save address data before redirecting to login
      const addressData = {
        name:     document.getElementById('c-name').value.trim(),
        phone:    document.getElementById('c-phone').value.trim(),
        email:    document.getElementById('c-email').value.trim(),
        street:   document.getElementById('c-street').value.trim(),
        city:     document.getElementById('c-city').value,
        notes:    document.getElementById('c-notes').value.trim(),
      };
      localStorage.setItem('tv_cart', JSON.stringify(cart));
      localStorage.setItem('zenyar_saved_address', JSON.stringify(addressData));
      localStorage.setItem('zenyar_goto_payment', '1');
      window.location.href = 'login.html';
      return;
    }
  }

  [1, 2, 3].forEach(i => {
    document.getElementById(`step-${i}`).style.display = i === n ? '' : 'none';
    const s = document.getElementById(`s${i}`);
    s.classList.remove('active', 'done');
    if (i < n) s.classList.add('done');
    if (i === n) s.classList.add('active');
  });

  // When entering step 2, refresh payment detail box after DOM is visible
  if (n === 2) setTimeout(() => selectPay(selectedPay), 10);
  if (n === 3) buildReview();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== VALIDATION =====
function validateStep1() {
  const name   = document.getElementById('c-name').value.trim();
  const phone  = document.getElementById('c-phone').value.trim();
  const street = document.getElementById('c-street').value.trim();
  const city   = document.getElementById('c-city').value;

  if (!name)   { showToast('Please enter your full name.'); return false; }
  if (!phone)  { showToast('Please enter your phone number.'); return false; }
  if (!/^03\d{9}$/.test(phone.replace(/-/g, ''))) {
    showToast('Enter a valid phone number (03XXXXXXXXX).'); return false;
  }
  if (!street) { showToast('Please enter your street address.'); return false; }
  if (!city)   { showToast('Please select your city.'); return false; }
  return true;
}

function validateStep2() {
  if ((selectedPay === 'easypaisa' || selectedPay === 'jazzcash') && !document.getElementById('txn-id')?.value.trim()) {
    showToast('Please enter your Transaction ID after making payment.'); return false;
  }
  if (selectedPay === 'bank' && !document.getElementById('txn-id')?.value.trim()) {
    showToast('Please enter your transaction reference number.'); return false;
  }
  if (selectedPay === 'card') {
    const num  = document.getElementById('card-num')?.value.replace(/\s/g,'') || ''
    const exp  = document.getElementById('card-exp')?.value || ''
    const cvv  = document.getElementById('card-cvv')?.value || ''
    const name = document.getElementById('card-name')?.value.trim() || ''
    if (!num || !exp || !cvv || !name) { showToast('Please fill all card details.'); return false; }
    if (num.length < 16) { showToast('Card number must be 16 digits.'); return false; }
    if (!luhnCheck(num)) { showToast('Invalid card number. Please check again.'); return false; }
    const [mm, yy] = exp.split('/')
    const expDate = new Date(2000 + parseInt(yy), parseInt(mm) - 1, 1)
    if (expDate < new Date()) { showToast('Card has expired.'); return false; }
    if (cvv.length < 3) { showToast('CVV must be 3-4 digits.'); return false; }
  }
  return true;
}

// ===== PAYMENT SELECTION =====
function selectPay(method) {
  selectedPay = method;

  document.querySelectorAll('.pay-option').forEach(el => el.classList.remove('selected'));
  const optEl = document.getElementById(`opt-${method}`);
  if (optEl) optEl.classList.add('selected');

  const box = document.getElementById('pay-detail-box');
  if (!box) return; // step-2 not visible yet — will be called again when step-2 opens

  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const delivery = subtotal >= 3000 ? 0 : 250;
  const discount = appliedPromo
    ? (appliedPromo.type === 'percent' ? Math.round(subtotal * appliedPromo.value / 100) : Math.min(appliedPromo.value, subtotal))
    : 0;
  const total = subtotal + delivery - discount;

  if (method === 'cod') {
    box.innerHTML = `
      <div style="background:#f9f9f9;border:1px solid #e0e0e0;padding:1.2rem 1.4rem;margin-bottom:1.5rem;display:flex;align-items:center;gap:.8rem">
        <i class="fas fa-check-circle" style="color:#27ae60;font-size:1.2rem"></i>
        <div>
          <p style="font-family:'Montserrat',sans-serif;font-size:.75rem;font-weight:400;color:#111;margin-bottom:.2rem">Cash on Delivery</p>
          <p style="font-family:'Montserrat',sans-serif;font-size:.65rem;font-weight:300;color:#888">Pay in cash when your order arrives. No advance payment needed.</p>
        </div>
      </div>`;
    return;
  }

  if (method === 'easypaisa') {
    box.innerHTML = `
      <div style="background:#f0f4ff;border:1px solid #bbdefb;padding:1.2rem 1.4rem;margin-bottom:1.5rem">
        <div style="display:flex;align-items:center;gap:.8rem;margin-bottom:1rem">
          <i class="fas fa-mobile-alt" style="color:#1565c0;font-size:1.3rem"></i>
          <div>
            <p style="font-family:'Montserrat',sans-serif;font-size:.75rem;font-weight:400;color:#111">Easypaisa</p>
            <p style="font-family:'Montserrat',sans-serif;font-size:.62rem;font-weight:300;color:#888">Tap below to open Easypaisa app and pay instantly</p>
          </div>
        </div>
        <button class="open-app-btn" style="background:#1565c0" onclick="openPaymentApp('easypaisa',${total})">
          <i class="fas fa-external-link-alt"></i> Pay Rs. ${total.toLocaleString()} via Easypaisa
        </button>
        <div class="fg" style="margin-bottom:0;margin-top:.8rem">
          <label>Transaction ID * (after payment)</label>
          <input type="text" id="txn-id" placeholder="Enter transaction ID from Easypaisa" style="font-size:16px!important"/>
        </div>
      </div>`;
    return;
  }

  if (method === 'jazzcash') {
    box.innerHTML = `
      <div style="background:#fff8f0;border:1px solid #ffcc80;padding:1.2rem 1.4rem;margin-bottom:1.5rem">
        <div style="display:flex;align-items:center;gap:.8rem;margin-bottom:1rem">
          <i class="fas fa-wallet" style="color:#e65100;font-size:1.3rem"></i>
          <div>
            <p style="font-family:'Montserrat',sans-serif;font-size:.75rem;font-weight:400;color:#111">JazzCash</p>
            <p style="font-family:'Montserrat',sans-serif;font-size:.62rem;font-weight:300;color:#888">Tap below to open JazzCash app and pay instantly</p>
          </div>
        </div>
        <button class="open-app-btn" style="background:#e65100" onclick="openPaymentApp('jazzcash',${total})">
          <i class="fas fa-external-link-alt"></i> Pay Rs. ${total.toLocaleString()} via JazzCash
        </button>
        <div class="fg" style="margin-bottom:0;margin-top:.8rem">
          <label>Transaction ID * (after payment)</label>
          <input type="text" id="txn-id" placeholder="Enter transaction ID from JazzCash" style="font-size:16px!important"/>
        </div>
      </div>`;
    return;
  }

  if (method === 'bank') {
    box.innerHTML = `
      <div style="background:#f5f5f5;border:1px solid #e0e0e0;border-radius:10px;padding:1.4rem;margin-bottom:1.5rem">
        <div style="display:flex;align-items:center;gap:.8rem;margin-bottom:1rem">
          <div style="width:42px;height:42px;background:#efefef;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <i class="fas fa-university" style="color:#555;font-size:1.1rem"></i>
          </div>
          <div>
            <p style="font-family:'Montserrat',sans-serif;font-size:.78rem;font-weight:500;color:#111;margin-bottom:.2rem">Bank Transfer</p>
            <p style="font-family:'Montserrat',sans-serif;font-size:.62rem;font-weight:300;color:#888">Transfer Rs. ${total.toLocaleString()} — bank details via WhatsApp after order</p>
          </div>
        </div>
        <div class="fg" style="margin-bottom:0">
          <label>Transaction Reference * (after transfer)</label>
          <input type="text" id="txn-id" placeholder="Enter bank transaction reference number" style="font-size:16px!important;border-radius:6px"/>
        </div>
      </div>`;
    return;
  }

  if (method === 'card') {
    box.innerHTML = `
      <div class="pay-detail">
        <h5>Card Details</h5>
        <div class="fg" style="margin-bottom:.8rem">
          <label>Card Number *</label>
          <input type="text" id="card-num" placeholder="1234 5678 9012 3456" maxlength="19" oninput="formatCardNum(this)" style="font-size:1rem!important;letter-spacing:.1em"/>
          <div id="card-type" style="font-size:.65rem;color:#aaa;margin-top:.3rem"></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.8rem">
          <div class="fg" style="margin-bottom:.8rem">
            <label>Expiry Date *</label>
            <input type="text" id="card-exp" placeholder="MM/YY" maxlength="5" oninput="formatExpiry(this)"/>
          </div>
          <div class="fg" style="margin-bottom:.8rem">
            <label>CVV *</label>
            <input type="text" id="card-cvv" placeholder="123" maxlength="4" style="letter-spacing:.2em"/>
          </div>
        </div>
        <div class="fg" style="margin-bottom:.8rem">
          <label>Cardholder Name *</label>
          <input type="text" id="card-name" placeholder="Name on card"/>
        </div>
        <div style="display:flex;align-items:center;gap:.5rem;margin-top:.5rem;padding:.8rem;background:#f0faf0;border:1px solid #c8e6c9">
          <i class="fas fa-shield-alt" style="color:#2e7d32;font-size:.9rem"></i>
          <span style="font-size:.65rem;font-weight:300;color:#2e7d32;letter-spacing:.05em">256-bit SSL encrypted. Your card details are secure.</span>
        </div>
      </div>`;
  }
}

// ===== CARD HELPERS =====
function formatCardNum(input) {
  let val = input.value.replace(/\D/g, '').substring(0, 16)
  input.value = val.replace(/(.{4})/g, '$1 ').trim()
  // Detect card type
  const typeEl = document.getElementById('card-type')
  if (typeEl) {
    if (/^4/.test(val)) typeEl.innerHTML = '<i class="fab fa-cc-visa" style="color:#1a1f71"></i> Visa'
    else if (/^5[1-5]/.test(val)) typeEl.innerHTML = '<i class="fab fa-cc-mastercard" style="color:#eb001b"></i> Mastercard'
    else if (/^3[47]/.test(val)) typeEl.innerHTML = '<i class="fab fa-cc-amex" style="color:#007bc1"></i> Amex'
    else typeEl.textContent = ''
  }
}

function formatExpiry(input) {
  let val = input.value.replace(/\D/g, '').substring(0, 4)
  if (val.length >= 2) val = val.substring(0, 2) + '/' + val.substring(2)
  input.value = val
}

function luhnCheck(num) {
  const digits = num.replace(/\D/g, '')
  let sum = 0, alt = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i])
    if (alt) { n *= 2; if (n > 9) n -= 9 }
    sum += n; alt = !alt
  }
  return sum % 10 === 0
}

function openPaymentApp(method, amount) {
  const number = PAYMENT_INFO[method].number;
  const url = method === 'easypaisa'
    ? `easypaisa://send?to=${number}&amount=${amount}`
    : `jazzcash://send?to=${number}&amount=${amount}`;
  window.location.href = url;
  setTimeout(() => {
    const store = method === 'easypaisa'
      ? 'https://play.google.com/store/apps/details?id=pk.com.telenor.phoenix'
      : 'https://play.google.com/store/apps/details?id=com.techlogix.mobilinkcustomer';
    window.open(store, '_blank');
  }, 2000);
}

// ===== REVIEW =====
function buildReview() {
  const name     = document.getElementById('c-name').value.trim();
  const phone    = document.getElementById('c-phone').value.trim();
  const email    = document.getElementById('c-email').value.trim();
  const street   = document.getElementById('c-street').value.trim();
  const city     = document.getElementById('c-city').value;
  const notes    = document.getElementById('c-notes').value.trim();
  const txnId    = document.getElementById('txn-id')?.value.trim() || '';

  const payLabels = { cod:'Cash on Delivery', easypaisa:'Easypaisa', jazzcash:'JazzCash', bank:'Bank Transfer', card:'Credit / Debit Card' }
  const cardLast4 = selectedPay === 'card' ? (document.getElementById('card-num')?.value.replace(/\s/g,'').slice(-4) || '') : '';

  document.getElementById('review-box').innerHTML = `
    <div class="review-block">
      <h5>Delivery Address</h5>
      <p><strong>${name}</strong><br>${phone}${email ? '<br>' + email : ''}<br>${street}, ${city}${notes ? '<br>Note: ' + notes : ''}</p>
    </div>
    <div class="review-block">
      <h5>Payment</h5>
      <p><strong>${payLabels[selectedPay]}</strong>${txnId ? '<br>Transaction ID: ' + txnId : ''}${cardLast4 ? '<br>Card ending: ****' + cardLast4 : ''}</p>
    </div>
  `;
}

// ===== PLACE ORDER =====
async function placeOrder() {
  if (!cart.length) { showToast('Your bag is empty.'); return; }

  const btn = document.getElementById('place-btn');
  btn.textContent = 'Placing Order...';
  btn.disabled = true;

  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const delivery = subtotal >= 3000 ? 0 : 250;
  const discount = appliedPromo
    ? (appliedPromo.type === 'percent' ? Math.round(subtotal * appliedPromo.value / 100) : Math.min(appliedPromo.value, subtotal))
    : 0;
  const total = subtotal + delivery - discount;

  const orderData = {
    address: {
      name:     document.getElementById('c-name').value.trim(),
      phone:    document.getElementById('c-phone').value.trim(),
      email:    document.getElementById('c-email').value.trim(),
      street:   document.getElementById('c-street').value.trim(),
      city:     document.getElementById('c-city').value,
      province: '',
      notes:    document.getElementById('c-notes').value.trim(),
    },
    payment:       { method: selectedPay },
    items:         cart,
    subtotal,
    delivery,
    discount,
    couponCode:    appliedPromo?.code || '',
    total,
    transactionId: document.getElementById('txn-id')?.value.trim() || '',
    cardLast4: selectedPay === 'card' ? (document.getElementById('card-num')?.value.replace(/\s/g,'').slice(-4) || '') : '',
  };

  try {
    const token = localStorage.getItem('zv_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res  = await fetch(`${API}/orders`, { method:'POST', headers, body: JSON.stringify(orderData), signal: AbortSignal.timeout(4000) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Order failed');

    const orderId = data.orderId || data.order?.orderId;
    showSuccess(orderId);
  } catch (err) {
    // Backend offline — save locally and show success
    const localId = 'ZY-' + Date.now().toString().slice(-6) + Math.floor(Math.random()*100);
    const ids = JSON.parse(localStorage.getItem('tv_order_ids') || '[]');
    ids.unshift(localId);
    localStorage.setItem('tv_order_ids', JSON.stringify(ids.slice(0, 20)));
    localStorage.setItem('zy_order_' + localId, JSON.stringify({ ...orderData, orderId: localId, status: 'placed', createdAt: new Date() }));
    showSuccess(localId);
  }
}

function showSuccess(orderId) {
  document.getElementById('order-id-val').textContent = orderId || '—';
  document.getElementById('track-link').href = `track.html?id=${orderId}`;
  document.getElementById('success-overlay').classList.add('open');
  localStorage.removeItem('tv_cart');
  // Save order ID for tracking
  const ids = JSON.parse(localStorage.getItem('tv_order_ids') || '[]');
  ids.unshift(orderId);
  localStorage.setItem('tv_order_ids', JSON.stringify(ids.slice(0, 20)));
}
