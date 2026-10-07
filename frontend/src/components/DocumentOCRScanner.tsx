import React, { useState } from 'react';
import Tesseract from 'tesseract.js';
import { Camera, Check, Loader2, Sparkles, Copy, X, RefreshCw, Eye, Bot, Cpu } from 'lucide-react';
import { extractSmartFieldsWithGroq } from '../utils/ocrParser.js';

interface DocumentOCRScannerProps {
  template?: {
    id: string;
    title: string;
    category: string;
    fieldsSchema?: any;
  } | null;
  allTemplates?: Array<any>;
  onSelectTemplate?: (templateId: string) => void;
  onApplyText?: (extractedText: string, smartFields: Record<string, string>, filledKeys?: string[]) => void;
  buttonLabel?: string;
  className?: string;
}

export default function DocumentOCRScanner({
  template,
  allTemplates,
  onSelectTemplate,
  onApplyText,
  buttonLabel,
  className = '',
}: DocumentOCRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [extractedText, setExtractedText] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [autoFilledSummary, setAutoFilledSummary] = useState<Record<string, string>>({});
  const [autoFilledCount, setAutoFilledCount] = useState<number>(0);
  const [detectedTemplateLabel, setDetectedTemplateLabel] = useState<string>('');
  const [isGroqPowered, setIsGroqPowered] = useState<boolean>(true);
  const [modelName, setModelName] = useState<string>('Groq LLM');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    setIsScanning(true);
    setIsAiProcessing(false);
    setProgress(0);
    setStatusMessage('Initializing OCR recognition engine...');
    setAutoFilledSummary({});
    setAutoFilledCount(0);
    setDetectedTemplateLabel('');

    try {
      // 1. Tesseract OCR pass
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

      // 2. Groq LLM High-Precision Extraction pass
      setIsScanning(false);
      setIsAiProcessing(true);
      setStatusMessage('🤖 Groq LLM analyzing text and extracting legal entities...');

      let activeTemplate = template;
      const aiResult = await extractSmartFieldsWithGroq(cleanText, activeTemplate, allTemplates);

      if (aiResult.detectedTemplateId && onSelectTemplate && !template) {
        onSelectTemplate(aiResult.detectedTemplateId);
        if (aiResult.detectedTemplateLabel) {
          setDetectedTemplateLabel(aiResult.detectedTemplateLabel);
        }
      }

      setAutoFilledSummary(aiResult.summary);
      setAutoFilledCount(aiResult.matchedKeys.length);
      setIsGroqPowered(aiResult.source === 'groq');
      if (aiResult.modelUsed) {
        setModelName(aiResult.modelUsed);
      }

      // 3. Automatically populate form data immediately
      if (onApplyText) {
        onApplyText(cleanText, aiResult.fields, aiResult.matchedKeys);
      }

      setStatusMessage(
        aiResult.source === 'groq'
          ? `✓ Groq LLM extraction complete! Auto-filled ${aiResult.matchedKeys.length} fields.`
          : `✓ Text extracted! Auto-filled ${aiResult.matchedKeys.length} fields.`
      );
    } catch (err: any) {
      alert('Failed to scan document: ' + (err.message || 'Unknown error'));
      setStatusMessage('Error scanning image.');
    } finally {
      setIsScanning(false);
      setIsAiProcessing(false);
    }
  };

  const handleCopy = () => {
    if (!extractedText) return;
    navigator.clipboard.writeText(extractedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Re-run Groq LLM extraction (e.g. after manual edits to OCR text)
  const handleReApplyAutoFill = async () => {
    if (!extractedText || !onApplyText) return;

    setIsAiProcessing(true);
    setStatusMessage('🤖 Groq LLM re-analyzing updated text...');

    try {
      const aiResult = await extractSmartFieldsWithGroq(extractedText, template, allTemplates);
      setAutoFilledSummary(aiResult.summary);
      setAutoFilledCount(aiResult.matchedKeys.length);
      setIsGroqPowered(aiResult.source === 'groq');

      onApplyText(extractedText, aiResult.fields, aiResult.matchedKeys);
      setStatusMessage(
        aiResult.source === 'groq'
          ? `✓ Form updated with ${aiResult.matchedKeys.length} fields via Groq LLM.`
          : `✓ Form updated with ${aiResult.matchedKeys.length} fields.`
      );
    } catch (err) {
      console.error('Failed to re-apply Groq auto-fill', err);
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleReset = () => {
    setImagePreview(null);
    setExtractedText('');
    setProgress(0);
    setStatusMessage('');
    setAutoFilledSummary({});
    setAutoFilledCount(0);
    setDetectedTemplateLabel('');
    setIsAiProcessing(false);
  };

  if (!isOpen) {
    return (
      <button
        type='button'
        onClick={() => setIsOpen(true)}
        className={`px-4 py-2.5 bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 border border-amber-500/30 text-amber-300 hover:text-amber-200 rounded-2xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer w-fit ${className}`}
      >
        <Bot size={16} className='text-amber-400' />
        <span>{buttonLabel || '📷 Scan Document (Groq AI Auto-Fill)'}</span>
        <Sparkles size={13} className='text-amber-400 animate-pulse' />
      </button>
    );
  }

  return (
    <div className='p-6 bg-slate-950/90 border border-amber-500/30 rounded-3xl space-y-5 animate-fadeIn shadow-2xl relative mb-6'>
      <button
        type='button'
        onClick={() => setIsOpen(false)}
        className='absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-900 transition-colors cursor-pointer'
        title='Close OCR Scanner'
      >
        <X size={18} />
      </button>

      <div className='flex items-center gap-2.5'>
        <div className='w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30'>
          <Bot size={18} />
        </div>
        <div>
          <h3 className='font-bold text-white text-sm flex items-center gap-2'>
            Groq AI Smart Document Scanner & Auto-Fill
            <span className='px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-semibold flex items-center gap-1'>
              <Cpu size={10} /> Groq LLM Enhanced
            </span>
          </h3>
          <p className='text-xs text-slate-400'>
            Upload an invoice, bill, eviction notice, or court affidavit. Groq's high-speed LLM extracts structured legal fields and auto-populates your form.
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
            <div className='w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20 hover:scale-105 transition-transform'>
              <Camera size={22} />
            </div>
            <span className='text-xs font-bold text-slate-200'>
              Click to select or drop document photo / scan
            </span>
            <span className='text-[10px] text-slate-500'>
              Powered by Groq LLM — Invoices, Store Bills, Notices, Agreements, RTI Slips, Sworn Statements
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
          ) : isAiProcessing ? (
            <div className='p-5 bg-amber-500/10 rounded-2xl border border-amber-500/30 space-y-2 text-center animate-pulse'>
              <div className='flex items-center justify-center gap-2 text-amber-400 text-xs font-bold'>
                <Bot size={16} className='animate-bounce' />
                <span>Groq LLM is analyzing document and extracting structured legal fields...</span>
              </div>
              <p className='text-[11px] text-slate-400'>
                Identifying parties, amounts, dates, and drafting legal narratives...
              </p>
            </div>
          ) : (
            <div className='space-y-4'>
              {/* Auto-fill confirmation notification */}
              {autoFilledCount > 0 && (
                <div className='p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs'>
                  <div className='flex items-center gap-2 text-emerald-300 font-medium'>
                    <Sparkles size={16} className='text-emerald-400 shrink-0' />
                    <span>
                      <strong>{autoFilledCount} fields</strong> were accurately extracted by {isGroqPowered ? `Groq LLM (${modelName})` : 'AI'} and automatically filled into your form!
                      {detectedTemplateLabel && (
                        <span className='block text-[11px] text-emerald-400/80 font-normal mt-0.5'>
                          Detected Template: <strong>{detectedTemplateLabel}</strong>
                        </span>
                      )}
                    </span>
                  </div>
                  <button
                    type='button'
                    onClick={() => setIsOpen(false)}
                    className='px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition-colors flex items-center gap-1 shrink-0 cursor-pointer self-start sm:self-auto'
                  >
                    <Eye size={12} /> View Filled Form
                  </button>
                </div>
              )}

              {/* Detected fields preview chips */}
              {Object.keys(autoFilledSummary).length > 0 && (
                <div className='p-3.5 bg-slate-900/60 rounded-2xl border border-slate-800/80 space-y-2'>
                  <div className='flex justify-between items-center'>
                    <span className='text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1.5'>
                      <Bot size={12} className='text-amber-400' /> Groq LLM Extracted Entities (Populated)
                    </span>
                    <span className='text-[9px] text-amber-400/80 font-mono'>
                      {modelName}
                    </span>
                  </div>
                  <div className='flex flex-wrap gap-2'>
                    {Object.entries(autoFilledSummary).map(([label, val]) => (
                      <div
                        key={label}
                        className='px-2.5 py-1 bg-slate-950/80 border border-amber-500/20 rounded-xl text-[11px] text-slate-300 flex items-center gap-1.5'
                      >
                        <span className='text-amber-400 font-semibold'>{label}:</span>
                        <span className='text-slate-200 truncate max-w-[200px]'>{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='p-3 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-2'>
                  <span className='text-[10px] font-bold text-slate-400 uppercase tracking-wider block'>
                    Scanned Document Preview
                  </span>
                  <img
                    src={imagePreview}
                    alt='Scanned doc'
                    className='max-h-48 w-full object-contain rounded-xl bg-black/40 border border-slate-800/80'
                  />
                  <button
                    type='button'
                    onClick={handleReset}
                    className='text-[11px] text-slate-400 hover:text-white underline flex items-center gap-1 pt-1 cursor-pointer'
                  >
                    <RefreshCw size={11} /> Scan another document
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
                        {copied ? 'Copied' : 'Copy Text'}
                      </button>
                    </div>
                    <textarea
                      value={extractedText}
                      onChange={(e) => setExtractedText(e.target.value)}
                      rows={6}
                      className='w-full p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-amber-500 font-mono resize-none'
                      placeholder='Extracted text will appear here. You can make manual corrections if needed.'
                    />
                  </div>

                  <div className='pt-2 flex flex-wrap justify-end gap-2'>
                    <button
                      type='button'
                      disabled={isAiProcessing}
                      onClick={handleReApplyAutoFill}
                      className='px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50'
                      title='Re-run Groq LLM extraction'
                    >
                      <Bot size={14} className='text-amber-400' /> Re-run Groq LLM
                    </button>
                    <button
                      type='button'
                      onClick={() => setIsOpen(false)}
                      className='px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-extrabold rounded-xl transition-all shadow-lg flex items-center gap-1.5 cursor-pointer'
                    >
                      <Check size={14} /> Done / View Form
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
