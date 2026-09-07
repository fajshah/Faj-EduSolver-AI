import React, { useState, useRef, useEffect } from 'react';
import { 
  BookOpen, 
  Upload, 
  Type as TypeIcon, 
  Send, 
  Loader2, 
  CheckCircle2, 
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  X,
  History,
  Trash2,
  ExternalLink,
  BrainCircuit
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from '@google/genai';

type PracticeQuestion = {
  question: string;
  answer: string;
};

type AnalysisResult = {
  step_by_step: string;
  final_answer: string;
  practice_questions: PracticeQuestion[];
  subject?: string;
  timestamp?: number;
};

const SUBJECTS = [
  'Mathematics', 'Science', 'History', 'English', 
  'Urdu', 'Islamiat', 'Pakistan Studies', 'Computer Science'
];

// Helper to get Gemini API key from environment
const getApiKey = () => {
  return (
    process.env.GEMINI_API_KEY ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY) ||
    ''
  );
};

export default function App() {
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [textInput, setTextInput] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedHistory = localStorage.getItem('edusolve_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to load history');
      }
    }
  }, []);

  const saveToHistory = (newResult: AnalysisResult) => {
    const updatedHistory = [newResult, ...history].slice(0, 10);
    setHistory(updatedHistory);
    localStorage.setItem('edusolve_history', JSON.stringify(updatedHistory));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('edusolve_history');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('File size too large (max 5MB)');
        return;
      }
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setError(null);
    }
  };

  const clearImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!image && !textInput.trim()) {
      setError('Please provide an image or text description.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let prompt = '';
      const baseTask = `You are a specialized tutor for the subject: ${subject}. Solve the following problem provided in text or image. Provide a step-by-step clear explanation suitable for a student. Include a concise final answer and 3 similar practice questions for the student to try.`;

      switch (subject) {
        case 'Urdu':
          prompt = `${baseTask} CRITICAL: Write the ENTIRE response (explanation, answer, questions) in Urdu script (Nastaliq style). Solve the problem: ${textInput || 'the attached image'}.`;
          break;
        case 'Islamiat':
          prompt = `${baseTask} Use respectful Islamic terminology. Reference Quranic verses or Hadith where relevant. Use a mix of Urdu and English that is easy for a student in Pakistan. Solve: ${textInput || 'the attached image'}.`;
          break;
        case 'Pakistan Studies':
          prompt = `${baseTask} Focus on historical accuracy, geography, and constitutional facts of Pakistan. Explain technical terms in Urdu while keeping the main text in English. Solve: ${textInput || 'the attached image'}.`;
          break;
        case 'Computer Science':
          prompt = `${baseTask} Keep technical explanations simple. Use code blocks or pseudo-code if the problem involves logic or programming. Solve: ${textInput || 'the attached image'}.`;
          break;
        case 'History':
        case 'English':
          prompt = `${baseTask} For English, focus on grammar, vocabulary, or literature analysis as needed. For History, focus on key dates and figures. Provide Urdu meanings for difficult words or important dates. Solve: ${textInput || 'the attached image'}.`;
          break;
        default:
          prompt = `${baseTask} Solve: ${textInput || 'the attached image'}.`;
      }

      const parts: any[] = [{ text: prompt }];
      if (image) {
        const base64 = await fileToBase64(image);
        parts.push({
          inlineData: {
            data: base64,
            mimeType: image.type,
          },
        });
      }

      const apiKey = getApiKey();
      if (!apiKey) {
        throw new Error(
          'GEMINI_API_KEY is not configured. If deploying on Vercel, please go to your Project Settings > Environment Variables, add GEMINI_API_KEY, and redeploy.'
        );
      }

      const ai = new GoogleGenAI({ apiKey });

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts }],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              step_by_step: { type: Type.STRING },
              final_answer: { type: Type.STRING },
              practice_questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    answer: { type: Type.STRING }
                  }
                }
              }
            }
          }
        }
      });

      const responseText = response.text;
      if (responseText) {
        const parsed: AnalysisResult = JSON.parse(responseText);
        const finalResult = { ...parsed, subject, timestamp: Date.now() };
        setResult(finalResult);
        saveToHistory(finalResult);
      } else {
        throw new Error('No response from AI');
      }
    } catch (err: any) {
      console.error('Gemini Error:', err);
      setError(err.message || 'An error occurred while connecting to Gemini.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-slate-800 font-sans selection:bg-indigo-100 pb-20">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 py-4 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <BookOpen size={24} />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-none mb-1">EduSolve AI</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Multilingual Homework Ally</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-2"
            >
              <History size={20} />
              <span className="text-sm font-bold hidden md:block">Recent Solves</span>
            </button>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-slate-600 text-[10px] font-bold">
              <div className="w-2 h-2 bg-emerald-500 rounded-full" />
              SYSTEM ACTIVE
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 pt-10">
        
        {/* History Modal-like Overlay (Simplified) */}
        <AnimatePresence>
          {showHistory && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8 overflow-hidden bg-slate-50 rounded-3xl border border-slate-200"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <History size={18} className="text-indigo-600" />
                    Recently Solved
                  </h3>
                  <button 
                    onClick={clearHistory}
                    className="text-[10px] font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1 uppercase tracking-wider"
                  >
                    <Trash2 size={12} />
                    Clear History
                  </button>
                </div>
                
                {history.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center border border-dashed border-slate-200 rounded-xl">No history yet. Start solving problems!</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {history.map((h, i) => (
                      <button 
                        key={i}
                        onClick={() => { setResult(h); setShowHistory(false); window.scrollTo({ top: 800, behavior: 'smooth' }); }}
                        className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between group hover:border-indigo-300 transition-all text-left"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-800 line-clamp-1">{h.final_answer}</p>
                          <p className="text-[10px] text-slate-400">{h.subject} • {new Date(h.timestamp || 0).toLocaleTimeString()}</p>
                        </div>
                        <ExternalLink size={14} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">
          
          {/* Main Form Section */}
          <section className="space-y-8">
            <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                  <BrainCircuit size={28} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800 tracking-tight">Post a Problem</h2>
                  <p className="text-xs text-slate-400 font-medium">Select your subject and upload or type your homework.</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                
                {/* Subject Grid */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Academic Subject</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {SUBJECTS.map((sub) => (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => setSubject(sub)}
                        className={`px-3 py-3 rounded-xl text-[10px] sm:text-xs font-bold transition-all ${
                          subject === sub 
                            ? 'bg-slate-900 text-white shadow-xl shadow-slate-200 ring-2 ring-slate-900 ring-offset-2' 
                            : 'bg-slate-50 text-slate-500 border border-slate-100 hover:bg-slate-100'
                        }`}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Multimodal Input */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Photo Input */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Photo Upload</label>
                    {!imagePreview ? (
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="h-44 border-2 border-dashed border-slate-100 bg-slate-50 rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/20 transition-all group group"
                      >
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-400 group-hover:text-indigo-600 shadow-sm transition-colors">
                          <Upload size={20} />
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-bold text-slate-700">Attach Photo</p>
                          <p className="text-[10px] text-slate-400 mt-1">Clear snap = Better results</p>
                        </div>
                        <input 
                          ref={fileInputRef}
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={handleImageChange}
                        />
                      </div>
                    ) : (
                      <div className="relative rounded-2xl overflow-hidden border border-slate-200 group h-44 shadow-lg shadow-slate-100">
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover bg-slate-50" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                           <button 
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-10 h-10 bg-white text-slate-900 rounded-full flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-md"
                          >
                            <Upload size={18} />
                          </button>
                          <button 
                            type="button"
                            onClick={clearImage}
                            className="w-10 h-10 bg-rose-500 text-white rounded-full flex items-center justify-center hover:bg-rose-600 transition-all shadow-md"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Text Description */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Context / Text Input</label>
                    <div className="relative h-44">
                      <textarea 
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        placeholder="Type out questions or specific instructions like 'solve using quadratic formula'..."
                        className="w-full h-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none resize-none placeholder:text-slate-300"
                      />
                      <div className="absolute bottom-4 right-4 text-slate-200">
                        <TypeIcon size={18} />
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-5 bg-gradient-to-r from-indigo-600 to-violet-700 hover:from-indigo-700 hover:to-violet-800 disabled:from-slate-200 disabled:to-slate-300 text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl shadow-indigo-100 hover:shadow-indigo-200 transition-all active:scale-[0.99] relative overflow-hidden group"
                >
                  {loading && <div className="absolute inset-0 bg-white/20 animate-pulse pointer-events-none" />}
                  {loading ? (
                    <>
                      <Loader2 size={24} className="animate-spin" />
                      <span className="tracking-wide">ANALYZING WITH AI...</span>
                    </>
                  ) : (
                    <>
                      <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                      <span className="tracking-wide">GET STEP-BY-STEP SOLUTION</span>
                    </>
                  )}
                </button>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 bg-rose-50 border border-rose-100 text-rose-600 text-xs rounded-xl font-bold flex items-center gap-3"
                  >
                    <div className="w-6 h-6 bg-rose-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <X size={14} />
                    </div>
                    {error}
                  </motion.div>
                )}
              </form>
            </div>
          </section>

          {/* Right Column: Information & Guidelines */}
          <aside className="space-y-6 lg:sticky lg:top-24">
            <div className="bg-white rounded-[2rem] p-6 border border-slate-50 shadow-sm relative overflow-hidden">
               <div className="relative z-10">
                 <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                      <HelpCircle size={18} />
                    </div>
                    Solving Tips
                 </h3>
                 <div className="space-y-4">
                  {[
                    { t: 'Natural Light', d: 'Photos taken in daylight yield 40% better character recognition.' },
                    { t: 'Show Your Work', d: 'If you started solving, upload your attempt to get partial credit advice.' },
                    { t: 'Subject Selection', d: 'Picking the right subject tailors the language and logic used.' }
                  ].map((tip, i) => (
                    <div key={i} className="group cursor-default">
                      <h4 className="text-[10px] font-bold text-amber-600 uppercase tracking-tighter mb-0.5 group-hover:text-amber-700 transition-colors">{tip.t}</h4>
                      <p className="text-xs font-medium text-slate-500 leading-snug">{tip.d}</p>
                    </div>
                  ))}
                 </div>
               </div>
            </div>

            <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden">
              <div className="relative z-10">
                <div className="inline-flex px-2 py-1 bg-white/10 rounded text-[9px] font-bold tracking-widest text-indigo-300 border border-white/5 mb-4">
                  CAPABILITIES
                </div>
                <h3 className="text-xl font-bold mb-4 leading-tight">Advanced Mulitmodal Intelligence</h3>
                <ul className="space-y-3">
                  {[
                    'Arabic & Urdu Script Support',
                    'Complex Equation Parsing',
                    'Source Material Verification',
                    'Code Generation (CS)'
                  ].map((feat, i) => (
                    <li key={i} className="flex items-center gap-3 text-xs font-bold text-slate-400">
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-indigo-600/20 blur-3xl rounded-full" />
            </div>
          </aside>
        </div>

        {/* Results Section */}
        <AnimatePresence mode="wait">
          {result && (
            <motion.section 
              key="result"
              initial={{ opacity: 0, y: 80 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -40 }}
              className="mt-16 space-y-12"
            >
              <div className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-200 shadow-2xl shadow-slate-200/50">
                {/* Result Hero Header */}
                <div className="bg-slate-900 p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 border-b border-indigo-500/10">
                   <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-500/30">
                      <CheckCircle2 size={32} />
                    </div>
                    <div>
                      <h2 className="text-3xl font-black tracking-tight leading-none mb-1 text-white">Problem Solved</h2>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase">Academic Insight Generated</span>
                      </div>
                    </div>
                   </div>
                   <div className="px-4 py-2 bg-indigo-600 rounded-xl text-xs font-black uppercase tracking-widest text-indigo-50 animate-pulse">
                      {result.subject} Result
                   </div>
                </div>

                <div className="p-8 md:p-12 space-y-10">
                  {/* Step by Step Area */}
                  <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-10 items-start">
                    <div className="space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-1 flex-shrink-0 bg-indigo-600" />
                        <h3 className="text-lg font-bold text-slate-800">Methodology & Logic</h3>
                      </div>
                      
                      <div className={`prose-container ${result.subject === 'Urdu' || result.subject === 'Islamiat' ? 'urdu-text text-right text-lg' : 'text-sm'}`}>
                        <div className="whitespace-pre-wrap font-medium text-slate-600 leading-[1.8] bg-slate-50 p-6 rounded-3xl border border-slate-100">
                          {result.step_by_step}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Finalized Answer Block */}
                  <div className="relative group">
                    <div className="absolute inset-0 bg-indigo-600 rounded-[2rem] blur-xl opacity-10 group-hover:opacity-20 transition-opacity" />
                    <div className="relative bg-white border-2 border-indigo-600 rounded-[2rem] p-10 flex flex-col items-center text-center">
                      <span className="px-4 py-1.5 bg-indigo-600 rounded-full text-[10px] font-black text-white uppercase tracking-[0.3em] mb-4">Conclusion</span>
                      <div className={`text-3xl md:text-4xl font-black text-indigo-900 tracking-tight ${result.subject === 'Urdu' || result.subject === 'Islamiat' ? 'urdu-text' : 'font-mono'}`}>
                        {result.final_answer}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Practice Section */}
              {result.practice_questions?.length > 0 && (
                <div className="space-y-8 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                        <HelpCircle size={22} />
                      </div>
                      <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Reinforcement Learning</h2>
                    </div>
                    <div className="hidden md:block text-[10px] font-bold text-slate-400 uppercase tracking-widest">3 Practice Questions</div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {result.practice_questions.map((pq, idx) => (
                      <PracticeCard key={idx} question={pq.question} answer={pq.answer} index={idx + 1} urdu={result.subject === 'Urdu'} />
                    ))}
                  </div>
                </div>
              )}
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      <footer className="mt-40 pt-20 border-t border-slate-100 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 mb-12">
          <div className="flex items-center gap-3 grayscale opacity-60">
            <BookOpen size={24} className="text-slate-400" />
            <span className="font-bold text-slate-400 tracking-tighter">EduSolve System V2.1</span>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] text-center">
            Empowering Pakistani Students Worldwide
          </p>
          <div className="flex gap-6 text-slate-400">
            <span className="text-[10px] font-bold cursor-help border-b border-dotted border-slate-300">Privacy</span>
            <span className="text-[10px] font-bold cursor-help border-b border-dotted border-slate-300">Accuracy Policy</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

interface PracticeCardProps {
  key?: React.Key;
  question: string;
  answer: string;
  index: number;
  urdu?: boolean;
}

function PracticeCard({ question, answer, index, urdu }: PracticeCardProps) {
  const [showAnswer, setShowAnswer] = useState(false);

  return (
    <div className="bg-white rounded-[2rem] p-7 border border-slate-100 shadow-sm flex flex-col h-full hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className="w-8 h-8 bg-slate-50 text-slate-400 text-[10px] font-bold rounded-lg flex items-center justify-center border border-slate-100 uppercase">
          #{index}
        </div>
      </div>
      
      <p className={`text-sm font-bold text-slate-700 leading-relaxed mb-8 flex-grow ${urdu ? 'urdu-text text-right' : ''}`}>
        {question}
      </p>
      
      <div className="mt-auto">
        <button 
          onClick={() => setShowAnswer(!showAnswer)}
          className={`w-full p-4 rounded-2xl flex items-center justify-between group transition-all ${
            showAnswer ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span className="text-[10px] font-black uppercase tracking-widest">
            {showAnswer ? 'CLOSE SOLUTION' : 'SHOW ANSWER'}
          </span>
          <div className={`transition-transform duration-300 ${showAnswer ? 'rotate-180' : ''}`}>
            <ChevronDown size={16} />
          </div>
        </button>
        
        <AnimatePresence>
          {showAnswer && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className={`mt-4 p-5 bg-emerald-50 rounded-2xl text-emerald-900 text-sm font-black ring-1 ring-emerald-100 shadow-sm ${urdu ? 'urdu-text text-right' : 'font-mono'}`}>
                {answer}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
