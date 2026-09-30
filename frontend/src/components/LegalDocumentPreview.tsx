import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Printer, Copy, Check, ArrowLeft, Scale, FileText, FolderOpen } from 'lucide-react';

export interface DocumentData {
  title: string;
  category: 'consumer' | 'rti' | string;
  filledData?: Record<string, any>;
  compiledText?: string;
  date?: string;
  caseInfo?: { id: string; title: string };
}

interface LegalDocumentPreviewProps {
  document: DocumentData;
  onBack?: () => void;
}

export default function LegalDocumentPreview({ document: docData, onBack }: LegalDocumentPreviewProps) {
  const [copied, setCopied] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const { title, category, filledData = {}, compiledText = '' } = docData;

  const currentDate = docData.date 
    ? new Date(docData.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  // 1. Download as Formatted PDF (via native high-resolution browser print engine)
  const handleDownloadPDF = () => {
    if (!printRef.current) return;
    const printContents = printRef.current.innerHTML;
    const printWindow = window.open('', '_blank', 'width=900,height=1000');
    if (!printWindow) {
      alert('Please allow popups to download/print the PDF document.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title} - THEMIS Legal Document</title>
          <style>
            @page {
              size: A4;
              margin: 20mm 18mm 20mm 18mm;
            }
            body {
              font-family: 'Times New Roman', Times, serif;
              color: #111;
              background: #fff;
              line-height: 1.6;
              font-size: 12pt;
              margin: 0;
              padding: 0;
            }
            .document-sheet {
              padding: 10px;
            }
            .legal-header {
              text-align: center;
              font-weight: bold;
              text-transform: uppercase;
              margin-bottom: 20px;
              border-bottom: 2px solid #222;
              padding-bottom: 12px;
            }
            .court-title {
              font-size: 13pt;
              margin-bottom: 6px;
            }
            .petition-title {
              font-size: 14pt;
              text-decoration: underline;
              margin-top: 10px;
              margin-bottom: 16px;
            }
            .parties-table {
              width: 100%;
              margin: 15px 0;
              border-collapse: collapse;
            }
            .parties-table td {
              vertical-align: top;
              padding: 4px 0;
            }
            .versus-cell {
              text-align: center;
              font-weight: bold;
              padding: 12px 0;
            }
            .paragraph {
              text-align: justify;
              margin-bottom: 12px;
              text-indent: 20px;
            }
            .prayer-box {
              margin-top: 16px;
              padding-top: 10px;
              border-top: 1px dashed #666;
            }
            .prayer-title {
              font-weight: bold;
              text-decoration: underline;
              margin-bottom: 8px;
            }
            .signature-section {
              margin-top: 40px;
              display: flex;
              justify-content: space-between;
              page-break-inside: avoid;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            td {
              vertical-align: top;
              padding: 6px 4px;
            }
            .border-b {
              border-bottom: 1px solid #ddd;
            }
            .border-dotted {
              border-bottom: 1px dotted #666;
            }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="document-sheet">
            ${printContents}
          </div>
          <script>
            window.onload = function() {
              window.focus();
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // 2. Download as DOCX / Word format
  const handleDownloadDOCX = () => {
    if (!printRef.current) return;
    const content = printRef.current.innerHTML;
    const wordDocument = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' 
            xmlns:w='urn:schemas-microsoft-com:office:word' 
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${title}</title>
        <style>
          body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.6; margin: 40px; }
          .legal-header { text-align: center; font-weight: bold; text-transform: uppercase; border-bottom: 2pt solid black; }
          .versus-cell { text-align: center; font-weight: bold; }
          .paragraph { text-align: justify; margin-bottom: 12pt; }
        </style>
      </head>
      <body>
        ${content}
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + wordDocument], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.doc`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 3. Download Plain Text
  const handleDownloadTXT = () => {
    const textContent = compiledText || (printRef.current ? printRef.current.innerText : '');
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 4. Copy to Clipboard
  const handleCopy = () => {
    const textContent = compiledText || (printRef.current ? printRef.current.innerText : '');
    navigator.clipboard.writeText(textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Action Bar */}
      <div className="bg-slate-900/80 border border-slate-800 p-4 md:p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-xl transition-all"
              title="Back to Form / Templates"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                Document Preview
              </span>
              {docData.caseInfo ? (
                <span className="px-2.5 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <FolderOpen size={11} /> Attached to Case: {docData.caseInfo.title}
                </span>
              ) : (
                <span className="text-xs text-slate-500 font-medium">Ready for Official Filing</span>
              )}
            </div>
            <h2 className="text-lg md:text-xl font-bold text-white mt-1">{title}</h2>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {docData.caseInfo && (
            <Link
              to={`/cases/${docData.caseInfo.id}`}
              className="px-3.5 py-2.5 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-300 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5"
            >
              <FolderOpen size={14} /> View in Case File
            </Link>
          )}
          <button
            onClick={handleDownloadPDF}
            className="flex-1 md:flex-none px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <Download size={14} /> Download PDF
          </button>
          <button
            onClick={handleDownloadDOCX}
            className="flex-1 md:flex-none px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <Download size={14} /> Download DOCX
          </button>
          <button
            onClick={handleDownloadTXT}
            className="px-3.5 py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
            title="Download Plain Text (.txt)"
          >
            <FileText size={14} /> .TXT
          </button>
          <button
            onClick={handleCopy}
            className="px-3.5 py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
            title="Copy Text to Clipboard"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            onClick={handleDownloadPDF}
            className="px-3.5 py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
            title="Print Document"
          >
            <Printer size={14} /> Print
          </button>
        </div>
      </div>

      {/* Realistic A4 Document Sheet Container */}
      <div className="flex justify-center p-2 sm:p-6 bg-slate-950/60 border border-slate-800/80 rounded-3xl overflow-x-auto shadow-2xl">
        <div 
          className="w-full max-w-[800px] bg-white text-slate-900 rounded-xl shadow-2xl p-8 sm:p-14 border border-slate-200 transition-all font-serif selection:bg-indigo-100 relative"
          style={{ minHeight: '1050px', fontFamily: '"Times New Roman", Times, Georgia, serif' }}
        >
          {/* Subtle Legal Watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none">
            <Scale size={420} className="text-slate-950" />
          </div>

          {/* Printable Container Hook */}
          <div ref={printRef}>
            {/* Case 1: CONSUMER DISPUTE COMPLAINT */}
            {category === 'consumer' ? (
              <div className="space-y-6 text-[14px] leading-relaxed text-slate-900">
                {/* Top Office Note */}
                <div className="flex justify-between items-start text-xs font-sans text-slate-600 border-b border-slate-300 pb-2">
                  <span>THEMIS LEGAL AID • FORM C-35</span>
                  <span className="font-semibold text-slate-700 italic">(For Court Registry Use Only)</span>
                </div>

                {/* Court Header */}
                <div className="text-center space-y-1 pt-2">
                  <h3 className="font-bold text-base md:text-lg uppercase tracking-wide">
                    BEFORE THE DISTRICT CONSUMER DISPUTES REDRESSAL COMMISSION
                  </h3>
                  <p className="font-bold text-sm uppercase tracking-wider text-slate-800">
                    AT {filledData.district || '____________________'}
                  </p>
                  <p className="text-xs uppercase font-semibold tracking-wider text-slate-600 pt-1">
                    COMPLAINT PETITION UNDER SECTION 35 OF THE CONSUMER PROTECTION ACT, 2019
                  </p>
                </div>

                {/* Cause Title & Parties Table */}
                <div className="my-4 border border-slate-300 rounded overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs md:text-sm">
                    <tbody>
                      <tr className="border-b border-slate-200 bg-slate-50/70">
                        <td className="p-2.5 font-bold text-slate-700 w-1/4">COMPLAINANT</td>
                        <td className="p-2.5 w-6 text-center font-bold">:</td>
                        <td className="p-2.5 font-semibold text-slate-950">
                          {filledData.complainantName || '________________________________________'}
                          <span className="block text-xs font-normal text-slate-600 italic">
                            R/o: {filledData.complainantAddress || '________________________________________'}
                          </span>
                        </td>
                      </tr>
                      <tr className="bg-slate-100/50">
                        <td colSpan={3} className="text-center font-bold text-xs uppercase tracking-widest text-slate-600 py-1">
                          — VERSUS —
                        </td>
                      </tr>
                      <tr className="border-t border-slate-200 bg-slate-50/70">
                        <td className="p-2.5 font-bold text-slate-700 w-1/4">OPPOSITE PARTY</td>
                        <td className="p-2.5 w-6 text-center font-bold">:</td>
                        <td className="p-2.5 font-semibold text-slate-950">
                          {filledData.oppositePartyName || '________________________________________'}
                          <span className="block text-xs font-normal text-slate-600 italic">
                            Located at: {filledData.oppositePartyAddress || '________________________________________'}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Main Table-like Row-Column Structure */}
                <div className="pt-2">
                  <p className="font-bold text-xs uppercase tracking-wider text-slate-900 mb-3 border-b-2 border-slate-900 pb-1">
                    PARTICULARS OF DISPUTE & STATEMENT OF FACTS
                  </p>

                  <table className="w-full text-left border-collapse text-xs md:text-sm">
                    <tbody>
                      <tr className="border-b border-slate-200">
                        <td className="py-2.5 pr-2 font-medium text-slate-800 w-[42%] align-top">
                          1. Particulars of Product / Service
                        </td>
                        <td className="py-2.5 px-1 font-bold w-4 text-center align-top">:</td>
                        <td className="py-2.5 pl-2 text-slate-950 border-b border-dotted border-slate-400 font-semibold align-top">
                          {filledData.productName || '________________________________________'}
                        </td>
                      </tr>

                      <tr className="border-b border-slate-200">
                        <td className="py-2.5 pr-2 font-medium text-slate-800 align-top">
                          2. Date of Purchase / Availing Service
                        </td>
                        <td className="py-2.5 px-1 font-bold text-center align-top">:</td>
                        <td className="py-2.5 pl-2 text-slate-950 border-b border-dotted border-slate-400 font-semibold align-top">
                          {filledData.purchaseDate || '________________________________________'}
                        </td>
                      </tr>

                      <tr className="border-b border-slate-200">
                        <td className="py-2.5 pr-2 font-medium text-slate-800 align-top">
                          3. Total Consideration / Price Paid
                        </td>
                        <td className="py-2.5 px-1 font-bold text-center align-top">:</td>
                        <td className="py-2.5 pl-2 text-slate-950 border-b border-dotted border-slate-400 font-semibold align-top">
                          Rs. {filledData.amountPaid || '0.00'}/- (Valid consideration paid via invoice)
                        </td>
                      </tr>

                      <tr className="border-b border-slate-200">
                        <td className="py-2.5 pr-2 font-medium text-slate-800 align-top">
                          4. Date on which Legal Notice Served
                        </td>
                        <td className="py-2.5 px-1 font-bold text-center align-top">:</td>
                        <td className="py-2.5 pl-2 text-slate-950 border-b border-dotted border-slate-400 font-semibold align-top">
                          {filledData.noticeDate || '________________________________________'}
                        </td>
                      </tr>

                      <tr className="border-b border-slate-200">
                        <td className="py-2.5 pr-2 font-medium text-slate-800 align-top">
                          5. Detailed Particulars of Defect / Grievance
                        </td>
                        <td className="py-2.5 px-1 font-bold text-center align-top">:</td>
                        <td className="py-2.5 pl-2 text-slate-900 align-top">
                          <div className="p-3 bg-slate-50 border border-slate-300 rounded text-justify font-serif text-xs leading-relaxed">
                            {filledData.disputeDescription || 'No defect description provided.'}
                          </div>
                        </td>
                      </tr>

                      <tr className="border-b border-slate-200">
                        <td className="py-2.5 pr-2 font-medium text-slate-800 align-top">
                          6. Territorial & Pecuniary Jurisdiction
                        </td>
                        <td className="py-2.5 px-1 font-bold text-center align-top">:</td>
                        <td className="py-2.5 pl-2 text-slate-950 border-b border-dotted border-slate-400 align-top">
                          Within jurisdiction of District Commission at {filledData.district || 'this District'}.
                        </td>
                      </tr>

                      <tr>
                        <td className="py-2.5 pr-2 font-medium text-slate-800 align-top">
                          7. Relief / Compensation Prayed For
                        </td>
                        <td className="py-2.5 px-1 font-bold text-center align-top">:</td>
                        <td className="py-2.5 pl-2 text-slate-950 align-top">
                          <ul className="list-disc pl-4 space-y-1 text-xs text-slate-800">
                            <li>Refund of full consideration amount: <strong>Rs. {filledData.amountPaid || '0.00'}/-</strong> with 12% p.a. interest.</li>
                            <li>Compensation towards harassment and deficiency: <strong>Rs. {filledData.compensationAmount || '0.00'}/-</strong>.</li>
                            <li>Appropriate litigation and filing costs as deemed fit by the Hon'ble Commission.</li>
                          </ul>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Verification Table */}
                <div className="mt-6 border border-slate-300 rounded p-3 text-xs space-y-1 bg-slate-50/60">
                  <span className="font-bold uppercase tracking-wider text-slate-900">VERIFICATION:</span>
                  <p className="text-justify text-slate-700">
                    I, <strong>{filledData.complainantName || 'The Complainant'}</strong>, verify that the statements set forth in items 1 to 7 above are true and correct to the best of my knowledge, information, and belief, and nothing material has been concealed.
                  </p>
                </div>

                {/* Bottom Place, Date, Signature in Table Format */}
                <div className="mt-8 pt-4 border-t border-slate-300">
                  <table className="w-full text-xs font-sans">
                    <tbody>
                      <tr>
                        <td className="w-1/2 align-bottom">
                          <p><span className="text-slate-500">Place:</span> <strong>{filledData.district || 'District Location'}</strong></p>
                          <p className="mt-1"><span className="text-slate-500">Date:</span> <strong>{currentDate}</strong></p>
                        </td>
                        <td className="w-1/2 text-center align-bottom">
                          <div className="w-48 mx-auto border-b border-slate-900 mb-1" />
                          <p className="font-bold text-slate-950 uppercase">{filledData.complainantName || 'Complainant'}</p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider">(Signature of Complainant)</p>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : category === 'rti' ? (
              /* Case 2: RTI APPLICATION (MATCHING THE OFFICIAL MODEL) */
              <div className="space-y-6 text-[14px] leading-relaxed text-slate-900">
                {/* Official Right Top Header */}
                <div className="flex justify-between items-start text-xs font-sans text-slate-600 border-b border-slate-300 pb-2">
                  <span>FORM 'A' • RTI APPLICATION</span>
                  <span className="font-semibold text-slate-800 italic">(For Office Use Only)</span>
                </div>

                {/* Addressee Block */}
                <div className="pt-2 text-xs md:text-sm">
                  <p className="font-bold text-slate-950">To,</p>
                  <p className="font-semibold text-slate-900 pl-4">The Public Information Officer /</p>
                  <p className="font-semibold text-slate-900 pl-4">Assistant Public Information Officer,</p>
                  <p className="font-bold text-slate-950 pl-4">{filledData.authorityName || '________________________________________'}</p>
                  <p className="text-slate-700 italic pl-4 text-xs">{filledData.authorityAddress || '________________________________________'}</p>
                </div>

                {/* Sub Heading */}
                <div className="text-center py-1">
                  <p className="font-bold text-xs uppercase tracking-wider text-slate-700 border-y border-slate-200 py-1.5">
                    APPLICATION UNDER SECTION 6(1) OF THE RIGHT TO INFORMATION ACT, 2005
                  </p>
                </div>

                {/* Table Layout Aligned with Colons */}
                <div className="pt-2">
                  <table className="w-full text-left border-collapse text-xs md:text-sm">
                    <tbody>
                      <tr className="border-b border-slate-200">
                        <td className="py-2.5 pr-2 font-medium text-slate-800 w-[44%] align-top">
                          1. Full Name of The Applicant
                        </td>
                        <td className="py-2.5 px-1 font-bold w-4 text-center align-top">:</td>
                        <td className="py-2.5 pl-2 text-slate-950 border-b border-dotted border-slate-400 font-semibold align-top">
                          {filledData.applicantName || '________________________________________'}
                        </td>
                      </tr>

                      <tr className="border-b border-slate-200">
                        <td className="py-2.5 pr-2 font-medium text-slate-800 align-top">
                          2. Citizenship Status
                        </td>
                        <td className="py-2.5 px-1 font-bold text-center align-top">:</td>
                        <td className="py-2.5 pl-2 text-slate-950 border-b border-dotted border-slate-400 align-top">
                          Citizen of India (Eligible under Section 3 of RTI Act, 2005)
                        </td>
                      </tr>

                      <tr className="border-b border-slate-200">
                        <td className="py-2.5 pr-2 font-medium text-slate-800 align-top">
                          3. Correspondence Address
                        </td>
                        <td className="py-2.5 px-1 font-bold text-center align-top">:</td>
                        <td className="py-2.5 pl-2 text-slate-950 border-b border-dotted border-slate-400 align-top">
                          {filledData.applicantAddress || '________________________________________'}
                        </td>
                      </tr>

                      {/* Particulars Section */}
                      <tr className="border-b border-slate-200">
                        <td colSpan={3} className="pt-3 pb-1 font-bold text-slate-900 text-xs uppercase tracking-wider">
                          4. Particulars of The Information Solicited:
                        </td>
                      </tr>

                      <tr className="border-b border-slate-200">
                        <td className="py-2 pr-2 pl-4 text-slate-700 align-top text-xs">
                          a) Subject Matter of Information (*)
                        </td>
                        <td className="py-2 px-1 font-bold text-center align-top">:</td>
                        <td className="py-2 pl-2 text-slate-950 border-b border-dotted border-slate-400 font-medium align-top text-xs">
                          Request for official records and public documents under RTI Act, 2005
                        </td>
                      </tr>

                      <tr className="border-b border-slate-200">
                        <td className="py-2 pr-2 pl-4 text-slate-700 align-top text-xs">
                          b) Period to which information relates (**)
                        </td>
                        <td className="py-2 px-1 font-bold text-center align-top">:</td>
                        <td className="py-2 pl-2 text-slate-950 border-b border-dotted border-slate-400 font-semibold align-top text-xs">
                          {filledData.infoPeriod || '________________________________________'}
                        </td>
                      </tr>

                      <tr className="border-b border-slate-200">
                        <td className="py-2 pr-2 pl-4 text-slate-700 align-top text-xs">
                          c) Specific Details of Information required (***)
                        </td>
                        <td className="py-2 px-1 font-bold text-center align-top">:</td>
                        <td className="py-2 pl-2 text-slate-950 align-top">
                          <div className="p-3 bg-slate-50 border border-slate-300 rounded text-slate-900 font-serif leading-relaxed text-xs whitespace-pre-wrap">
                            {filledData.infoRequested || '____________________________________________________________________\n____________________________________________________________________'}
                          </div>
                        </td>
                      </tr>

                      <tr className="border-b border-slate-200">
                        <td className="py-2 pr-2 pl-4 text-slate-700 align-top text-xs">
                          d) Whether information is required by Post or in person
                        </td>
                        <td className="py-2 px-1 font-bold text-center align-top">:</td>
                        <td className="py-2 pl-2 text-slate-950 border-b border-dotted border-slate-400 align-top text-xs">
                          By Post (Actual postal charges covered by statutory rules)
                        </td>
                      </tr>

                      <tr className="border-b border-slate-200">
                        <td className="py-2 pr-2 pl-4 text-slate-700 align-top text-xs">
                          e) In case by Post (ordinary / registered / speed post)
                        </td>
                        <td className="py-2 px-1 font-bold text-center align-top">:</td>
                        <td className="py-2 pl-2 text-slate-950 border-b border-dotted border-slate-400 align-top text-xs">
                          Speed Post / Registered Post with A.D.
                        </td>
                      </tr>

                      <tr className="border-b border-slate-200">
                        <td className="py-2.5 pr-2 font-medium text-slate-800 align-top">
                          5. Statutory Application Fee Paid
                        </td>
                        <td className="py-2.5 px-1 font-bold text-center align-top">:</td>
                        <td className="py-2.5 pl-2 text-slate-950 border-b border-dotted border-slate-400 align-top">
                          Rs. 10/- via <strong>{filledData.paymentMethod || 'Online Payment'}</strong> (Receipt/Tx ID: <strong>{filledData.paymentTxId || 'TXN-PAID'}</strong>)
                        </td>
                      </tr>

                      <tr>
                        <td className="py-2.5 pr-2 font-medium text-slate-800 align-top">
                          6. Exemption Verification under Section 8 & 9
                        </td>
                        <td className="py-2.5 px-1 font-bold text-center align-top">:</td>
                        <td className="py-2.5 pl-2 text-slate-950 border-b border-dotted border-slate-400 align-top">
                          Information sought does not fall within exemptions under Section 8 & 9 of RTI Act.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Bottom Signature & Date Block */}
                <div className="mt-8 pt-4 border-t border-slate-300">
                  <table className="w-full text-xs font-sans">
                    <tbody>
                      <tr>
                        <td className="w-1/2 align-bottom">
                          <p><span className="text-slate-500">Place:</span> <strong>{filledData.place || 'Place'}</strong></p>
                          <p className="mt-1"><span className="text-slate-500">Date:</span> <strong>{filledData.date || currentDate}</strong></p>
                        </td>
                        <td className="w-1/2 text-center align-bottom">
                          <div className="w-48 mx-auto border-b border-slate-900 mb-1" />
                          <p className="font-bold text-slate-950 uppercase">{filledData.applicantName || 'Applicant'}</p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Signature of the Applicant</p>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* Fallback / Generic Document Format */
              <div className="space-y-6 text-[14px] leading-relaxed text-slate-900">
                <div className="text-center border-b-2 border-slate-900 pb-4">
                  <h3 className="font-bold text-xl uppercase tracking-wide">{title}</h3>
                  <p className="text-xs text-slate-500 uppercase font-sans mt-1">THEMIS VERIFIED LEGAL DRAFT</p>
                </div>

                <div className="whitespace-pre-wrap font-serif text-slate-800 leading-relaxed text-sm p-4 bg-slate-50 rounded border border-slate-200">
                  {compiledText || JSON.stringify(filledData, null, 2)}
                </div>

                <div className="mt-12 flex justify-between items-end pt-6 text-xs font-sans">
                  <div>
                    <p><span className="text-slate-500">Date:</span> <strong>{currentDate}</strong></p>
                  </div>
                  <div className="text-center">
                    <div className="w-48 border-b border-slate-900 mb-1" />
                    <p className="font-bold text-slate-950 uppercase">Authorized Signatory</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
