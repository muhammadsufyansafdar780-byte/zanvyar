// ---- Load cart from localStorage ----
let cart = JSON.parse(localStorage.getItem('tv_cart') || '[]');
let selectedPayment = 'cod';
let currentStep = 1;

const API = 'http://localhost:5000/api';

// ---- International Toggle ----
function toggleInternational() {
  const isIntl = document.getElementById('intl-toggle').checked;
  document.getElementById('intl-fields').style.display = isIntl ? 'block' : 'none';
  document.getElementById('pak-fields').style.display  = isIntl ? 'none'  : 'block';

  // COD not available for international
  const codOption = document.querySelector('.payment-option[onclick*="cod"]');
  if (codOption) {
    codOption.style.display = isIntl ? 'none' : '';
    if (isIntl && selectedPayment === 'cod') {
      selectPayment('easypaisa');
    }
  }
}

// ---- Coupon ----
let appliedCoupon = null;

async function applyCoupon() {
  const code = document.getElementById('coupon-input').value.trim().toUpperCase();
  const msg  = document.getElementById('coupon-msg');
  if (!code) { msg.textContent = 'Please enter a coupon code.'; msg.style.color = '#e74c3c'; return; }

  // Load coupons from localStorage (admin-managed)
  const coupons = JSON.parse(localStorage.getItem('tv_coupons') || '[]');
  const coupon  = coupons.find(c => c.code === code && c.active);

  if (!coupon) {
    msg.textContent = 'Invalid or expired coupon code.';
    msg.style.color = '#e74c3c';
    appliedCoupon = null;
    renderSummary();
    return;
  }

  appliedCoupon = coupon;
  msg.textContent = `✓ "${coupon.code}" applied — ${coupon.type === 'percent' ? coupon.value + '% OFF' : 'Rs. ' + coupon.value + ' OFF'}`;
  msg.style.color = '#27ae60';
  renderSummary();
}

// ---- Render Summary ----
function renderSummary() {
  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const delivery = subtotal >= 2000 ? 0 : 200;

  let discount = 0;
  if (appliedCoupon) {
    discount = appliedCoupon.type === 'percent'
      ? Math.round(subtotal * appliedCoupon.value / 100)
      : Math.min(appliedCoupon.value, subtotal);
  }
  const total = subtotal + delivery - discount;

  document.getElementById('s-subtotal').textContent = `Rs. ${subtotal.toLocaleString()}`;
  document.getElementById('s-delivery').textContent = delivery === 0 ? 'Free' : `Rs. ${delivery}`;
  document.getElementById('s-total').textContent    = `Rs. ${total.toLocaleString()}`;

  const couponRow = document.getElementById('coupon-row');
  if (couponRow) {
    couponRow.style.display = discount > 0 ? '' : 'none';
    document.getElementById('s-discount').textContent = `-Rs. ${discount.toLocaleString()}`;
  }

  if (cart.length === 0) {
    document.getElementById('summary-items').innerHTML = '<p style="color:#aaa;font-size:0.85rem;text-align:center;padding:1rem;">Cart is empty</p>';
    return;
  }
  document.getElementById('summary-items').innerHTML = cart.map(c => `
    <div class="summary-item-row">
      <div class="summary-item-icon"><i class="${c.icon || 'fas fa-tshirt'}"></i></div>
      <div class="summary-item-info">
        <h4>${c.name}</h4>
        <p>Size: ${c.size || 'N/A'} | Qty: ${c.qty}</p>
      </div>
      <span class="summary-item-price">Rs. ${(c.price * c.qty).toLocaleString()}</span>
    </div>
  `).join('');
}

// ---- Steps ----
function goToStep(step) {
  if (step === 2 && !validateStep1()) return;
  if (step === 3 && !validateStep2()) return;

  document.querySelectorAll('.checkout-step').forEach(s => s.classList.add('hidden'));
  document.getElementById(`step-${step}`).classList.remove('hidden');

  document.querySelectorAll('.step').forEach((s, i) => {
    s.classList.remove('active', 'done');
    if (i + 1 < step) s.classList.add('done');
    if (i + 1 === step) s.classList.add('active');
  });

  if (step === 3) buildReview();
  currentStep = step;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function validateStep1() {
  const name   = document.getElementById('c-name').value.trim();
  const phone  = document.getElementById('c-phone').value.trim();
  const street = document.getElementById('c-street').value.trim();
  const isIntl = document.getElementById('intl-toggle').checked;

  if (!name || !phone || !street) {
    alert('Please fill all required fields.');
    return false;
  }

  if (isIntl) {
    const cityIntl = document.getElementById('c-city-intl').value.trim();
    const country  = document.getElementById('c-country').value.trim();
    if (!cityIntl || !country) {
      alert('Please enter your city and country.');
      return false;
    }
  } else {
    const city = document.getElementById('c-city').value;
    if (!city) {
      alert('Please select your city.');
      return false;
    }
    if (!/^03\d{9}$/.test(phone.replace(/-/g, ''))) {
      alert('Please enter a valid Pakistani phone number (03XXXXXXXXX).');
      return false;
    }
  }
  return true;
}

// ---- Luhn Algorithm (card validation) ----
function luhnCheck(num) {
  const digits = num.replace(/\D/g, '');
  let sum = 0, alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i]);
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function validateStep2() {
  if (selectedPayment === 'card') {
    const num  = document.getElementById('card-num').value.replace(/\s/g, '');
    const exp  = document.getElementById('card-exp').value.trim();
    const cvv  = document.getElementById('card-cvv').value.trim();
    const name = document.getElementById('card-name').value.trim();

    if (!num || !exp || !cvv || !name) {
      alert('Please fill all card details.');
      return false;
    }
    if (num.length < 16) {
      alert('Card number must be 16 digits.');
      return false;
    }
    if (!luhnCheck(num)) {
      alert('Invalid card number. Please check and try again.');
      return false;
    }
    // Expiry check
    const [mm, yy] = exp.split('/');
    const expDate = new Date(2000 + parseInt(yy), parseInt(mm) - 1, 1);
    if (expDate < new Date()) {
      alert('Card has expired. Please use a valid card.');
      return false;
    }
    if (cvv.length < 3) {
      alert('CVV must be 3 digits.');
      return false;
    }
  }
  if (selectedPayment === 'easypaisa' || selectedPayment === 'jazzcash') {
    const txn = document.getElementById('mobile-num').value.trim();
    if (!txn) {
      alert('Please enter your Transaction ID after making payment.');
      return false;
    }
  }
  return true;
}

function buildReview() {
  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const delivery = subtotal >= 2000 ? 0 : 200;
  const isIntl = document.getElementById('intl-toggle').checked;

  const cityLine = isIntl
    ? `${document.getElementById('c-street').value}, ${document.getElementById('c-city-intl').value}, ${document.getElementById('c-state').value || ''} ${document.getElementById('c-zip').value || ''}, ${document.getElementById('c-country').value}`
    : `${document.getElementById('c-street').value}, ${document.getElementById('c-city').value}`;

  document.getElementById('review-address').innerHTML = `
    <h4><i class="fas fa-map-marker-alt"></i> Delivery Address</h4>
    <p><strong>${document.getElementById('c-name').value}</strong></p>
    <p>${document.getElementById('c-phone').value}</p>
    <p>${cityLine}</p>
    ${isIntl ? '<p style="color:#FF4500;font-size:0.82rem"><i class="fas fa-globe"></i> International Order</p>' : ''}
    ${document.getElementById('c-notes').value ? `<p>Note: ${document.getElementById('c-notes').value}</p>` : ''}
  `;

  const payLabels = { cod: 'Cash on Delivery', easypaisa: 'Easypaisa', jazzcash: 'JazzCash', card: 'Credit/Debit Card' };
  const txnId = (selectedPayment === 'easypaisa' || selectedPayment === 'jazzcash')
    ? document.getElementById('mobile-num').value : '';
  document.getElementById('review-payment').innerHTML = `
    <h4><i class="fas fa-credit-card"></i> Payment</h4>
    <p>${payLabels[selectedPayment]}</p>
    ${txnId ? `<p>Transaction ID: <strong>${txnId}</strong></p>` : ''}
    <p>Subtotal: Rs. ${subtotal.toLocaleString()}</p>
    <p>Delivery: ${delivery === 0 ? 'Free' : 'Rs. ' + delivery}</p>
    <p><strong>Total: Rs. ${(subtotal + delivery).toLocaleString()}</strong></p>
  `;
}

// ---- Payment App Deep Links ----
const DEFAULT_NUMBER = '03091452442';

async function getSellerPaymentInfo(method) {
  // Try to get seller info from cart items via backend
  try {
    const productIds = cart.map(c => c._id || c.id).filter(Boolean);
    if (!productIds.length) return null;

    const res = await fetch(`${API}/products/sellers-for-cart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productIds })
    });
    if (!res.ok) return null;
    const data = await res.json(); // [{ sellerId, sellerName, easypaisa, jazzcash, commissionRate, productIds[] }]
    return data;
  } catch(e) {
    return null;
  }
}

function buildPaymentBreakdown(sellers, method, totalAmount) {
  if (!sellers || !sellers.length) {
    // No seller info — use default number
    const number = DEFAULT_NUMBER;
    const label  = method === 'easypaisa' ? 'Easypaisa' : 'JazzCash';
    const color  = method === 'easypaisa' ? '#1565c0' : '#e65100';
    const icon   = method === 'easypaisa' ? 'fas fa-mobile-alt' : 'fas fa-wallet';
    return `
      <h4><i class="${icon}" style="color:${color}"></i> Pay via ${label}</h4>
      <button onclick="openPaymentApp('${method}','${number}',${totalAmount})" style="
        width:100%;padding:1rem;border:none;border-radius:10px;
        background:${color};color:#fff;font-family:'Poppins',sans-serif;
        font-size:1rem;font-weight:700;cursor:pointer;margin-bottom:0.8rem;
        display:flex;align-items:center;justify-content:center;gap:0.6rem;
        box-shadow:0 4px 15px rgba(0,0,0,0.2);">
        <i class="${icon}"></i> Open ${label} App & Pay Rs. ${totalAmount.toLocaleString()}
      </button>
      <ul class="pay-steps">
        <li><span>1</span> Tap the button above — ${label} app will open</li>
        <li><span>2</span> Send amount <strong>Rs. ${totalAmount.toLocaleString()}</strong></li>
        <li><span>3</span> Enter your Transaction ID below</li>
      </ul>`;
  }

  // Multiple sellers — show each separately
  let html = `<h4 style="margin-bottom:0.8rem"><i class="fas fa-store" style="color:#FF4500"></i> Pay to Sellers</h4>`;

  sellers.forEach(s => {
    const number = method === 'easypaisa' ? (s.easypaisa || DEFAULT_NUMBER) : (s.jazzcash || DEFAULT_NUMBER);
    const color  = method === 'easypaisa' ? '#1565c0' : '#e65100';
    const icon   = method === 'easypaisa' ? 'fas fa-mobile-alt' : 'fas fa-wallet';
    const label  = method === 'easypaisa' ? 'Easypaisa' : 'JazzCash';

    // Calculate seller's portion from cart
    const sellerItems = cart.filter(c => s.productIds.includes(String(c._id || c.id)));
    const sellerSubtotal = sellerItems.reduce((sum, c) => sum + c.price * c.qty, 0);
    const commission = Math.round(sellerSubtotal * (s.commissionRate || 10) / 100);
    const sellerAmount = sellerSubtotal - commission;

    html += `
      <div style="background:#f8f8f8;border-radius:10px;padding:1rem;margin-bottom:0.8rem;border-left:3px solid ${color}">
        <p style="font-size:0.82rem;font-weight:700;color:#333;margin-bottom:0.5rem">
          <i class="fas fa-store" style="color:#FF4500"></i> ${s.sellerName}
        </p>
        <p style="font-size:0.78rem;color:#666;margin-bottom:0.5rem">
          Items: ${sellerItems.map(i => i.name).join(', ')}
        </p>
        <div style="display:flex;justify-content:space-between;font-size:0.78rem;color:#888;margin-bottom:0.6rem">
          <span>Seller receives: <strong style="color:#27ae60">Rs. ${sellerAmount.toLocaleString()}</strong></span>
          <span>Commission: <strong style="color:#FF4500">Rs. ${commission.toLocaleString()}</strong></span>
        </div>
        <button onclick="openPaymentApp('${method}','${number}',${sellerAmount})" style="
          width:100%;padding:0.75rem;border:none;border-radius:8px;
          background:${color};color:#fff;font-family:'Poppins',sans-serif;
          font-size:0.88rem;font-weight:700;cursor:pointer;
          display:flex;align-items:center;justify-content:center;gap:0.5rem;">
          <i class="${icon}"></i> Pay Rs. ${sellerAmount.toLocaleString()} to ${s.sellerName}
        </button>
      </div>`;
  });

  const totalCommission = sellers.reduce((sum, s) => {
    const sellerItems = cart.filter(c => s.productIds.includes(String(c._id || c.id)));
    const sub = sellerItems.reduce((a, c) => a + c.price * c.qty, 0);
    return sum + Math.round(sub * (s.commissionRate || 10) / 100);
  }, 0);

  html += `
    <div style="background:#fff5f2;border-radius:8px;padding:0.8rem;margin-top:0.5rem;font-size:0.78rem;color:#888;text-align:center">
      <i class="fas fa-info-circle" style="color:#FF4500"></i>
      TrendVault commission: <strong style="color:#FF4500">Rs. ${totalCommission.toLocaleString()}</strong> (included in seller payments)
    </div>
    <ul class="pay-steps" style="margin-top:0.8rem">
      <li><span>1</span> Pay each seller separately using the buttons above</li>
      <li><span>2</span> Enter your Transaction ID(s) below</li>
    </ul>`;

  return html;
}

function openPaymentApp(method, number, amount) {
  if (method === 'easypaisa') {
    window.location.href = `easypaisa://send?to=${number}&amount=${amount}`;
    setTimeout(() => {
      window.open('https://play.google.com/store/apps/details?id=pk.com.telenor.phoenix', '_blank');
    }, 2000);
  } else {
    window.location.href = `jazzcash://send?to=${number}&amount=${amount}`;
    setTimeout(() => {
      window.open('https://play.google.com/store/apps/details?id=com.techlogix.mobilinkcustomer', '_blank');
    }, 2000);
  }
}

// ---- Payment Selection ----
function selectPayment(method) {
  selectedPayment = method;
  document.getElementById('card-details').classList.add('hidden');
  document.getElementById('mobile-pay-details').classList.add('hidden');

  if (method === 'card') {
    document.getElementById('card-details').classList.remove('hidden');
  }

  if (method === 'easypaisa' || method === 'jazzcash') {
    document.getElementById('mobile-pay-details').classList.remove('hidden');

    const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
    const delivery = subtotal >= 2000 ? 0 : 200;
    const amount   = subtotal + delivery;

    // Show loading state
    document.getElementById('pay-instruction-box').innerHTML = `
      <p style="text-align:center;color:#aaa;padding:1rem"><i class="fas fa-spinner fa-spin"></i> Loading payment info...</p>`;

    // Try to get seller info
    getSellerPaymentInfo(method).then(sellers => {
      document.getElementById('pay-instruction-box').innerHTML =
        buildPaymentBreakdown(sellers, method, amount);
    });
  }
}

// ---- Card Formatting ----
function formatCard(input) {
  let val = input.value.replace(/\D/g, '').substring(0, 16);
  input.value = val.replace(/(.{4})/g, '$1 ').trim();

  // Live Luhn feedback
  const clean = val.replace(/\s/g, '');
  const feedback = document.getElementById('card-num-feedback');
  if (feedback) {
    if (clean.length === 16) {
      if (luhnCheck(clean)) {
        feedback.textContent = '✓ Valid card';
        feedback.style.color = '#27ae60';
      } else {
        feedback.textContent = '✗ Invalid card number';
        feedback.style.color = '#e74c3c';
      }
    } else {
      feedback.textContent = '';
    }
  }
}

function formatExpiry(input) {
  let val = input.value.replace(/\D/g, '').substring(0, 4);
  if (val.length >= 2) val = val.substring(0, 2) + '/' + val.substring(2);
  input.value = val;
}

// ---- Place Order ----
async function placeOrder() {
  if (cart.length === 0) { alert('Your cart is empty!'); return; }

  const btn = document.querySelector('.btn-place-order');
  btn.innerHTML = 'Placing Order... <i class="fas fa-spinner fa-spin"></i>';
  btn.disabled = true;

  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const delivery = subtotal >= 2000 ? 0 : 200;

  let discount = 0;
  if (appliedCoupon) {
    discount = appliedCoupon.type === 'percent'
      ? Math.round(subtotal * appliedCoupon.value / 100)
      : Math.min(appliedCoupon.value, subtotal);
  }

  let cardLast4 = '';
  if (selectedPayment === 'card') {
    const rawCard = document.getElementById('card-num').value.replace(/\s/g, '');
    cardLast4 = rawCard.slice(-4);
  }

  const transactionId = (selectedPayment === 'easypaisa' || selectedPayment === 'jazzcash')
    ? document.getElementById('mobile-num').value.trim() : '';

  const isIntl = document.getElementById('intl-toggle').checked;

  const orderData = {
    address: {
      name:     document.getElementById('c-name').value.trim(),
      phone:    document.getElementById('c-phone').value.trim(),
      email:    document.getElementById('c-email').value.trim(),
      street:   document.getElementById('c-street').value.trim(),
      city:     isIntl ? document.getElementById('c-city-intl').value.trim() : document.getElementById('c-city').value,
      province: isIntl ? document.getElementById('c-country').value.trim() : document.getElementById('c-province').value,
      notes:    document.getElementById('c-notes').value.trim(),
      isInternational: isIntl,
      country:  isIntl ? document.getElementById('c-country').value.trim() : 'Pakistan',
      zip:      isIntl ? document.getElementById('c-zip').value.trim() : ''
    },
    payment:       { method: selectedPayment },
    items:         cart,
    subtotal,
    delivery,
    discount,
    couponCode:    appliedCoupon ? appliedCoupon.code : '',
    total:         subtotal + delivery - discount,
    transactionId,
    cardLast4
  };

  try {
    const token = localStorage.getItem('tv_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res  = await fetch(`${API}/orders`, {
      method: 'POST',
      headers,
      body: JSON.stringify(orderData)
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.message || 'Order failed');

    const orderId = data.orderId || data.order?.orderId;
    if (!orderId) throw new Error('No order ID returned');

    showSuccess(orderId);
  } catch (err) {
    console.error(err);
    btn.innerHTML = 'Place Order <i class="fas fa-check"></i>';
    btn.disabled = false;
    alert('Could not place order. Please check your connection and try again.');
  }
}

function showSuccess(orderId) {
  document.getElementById('order-id-text').textContent = orderId;
  document.getElementById('track-link').href = `track.html?id=${orderId}`;
  document.getElementById('success-overlay').classList.add('open');
  localStorage.removeItem('tv_cart');
  cart = [];
  renderSummary();
  // Save order ID for guest order history
  const ids = JSON.parse(localStorage.getItem('tv_order_ids') || '[]');
  ids.unshift(orderId);
  localStorage.setItem('tv_order_ids', JSON.stringify(ids.slice(0, 20)));
}

function copyTrackingId() {
  const id  = document.getElementById('order-id-text').textContent;
  const btn = document.getElementById('copy-tid-btn');
  navigator.clipboard.writeText(id).then(() => {
    btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
    btn.style.background = '#27ae60';
    setTimeout(() => {
      btn.innerHTML = '<i class="fas fa-copy"></i> Copy';
      btn.style.background = '#FF4500';
    }, 2500);
  });
}

// ---- Init ----
renderSummary();
