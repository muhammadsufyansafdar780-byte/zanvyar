const API = 'http://localhost:5000/api';
const token = localStorage.getItem('tv_token');

// ---- Auth check — verify with backend ----
if (!token) window.location.href = 'login.html';

(async () => {
  try {
    const res = await fetch(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    const u = data.user || data;
    if (u.role !== 'admin') throw new Error();
    document.getElementById('admin-user-info').textContent = u.name || 'Admin';
    localStorage.setItem('tv_user', JSON.stringify(u));
  } catch(_) {
    localStorage.removeItem('tv_token');
    localStorage.removeItem('tv_user');
    window.location.href = 'login.html';
  }
})();

function authHeaders() {
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
}

function logout() {
  localStorage.removeItem('tv_token');
  localStorage.removeItem('tv_user');
  window.location.href = 'login.html';
}

// ---- Panel navigation ----
function showPanel(name) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`panel-${name}`).classList.add('active');
  document.querySelector(`[onclick="showPanel('${name}')"]`).classList.add('active');
  document.getElementById('panel-title').textContent = name.charAt(0).toUpperCase() + name.slice(1);
  if (name === 'products') loadProducts();
  if (name === 'orders')   loadOrders();
  if (name === 'users')    loadUsers();
  if (name === 'ads')      loadAds();
  if (name === 'sale')     loadSalePanel();
  if (name === 'returns')  loadReturns();
  if (name === 'coupons')  loadCoupons();
  if (name === 'sellers')  loadSellers();
  // Pre-load sellers for product modal dropdown
  if (name === 'products' && !allSellers.length) loadSellers();
}

// ---- Dashboard ----
let revenueChart = null;

async function loadDashboard() {
  try {
    const [products, orders, users] = await Promise.all([
      fetch(`${API}/products`, { headers: authHeaders() }).then(r => r.json()),
      fetch(`${API}/orders`,   { headers: authHeaders() }).then(r => r.json()),
      fetch(`${API}/users`,    { headers: authHeaders() }).then(r => r.json()),
    ]);

    document.getElementById('stat-products').textContent = products.length || 0;
    document.getElementById('stat-orders').textContent   = orders.length  || 0;
    document.getElementById('stat-users').textContent    = users.length   || 0;

    const revenue = (orders || []).reduce((s, o) => s + (o.total || 0), 0);
    document.getElementById('stat-revenue').textContent = 'Rs. ' + revenue.toLocaleString();

    // Today's orders
    const today = new Date().toDateString();
    const todayOrders = (orders || []).filter(o => new Date(o.createdAt).toDateString() === today);
    document.getElementById('stat-today').textContent = todayOrders.length;

    // Status counts
    const deliveredOrders  = (orders || []).filter(o => o.status === 'delivered');
    const pendingOrders    = (orders || []).filter(o => ['placed','confirmed','processing','shipped'].includes(o.status));
    const cancelledOrders  = (orders || []).filter(o => o.status === 'cancelled');

    document.getElementById('stat-delivered').textContent = deliveredOrders.length;
    document.getElementById('stat-pending').textContent   = pendingOrders.length;
    document.getElementById('stat-cancelled').textContent = cancelledOrders.length;

    // Sale vs Purchase revenue
    const saleRevenue     = deliveredOrders.reduce((s, o) => s + (o.total || 0), 0);
    const purchaseRevenue = pendingOrders.reduce((s, o) => s + (o.total || 0), 0);
    document.getElementById('stat-sale-revenue').textContent     = 'Rs. ' + saleRevenue.toLocaleString();
    document.getElementById('stat-purchase-revenue').textContent = 'Rs. ' + purchaseRevenue.toLocaleString();

    // Unique buyers (by phone)
    const phones = new Set((orders || []).map(o => o.address?.phone).filter(Boolean));
    document.getElementById('stat-buyers').textContent = phones.size;

    // Repeat customers (2+ orders same phone)
    const phoneCounts = {};
    (orders || []).forEach(o => { const p = o.address?.phone; if (p) phoneCounts[p] = (phoneCounts[p] || 0) + 1; });
    const repeatCount = Object.values(phoneCounts).filter(c => c >= 2).length;
    document.getElementById('stat-repeat').textContent = repeatCount;

    // Total commission earned
    const totalCommission = (orders || []).reduce((s, o) => s + (o.totalCommission || 0), 0);
    const commEl = document.getElementById('stat-commission');
    if (commEl) commEl.textContent = 'Rs. ' + totalCommission.toLocaleString();

    // Recent orders
    const recent = (orders || []).slice(0, 5);
    document.getElementById('recent-orders').innerHTML = recent.map(o => `
      <tr>
        <td>${o.orderId}</td>
        <td>${o.address?.name || '-'}</td>
        <td>Rs. ${o.total?.toLocaleString()}</td>
        <td>${o.payment?.method}</td>
        <td><span class="badge badge-${o.status}">${o.status}</span></td>
      </tr>
    `).join('') || '<tr><td colspan="5" style="text-align:center;color:#aaa">No orders yet</td></tr>';

    // Revenue chart (last 7 days)
    buildRevenueChart(orders || []);
    buildSaleDonut(saleRevenue, purchaseRevenue, cancelledOrders.reduce((s,o)=>s+(o.total||0),0));

    // Low stock
    buildLowStockTable(products || []);

  } catch (e) {
    console.error(e);
  }
}

function buildRevenueChart(orders) {
  const labels = [];
  const data   = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    labels.push(d.toLocaleDateString('en-PK', { weekday:'short', day:'numeric' }));
    const dayStr = d.toDateString();
    const dayRevenue = orders
      .filter(o => new Date(o.createdAt).toDateString() === dayStr && o.status !== 'cancelled')
      .reduce((s, o) => s + (o.total || 0), 0);
    data.push(dayRevenue);
  }

  const ctx = document.getElementById('revenue-chart').getContext('2d');
  if (revenueChart) revenueChart.destroy();
  revenueChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Revenue (Rs.)',
        data,
        backgroundColor: 'rgba(248,86,6,0.15)',
        borderColor: '#f85606',
        borderWidth: 2,
        borderRadius: 6,
        fill: true,
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { callback: v => 'Rs.' + v.toLocaleString() } }
      }
    }
  });
}

let saleDonutChart = null;

function buildSaleDonut(sale, purchase, cancelled) {
  const ctx = document.getElementById('sale-donut').getContext('2d');
  if (saleDonutChart) saleDonutChart.destroy();
  saleDonutChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Completed Sales', 'Pending Purchases', 'Cancelled'],
      datasets: [{
        data: [sale, purchase, cancelled],
        backgroundColor: ['#27ae60', '#f85606', '#e74c3c'],
        borderWidth: 0,
        hoverOffset: 6,
      }]
    },
    options: {
      responsive: true,
      cutout: '65%',
      plugins: {
        legend: { position: 'bottom', labels: { font: { family: 'Poppins', size: 12 }, padding: 16 } },
        tooltip: { callbacks: { label: ctx => ` Rs. ${ctx.parsed.toLocaleString()}` } }
      }
    }
  });
}

function buildLowStockTable(products) {
  const low = products.filter(p => p.stock < 5);
  const box = document.getElementById('low-stock-box');
  if (!low.length) { box.style.display = 'none'; return; }
  box.style.display = '';
  document.getElementById('low-stock-table').innerHTML = low.map(p => `
    <tr>
      <td><strong>${p.name}</strong></td>
      <td>${p.category}</td>
      <td><span style="background:#ffebee;color:#c62828;padding:2px 10px;border-radius:20px;font-size:0.78rem;font-weight:700">${p.stock} left</span></td>
      <td><button class="btn btn-outline btn-sm" onclick="showPanel('products')"><i class="fas fa-edit"></i> Update</button></td>
    </tr>
  `).join('');
}

// ---- Products ----
let allProducts = [];

async function loadProducts() {
  try {
    const res = await fetch(`${API}/products`);
    allProducts = await res.json();
    renderProductsTable(allProducts);
  } catch (e) { console.error(e); }
}

function renderProductsTable(products) {
  document.getElementById('products-table').innerHTML = products.map(p => `
    <tr>
      <td>${p.images?.[0] ? `<img src="${API.replace('/api','')}${p.images[0]}" style="width:45px;height:45px;object-fit:cover;border-radius:6px;border:1px solid #eee"/>` : '<i class="fas fa-tshirt" style="font-size:1.5rem;color:#ddd"></i>'}</td>
      <td><strong>${p.name}</strong></td>
      <td>${p.category}</td>
      <td>Rs. ${p.price?.toLocaleString()}</td>
      <td>
        ${p.stock <= 0
          ? `<span style="background:#ffebee;color:#c62828;padding:2px 10px;border-radius:20px;font-size:0.78rem;font-weight:700">Out of Stock</span>`
          : p.stock < 5
            ? `<span style="background:#fff3e0;color:#e65100;padding:2px 10px;border-radius:20px;font-size:0.78rem;font-weight:700">Low: ${p.stock}</span>`
            : p.stock
        }
      </td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="editProduct('${p._id}')"><i class="fas fa-edit"></i></button>
        <button class="btn btn-danger btn-sm" onclick="deleteProduct('${p._id}')"><i class="fas fa-trash"></i></button>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="6" style="text-align:center;color:#aaa">No products</td></tr>';
}

function searchProducts(val) {
  const filtered = allProducts.filter(p => p.name.toLowerCase().includes(val.toLowerCase()));
  renderProductsTable(filtered);
}

function openProductModal(product = null) {
  document.getElementById('product-form').reset();
  document.getElementById('img-preview').innerHTML = '';
  document.getElementById('product-id').value = '';
  document.getElementById('product-modal-title').textContent = 'Add Product';

  // Populate seller dropdown
  const sellerSelect = document.getElementById('p-seller');
  sellerSelect.innerHTML = '<option value="">No Seller / TrendVault Direct</option>' +
    allSellers.filter(s => s.isActive).map(s =>
      `<option value="${s._id}">${s.name} (${s.commissionRate}%)</option>`
    ).join('');

  if (product) {
    document.getElementById('product-modal-title').textContent = 'Edit Product';
    document.getElementById('product-id').value  = product._id;
    document.getElementById('p-name').value      = product.name;
    document.getElementById('p-desc').value      = product.description;
    document.getElementById('p-category').value  = product.category;
    document.getElementById('p-badge').value     = product.badge;
    document.getElementById('p-price').value     = product.price;
    document.getElementById('p-old-price').value = product.oldPrice;
    document.getElementById('p-stock').value     = product.stock;
    document.getElementById('p-discount').value  = product.discount;
    document.getElementById('p-sizes').value     = product.sizes?.join(',');
    sellerSelect.value = product.seller?._id || product.seller || '';
  }
  document.getElementById('product-modal').classList.add('open');
}

function closeProductModal() {
  document.getElementById('product-modal').classList.remove('open');
}

async function editProduct(id) {
  const product = allProducts.find(p => p._id === id);
  if (product) openProductModal(product);
}

async function deleteProduct(id) {
  if (!confirm('Delete this product?')) return;
  try {
    await fetch(`${API}/products/${id}`, { method: 'DELETE', headers: authHeaders() });
    loadProducts();
  } catch (e) { alert('Failed to delete'); }
}

async function saveProduct(e) {
  e.preventDefault();
  const id  = document.getElementById('product-id').value;
  const btn = e.target.querySelector('button[type="submit"]');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
  btn.disabled = true;

  const formData = new FormData();
  formData.append('name',        document.getElementById('p-name').value);
  formData.append('description', document.getElementById('p-desc').value);
  formData.append('category',    document.getElementById('p-category').value);
  formData.append('badge',       document.getElementById('p-badge').value);
  formData.append('price',       document.getElementById('p-price').value);
  formData.append('oldPrice',    document.getElementById('p-old-price').value);
  formData.append('stock',       document.getElementById('p-stock').value);
  formData.append('discount',    document.getElementById('p-discount').value);
  formData.append('sizes',       JSON.stringify(document.getElementById('p-sizes').value.split(',').map(s => s.trim()).filter(Boolean)));
  const sellerId = document.getElementById('p-seller').value;
  if (sellerId) formData.append('seller', sellerId);

  const files = document.getElementById('p-images').files;
  for (const file of files) formData.append('images', file);

  try {
    const url    = id ? `${API}/products/${id}` : `${API}/products`;
    const method = id ? 'PUT' : 'POST';
    const res    = await fetch(url, { method, headers: { 'Authorization': `Bearer ${token}` }, body: formData });
    if (!res.ok) throw new Error('Failed');
    closeProductModal();
    loadProducts();
  } catch (err) {
    alert('Failed to save product');
  } finally {
    btn.innerHTML = '<i class="fas fa-save"></i> Save Product';
    btn.disabled = false;
  }
}

function previewImages(input) {
  const preview = document.getElementById('img-preview');
  preview.innerHTML = '';
  for (const file of input.files) {
    const reader = new FileReader();
    reader.onload = e => {
      const img = document.createElement('img');
      img.src = e.target.result;
      preview.appendChild(img);
    };
    reader.readAsDataURL(file);
  }
}

// ---- Orders ----
let allOrders = [];

async function loadOrders() {
  try {
    const res = await fetch(`${API}/orders`, { headers: authHeaders() });
    allOrders = await res.json();
    renderOrdersTable(allOrders);
  } catch (e) { console.error(e); }
}

function filterOrders() {
  const search = (document.getElementById('order-search')?.value || '').toLowerCase();
  const status = document.getElementById('order-status-filter')?.value || '';
  const date   = document.getElementById('order-date-filter')?.value || '';

  let filtered = allOrders.filter(o => {
    const matchSearch = !search ||
      (o.orderId || '').toLowerCase().includes(search) ||
      (o.address?.name || '').toLowerCase().includes(search) ||
      (o.address?.phone || '').includes(search);
    const matchStatus = !status || o.status === status;
    const matchDate   = !date || new Date(o.createdAt).toISOString().slice(0,10) === date;
    return matchSearch && matchStatus && matchDate;
  });
  renderOrdersTable(filtered);
}

function renderOrdersTable(orders) {
  document.getElementById('orders-table').innerHTML = orders.map(o => `
    <tr>
      <td>${o.orderId}</td>
      <td>${o.user?.name || o.address?.name}<br><small style="color:#888">${o.user?.phone || o.address?.phone}</small></td>
      <td>${o.items?.length} items</td>
      <td>Rs. ${o.total?.toLocaleString()}</td>
      <td>
        ${(o.payment?.method || '').toUpperCase()}
        ${o.payment?.transactionId ? `<br><small style="color:#27ae60">TXN: ${o.payment.transactionId}</small>` : ''}
        ${o.payment?.cardLast4 ? `<br><small style="color:#888">Card: ****${o.payment.cardLast4}</small>` : ''}
      </td>
      <td><span class="badge badge-${o.status}">${o.status}</span></td>
      <td>
        <select onchange="updateOrderStatus('${o._id}', this.value)" style="border:1px solid #ddd;border-radius:4px;padding:0.3rem;font-size:0.8rem;outline:none">
          <option value="placed"      ${o.status==='placed'?'selected':''}>Placed</option>
          <option value="confirmed"   ${o.status==='confirmed'?'selected':''}>Confirmed</option>
          <option value="processing"  ${o.status==='processing'?'selected':''}>Processing</option>
          <option value="shipped"     ${o.status==='shipped'?'selected':''}>Shipped</option>
          <option value="delivered"   ${o.status==='delivered'?'selected':''}>Delivered</option>
          <option value="cancelled"   ${o.status==='cancelled'?'selected':''}>Cancelled</option>
        </select>
        <button class="btn btn-outline btn-sm" style="margin-top:4px" onclick="openCourierModal('${o._id}','${o.courier?.name||''}','${o.courier?.trackingId||''}')">
          <i class="fas fa-truck"></i> ${o.courier?.trackingId ? 'Edit Courier' : 'Assign Courier'}
        </button>
        ${o.courier?.trackingId ? `<br><small style="color:#27ae60;font-size:0.75rem"><i class="fas fa-check-circle"></i> ${o.courier.name} — ${o.courier.trackingId}</small>` : ''}
      </td>
    </tr>
  `).join('') || '<tr><td colspan="7" style="text-align:center;color:#aaa">No orders</td></tr>';
}

function exportOrdersCSV() {
  const rows = [['Order ID','Customer','Phone','Items','Total','Payment','TXN ID','Status','Date']];
  allOrders.forEach(o => {
    rows.push([
      o.orderId,
      o.address?.name || '',
      o.address?.phone || '',
      (o.items || []).map(i => `${i.name} x${i.qty}`).join(' | '),
      o.total || 0,
      o.payment?.method || '',
      o.payment?.transactionId || '',
      o.status,
      new Date(o.createdAt).toLocaleDateString(),
    ]);
  });
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `orders-${new Date().toISOString().slice(0,10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}


async function updateOrderStatus(id, status) {
  try {
    await fetch(`${API}/orders/${id}/status`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ status }) });
  } catch (e) { alert('Failed to update status'); }
}

// ---- Users ----
async function loadUsers() {
  try {
    const res   = await fetch(`${API}/users`, { headers: authHeaders() });
    const users = await res.json();
    document.getElementById('users-table').innerHTML = users.map(u => `
      <tr>
        <td>${u.name}</td>
        <td>${u.email}</td>
        <td>${u.phone}</td>
        <td><span class="badge ${u.role==='admin'?'badge-confirmed':'badge-placed'}">${u.role}</span></td>
        <td>${new Date(u.createdAt).toLocaleDateString()}</td>
      </tr>
    `).join('') || '<tr><td colspan="5" style="text-align:center;color:#aaa">No users</td></tr>';
  } catch (e) { console.error(e); }
}

// ---- Returns ----
function loadReturns() {
  const returns = JSON.parse(localStorage.getItem('tv_returns') || '[]');
  const tbody = document.getElementById('returns-table');
  if (!returns.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#aaa">No return requests</td></tr>';
    return;
  }
  tbody.innerHTML = returns.map((r, i) => `
    <tr>
      <td><strong>${r.reqId}</strong></td>
      <td><a href="track.html?id=${r.orderId}" target="_blank" style="color:#f85606">${r.orderId}</a></td>
      <td>${r.name}<br><small style="color:#888">${r.phone}</small></td>
      <td style="font-size:0.82rem">${r.reason.replace(/-/g,' ')}</td>
      <td style="font-size:0.82rem">${r.refund}${r.account ? `<br><small style="color:#888">${r.account}</small>` : ''}</td>
      <td style="font-size:0.78rem;color:#888">${new Date(r.date).toLocaleDateString()}</td>
      <td>
        <span class="badge ${r.status==='approved'?'badge-delivered':r.status==='rejected'?'badge-cancelled':'badge-placed'}">
          ${r.status}
        </span>
      </td>
      <td>
        <select onchange="updateReturn(${i}, this.value)" style="border:1px solid #ddd;border-radius:4px;padding:0.3rem;font-size:0.8rem;outline:none">
          <option value="pending"  ${r.status==='pending'?'selected':''}>Pending</option>
          <option value="approved" ${r.status==='approved'?'selected':''}>Approve</option>
          <option value="rejected" ${r.status==='rejected'?'selected':''}>Reject</option>
        </select>
      </td>
    </tr>
  `).join('');
}

function updateReturn(index, status) {
  const returns = JSON.parse(localStorage.getItem('tv_returns') || '[]');
  if (returns[index]) { returns[index].status = status; localStorage.setItem('tv_returns', JSON.stringify(returns)); }
  loadReturns();
}

// ---- Sale Management ----
function loadSalePanel() {
  const sale = JSON.parse(localStorage.getItem('tv_sale') || 'null');
  if (sale) {
    document.getElementById('sale-active').checked    = sale.active || false;
    document.getElementById('sale-tag').value         = sale.tag || '';
    document.getElementById('sale-discount').value    = sale.discount || '';
    document.getElementById('sale-subtitle').value    = sale.subtitle || '';
    previewSale();
  }
}

function previewSale() {
  const tag      = document.getElementById('sale-tag').value      || 'Summer Sale 2026';
  const discount = document.getElementById('sale-discount').value || '70';
  const subtitle = document.getElementById('sale-subtitle').value || 'On top fashion brands — limited time offer!';
  document.getElementById('prev-tag').textContent   = tag;
  document.getElementById('prev-title').innerHTML   = `Up to <u>${discount}% OFF</u>`;
  document.getElementById('prev-sub').textContent   = subtitle;
}

function toggleSale() { previewSale(); }

function saveSale() {
  const sale = {
    active:   document.getElementById('sale-active').checked,
    tag:      document.getElementById('sale-tag').value.trim()      || 'Summer Sale 2026',
    discount: document.getElementById('sale-discount').value        || '70',
    subtitle: document.getElementById('sale-subtitle').value.trim() || 'Limited time offer!',
  };
  localStorage.setItem('tv_sale', JSON.stringify(sale));
  const btn = event.target;
  btn.innerHTML = '<i class="fas fa-check"></i> Saved!';
  btn.style.background = '#27ae60';
  setTimeout(() => { btn.innerHTML = '<i class="fas fa-save"></i> Save & Apply to Website'; btn.style.background = ''; }, 2000);
}

// ---- Ads Management ----
let adminAds = JSON.parse(localStorage.getItem('tv_ads') || 'null') || [
  { id:1, text:'🇵🇰 23 March Pakistan Day Sale!', subtext:'Celebrate with up to 50% OFF on all Pakistani brands', btnText:'Shop Sale', link:'#products-section', bg:'linear-gradient(135deg, #01411C, #006400)', active:true },
  { id:2, text:'Sitara Meel — Premium Fabrics',   subtext:'Lawn, Khaddar & Chiffon — New Collection 2026',       btnText:'Explore Now', link:'#products-section', bg:'linear-gradient(135deg, #8B0000, #c0392b)', active:true },
  { id:3, text:'Interloop — Comfort Wear',        subtext:'Socks, Innerwear & Casual — Best Quality Guaranteed', btnText:'Shop Now',    link:'#products-section', bg:'linear-gradient(135deg, #1a237e, #3949ab)', active:true },
];

function saveAdsToStorage() {
  localStorage.setItem('tv_ads', JSON.stringify(adminAds));
}

function loadAds() {
  document.getElementById('ads-table').innerHTML = adminAds.map(ad => `
    <tr>
      <td>
        <div style="background:${ad.bg};padding:0.4rem 0.8rem;border-radius:6px;color:#fff;font-size:0.82rem;font-weight:600;display:inline-block">${ad.text}</div>
        <div style="font-size:0.75rem;color:#aaa;margin-top:0.2rem">${ad.subtext}</div>
      </td>
      <td><div style="width:30px;height:20px;border-radius:4px;background:${ad.bg}"></div></td>
      <td style="font-size:0.82rem;color:#555">${ad.link}</td>
      <td><span class="badge ${ad.active ? 'badge-delivered' : 'badge-cancelled'}">${ad.active ? 'Active' : 'Inactive'}</span></td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="editAd(${ad.id})"><i class="fas fa-edit"></i></button>
        <button class="btn btn-danger btn-sm" onclick="deleteAd(${ad.id})"><i class="fas fa-trash"></i></button>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="5" style="text-align:center;color:#aaa">No ads</td></tr>';
}

function openAdModal(ad = null) {
  document.getElementById('ad-id').value = '';
  document.getElementById('ad-text').value = '';
  document.getElementById('ad-subtext').value = '';
  document.getElementById('ad-btn').value = 'Shop Now';
  document.getElementById('ad-link').value = '#products-section';
  document.getElementById('ad-bg').value = 'linear-gradient(135deg, #FF4500, #ff8c00)';
  document.getElementById('ad-active').value = 'true';
  document.getElementById('ad-modal-title').textContent = 'Add Banner Ad';
  if (ad) {
    document.getElementById('ad-modal-title').textContent = 'Edit Banner Ad';
    document.getElementById('ad-id').value      = ad.id;
    document.getElementById('ad-text').value    = ad.text;
    document.getElementById('ad-subtext').value = ad.subtext;
    document.getElementById('ad-btn').value     = ad.btnText;
    document.getElementById('ad-link').value    = ad.link;
    document.getElementById('ad-bg').value      = ad.bg;
    document.getElementById('ad-active').value  = String(ad.active);
  }
  document.getElementById('ad-modal').classList.add('open');
}

function closeAdModal() { document.getElementById('ad-modal').classList.remove('open'); }

function editAd(id) { openAdModal(adminAds.find(a => a.id === id)); }

function deleteAd(id) {
  if (!confirm('Delete this ad?')) return;
  adminAds = adminAds.filter(a => a.id !== id);
  saveAdsToStorage();
  loadAds();
}

function saveAd() {
  const id      = document.getElementById('ad-id').value;
  const newAd = {
    id:      id ? parseInt(id) : Date.now(),
    text:    document.getElementById('ad-text').value.trim(),
    subtext: document.getElementById('ad-subtext').value.trim(),
    btnText: document.getElementById('ad-btn').value.trim() || 'Shop Now',
    link:    document.getElementById('ad-link').value.trim() || '#products-section',
    bg:      document.getElementById('ad-bg').value,
    active:  document.getElementById('ad-active').value === 'true',
  };
  if (!newAd.text) { alert('Please enter headline text'); return; }
  if (id) adminAds = adminAds.map(a => a.id === parseInt(id) ? newAd : a);
  else adminAds.push(newAd);
  saveAdsToStorage();
  loadAds();
  closeAdModal();
}

// ---- Init ----
loadDashboard();

// ---- Category Revenue Chart ----
let categoryChart = null;

function buildCategoryChart(orders) {
  const cats = { men: 0, women: 0, kids: 0 };
  (orders || []).forEach(o => {
    if (o.status === 'cancelled') return;
    (o.items || []).forEach(item => {
      const cat = (item.category || '').toLowerCase();
      if (cats[cat] !== undefined) cats[cat] += (item.price || 0) * (item.qty || 1);
    });
  });

  const ctx = document.getElementById('category-chart');
  if (!ctx) return;
  if (categoryChart) categoryChart.destroy();
  categoryChart = new Chart(ctx.getContext('2d'), {
    type: 'bar',
    data: {
      labels: ['Men', 'Women', 'Kids'],
      datasets: [{
        label: 'Revenue (Rs.)',
        data: [cats.men, cats.women, cats.kids],
        backgroundColor: ['rgba(248,86,6,0.8)', 'rgba(123,31,162,0.8)', 'rgba(21,101,192,0.8)'],
        borderRadius: 6,
        borderWidth: 0,
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { callback: v => 'Rs.' + v.toLocaleString() } }
      }
    }
  });
}

// Patch loadDashboard to also build category chart
const _origLoadDashboard = loadDashboard;
loadDashboard = async function() {
  await _origLoadDashboard();
  try {
    const orders = await fetch(`${API}/orders`, { headers: authHeaders() }).then(r => r.json());
    buildCategoryChart(orders || []);
  } catch(e) {}
};

// ---- Coupons Management ----
function loadCoupons() {
  const coupons = JSON.parse(localStorage.getItem('tv_coupons') || '[]');
  const tbody = document.getElementById('coupons-table');
  if (!tbody) return;
  tbody.innerHTML = coupons.length ? coupons.map(c => `
    <tr>
      <td><strong style="font-size:1rem;letter-spacing:1px;color:#f85606">${c.code}</strong></td>
      <td>${c.type === 'percent' ? c.value + '% OFF' : 'Rs. ' + c.value + ' OFF'}</td>
      <td>${c.type === 'percent' ? 'Percentage' : 'Flat Amount'}</td>
      <td><span class="badge ${c.active ? 'badge-delivered' : 'badge-cancelled'}">${c.active ? 'Active' : 'Inactive'}</span></td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="editCoupon('${c.code}')"><i class="fas fa-edit"></i></button>
        <button class="btn btn-danger btn-sm" onclick="deleteCoupon('${c.code}')"><i class="fas fa-trash"></i></button>
      </td>
    </tr>
  `).join('') : '<tr><td colspan="5" style="text-align:center;color:#aaa">No coupons yet</td></tr>';
}

function openCouponModal(coupon = null) {
  document.getElementById('coupon-modal-code').value  = coupon ? coupon.code : '';
  document.getElementById('coupon-modal-type').value  = coupon ? coupon.type : 'percent';
  document.getElementById('coupon-modal-value').value = coupon ? coupon.value : '';
  document.getElementById('coupon-modal-active').value = coupon ? String(coupon.active) : 'true';
  document.getElementById('coupon-modal-orig').value  = coupon ? coupon.code : '';
  document.getElementById('coupon-modal-title').textContent = coupon ? 'Edit Coupon' : 'Add Coupon';
  document.getElementById('coupon-modal').classList.add('open');
}

function closeCouponModal() {
  document.getElementById('coupon-modal').classList.remove('open');
}

function saveCoupon() {
  const code  = document.getElementById('coupon-modal-code').value.trim().toUpperCase();
  const type  = document.getElementById('coupon-modal-type').value;
  const value = parseFloat(document.getElementById('coupon-modal-value').value);
  const active = document.getElementById('coupon-modal-active').value === 'true';
  const orig  = document.getElementById('coupon-modal-orig').value;

  if (!code || !value) { alert('Please fill all fields'); return; }

  let coupons = JSON.parse(localStorage.getItem('tv_coupons') || '[]');
  const newCoupon = { code, type, value, active };

  if (orig) {
    coupons = coupons.map(c => c.code === orig ? newCoupon : c);
  } else {
    if (coupons.find(c => c.code === code)) { alert('Coupon code already exists'); return; }
    coupons.push(newCoupon);
  }

  localStorage.setItem('tv_coupons', JSON.stringify(coupons));
  closeCouponModal();
  loadCoupons();
}

function editCoupon(code) {
  const coupons = JSON.parse(localStorage.getItem('tv_coupons') || '[]');
  const c = coupons.find(x => x.code === code);
  if (c) openCouponModal(c);
}

function deleteCoupon(code) {
  if (!confirm(`Delete coupon "${code}"?`)) return;
  let coupons = JSON.parse(localStorage.getItem('tv_coupons') || '[]');
  coupons = coupons.filter(c => c.code !== code);
  localStorage.setItem('tv_coupons', JSON.stringify(coupons));
  loadCoupons();
}

// ---- Sellers Management ----
let allSellers = [];

async function loadSellers() {
  try {
    const res = await fetch(`${API}/sellers`, { headers: authHeaders() });
    allSellers = await res.json();
    renderSellersTable(allSellers);
  } catch (e) { console.error(e); }
}

function renderSellersTable(sellers) {
  const tbody = document.getElementById('sellers-table');
  if (!tbody) return;
  tbody.innerHTML = sellers.length ? sellers.map(s => `
    <tr>
      <td><strong>${s.name}</strong></td>
      <td>${s.phone}</td>
      <td>${s.easypaisa || '<span style="color:#bbb">—</span>'}</td>
      <td>${s.jazzcash  || '<span style="color:#bbb">—</span>'}</td>
      <td>
        <span style="background:#fff3ee;color:#f85606;padding:2px 10px;border-radius:20px;font-size:0.78rem;font-weight:700">
          ${s.commissionRate}%
        </span>
      </td>
      <td><span class="badge ${s.isActive ? 'badge-delivered' : 'badge-cancelled'}">${s.isActive ? 'Active' : 'Inactive'}</span></td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="editSeller('${s._id}')"><i class="fas fa-edit"></i></button>
        <button class="btn btn-danger btn-sm" onclick="deleteSeller('${s._id}')"><i class="fas fa-trash"></i></button>
      </td>
    </tr>
  `).join('') : '<tr><td colspan="7" style="text-align:center;color:#aaa">No sellers yet</td></tr>';
}

function openSellerModal(seller = null) {
  document.getElementById('seller-modal-id').value  = seller ? seller._id : '';
  document.getElementById('s-name').value           = seller ? seller.name : '';
  document.getElementById('s-phone').value          = seller ? seller.phone : '';
  document.getElementById('s-email').value          = seller ? seller.email : '';
  document.getElementById('s-commission').value     = seller ? seller.commissionRate : 10;
  document.getElementById('s-easypaisa').value      = seller ? seller.easypaisa : '';
  document.getElementById('s-jazzcash').value       = seller ? seller.jazzcash : '';
  document.getElementById('s-active').value         = seller ? String(seller.isActive) : 'true';
  document.getElementById('seller-modal-title').textContent = seller ? 'Edit Seller' : 'Add Seller';
  document.getElementById('seller-modal').classList.add('open');
}

function closeSellerModal() {
  document.getElementById('seller-modal').classList.remove('open');
}

function editSeller(id) {
  const seller = allSellers.find(s => s._id === id);
  if (seller) openSellerModal(seller);
}

async function saveSeller() {
  const id   = document.getElementById('seller-modal-id').value;
  const name = document.getElementById('s-name').value.trim();
  const phone = document.getElementById('s-phone').value.trim();
  if (!name || !phone) { alert('Name and phone are required'); return; }

  const payload = {
    name,
    phone,
    email:          document.getElementById('s-email').value.trim(),
    commissionRate: parseFloat(document.getElementById('s-commission').value) || 10,
    easypaisa:      document.getElementById('s-easypaisa').value.trim(),
    jazzcash:       document.getElementById('s-jazzcash').value.trim(),
    isActive:       document.getElementById('s-active').value === 'true',
  };

  try {
    const url    = id ? `${API}/sellers/${id}` : `${API}/sellers`;
    const method = id ? 'PUT' : 'POST';
    const res    = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(payload) });
    if (!res.ok) throw new Error('Failed');
    closeSellerModal();
    loadSellers();
  } catch (err) {
    alert('Failed to save seller');
  }
}

async function deleteSeller(id) {
  if (!confirm('Delete this seller?')) return;
  try {
    await fetch(`${API}/sellers/${id}`, { method: 'DELETE', headers: authHeaders() });
    loadSellers();
  } catch (e) { alert('Failed to delete'); }
}

// ---- Courier Modal ----
function openCourierModal(orderId, currentName, currentTracking) {
  document.getElementById('courier-order-id').value    = orderId;
  document.getElementById('courier-name').value        = currentName || '';
  document.getElementById('courier-tracking').value    = currentTracking || '';
  document.getElementById('courier-modal').classList.add('open');
}

function closeCourierModal() {
  document.getElementById('courier-modal').classList.remove('open');
}

async function saveCourier() {
  const id         = document.getElementById('courier-order-id').value;
  const courierName       = document.getElementById('courier-name').value;
  const courierTrackingId = document.getElementById('courier-tracking').value.trim();
  if (!courierName || !courierTrackingId) { alert('Please select courier and enter tracking ID'); return; }
  try {
    const res = await fetch(`${API}/orders/${id}/courier`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ courierName, courierTrackingId })
    });
    if (!res.ok) throw new Error();
    closeCourierModal();
    loadOrders();
  } catch(e) { alert('Failed to assign courier'); }
}

// ---- Init ----
loadDashboard();
