// ===== CONFIG =====
const API = 'http://localhost:5000/api';

// ZENYAR payment details — admin can update these
const PAYMENT_INFO = {
  easypaisa: { number: '03091452442', name: 'ZENYAR' },
  jazzcash:  { number: '03091452442', name: 'ZENYAR' },
  bank: {
    accounts: [
      { bank: 'HBL',    title: 'ZENYAR',  iban: 'PK00HABB0000000000000000' },
      { bank: 'Meezan', title: 'ZENYAR',  iban: 'PK00MEZN0000000000000000' },
    ]
  }
};

// ===== STATE =====
let cart = JSON.parse(localStorage.getItem('tv_cart') || '[]');
let selectedPay = 'cod';
let appliedPromo = null;

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  renderSidebar();
  // Default: COD selected, no detail box needed
  selectPay('cod');
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
      if (confirm('Login ya account banao checkout ke liye.\n\nOK dabao login page pe jaane ke liye.')) {
        localStorage.setItem('tv_cart', JSON.stringify(cart));
        window.location.href = 'login.html';
      }
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

  if (!name)   { alert('Please enter your full name.'); return false; }
  if (!phone)  { alert('Please enter your phone number.'); return false; }
  if (!/^03\d{9}$/.test(phone.replace(/-/g, ''))) {
    alert('Please enter a valid Pakistani phone number (03XXXXXXXXX).'); return false;
  }
  if (!street) { alert('Please enter your street address.'); return false; }
  if (!city)   { alert('Please select your city.'); return false; }
  return true;
}

function validateStep2() {
  if ((selectedPay === 'easypaisa' || selectedPay === 'jazzcash') && !document.getElementById('txn-id')?.value.trim()) {
    alert('Please enter your Transaction ID after making payment.'); return false;
  }
  return true;
}

// ===== PAYMENT SELECTION =====
function selectPay(method) {
  selectedPay = method;

  // Update selected state on options (only if visible)
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
      <div style="background:#f9f9f9;border:1px solid #e0e0e0;padding:1.2rem 1.4rem;margin-bottom:1.5rem">
        <p style="font-family:'Montserrat',sans-serif;font-size:0.68rem;font-weight:300;color:#555;line-height:1.8;letter-spacing:0.04em">
          <i class="fas fa-check-circle" style="color:#27ae60;margin-right:0.4rem"></i>
          Pay in cash when your order is delivered. No advance payment required.
        </p>
      </div>`;
    return;
  }

  if (method === 'easypaisa' || method === 'jazzcash') {
    const info  = PAYMENT_INFO[method];
    const color = method === 'easypaisa' ? '#1565c0' : '#e65100';
    const label = method === 'easypaisa' ? 'Easypaisa' : 'JazzCash';
    box.innerHTML = `
      <div class="pay-detail">
        <h5>Send Payment via ${label}</h5>
        <p class="pay-number">${info.number}</p>
        <p class="pay-acname">${info.name}</p>
        <ul class="pay-steps-list">
          <li><span>1</span>Open your ${label} app</li>
          <li><span>2</span>Send <strong>Rs. ${total.toLocaleString()}</strong> to <strong>${info.number}</strong></li>
          <li><span>3</span>Copy the Transaction ID and paste it below</li>
        </ul>
        <button class="open-app-btn" style="background:${color}" onclick="openApp('${method}','${info.number}',${total})">
          <i class="fas fa-external-link-alt"></i> Open ${label} App
        </button>
        <div class="fg" style="margin-bottom:0">
          <label>Transaction ID *</label>
          <input type="text" id="txn-id" placeholder="Paste your transaction ID here" style="font-size:16px!important"/>
        </div>
      </div>`;
    return;
  }

  if (method === 'bank') {
    const accounts = PAYMENT_INFO.bank.accounts;
    box.innerHTML = `
      <div class="pay-detail">
        <h5>Bank Transfer Details</h5>
        ${accounts.map(a => `
          <div style="margin-bottom:1.2rem;padding-bottom:1.2rem;border-bottom:1px solid #e0e0e0">
            <p style="font-size:.62rem;font-weight:400;letter-spacing:.2em;text-transform:uppercase;color:#aaa;margin-bottom:.4rem">${a.bank}</p>
            <p class="pay-number" style="font-size:1rem">${a.iban}</p>
            <p class="pay-acname">${a.title}</p>
          </div>
        `).join('')}
        <ul class="pay-steps-list">
          <li><span>1</span>Transfer <strong>Rs. ${total.toLocaleString()}</strong> to any account above</li>
          <li><span>2</span>Take a screenshot of the confirmation</li>
          <li><span>3</span>Enter your transaction reference below</li>
        </ul>
        <div class="fg" style="margin-bottom:0;margin-top:1rem">
          <label>Transaction Reference *</label>
          <input type="text" id="txn-id" placeholder="Bank transaction reference number" style="font-size:16px!important"/>
        </div>
      </div>`;
  }
}

function openApp(method, number, amount) {
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
  const province = document.getElementById('c-province').value;
  const notes    = document.getElementById('c-notes').value.trim();
  const txnId    = document.getElementById('txn-id')?.value.trim() || '';

  const payLabels = { cod:'Cash on Delivery', easypaisa:'Easypaisa', jazzcash:'JazzCash', bank:'Bank Transfer' };

  document.getElementById('review-box').innerHTML = `
    <div class="review-block">
      <h5>Delivery Address</h5>
      <p><strong>${name}</strong><br>${phone}${email ? '<br>' + email : ''}<br>${street}, ${city}${province ? ', ' + province : ''}${notes ? '<br>Note: ' + notes : ''}</p>
    </div>
    <div class="review-block">
      <h5>Payment</h5>
      <p><strong>${payLabels[selectedPay]}</strong>${txnId ? '<br>Transaction ID: ' + txnId : ''}</p>
    </div>
  `;
}

// ===== PLACE ORDER =====
async function placeOrder() {
  if (!cart.length) { alert('Your bag is empty.'); return; }

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
      province: document.getElementById('c-province').value,
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
  };

  try {
    const token = localStorage.getItem('zv_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res  = await fetch(`${API}/orders`, { method:'POST', headers, body: JSON.stringify(orderData) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Order failed');

    const orderId = data.orderId || data.order?.orderId;
    showSuccess(orderId);
  } catch (err) {
    btn.textContent = 'Place Order';
    btn.disabled = false;
    alert('Could not place order. Please check your connection and try again.\n\n' + err.message);
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
