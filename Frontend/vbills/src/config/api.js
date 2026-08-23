const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://192.168.1.8:7600/invoice";

export const BILL_API = `${API_BASE_URL}/bills/`;
export const BILL_DETAIL_API = (billId) => `${API_BASE_URL}/bills/${billId}/`;
export const ITEM_API = (billId) => `${API_BASE_URL}/bills/${billId}/items/`;
export const SUPPLIER_API = `${API_BASE_URL}/suppliers/`;

export default API_BASE_URL;
