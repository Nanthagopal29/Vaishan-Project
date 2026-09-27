import React, { useMemo, useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { BILL_API, NEXT_INVOICE_API, SUPPLIER_API } from "../../config/api";

const CACHE_KEY = "vj_bills_cache";

// Helper to calculate Indian Financial Year (April 1 to March 31)
const getFinancialYear = (dateStr) => {
  const d = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(d.getTime())) {
    const fallback = new Date();
    const startYear = fallback.getMonth() >= 3 ? fallback.getFullYear() : fallback.getFullYear() - 1;
    return `${startYear}-${String(startYear + 1).slice(-2)}`;
  }
  const year = d.getFullYear();
  // Month is 0-indexed in JS (January is 0, April is 3)
  const isAfterOrInApril = d.getMonth() >= 3;
  const startYear = isAfterOrInApril ? year : year - 1;
  const endYear = startYear + 1;
  return `${startYear}-${String(endYear).slice(-2)}`;
};

// Helper to auto-generate a sequential invoice number
const generateInvoiceNo = (sequence, dateStr) => {
  const fy = getFinancialYear(dateStr);
  return `VI/${fy}/${sequence}`;
};

// Helper to extract the highest sequence number from an existing bills list
const getNextInvoiceSequence = (billsList, targetDate) => {
  const targetFY = getFinancialYear(targetDate);
  let maxSeq = 0;

  if (Array.isArray(billsList)) {
    billsList.forEach((b) => {
      const invNo = String(b.invoice_no || "").trim();
      // Match current financial year pattern: VI/YYYY-YY/<sequence>
      const fyMatch = invNo.match(new RegExp(`VI\/${targetFY}\/(\\d+)`, "i"));
      if (fyMatch && fyMatch[1]) {
        const num = parseInt(fyMatch[1], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      } else {
        // Fallback: match any trailing /<number>
        const anyMatch = invNo.match(/\/(\d+)$/);
        if (anyMatch && anyMatch[1]) {
          const num = parseInt(anyMatch[1], 10);
          if (!isNaN(num) && num > maxSeq) {
            maxSeq = num;
          }
        }
      }
    });
  }

  return maxSeq > 0 ? maxSeq + 1 : 1;
};

const Create = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const initialType = location.state?.invoice_type || searchParams.get("type") || "GST";
  const [invoiceType, setInvoiceType] = useState(initialType);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const initialDate = new Date().toISOString().split("T")[0];
  const cachedBills = (() => {
    try {
      const saved = localStorage.getItem(CACHE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  })();
  const initialSeq = getNextInvoiceSequence(cachedBills, initialDate);

  const [invoiceSequence, setInvoiceSequence] = useState(initialSeq);
  const [isCustomInvoiceNo, setIsCustomInvoiceNo] = useState(false);
  const [suppliers, setSuppliers] = useState([]);

  const [bill, setBill] = useState({
    invoice_no: generateInvoiceNo(initialSeq, initialDate),
    invoice_type: initialType,
    invoice_date: initialDate,

    supplier_id: "",

    buyer_name: "",
    buyer_address: "",
    buyer_gstin: "",
    buyer_state: "",
    buyer_state_code: "",

    delivery_note: "",
    reference_no: "",
    reference_date: "",
    buyer_order_no: "",

    dispatch_doc_no: "",
    dispatched_through: "",
    delivery_note_date: "",
    destination: "",

    payment_terms: "",
    other_references: "",
    terms_of_delivery: "",

    cgst_percentage: initialType === "NON_GST" ? 0 : 2.5,
    sgst_percentage: initialType === "NON_GST" ? 0 : 2.5,
    round_off: 0,
  });

  const [items, setItems] = useState([
    {
      sl_no: 1,
      description: "",
      quantity: 1,
      unit: "pcs",
      rate: 0,
    },
  ]);

  // ==========================================================
  // FETCH SUPPLIERS & LATEST INVOICE SEQUENCE ON MOUNT
  // ==========================================================
  useEffect(() => {
    const fetchInitialData = async () => {
      // 1. Fetch Suppliers
      try {
        const response = await fetch(SUPPLIER_API);
        const data = await response.json();
        const supplierList = Array.isArray(data) ? data : data.results || data.data || [];
        setSuppliers(supplierList);
      } catch (err) {
        console.error("Failed to fetch suppliers:", err);
      }

      // 2. Fetch Latest Invoice Sequence
      try {
        let gotNext = false;
        try {
          const nextRes = await fetch(`${NEXT_INVOICE_API}?date=${initialDate}`);
          if (nextRes.ok) {
            const nextData = await nextRes.json();
            if (nextData.status && nextData.next_invoice_no) {
              gotNext = true;
              if (!isCustomInvoiceNo) {
                setBill((prev) => ({
                  ...prev,
                  invoice_no: nextData.next_invoice_no,
                }));
                const seqMatch = nextData.next_invoice_no.match(/\/(\d+)$/);
                if (seqMatch) {
                  setInvoiceSequence(parseInt(seqMatch[1], 10));
                }
              }
            }
          }
        } catch {
          // If NEXT_INVOICE_API is not yet deployed, fallback to BILL_API
        }

        if (!gotNext) {
          const billsRes = await fetch(BILL_API, {
            method: "GET",
            credentials: "include",
          });
          if (billsRes.ok) {
            const billsData = await billsRes.json();
            if (billsData.status && Array.isArray(billsData.data)) {
              try {
                localStorage.setItem(CACHE_KEY, JSON.stringify(billsData.data));
              } catch {}

              const calculatedSeq = getNextInvoiceSequence(billsData.data, initialDate);
              setInvoiceSequence(calculatedSeq);
              if (!isCustomInvoiceNo) {
                setBill((prev) => ({
                  ...prev,
                  invoice_no: generateInvoiceNo(calculatedSeq, prev.invoice_date || initialDate),
                }));
              }
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch latest bills sequence:", err);
      }
    };

    fetchInitialData();
  }, []);

  // ==========================================================
  // BILL FIELD CHANGE
  // ==========================================================
  const handleTypeChange = (type) => {
    setInvoiceType(type);
    setBill((prev) => ({
      ...prev,
      invoice_type: type,
      cgst_percentage: type === "NON_GST" ? 0 : 2.5,
      sgst_percentage: type === "NON_GST" ? 0 : 2.5,
    }));
  };

  const handleBillChange = (e) => {
    const { name, value } = e.target;
    if (name === "invoice_no") {
      setIsCustomInvoiceNo(true);
    }
    setBill((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === "invoice_date" && !isCustomInvoiceNo) {
        updated.invoice_no = generateInvoiceNo(invoiceSequence, value);
      }
      return updated;
    });
  };

  // ==========================================================
  // SUPPLIER SELECTION & AUTO-FILL
  // ==========================================================
  const handleSupplierChange = (e) => {
    const selectedId = e.target.value;
    const selectedSupplier = suppliers.find((s) => String(s.id) === String(selectedId));

    if (selectedSupplier) {
      const stateCode = selectedSupplier.gstin ? selectedSupplier.gstin.substring(0, 2) : "";

      const rawAddress = selectedSupplier.address || "";
      const formattedAddressLines = rawAddress
        .split(',')
        .map(part => part.trim())
        .filter(part => part !== "");

      const cityAndPin = [selectedSupplier.city, selectedSupplier.pincode]
        .filter(Boolean)
        .join(" - ");

      const fullAddress = [...formattedAddressLines, cityAndPin]
        .filter(Boolean)
        .join("\n");

      setBill((prev) => ({
        ...prev,
        supplier_id: selectedSupplier.id,
        buyer_name: selectedSupplier.supplier_name || "",
        buyer_address: fullAddress,
        buyer_gstin: selectedSupplier.gstin || "",
        buyer_state: selectedSupplier.state || "",
        buyer_state_code: stateCode,
      }));
    } else {
      setBill((prev) => ({
        ...prev,
        supplier_id: "",
        buyer_name: "",
        buyer_address: "",
        buyer_gstin: "",
        buyer_state: "",
        buyer_state_code: "",
      }));
    }
  };

  // ==========================================================
  // ITEM CHANGE
  // ==========================================================
  const handleItemChange = (index, e) => {
    const { name, value } = e.target;
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [name]: value,
      };
      return updated;
    });
  };

  // ==========================================================
  // ADD ITEM
  // ==========================================================
  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        sl_no: prev.length + 1,
        description: "",
        quantity: 1,
        unit: "pcs",
        rate: 0,
      },
    ]);
  };

  // ==========================================================
  // REMOVE ITEM
  // ==========================================================
  const removeItem = (index) => {
    if (items.length === 1) return;
    setItems((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((item, i) => ({
          ...item,
          sl_no: i + 1,
        }))
    );
  };

  const getItemAmount = (item) => {
    const quantity = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
    return quantity * rate;
  };

  const subtotal = useMemo(() => {
    return items.reduce((total, item) => total + getItemAmount(item), 0);
  }, [items]);

  const cgstAmount = useMemo(() => {
    if (invoiceType === "NON_GST") return 0;
    const percentage = Number(bill.cgst_percentage) || 0;
    return (subtotal * percentage) / 100;
  }, [subtotal, bill.cgst_percentage, invoiceType]);

  const sgstAmount = useMemo(() => {
    if (invoiceType === "NON_GST") return 0;
    const percentage = Number(bill.sgst_percentage) || 0;
    return (subtotal * percentage) / 100;
  }, [subtotal, bill.sgst_percentage, invoiceType]);

  const finalTotal = subtotal + cgstAmount + sgstAmount + (Number(bill.round_off) || 0);

  // ==========================================================
  // RESET
  // ==========================================================
  const resetForm = (nextSequence = invoiceSequence) => {
    setIsCustomInvoiceNo(false);
    const today = new Date().toISOString().split("T")[0];
    setBill({
      invoice_no: generateInvoiceNo(nextSequence, today),
      invoice_type: invoiceType,
      invoice_date: today,
      supplier_id: "",
      buyer_name: "",
      buyer_address: "",
      buyer_gstin: "",
      buyer_state: "",
      buyer_state_code: "",
      delivery_note: "",
      reference_no: "",
      reference_date: "",
      buyer_order_no: "",
      dispatch_doc_no: "",
      dispatched_through: "",
      delivery_note_date: "",
      destination: "",
      payment_terms: "",
      other_references: "",
      terms_of_delivery: "",
      cgst_percentage: invoiceType === "NON_GST" ? 0 : 2.5,
      sgst_percentage: invoiceType === "NON_GST" ? 0 : 2.5,
      round_off: 0,
    });
    setItems([
      {
        sl_no: 1,
        description: "",
        quantity: 1,
        unit: "pcs",
        rate: 0,
      },
    ]);
  };

  // ==========================================================
  // SAVE BILL
  // ==========================================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess("");
    setError("");

    try {
      if (!bill.invoice_no.trim()) throw new Error("Invoice number is required.");
      if (!bill.invoice_date) throw new Error("Invoice date is required.");
      if (!bill.supplier_id) throw new Error("Supplier is required.");
      if (!bill.buyer_name.trim()) throw new Error("Buyer name is required.");

      const validItems = items.filter((item) => item.description.trim() !== "");
      if (validItems.length === 0) throw new Error("Add at least one item.");

      const billPayload = {
        invoice_no: bill.invoice_no,
        invoice_type: invoiceType,
        invoice_date: bill.invoice_date,
        supplier_id: Number(bill.supplier_id),
        buyer_name: bill.buyer_name,
        buyer_address: bill.buyer_address,
        buyer_gstin: bill.buyer_gstin,
        buyer_state: bill.buyer_state,
        buyer_state_code: bill.buyer_state_code,
        delivery_note: bill.delivery_note || null,
        reference_no: bill.reference_no || null,
        reference_date: bill.reference_date || null,
        buyer_order_no: bill.buyer_order_no || null,
        dispatch_doc_no: bill.dispatch_doc_no || null,
        dispatched_through: bill.dispatched_through || null,
        delivery_note_date: bill.delivery_note_date || null,
        destination: bill.destination || null,
        payment_terms: bill.payment_terms || null,
        other_references: bill.other_references || null,
        terms_of_delivery: bill.terms_of_delivery || null,
        subtotal: Number(subtotal.toFixed(2)),
        cgst_percentage: invoiceType === "NON_GST" ? 0 : (Number(bill.cgst_percentage) || 0),
        cgst_amount: Number(cgstAmount.toFixed(2)),
        sgst_percentage: invoiceType === "NON_GST" ? 0 : (Number(bill.sgst_percentage) || 0),
        sgst_amount: Number(sgstAmount.toFixed(2)),
        round_off: Number(bill.round_off) || 0,
        total_amount: Number(finalTotal.toFixed(2)),
        items: validItems.map((item, index) => ({
          sl_no: index + 1,
          description: item.description,
          quantity: Number(item.quantity) || 0,
          unit: item.unit,
          rate: Number(item.rate) || 0,
        })),
      };

      const billResponse = await fetch(BILL_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(billPayload),
      });

      const billData = await billResponse.json();

      if (!billResponse.ok || !billData.status) {
        throw new Error(billData.message || "Failed to create bill.");
      }

      let successMsg = `Invoice ${bill.invoice_no} created successfully.`;
      if (billData.email?.sent) {
        successMsg += ` Email sent to supplier.`;
      } else if (billData.email?.message) {
        successMsg += ` (${billData.email.message})`;
      }

      setSuccess(successMsg);

      // Cache newly created bill
      try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "[]");
        const newBillEntry = {
          id: billData.id || Date.now(),
          invoice_no: bill.invoice_no,
          invoice_date: bill.invoice_date,
          supplier_id: Number(bill.supplier_id),
          buyer_name: bill.buyer_name,
          total_amount: billPayload.total_amount,
          created_at: new Date().toISOString(),
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify([newBillEntry, ...cached]));
      } catch {}

      // Increment sequence for the next invoice
      const nextSeq = invoiceSequence + 1;
      setInvoiceSequence(nextSeq);
      setIsCustomInvoiceNo(false);
      resetForm(nextSeq);

    } catch (err) {
      console.error(err);
      let errMsg = err.message || "Something went wrong.";
      if (errMsg.includes("duplicate key") || errMsg.includes("already exists")) {
        // Automatically fetch latest bills to determine the next unused number
        fetch(BILL_API, { method: "GET", credentials: "include" })
          .then((res) => res.json())
          .then((data) => {
            if (data.status && Array.isArray(data.data)) {
              try { localStorage.setItem(CACHE_KEY, JSON.stringify(data.data)); } catch {}
              const freshSeq = getNextInvoiceSequence(data.data, bill.invoice_date);
              setInvoiceSequence(freshSeq);
              const freshNo = generateInvoiceNo(freshSeq, bill.invoice_date);
              setBill((prev) => ({ ...prev, invoice_no: freshNo }));
              setIsCustomInvoiceNo(false);
            }
          })
          .catch(() => {});
        errMsg = `Invoice "${bill.invoice_no}" already exists in database. Next available number has been auto-selected. Please verify and submit again.`;
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // UI remains unchanged below this point
  return (
    <div className="min-h-screen bg-[#e9ece4] px-4 py-8 md:px-8 font-sans">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4">
          <button
            type="button"
            onClick={() => navigate("/home")}
            className="text-sm font-semibold tracking-wider text-[#143d30]/70 hover:text-[#143d30] uppercase"
          >
            ← Back to Dashboard
          </button>
        </div>
        <div className="mb-8 flex flex-col gap-5 rounded-sm bg-[#fdfdfc] p-8 shadow-xl border border-[#b9935a]/30 relative md:flex-row md:items-center md:justify-between overflow-hidden">
          <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#b9935a]/40 m-2"></div>
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#b9935a]/40 m-2"></div>

          <div className="flex items-center gap-5 relative z-10">
            <div className="h-20 w-20 rounded-full border border-[#b9935a] p-1 shadow-md bg-white overflow-hidden flex-shrink-0">
              <img
                src="/vaishan.png"
                alt="Vaishan & J Logo"
                className="h-full w-full rounded-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = '<span class="text-[#143d30] font-serif font-bold text-2xl flex items-center justify-center w-full h-full">V&J</span>';
                }}
              />
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
              {invoiceType === "NON_GST" ? "Non-GST Invoice" : "Tax Invoice"}
            </p>
            <p className="text-xs font-medium tracking-widest text-[#143d30]/60 uppercase">
              Billing Management
            </p>
          </div>
        </div>

        {/* Invoice Type Toggle Bar */}
        <div className="mb-6 bg-[#fdfdfc] p-4 rounded-sm shadow-md border border-[#b9935a]/30 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-[#143d30] uppercase tracking-wider">Invoice Type:</span>
            <div className="inline-flex rounded-md shadow-sm border border-[#b9935a]/40 p-1 bg-[#e9ece4]">
              <button
                type="button"
                onClick={() => handleTypeChange("GST")}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded transition-all ${
                  invoiceType === "GST"
                    ? "bg-[#143d30] text-[#e9ece4] shadow"
                    : "text-[#143d30] hover:bg-[#b9935a]/20"
                }`}
              >
                GST Tax Invoice (2.5% + 2.5%)
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange("NON_GST")}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded transition-all ${
                  invoiceType === "NON_GST"
                    ? "bg-[#143d30] text-[#e9ece4] shadow"
                    : "text-[#143d30] hover:bg-[#b9935a]/20"
                }`}
              >
                Non-GST Invoice / Estimate
              </button>
            </div>
          </div>
          {invoiceType === "NON_GST" ? (
            <span className="text-xs text-[#143d30] font-bold bg-[#143d30]/10 px-3 py-1 rounded border border-[#b9935a]/30">
              ⚡ Non-GST Mode (Tax rates set to 0%)
            </span>
          ) : (
            <span className="text-xs text-[#143d30]/70 font-semibold">
              GST Tax Mode (CGST 2.5% + SGST 2.5%)
            </span>
          )}
        </div>

        {success && (
          <div className="mb-6 rounded-sm border border-[#143d30]/20 bg-[#143d30]/10 px-5 py-4 text-sm font-semibold tracking-wide text-[#143d30] flex items-center gap-3 shadow-sm">
            <svg className="w-5 h-5 text-[#143d30]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {success}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-sm border border-red-900/20 bg-red-900/10 px-5 py-4 text-sm font-semibold tracking-wide text-red-800 flex items-center gap-3 shadow-sm">
            <svg className="w-5 h-5 text-red-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <section className="mb-6 rounded-sm bg-[#fdfdfc] p-6 shadow-xl border border-[#b9935a]/30">
            <SectionTitle title="Invoice Details" />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <FormInput
                label="Invoice No"
                required
                name="invoice_no"
                value={bill.invoice_no}
                onChange={handleBillChange}
                placeholder="Auto-Generated"
                helperText="Auto-calculated sequential number (editable if needed)"
                rightAction={
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomInvoiceNo(false);
                      const autoNo = generateInvoiceNo(invoiceSequence, bill.invoice_date);
                      setBill((prev) => ({ ...prev, invoice_no: autoNo }));
                    }}
                    className="text-[10px] text-[#b9935a] hover:text-[#143d30] font-semibold uppercase tracking-wider underline cursor-pointer"
                    title="Reset to auto-calculated sequential invoice number"
                  >
                    Auto-Generate
                  </button>
                }
              />
              <FormInput
                label="Invoice Date"
                required
                type="date"
                name="invoice_date"
                value={bill.invoice_date}
                onChange={handleBillChange}
              />
              <FormSelect
                label="Select Supplier"
                required
                name="supplier_id"
                value={bill.supplier_id}
                onChange={handleSupplierChange}
                options={suppliers.map(sup => ({
                  value: sup.id,
                  label: `${sup.supplier_name} (${sup.supplier_code})`
                }))}
              />
            </div>
          </section>

          <section className="mb-6 rounded-sm bg-[#fdfdfc] p-6 shadow-xl border border-[#b9935a]/30">
            <SectionTitle title="Buyer Information" />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormInput
                label="Buyer Name"
                required
                name="buyer_name"
                value={bill.buyer_name}
                onChange={handleBillChange}
                placeholder="M & K Clothes"
              />
              <FormInput
                label="GSTIN"
                name="buyer_gstin"
                value={bill.buyer_gstin}
                onChange={handleBillChange}
                placeholder="33AARFM1225E1ZL"
              />
            </div>
            <div className="mt-6">
              <FormTextArea
                label="Buyer Address"
                name="buyer_address"
                value={bill.buyer_address}
                onChange={handleBillChange}
                placeholder="Enter complete buyer address"
              />
            </div>
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormInput
                label="State"
                name="buyer_state"
                value={bill.buyer_state}
                onChange={handleBillChange}
                placeholder="Tamil Nadu"
              />
              <FormInput
                label="State Code"
                name="buyer_state_code"
                value={bill.buyer_state_code}
                onChange={handleBillChange}
                placeholder="33"
              />
            </div>
          </section>

          <section className="mb-6 rounded-sm bg-[#fdfdfc] p-6 shadow-xl border border-[#b9935a]/30">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <SectionTitle title="Bill Items" className="mb-0" />
              <button
                type="button"
                onClick={addItem}
                className="rounded-sm bg-[#143d30] px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-[#e9ece4] shadow-md border border-transparent hover:border-[#b9935a] hover:text-[#b9935a] hover:bg-[#0f2e24] transition-all"
              >
                + Add Item
              </button>
            </div>

            <div className="overflow-x-auto rounded-sm border border-[#b9935a]/30">
              <table className="min-w-[900px] w-full">
                <thead>
                  <tr className="bg-[#143d30] border-b border-[#b9935a]/30">
                    <th className="px-4 py-4 text-left text-xs font-serif font-bold uppercase tracking-widest text-[#e9ece4]">Sl</th>
                    <th className="px-4 py-4 text-left text-xs font-serif font-bold uppercase tracking-widest text-[#e9ece4]">Description</th>
                    <th className="px-4 py-4 text-left text-xs font-serif font-bold uppercase tracking-widest text-[#e9ece4]">Qty</th>
                    <th className="px-4 py-4 text-left text-xs font-serif font-bold uppercase tracking-widest text-[#e9ece4]">Unit</th>
                    <th className="px-4 py-4 text-left text-xs font-serif font-bold uppercase tracking-widest text-[#e9ece4]">Rate</th>
                    <th className="px-4 py-4 text-right text-xs font-serif font-bold uppercase tracking-widest text-[#e9ece4]">Amount</th>
                    <th className="px-4 py-4 text-center text-xs font-serif font-bold uppercase tracking-widest text-[#e9ece4]">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-[#fdfdfc]">
                  {items.map((item, index) => (
                    <tr key={index} className="border-b border-[#b9935a]/20 last:border-b-0 hover:bg-[#e9ece4]/20 transition-colors">
                      <td className="px-4 py-4 text-sm font-semibold text-[#143d30]">
                        {index + 1}
                      </td>
                      <td className="px-4 py-4">
                        <input
                          type="text"
                          name="description"
                          value={item.description}
                          onChange={(e) => handleItemChange(index, e)}
                          placeholder="Product / Item"
                          className={inputClass}
                        />
                      </td>
                      <td className="w-28 px-4 py-4">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          name="quantity"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, e)}
                          className={inputClass}
                        />
                      </td>
                      <td className="w-32 px-4 py-4">
                        <input
                          type="text"
                          name="unit"
                          value={item.unit}
                          onChange={(e) => handleItemChange(index, e)}
                          className={inputClass}
                        />
                      </td>
                      <td className="w-36 px-4 py-4">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          name="rate"
                          value={item.rate}
                          onChange={(e) => handleItemChange(index, e)}
                          className={inputClass}
                        />
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-bold text-[#143d30]">
                        ₹ {getItemAmount(item).toFixed(2)}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          disabled={items.length === 1}
                          className="rounded-sm px-3 py-2 text-red-700/80 hover:text-red-900 transition hover:bg-red-900/10 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-8 flex justify-end rounded-sm bg-[#fdfdfc] p-6 shadow-xl border border-[#b9935a]/30">
            <div className="w-full max-w-md">
              <div className="flex justify-between border-b border-[#b9935a]/30 py-3">
                <span className="text-sm font-semibold tracking-wider text-[#143d30]/70 uppercase">
                  Subtotal
                </span>
                <strong className="text-sm text-[#143d30]">
                  ₹ {subtotal.toFixed(2)}
                </strong>
              </div>

              {invoiceType !== "NON_GST" && (
                <>
                  <div className="grid grid-cols-[1fr_80px_120px] items-center gap-3 border-b border-[#b9935a]/30 py-3">
                    <span className="text-sm font-semibold tracking-wider text-[#143d30]/70 uppercase">
                      CGST (%)
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      name="cgst_percentage"
                      value={bill.cgst_percentage}
                      onChange={handleBillChange}
                      className="rounded-sm border border-[#b9935a]/50 bg-[#e9ece4]/50 px-2 py-2 text-sm text-[#143d30] outline-none focus:border-[#143d30] focus:bg-white transition-all text-center"
                    />
                    <strong className="text-right text-sm text-[#143d30]">
                      ₹ {cgstAmount.toFixed(2)}
                    </strong>
                  </div>

                  <div className="grid grid-cols-[1fr_80px_120px] items-center gap-3 border-b border-[#b9935a]/30 py-3">
                    <span className="text-sm font-semibold tracking-wider text-[#143d30]/70 uppercase">
                      SGST (%)
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      name="sgst_percentage"
                      value={bill.sgst_percentage}
                      onChange={handleBillChange}
                      className="rounded-sm border border-[#b9935a]/50 bg-[#e9ece4]/50 px-2 py-2 text-sm text-[#143d30] outline-none focus:border-[#143d30] focus:bg-white transition-all text-center"
                    />
                    <strong className="text-right text-sm text-[#143d30]">
                      ₹ {sgstAmount.toFixed(2)}
                    </strong>
                  </div>
                </>
              )}

              <div className="grid grid-cols-[1fr_80px_120px] items-center gap-3 border-b border-[#b9935a]/30 py-3">
                <span className="text-sm font-semibold tracking-wider text-[#143d30]/70 uppercase">
                  Round Off
                </span>
                <span />
                <input
                  type="number"
                  step="0.01"
                  name="round_off"
                  value={bill.round_off}
                  onChange={handleBillChange}
                  className="rounded-sm border border-[#b9935a]/50 bg-[#e9ece4]/50 px-2 py-2 text-sm text-[#143d30] outline-none focus:border-[#143d30] focus:bg-white transition-all text-right"
                />
              </div>

              <div className="mt-4 flex items-center justify-between rounded-sm border border-[#b9935a] bg-[#143d30] px-5 py-4 text-[#e9ece4] shadow-lg">
                <span className="font-serif text-lg tracking-widest uppercase">
                  Grand Total
                </span>
                <span className="text-xl font-bold text-[#b9935a]">
                  ₹ {finalTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </section>

          <div className="mb-12 flex flex-col-reverse gap-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => resetForm()}
              disabled={loading}
              className="rounded-sm border border-[#143d30] bg-transparent px-8 py-3.5 text-xs font-bold uppercase tracking-widest text-[#143d30] transition hover:bg-[#143d30]/5 disabled:opacity-50"
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-sm border border-[#b9935a] bg-[#143d30] px-10 py-3.5 text-xs font-bold uppercase tracking-widest text-[#e9ece4] shadow-md transition-all hover:bg-[#0f2e24] hover:text-[#b9935a] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Processing..." : "Save Invoice"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const inputClass =
  "w-full rounded-sm border border-[#b9935a]/40 bg-[#e9ece4]/30 px-4 py-2.5 text-sm text-[#143d30] outline-none transition-all placeholder:text-[#143d30]/30 focus:border-[#143d30] focus:bg-white focus:ring-1 focus:ring-[#143d30]/50";

const SectionTitle = ({ title, className = "" }) => (
  <div className={`mb-6 flex items-center gap-4 ${className}`}>
    <h2 className="text-xl font-serif text-[#143d30] tracking-wider uppercase whitespace-nowrap">
      {title}
    </h2>
    <div className="h-[1px] flex-1 bg-[#b9935a]/40" />
  </div>
);

const FormInput = ({ label, required = false, readOnly = false, helperText, rightAction, ...props }) => (
  <div>
    <div className="mb-2 flex items-center justify-between">
      <label className="block text-xs font-bold uppercase tracking-widest text-[#143d30]/80">
        {label}
        {required && <span className="ml-1 text-[#b9935a]">*</span>}
      </label>
      {rightAction}
    </div>
    <input
      {...props}
      readOnly={readOnly}
      className={`${inputClass} ${readOnly ? "cursor-not-allowed bg-[#f0ede8] text-[#143d30]/60 select-none" : ""}`}
    />
    {helperText && (
      <p className="mt-1 text-[11px] text-[#143d30]/60">
        {helperText}
      </p>
    )}
  </div>
);

const FormSelect = ({ label, required = false, options = [], ...props }) => (
  <div>
    <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-[#143d30]/80">
      {label}
      {required && <span className="ml-1 text-[#b9935a]">*</span>}
    </label>
    <select {...props} className={inputClass}>
      <option value="">-- Select --</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

const FormTextArea = ({ label, required = false, ...props }) => (
  <div>
    <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-[#143d30]/80">
      {label}
      {required && <span className="ml-1 text-[#b9935a]">*</span>}
    </label>
    <textarea {...props} rows={5} className={`${inputClass} resize-y`} />
  </div>
);

export default Create;
