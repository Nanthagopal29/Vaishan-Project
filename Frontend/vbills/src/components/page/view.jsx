import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { BILL_API, BILL_DETAIL_API, ITEM_API } from "../../config/api";
import Invoice from "./Invoice";

// ==========================================================
// NUMBER TO WORDS HELPER (Indian Currency)
// ==========================================================
const numberToWords = (num) => {
  const a = [
    "", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ", "Ten ",
    "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ", "Seventeen ", "Eighteen ", "Nineteen "
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const parsed = Math.round(Number(num) || 0);
  if (parsed === 0) return "Zero Only";
  if (parsed.toString().length > 9) return "Overflow";

  let n = ("000000000" + parsed).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return ""; 

  let str = "";
  str += Number(n[1]) !== 0 ? (a[Number(n[1])] || b[Number(n[1][0])] + " " + a[Number(n[1][1])]) + "Crore " : "";
  str += Number(n[2]) !== 0 ? (a[Number(n[2])] || b[Number(n[2][0])] + " " + a[Number(n[2][1])]) + "Lakh " : "";
  str += Number(n[3]) !== 0 ? (a[Number(n[3])] || b[Number(n[3][0])] + " " + a[Number(n[3][1])]) + "Thousand " : "";
  str += Number(n[4]) !== 0 ? (a[Number(n[4])] || b[Number(n[4][0])] + " " + a[Number(n[4][1])]) + "Hundred " : "";
  str += Number(n[5]) !== 0 ? ((str !== "") ? "and " : "") + (a[Number(n[5])] || b[Number(n[5][0])] + " " + a[Number(n[5][1])]) : "";

  return str.trim() + " Only";
};

const View = () => {
  const navigate = useNavigate();
  const invoiceRef = useRef(null);
  const hiddenInvoiceRef = useRef(null);

  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [selectedBill, setSelectedBill] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const [hiddenBill, setHiddenBill] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  // ==========================================================
  // FETCH ALL BILLS
  // ==========================================================
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

  // ==========================================================
  // SEARCH / FILTER
  // ==========================================================
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

  const totalAmount = filteredBills.reduce((total, bill) => total + Number(bill.total_amount || 0), 0);
  const totalSubtotal = filteredBills.reduce((total, bill) => total + Number(bill.subtotal || 0), 0);

  // ==========================================================
  // FETCH ITEMS HELPER
  // ==========================================================
  const fetchItemsForBill = async (billId) => {
    try {
      const response = await fetch(ITEM_API(billId), { credentials: "include" });
      const result = await response.json();
      if (response.ok) {
        return Array.isArray(result.data) ? result.data : Array.isArray(result) ? result : [];
      }
    } catch (err) {
      console.error("Failed to fetch items:", err);
    }
    return [];
  };

  // ==========================================================
  // VIEW BILL MODAL
  // ==========================================================
  const handleView = async (bill) => {
    try {
      setDetailLoading(true);
      setSelectedBill(null);

      const response = await fetch(BILL_DETAIL_API(bill.id), { credentials: "include" });
      const result = await response.json();

      if (!response.ok || !result.status) {
        throw new Error(result.message || "Failed to load invoice details");
      }

      let billData = result.data;

      if (!billData.items || billData.items.length === 0) {
        const items = await fetchItemsForBill(bill.id);
        billData = { ...billData, items };
      }

      setSelectedBill(billData);
    } catch (err) {
      console.error(err);
      setError(err.message || "Unable to load invoice");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeModal = () => setSelectedBill(null);

  // ==========================================================
  // DIRECT DOWNLOAD (From Table Row)
  // ==========================================================
  const handleDirectDownload = async (bill) => {
    try {
      setDownloadingId(bill.id);

      const response = await fetch(BILL_DETAIL_API(bill.id), { credentials: "include" });
      const result = await response.json();

      if (!response.ok || !result.status) {
        throw new Error(result.message || "Failed to load invoice details");
      }

      let billData = result.data;

      if (!billData.items || billData.items.length === 0) {
        const items = await fetchItemsForBill(bill.id);
        billData = { ...billData, items };
      }

      setHiddenBill(billData);

      setTimeout(async () => {
        if (!hiddenInvoiceRef.current) return;

        try {
          const target = hiddenInvoiceRef.current;
          const canvas = await html2canvas(target, {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            width: target.offsetWidth, // Lock width strictly to target element bounds
            windowWidth: 800, 
          });

          generatePdfFromCanvas(canvas, `${billData.invoice_no || "Invoice"}.pdf`);
        } catch (err) {
          console.error(err);
          setError("Failed to generate PDF");
        } finally {
          setHiddenBill(null);
          setDownloadingId(null);
        }
      }, 600); 
    } catch (err) {
      console.error(err);
      setError(err.message || "Unable to download invoice");
      setHiddenBill(null);
      setDownloadingId(null);
    }
  };

  // ==========================================================
  // MODAL DOWNLOAD
  // ==========================================================
  const downloadPdf = async () => {
    if (!invoiceRef.current || !selectedBill) return;

    try {
      setPdfLoading(true);
      const target = invoiceRef.current;
      
      const canvas = await html2canvas(target, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        width: target.offsetWidth, // Force html2canvas to not stretch to window inner width
        windowWidth: target.offsetWidth, 
      });

      generatePdfFromCanvas(canvas, `${selectedBill.invoice_no || "Invoice"}.pdf`);
    } catch (err) {
      console.error(err);
      setError("Failed to generate PDF");
    } finally {
      setPdfLoading(false);
    }
  };

  const generatePdfFromCanvas = (canvas, filename) => {
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

    pdf.save(filename);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#e9ece4] px-4 py-8 md:px-8 font-sans">
      <div className="mx-auto max-w-7xl print:hidden">

        {/* Navigation */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => navigate("/home")}
            className="text-sm font-semibold tracking-widest text-[#143d30]/70 hover:text-[#b9935a] transition-colors uppercase"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Header */}
        <div className="mb-8 flex flex-col gap-5 rounded-sm bg-[#fdfdfc] p-8 shadow-xl border border-[#b9935a]/30 relative md:flex-row md:items-center md:justify-between overflow-hidden">
          <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#b9935a]/40 m-2"></div>
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#b9935a]/40 m-2"></div>

          <div className="flex items-center gap-5 relative z-10">
            <div className="h-20 w-20 rounded-full border border-[#b9935a] p-1 shadow-md bg-white overflow-hidden flex-shrink-0">
              <img src="/vaishan.png" alt="Vaishan & J Logo" className="h-full w-full rounded-full object-cover" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-serif tracking-widest text-[#143d30] uppercase mb-1">
                Vaishan & J
              </h1>
              <p className="text-xs font-semibold tracking-[0.2em] text-[#b9935a] uppercase">
                Vintage Fashion
              </p>
            </div>
          </div>

          <div className="text-left md:text-right relative z-10 mt-4 md:mt-0">
            <p className="text-2xl font-serif tracking-wide text-[#143d30] uppercase mb-1">
              Invoice Ledger
            </p>
            <p className="text-xs font-medium tracking-widest text-[#143d30]/60 uppercase">
              Total Bills: <span className="text-[#b9935a] font-bold">{filteredBills.length}</span>
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-sm border border-red-900/20 bg-red-900/10 px-5 py-4 text-sm font-semibold tracking-wide text-red-800 flex items-center shadow-sm">
            <span className="flex-1">{error}</span>
            <button onClick={fetchBills} className="ml-3 font-bold uppercase tracking-widest text-xs hover:text-red-900 underline underline-offset-4">
              Retry
            </button>
          </div>
        )}

        {/* Summaries */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <SummaryCard title="Total Bills" value={filteredBills.length} />
          <SummaryCard title="Subtotal" value={formatCurrency(totalSubtotal)} />
          <SummaryCard title="Grand Total Volume" value={formatCurrency(totalAmount)} highlight />
        </div>

        {/* Data Table Area */}
        <div className="overflow-hidden rounded-sm bg-[#fdfdfc] shadow-xl border border-[#b9935a]/30">
          <div className="border-b border-[#b9935a]/30 p-6 bg-[#fdfdfc]">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-serif tracking-wider text-[#143d30] uppercase">Invoice Archive</h2>
              </div>
              <div className="relative w-full md:w-96">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#143d30]/50">🔍</span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search invoice, buyer, GSTIN..."
                  className="w-full rounded-sm border border-[#b9935a]/40 bg-[#e9ece4]/30 py-3 pl-11 pr-4 text-sm text-[#143d30] outline-none transition-all placeholder:text-[#143d30]/40 focus:border-[#143d30] focus:bg-white focus:ring-1 focus:ring-[#143d30]/50"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-72 items-center justify-center">
              <div className="flex flex-col items-center gap-4 text-[#143d30]">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#143d30]/20 border-t-[#b9935a]" />
                <span className="text-xs font-bold uppercase tracking-widest text-[#143d30]/70">Retrieving Records...</span>
              </div>
            </div>
          ) : filteredBills.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center px-5 text-center">
              <div className="mb-4 text-5xl text-[#b9935a]/40 font-serif italic">V&J</div>
              <h3 className="text-xl font-serif text-[#143d30] tracking-wider uppercase mb-2">No Records Found</h3>
              <p className="text-sm font-medium text-[#143d30]/60">
                {search ? "Adjust your search parameters." : "Create your first invoice to populate this ledger."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1100px] w-full">
                <thead>
                  <tr className="bg-[#143d30] border-b border-[#b9935a]/30">
                    <th className={thClass}>#</th>
                    <th className={thClass}>Invoice</th>
                    <th className={thClass}>Date</th>
                    <th className={thClass}>Buyer</th>
                    <th className={thClass}>Supplier</th>
                    <th className={thClass}>GSTIN</th>
                    <th className={`${thClass} text-right`}>Subtotal</th>
                    <th className={`${thClass} text-right`}>CGST</th>
                    <th className={`${thClass} text-right`}>SGST</th>
                    <th className={`${thClass} text-right`}>Total</th>
                    <th className={`${thClass} text-center`}>Action</th>
                  </tr>
                </thead>
                <tbody className="bg-[#fdfdfc]">
                  {filteredBills.map((bill, index) => (
                    <tr key={bill.id} className="border-b border-[#b9935a]/20 last:border-b-0 transition-colors hover:bg-[#e9ece4]/20">
                      <td className={tdClass}>{index + 1}</td>
                      <td className={tdClass}>
                        <p className="font-bold text-[#143d30]">{bill.invoice_no || "-"}</p>
                        <p className="mt-1 text-xs text-[#b9935a] font-semibold">ID: {bill.id}</p>
                      </td>
                      <td className={tdClass}>{formatDate(bill.invoice_date)}</td>
                      <td className={tdClass}>
                        <p className="font-bold text-[#143d30]">{bill.buyer_name || "-"}</p>
                      </td>
                      <td className={tdClass}>
                        <p className="font-bold text-[#143d30]">{bill.supplier_name || "-"}</p>
                      </td>
                      <td className={tdClass}>
                        <span className="rounded-sm border border-[#143d30]/20 bg-[#143d30]/5 px-2.5 py-1 text-xs font-bold tracking-wider text-[#143d30]">
                          {bill.buyer_gstin || "-"}
                        </span>
                      </td>
                      <td className={`${tdClass} text-right`}>{formatCurrency(bill.subtotal)}</td>
                      <td className={`${tdClass} text-right`}>
                        <p className="font-semibold text-[#143d30]">{formatCurrency(bill.cgst_amount)}</p>
                        <p className="mt-1 text-xs text-[#143d30]/60">{Number(bill.cgst_percentage || 0).toFixed(2)}%</p>
                      </td>
                      <td className={`${tdClass} text-right`}>
                        <p className="font-semibold text-[#143d30]">{formatCurrency(bill.sgst_amount)}</p>
                        <p className="mt-1 text-xs text-[#143d30]/60">{Number(bill.sgst_percentage || 0).toFixed(2)}%</p>
                      </td>
                      <td className={`${tdClass} text-right`}>
                        <span className="font-bold text-[#143d30]">{formatCurrency(bill.total_amount)}</span>
                      </td>
                      <td className={`${tdClass} text-center`}>
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleView(bill)}
                            disabled={detailLoading || downloadingId === bill.id}
                            className="rounded-sm bg-[#143d30] border border-transparent px-3 py-1.5 text-xs font-bold tracking-widest text-[#e9ece4] uppercase transition hover:bg-[#0f2e24] hover:text-[#b9935a] disabled:opacity-60"
                          >
                            View PDF
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDirectDownload(bill)}
                            disabled={detailLoading || downloadingId === bill.id}
                            title="Download PDF directly"
                            className="flex h-7 w-7 items-center justify-center rounded-sm border border-[#143d30] text-[#143d30] transition hover:bg-[#b9935a] hover:border-[#b9935a] disabled:opacity-60"
                          >
                            {downloadingId === bill.id ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#143d30] border-t-transparent" />
                            ) : (
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && filteredBills.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-[#b9935a]/30 bg-[#fdfdfc] px-6 py-4 text-sm md:flex-row md:items-center md:justify-between">
              <p className="text-[#143d30]/70 font-semibold text-xs tracking-wider uppercase">
                Showing <span className="font-bold text-[#b9935a]">{filteredBills.length}</span> record{filteredBills.length !== 1 ? "s" : ""}
              </p>
              <p className="font-bold text-[#143d30] uppercase text-xs tracking-wider">
                Ledger Total: <span className="text-[#b9935a] text-sm ml-2">{formatCurrency(totalAmount)}</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ==================================================
          MODAL PREVIEW
      =================================================== */}
      {(selectedBill || detailLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 print:hidden backdrop-blur-sm">
          <div className="flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-sm bg-[#fdfdfc] shadow-2xl border border-[#b9935a]">
            <div className="flex items-center justify-between border-b border-[#b9935a]/30 bg-[#143d30] px-6 py-4">
              <h3 className="text-lg font-serif tracking-widest uppercase text-[#e9ece4]">Tax Invoice Preview</h3>
              <div className="flex items-center gap-3">
                {selectedBill && (
                  <>
                    <button
                      type="button"
                      onClick={handlePrint}
                      className="rounded-sm border border-[#b9935a] bg-transparent px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#e9ece4] hover:bg-[#b9935a] hover:text-[#143d30] transition-colors"
                    >
                      Print
                    </button>
                    <button
                      type="button"
                      onClick={downloadPdf}
                      disabled={pdfLoading}
                      className="rounded-sm bg-[#b9935a] border border-[#b9935a] px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#143d30] hover:bg-[#a3804e] transition-colors disabled:opacity-60"
                    >
                      {pdfLoading ? "Generating..." : "Download PDF"}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-sm px-3 py-1.5 text-[#e9ece4] hover:text-[#b9935a] transition-colors text-lg"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="overflow-y-auto p-4 md:p-8 bg-gray-200 flex justify-center">
              {detailLoading ? (
                <div className="flex min-h-64 items-center justify-center flex-col gap-4">
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#143d30]/20 border-t-[#143d30]" />
                  <p className="text-[#143d30] font-bold tracking-widest uppercase text-xs">Loading Document...</p>
                </div>
              ) : (
                <div className="bg-white shadow-lg w-full max-w-[800px] overflow-x-auto">
                  <Invoice
                    ref={invoiceRef}
                    bill={selectedBill}
                    formatDate={formatDate}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hidden Print Root */}
      {selectedBill && (
        <div className="hidden print:block w-full">
          <Invoice bill={selectedBill} formatDate={formatDate} />
        </div>
      )}

      {/* Hidden Div explicitly used for background Direct Download */}
      <div className="fixed top-0 left-[-9999px] z-[-1] print:hidden">
        {hiddenBill && (
          <div className="w-[800px] bg-white text-black">
            <Invoice
              ref={hiddenInvoiceRef}
              bill={hiddenBill}
              formatDate={formatDate}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// InvoiceDocument has been moved to ./Invoice.jsx
// It uses pure inline styles for reliable PDF/html2canvas rendering.

const SummaryCard = ({ title, value, highlight = false }) => (
  <div className={`rounded-sm p-6 shadow-xl border ${highlight ? "bg-[#143d30] border-[#b9935a]" : "bg-[#fdfdfc] border-[#b9935a]/30"}`}>
    <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${highlight ? "text-[#e9ece4]" : "text-[#143d30]/70"}`}>
      {title}
    </p>
    <p className={`text-2xl font-serif ${highlight ? "text-[#b9935a]" : "text-[#143d30]"}`}>
      {value}
    </p>
  </div>
);

const thClass = "px-4 py-5 text-left text-xs font-serif font-bold uppercase tracking-widest text-[#e9ece4] whitespace-nowrap";
const tdClass = "px-4 py-4 text-sm text-[#143d30] align-middle";

export default View;