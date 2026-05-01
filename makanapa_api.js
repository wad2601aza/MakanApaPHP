// ============================================================
// MakanApa — PHP API Wrapper
// All fetch() calls to the PHP backend live here.
// Change API_BASE to match your InfinityFree domain.
// ============================================================

const API_BASE = 'https://yourdomain.infinityfreeapp.com/api';
// ↑ CHANGE THIS to your InfinityFree URL before deploying

// ── Generic helpers ─────────────────────────────────────────
async function apiGet(endpoint, params = {}) {
    const url = new URL(`${API_BASE}/${endpoint}`);
    Object.entries(params).forEach(([k, v]) => { if (v !== null && v !== undefined && v !== '') url.searchParams.set(k, v); });
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

async function apiPost(endpoint, body = {}) {
    const res = await fetch(`${API_BASE}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

// ── Users ────────────────────────────────────────────────────
const API = {

    async getUser(phone) {
        const r = await apiGet('users.php', { phone });
        return r.success ? r.data : null;
    },

    async upsertUser(phone, name) {
        const r = await apiPost('users.php', { phone, name });
        if (!r.success) throw new Error(r.error);
        return r.data;
    },

    // ── Balance ──────────────────────────────────────────────
    async topup(userId, amount) {
        const r = await apiPost('topup.php', { user_id: userId, amount });
        if (!r.success) throw new Error(r.error);
        return r.data; // { new_balance }
    },

    // ── Requests ─────────────────────────────────────────────
    async getRequests(since = '') {
        const r = await apiGet('requests.php', { since });
        return r.success ? r.data : [];
    },

    async createRequest(userId, buyerName, description, quantity) {
        const r = await apiPost('requests.php', { user_id: userId, buyer_name: buyerName, description, quantity });
        if (!r.success) throw new Error(r.error);
        return r.data;
    },

    // ── Offers ───────────────────────────────────────────────
    async getOffers(requestId) {
        const r = await apiGet('offers.php', { request_id: requestId });
        return r.success ? r.data : [];
    },

    async submitOffer(formData) {
        // formData is a FormData object (multipart, for file upload)
        const res = await fetch(`${API_BASE}/offers.php`, { method: 'POST', body: formData });
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

    // ── Habits ───────────────────────────────────────────────
    async getHabits(userId) {
        const r = await apiGet('habits.php', { user_id: userId });
        return r.success ? r.data : null;
    },

    async saveHabits(userId, lastFood, avgPrice, totalOrders, cheapestCount) {
        const r = await apiPost('habits.php', { user_id: userId, last_food: lastFood, avg_price: avgPrice, total_orders: totalOrders, cheapest_count: cheapestCount });
        if (!r.success) throw new Error(r.error);
        return r.data;
    }
};
