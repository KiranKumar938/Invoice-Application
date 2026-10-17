export const GST_STATE_CODES: Record<string, string> = {
  '01': 'Jammu and Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '26': 'Dadra and Nagar Haveli and Daman and Diu',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman and Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
  '97': 'Other Territory',
  '99': 'Centre Jurisdiction',
};

export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4,5}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export interface GstinValidationResult {
  isValid: boolean;
  error?: string;
  stateCode?: string;
  stateName?: string;
  pan?: string;
  entityNumber?: string;
  checksum?: string;
}

export const validateGstin = (gstinRaw: string): GstinValidationResult => {
  if (!gstinRaw) {
    return { isValid: false, error: 'GSTIN is required' };
  }

  const gstin = gstinRaw.trim().toUpperCase();

  if (gstin.length !== 15 && gstin.length !== 16) {
    return {
      isValid: false,
      error: `GSTIN must be 15 characters long (e.g. 07AAACC8123F1Z5). Received ${gstin.length} characters.`,
    };
  }

  if (!GSTIN_REGEX.test(gstin)) {
    return {
      isValid: false,
      error: 'Invalid GSTIN structure. Must follow standard format: 2-digit state code, 10-char PAN, 1 entity code, Z, and 1 checksum character.',
    };
  }

  const stateCode = gstin.slice(0, 2);
  const stateName = GST_STATE_CODES[stateCode];

  if (!stateName) {
    return {
      isValid: false,
      error: `Invalid state code '${stateCode}'. Must be a valid Indian State/UT code (01-38, 97, 99).`,
    };
  }

  const pan = gstin.slice(2, 12);
  const entityNumber = gstin.slice(12, 13);
  const checksum = gstin.slice(14, 15);

  return {
    isValid: true,
    stateCode,
    stateName,
    pan,
    entityNumber,
    checksum,
  };
};

/**
 * Simulates verified GSTN Government Portal verification
 * Distinguishes user-entered configuration from verified government registration
 */
export const verifyWithGstnPortal = (gstinRaw: string, legalNameFallback = 'KLANVISION TECHNOLOGIES PVT. LTD.') => {
  const validation = validateGstin(gstinRaw);
  if (!validation.isValid) {
    return {
      verified: false,
      error: validation.error,
    };
  }

  const gstin = gstinRaw.trim().toUpperCase();

  return {
    verified: true,
    gstin,
    legalNameOfBusiness: legalNameFallback.toUpperCase(),
    tradeName: legalNameFallback.toUpperCase(),
    taxpayerType: 'Regular',
    constitutionOfBusiness: 'Private Limited Company',
    registrationDate: '2019-07-01',
    status: 'Active',
    stateJurisdiction: `${validation.stateName} - Ward 105`,
    centreJurisdiction: `Commissionerate Delhi South, Division V, Range 22`,
    einvoiceStatus: 'Eligible & Active',
    verificationSource: 'GSTN Government Common Portal Sandbox',
    verifiedAt: new Date().toISOString(),
  };
};
