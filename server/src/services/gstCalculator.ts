export interface CalculationLineItemInput {
  description: string;
  hsnSacCode: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  gstRate: number; // e.g. 18 for 18%
  productId?: string;
}

export interface CalculatedLineItem {
  productId?: string;
  description: string;
  hsnSacCode: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  taxableAmount: number;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
}

export interface CalculationResult {
  isInterState: boolean;
  subtotal: number;
  discountTotal: number;
  taxableAmount: number;
  taxTotal: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  roundOff: number;
  totalAmount: number;
  lineItems: CalculatedLineItem[];
}

export const roundToTwo = (num: number): number => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

export const calculateInvoiceFinancials = (
  items: CalculationLineItemInput[],
  isInterState: boolean,
  roundOffEnabled: boolean = true
): CalculationResult => {
  let subtotal = 0;
  let discountTotal = 0;
  let taxableAmount = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;

  const calculatedItems: CalculatedLineItem[] = items.map((item) => {
    const qty = Math.max(0, item.quantity);
    const price = Math.max(0, item.unitPrice);
    const lineGross = roundToTwo(qty * price);
    
    const discPercent = Math.min(100, Math.max(0, item.discountPercent || 0));
    const discAmount = roundToTwo((lineGross * discPercent) / 100);
    const taxable = roundToTwo(lineGross - discAmount);
    
    const rate = Math.max(0, item.gstRate);
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (isInterState) {
      igst = roundToTwo((taxable * rate) / 100);
    } else {
      const halfRate = rate / 2;
      cgst = roundToTwo((taxable * halfRate) / 100);
      sgst = roundToTwo((taxable * halfRate) / 100);
    }

    const itemTotal = roundToTwo(taxable + (isInterState ? igst : cgst + sgst));

    subtotal = roundToTwo(subtotal + lineGross);
    discountTotal = roundToTwo(discountTotal + discAmount);
    taxableAmount = roundToTwo(taxableAmount + taxable);
    cgstTotal = roundToTwo(cgstTotal + cgst);
    sgstTotal = roundToTwo(sgstTotal + sgst);
    igstTotal = roundToTwo(igstTotal + igst);

    return {
      productId: item.productId,
      description: item.description,
      hsnSacCode: item.hsnSacCode || '998314',
      quantity: qty,
      unitPrice: price,
      discountPercent: discPercent,
      discountAmount: discAmount,
      taxableAmount: taxable,
      gstRate: rate,
      cgstAmount: cgst,
      sgstAmount: sgst,
      igstAmount: igst,
      totalAmount: itemTotal,
    };
  });

  const taxTotal = isInterState ? igstTotal : roundToTwo(cgstTotal + sgstTotal);
  const netBeforeRound = roundToTwo(taxableAmount + taxTotal);

  let roundOff = 0;
  let totalAmount = netBeforeRound;

  if (roundOffEnabled) {
    const rounded = Math.round(netBeforeRound);
    roundOff = roundToTwo(rounded - netBeforeRound);
    totalAmount = rounded;
  }

  return {
    isInterState,
    subtotal,
    discountTotal,
    taxableAmount,
    taxTotal,
    cgstTotal,
    sgstTotal,
    igstTotal,
    roundOff,
    totalAmount,
    lineItems: calculatedItems,
  };
};

export const isSupplyInterState = (
  companyState: string,
  customerState: string,
  placeOfSupply?: string
): boolean => {
  const destination = (placeOfSupply || customerState || '').trim().toLowerCase();
  const origin = (companyState || '').trim().toLowerCase();
  if (!origin || !destination) return false;
  return origin !== destination;
};
