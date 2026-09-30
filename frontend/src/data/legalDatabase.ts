export interface LegalConcept {
  id: string;
  term: string;
  simpleMeaning: string;
  relatedTerms: string[];
  relatedTopic: string;
  importantNote?: string;
  category: string;
  // Professional Legal Reference Fields (for Advocates & Legal Research)
  governingAct?: string;
  statutorySection?: string;
  jurisdictionForum?: string;
  limitationPeriod?: string;
  keyPrecedent?: string;
  draftingNote?: string;
}

export const LEGAL_DATABASE: LegalConcept[] = [
  {
    id: "1",
    term: "Bail",
    simpleMeaning: "Bail is the release of an accused person from custody subject to conditions, pending trial or investigation.",
    relatedTerms: ["Arrest", "Custody", "Surety Bond", "Bail Conditions"],
    relatedTopic: "Criminal Procedure",
    importantNote: "Bail is a procedural right ('Bail is the rule, jail is the exception') and does not imply an acquittal.",
    category: "Legal Dictionary",
    governingAct: "Code of Criminal Procedure, 1973 / Bharatiya Nagarik Suraksha Sanhita, 2023",
    statutorySection: "Sections 436, 437, 439 CrPC (Sections 478, 479, 483 BNSS)",
    jurisdictionForum: "Judicial Magistrate / Sessions Court / High Court",
    limitationPeriod: "Can be moved immediately upon detention or charge filing",
    keyPrecedent: "State of Rajasthan v. Balchand (1977) 4 SCC 308; Satender Kumar Antil v. CBI (2022)",
    draftingNote: "Must aver non-tampering with evidence, availability for investigation, and lack of flight risk."
  },
  {
    id: "2",
    term: "FIR (First Information Report)",
    simpleMeaning: "A written document prepared by the police when they receive information regarding the commission of a cognizable offence.",
    relatedTerms: ["Police", "Investigation", "Cognizable Offence", "Zero FIR"],
    relatedTopic: "Police & Criminal Process",
    importantNote: "Police are legally obligated to register an FIR upon information of a cognizable offence without preliminary enquiry.",
    category: "Legal Dictionary",
    governingAct: "Code of Criminal Procedure, 1973 (Section 154) / BNSS (Section 173)",
    statutorySection: "Section 154 CrPC / Section 173 BNSS",
    jurisdictionForum: "Jurisdictional Police Station / Area Magistrate",
    limitationPeriod: "Should be registered promptly; unreasonable delay requires explanation in court",
    keyPrecedent: "Lalita Kumari v. Govt. of U.P. (2014) 2 SCC 1 (Mandatory registration of FIR)",
    draftingNote: "State date, time, exact place of occurrence, names of accused/witnesses, and precise sequence of events."
  },
  {
    id: "3",
    term: "Consumer Protection Act, 2019",
    simpleMeaning: "A codified law providing swift remedies against defective goods, deficient services, misleading advertisements, and unfair trade practices.",
    relatedTerms: ["District Commission", "Deficiency in Service", "Product Liability", "Unfair Trade Practice"],
    relatedTopic: "Consumer Law",
    importantNote: "Allows electronic filing (e-Daakhil) and hearings via video-conferencing without mandatory advocate representation.",
    category: "Laws & Acts",
    governingAct: "Consumer Protection Act, 2019",
    statutorySection: "Section 35 (District Commission), Section 47 (State Commission), Section 58 (National Commission)",
    jurisdictionForum: "District Consumer Disputes Redressal Commission (claims up to ₹50 Lakhs)",
    limitationPeriod: "2 years from the date on which the cause of action arose (Section 69)",
    keyPrecedent: "Lucknow Development Authority v. M.K. Gupta (1994) 1 SCC 243",
    draftingNote: "Include invoice/bill, proof of payment, grievance correspondence, legal notice, and quantify damages claimed."
  },
  {
    id: "4",
    term: "Right to Information (RTI)",
    simpleMeaning: "A statutory framework empowering citizens to inspect public records and obtain certified information from government public authorities.",
    relatedTerms: ["Public Information Officer (PIO)", "First Appellate Authority", "SIC/CIC", "Section 6(1)"],
    relatedTopic: "Citizen Rights",
    importantNote: "Information concerning life and liberty must be provided within 48 hours; standard requests within 30 days.",
    category: "Know Your Rights",
    governingAct: "Right to Information Act, 2005",
    statutorySection: "Section 6(1) (Application), Section 7(1) (Timeframe), Section 19 (Appeals)",
    jurisdictionForum: "PIO -> First Appellate Authority -> State/Central Information Commission",
    limitationPeriod: "First appeal within 30 days of decision/non-response; Second appeal within 90 days",
    keyPrecedent: "CBSE v. Aditya Bandopadhyay (2011) 8 SCC 497",
    draftingNote: "Keep questions specific, avoid requesting opinions or hypothetical scenarios, specify mode of delivery."
  },
  {
    id: "5",
    term: "Civil Suit & Injunction",
    simpleMeaning: "A formal civil proceeding instituted by a plaintiff against a defendant to establish rights, recover property/damages, or restrain actions.",
    relatedTerms: ["Plaint", "Written Statement", "Temporary Injunction", "Specific Relief"],
    relatedTopic: "Court Procedures",
    importantNote: "Interim injunctions require satisfying a prima facie case, balance of convenience, and irreparable injury.",
    category: "Types of Cases",
    governingAct: "Code of Civil Procedure, 1908 & Specific Relief Act, 1963",
    statutorySection: "Section 9 CPC (Jurisdiction), Order 39 Rules 1 & 2 (Temporary Injunction), Section 38 Specific Relief Act",
    jurisdictionForum: "Munsiff Court / Subordinate Court / District Court (based on pecuniary & territorial jurisdiction)",
    limitationPeriod: "Governed by Limitation Act, 1963 (e.g. 3 years for contract breach, 12 years for immovable property recovery)",
    keyPrecedent: "Dalpat Kumar v. Prahlad Singh (1992) 1 SCC 719 (Three pillars of injunction)",
    draftingNote: "Ensure complete cause of action, clear valuation, and distinct prayers for interim vs permanent relief."
  },
  {
    id: "6",
    term: "Affidavit",
    simpleMeaning: "A sworn written statement of facts voluntarily confirmed under oath or affirmation administered by an authorized officer.",
    relatedTerms: ["Notary Public", "Oath Commissioner", "Affirmation", "Perjury"],
    relatedTopic: "Legal Documents",
    importantNote: "Knowingly swearing a false affidavit constitutes an offence of perjury under Section 193 of the IPC / Section 229 BNS.",
    category: "Legal Documents",
    governingAct: "Notaries Act, 1952 & Order XIX Code of Civil Procedure, 1908",
    statutorySection: "Order XIX CPC / Section 297 CrPC / Section 139 CPC",
    jurisdictionForum: "Court of record / Notary Public / Oath Commissioner",
    limitationPeriod: "Valid upon execution; must be contemporaneous with the underlying application",
    keyPrecedent: "Baban Singh v. Jagdish Singh AIR 1967 SC 68",
    draftingNote: "Strictly bifurcate facts known to personal knowledge versus facts believed from information received."
  },
  {
    id: "7",
    term: "Anticipatory Bail",
    simpleMeaning: "A pre-arrest judicial direction granting bail to a person anticipating arrest in connection with a non-bailable accusation.",
    relatedTerms: ["Apprehension of Arrest", "Non-bailable Offence", "Interim Protection", "Transit Bail"],
    relatedTopic: "Criminal Procedure",
    importantNote: "Cannot be granted for certain offences under special statutes (e.g. SC/ST Act, NDPS commercial quantity restrictions).",
    category: "Legal Dictionary",
    governingAct: "Code of Criminal Procedure, 1973 (Section 438) / BNSS (Section 482)",
    statutorySection: "Section 438 CrPC / Section 482 BNSS",
    jurisdictionForum: "Court of Session or High Court having concurrent jurisdiction",
    limitationPeriod: "Prior to formal arrest; does not automatically expire upon charge-sheet filing",
    keyPrecedent: "Sushila Aggarwal v. State (NCT of Delhi) (2020) 5 SCC 1 (Constitution Bench)",
    draftingNote: "Must demonstrate bona fide apprehension based on specific facts or prior complaints, not vague rumors."
  },
  {
    id: "8",
    term: "Divorce by Mutual Consent",
    simpleMeaning: "A streamlined legal process where spouses mutually petition the court to dissolve marriage amicably on agreed terms.",
    relatedTerms: ["Mutual Petition", "Cooling-off Period", "Permanent Alimony", "Custody Agreement"],
    relatedTopic: "Family Law",
    importantNote: "The statutory 6-month cooling period between First and Second Motion can be waived by the court under Section 13B(2).",
    category: "Types of Cases",
    governingAct: "Hindu Marriage Act, 1955 / Special Marriage Act, 1954 / Indian Divorce Act, 1869",
    statutorySection: "Section 13B Hindu Marriage Act, 1955; Section 28 Special Marriage Act, 1954",
    jurisdictionForum: "Principal Family Court / District Judge",
    limitationPeriod: "Minimum 1 year of separate living required before initial filing (Section 13B(1))",
    keyPrecedent: "Amardeep Singh v. Harveen Kaur (2017) 8 SCC 746 (Waiver of 6-month statutory period)",
    draftingNote: "Ensure full settlement agreement covering alimony, stridhan, child custody, and withdrawal of pending litigations."
  },
  {
    id: "9",
    term: "Summons & Court Process",
    simpleMeaning: "An official writ issued by a court commanding a defendant, respondent, or witness to appear on a date specified or produce records.",
    relatedTerms: ["Process Server", "Substituted Service", "Bailable Warrant", "Speed Post Service"],
    relatedTopic: "Court Procedures",
    importantNote: "Failure to appear after valid service of summons can result in ex-parte proceedings (civil) or warrants of arrest (criminal).",
    category: "Legal Documents",
    governingAct: "Code of Civil Procedure, 1908 (Order V) & Code of Criminal Procedure, 1973 (Sections 61-69)",
    statutorySection: "Order V CPC / Sections 61-69 CrPC (Sections 63-71 BNSS)",
    jurisdictionForum: "Issuing Court of competent jurisdiction",
    limitationPeriod: "Written Statement to be filed within 30 days (extendable to 90/120 days) from summons service",
    keyPrecedent: "Salem Advocate Bar Association v. Union of India (2005) 6 SCC 344",
    draftingNote: "Track service acknowledgment / proof of delivery (RPAD / Speed Post) to establish valid service on record."
  },
  {
    id: "10",
    term: "Property Registration & Stamp Duty",
    simpleMeaning: "The statutory registration of title transfer instruments with the Sub-Registrar to confer legal title and public notice.",
    relatedTerms: ["Sale Deed", "Encumbrance Certificate", "Sub-Registrar", "Stamp Act"],
    relatedTopic: "Property Law",
    importantNote: "An unregistered document affecting immovable property value above ₹100 is inadmissible as primary evidence of title.",
    category: "Know Your Rights",
    governingAct: "Registration Act, 1908 & Indian Stamp Act, 1899",
    statutorySection: "Section 17 (Compulsory Documents), Section 49 (Effect of Non-registration) Registration Act",
    jurisdictionForum: "Office of the Sub-Registrar of Assurances having local jurisdiction",
    limitationPeriod: "Document must be presented for registration within 4 months from date of execution (Section 23)",
    keyPrecedent: "Suraj Lamp & Industries Pvt. Ltd. v. State of Haryana (2012) 1 SCC 656",
    draftingNote: "Verify prior title chain for 30 years, verify Encumbrance Certificate (EC), and ensure exact boundary schedule."
  },
  {
    id: "11",
    term: "Charge Sheet (Final Police Report)",
    simpleMeaning: "The final investigative report submitted by the police to the Magistrate upon completing evidence collection, initiating prosecution.",
    relatedTerms: ["Section 173 Report", "Cognizance", "Default Bail", "Supplementary Charge Sheet"],
    relatedTopic: "Criminal Procedure",
    importantNote: "Failure to file within 60 or 90 days of arrest entitles the accused to statutory 'Default Bail' under Section 167(2) CrPC.",
    category: "Court Procedures",
    governingAct: "Code of Criminal Procedure, 1973 (Section 173) / BNSS (Section 193)",
    statutorySection: "Section 173(2) CrPC / Section 193 BNSS",
    jurisdictionForum: "Jurisdictional Judicial Magistrate / Special Court",
    limitationPeriod: "60 days (offences up to 10 yrs punishment) or 90 days (capital / life / 10+ yrs punishment)",
    keyPrecedent: "Bikramjit Singh v. State of Punjab (2020) 10 SCC 616 (Indefeasible right to default bail)",
    draftingNote: "Scrutinize memo of evidence, seizure list, forensic reports, and list of witnesses for inconsistencies."
  },
  {
    id: "12",
    term: "Criminal Complaint (Private Complaint)",
    simpleMeaning: "An allegation made orally or in writing to a Magistrate, with a view to taking action against a person who has committed an offence.",
    relatedTerms: ["Section 200 CrPC", "Magisterial Enquiry", "Pre-summoning Evidence", "Process Issue"],
    relatedTopic: "Court Procedures",
    importantNote: "A citizen can file a private complaint directly before a Magistrate when the police refuse to register an FIR.",
    category: "Types of Cases",
    governingAct: "Code of Criminal Procedure, 1973 (Sections 190, 200-204) / BNSS",
    statutorySection: "Section 200 CrPC (Section 223 BNSS)",
    jurisdictionForum: "Court of Judicial Magistrate First Class (JMFC)",
    limitationPeriod: "Section 468 CrPC prescribes bar to taking cognizance based on penalty severity (no bar for 3+ yr penalties)",
    keyPrecedent: "Priyanka Srivastava v. State of U.P. (2015) 6 SCC 287 (Affidavit mandatory under 156(3))",
    draftingNote: "Must attach prior Section 154(1) and Section 154(3) police representations with accompanying affidavit."
  },
  {
    id: "13",
    term: "Writ Jurisdiction (Fundamental Rights)",
    simpleMeaning: "High prerogative writs (Habeas Corpus, Mandamus, Prohibition, Quo Warranto, Certiorari) issued to enforce Constitutional rights.",
    relatedTerms: ["Article 226", "Article 32", "Public Interest Litigation", "Judicial Review"],
    relatedTopic: "Constitutional Law",
    importantNote: "High Court's writ jurisdiction under Article 226 is broader than Supreme Court's Article 32 as it covers 'any other purpose'.",
    category: "Know Your Rights",
    governingAct: "Constitution of India, 1950",
    statutorySection: "Article 32 (Supreme Court) & Article 226 (High Courts)",
    jurisdictionForum: "High Court of the State / Supreme Court of India",
    limitationPeriod: "No strict statutory limitation, but doctrine of laches and undue delay applies",
    keyPrecedent: "L. Chandra Kumar v. Union of India (1997) 3 SCC 261 (Inviolable basic structure)",
    draftingNote: "Establish exhaustion of alternate remedies or articulate exceptional circumstances warranting direct writ intervention."
  },
  {
    id: "14",
    term: "Legal Notice",
    simpleMeaning: "A formal written communication sent by an aggrieved party or counsel to a prospective defendant before instituting litigation.",
    relatedTerms: ["Demand Notice", "Cause of Action", "Section 138 NI Act", "Section 80 CPC"],
    relatedTopic: "Court Procedures",
    importantNote: "Mandatory under Section 80 CPC for government suits (2 months notice) and Section 138 NI Act for cheque bounce (15 days notice).",
    category: "Legal Documents",
    governingAct: "Negotiable Instruments Act, 1881 / Code of Civil Procedure, 1908 / Consumer Protection Act",
    statutorySection: "Section 80 CPC (Govt suits), Section 138(b) NI Act (Cheque Bounce), Section 35 CPA",
    jurisdictionForum: "Sent prior to filing in competent Civil/Criminal/Consumer Court",
    limitationPeriod: "Under Section 138 NI Act: Send within 30 days of bank return memo; 15 days compliance window",
    keyPrecedent: "Central Bank of India v. Saxons Farms (1999) 8 SCC 221",
    draftingNote: "State factual background clearly, cite specific damages/claims, provide time window for compliance, preserve postal speed-post proof."
  }
];
