// ============================================================
// MakanApa — Main Application Logic  (v4 — PHP + fetch polling)
// No Supabase. All real-time via setInterval polling.
// ============================================================

// ── Page detection ───────────────────────────────────────────
const isSellerPage = document.body.classList.contains('seller-theme');

// ── State ────────────────────────────────────────────────────
let currentRequestId   = null;
let pollingInterval    = null;
let auctionContainer   = null;
let currentDbUser      = null;
let isProcessing       = false;
let deliveryMap        = null;
let deliveryMarker     = null;
let deliveryCoords     = null; // { lat, lng }
let currentOrderContext = {};  // seller/food/price/contact/stock/offerId/sellerId

// ── UI shortcuts ─────────────────────────────────────────────
const chatArea  = document.getElementById('chat-area');
const userInput = document.getElementById('user-input');

// ── SOUND SYSTEM ─────────────────────────────────────────────
function playSound(type) {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc  = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        const t = audioCtx.currentTime;
        if (type === 'success') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, t);
            osc.frequency.setValueAtTime(659.25, t + 0.1);
            gain.gain.setValueAtTime(0.3, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
            osc.start(); osc.stop(t + 0.3);
        } else if (type === 'error') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, t);
            osc.frequency.exponentialRampToValueAtTime(150, t + 0.2);
            gain.gain.setValueAtTime(0.3, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
            osc.start(); osc.stop(t + 0.2);
        } else {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(type === 'click' ? 700 : 800, t);
            gain.gain.setValueAtTime(0.25, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
            osc.start(); osc.stop(t + 0.12);
        }
    } catch (e) { /* AudioContext blocked — silent fail */ }
}

// ── TOAST SYSTEM ─────────────────────────────────────────────
function showToast(title, message, type = 'default', duration = 4500) {
    if (type === 'success') playSound('success');
    else if (type === 'error') playSound('error');
    else playSound('notify');

    const container = document.getElementById('toast-container');
    if (!container) return;
    const icons = { default: '🔔', success: '✅', error: '❌', buyer: '🛵', seller: '📦' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-icon">${icons[type] || '🔔'}</div>
        <div class="toast-body">
            <div class="toast-title">${title}</div>
            ${message ? `<div class="toast-message">${message}</div>` : ''}
        </div>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 320);
    }, duration);
}

// ── SPINNER ──────────────────────────────────────────────────
function showSpinner() { document.getElementById('loading-overlay')?.classList.remove('hidden'); }
function hideSpinner() { document.getElementById('loading-overlay')?.classList.add('hidden'); }

// ── PROFILE HELPERS ──────────────────────────────────────────
function isProfileSet() {
    return isSellerPage
        ? !!(localStorage.getItem('seller_phone') && localStorage.getItem('seller_name'))
        : !!(localStorage.getItem('buyer_phone')  && localStorage.getItem('buyer_name'));
}

function checkProfile() {
    if (!isProfileSet()) {
        showToast('Profile Setup Required', 'Please set up your Name and Phone in Settings (⚙️) first!', 'error');
        openConfig();
        return false;
    }
    return true;
}

function updateGatekeeperUI() {
    if (isSellerPage) return;
    const profileSet = isProfileSet();
    const sendBtn = document.getElementById('send-btn');
    const input   = document.getElementById('user-input');
    if (sendBtn) {
        sendBtn.style.opacity = profileSet ? '1' : '0.5';
        sendBtn.style.cursor  = profileSet ? 'pointer' : 'not-allowed';
    }
    if (input) {
        input.disabled    = !profileSet;
        input.style.opacity = profileSet ? '1' : '0.5';
        input.placeholder = profileSet ? 'What are you craving? 🤔' : 'Profile Setup Required. Click ⚙️ to set up.';
    }
}

// ── CONFIG MODAL ─────────────────────────────────────────────
function openConfig() {
    const modal = document.getElementById('auth-modal');
    if (!modal) return;
    const savedName  = isSellerPage ? localStorage.getItem('seller_name')  : localStorage.getItem('buyer_name');
    const savedPhone = isSellerPage ? localStorage.getItem('seller_phone') : localStorage.getItem('buyer_phone');
    const nameEl  = document.getElementById('auth-name');
    const phoneEl = document.getElementById('auth-phone');
    if (nameEl)  nameEl.value  = savedName  || '';
    if (phoneEl) phoneEl.value = savedPhone || '';

    // Restore location label if coords already saved
    const latKey = isSellerPage ? 'seller_lat' : 'buyer_lat';
    const lngKey = isSellerPage ? 'seller_lng' : 'buyer_lng';
    const savedLat = localStorage.getItem(latKey);
    const savedLng = localStorage.getItem(lngKey);
    if (savedLat && savedLng) {
        const coordText = `✅ Location set (${parseFloat(savedLat).toFixed(4)}, ${parseFloat(savedLng).toFixed(4)})`;
        const sellerLabel = document.getElementById('seller-loc-label');
        const buyerLabel  = document.getElementById('buyer-loc-label');
        if (sellerLabel) sellerLabel.textContent = coordText;
        if (buyerLabel)  buyerLabel.textContent  = coordText;
    }
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    // Init the correct map after the modal is visible
    setTimeout(() => {
        if (isSellerPage) initSellerConfigMap();
        else              initBuyerConfigMap();
    }, 100);
}

// ── CONFIG MAP PICKERS ────────────────────────────────────────
// Separate map instances for seller and buyer config modals
let _sellerConfigMap = null, _sellerConfigMarker = null;
let _buyerConfigMap  = null, _buyerConfigMarker  = null;

// Role-specific localStorage keys so seller and buyer coords never collide
const LAT_KEY = isSellerPage ? 'seller_lat' : 'buyer_lat';
const LNG_KEY = isSellerPage ? 'seller_lng' : 'buyer_lng';

function _initConfigMap(mapId, markerColor, latKey, lngKey, onMove) {
    if (!window.L) return null;
    const el = document.getElementById(mapId);
    if (!el) return null;

    const savedLat = parseFloat(localStorage.getItem(latKey) || '') || -6.2088;
    const savedLng = parseFloat(localStorage.getItem(lngKey) || '') || 106.8456;

    const map = L.map(mapId, { zoomControl: true }).setView([savedLat, savedLng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap', maxZoom: 19
    }).addTo(map);

    const icon = L.divIcon({
        html: `<div style="font-size:28px;line-height:1;">${markerColor === 'teal' ? '🏪' : '📍'}</div>`,
        iconAnchor: [14, 28], className: ''
    });
    const marker = L.marker([savedLat, savedLng], { draggable: true, icon }).addTo(map);

    const updateCoords = async (lat, lng) => {
        localStorage.setItem(latKey, lat);
        localStorage.setItem(lngKey, lng);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
            const d   = await res.json();
            const short = d.address?.suburb || d.address?.city_district || d.address?.city || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            onMove(short, d.display_name || short);
        } catch (_) { onMove(`${lat.toFixed(4)}, ${lng.toFixed(4)}`, ''); }
    };

    marker.on('dragend', e => {
        const { lat, lng } = e.target.getLatLng();
        updateCoords(lat, lng);
    });
    map.on('click', e => {
        marker.setLatLng(e.latlng);
        updateCoords(e.latlng.lat, e.latlng.lng);
    });

    // Show label for already-saved coords on open (don't overwrite address input)
    if (!isNaN(parseFloat(localStorage.getItem(latKey)))) {
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${savedLat}&lon=${savedLng}&format=json`)
            .then(r => r.json()).then(d => {
                const short = d.address?.suburb || d.address?.city_district || d.address?.city || `${savedLat.toFixed(4)}, ${savedLng.toFixed(4)}`;
                onMove(short, null); // null = don't update address input on init
            }).catch(() => {});
    }

    setTimeout(() => map.invalidateSize(), 350);
    return { map, marker };
}

// Called when seller config modal opens
function initSellerConfigMap() {
    if (_sellerConfigMap) { setTimeout(() => _sellerConfigMap.invalidateSize(), 350); return; }
    const inst = _initConfigMap('seller-config-map', 'teal', 'seller_lat', 'seller_lng', (short, full) => {
        const lbl = document.getElementById('seller-loc-label');
        if (lbl) lbl.textContent = `✅ ${short}`;
        if (full !== null) {
            const inp = document.getElementById('seller-address-input');
            if (inp) inp.value = full;
        }
    });
    if (inst) { _sellerConfigMap = inst.map; _sellerConfigMarker = inst.marker; }
}

// Called when buyer config modal opens
function initBuyerConfigMap() {
    if (_buyerConfigMap) { setTimeout(() => _buyerConfigMap.invalidateSize(), 350); return; }
    const inst = _initConfigMap('buyer-config-map', 'orange', 'buyer_lat', 'buyer_lng', (short, full) => {
        const lbl = document.getElementById('buyer-loc-label');
        if (lbl) lbl.textContent = `✅ ${short}`;
        if (full !== null) {
            const inp = document.getElementById('buyer-address-input');
            if (inp) inp.value = full;
        }
    });
    if (inst) { _buyerConfigMap = inst.map; _buyerConfigMarker = inst.marker; }
}

// "My Location" buttons
window.sellerMapLocateMe = function() {
    if (!navigator.geolocation) return showToast('Geolocation not supported', '', 'error');
    navigator.geolocation.getCurrentPosition(pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        localStorage.setItem('seller_lat', lat);
        localStorage.setItem('seller_lng', lng);
        if (_sellerConfigMap && _sellerConfigMarker) {
            _sellerConfigMap.setView([lat, lng], 16);
            _sellerConfigMarker.setLatLng([lat, lng]);
        }
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
            .then(r => r.json()).then(d => {
                const short = d.address?.suburb || d.address?.city_district || d.address?.city || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                const lbl = document.getElementById('seller-loc-label');
                if (lbl) lbl.textContent = `✅ ${short}`;
                const inp = document.getElementById('seller-address-input');
                if (inp) inp.value = d.display_name || short;
            }).catch(() => {});
    }, () => showToast('Permission denied', 'Enable location access.', 'error'));
};

window.buyerMapLocateMe = function() {
    if (!navigator.geolocation) return showToast('Geolocation not supported', '', 'error');
    navigator.geolocation.getCurrentPosition(pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        localStorage.setItem('buyer_lat', lat);
        localStorage.setItem('buyer_lng', lng);
        if (_buyerConfigMap && _buyerConfigMarker) {
            _buyerConfigMap.setView([lat, lng], 16);
            _buyerConfigMarker.setLatLng([lat, lng]);
        }
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
            .then(r => r.json()).then(d => {
                const short = d.address?.suburb || d.address?.city_district || d.address?.city || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                const lbl = document.getElementById('buyer-loc-label');
                if (lbl) lbl.textContent = `✅ ${short}`;
                const inp = document.getElementById('buyer-address-input');
                if (inp) inp.value = d.display_name || short;
            }).catch(() => {});
    }, () => showToast('Permission denied', 'Enable location access.', 'error'));
};

// Debounced geocode for manual address inputs
let _sellerGeoTimer = null;
window.geocodeSellerAddress = function(val) {
    clearTimeout(_sellerGeoTimer);
    if (!val || val.length < 5) return;
    _sellerGeoTimer = setTimeout(async () => {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&limit=1`);
            const d   = await res.json();
            if (d && d[0]) {
                const lat = parseFloat(d[0].lat), lng = parseFloat(d[0].lon);
                localStorage.setItem('seller_lat', lat);
                localStorage.setItem('seller_lng', lng);
                if (_sellerConfigMap && _sellerConfigMarker) {
                    _sellerConfigMap.setView([lat, lng], 15);
                    _sellerConfigMarker.setLatLng([lat, lng]);
                }
                const lbl = document.getElementById('seller-loc-label');
                if (lbl) lbl.textContent = `✅ ${d[0].display_name.split(',')[0]}`;
            }
        } catch (_) {}
    }, 900);
};

let _buyerGeoTimer = null;
window.geocodeBuyerAddress = function(val) {
    clearTimeout(_buyerGeoTimer);
    if (!val || val.length < 5) return;
    _buyerGeoTimer = setTimeout(async () => {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&limit=1`);
            const d   = await res.json();
            if (d && d[0]) {
                const lat = parseFloat(d[0].lat), lng = parseFloat(d[0].lon);
                localStorage.setItem('buyer_lat', lat);
                localStorage.setItem('buyer_lng', lng);
                if (_buyerConfigMap && _buyerConfigMarker) {
                    _buyerConfigMap.setView([lat, lng], 15);
                    _buyerConfigMarker.setLatLng([lat, lng]);
                }
                const lbl = document.getElementById('buyer-loc-label');
                if (lbl) lbl.textContent = `✅ ${d[0].display_name.split(',')[0]}`;
            }
        } catch (_) {}
    }, 900);
};

async function saveConfig() {
    const nameEl  = document.getElementById('auth-name');
    const phoneEl = document.getElementById('auth-phone');
    let name  = nameEl  ? nameEl.value.trim()  : '';
    const phone = phoneEl ? phoneEl.value.trim() : '';

    if (!name || !phone) { alert('Tolong isi nama dan nomor HP dulu ya!'); return; }

    // Auto-append last-4 suffix for uniqueness
    const suffix = phone.slice(-4);
    if (!name.endsWith(suffix)) {
        name = `${name} ${suffix}`;
        if (nameEl) nameEl.value = name;
    }

    if (isSellerPage) {
        localStorage.setItem('seller_name',  name);
        localStorage.setItem('seller_phone', phone);
    } else {
        localStorage.setItem('buyer_name',  name);
        localStorage.setItem('buyer_phone', phone);
    }
    localStorage.setItem('user_phone', phone);

    const modal = document.getElementById('auth-modal');
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }

    await fetchUserProfile();
    if (isSellerPage) loadSellerRequests();
    updateGatekeeperUI();
    alert('Profile saved! ✅');
}

// ── USER PROFILE (auto-login / upsert) ───────────────────────
async function fetchUserProfile() {
    const phone = isSellerPage ? localStorage.getItem('seller_phone') : localStorage.getItem('buyer_phone');
    const name  = isSellerPage ? localStorage.getItem('seller_name')  : localStorage.getItem('buyer_name');
    if (!phone) return;
    try {
        // Pass saved coordinates so the DB row stays fresh
        const savedLat = parseFloat(localStorage.getItem(LAT_KEY) || '');
        const savedLng = parseFloat(localStorage.getItem(LNG_KEY) || '');
        const coords   = (!isNaN(savedLat) && !isNaN(savedLng))
            ? { lat: savedLat, lng: savedLng, address: localStorage.getItem('user_address') || '' }
            : null;

        currentDbUser = await API.upsertUser(phone, name || phone, coords);
        if (currentDbUser?.id) localStorage.setItem('user_id', currentDbUser.id);
        loadBalance();
    } catch (err) {
        console.error('fetchUserProfile error:', err);
    }
}
const loadUserProfile = fetchUserProfile; // backward-compat alias

// ── BALANCE ──────────────────────────────────────────────────
function loadBalance() {
    if (!currentDbUser) return;
    const el = document.getElementById('user-balance');
    if (el) el.innerText = parseInt(currentDbUser.balance || 0).toLocaleString('id-ID');
}

async function submitTopup() {
    const amountInput = document.getElementById('topup-amount');
    const amount = parseInt(amountInput?.value);
    if (isNaN(amount) || amount <= 0) { alert('Hey, input a valid top-up amount!'); return; }
    try {
        await fetchUserProfile();
        const userId = currentDbUser?.id || localStorage.getItem('user_id');
        const phone  = isSellerPage ? localStorage.getItem('seller_phone') : localStorage.getItem('buyer_phone');
        if (!userId && !phone) { alert('Profile not found. Set up your name and phone first!'); return; }

        const result = await API.topup(userId, amount, phone);
        if (currentDbUser) currentDbUser.balance = result.new_balance;

        // Persist top-up in localStorage for history display
        const topupKey = `topup_history_${phone || ''}`;
        const topups = JSON.parse(localStorage.getItem(topupKey) || '[]');
        topups.push({ amount, date: Date.now() });
        localStorage.setItem(topupKey, JSON.stringify(topups));

        alert('Top up success! Balance: Rp ' + result.new_balance.toLocaleString('id-ID'));
        closeTopupModal();
        loadBalance();
    } catch (err) {
        console.error('Topup error:', err);
        alert('Top up failed: ' + err.message);
    }
}

function openTopupModal()  { const m = document.getElementById('topup-modal');  if (m) { m.classList.remove('hidden'); m.classList.add('flex'); } }
function closeTopupModal() { const m = document.getElementById('topup-modal');  if (m) { m.classList.add('hidden'); m.classList.remove('flex'); } }



// ── CHAT HELPERS ─────────────────────────────────────────────
function addMessage(text, sender) {
    const area = document.getElementById('chat-area');
    if (!area) return;
    const div = document.createElement('div');
    div.className = sender === 'bot' ? 'flex justify-start mb-4' : 'flex justify-end mb-4';
    const bubbleCls = sender === 'bot'
        ? 'bg-orange-100 text-orange-800 rounded-tl-none border-orange-200'
        : 'bg-orange-600 text-white rounded-tr-none border-transparent';
    div.innerHTML = `<div class="${bubbleCls} p-4 rounded-2xl shadow-sm max-w-[80%] border"><p class="text-sm font-medium">${text}</p></div>`;
    area.appendChild(div);
    area.scrollTop = area.scrollHeight;
}

// ── LEAFLET MAP ──────────────────────────────────────────────
function initDeliveryMap() {
    if (!window.L) return;
    const mapEl = document.getElementById('delivery-map');
    if (!mapEl) return;
    if (deliveryMap) { deliveryMap.remove(); deliveryMap = null; deliveryMarker = null; }

    const defaultLat = -6.2088, defaultLng = 106.8456;
    deliveryMap = L.map('delivery-map', { zoomControl: true }).setView([defaultLat, defaultLng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap', maxZoom: 19
    }).addTo(deliveryMap);

    const pinIcon = L.divIcon({ html: '<div style="font-size:28px;line-height:1;">📍</div>', iconAnchor: [14, 28], className: '' });
    deliveryMarker = L.marker([defaultLat, defaultLng], { draggable: true, icon: pinIcon }).addTo(deliveryMap);
    deliveryCoords = { lat: defaultLat, lng: defaultLng };

    deliveryMarker.on('dragend', async (e) => {
        const { lat, lng } = e.target.getLatLng();
        deliveryCoords = { lat, lng };
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
            const d = await res.json();
            const addrEl = document.getElementById('order-address');
            if (addrEl) addrEl.value = d.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        } catch (_) {}
    });

    deliveryMap.on('click', (e) => {
        const { lat, lng } = e.latlng;
        deliveryMarker.setLatLng([lat, lng]);
        deliveryCoords = { lat, lng };
    });

    setTimeout(() => deliveryMap.invalidateSize(), 320);
}

async function locateMeOnMap() {
    if (!navigator.geolocation) { showToast('Geolocation not supported', '', 'error'); return; }
    navigator.geolocation.getCurrentPosition(async pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        deliveryCoords = { lat, lng };
        if (deliveryMap && deliveryMarker) {
            deliveryMap.setView([lat, lng], 16);
            deliveryMarker.setLatLng([lat, lng]);
        }
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
            const d = await res.json();
            const addrEl = document.getElementById('order-address');
            if (addrEl) addrEl.value = d.display_name;
            localStorage.setItem('buyer_address', d.display_name);
        } catch (_) {}
        showToast('Location pinned!', 'Drag the marker to adjust.', 'success');
    }, () => showToast('Permission denied', 'Enable location access.', 'error'));
}

// ── BUYER: SEND REQUEST ──────────────────────────────────────
async function sendRequest(text) {
    const buyerName  = localStorage.getItem('buyer_name')  || 'Anonymous';
    const buyerPhone = localStorage.getItem('buyer_phone') || '';
    const suffix     = buyerPhone.length >= 4 ? buyerPhone.slice(-4) : buyerPhone;
    const displayName = `${buyerName} ${suffix}`;

    addMessage('Requesting your order. Waiting for sellers... ⏳', 'bot');
    auctionContainer = null;

    // Use buyer's saved location from profile — fall back to live GPS
    let coords = null;
    const savedLat = parseFloat(localStorage.getItem('buyer_lat') || '');
    const savedLng = parseFloat(localStorage.getItem('buyer_lng') || '');
    if (!isNaN(savedLat) && !isNaN(savedLng)) {
        coords = { lat: savedLat, lng: savedLng };
    } else {
        // Try live GPS as fallback
        try {
            coords = await new Promise(resolve => {
                if (!navigator.geolocation) return resolve(null);
                navigator.geolocation.getCurrentPosition(
                    pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                    ()  => resolve(null),
                    { timeout: 5000 }
                );
            });
            if (coords) {
                localStorage.setItem('buyer_lat', coords.lat);
                localStorage.setItem('buyer_lng', coords.lng);
            }
        } catch (_) {}
    }

    try {
        const req = await API.createRequest(
            currentDbUser?.id || null,
            displayName,
            text,
            1,
            '',      // notes (empty at request stage)
            coords   // buyer lat/lng saved to DB
        );
        currentRequestId = req.id;
        startPollingOffers();
    } catch (err) {
        addMessage('Failed to send request. Check connection!', 'bot');
        console.error('sendRequest error:', err);
    }
}

// ── POLLING: OFFERS (buyer side) ─────────────────────────────
function startPollingOffers() {
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(async () => {
        if (!currentRequestId) return;
        try {
            const offers = await API.getOffers(currentRequestId);
            if (offers && offers.length > 0) renderAuction(offers);
        } catch (_) {}
    }, 2000);
}

// ── RENDER AUCTION (buyer offer cards) ───────────────────────
function renderAuction(offers) {
    if (!auctionContainer) {
        auctionContainer = document.createElement('div');
        auctionContainer.className = 'bot-msg message-bubble w-full';
        auctionContainer.innerHTML = `
            <div class="font-bold mb-3 text-sm flex items-center gap-2" style="color:#FF7A00;">
                <span class="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                🔥 LIVE OFFERS — Choose your best deal!
            </div>
            <div id="auction-list" class="flex flex-col gap-3"></div>`;
        chatArea.appendChild(auctionContainer);
    }

    const list = auctionContainer.querySelector('#auction-list');
    list.innerHTML = '';

    let maxScore = 0, minPrice = Infinity;
    offers.forEach(o => {
        const weight = parseInt(o.weight_volume) || 0;
        const price  = parseInt(o.price) || 1;
        o.valueScore = weight > 0 ? (weight / (price / 1000)) : 0;
        if (o.valueScore > maxScore) maxScore = o.valueScore;
        if (price < minPrice) minPrice = price;
    });

    offers.forEach(offer => {
        const price      = Number(offer.price);
        const stock      = offer.stock !== undefined ? parseInt(offer.stock) : 99;
        const isSoldOut  = stock <= 0;
        const isCheapest = price === minPrice;
        const isBestVal  = offer.valueScore === maxScore && maxScore > 0;

        // ── Distance badge — use DB value or calculate client-side fallback ──
        let distKm = null;
        if (offer.distance_km !== null && offer.distance_km !== undefined && offer.distance_km !== '0.00') {
            distKm = parseFloat(offer.distance_km).toFixed(1);
        } else if (offer.seller_lat && offer.seller_lng) {
            // Fallback: calculate using buyer's saved location vs seller's user coords
            const buyerLat = parseFloat(localStorage.getItem('buyer_lat') || '');
            const buyerLng = parseFloat(localStorage.getItem('buyer_lng') || '');
            if (!isNaN(buyerLat) && !isNaN(buyerLng)) {
                const R = 6371;
                const dLat = (parseFloat(offer.seller_lat) - buyerLat) * Math.PI / 180;
                const dLng = (parseFloat(offer.seller_lng) - buyerLng) * Math.PI / 180;
                const a = Math.sin(dLat/2)**2 + Math.cos(buyerLat*Math.PI/180) * Math.cos(parseFloat(offer.seller_lat)*Math.PI/180) * Math.sin(dLng/2)**2;
                const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                distKm = km.toFixed(1);
            }
        }
        const distHTML = distKm !== null
            ? `<span class="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">📍 ${distKm} km away</span>`
            : '';

        // ── Seller rating badge ──
        const rating = parseFloat(offer.seller_rating || 0);
        const ratingHTML = rating > 0
            ? `<span class="inline-flex items-center gap-1 text-[10px] font-semibold text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-full">⭐ ${rating.toFixed(1)}</span>`
            : '';

        // ── Value badge ──
        let extraClass = '', badgeHTML = '';
        if (isSoldOut) {
            badgeHTML = `<span style="display:inline-flex;align-items:center;gap:4px;background:#ef4444;color:white;font-size:10px;font-weight:800;padding:3px 10px;border-radius:999px;">🚫 SOLD OUT</span>`;
        } else if (isCheapest && isBestVal) {
            extraClass = 'cheapest-pulse';
            badgeHTML  = `<span class="badge-value">⭐ Best Value + Cheapest!</span>`;
        } else if (isCheapest) {
            extraClass = 'cheapest-pulse';
            badgeHTML  = `<span class="badge-value">💰 Cheapest!</span>`;
        } else if (isBestVal) {
            badgeHTML = `<span style="display:inline-flex;align-items:center;gap:4px;background:linear-gradient(135deg,#22c55e,#16a34a);color:white;font-size:10px;font-weight:800;padding:3px 10px;border-radius:999px;">✨ Most Worth It</span>`;
        }

        // ── Media ──
        let mediaHTML = '';
        if (offer.media_url) {
            const isVideo = /\.(mp4|webm|ogg)$/i.test(offer.media_url);
            mediaHTML = isVideo
                ? `<video class="w-full h-36 object-cover rounded-2xl mb-3" muted loop onmouseover="this.play()" onmouseout="this.pause()"><source src="${offer.media_url}" type="video/mp4"></video>`
                : `<img src="${offer.media_url}" class="w-full h-36 object-cover rounded-2xl mb-3" alt="${offer.food_name}" onclick="window.open('${offer.media_url}','_blank')" style="cursor:zoom-in;">`;
        }

        const last4 = offer.contact?.length >= 4 ? offer.contact.slice(-4) : (offer.contact || '');
        const displaySeller = `${offer.seller_name} ·${last4}`;

        const card = document.createElement('div');
        card.className = `auction-card p-4 flex flex-col gap-1 ${extraClass}`;
        card.innerHTML = `
            ${mediaHTML}
            <div class="flex justify-between items-start gap-2">
                <div class="flex-1">
                    <div class="text-[10px] text-gray-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                        <i class="fa-solid fa-store" style="color:#0D9488;"></i> ${displaySeller}
                    </div>
                    <div class="font-bold text-gray-800 text-base mt-0.5">${offer.food_name}</div>
                    <div class="flex flex-wrap gap-1 mt-1">
                        ${badgeHTML}
                        ${distHTML}
                        ${ratingHTML}
                    </div>
                </div>
                <div class="text-right flex flex-col items-end gap-2 flex-shrink-0">
                    <div class="font-bold text-lg" style="color:#FF7A00;">Rp ${price.toLocaleString('id-ID')}</div>
                    <button
                        ${isSoldOut ? 'disabled' : `onclick="openOrder('${offer.seller_name}','${offer.food_name.replace(/'/g,"\\'").replace(/"/g,'&quot;')}','${offer.price}','${offer.contact}','${stock}',${offer.id},${offer.seller_id || 'null'})"`}
                        class="text-white text-xs px-5 py-2 rounded-2xl font-bold transition-all shadow-md ${isSoldOut ? 'bg-gray-400 cursor-not-allowed opacity-70' : 'active:scale-95'}"
                        style="${isSoldOut ? '' : 'background:linear-gradient(135deg,#FF7A00,#FF9A3C);box-shadow:0 4px 14px rgba(255,122,0,0.4);'}">
                        ${isSoldOut ? 'Sold Out' : 'Choose'}
                    </button>
                </div>
            </div>`;
        list.appendChild(card);
    });

    chatArea.scrollTop = chatArea.scrollHeight;
}

// ── ORDER MODAL ───────────────────────────────────────────────
function openOrder(seller, food, price, contact, maxStock, offerId, sellerId) {
    currentOrderContext = { seller, food, price, contact, maxStock, offerId, sellerId };
    const modal = document.getElementById('order-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    document.getElementById('modal-seller-name').innerText = '🏪 ' + seller;
    document.getElementById('modal-food-name').innerText   = food;
    document.getElementById('modal-price').innerText       = 'Rp ' + Number(price).toLocaleString('id-ID');

    const qtyInput = document.getElementById('order-qty');
    const stock    = parseInt(maxStock) || 99;
    qtyInput.min   = 1;
    qtyInput.max   = stock;
    qtyInput.value = 1;

    const totalBox = document.getElementById('order-total');
    const updateTotal = () => {
        let qty = parseInt(qtyInput.value) || 1;
        if (qty > stock) { qty = stock; qtyInput.value = stock; showToast('Whoa!', `Only ${stock} left.`, 'error', 3000); }
        if (qty < 1)     { qty = 1;     qtyInput.value = 1; }
        totalBox.innerText = 'Total: Rp ' + (qty * Number(price)).toLocaleString('id-ID');
    };
    updateTotal();
    qtyInput.oninput = updateTotal;

    const savedName  = localStorage.getItem('buyer_name');
    const savedPhone = localStorage.getItem('buyer_phone') || '';
    const savedAddr  = localStorage.getItem('buyer_address');
    if (savedName)  document.getElementById('buyer-name').value = savedName;
    const phoneEl = document.getElementById('buyer-phone-display');
    if (phoneEl)    phoneEl.value = savedPhone;
    if (savedAddr)  document.getElementById('order-address').value = savedAddr;

    initDeliveryMap();
}

function closeModal() {
    const modal = document.getElementById('order-modal');
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
}

function changeQty(delta) {
    const input = document.getElementById('order-qty');
    if (!input) return;
    const max = parseInt(input.max) || 99;
    let val = parseInt(input.value || 1) + delta;
    if (val < 1) val = 1;
    if (val > max) { showToast('Stock limit reached', `Only ${max} available!`, 'error', 3000); val = max; }
    input.value = val;
    input.dispatchEvent(new Event('input'));
}

async function submitOrder() {
    if (!checkProfile()) return;
    if (!currentDbUser) return showToast('Hold on!', 'Set up your profile first via ⚙️.', 'error');

    const { seller, food, price, contact, maxStock, offerId, sellerId } = currentOrderContext;
    const stock = parseInt(maxStock) || 99;
    let qty = parseInt(document.getElementById('order-qty').value);
    if (!qty || qty < 1) qty = 1;
    if (qty > stock) { qty = stock; document.getElementById('order-qty').value = stock; }

    const total      = qty * Number(price);
    const buyerName  = document.getElementById('buyer-name').value.trim();
    const address    = document.getElementById('order-address').value.trim();
    const buyerPhone = localStorage.getItem('buyer_phone') || '';
    const storedName = localStorage.getItem('buyer_name') || buyerName;
    const notes      = document.getElementById('delivery-notes')?.value?.trim() || '';

    if (!buyerName) return showToast("What's your name?", 'Sellers need to know who to deliver to.', 'error');
    if (!address)   return showToast('Drop a pin!', "Sellers can't deliver to nowhere 😟", 'error');
    if (currentDbUser.balance < total) {
        return showToast('Not enough balance 💸', `Need Rp ${total.toLocaleString('id-ID')} — top up first!`, 'error');
    }

    const btn = document.getElementById('submit-order-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Placing order…'; }

    let cleanContact = (contact || '').replace(/\D/g, '');
    if (cleanContact.startsWith('0')) cleanContact = '62' + cleanContact.slice(1);

    try {
        const result = await API.placeOrder({
            request_id:      currentRequestId,
            user_id:         currentDbUser.id,
            offer_id:        offerId || null,
            seller_id:       sellerId || null,
            buyer_name:      storedName,
            buyer_phone:     buyerPhone,
            buyer_address:   address,
            seller_name:     seller,
            seller_phone:    cleanContact,
            food_name:       food,
            price:           parseInt(price),
            quantity:        qty,
            total,
            contact:         cleanContact,
            notes,
            location_coords: deliveryCoords ? `${deliveryCoords.lat},${deliveryCoords.lng}` : ''
        });
        currentDbUser.balance = result.new_balance;
        loadBalance();
        closeModal();
        showToast('Order is live! 🎉', `${food} ×${qty} from ${seller} — Rp ${total.toLocaleString('id-ID')}. Hang tight!`, 'buyer', 7000);
        localStorage.setItem('buyer_address', address);
    } catch (err) {
        showToast('Something went wrong 😕', err.message, 'error');
    }
    if (btn) { btn.disabled = false; btn.textContent = '🛵 Place Order'; }
}

// ── SELLER: LOAD REQUESTS (smart diff — never wipes typing) ──
// Tracks which request IDs are already rendered so the 5-second
// poll only ADDS new cards; it never touches existing ones.
const _renderedRequestIds = new Set();

async function loadSellerRequests() {
    const listEl = document.getElementById('seller-requests');
    if (!listEl) return;

    try {
        const requests = await API.getRequests();

        if (!requests || requests.length === 0) {
            // Only clear if there's nothing rendered yet
            if (_renderedRequestIds.size === 0) {
                listEl.innerHTML = '<div class="text-center text-gray-400 mt-10 italic">No active requests yet...</div>';
            }
            return;
        }

        // Remove the "no requests" placeholder the first time real data arrives
        const placeholder = listEl.querySelector('.italic');
        if (placeholder) placeholder.remove();

        const savedSellerName  = localStorage.getItem('seller_name')  || 'Not Set';
        const savedSellerPhone = localStorage.getItem('seller_phone') || 'Not Set';
        const profileSet       = isProfileSet();
        const disableAttr      = profileSet ? '' : 'disabled';
        const opacityCls       = profileSet ? '' : 'opacity-50 cursor-not-allowed';

        requests.forEach(req => {
            // ── Skip cards that are already in the DOM ──────────
            if (_renderedRequestIds.has(req.id)) return;
            _renderedRequestIds.add(req.id);

            const notesHTML = req.notes
                ? `<div class="mt-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
                       <span class="font-bold">📝 Notes:</span> ${req.notes}
                   </div>`
                : '';

            const card = document.createElement('div');
            card.className = 'bg-white p-4 rounded-xl shadow-sm border border-blue-100 mb-2';
            card.dataset.reqId = req.id;
            card.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <span class="bg-yellow-100 text-yellow-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 w-max">
                            <i class="fa-solid fa-user"></i> ${req.buyer_name} requested:
                        </span>
                        <p class="font-bold text-gray-800 text-lg mt-1">"${req.description}"</p>
                        ${notesHTML}
                    </div>
                </div>

                <div class="bg-slate-50 p-3 rounded-lg border border-blue-50 text-sm">
                    <div class="flex gap-2 mb-2">
                        <input type="text" id="offer-name-${req.id}"
                            placeholder="Ex: Nasi Goreng Special"
                            oninput="window.handleAutoPrice(${req.id})"
                            ${disableAttr}
                            class="w-1/2 p-2 rounded border outline-none focus:border-blue-500 ${opacityCls}">

                        <select id="offer-lazy-${req.id}" onchange="applyLazySelect(${req.id})"
                            class="w-1/4 p-2 rounded border outline-none focus:border-blue-500 text-xs bg-white ${opacityCls}" ${disableAttr}>
                            <option value="">Drafts...</option>
                            ${(window.sellerMenuDrafts || []).map(d => `<option value="${d.id}">${d.food_name}</option>`).join('')}
                        </select>

                        <input type="text" id="offer-size-${req.id}"
                            placeholder="Size/Notes"
                            ${disableAttr}
                            class="w-1/4 p-2 rounded border outline-none focus:border-blue-500 bg-white ${opacityCls}">
                    </div>

                    <div class="flex gap-2 mb-2">
                        <div class="w-1/2">
                            <label class="text-[9px] text-gray-400 uppercase font-bold">Selling as:</label>
                            <input type="text" id="offer-seller-${req.id}" value="${savedSellerName}" readonly
                                class="w-full p-2 rounded border bg-gray-100 text-gray-500 text-xs"/>
                        </div>
                        <div class="w-1/2">
                            <label class="text-[9px] text-gray-400 uppercase font-bold">WA Contact:</label>
                            <input type="text" id="offer-contact-${req.id}" value="${savedSellerPhone}" readonly
                                class="w-full p-2 rounded border bg-gray-100 text-gray-500 text-xs"/>
                        </div>
                    </div>

                    <div class="flex gap-2 mb-2">
                        <input type="number" id="offer-price-${req.id}" placeholder="Price (Rp)"
                            ${disableAttr}
                            class="w-1/2 p-2 rounded border border-blue-200 bg-blue-50 font-bold text-blue-700 ${opacityCls}">
                        <input type="number" id="offer-stock-${req.id}" placeholder="Qty" value="1"
                            ${disableAttr}
                            class="w-1/2 p-2 rounded border focus:border-orange-500 ${opacityCls}">
                    </div>

                    <div class="mb-3">
                        <label class="text-xs font-bold text-gray-500 mb-1 block">Upload Photo</label>
                        <input type="file" id="offer-media-${req.id}" accept="image/*,video/*"
                            ${disableAttr}
                            class="w-full text-xs text-gray-500 ${opacityCls}"
                            onchange="previewMedia(this, ${req.id})">
                        <div id="media-preview-${req.id}" class="mt-2 hidden"></div>
                    </div>

                    <button id="submit-btn-${req.id}"
                        onclick="${profileSet ? `submitOffer(${req.id})` : 'checkProfile()'}"
                        class="w-full bg-blue-600 text-white font-bold py-2 rounded-lg transition-colors shadow-sm ${profileSet ? 'hover:bg-blue-700' : 'opacity-50 cursor-not-allowed'}">
                        ${profileSet ? 'Submit Offer' : 'Profile Setup Required'}
                    </button>
                </div>`;

            // Prepend so newest requests appear at the top
            listEl.prepend(card);
        });

    } catch (err) {
        console.error('loadSellerRequests error:', err);
    }
}

// ── SELLER: SUBMIT OFFER (with distance) ─────────────────────
async function submitOffer(reqId) {
    playSound('click');
    if (!checkProfile()) return;

    const foodName  = document.getElementById(`offer-name-${reqId}`)?.value?.trim();
    const price     = document.getElementById(`offer-price-${reqId}`)?.value;
    const stockVal  = parseInt(document.getElementById(`offer-stock-${reqId}`)?.value) || 1;
    const mediaFile = document.getElementById(`offer-media-${reqId}`)?.files[0];
    const btn       = document.getElementById(`submit-btn-${reqId}`);

    const sellerName = localStorage.getItem('seller_name');
    const contact    = localStorage.getItem('seller_phone');
    const sellerId   = currentDbUser?.id || localStorage.getItem('user_id') || null;

    if (!foodName || !price) { alert('Isi nama makanan dan harga dulu ya!'); return; }

    const fd = new FormData();
    fd.append('request_id',  reqId);
    fd.append('seller_name', sellerName);
    fd.append('food_name',   foodName);
    fd.append('price',       parseInt(price));
    fd.append('contact',     contact);
    fd.append('stock',       stockVal);
    if (sellerId) fd.append('seller_id', sellerId);

    // Send seller GPS so PHP can run Haversine
    const sellerLat = parseFloat(localStorage.getItem('seller_lat') || '');
    const sellerLng = parseFloat(localStorage.getItem('seller_lng') || '');
    if (!isNaN(sellerLat) && !isNaN(sellerLng)) {
        fd.append('seller_lat', sellerLat);
        fd.append('seller_lng', sellerLng);
    }

    if (mediaFile) {
        if (btn) { btn.innerText = 'Uploading Media... ⏳'; btn.disabled = true; }
        fd.append('media', mediaFile);
    }

    if (btn) { btn.innerText = 'Submitting... ✨'; btn.disabled = true; }
    try {
        await API.submitOffer(fd);
        showToast('Offer sent! 🎉', `${foodName} submitted successfully.`, 'success');
        // Remove this card from the rendered set so it gets rebuilt cleanly
        _renderedRequestIds.delete(reqId);
        const oldCard = document.querySelector(`[data-req-id="${reqId}"]`);
        if (oldCard) oldCard.remove();
        loadSellerRequests();
    } catch (err) {
        showToast('Error', err.message, 'error');
    }
    if (btn) { btn.innerText = 'Submit Offer'; btn.disabled = false; }
}

// ── MEDIA PREVIEW ─────────────────────────────────────────────
window.previewMedia = function(input, reqId) {
    const preview = document.getElementById(`media-preview-${reqId}`);
    if (!preview) return;
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = e => {
            preview.innerHTML = `<img src="${e.target.result}" class="h-16 w-16 object-cover rounded border border-blue-200 mt-2 shadow-sm">`;
            preview.classList.remove('hidden');
        };
        reader.readAsDataURL(input.files[0]);
    } else {
        preview.innerHTML = '';
        preview.classList.add('hidden');
    }
};

// ── AI PRICE HELPERS ──────────────────────────────────────────
function autoCalculateTotal(text) {
    const pattern = /(\d+)\s*(?:x|[a-zA-Z\s]+)\s*(\d+)([kK]?)/g;
    let total = 0, match;
    while ((match = pattern.exec(text)) !== null) {
        let qty = parseInt(match[1]), price = parseInt(match[2]);
        if (match[3].toLowerCase() === 'k') price *= 1000;
        total += qty * price;
    }
    return total;
}

async function fetchAIPrice(text, targetInput) {
    if (!text) return;
    targetInput.placeholder = 'Calculating... ✨';
    targetInput.value = '';
    const apiKey = 'AIzaSyC2jrP6grRh7gFOnE8o7UZuhM6k4Zacf7E';
    const prompt = `You are a price extractor. Analyze this food order: '${text}'. Return ONLY JSON: {"total_price": 12345}. If unclear return {"total_price": 0}.`;
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const data = await res.json();
        const raw  = data.candidates[0].content.parts[0].text;
        const result = JSON.parse(raw.replace(/```json|```/g, '').trim());
        if (result.total_price > 0) {
            targetInput.value = result.total_price;
            targetInput.style.backgroundColor = '#e8f5e9';
            setTimeout(() => targetInput.style.backgroundColor = '', 1000);
        }
    } catch (e) { console.error('AI price error:', e); }
    finally { targetInput.placeholder = 'Total Price (Rp)'; }
}

window.handleAutoPrice = function(reqId) {
    const nameVal   = document.getElementById(`offer-name-${reqId}`)?.value || '';
    const priceInput = document.getElementById(`offer-price-${reqId}`);
    if (!priceInput) return;
    const calc = autoCalculateTotal(nameVal);
    if (calc > 0) {
        priceInput.value = calc;
        priceInput.style.backgroundColor = '#eff6ff';
        priceInput.style.color = '#1d4ed8';
    } else if (nameVal.length > 10) {
        clearTimeout(window.aiTimeout);
        window.aiTimeout = setTimeout(() => fetchAIPrice(nameVal, priceInput), 1200);
    }
};

// ── ORDER HISTORY (buyer) ─────────────────────────────────────
function openHistoryModal() {
    const modal = document.getElementById('history-modal');
    if (!modal) return;
    // Ensure flex display is set correctly
    modal.style.display = 'flex';
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    loadOrderHistory();
}
function closeHistoryModal() {
    const modal = document.getElementById('history-modal');
    if (!modal) return;
    modal.style.display = '';
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

function statusBadge(status) {
    const map = {
        'pending':    ['⏳', 'Pending',    'bg-yellow-100 text-yellow-700'],
        'on process': ['🍳', 'On Process', 'bg-blue-100 text-blue-700'],
        'completed':  ['✅', 'Completed',  'bg-green-100 text-green-700'],
        'delivered':  ['✅', 'Completed',  'bg-green-100 text-green-700'], // legacy alias
        'cancelled':  ['🚫', 'Cancelled',  'bg-red-100 text-red-700']
    };
    const [icon, label, cls] = map[status] || ['❓', status, 'bg-gray-100 text-gray-600'];
    return `<span class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${cls}">${icon} ${label}</span>`;
}

async function loadOrderHistory() {
    const listEl = document.getElementById('history-list');
    if (!listEl) return;
    listEl.innerHTML = '<div class="text-center text-gray-400 py-6"><div class="text-3xl">⏳</div><div class="mt-2 text-sm">Loading…</div></div>';
    try {
        const storedBuyerName = localStorage.getItem('buyer_name') || '';
        const buyerPhone      = localStorage.getItem('buyer_phone') || '';

        // Primary query by exact stored name (which already has phone suffix appended)
        let orders = await API.getOrdersByBuyer(storedBuyerName);

        // Fallback: try by phone number itself (catches orders placed before name suffix was added)
        if ((!orders || orders.length === 0) && buyerPhone) {
            const fallback = await API.getOrdersByBuyer(buyerPhone);
            if (fallback && fallback.length) orders = fallback;
        }

        // Merge with localStorage top-up history
        const topupKey = `topup_history_${buyerPhone}`;
        const topups   = JSON.parse(localStorage.getItem(topupKey) || '[]');
        let allHistory = [], totalSpend = 0;

        (orders || []).forEach(o => allHistory.push({ type: 'buy',   order: o,        date: new Date(o.created_at).getTime() }));
        topups.forEach(t        => allHistory.push({ type: 'topup', amount: t.amount, date: t.date }));
        allHistory.sort((a, b) => b.date - a.date);

        listEl.innerHTML = '';
        if (!allHistory.length) {
            listEl.innerHTML = '<div class="text-center text-gray-400 mt-8 italic"><div class="text-3xl mb-2">🛒</div>Nothing here yet. Go order something delicious!</div>';
            return;
        }

        allHistory.forEach(item => {
            const el = document.createElement('div');
            el.className = 'p-4 rounded-2xl border border-gray-100 bg-white shadow-sm flex flex-col gap-2 hover:shadow-md transition-all';

            if (item.type === 'buy') {
                const o = item.order;
                if (o.status !== 'cancelled') totalSpend += (o.total || 0);
                const dateStr = new Date(o.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

                // Completed = 'completed' OR legacy 'delivered'
                const isCompleted = (o.status === 'completed' || o.status === 'delivered');
                // is_rated comes from DB as 0/1 or "0"/"1"
                const isRated     = parseInt(o.is_rated || 0) === 1;

                el.innerHTML = `
                    <div class="flex justify-between items-start">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center text-lg flex-shrink-0">🍽️</div>
                            <div>
                                <div class="font-bold text-sm text-gray-800">${o.food_name}</div>
                                <div class="text-[10px] text-gray-400">${o.seller_name} • ${o.quantity} item${o.quantity > 1 ? 's' : ''} • ${dateStr}</div>
                            </div>
                        </div>
                        <div class="text-right flex-shrink-0 ml-2">
                            <div class="font-bold text-red-500 text-sm">- Rp ${(o.total || 0).toLocaleString('id-ID')}</div>
                            <div class="mt-1">${statusBadge(o.status || 'pending')}</div>
                        </div>
                    </div>
                    ${(o.status === 'pending' || !o.status) ? `
                    <div class="mt-1 flex justify-end">
                        <button onclick="cancelOrder(${o.id})" class="px-4 py-1.5 rounded-xl text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 transition-all border border-red-100">
                            <i class="fa-solid fa-ban"></i> Cancel Order
                        </button>
                    </div>` : ''}
                    ${isCompleted ? `
                    <div class="mt-1" id="rating-area-${o.id}">
                        ${isRated
                            ? `<div class="text-xs text-center text-gray-400 py-1">✅ You rated this order</div>`
                            : `<button onclick="openRatingModal(${o.id}, ${o.seller_id || 'null'})"
                                class="w-full py-1.5 rounded-xl text-xs font-bold text-yellow-700 bg-yellow-50 hover:bg-yellow-100 transition-all border border-yellow-200">
                                ⭐ Rate this order
                               </button>`
                        }
                    </div>` : ''}`;
            } else {
                const dateStr = new Date(item.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
                el.innerHTML = `
                    <div class="flex justify-between items-center">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-2xl bg-green-50 flex items-center justify-center text-lg flex-shrink-0">💳</div>
                            <div>
                                <div class="font-bold text-sm text-gray-800">Top Up Balance</div>
                                <div class="text-[10px] text-gray-400">${dateStr}</div>
                            </div>
                        </div>
                        <div class="font-bold text-green-600 text-sm">+ Rp ${item.amount.toLocaleString('id-ID')}</div>
                    </div>`;
            }
            listEl.appendChild(el);
        });

        const totalEl = document.getElementById('total-spend');
        if (totalEl) totalEl.innerText = `Rp ${totalSpend.toLocaleString('id-ID')}`;
    } catch (err) {
        console.error('loadOrderHistory error:', err);
        listEl.innerHTML = '<div class="text-center text-red-400 mt-4">Couldn\'t load history. Try again?</div>';
    }
}

async function cancelOrder(orderId) {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    try {
        const result = await API.cancelOrder(orderId);
        if (currentDbUser && result.new_balance != null) {
            currentDbUser.balance = result.new_balance;
            loadBalance();
        }
        showToast('Order Cancelled 🚫', 'Refund processed.', 'success');
        if (isSellerPage) loadSellerHistory();
        else loadOrderHistory();
    } catch (err) {
        showToast('Cancel failed', err.message, 'error');
    }
}

// ── RATING MODAL ─────────────────────────────────────────────
let ratingContext = { orderId: null, sellerId: null };

function openRatingModal(orderId, sellerId) {
    ratingContext = { orderId, sellerId };
    let modal = document.getElementById('rating-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'rating-modal';
        modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4';
        modal.innerHTML = `
            <div class="bg-white w-full max-w-sm p-6 rounded-[28px] shadow-2xl text-center">
                <div class="text-4xl mb-3">⭐</div>
                <h3 class="font-bold text-xl mb-1">Rate Your Order</h3>
                <p class="text-sm text-gray-400 mb-4">How was your experience?</p>
                <div class="flex justify-center gap-3 mb-4" id="star-picker">
                    ${[1,2,3,4,5].map(n => `
                        <button onclick="setRatingStar(${n})" id="star-btn-${n}"
                            class="text-3xl transition-transform hover:scale-125 active:scale-95">☆</button>
                    `).join('')}
                </div>
                <textarea id="rating-comment" rows="2" placeholder="Leave a comment (optional)…"
                    class="w-full p-3 border-2 border-gray-100 rounded-2xl outline-none focus:border-orange-400 text-sm resize-none mb-4"></textarea>
                <button onclick="submitRating()"
                    class="w-full text-white py-3 rounded-2xl font-bold shadow-lg transition-all active:scale-95"
                    style="background:linear-gradient(135deg,#FF7A00,#FF9A3C);">
                    Submit Rating 🌟
                </button>
                <button onclick="closeRatingModal()" class="w-full mt-2 text-gray-400 text-sm py-2 hover:text-gray-600">Cancel</button>
            </div>`;
        document.body.appendChild(modal);
    }
    modal.classList.remove('hidden');
    window._selectedStars = 0;
    [1,2,3,4,5].forEach(n => {
        const btn = document.getElementById(`star-btn-${n}`);
        if (btn) btn.textContent = '☆';
    });
}

window.setRatingStar = function(n) {
    window._selectedStars = n;
    [1,2,3,4,5].forEach(i => {
        const btn = document.getElementById(`star-btn-${i}`);
        if (btn) btn.textContent = i <= n ? '⭐' : '☆';
    });
};

function closeRatingModal() {
    const modal = document.getElementById('rating-modal');
    if (modal) modal.classList.add('hidden');
}

async function submitRating() {
    const stars   = window._selectedStars || 0;
    const comment = document.getElementById('rating-comment')?.value?.trim() || '';
    if (!stars) { showToast('Pick a star rating first!', '', 'error'); return; }
    try {
        // New signature: (orderId, stars, comment, sellerId, buyerId)
        // seller_id is resolved server-side from the order row if not passed
        await API.submitRating(
            ratingContext.orderId,
            stars,
            comment,
            ratingContext.sellerId || null,
            currentDbUser?.id || null
        );
        closeRatingModal();
        showToast('Thanks for rating! 🌟', 'Your feedback helps the community.', 'success');
        // Replace button with "already rated" text immediately (no reload needed)
        const area = document.getElementById(`rating-area-${ratingContext.orderId}`);
        if (area) area.innerHTML = `<div class="text-xs text-center text-gray-400 py-1">✅ You rated this order ${'⭐'.repeat(stars)}</div>`;
    } catch (err) {
        showToast('Rating failed', err.message, 'error');
    }
}

// ── SELLER HISTORY / ACTIVE ORDERS ───────────────────────────
let sellerNotifCount = 0;

function incrementSellerNotif() {
    sellerNotifCount++;
    const badge = document.getElementById('new-order-badge');
    if (!badge) return;
    badge.classList.remove('hidden');
    badge.innerHTML = `<i class="fa-solid fa-bell"></i> ${sellerNotifCount} New Order${sellerNotifCount > 1 ? 's' : ''}!`;
}
function clearSellerNotif() {
    sellerNotifCount = 0;
    document.getElementById('new-order-badge')?.classList.add('hidden');
}

function openSellerHistory() {
    const modal = document.getElementById('seller-history-modal');
    if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
    loadSellerHistory();
    clearSellerNotif();
}
function closeSellerHistory() {
    const modal = document.getElementById('seller-history-modal');
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
}

async function loadSellerHistory() {
    const listEl = document.getElementById('seller-history-list');
    if (!listEl) return;
    listEl.innerHTML = '<div class="text-center text-gray-400 py-6"><div class="text-3xl">📊</div><div class="mt-2 text-sm">Loading your orders…</div></div>';

    const sellerName = localStorage.getItem('seller_name');
    if (!sellerName) {
        listEl.innerHTML = '<div class="text-center text-gray-400 mt-8">Set up your shop first via ⚙️</div>';
        return;
    }
    try {
        const orders    = await API.getOrdersBySeller(sellerName);
        const today     = new Date().toDateString();
        let todayEarnings = 0;
        let totalEarnings = 0;

        const active    = (orders || []).filter(o => o.status !== 'completed' && o.status !== 'delivered' && o.status !== 'cancelled');
        const completed = (orders || []).filter(o => o.status === 'completed' || o.status === 'delivered');
        const cancelled = (orders || []).filter(o => o.status === 'cancelled');

        listEl.innerHTML = '';

        if (active.length > 0) {
            const h = document.createElement('div');
            h.className = 'text-xs font-bold uppercase tracking-wider text-teal-600 mb-2 mt-1 flex items-center gap-1';
            h.innerHTML = `<span class="inline-block w-2 h-2 rounded-full bg-red-400 animate-pulse"></span> Active Orders (${active.length})`;
            listEl.appendChild(h);
        }

        active.forEach(o => {
            const orderDate = new Date((o.created_at || '').replace(' ', 'T')).toDateString();
            if (orderDate === today) todayEarnings += (o.total || 0);
            const el = document.createElement('div');
            el.className = 'p-4 rounded-2xl border-2 border-teal-100 bg-teal-50/40 shadow-sm mb-3';
            const notesLine = o.notes ? `<div class="text-[11px] text-yellow-700 mt-0.5">📝 ${o.notes}</div>` : '';
            el.innerHTML = `
                <div class="flex justify-between items-start">
                    <div>
                        <div class="font-bold text-sm text-gray-800">${o.food_name}</div>
                        <div class="text-[11px] text-gray-500 mt-0.5">👤 ${o.buyer_name} • qty ${o.quantity}</div>
                        <div class="text-[11px] text-gray-400">📍 ${o.buyer_address || 'No address given'}</div>
                        ${notesLine}
                    </div>
                    <div class="text-right flex-shrink-0 ml-2">
                        <div class="font-bold text-teal-600 text-sm">+ Rp ${(o.total || 0).toLocaleString('id-ID')}</div>
                        <div class="mt-1">${statusBadge(o.status || 'pending')}</div>
                    </div>
                </div>
                <div class="flex gap-2 mt-3">
                    ${(o.status || 'pending') === 'pending' ? `
                        <button onclick="cancelOrder(${o.id})"
                            class="flex-[0.5] py-2 rounded-xl text-xs font-bold text-red-500 transition-all active:scale-95"
                            style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);">
                            <i class="fa-solid fa-ban"></i> Reject
                        </button>
                        <button onclick="updateOrderStatus(${o.id},'on process')"
                            class="flex-[1.5] py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                            style="background:rgba(13,148,136,0.12);color:#0D9488;">
                            🍳 Start Cooking
                        </button>` : ''}
                    <button onclick="updateOrderStatus(${o.id},'completed')"
                        class="flex-1 py-2 rounded-xl text-xs font-bold text-white transition-all active:scale-95"
                        style="background:linear-gradient(135deg,#0D9488,#14B8A6);box-shadow:0 4px 12px rgba(13,148,136,0.3);">
                        🛵 Mark as Completed
                    </button>
                </div>`;
            listEl.appendChild(el);
        });

        if (completed.length > 0) {
            const d = document.createElement('div');
            d.className = 'text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 mt-4';
            d.textContent = `✅ Delivered (${completed.length})`;
            listEl.appendChild(d);
        }
        completed.forEach(o => {
            // Fix: parse the date robustly — replace space with T for ISO format
            const orderDate = new Date((o.created_at || '').replace(' ', 'T')).toDateString();
            if (orderDate === today) todayEarnings += (o.total || 0);
            totalEarnings += (o.total || 0);
            const el = document.createElement('div');
            el.className = 'p-3 rounded-2xl border border-gray-100 bg-white shadow-sm mb-2 opacity-70';
            el.innerHTML = `
                <div class="flex justify-between items-center">
                    <div>
                        <div class="font-semibold text-sm text-gray-700">${o.food_name}</div>
                        <div class="text-[10px] text-gray-400">${o.buyer_name} • qty ${o.quantity}</div>
                    </div>
                    <div class="text-right">
                        <div class="font-bold text-green-600 text-sm">+ Rp ${(o.total || 0).toLocaleString('id-ID')}</div>
                        <div class="mt-1">${statusBadge('delivered')}</div>
                    </div>
                </div>`;
            listEl.appendChild(el);
        });

        if (cancelled.length > 0) {
            const d = document.createElement('div');
            d.className = 'text-xs font-bold uppercase tracking-wider text-red-400 mb-2 mt-4';
            d.textContent = `🚫 Cancelled (${cancelled.length})`;
            listEl.appendChild(d);
        }
        cancelled.forEach(o => {
            const el = document.createElement('div');
            el.className = 'p-3 rounded-2xl border border-red-50 bg-red-50/30 shadow-sm mb-2 opacity-70';
            el.innerHTML = `
                <div class="flex justify-between items-center">
                    <div>
                        <div class="font-semibold text-sm text-gray-700 line-through decoration-red-300">${o.food_name}</div>
                        <div class="text-[10px] text-gray-400">${o.buyer_name} • qty ${o.quantity}</div>
                    </div>
                    <div class="text-right">
                        <div class="font-bold text-gray-400 text-sm">Rp ${(o.total || 0).toLocaleString('id-ID')}</div>
                        <div class="mt-1">${statusBadge('cancelled')}</div>
                    </div>
                </div>`;
            listEl.appendChild(el);
        });

        if (!orders?.length) {
            listEl.innerHTML = '<div class="text-center text-gray-400 mt-8 italic"><div class="text-3xl mb-2">👀</div>No orders yet. Keep going!</div>';
        }

        const totalEl = document.getElementById('seller-today-total');
        if (totalEl) totalEl.innerText = `Rp ${todayEarnings.toLocaleString('id-ID')}`;

        // Also show all-time total if there are completed orders
        const allTimeEl = document.getElementById('seller-alltime-total');
        if (allTimeEl) allTimeEl.innerText = `Rp ${totalEarnings.toLocaleString('id-ID')}`;
    } catch (e) {
        listEl.innerHTML = '<div class="text-center text-red-400 mt-4">Couldn\'t load orders. Try again?</div>';
    }
}

async function updateOrderStatus(orderId, newStatus) {
    try {
        await API.updateOrderStatus(orderId, newStatus);
        const msgs = {
            'on process': ['Cooking time! 🍳', "Order marked as On Process."],
            'completed':  ['Completed! 🚀',    'Order marked as completed.'],
            'delivered':  ['Completed! 🚀',    'Order marked as completed.']  // legacy
        };
        const [title, msg] = msgs[newStatus] || ['Updated!', `Status: ${newStatus}`];
        showToast(title, msg, 'success', 5000);
        loadSellerHistory();
    } catch (err) {
        showToast('Update failed 😕', err.message, 'error');
    }
}

// ── MENU DRAFTS ───────────────────────────────────────────────
window.sellerMenuDrafts = [];

window.openMenuDraftsModal = function() {
    playSound('click');
    const modal = document.getElementById('menu-drafts-modal');
    if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
    loadMenuDraftsUI();
};

window.closeMenuDraftsModal = function() {
    playSound('click');
    const modal = document.getElementById('menu-drafts-modal');
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
};

window.loadMenuDraftsUI = async function() {
    const phone = localStorage.getItem('seller_phone');
    if (!phone) return;
    try {
        const drafts = await API.getMenuDrafts(phone);
        window.sellerMenuDrafts = drafts;
        const listEl = document.getElementById('drafts-list');
        if (!listEl) return;
        listEl.innerHTML = '';
        if (!drafts.length) {
            listEl.innerHTML = '<div class="text-center text-gray-400 text-sm py-4 italic">No drafts yet. Add some below!</div>';
        } else {
            drafts.forEach(d => {
                const el = document.createElement('div');
                el.className = 'flex justify-between items-center p-3 bg-white border border-gray-100 rounded-xl shadow-sm mb-2';
                el.innerHTML = `
                    <div>
                        <div class="font-bold text-sm text-gray-800">${d.food_name}</div>
                        <div class="text-xs text-teal-600 font-semibold">Rp ${parseInt(d.price).toLocaleString('id-ID')}</div>
                    </div>
                    <button onclick="deleteMenuDraftUI(${d.id})" class="text-red-400 hover:text-red-600 w-8 h-8 rounded-full bg-red-50 flex items-center justify-center transition-colors">
                        <i class="fa-solid fa-trash text-xs"></i>
                    </button>`;
                listEl.appendChild(el);
            });
        }
        loadSellerRequests(); // refresh dropdowns in existing cards
    } catch (e) { console.error('loadMenuDraftsUI:', e); }
};

window.saveMenuDraftUI = async function() {
    playSound('click');
    const phone = localStorage.getItem('seller_phone');
    if (!phone) return alert('Please set up your profile first.');
    const foodInput  = document.getElementById('draft-food-name');
    const priceInput = document.getElementById('draft-price');
    const foodName   = foodInput?.value.trim();
    const price      = parseInt(priceInput?.value);
    if (!foodName || isNaN(price)) return alert('Please enter valid name and price.');
    try {
        await API.saveMenuDraft(phone, foodName, price);
        if (foodInput)  foodInput.value  = '';
        if (priceInput) priceInput.value = '';
        showToast('Draft Saved!', `Added ${foodName}`, 'success', 3000);
        loadMenuDraftsUI();
    } catch (e) { showToast('Error', e.message, 'error'); }
};

window.deleteMenuDraftUI = async function(id) {
    playSound('click');
    if (!confirm('Delete this draft?')) return;
    try {
        await API.deleteMenuDraft(id);
        showToast('Draft Deleted', '', 'notify', 2000);
        loadMenuDraftsUI();
    } catch (e) { showToast('Error', e.message, 'error'); }
};

window.applyLazySelect = function(reqId) {
    const select = document.getElementById(`offer-lazy-${reqId}`);
    if (!select?.value) return;
    playSound('click');
    const draft = window.sellerMenuDrafts.find(d => parseInt(d.id) === parseInt(select.value));
    if (draft) {
        const nameInput  = document.getElementById(`offer-name-${reqId}`);
        const priceInput = document.getElementById(`offer-price-${reqId}`);
        if (nameInput)  nameInput.value  = draft.food_name;
        if (priceInput) priceInput.value = draft.price;
        showToast('Auto-filled!', `${draft.food_name} applied.`, 'success', 2000);
        [nameInput, priceInput].forEach(el => {
            if (!el) return;
            el.style.backgroundColor = '#e8f5e9';
            el.style.borderColor     = '#4ade80';
            setTimeout(() => { el.style.backgroundColor = ''; el.style.borderColor = ''; }, 500);
        });
    }
    select.value = '';
};

// ── PHYSICAL MENU OCR ─────────────────────────────────────────
window.handlePhysicalMenuUpload = async function(event) {
    playSound('click');
    const file = event.target.files[0];
    if (!file) return;
    const phone = localStorage.getItem('seller_phone');
    if (!phone) return alert('Set profile first!');
    const statusEl = document.getElementById('ai-upload-status');
    if (statusEl) statusEl.classList.remove('hidden');

    try {
        const result = await Tesseract.recognize(file, 'eng', {
            logger: m => {
                if (m.status === 'recognizing text' && statusEl)
                    statusEl.innerText = `Extracting: ${Math.round(m.progress * 100)}% ⏳`;
            }
        });
        if (statusEl) statusEl.innerText = 'Parsing results...';

        
        const lines = result.data.text.split(/\r?\n/);
        let addedCount = 0;

        // Matches: <name> <whitespace> <number> <optional K/k>
        // The name must be at least 3 chars; number must appear at end of line.
        const lineRe = /^([A-Za-z][A-Za-z0-9\s\-\&\/]{2,}?)\s{1,}(\d[\d.,]*)\s*([kK]?)\s*$/;

        for (const rawLine of lines) {
            // Strip common OCR noise: Rp, currency symbols, leading/trailing junk
            const line = rawLine
                .replace(/Rp\.?\s*/gi, '')
                .replace(/[|\\]/g, '')
                .trim();

            if (!line) continue;

            const m = lineRe.exec(line);
            if (!m) continue;

            let name  = m[1].trim();
            let price = parseInt(m[2].replace(/[.,]/g, ''));
            const hasK = m[3].toLowerCase() === 'k';

            if (!name || isNaN(price)) continue;

            // Multiply by 1000 if K suffix or if number looks like shorthand (≤ 999)
            if (hasK) {
                price *= 1000;
            } else if (price > 0 && price <= 999) {
                price *= 1000;
            }

            // Sanity range: Rp 1.000 – Rp 500.000
            if (price < 1000 || price > 500000) continue;

            // Skip section headers that OCR picks up (e.g. "Makanan", "Minuman")
            // They have no price so they won't match, but guard against 1-word names
            // that are clearly headers (all-caps or very short)
            if (name.length < 3) continue;
            if (/^[A-Z]{3,}$/.test(name)) continue; // e.g. "MENU", "CAMILAN"

            // Clean trailing punctuation / stray chars from name
            name = name.replace(/[\.\:\-\,]+$/, '').trim();

            await API.saveMenuDraft(phone, name, price);
            addedCount++;
        }

        showToast('Menu Scanned!', `Added ${addedCount} item(s) from photo.`, 'success');
        loadMenuDraftsUI();
    } catch (e) {
        showToast('OCR failed', e.message, 'error');
    } finally {
        if (statusEl) statusEl.classList.add('hidden');
    }
};

// ── SELLER GPS CAPTURE ────────────────────────────────────────
// Called once on seller page load to store shop coordinates.
function captureSellerLocation() {
    if (!isSellerPage || !navigator.geolocation) return;
    // Always refresh seller coords on page load
    navigator.geolocation.getCurrentPosition(pos => {
        localStorage.setItem('seller_lat', pos.coords.latitude);
        localStorage.setItem('seller_lng', pos.coords.longitude);
        if (currentDbUser) {
            API.upsertUser(
                localStorage.getItem('seller_phone'),
                localStorage.getItem('seller_name'),
                { lat: pos.coords.latitude, lng: pos.coords.longitude }
            ).catch(() => {});
        }
    }, () => {});
}

// ── DOM READY ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    updateGatekeeperUI();

    const phone = isSellerPage
        ? localStorage.getItem('seller_phone')
        : localStorage.getItem('buyer_phone');

    if (phone) {
        await fetchUserProfile();
        if (isSellerPage) {
            loadMenuDraftsUI();
            captureSellerLocation();
        }
    }

    // ── Buyer chat input wiring ──
    const inputEl  = document.getElementById('user-input');
    const sendBtn  = document.getElementById('send-btn');
    const areaEl   = document.getElementById('chat-area');

    if (inputEl && sendBtn) {
        let processing = false;
        const handleSendClick = (e) => {
            if (e) e.preventDefault();
            if (processing) return;
            const val = inputEl.value.trim();
            if (!val) return;
            processing = true;
            inputEl.value = '';
            addMessage(val, 'user');
            if (!checkProfile()) { processing = false; return; }
            sendRequest(val);
            setTimeout(() => { processing = false; }, 500);
        };
        sendBtn.onclick = handleSendClick;
        inputEl.onkeydown = (e) => { if (e.key === 'Enter') handleSendClick(e); };

        if (areaEl && !areaEl.innerHTML.trim()) {
            setTimeout(() => addMessage("What are you craving? 😋 Tell me and watch sellers compete!", 'bot'), 350);
        }
    }

    // ── Seller request list + 5-second polling ──
    const sellerListEl = document.getElementById('seller-requests');
    if (sellerListEl) {
        loadSellerRequests();
        setInterval(loadSellerRequests, 2000);
    }
});

// ── GLOBAL BINDINGS ───────────────────────────────────────────
window.openHistoryModal   = openHistoryModal;
window.closeHistoryModal  = closeHistoryModal;
window.openOrder          = openOrder;
window.closeModal         = closeModal;
window.changeQty          = changeQty;
window.openTopupModal     = openTopupModal;
window.closeTopupModal    = closeTopupModal;
window.openConfig         = openConfig;
window.saveConfig         = saveConfig;
window.submitTopup        = submitTopup;
window.submitOffer        = submitOffer;
window.submitOrder        = submitOrder;
window.locateMeOnMap      = locateMeOnMap;
window.openSellerHistory  = openSellerHistory;
window.closeSellerHistory = closeSellerHistory;
window.updateOrderStatus  = updateOrderStatus;
window.cancelOrder        = cancelOrder;
window.showToast          = showToast;
window.openRatingModal    = openRatingModal;
window.closeRatingModal   = closeRatingModal;
window.submitRating       = submitRating;
