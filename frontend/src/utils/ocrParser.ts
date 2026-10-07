/**
 * OCR Document Text Parser & Smart Field Extractor
 * Extracts structured data from scanned invoices, legal notices, RTI queries, receipts, and affidavits.
 */

// Helper to normalize Indian/international date strings to YYYY-MM-DD
export function normalizeDate(dateStr: string): string {
  if (!dateStr) return '';
  const clean = dateStr.trim();

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (dmyMatch) {
    let day = dmyMatch[1].padStart(2, '0');
    let month = dmyMatch[2].padStart(2, '0');
    let year = dmyMatch[3];
    if (year.length === 2) {
      year = (parseInt(year, 10) > 50 ? '19' : '20') + year;
    }
    // If month > 12 and day <= 12, might be MM/DD/YYYY
    if (parseInt(month, 10) > 12 && parseInt(day, 10) <= 12) {
      const temp = day;
      day = month;
      month = temp;
    }
    return `${year}-${month}-${day}`;
  }

  // YYYY/MM/DD or YYYY.MM.DD
  const ymdMatch = clean.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Month names like "15 Aug 2024" or "August 15, 2024" or "15th October 2025"
  const months: Record<string, string> = {
    jan: '01', january: '01',
    feb: '02', february: '02',
    mar: '03', march: '03',
    apr: '04', april: '04',
    may: '05',
    jun: '06', june: '06',
    jul: '07', july: '07',
    aug: '08', august: '08',
    sep: '09', sept: '09', september: '09',
    oct: '10', october: '10',
    nov: '11', november: '11',
    dec: '12', december: '12',
  };

  const textMonthMatch = clean.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)[,\s]+(\d{4})/i) ||
                         clean.match(/([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?[,\s]+(\d{4})/i);
  if (textMonthMatch) {
    let day = '';
    let monthName = '';
    let year = '';
    if (isNaN(Number(textMonthMatch[1]))) {
      monthName = textMonthMatch[1].toLowerCase();
      day = textMonthMatch[2].padStart(2, '0');
      year = textMonthMatch[3];
    } else {
      day = textMonthMatch[1].padStart(2, '0');
      monthName = textMonthMatch[2].toLowerCase();
      year = textMonthMatch[3];
    }
    const month = months[monthName] || months[monthName.slice(0, 3)];
    if (month) {
      return `${year}-${month}-${day}`;
    }
  }

  return clean;
}

// Indian cities list for location identification
const COMMON_CITIES = [
  'New Delhi', 'Delhi', 'Mumbai', 'Bengaluru', 'Bangalore', 'Chennai', 'Madras',
  'Kolkata', 'Calcutta', 'Hyderabad', 'Pune', 'Ahmedabad', 'Surat', 'Jaipur',
  'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Bhopal', 'Patna', 'Vadodara',
  'Ghaziabad', 'Ludhiana', 'Agra', 'Nashik', 'Faridabad', 'Meerut', 'Rajkot',
  'Varanasi', 'Srinagar', 'Aurangabad', 'Dhanbad', 'Amritsar', 'Navi Mumbai',
  'Allahabad', 'Prayagraj', 'Ranchi', 'Howrah', 'Coimbatore', 'Jabalpur',
  'Gwalior', 'Vijayawada', 'Jodhpur', 'Madurai', 'Raipur', 'Kota', 'Guwahati',
  'Chandigarh', 'Ernakulam', 'Kochi', 'Cochin', 'Thiruvananthapuram', 'Trivandrum',
  'Kozhikode', 'Calicut', 'Thrissur', 'Kollam', 'Kottayam', 'Kannur', 'Noida',
  'Gurugram', 'Gurgaon', 'Mysuru', 'Mysore', 'Hubballi', 'Mangaluru', 'Mangalore',
  'Bhubaneswar', 'Dehradun', 'Shimla'
];

export interface ExtractedEntities {
  dates: string[];
  primaryDate: string;
  totalAmount: string;
  rentAmount: string;
  allAmounts: string[];
  sellerOrOppositeParty: string;
  customerOrComplainant: string;
  tenantName: string;
  landlordName: string;
  deponentName: string;
  fatherName: string;
  deponentAge: string;
  addresses: string[];
  cityOrDistrict: string;
  productOrItem: string;
  invoiceOrReceiptNumber: string;
  defectOrGrounds: string;
  subjectOrInfo: string;
}

export function parseDocumentText(text: string): ExtractedEntities {
  const clean = text.replace(/\r\n/g, '\n');
  const lines = clean.split('\n').map(l => l.trim()).filter(Boolean);

  // 1. Dates
  const dateRegex = /\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}|\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[,\s]+\d{4})\b/gi;
  const rawDates = Array.from(clean.matchAll(dateRegex)).map(m => m[1]);
  const normalizedDates = rawDates.map(normalizeDate).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d));
  
  // Specific labeled date check
  let primaryDate = '';
  const labeledDateMatch = clean.match(/(?:invoice\s*date|bill\s*date|purchase\s*date|date\s*of\s*issue|dated|date)\s*[:\-]?\s*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4}|[0-9]{4}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{1,2}|[0-9]{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+[,\s]+[0-9]{4})/i);
  if (labeledDateMatch) {
    primaryDate = normalizeDate(labeledDateMatch[1]);
  } else if (normalizedDates.length > 0) {
    primaryDate = normalizedDates[0];
  }

  // 2. Amounts
  const allAmounts: string[] = [];
  let totalAmount = '';
  let rentAmount = '';

  // Look for total / grand total / net amount
  const totalMatch = clean.match(/(?:grand\s*total|total\s*amount|net\s*amount|final\s*amount|invoice\s*amount|total\s*payable|amount\s*paid|total)\s*[:\-]?\s*(?:rs\.?|inr|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
  if (totalMatch) {
    totalAmount = totalMatch[1].replace(/,/g, '');
  }

  // Look for rent
  const rentMatch = clean.match(/(?:monthly\s*rent|rent\s*amount|agreed\s*rent|rent)\s*[:\-]?\s*(?:rs\.?|inr|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
  if (rentMatch) {
    rentAmount = rentMatch[1].replace(/,/g, '');
  }

  // Any currency matches
  const currencyMatches = Array.from(clean.matchAll(/(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi));
  for (const m of currencyMatches) {
    const val = m[1].replace(/,/g, '');
    if (parseFloat(val) > 0) {
      allAmounts.push(val);
    }
  }

  if (!totalAmount && allAmounts.length > 0) {
    // Pick the largest amount as likely total
    const nums = allAmounts.map(a => parseFloat(a)).filter(n => !isNaN(n));
    if (nums.length > 0) {
      totalAmount = Math.max(...nums).toString();
    }
  }

  // 3. Invoice / Receipt / Order Number
  let invoiceOrReceiptNumber = '';
  const invMatch = clean.match(/(?:invoice\s*(?:no|number|#)|bill\s*(?:no|number|#)|receipt\s*(?:no|number|#)|order\s*(?:id|no|#)|tx\s*(?:id|no)|transaction\s*(?:id|no)|utr\s*(?:no)?)\s*[:\-]?\s*([A-Za-z0-9\-\/_]+)/i);
  if (invMatch) {
    invoiceOrReceiptNumber = invMatch[1].trim();
  }

  // 4. Vendor / Seller / Opposite Party
  let sellerOrOppositeParty = '';
  // Check top 4 lines of invoice for company titles first (often prominent header)
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];
    if (/(?:pvt\.?\s*ltd|ltd\.?|private\s*limited|limited|retail\s*limited|enterprises|traders|technologies|solutions|corporation|llp|electronics|mart|bazaar)/i.test(line)) {
      sellerOrOppositeParty = line.replace(/^(?:tax\s*invoice|bill\s*of\s*supply|invoice|cash\s*memo)\s*[:\-\/]?\s*/i, '').trim();
      break;
    }
  }

  if (!sellerOrOppositeParty) {
    const sellerMatch = clean.match(/(?:sold\s*by|seller\s*name|seller|vendor|merchant|company|opposite\s*party|m\/s\.?)\s*[:\-]?\s*([A-Za-z0-9\s\.\&\,\'\-]{3,50})/i);
    if (sellerMatch) {
      sellerOrOppositeParty = sellerMatch[1].trim().replace(/\n.*$/, '');
    } else {
      const storeMatch = clean.match(/(?:store)\s*[:\-]?\s*([A-Za-z0-9\s\.\&\,\'\-]{3,50})/i);
      if (storeMatch) {
        sellerOrOppositeParty = storeMatch[1].trim().replace(/\n.*$/, '');
      }
    }
  }

  // 5. Customer / Buyer / Complainant
  let customerOrComplainant = '';
  const customerMatch = clean.match(/(?:customer\s*name|buyer\s*name|billed\s*to|sold\s*to|ship\s*to|client|complainant|applicant|name\s*of\s*customer|patient)\s*[:\-]?\s*([A-Za-z\s\.\'\-]{3,40})/i);
  if (customerMatch) {
    customerOrComplainant = customerMatch[1].trim().replace(/\n.*$/, '');
  }

  // 6. Tenant & Landlord
  let tenantName = '';
  const tenantMatch = clean.match(/(?:tenant(?:\s*name)?|lessee|occupant|to,?\s*(?:mr|ms|mrs)?\.?)\s*[:\-]?\s*([A-Za-z\s\.\'\-]{3,40})/i);
  if (tenantMatch) {
    tenantName = tenantMatch[1].trim().replace(/\n.*$/, '');
  }

  // If customer name matches tenant name and complainant name, let category determine
  let landlordName = '';
  const landlordMatch = clean.match(/(?:landlord(?:\s*name)?|lessor|owner|from,?\s*(?:mr|ms|mrs)?\.?)\s*[:\-]?\s*([A-Za-z\s\.\'\-]{3,40})/i);
  if (landlordMatch) {
    landlordName = landlordMatch[1].trim().replace(/\n.*$/, '');
  }

  // 7. Affidavit entities
  let deponentName = '';
  const deponentMatch = clean.match(/(?:I,\s*|deponent\s*[:\-]?\s*)([A-Za-z\s\.\'\-]{3,40})(?:,\s*(?:son|daughter|wife|s\/o|d\/o|w\/o))/i) ||
                        clean.match(/deponent\s*[:\-]?\s*([A-Za-z\s\.\'\-]{3,40})/i);
  if (deponentMatch) {
    deponentName = deponentMatch[1].trim();
  }

  let fatherName = '';
  const fatherMatch = clean.match(/(?:son|daughter|wife|s\/o|d\/o|w\/o)\s+of\s+(?:mr\.?\s*|late\s*mr\.?\s*|shri\s*)?([A-Za-z\s\.\'\-]{3,40})/i);
  if (fatherMatch) {
    fatherName = fatherMatch[1].trim().replace(/,\s*aged.*$/i, '');
  }

  let deponentAge = '';
  const ageMatch = clean.match(/(?:aged|age)\s*(?:about)?\s*[:\-]?\s*([0-9]{1,2})\s*(?:years|yrs)?/i);
  if (ageMatch) {
    deponentAge = ageMatch[1];
  }

  // 8. Location / City / District
  let cityOrDistrict = '';
  const districtMatch = clean.match(/(?:district|commission\s*at|court\s*at|place|jurisdiction|city)\s*[:\-]?\s*([A-Za-z\s]{3,30})/i);
  if (districtMatch) {
    cityOrDistrict = districtMatch[1].trim().replace(/\n.*$/, '');
  } else {
    // Check known Indian cities in the text
    for (const city of COMMON_CITIES) {
      const cityRegex = new RegExp(`\\b${city}\\b`, 'i');
      if (cityRegex.test(clean)) {
        cityOrDistrict = city;
        break;
      }
    }
  }

  // 9. Addresses
  const addresses: string[] = [];
  const addressMatch = clean.match(/(?:address|premises|residing\s*at|located\s*at)\s*[:\-]?\s*([^\n]+(?:\n[^\n]+)?)/gi);
  if (addressMatch) {
    addressMatch.forEach(a => {
      const cleanAddr = a.replace(/^(?:address|premises|residing\s*at|located\s*at)\s*[:\-]?\s*/i, '').trim();
      if (cleanAddr.length > 5) addresses.push(cleanAddr);
    });
  }

  // 10. Product or Item description
  let productOrItem = '';
  const itemMatch = clean.match(/(?:item(?:\s*description)?|product(?:\s*description)?|description|particulars|model|goods|device)\s*[:\-]?\s*([^\n]{3,80})/i);
  if (itemMatch) {
    productOrItem = itemMatch[1].replace(/^(?:item\s*description|product\s*description|description|particulars|model|item)\s*[:\-]?\s*/i, '').trim();
  } else {
    // Try to find a line with keywords like TV, Mobile, Laptop, Fridge, AC, Refrigerator, Machine, etc.
    const productLine = lines.find(l => /(?:smart\s*tv|iphone|phone|laptop|refrigerator|washing\s*machine|air\s*conditioner|split\s*ac|motorcycle|tablet|microwave|warranty|inverter)/i.test(l));
    if (productLine) {
      productOrItem = productLine.slice(0, 80).replace(/^(?:item\s*description|product\s*description|description|particulars|model|item)\s*[:\-]?\s*/i, '').trim();
    }
  }

  // 11. Defect or Grounds for eviction or Dispute description
  let defectOrGrounds = '';
  const defectMatch = clean.match(/(?:defect(?:\s*issue)?|issue|problem|grounds|violation|default|reason|complaint|breach)\s*[:\-]?\s*([^\n]+(?:\n[^\n]+){0,2})/i);
  if (defectMatch) {
    defectOrGrounds = defectMatch[1].replace(/^(?:defect\s*issue|issue|defect|grounds|reason|problem)\s*[:\-]?\s*/i, '').trim();
  }

  // 12. Subject / Info Requested (for RTI)
  let subjectOrInfo = '';
  const subjectMatch = clean.match(/(?:subject|information\s*sought|particulars\s*of\s*information|info\s*requested|query)\s*[:\-]?\s*([^\n]+(?:\n[^\n]+){0,3})/i);
  if (subjectMatch) {
    subjectOrInfo = subjectMatch[1].replace(/^(?:subject|information\s*sought|info\s*requested|query)\s*[:\-]?\s*/i, '').trim();
  }

  return {
    dates: normalizedDates,
    primaryDate,
    totalAmount,
    rentAmount,
    allAmounts,
    sellerOrOppositeParty,
    customerOrComplainant,
    tenantName,
    landlordName,
    deponentName,
    fatherName,
    deponentAge,
    addresses,
    cityOrDistrict,
    productOrItem,
    invoiceOrReceiptNumber,
    defectOrGrounds,
    subjectOrInfo,
  };
}

/**
 * Maps extracted document entities directly into form field schema.
 */
export function extractSmartFields(
  extractedText: string,
  template?: {
    id?: string;
    title?: string;
    category?: string;
    fieldsSchema?: Array<{ name: string; label: string; type: string }>;
  } | null
): { fields: Record<string, string>; matchedKeys: string[]; summary: Record<string, string> } {
  const entities = parseDocumentText(extractedText);
  const smartFields: Record<string, string> = {
    rawText: extractedText,
  };
  const summary: Record<string, string> = {};
  const matchedKeys: string[] = [];

  const category = (template?.category || '').toLowerCase();
  const schema = template?.fieldsSchema || [];

  // -------------------------------------------------------------
  // CONSUMER DISPUTE COMPLAINT
  // -------------------------------------------------------------
  if (category === 'consumer' || (!category && (entities.sellerOrOppositeParty || entities.productOrItem))) {
    if (entities.cityOrDistrict) {
      smartFields['district'] = entities.cityOrDistrict;
      summary['District Commission'] = entities.cityOrDistrict;
    }
    if (entities.customerOrComplainant) {
      smartFields['complainantName'] = entities.customerOrComplainant;
      summary['Complainant'] = entities.customerOrComplainant;
    }
    if (entities.addresses[0]) {
      smartFields['complainantAddress'] = entities.addresses[0];
    }
    if (entities.sellerOrOppositeParty) {
      smartFields['oppositePartyName'] = entities.sellerOrOppositeParty;
      summary['Opposite Party (Vendor)'] = entities.sellerOrOppositeParty;
    }
    if (entities.addresses[1] || entities.addresses[0]) {
      smartFields['oppositePartyAddress'] = entities.addresses[1] || entities.addresses[0];
    }
    if (entities.productOrItem) {
      smartFields['productName'] = entities.productOrItem;
      summary['Product / Service'] = entities.productOrItem;
    }
    if (entities.primaryDate) {
      smartFields['purchaseDate'] = entities.primaryDate;
      summary['Purchase Date'] = entities.primaryDate;
    }
    if (entities.totalAmount) {
      smartFields['amountPaid'] = entities.totalAmount;
      summary['Amount Paid'] = `₹${entities.totalAmount}`;
      // Set reasonable compensation amount default
      const num = parseFloat(entities.totalAmount);
      const compensation = isNaN(num) ? '10000' : (num < 10000 ? '10000' : Math.round(num * 0.5).toString());
      smartFields['compensationAmount'] = compensation;
    }
    // Set dispute description
    const issueText = entities.defectOrGrounds || extractedText.slice(0, 450);
    smartFields['disputeDescription'] = issueText;
    summary['Dispute Summary'] = issueText.length > 50 ? issueText.slice(0, 50) + '...' : issueText;

    if (entities.dates[1] || entities.primaryDate) {
      smartFields['noticeDate'] = entities.dates[1] || entities.primaryDate;
    }
  }

  // -------------------------------------------------------------
  // RTI APPLICATION
  // -------------------------------------------------------------
  if (category === 'rti') {
    if (entities.sellerOrOppositeParty) {
      smartFields['authorityName'] = entities.sellerOrOppositeParty;
      summary['Public Authority'] = entities.sellerOrOppositeParty;
    } else {
      // Look for Public Information Officer / Dept
      const pioMatch = extractedText.match(/(?:public\s*information\s*officer|pio|cpio|spio|department\s*of\s*[^\n]+|ministry\s*of\s*[^\n]+|municipal\s*corporation[^\n]*)/i);
      if (pioMatch) {
        smartFields['authorityName'] = pioMatch[0].trim();
        summary['Public Authority'] = pioMatch[0].trim();
      }
    }
    if (entities.addresses[0]) {
      smartFields['authorityAddress'] = entities.addresses[0];
    }
    if (entities.customerOrComplainant) {
      smartFields['applicantName'] = entities.customerOrComplainant;
      summary['Applicant'] = entities.customerOrComplainant;
    }
    if (entities.addresses[1]) {
      smartFields['applicantAddress'] = entities.addresses[1];
    }
    const infoText = entities.subjectOrInfo || extractedText.slice(0, 450);
    smartFields['infoRequested'] = infoText;
    summary['Information Required'] = infoText.slice(0, 50) + '...';

    if (entities.primaryDate) {
      smartFields['date'] = entities.primaryDate;
      summary['Date'] = entities.primaryDate;
    }
    if (entities.cityOrDistrict) {
      smartFields['place'] = entities.cityOrDistrict;
      summary['Place'] = entities.cityOrDistrict;
    }
    if (entities.invoiceOrReceiptNumber) {
      smartFields['paymentTxId'] = entities.invoiceOrReceiptNumber;
      summary['Receipt ID'] = entities.invoiceOrReceiptNumber;
      smartFields['paymentMethod'] = 'Online Payment';
    }
  }

  // -------------------------------------------------------------
  // TENANT EVICTION & TERMINATION NOTICE (AGREEMENT)
  // -------------------------------------------------------------
  if (category === 'agreement') {
    if (entities.tenantName) {
      smartFields['tenantName'] = entities.tenantName;
      summary['Tenant'] = entities.tenantName;
    }
    if (entities.landlordName) {
      smartFields['landlordName'] = entities.landlordName;
      summary['Landlord'] = entities.landlordName;
    }
    if (entities.addresses[0]) {
      smartFields['premisesAddress'] = entities.addresses[0];
      summary['Premises Address'] = entities.addresses[0];
    }
    if (entities.addresses[1]) {
      smartFields['landlordAddress'] = entities.addresses[1];
    }
    const rent = entities.rentAmount || entities.totalAmount;
    if (rent) {
      smartFields['monthlyRent'] = rent;
      summary['Monthly Rent'] = `₹${rent}`;
    }
    if (entities.primaryDate) {
      smartFields['noticeDate'] = entities.primaryDate;
      summary['Notice Date'] = entities.primaryDate;
    }
    if (entities.dates[1]) {
      smartFields['leaseStartDate'] = entities.dates[1];
    }
    smartFields['noticeDays'] = '15';
    // Calculate vacate deadline date (+15 days)
    if (entities.primaryDate) {
      try {
        const d = new Date(entities.primaryDate);
        d.setDate(d.getDate() + 15);
        smartFields['vacateDeadlineDate'] = d.toISOString().split('T')[0];
      } catch {
        smartFields['vacateDeadlineDate'] = entities.primaryDate;
      }
    }
    const groundsText = entities.defectOrGrounds || extractedText.slice(0, 400);
    smartFields['evictionGrounds'] = groundsText;
    summary['Eviction Grounds'] = groundsText.slice(0, 50) + '...';

    if (entities.cityOrDistrict) {
      smartFields['place'] = entities.cityOrDistrict;
    }
  }

  // -------------------------------------------------------------
  // COURT AFFIDAVIT
  // -------------------------------------------------------------
  if (category === 'affidavit') {
    if (entities.deponentName || entities.customerOrComplainant) {
      const name = entities.deponentName || entities.customerOrComplainant;
      smartFields['deponentName'] = name;
      summary['Deponent'] = name;
    }
    if (entities.fatherName) {
      smartFields['deponentFatherName'] = entities.fatherName;
      summary['Father/Spouse'] = entities.fatherName;
    }
    if (entities.deponentAge) {
      smartFields['deponentAge'] = entities.deponentAge;
    }
    if (entities.addresses[0]) {
      smartFields['deponentAddress'] = entities.addresses[0];
    }
    if (entities.cityOrDistrict) {
      smartFields['jurisdictionCity'] = entities.cityOrDistrict;
      summary['City'] = entities.cityOrDistrict;
    }
    smartFields['affidavitFacts'] = extractedText;
    summary['Affidavit Facts'] = 'Full verified facts populated from scan';

    if (entities.primaryDate) {
      try {
        const d = new Date(entities.primaryDate);
        const day = d.getDate();
        const suffix = ['th', 'st', 'nd', 'rd'][(day % 10 > 3 || Math.floor((day % 100) / 10) === 1) ? 0 : day % 10];
        smartFields['dateDay'] = `${day}${suffix}`;
        smartFields['dateMonthYear'] = d.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
      } catch {
        // fallback
      }
    }
  }

  // -------------------------------------------------------------
  // SCHEMA-BASED COMPATIBILITY FALLBACK:
  // If specific schema fields are defined, match by name or label keywords
  // -------------------------------------------------------------
  if (schema.length > 0) {
    for (const field of schema) {
      // If already populated, record key
      if (smartFields[field.name]) {
        matchedKeys.push(field.name);
        continue;
      }

      const fName = field.name.toLowerCase();
      const fLabel = field.label.toLowerCase();

      // Amount matching
      if ((fName.includes('amount') || fName.includes('rent') || fName.includes('price') || fName.includes('fee')) && entities.totalAmount) {
        smartFields[field.name] = entities.totalAmount;
        matchedKeys.push(field.name);
        continue;
      }

      // Date matching
      if ((fName.includes('date') || fLabel.includes('date')) && entities.primaryDate) {
        smartFields[field.name] = entities.primaryDate;
        matchedKeys.push(field.name);
        continue;
      }

      // Textarea / facts / description matching
      if (field.type === 'textarea') {
        const desc = entities.defectOrGrounds || entities.subjectOrInfo || extractedText;
        smartFields[field.name] = desc;
        matchedKeys.push(field.name);
        continue;
      }

      // Place / City matching
      if ((fName.includes('place') || fName.includes('city') || fName.includes('district')) && entities.cityOrDistrict) {
        smartFields[field.name] = entities.cityOrDistrict;
        matchedKeys.push(field.name);
        continue;
      }

      // Vendor / Opposite party matching
      if ((fName.includes('opposite') || fName.includes('vendor') || fName.includes('authority') || fName.includes('company')) && (entities.sellerOrOppositeParty || entities.landlordName)) {
        smartFields[field.name] = entities.sellerOrOppositeParty || entities.landlordName;
        matchedKeys.push(field.name);
        continue;
      }

      // Name matching
      if ((fName.includes('name') || fLabel.includes('name')) && (entities.customerOrComplainant || entities.tenantName || entities.deponentName)) {
        smartFields[field.name] = entities.customerOrComplainant || entities.tenantName || entities.deponentName;
        matchedKeys.push(field.name);
        continue;
      }

      // Address matching
      if ((fName.includes('address') || fLabel.includes('address')) && entities.addresses.length > 0) {
        smartFields[field.name] = entities.addresses[0];
        matchedKeys.push(field.name);
        continue;
      }

      // Receipt / Tx ID matching
      if ((fName.includes('tx') || fName.includes('receipt') || fName.includes('invoice')) && entities.invoiceOrReceiptNumber) {
        smartFields[field.name] = entities.invoiceOrReceiptNumber;
        matchedKeys.push(field.name);
        continue;
      }
    }
  } else {
    // If no schema provided, collect all keys that were populated
    Object.keys(smartFields).forEach(k => {
      if (k !== 'rawText') matchedKeys.push(k);
    });
  }

  return {
    fields: smartFields,
    matchedKeys: Array.from(new Set(matchedKeys)),
    summary,
  };
}

/**
 * Automatically detects the best legal document template based on OCR text contents.
 */
export function detectBestTemplate(
  extractedText: string,
  templates: Array<{ id: string; category: string; title: string }>
): { templateId?: string; category?: string; confidence: number; label: string } {
  const lower = extractedText.toLowerCase();

  let scores: Record<string, number> = {
    consumer: 0,
    rti: 0,
    agreement: 0,
    affidavit: 0,
  };

  // Consumer markers
  if (lower.includes('invoice') || lower.includes('bill of supply')) scores.consumer += 4;
  if (lower.includes('tax invoice') || lower.includes('gstin')) scores.consumer += 3;
  if (lower.includes('warranty') || lower.includes('product') || lower.includes('item')) scores.consumer += 2;
  if (lower.includes('defective') || lower.includes('damaged') || lower.includes('consumer')) scores.consumer += 3;
  if (lower.includes('total amount') || lower.includes('grand total')) scores.consumer += 2;

  // RTI markers
  if (lower.includes('right to information') || lower.includes('rti')) scores.rti += 5;
  if (lower.includes('public information officer') || lower.includes('cpio') || lower.includes('pio')) scores.rti += 5;
  if (lower.includes('section 6') || lower.includes('information requested')) scores.rti += 3;
  if (lower.includes('ipo') || lower.includes('postal order')) scores.rti += 3;

  // Tenant / Eviction markers
  if (lower.includes('tenant') || lower.includes('landlord')) scores.agreement += 4;
  if (lower.includes('lease') || lower.includes('rent') || lower.includes('premises')) scores.agreement += 3;
  if (lower.includes('eviction') || lower.includes('section 106') || lower.includes('vacate')) scores.agreement += 5;
  if (lower.includes('termination of lease') || lower.includes('handover')) scores.agreement += 3;

  // Affidavit markers
  if (lower.includes('affidavit')) scores.affidavit += 5;
  if (lower.includes('deponent') || lower.includes('solemnly affirm')) scores.affidavit += 4;
  if (lower.includes('oath commissioner') || lower.includes('notary public')) scores.affidavit += 4;
  if (lower.includes('verification:') || lower.includes('sworn before me')) scores.affidavit += 3;

  let bestCategory = 'consumer';
  let highestScore = 0;

  for (const [cat, score] of Object.entries(scores)) {
    if (score > highestScore) {
      highestScore = score;
      bestCategory = cat;
    }
  }

  const matchedTemplate = templates.find(t => t.category.toLowerCase() === bestCategory);

  const labels: Record<string, string> = {
    consumer: 'Consumer Dispute Complaint (Invoice / Bill Detected)',
    rti: 'Right to Information Application (RTI Inquiry Detected)',
    agreement: 'Tenant Eviction & Termination Notice (Lease / Rent Detected)',
    affidavit: 'Sworn Court Affidavit & Verification (Affidavit Detected)',
  };

  return {
    templateId: matchedTemplate?.id,
    category: bestCategory,
    confidence: highestScore,
    label: labels[bestCategory] || 'Document Proforma',
  };
}

const GROQ_MODELS = ['qwen/qwen3.8-27b', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b'];

export interface GroqExtractionResult {
  fields: Record<string, string>;
  matchedKeys: string[];
  summary: Record<string, string>;
  detectedTemplateId?: string;
  detectedCategory?: string;
  detectedTemplateLabel?: string;
  source: 'groq' | 'heuristic';
  modelUsed?: string;
}

/**
 * High-accuracy AI entity extraction using Groq LLM (Qwen / GPT-OSS).
 * Parses messy, unstructured OCR output directly into exact legal document schema fields.
 */
export async function extractSmartFieldsWithGroq(
  extractedText: string,
  template?: {
    id?: string;
    title?: string;
    category?: string;
    fieldsSchema?: Array<{ name: string; label: string; type: string; placeholder?: string; options?: string[] }>;
  } | null,
  allTemplates?: Array<any>,
  customApiKey?: string
): Promise<GroqExtractionResult> {
  const apiKey =
    customApiKey ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GROQ_API_KEY) ||
    '';

  if (!apiKey || !extractedText.trim()) {
    const fallback = extractSmartFields(extractedText, template);
    return { ...fallback, source: 'heuristic' };
  }

  const category = template?.category || '';
  const schema = template?.fieldsSchema || [];

  const systemPrompt = `You are an elite legal document assistant and OCR text entity extraction specialist for the Indian legal system.
Your task is to analyze OCR text extracted from physical bills, invoices, notices, tenancy lease agreements, RTI slips, or sworn court affidavits, and accurately populate the required form fields.

CRITICAL RULES:
1. Always format dates (purchaseDate, noticeDate, date, leaseStartDate, vacateDeadlineDate) as YYYY-MM-DD.
2. For numeric amounts (amountPaid, monthlyRent, compensationAmount), return only clean numbers without currency symbols, 'Rs.', '/-', or commas (e.g. "45000" not "Rs. 45,000/-").
3. For textareas (disputeDescription, infoRequested, evictionGrounds, affidavitFacts), generate a clear, coherent, legally sound factual narrative based strictly on facts found in the document.
4. For addresses, combine street, locality, city, and pincode if present.
5. If a field cannot be determined from the document, return an empty string "" rather than making up false facts.
6. Provide an additional key "_summary" in your JSON containing concise high-level entity labels and values (e.g., {"Opposite Party": "...", "Amount": "₹...", "Date": "...", "Product": "..."}).
7. Output ONLY a valid JSON object.`;

  let userPrompt = '';

  if (schema.length > 0) {
    userPrompt = `Active Document Template: "${template?.title || category}" (Category: ${category})

Form Fields Schema:
${JSON.stringify(
  schema.map(f => ({
    name: f.name,
    label: f.label,
    type: f.type,
    placeholder: f.placeholder,
    options: f.options,
  })),
  null,
  2
)}

Scanned OCR Document Text:
"""
${extractedText}
"""

Please extract and populate every field in the schema. Output JSON format:
{
  "${schema[0]?.name || 'field1'}": "value",
  ...other fields,
  "_summary": {
    "Key Label": "Value"
  }
}`;
  } else {
    // No specific template selected yet -> auto-detect template and extract fields
    const templateCatalog = (allTemplates || []).map(t => ({
      id: t.id,
      title: t.title,
      category: t.category,
      fields: (t.fieldsSchema || []).map((f: any) => ({ name: f.name, label: f.label, type: f.type })),
    }));

    userPrompt = `Available Legal Templates:
${JSON.stringify(templateCatalog, null, 2)}

Scanned OCR Document Text:
"""
${extractedText}
"""

Instructions:
1. Determine which of the available templates best matches this document (categories: consumer, rti, agreement, affidavit).
2. Extract all fields for the chosen template.
3. Output JSON format:
{
  "detectedTemplateId": "id of the best matching template",
  "detectedCategory": "consumer | rti | agreement | affidavit",
  "fields": {
    "fieldName1": "value",
    "fieldName2": "value"
  },
  "_summary": {
    "Key Label": "Value"
  }
}`;
  }

  // Attempt Groq API with model fallback
  for (const model of GROQ_MODELS) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
          max_tokens: 1500,
        }),
      });

      if (!response.ok) {
        console.warn(`Groq model ${model} returned status ${response.status}`);
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) continue;

      const parsedJson = JSON.parse(content);

      let finalFields: Record<string, string> = {};
      let detectedTemplateId: string | undefined = undefined;
      let detectedCategory: string | undefined = undefined;
      let summary: Record<string, string> = {};

      if (schema.length > 0) {
        // Known template mode
        summary = parsedJson._summary || {};
        delete parsedJson._summary;

        for (const f of schema) {
          const val = parsedJson[f.name];
          if (val !== undefined && val !== null && String(val).trim() !== '') {
            finalFields[f.name] = String(val).trim();
          }
        }
      } else {
        // Auto-detect template mode
        detectedTemplateId = parsedJson.detectedTemplateId;
        detectedCategory = parsedJson.detectedCategory;
        summary = parsedJson._summary || {};
        finalFields = parsedJson.fields || {};
      }

      // Always include raw text for reference
      finalFields['rawText'] = extractedText;

      const matchedKeys = Object.keys(finalFields).filter(k => k !== 'rawText' && finalFields[k]);

      // If summary is empty, generate from matched keys
      if (Object.keys(summary).length === 0) {
        for (const k of matchedKeys.slice(0, 5)) {
          summary[k] = finalFields[k];
        }
      }

      const labels: Record<string, string> = {
        consumer: 'Consumer Dispute Complaint (Invoice / Bill Detected)',
        rti: 'Right to Information Application (RTI Inquiry Detected)',
        agreement: 'Tenant Eviction & Termination Notice (Lease / Rent Detected)',
        affidavit: 'Sworn Court Affidavit & Verification (Affidavit Detected)',
      };

      return {
        fields: finalFields,
        matchedKeys,
        summary,
        detectedTemplateId,
        detectedCategory,
        detectedTemplateLabel: detectedCategory ? labels[detectedCategory] : undefined,
        source: 'groq',
        modelUsed: model,
      };
    } catch (err) {
      console.warn(`Error querying Groq model ${model}:`, err);
    }
  }

  // Graceful fallback to regex heuristics if Groq API unavailable
  console.info('Falling back to local heuristic extraction');
  const fallback = extractSmartFields(extractedText, template);
  return { ...fallback, source: 'heuristic' };
}

