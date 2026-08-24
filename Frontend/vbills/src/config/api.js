// In dev: use relative paths → Vite proxy forwards to Django on port 8000
// In prod (Render / Netlify): use the full Render backend URL
const isProd =
  typeof window !== "undefined" &&
  (window.location.hostname.endsWith("onrender.com") ||
    window.location.hostname.endsWith("netlify.app"));

const API_BASE_URL = isProd ? "https://vaishanandj-billing.onrender.com" : "";

export const LOGIN_API       = `${API_BASE_URL}/invoice/login/`;
export const BILL_API        = `${API_BASE_URL}/invoice/bills/`;
export const BILL_DETAIL_API = (billId) => `${API_BASE_URL}/invoice/bills/${billId}/`;
export const ITEM_API        = (billId) => `${API_BASE_URL}/invoice/bills/${billId}/items/`;
export const SUPPLIER_API    = `${API_BASE_URL}/invoice/suppliers/`;

export default API_BASE_URL;
