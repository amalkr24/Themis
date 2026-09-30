import React, { useState } from 'react';
import Tesseract from 'tesseract.js';
import { Camera, Check, Loader2, Sparkles, Copy, X, ArrowDownRight } from 'lucide-react';

interface DocumentOCRScannerProps {
  onApplyText?: (extractedText: string, smartFields?: Record<string, string>) => void;
}

export default function DocumentOCRScanner({ onApplyText }: DocumentOCRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [extractedText, setExtractedText] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    setIsScanning(true);
    setProgress(0);
    setStatusMessage('Initializing OCR recognition engine...');

    try {
      const result = await Tesseract.recognize(file, 'eng', {
        logger: (m: any) => {
          if (m.status === 'recognizing text') {
            const pct = Math.round(m.progress * 100);
            setProgress(pct);
            setStatusMessage(`Reading text from document... ${pct}%`);
          } else if (m.status === 'loading tesseract core') {
            setStatusMessage('Loading OCR language engine...');
          }
        },
      });

      const cleanText = result.data.text.trim();
      setExtractedText(cleanText);
      setStatusMessage('✓ Text recognition complete!');
    } catch (err: any) {
      alert('Failed to scan document: ' + (err.message || 'Unknown error'));
      setStatusMessage('Error scanning image.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleCopy = () => {
    if (!extractedText) return;
    navigator.clipboard.writeText(extractedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAutoFill = () => {
    if (!extractedText || !onApplyText) return;

    const smartFields: Record<string, string> = {
      rawText: extractedText,
    };

    const amountMatch = extractedText.match(/(?:rs\.?|inr|₹|total|amount)\s*[:\-]?\s*([0-9,]+(?:\.[0-9]{2})?)/i);
    if (amountMatch) {
      smartFields['amountPaid'] = amountMatch[1].replace(/,/g, '');
      smartFields['compensationAmount'] = amountMatch[1].replace(/,/g, '');
    }

    const dateMatch = extractedText.match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/);
    if (dateMatch) {
      smartFields['purchaseDate'] = dateMatch[1];
      smartFields['incidentDate'] = dateMatch[1];
    }

    smartFields['defectDetails'] = extractedText;
    smartFields['disputeFacts'] = extractedText;
    smartFields['informationRequired'] = extractedText;
    smartFields['affidavitFacts'] = extractedText;

    onApplyText(extractedText, smartFields);
    setIsOpen(false);
  };

  const handleReset = () => {
    setImagePreview(null);
    setExtractedText('');
    setProgress(0);
    setStatusMessage('');
  };

  if (!isOpen) {
    return (
      <button
        type='button'
        onClick={() => setIsOpen(true)}
        className='px-4 py-2.5 bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 border border-amber-500/30 text-amber-300 hover:text-amber-200 rounded-2xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer w-fit mb-4'
      >
        <Camera size={16} className='text-amber-400' />
        <span>📷 Scan Physical Bill / Notice (OCR Auto-Fill)</span>
        <Sparkles size={13} className='text-amber-400 animate-pulse' />
      </button>
    );
  }

  return (
    <div className='p-6 bg-slate-950/80 border border-amber-500/30 rounded-3xl space-y-5 animate-fadeIn shadow-2xl relative mb-6'>
      <button
        type='button'
        onClick={() => setIsOpen(false)}
        className='absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-900 transition-colors'
      >
        <X size={18} />
      </button>

      <div className='flex items-center gap-2.5'>
        <div className='w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30'>
          <Camera size={18} />
        </div>
        <div>
          <h3 className='font-bold text-white text-sm flex items-center gap-2'>
            OCR Document Scanner & Text Extractor
          </h3>
          <p className='text-xs text-slate-400'>
            Upload a photo or scan of your store invoice, bill, lease contract, or physical notice to auto-fill template fields.
          </p>
        </div>
      </div>

      {!imagePreview ? (
        <div className='border-2 border-dashed border-slate-700 hover:border-amber-500/50 rounded-2xl p-6 text-center transition-colors bg-slate-900/30'>
          <input
            type='file'
            id='ocr-file-input'
            accept='image/png, image/jpeg, image/jpg, image/webp'
            onChange={handleFileChange}
            className='hidden'
          />
          <label
            htmlFor='ocr-file-input'
            className='flex flex-col items-center justify-center gap-2 cursor-pointer'
          >
            <div className='w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20'>
              <Camera size={22} />
            </div>
            <span className='text-xs font-bold text-slate-200'>
              Click to upload photo or scan of document
            </span>
            <span className='text-[10px] text-slate-500'>
              Supported formats: PNG, JPG, JPEG, WebP (Bills, Invoices, FIRs, Agreements)
            </span>
          </label>
        </div>
      ) : (
        <div className='space-y-4'>
          {isScanning ? (
            <div className='p-4 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-2'>
              <div className='flex justify-between items-center text-xs font-medium'>
                <span className='text-amber-400 flex items-center gap-2'>
                  <Loader2 size={14} className='animate-spin' /> {statusMessage}
                </span>
                <span className='text-slate-400 font-bold'>{progress}%</span>
              </div>
              <div className='w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800'>
                <div
                  className='h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300 rounded-full'
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div className='p-3 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-2'>
                <span className='text-[10px] font-bold text-slate-400 uppercase tracking-wider block'>
                  Uploaded Document Scan
                </span>
                <img
                  src={imagePreview}
                  alt='Scanned doc'
                  className='max-h-48 w-full object-contain rounded-xl bg-black/40 border border-slate-800/80'
                />
                <button
                  type='button'
                  onClick={handleReset}
                  className='text-[11px] text-slate-400 hover:text-white underline block pt-1 cursor-pointer'
                >
                  Scan another photo
                </button>
              </div>

              <div className='p-3 bg-slate-900/60 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-2'>
                <div>
                  <div className='flex justify-between items-center mb-1.5'>
                    <span className='text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1'>
                      <Check size={12} /> Extracted Digital Text
                    </span>
                    <button
                      type='button'
                      onClick={handleCopy}
                      className='text-[10px] text-slate-400 hover:text-white flex items-center gap-1 font-semibold cursor-pointer'
                    >
                      {copied ? <Check size={11} className='text-emerald-400' /> : <Copy size={11} />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <textarea
                    readOnly
                    value={extractedText}
                    rows={6}
                    className='w-full p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none font-mono'
                  />
                </div>

                <div className='pt-2 flex justify-end gap-2'>
                  <button
                    type='button'
                    onClick={handleAutoFill}
                    className='px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-extrabold rounded-xl transition-all shadow-lg flex items-center gap-1.5 cursor-pointer'
                  >
                    <ArrowDownRight size={14} /> Auto-Fill into Form
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
