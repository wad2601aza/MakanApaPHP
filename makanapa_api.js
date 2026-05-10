// ============================================================
// MakanApa — PHP API Wrapper  (v4 — no Supabase)
// All fetch() calls to the PHP backend live here.
// Change API_BASE for your InfinityFree domain if needed.
// ============================================================

const API_BASE = window.location.origin.includes('localhost')
    ? 'http://localhost/makanapaPHP2/api'
    : window.location.origin + '/api';

// ── Generic helpers ─────────────────────────────────────────
async function apiGet(endpoint, params = {}) {
    const url = new URL(`${API_BASE}/${endpoint}`);
    Object.entries(params).forEach(([k, v]) => {
        if (v !== null && v !== undefined && v !== '') url.searchParams.set(k, v);
    });
    const res = await fetch(url.toString(), {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        credentials: 'same-origin'
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

async function apiPost(endpoint, body = {}) {
    const res = await fetch(`${API_BASE}/${endpoint}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify(body)
    });
    // Parse the body regardless of status so we can show the real error
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const msg = data?.error || `HTTP ${res.status}`;
        throw new Error(msg);
    }
    return data;
}

// ── API namespace ────────────────────────────────────────────
const API = {

    // ── Users ────────────────────────────────────────────────
    async getUser(phone) {
        const r = await apiGet('users.php', { phone });
        return r.success ? r.data : null;
    },

    /**
     * Upsert user — also saves seller/buyer coordinates so the
     * Haversine calculation has a shop location to work with.
     */
    async upsertUser(phone, name, coords = null) {
        const payload = { phone, name };
        if (coords) {
            payload.latitude    = coords.lat;
            payload.longitude   = coords.lng;
            payload.address_name = coords.address || null;
        }
        const r = await apiPost('users.php', payload);
        if (!r.success) throw new Error(r.error);
        return r.data;
    },

    // ── Balance ──────────────────────────────────────────────
    async topup(userId, amount, phone = '') {
        const r = await apiPost('topup.php', { user_id: userId, amount, phone });
        if (!r.success) throw new Error(r.error);
        return r.data; // { new_balance }
    },

    // ── Requests ─────────────────────────────────────────────
    async getRequests(since = '') {
        const r = await apiGet('requests.php', { since });
        return r.success ? r.data : [];
    },

    /**
     * createRequest — now accepts buyer coordinates so sellers
     * can calculate distance when they post an offer.
     */
    async createRequest(userId, buyerName, description, quantity, notes = '', coords = null) {
        const payload = { user_id: userId, buyer_name: buyerName, description, quantity };
        if (notes)  payload.notes     = notes;
        if (coords) {
            payload.buyer_lat = coords.lat;
            payload.buyer_lng = coords.lng;
        }
        const r = await apiPost('requests.php', payload);
        if (!r.success) throw new Error(r.error);
        return r.data;
    },

    // ── Offers ───────────────────────────────────────────────
    async getOffers(requestId) {
        const r = await apiGet('offers.php', { request_id: requestId });
        return r.success ? r.data : [];
    },

    /**
     * submitOffer — FormData (multipart) for file upload.
     * Caller should append seller_lat / seller_lng so the PHP
     * backend can run the Haversine calculation server-side.
     */
    async submitOffer(formData) {
        const res = await fetch(`${API_BASE}/offers.php`, {
            method: 'POST',
            body: formData   // browser sets Content-Type: multipart/form-data automatically
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const r = await res.json();
        if (!r.success) throw new Error(r.error);
        return r.data;
    },

    // ── Orders ───────────────────────────────────────────────
    async getOrdersByBuyer(buyerName, since = '') {
        const r = await apiGet('orders.php', { buyer_name: buyerName, since });
        return r.success ? r.data : [];
    },

    async getOrdersBySeller(sellerName, since = '') {
        const r = await apiGet('orders.php', { seller_name: sellerName, since });
        return r.success ? r.data : [];
    },

    async placeOrder(payload) {
        const r = await apiPost('orders.php', payload);
        if (!r.success) throw new Error(r.error);
        return r.data; // { order, new_balance }
    },

    async cancelOrder(orderId) {
        const r = await apiPost('cancel_order.php', { order_id: orderId });
        if (!r.success) throw new Error(r.error);
        return r.data;
    },

    async updateOrderStatus(orderId, status) {
        const r = await apiPost('update_status.php', { order_id: orderId, status });
        if (!r.success) throw new Error(r.error);
        return r.data;
    },

    // ── Ratings ──────────────────────────────────────────────
    // seller_id is optional — ratings.php will fall back to orders.seller_id
    async submitRating(orderId, stars, comment = '', sellerId = null, buyerId = null) {
        const payload = { order_id: orderId, stars, comment };
        if (sellerId) payload.seller_id = sellerId;
        if (buyerId)  payload.buyer_id  = buyerId;
        const r = await apiPost('ratings.php', payload);
        if (!r.success) throw new Error(r.error);
        return r.data;
    },

    async getRatingForOrder(orderId) {
        const r = await apiGet('ratings.php', { order_id: orderId });
        return r.success ? r.data : null;
    },

    // ── Seller Menus ─────────────────────────────────────────
    async getMenuDrafts(sellerPhone) {
        const r = await apiGet('seller_menus.php', { seller_phone: sellerPhone });
        return r.success ? r.data : [];
    },

    async saveMenuDraft(sellerPhone, foodName, price, mediaUrl = '') {
        const r = await apiPost('seller_menus.php', {
            seller_phone: sellerPhone, food_name: foodName, price, media_url: mediaUrl
        });
        if (!r.success) throw new Error(r.error);
        return r.data;
    },

    async deleteMenuDraft(id) {
        const res = await fetch(`${API_BASE}/seller_menus.php`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ id })
        });
        const r = await res.json();
        if (!r.success) throw new Error(r.error);
        return r.data;
    },

};
