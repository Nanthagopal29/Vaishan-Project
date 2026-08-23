import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { BILL_API, BILL_DETAIL_API } from "../../config/api";

const View = () => {
  const navigate = useNavigate();
  const invoiceRef = useRef(null);

  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [selectedBill, setSelectedBill] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const fetchBills = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(BILL_API, {
        method: "GET",
        credentials: "include",
      });

      const result = await response.json();

      if (!response.ok || !result.status) {
        throw new Error(result.message || "Failed to fetch bills");
      }

      setBills(result.data || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Unable to load bills");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, []);

  const filteredBills = useMemo(() => {
    const value = search.toLowerCase().trim();
    if (!value) return bills;

    return bills.filter((bill) => {
      return (
        String(bill.invoice_no || "").toLowerCase().includes(value) ||
        String(bill.buyer_name || "").toLowerCase().includes(value) ||
        String(bill.buyer_gstin || "").toLowerCase().includes(value) ||
        String(bill.supplier_name || "").toLowerCase().includes(value) ||
        String(bill.supplier_id || "").toLowerCase().includes(value)
      );
    });
  }, [bills, search]);

  const formatCurrency = (value) => {
    const number = Number(value || 0);
    return number.toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    });
  };

  const formatDate = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const totalAmount = filteredBills.reduce(
    (total, bill) => total + Number(bill.total_amount || 0),
    0
  );

  const totalSubtotal = filteredBills.reduce(
    (total, bill) => total + Number(bill.subtotal || 0),
    0
  );

  const handleView = async (bill) => {
    try {
      setDetailLoading(true);
      setSelectedBill(null);

      const response = await fetch(BILL_DETAIL_API(bill.id), {
        credentials: "include",
      });
      const result = await response.json();

      if (!response.ok || !result.status) {
        throw new Error(result.message || "Failed to load invoice details");
      }

      setSelectedBill(result.data);
    } catch (err) {
      console.error(err);
      setError(err.message || "Unable to load invoice");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeModal = () => setSelectedBill(null);

  const downloadPdf = async () => {
    if (!invoiceRef.current || !selectedBill) return;

    try {
      setPdfLoading(true);
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${selectedBill.invoice_no || "invoice"}.pdf`);
    } catch (err) {
      console.error(err);
      setError("Failed to generate PDF");
    } finally {
      setPdfLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl print:hidden">
        <div className="mb-4">
          <button
            type="button"
            onClick={() => navigate("/home")}
            className="text-sm font-semibold text-slate-500 hover:text-slate-800"
          >
            ← Back to Dashboard
          </button>
        </div>

        <div className="mb-6 flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <img src="/vaishan.png" alt="Logo" className="h-16 w-16 rounded-full object-cover" />
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Bills</h1>
              <p className="mt-1 text-sm text-slate-500">View and manage invoices</p>
            </div>
          </div>

          <div className="rounded-xl bg-emerald-50 px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Total Bills
            </p>
            <p className="mt-1 text-2xl font-bold text-emerald-900">{filteredBills.length}</p>
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
            <button onClick={fetchBills} className="ml-3 font-bold underline">
              Retry
            </button>
          </div>
        )}

        <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <SummaryCard title="Total Bills" value={filteredBills.length} />
          <SummaryCard title="Subtotal" value={formatCurrency(totalSubtotal)} />
          <SummaryCard title="Grand Total" value={formatCurrency(totalAmount)} highlight />
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="border-b border-slate-200 p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Invoice List</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {filteredBills.length} invoice{filteredBills.length !== 1 ? "s" : ""}
                </p>
              </div>

              <div className="relative w-full md:w-80">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  🔍
                </span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search invoice, buyer, GSTIN..."
                  className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-72 items-center justify-center">
              <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-700" />
                Loading bills...
              </div>
            </div>
          ) : filteredBills.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center px-5 text-center">
              <div className="mb-3 text-4xl">🧾</div>
              <h3 className="text-lg font-bold text-slate-700">No bills found</h3>
              <p className="mt-1 text-sm text-slate-500">
                {search ? "Try a different search." : "Create your first bill to see it here."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1100px] w-full">
                <thead>
                  <tr className="bg-slate-50">
                    <th className={thClass}>#</th>
                    <th className={thClass}>Invoice</th>
                    <th className={thClass}>Date</th>
                    <th className={thClass}>Buyer</th>
                    <th className={thClass}>Supplier</th>
                    <th className={thClass}>GSTIN</th>
                    <th className={thClass}>Subtotal</th>
                    <th className={thClass}>CGST</th>
                    <th className={thClass}>SGST</th>
                    <th className={thClass}>Total</th>
                    <th className={`${thClass} text-center`}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBills.map((bill, index) => (
                    <tr
                      key={bill.id}
                      className="border-t border-slate-100 transition hover:bg-slate-50"
                    >
                      <td className={tdClass}>{index + 1}</td>
                      <td className={tdClass}>
                        <div>
                          <p className="font-bold text-slate-800">{bill.invoice_no || "-"}</p>
                          <p className="mt-1 text-xs text-slate-400">ID: {bill.id}</p>
                        </div>
                      </td>
                      <td className={tdClass}>{formatDate(bill.invoice_date)}</td>
                      <td className={tdClass}>
                        <p className="font-semibold text-slate-700">{bill.buyer_name || "-"}</p>
                      </td>
                      <td className={tdClass}>
                        <p className="text-slate-700">{bill.supplier_name || "-"}</p>
                      </td>
                      <td className={tdClass}>
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                          {bill.buyer_gstin || "-"}
                        </span>
                      </td>
                      <td className={`${tdClass} text-right`}>{formatCurrency(bill.subtotal)}</td>
                      <td className={`${tdClass} text-right`}>
                        <div>
                          <p className="font-medium text-slate-700">
                            {formatCurrency(bill.cgst_amount)}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">{bill.cgst_percentage || 0}%</p>
                        </div>
                      </td>
                      <td className={`${tdClass} text-right`}>
                        <div>
                          <p className="font-medium text-slate-700">
                            {formatCurrency(bill.sgst_amount)}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">{bill.sgst_percentage || 0}%</p>
                        </div>
                      </td>
                      <td className={`${tdClass} text-right`}>
                        <span className="font-bold text-emerald-800">
                          {formatCurrency(bill.total_amount)}
                        </span>
                      </td>
                      <td className={`${tdClass} text-center`}>
                        <button
                          type="button"
                          onClick={() => handleView(bill)}
                          disabled={detailLoading}
                          className="rounded-lg bg-emerald-800 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-900 disabled:opacity-60"
                        >
                          {detailLoading ? "..." : "View PDF"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && filteredBills.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 text-sm md:flex-row md:items-center md:justify-between">
              <p className="text-slate-500">
                Showing <span className="font-semibold text-slate-700">{filteredBills.length}</span>{" "}
                bill{filteredBills.length !== 1 ? "s" : ""}
              </p>
              <p className="font-bold text-slate-800">
                Total: <span className="text-emerald-800">{formatCurrency(totalAmount)}</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {(selectedBill || detailLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:hidden">
          <div className="flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-800">Invoice Preview</h3>
              <div className="flex items-center gap-2">
                {selectedBill && (
                  <>
                    <button
                      type="button"
                      onClick={handlePrint}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-700 hover:bg-slate-50"
                    >
                      Print
                    </button>
                    <button
                      type="button"
                      onClick={downloadPdf}
                      disabled={pdfLoading}
                      className="rounded-lg bg-emerald-800 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-emerald-900 disabled:opacity-60"
                    >
                      {pdfLoading ? "Generating..." : "Download PDF"}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="overflow-y-auto p-6">
              {detailLoading ? (
                <div className="flex min-h-64 items-center justify-center text-slate-500">
                  Loading invoice...
                </div>
              ) : (
                <InvoiceDocument ref={invoiceRef} bill={selectedBill} formatCurrency={formatCurrency} formatDate={formatDate} />
              )}
            </div>
          </div>
        </div>
      )}

      {selectedBill && (
        <div className="hidden print:block">
          <InvoiceDocument bill={selectedBill} formatCurrency={formatCurrency} formatDate={formatDate} />
        </div>
      )}
    </div>
  );
};

const InvoiceDocument = React.forwardRef(({ bill, formatCurrency, formatDate }, ref) => {
  if (!bill) return null;

  const items = bill.items || [];

  return (
    <div ref={ref} className="mx-auto max-w-4xl bg-white p-8 text-slate-800">
      <div className="mb-8 flex flex-col gap-6 border-b-2 border-[#b9935a] pb-6 md:flex-row md:items-start md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-[#b9935a] bg-white">
            <img src="/vaishan.png" alt="Vaishan & J" className="h-full w-full object-cover" />
          </div>
          <div>
            <h1 className="text-3xl font-serif uppercase tracking-widest text-[#143d30]">
              Vaishan & J
            </h1>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b9935a]">
              Vintage Fashion
            </p>
          </div>
        </div>

        <div className="text-left md:text-right">
          <p className="text-2xl font-serif uppercase tracking-wide text-[#143d30]">Tax Invoice</p>
          <p className="mt-2 text-sm">
            <span className="font-semibold">Invoice No:</span> {bill.invoice_no}
          </p>
          <p className="text-sm">
            <span className="font-semibold">Date:</span> {formatDate(bill.invoice_date)}
          </p>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#b9935a]">Supplier</p>
          <p className="font-bold text-[#143d30]">{bill.supplier_name || "-"}</p>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#b9935a]">Buyer</p>
          <p className="font-bold text-[#143d30]">{bill.buyer_name || "-"}</p>
          {bill.buyer_address && (
            <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{bill.buyer_address}</p>
          )}
          {bill.buyer_gstin && (
            <p className="mt-2 text-sm">
              <span className="font-semibold">GSTIN:</span> {bill.buyer_gstin}
            </p>
          )}
          {(bill.buyer_state || bill.buyer_state_code) && (
            <p className="text-sm">
              <span className="font-semibold">State:</span> {bill.buyer_state || "-"}{" "}
              {bill.buyer_state_code ? `(${bill.buyer_state_code})` : ""}
            </p>
          )}
        </div>
      </div>

      <div className="mb-8 overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full">
          <thead>
            <tr className="bg-[#143d30] text-white">
              <th className="px-4 py-3 text-left text-xs font-bold uppercase">Sl</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase">Description</th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase">Qty</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase">Unit</th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase">Rate</th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">
                  No items found
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id || item.sl_no} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-sm">{item.sl_no}</td>
                  <td className="px-4 py-3 text-sm">{item.description}</td>
                  <td className="px-4 py-3 text-right text-sm">{item.quantity}</td>
                  <td className="px-4 py-3 text-sm">{item.unit || "-"}</td>
                  <td className="px-4 py-3 text-right text-sm">{formatCurrency(item.rate)}</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold">
                    {formatCurrency(item.amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="ml-auto max-w-sm">
        <div className="flex justify-between border-b border-slate-200 py-2 text-sm">
          <span>Subtotal</span>
          <span className="font-semibold">{formatCurrency(bill.subtotal)}</span>
        </div>
        <div className="flex justify-between border-b border-slate-200 py-2 text-sm">
          <span>CGST ({bill.cgst_percentage || 0}%)</span>
          <span className="font-semibold">{formatCurrency(bill.cgst_amount)}</span>
        </div>
        <div className="flex justify-between border-b border-slate-200 py-2 text-sm">
          <span>SGST ({bill.sgst_percentage || 0}%)</span>
          <span className="font-semibold">{formatCurrency(bill.sgst_amount)}</span>
        </div>
        <div className="flex justify-between border-b border-slate-200 py-2 text-sm">
          <span>Round Off</span>
          <span className="font-semibold">{formatCurrency(bill.round_off)}</span>
        </div>
        <div className="mt-3 flex justify-between rounded-lg bg-[#143d30] px-4 py-3 text-white">
          <span className="font-serif uppercase tracking-widest">Grand Total</span>
          <span className="text-lg font-bold text-[#b9935a]">{formatCurrency(bill.total_amount)}</span>
        </div>
      </div>
    </div>
  );
});

InvoiceDocument.displayName = "InvoiceDocument";

const SummaryCard = ({ title, value, highlight = false }) => (
  <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{title}</p>
    <p className={`mt-2 text-xl font-bold ${highlight ? "text-emerald-800" : "text-slate-800"}`}>
      {value}
    </p>
  </div>
);

const thClass = "px-4 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500";
const tdClass = "px-4 py-4 text-sm text-slate-600";

export default View;
