import React from "react";

// ==========================================================
// NUMBER TO WORDS HELPER (Indian Currency)
// ==========================================================
const numberToWords = (num) => {
  const a = [
    "", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ",
    "Eight ", "Nine ", "Ten ", "Eleven ", "Twelve ", "Thirteen ", "Fourteen ",
    "Fifteen ", "Sixteen ", "Seventeen ", "Eighteen ", "Nineteen ",
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

const formatNum = (val) =>
  Number(val || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// ==========================================================
// STYLES - All inline so html2canvas captures them correctly
// ==========================================================
const S = {
  wrapper: {
    width: "800px",
    backgroundColor: "#ffffff",
    padding: "24px",
    color: "#000000",
    fontFamily: "Arial, Helvetica, sans-serif",
    fontSize: "11px",
    lineHeight: "1.4",
    boxSizing: "border-box",
  },
  title: {
    textAlign: "center",
    fontWeight: "700",
    fontSize: "14px",
    marginBottom: "6px",
    textTransform: "uppercase",
    letterSpacing: "2px",
  },
  outerBorder: {
    border: "1px solid #000",
    width: "100%",
  },
  row: {
    display: "flex",
    borderBottom: "1px solid #000",
  },
  rowNoBorder: {
    display: "flex",
  },
  halfLeft: {
    width: "50%",
    borderRight: "1px solid #000",
    padding: "6px 8px",
    boxSizing: "border-box",
  },
  halfRight: {
    width: "50%",
    padding: "6px 8px",
    boxSizing: "border-box",
  },
  quarterLeft: {
    width: "50%",
    borderRight: "1px solid #000",
    padding: "5px 6px",
    minHeight: "36px",
    boxSizing: "border-box",
  },
  quarterRight: {
    width: "50%",
    padding: "5px 6px",
    minHeight: "36px",
    boxSizing: "border-box",
  },
  label: {
    fontSize: "9px",
    color: "#374151",
    display: "block",
    marginBottom: "2px",
  },
  value: {
    fontWeight: "700",
    fontSize: "11px",
  },
  supplierName: {
    fontWeight: "700",
    fontSize: "13px",
    marginBottom: "2px",
  },
  buyerName: {
    fontWeight: "700",
    fontSize: "12px",
    marginBottom: "2px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    borderBottom: "1px solid #000",
    tableLayout: "fixed",
  },
  th: {
    padding: "5px 6px",
    borderBottom: "1px solid #000",
    fontWeight: "700",
    fontSize: "10px",
    textAlign: "center",
    borderRight: "1px solid #000",
  },
  thLast: {
    padding: "5px 6px",
    borderBottom: "1px solid #000",
    fontWeight: "700",
    fontSize: "10px",
    textAlign: "center",
  },
  td: {
    padding: "5px 6px",
    verticalAlign: "top",
    borderRight: "1px solid #000",
    fontSize: "11px",
  },
  tdLast: {
    padding: "5px 6px",
    verticalAlign: "top",
    fontSize: "11px",
  },
  footer: {
    textAlign: "center",
    fontSize: "9px",
    color: "#4b5563",
    marginTop: "6px",
  },
};

// ==========================================================
// INVOICE COMPONENT - PDF-safe with pure inline styles
// ==========================================================
const Invoice = React.forwardRef(({ bill, formatDate }, ref) => {
  if (!bill) return null;

  const items = bill.items || [];

  const numSubtotal    = Number(bill.subtotal)        || 0;
  const numCgstAmount  = Number(bill.cgst_amount)     || 0;
  const numCgstPercent = Number(bill.cgst_percentage) || 0;
  const numSgstAmount  = Number(bill.sgst_amount)     || 0;
  const numSgstPercent = Number(bill.sgst_percentage) || 0;
  const numRoundOff    = Number(bill.round_off)       || 0;
  const numTotalAmount = Number(bill.total_amount)    || 0;

  const totalQty = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

  const fmtDate = formatDate || ((v) => {
    if (!v) return "-";
    const d = new Date(v);
    return isNaN(d.getTime()) ? v : d.toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
  });

  return (
    <div ref={ref} style={S.wrapper}>
      {/* Title */}
      <p style={S.title}>Tax Invoice</p>

      <div style={S.outerBorder}>

        {/* ROW 1: Supplier | Invoice meta */}
        <div style={S.row}>
          <div style={S.halfLeft}>
            <p style={S.supplierName}>{bill.supplier_name || "Vaishan J Sports Wear"}</p>
            <p>Pillayar Kovil Street</p>
            <p>Mangalam Road</p>
            <p>2nd Cress</p>
            <p>Tirupur</p>
            <p style={{ marginTop: "4px" }}>
              <span style={{ fontWeight: "700" }}>GSTIN/UIN:</span> 33EAPPS6228P1ZS
            </p>
            <p>
              <span style={{ fontWeight: "700" }}>State Name:</span> Tamil Nadu, Code: 33
            </p>
          </div>

          <div style={{ width: "50%", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
            <div style={S.row}>
              <div style={S.quarterLeft}>
                <span style={S.label}>Invoice No.</span>
                <span style={S.value}>{bill.invoice_no || "-"}</span>
              </div>
              <div style={S.quarterRight}>
                <span style={S.label}>Dated</span>
                <span style={S.value}>{fmtDate(bill.invoice_date)}</span>
              </div>
            </div>
            <div style={S.row}>
              <div style={S.quarterLeft}>
                <span style={S.label}>Delivery Note</span>
                <span style={S.value}>{bill.delivery_note || ""}</span>
              </div>
              <div style={S.quarterRight}>
                <span style={S.label}>Mode/Terms of Payment</span>
                <span style={S.value}>{bill.payment_terms || ""}</span>
              </div>
            </div>
            <div style={S.row}>
              <div style={S.quarterLeft}>
                <span style={S.label}>Reference No. &amp; Date.</span>
                <span style={S.value}>{bill.reference_no || ""}</span>
              </div>
              <div style={S.quarterRight}>
                <span style={S.label}>Other References</span>
                <span style={S.value}>{bill.other_references || ""}</span>
              </div>
            </div>
            <div style={S.rowNoBorder}>
              <div style={S.quarterLeft}>
                <span style={S.label}>Buyer's Order No.</span>
                <span style={S.value}>{bill.buyer_order_no || ""}</span>
              </div>
              <div style={S.quarterRight}>
                <span style={S.label}>Dated</span>
                <span style={S.value}>{bill.reference_date ? fmtDate(bill.reference_date) : ""}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 2: Buyer | Dispatch meta */}
        <div style={S.row}>
          <div style={S.halfLeft}>
            <span style={S.label}>Buyer (Bill to)</span>
            <p style={S.buyerName}>{bill.buyer_name || "-"}</p>
            <p style={{ whiteSpace: "pre-line" }}>{bill.buyer_address || "-"}</p>
            <div style={{ marginTop: "6px" }}>
              <p>
                <span style={{ display: "inline-block", width: "80px", fontWeight: "700" }}>GSTIN/UIN</span>
                : {bill.buyer_gstin || "-"}
              </p>
              <p>
                <span style={{ display: "inline-block", width: "80px", fontWeight: "700" }}>State Name</span>
                : {bill.buyer_state || "Tamil Nadu"}, Code : {bill.buyer_state_code || "33"}
              </p>
            </div>
          </div>

          <div style={{ width: "50%", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
            <div style={S.row}>
              <div style={S.quarterLeft}>
                <span style={S.label}>Dispatch Doc No.</span>
                <span style={S.value}>{bill.dispatch_doc_no || ""}</span>
              </div>
              <div style={S.quarterRight}>
                <span style={S.label}>Delivery Note Date</span>
                <span style={S.value}>{bill.delivery_note_date ? fmtDate(bill.delivery_note_date) : ""}</span>
              </div>
            </div>
            <div style={S.row}>
              <div style={S.quarterLeft}>
                <span style={S.label}>Dispatched through</span>
                <span style={S.value}>{bill.dispatched_through || ""}</span>
              </div>
              <div style={S.quarterRight}>
                <span style={S.label}>Destination</span>
                <span style={S.value}>{bill.destination || ""}</span>
              </div>
            </div>
            <div style={{ padding: "5px 6px", minHeight: "36px" }}>
              <span style={S.label}>Terms of Delivery</span>
              <p style={{ fontWeight: "700", fontSize: "10px" }}>{bill.terms_of_delivery || ""}</p>
            </div>
          </div>
        </div>

        {/* ITEMS TABLE */}
        <table style={S.table}>
          <colgroup>
            <col style={{ width: "40px" }} />
            <col />
            <col style={{ width: "90px" }} />
            <col style={{ width: "80px" }} />
            <col style={{ width: "50px" }} />
            <col style={{ width: "100px" }} />
          </colgroup>
          <thead>
            <tr>
              <th style={S.th}>SI<br />No.</th>
              <th style={S.th}>Description of Goods</th>
              <th style={S.th}>Quantity</th>
              <th style={S.th}>Rate</th>
              <th style={S.th}>per</th>
              <th style={S.thLast}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index}>
                <td style={{ ...S.td, textAlign: "center" }}>{item.sl_no || index + 1}</td>
                <td style={{ ...S.td, fontWeight: "700", textTransform: "uppercase" }}>{item.description}</td>
                <td style={{ ...S.td, textAlign: "right", fontWeight: "700", whiteSpace: "nowrap" }}>
                  {item.quantity} {item.unit || "pcs"}
                </td>
                <td style={{ ...S.td, textAlign: "right" }}>{formatNum(item.rate)}</td>
                <td style={{ ...S.td, textAlign: "center" }}>{item.unit || "pcs"}</td>
                <td style={{ ...S.tdLast, textAlign: "right", fontWeight: "700" }}>
                  {formatNum(Number(item.quantity || 0) * Number(item.rate || 0))}
                </td>
              </tr>
            ))}

            {/* Spacer */}
            <tr>
              <td style={{ ...S.td, height: "112px" }}></td>
              <td style={S.td}></td>
              <td style={S.td}></td>
              <td style={S.td}></td>
              <td style={S.td}></td>
              <td style={S.tdLast}></td>
            </tr>

            {/* Subtotal */}
            <tr style={{ borderTop: "1px solid #000" }}>
              <td style={S.td}></td>
              <td style={S.td}></td>
              <td style={S.td}></td>
              <td style={S.td}></td>
              <td style={S.td}></td>
              <td style={{ ...S.tdLast, textAlign: "right", fontWeight: "700", borderBottom: "1px solid #000", padding: "5px 6px" }}>
                {formatNum(numSubtotal)}
              </td>
            </tr>

            {/* CGST */}
            <tr>
              <td style={S.td}></td>
              <td style={{ ...S.td, textAlign: "right", fontWeight: "700", fontStyle: "italic" }}>
                CGST @ {numCgstPercent.toFixed(1)}%
              </td>
              <td style={S.td}></td>
              <td style={{ ...S.td, textAlign: "right" }}>{numCgstPercent.toFixed(2)} %</td>
              <td style={S.td}></td>
              <td style={{ ...S.tdLast, textAlign: "right", fontWeight: "700", padding: "5px 6px" }}>
                {formatNum(numCgstAmount)}
              </td>
            </tr>

            {/* SGST */}
            <tr>
              <td style={S.td}></td>
              <td style={{ ...S.td, textAlign: "right", fontWeight: "700", fontStyle: "italic" }}>
                SGST @ {numSgstPercent.toFixed(1)}%
              </td>
              <td style={S.td}></td>
              <td style={{ ...S.td, textAlign: "right" }}>{numSgstPercent.toFixed(2)} %</td>
              <td style={S.td}></td>
              <td style={{ ...S.tdLast, textAlign: "right", fontWeight: "700", padding: "5px 6px" }}>
                {formatNum(numSgstAmount)}
              </td>
            </tr>

            {/* Round Off */}
            <tr>
              <td style={S.td}></td>
              <td style={{ ...S.td, textAlign: "right", fontWeight: "700", fontStyle: "italic" }}>Round Off</td>
              <td style={S.td}></td>
              <td style={S.td}></td>
              <td style={S.td}></td>
              <td style={{ ...S.tdLast, textAlign: "right", fontWeight: "700", padding: "5px 6px" }}>
                {formatNum(numRoundOff)}
              </td>
            </tr>

            {/* Grand Total */}
            <tr style={{ borderTop: "1px solid #000" }}>
              <td style={S.td}></td>
              <td style={{ ...S.td, textAlign: "right", fontWeight: "700" }}>Total</td>
              <td style={{ ...S.td, textAlign: "center", fontWeight: "700", whiteSpace: "nowrap" }}>
                {totalQty} pcs
              </td>
              <td style={S.td}></td>
              <td style={S.td}></td>
              <td style={{ ...S.tdLast, textAlign: "right", fontWeight: "700", fontSize: "13px", padding: "5px 6px" }}>
                {"\u20B9"} {formatNum(numTotalAmount)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Amount in Words */}
        <div style={{ display: "flex", borderBottom: "1px solid #000" }}>
          <div style={{ width: "100%", padding: "6px 8px" }}>
            <span style={S.label}>Amount Chargeable (in words)</span>
            <span style={{ fontWeight: "700", fontSize: "11px", display: "block", marginTop: "2px" }}>
              INR {numberToWords(numTotalAmount)}
            </span>
            <div style={{ textAlign: "right", fontSize: "9px", fontStyle: "italic", marginTop: "4px", fontFamily: "Georgia, serif" }}>
              E. &amp; O.E
            </div>
          </div>
        </div>

        {/* Declaration and Signature */}
        <div style={{ display: "flex" }}>
          <div style={{
            width: "50%", borderRight: "1px solid #000", padding: "8px",
            boxSizing: "border-box", display: "flex", flexDirection: "column",
          }}>
            <p style={{ fontWeight: "700", textDecoration: "underline", fontSize: "10px", marginBottom: "4px" }}>
              Declaration
            </p>
            <p style={{ fontSize: "9px", color: "#1f2937", lineHeight: "1.4" }}>
              We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
            </p>
          </div>
          <div style={{
            width: "50%", padding: "8px", boxSizing: "border-box",
            display: "flex", flexDirection: "column",
            justifyContent: "space-between", alignItems: "flex-end", minHeight: "90px",
          }}>
            <p style={{ fontWeight: "700", fontSize: "11px" }}>
              for {bill.supplier_name || "Vaishan J Sports Wear"}
            </p>
            <div style={{ marginTop: "48px" }}>
              <p style={{ fontSize: "10px" }}>Authorised Signatory</p>
            </div>
          </div>
        </div>

      </div>

      <p style={S.footer}>This is a Computer Generated Invoice</p>
    </div>
  );
});

Invoice.displayName = "Invoice";

export default Invoice;
