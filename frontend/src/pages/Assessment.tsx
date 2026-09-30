import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, ArrowRight, ArrowLeft, RefreshCw, Landmark, HelpCircle, FileText, BookmarkCheck, Scale } from 'lucide-react';
import { trpc } from '../utils/trpc.js';
import { useAuth } from '../hooks/useAuth.js';

interface Question {
  id?: string;
  text: string;
  options: { label: string; nextId: string | null; score: number }[];
}

interface AssessmentFlow {
  title: string;
  description: string;
  startQuestionId: string;
  questions: Record<string, Question>;
  getRecommendation: (score: number) => {
    status: 'strong' | 'moderate' | 'weak';
    title: string;
    text: string;
    action: string;
    templateId?: string;
  };
}

const FLOWS: Record<string, AssessmentFlow> = {
  consumer: {
    title: 'Consumer Complaint Assessment',
    description: 'Evaluate if you have grounds to file a case in the Consumer Forum against a vendor or service provider.',
    startQuestionId: 'q1',
    questions: {
      q1: {
        text: 'Did you pay consideration (money) for the product or service?',
        options: [
          { label: 'Yes, I paid fully or partially', nextId: 'q2', score: 2 },
          { label: 'No, it was a free gift/service', nextId: null, score: 0 },
        ],
      },
      q2: {
        text: 'What is the nature of your dispute?',
        options: [
          { label: 'Product has defects/damage', nextId: 'q3', score: 3 },
          { label: 'Service was deficient/incomplete', nextId: 'q3', score: 3 },
          { label: 'Overcharged above MRP / Unfair trade', nextId: 'q3', score: 3 },
        ],
      },
      q3: {
        text: 'Have you contacted the company or seller about this issue already?',
        options: [
          { label: 'Yes, I requested repair/replacement but got no help', nextId: 'q4', score: 2 },
          { label: 'No, I have not reached out to them yet', nextId: 'q4', score: 0 },
        ],
      },
      q4: {
        text: 'Do you have written proof of purchase (bill, receipt, or transaction record)?',
        options: [
          { label: 'Yes, I have invoice/payment receipt', nextId: null, score: 3 },
          { label: 'No, I do not have any written receipt', nextId: null, score: 0 },
        ],
      },
    },
    getRecommendation: (score: number) => {
      if (score >= 8) {
        return {
          status: 'strong',
          title: 'Strong Consumer Protection Claim',
          text: 'You have paid for the item, identified a clear defect/deficiency, and possess transaction receipts. You are eligible to file a complaint in the Consumer Forum.',
          action: 'We recommend generating a formal Consumer Dispute Complaint notice and contacting an advocate if the value is high.',
        };
      } else if (score >= 5) {
        return {
          status: 'moderate',
          title: 'Moderate Legal Claim',
          text: 'You have a valid issue, but you need to collect written transaction receipts or contact the merchant officially before initiating formal legal proceedings.',
          action: 'Draft a simple legal notice and email it to the merchant first to seek an amicable resolution.',
        };
      } else {
        return {
          status: 'weak',
          title: 'Weak Legal Standing',
          text: 'Consumer courts require proof of purchase and a payment transaction. Free items or services generally do not qualify for consumer complaints.',
          action: 'Contact consumer helpline or resolve the dispute directly through informal channels.',
        };
      }
    },
  },
  tenant: {
    title: 'Tenant Protection Assessment',
    description: 'Check your legal rights against arbitrary rent increases or eviction requests by your landlord.',
    startQuestionId: 't1',
    questions: {
      t1: {
        text: 'Do you have a signed written Lease / Rent Agreement?',
        options: [
          { label: 'Yes, registered or signed agreement', nextId: 't2', score: 3 },
          { label: 'No, it is a verbal lease arrangement', nextId: 't2', score: 1 },
        ],
      },
      t2: {
        text: 'Did the landlord provide a written Notice period for eviction?',
        options: [
          { label: 'Yes, I received notice (e.g. 30 days)', nextId: 't3', score: 2 },
          { label: 'No notice was given, they asked me to leave immediately', nextId: 't3', score: 4 },
        ],
      },
      t3: {
        text: 'What is the reason cited for eviction?',
        options: [
          { label: 'Non-payment of rent', nextId: null, score: 1 },
          { label: 'Landlord wants it for personal use / No specific reason', nextId: null, score: 3 },
          { label: 'No reason was given', nextId: null, score: 4 },
        ],
      },
    },
    getRecommendation: (score: number) => {
      if (score >= 8) {
        return {
          status: 'strong',
          title: 'Arbitrary Eviction Defense Available',
          text: 'The landlord is attempting to evict you without adequate written notice or without solid grounds. Rent control laws strongly protect tenants from arbitrary evictions.',
          action: 'File a reply to the eviction notice stating your rights, or consult a rent control advocate immediately.',
        };
      } else {
        return {
          status: 'moderate',
          title: 'Standard Rent Dispute',
          text: 'Review the clauses in your rental agreement. If you have missed rent payments, the landlord has legal grounds to request eviction after serving notice.',
          action: 'Settle outstanding dues or negotiate a grace period for eviction with the landlord.',
        };
      }
    },
  },
  property: {
    title: 'Property Dispute Assessment',
    description: 'Evaluate your standing in disputes over land ownership, boundaries, or illegal occupation.',
    startQuestionId: 'p1',
    questions: {
      p1: {
        text: 'Are you the registered legal owner of the property?',
        options: [
          { label: 'Yes, I have the registered sale deed/title', nextId: 'p2', score: 4 },
          { label: 'No, it is an ancestral/unregistered property', nextId: 'p2', score: 1 },
        ],
      },
      p2: {
        text: 'What is the nature of the dispute?',
        options: [
          { label: 'Illegal occupation / Trespassing', nextId: 'p3', score: 3 },
          { label: 'Boundary or partition dispute', nextId: 'p3', score: 2 },
          { label: 'Fraudulent sale / Forged documents', nextId: 'p3', score: 4 },
        ],
      },
      p3: {
        text: 'Do you have possession of the property right now?',
        options: [
          { label: 'Yes, I am in physical possession', nextId: null, score: 3 },
          { label: 'No, the other party has possession', nextId: null, score: 0 },
        ],
      },
    },
    getRecommendation: (score: number) => {
      if (score >= 8) {
        return {
          status: 'strong',
          title: 'Strong Civil Claim for Property Rights',
          text: 'You have registered documents and a clear grievance. The law favors the registered title holder, especially if you hold physical possession.',
          action: 'File a suit for injunction or declaration in the civil court to protect your property rights.',
        };
      } else if (score >= 4) {
        return {
          status: 'moderate',
          title: 'Complex Property Dispute',
          text: 'Since title documents might be unregistered or possession is lost, the case will require substantial evidence to prove ownership (like tax receipts or utility bills).',
          action: 'Consult a property advocate to issue a legal notice and gather secondary evidence of ownership.',
        };
      } else {
        return {
          status: 'weak',
          title: 'Vulnerable Legal Position',
          text: 'Without a registered deed or physical possession, proving ownership is extremely difficult in civil courts.',
          action: 'Try to resolve the matter through mediation or family settlement before approaching the court.',
        };
      }
    }
  },
  family: {
    title: 'Family Law Assessment',
    description: 'Determine your legal options regarding marriage, divorce, or maintenance disputes.',
    startQuestionId: 'f1',
    questions: {
      f1: {
        text: 'What is the primary legal issue?',
        options: [
          { label: 'Divorce or Separation', nextId: 'f2', score: 2 },
          { label: 'Maintenance or Alimony', nextId: 'f2', score: 2 },
          { label: 'Domestic Violence / Cruelty', nextId: 'f3', score: 4 },
        ],
      },
      f2: {
        text: 'Is your spouse willing to cooperate mutually?',
        options: [
          { label: 'Yes, we want a mutual settlement', nextId: null, score: 5 },
          { label: 'No, they are contesting it', nextId: null, score: 1 },
        ],
      },
      f3: {
        text: 'Is there an immediate threat to your physical safety?',
        options: [
          { label: 'Yes, there is ongoing abuse', nextId: null, score: 5 },
          { label: 'No immediate physical threat', nextId: null, score: 1 },
        ],
      },
    },
    getRecommendation: (score: number) => {
      if (score >= 8) {
        return {
          status: 'strong',
          title: 'Urgent Intervention Required',
          text: 'Cases involving domestic violence or cruelty require immediate legal protection orders from the court.',
          action: 'Contact a family court advocate immediately to file a Domestic Violence complaint or seek police protection.',
        };
      } else if (score >= 6) {
        return {
          status: 'strong',
          title: 'Mutual Consent Divorce',
          text: 'Since both parties agree, you can file for a mutual consent divorce which is faster, less expensive, and less emotionally draining.',
          action: 'Draft a joint petition for mutual consent divorce outlining the terms of separation and alimony.',
        };
      } else {
        return {
          status: 'moderate',
          title: 'Contested Family Dispute',
          text: 'Contested divorces or maintenance claims can take significant time. You will need to gather evidence of cruelty, desertion, or financial records.',
          action: 'Prepare documentation of assets and incidents, and consult a family lawyer to draft a formal petition.',
        };
      }
    }
  },
  employment: {
    title: 'Employment Dispute Assessment',
    description: 'Assess your standing against wrongful termination or unpaid salary from an employer.',
    startQuestionId: 'e1',
    questions: {
      e1: {
        text: 'Do you have an official appointment letter or employment contract?',
        options: [
          { label: 'Yes, I have written proof of employment', nextId: 'e2', score: 4 },
          { label: 'No, it was a verbal or informal arrangement', nextId: 'e2', score: 0 },
        ],
      },
      e2: {
        text: 'What is the core issue?',
        options: [
          { label: 'Unpaid salary / dues', nextId: 'e3', score: 3 },
          { label: 'Wrongful termination without notice', nextId: 'e3', score: 3 },
          { label: 'Workplace harassment', nextId: 'e3', score: 4 },
        ],
      },
      e3: {
        text: 'Have you sent a formal grievance email to HR or Management?',
        options: [
          { label: 'Yes, but received no satisfactory reply', nextId: null, score: 3 },
          { label: 'No, I have not formally emailed them yet', nextId: null, score: 0 },
        ],
      },
    },
    getRecommendation: (score: number) => {
      if (score >= 9) {
        return {
          status: 'strong',
          title: 'Strong Labor/Civil Claim',
          text: 'You have written proof of employment, a clear violation of terms, and a record of attempting to resolve it internally.',
          action: 'Send a formal legal notice for recovery of dues or file a complaint with the Labor Commissioner.',
        };
      } else if (score >= 5) {
        return {
          status: 'moderate',
          title: 'Actionable Employment Dispute',
          text: 'You have a valid claim but lack a paper trail of your grievance. Courts look for evidence that you attempted to resolve the issue internally first.',
          action: 'Send a formal written email to your HR outlining your exact grievances and demanding resolution within 7 days.',
        };
      } else {
        return {
          status: 'weak',
          title: 'Difficult to Prove',
          text: 'Without an appointment letter or written contract, establishing an employer-employee relationship in court is very challenging.',
          action: 'Try to gather secondary evidence (bank statements showing salary credits, ID cards, emails) before taking legal action.',
        };
      }
    }
  },
  cybercrime: {
    title: 'Cybercrime Complaint Assessment',
    description: 'Check if your online fraud or harassment issue is ready to be filed with the cyber police.',
    startQuestionId: 'c1',
    questions: {
      c1: {
        text: 'What kind of cybercrime occurred?',
        options: [
          { label: 'Financial Fraud (UPI, Credit Card, Phishing)', nextId: 'c2', score: 4 },
          { label: 'Online Harassment / Blackmail / Deepfakes', nextId: 'c2', score: 4 },
          { label: 'Hacked Social Media Account', nextId: 'c2', score: 2 },
        ],
      },
      c2: {
        text: 'When did this incident occur?',
        options: [
          { label: 'Within the last 24-48 hours (Golden Hour)', nextId: 'c3', score: 4 },
          { label: 'More than a week ago', nextId: 'c3', score: 1 },
        ],
      },
      c3: {
        text: 'Do you have evidence (Screenshots, URLs, Transaction IDs)?',
        options: [
          { label: 'Yes, I have preserved all digital evidence', nextId: null, score: 3 },
          { label: 'No, I deleted the messages or lack screenshots', nextId: null, score: 0 },
        ],
      },
    },
    getRecommendation: (score: number) => {
      if (score >= 10) {
        return {
          status: 'strong',
          title: 'Urgent Cyber Police Action Required',
          text: 'You have evidence and are reporting within the critical timeframe. The police may be able to freeze the fraudulent transaction or block the perpetrator immediately.',
          action: 'Immediately call 1930 (National Cybercrime Helpline) or file a complaint at cybercrime.gov.in.',
        };
      } else if (score >= 6) {
        return {
          status: 'moderate',
          title: 'Reportable Cyber Offense',
          text: 'While some time has passed, the crime is severe and you have digital evidence. An FIR can still be registered.',
          action: 'Compile all screenshots, transaction IDs, and bank statements, and file a report on the National Cybercrime Reporting Portal.',
        };
      } else {
        return {
          status: 'weak',
          title: 'Weak Evidentiary Support',
          text: 'Cybercrime investigations heavily rely on digital footprints. Without screenshots, transaction IDs, or URLs, the police will struggle to trace the culprits.',
          action: 'Gather any remaining digital traces (bank SMS, browser history) before filing your complaint at the nearest cyber cell.',
        };
      }
    }
  }
};

export default function Assessment() {
  const { user } = useAuth();
  const [selectedFlow, setSelectedFlow] = useState<string | null>(null);
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [cumulativeScore, setCumulativeScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [answersLog, setAnswersLog] = useState<{ question: string; answer: string }[]>([]);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const saveAssessmentMutation = trpc.assessments.saveAssessment.useMutation({
    onSuccess: () => {
      setSavedSuccess(true);
    },
  });

  const startAssessment = (flowKey: string) => {
    setSelectedFlow(flowKey);
    setCurrentQuestionId(FLOWS[flowKey].startQuestionId);
    setHistory([]);
    setCumulativeScore(0);
    setIsFinished(false);
    setAnswersLog([]);
    setSavedSuccess(false);
  };

  const handleAnswerSelect = (option: { label: string; nextId: string | null; score: number }) => {
    if (!selectedFlow || !currentQuestionId) return;

    const newScore = cumulativeScore + option.score;
    setCumulativeScore(newScore);

    const questionText = FLOWS[selectedFlow].questions[currentQuestionId]?.text || '';
    const updatedAnswers = [...answersLog, { question: questionText, answer: option.label }];
    setAnswersLog(updatedAnswers);

    if (option.nextId) {
      setHistory([...history, currentQuestionId]);
      setCurrentQuestionId(option.nextId);
    } else {
      setIsFinished(true);
      if (user) {
        const activeFlow = FLOWS[selectedFlow];
        const rec = activeFlow.getRecommendation(newScore);
        saveAssessmentMutation.mutate({
          category: selectedFlow,
          score: newScore,
          status: rec.status,
          title: rec.title,
          summary: rec.text,
          actionRecommendation: rec.action,
          answers: updatedAnswers,
        });
      }
    }
  };

  const handleBack = () => {
    if (history.length === 0) {
      setSelectedFlow(null);
      setCurrentQuestionId(null);
      return;
    }

    const previousId = history[history.length - 1];
    setHistory(history.slice(0, -1));
    setCurrentQuestionId(previousId);
    setAnswersLog(answersLog.slice(0, -1));
    setCumulativeScore(Math.max(0, cumulativeScore - 2));
  };

  const resetAssessment = () => {
    setSelectedFlow(null);
    setCurrentQuestionId(null);
    setHistory([]);
    setCumulativeScore(0);
    setIsFinished(false);
    setAnswersLog([]);
    setSavedSuccess(false);
  };

  const activeFlow = selectedFlow ? FLOWS[selectedFlow] : null;
  const currentQuestion = activeFlow && currentQuestionId ? activeFlow.questions[currentQuestionId] : null;
  const recommendation = activeFlow && isFinished ? activeFlow.getRecommendation(cumulativeScore) : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 relative">
      <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-purple-600/5 rounded-full blur-[90px] pointer-events-none" />

      {/* Header */}
      <div className="space-y-4 mb-10 text-center">
        <h1 className="text-3xl font-extrabold text-white flex items-center justify-center gap-2">
          <HelpCircle className="text-indigo-400" />
          Guided Legal Assessment
        </h1>
        <p className="text-slate-400 text-sm max-w-lg mx-auto">
          An interactive questionnaire to assess the strength of your legal standing. Answer a few questions to understand your options.
        </p>
      </div>

      {!selectedFlow ? (
        // Select Flow Screen
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          {Object.entries(FLOWS).map(([key, flow]) => (
            <button
              key={key}
              onClick={() => startAssessment(key)}
              className="glow-card p-8 rounded-3xl text-left flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <Landmark size={20} />
                </div>
                <h3 className="text-lg font-bold text-white">{flow.title}</h3>
                <p className="text-slate-400 text-xs leading-relaxed">{flow.description}</p>
              </div>
              <div className="mt-8 flex items-center gap-2 text-indigo-400 font-semibold text-xs">
                Start Assessment <ArrowRight size={14} />
              </div>
            </button>
          ))}
        </div>
      ) : isFinished && recommendation ? (
        // Results Screen
        <div className="bg-slate-900/60 border border-slate-800 p-8 rounded-3xl backdrop-blur-xl space-y-6 shadow-xl animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {recommendation.status === 'strong' ? (
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <CheckCircle2 size={28} />
                </div>
              ) : (
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <AlertTriangle size={28} />
                </div>
              )}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">ASSESSMENT RESULT</span>
                <h2 className="text-2xl font-bold text-white">{recommendation.title}</h2>
              </div>
            </div>

            {user && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 font-medium self-start sm:self-center">
                <BookmarkCheck size={14} className="text-indigo-400" />
                {savedSuccess ? 'Saved to Workspace' : 'Saving to Workspace...'}
              </div>
            )}
          </div>

          <p className="text-slate-300 text-sm leading-relaxed border-t border-slate-800/80 pt-4">
            {recommendation.text}
          </p>

          <div className="bg-indigo-950/40 border border-indigo-900/30 p-5 rounded-2xl">
            <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">Recommended Next Action</h4>
            <p className="text-slate-200 text-sm">{recommendation.action}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-800/80">
            <Link
              to={`/dashboard?newCase=true&cat=${encodeURIComponent(selectedFlow)}&title=${encodeURIComponent(recommendation.title)}&desc=${encodeURIComponent(recommendation.text + ' ' + recommendation.action)}`}
              className="px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
            >
              <Scale size={16} /> File Case Dossier
            </Link>

            <Link
              to="/advocates"
              className="px-4 py-3 bg-purple-600/80 hover:bg-purple-600 text-white font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <FileText size={16} /> Consult an Advocate
            </Link>

            <button
              onClick={resetAssessment}
              className="px-4 py-3 bg-slate-950/80 border border-slate-800 hover:text-white text-slate-300 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw size={16} /> Try Another
            </button>
          </div>
        </div>
      ) : (
        // Question Wizard Screen
        currentQuestion && (
          <div className="bg-slate-900/60 border border-slate-800 p-8 rounded-3xl backdrop-blur-xl shadow-xl space-y-8 animate-fadeIn">
            {/* Progress / Navigation */}
            <div className="flex justify-between items-center text-xs text-slate-500 font-medium">
              <button
                onClick={handleBack}
                className="flex items-center gap-1 hover:text-slate-300 transition-colors"
              >
                <ArrowLeft size={14} /> Back
              </button>
              <span>{activeFlow?.title}</span>
            </div>

            {/* Question Text */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold tracking-wider text-indigo-400 uppercase">Question</span>
              <h2 className="text-xl md:text-2xl font-bold text-white leading-snug">
                {currentQuestion.text}
              </h2>
            </div>

            {/* Options */}
            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(option)}
                  className="w-full text-left p-5 bg-slate-950/50 hover:bg-indigo-600/10 border border-slate-800 hover:border-indigo-500/40 rounded-2xl text-slate-300 hover:text-white font-medium transition-all"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
}
