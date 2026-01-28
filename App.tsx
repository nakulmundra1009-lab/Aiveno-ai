
import React, { useState, useEffect, useRef } from 'react';
import { AppState, Category, Reminder, Expense, Document, UserMemory } from './types';
import { aiveno } from './services/geminiService';
import { 
  Calendar, 
  Wallet, 
  FileText, 
  MessageCircle, 
  Plus, 
  Bell, 
  LayoutDashboard,
  Trash2,
  CheckCircle2,
  X,
  ExternalLink
} from 'lucide-react';

// --- AD ACCOUNT CONFIGURATION ---
const AD_CONFIG = {
  PUBLISHER_ID: "ca-pub-6476313491240615",
  BANNER_SLOT_ID: "9232749226",
  IS_DEV_MODE: false // Set to false to show your real ads
};

// --- AD COMPONENTS ---

const BannerAd: React.FC = () => {
  const adInited = useRef(false);
  const [showSimulated, setShowSimulated] = useState(AD_CONFIG.IS_DEV_MODE);

  useEffect(() => {
    if (!AD_CONFIG.IS_DEV_MODE && !adInited.current) {
      const initAd = () => {
        try {
          // @ts-ignore
          const adsbygoogle = window.adsbygoogle || [];
          if (typeof adsbygoogle.push === 'function') {
            adsbygoogle.push({});
            adInited.current = true;
            console.log("Aiveno Monetization: Ad unit initialized successfully.");
          } else {
            // Script not ready yet, retry in 500ms
            setTimeout(initAd, 500);
          }
        } catch (e) {
          console.error("Aiveno AdSense Error:", e);
        }
      };
      
      initAd();
    }
  }, []);

  if (showSimulated) {
    return (
      <div className="bg-slate-100 border-t border-slate-200 px-4 py-2 flex items-center justify-between shrink-0 h-[60px]">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold bg-amber-400 text-amber-900 px-1 rounded">AD</span>
            <span className="text-xs font-bold text-slate-800">FinBank India</span>
          </div>
          <p className="text-[11px] text-slate-600 truncate max-w-[200px] font-medium">Loans @ 10.5% available now.</p>
        </div>
        <button className="bg-indigo-600 text-white text-[10px] px-3 py-1.5 rounded-lg font-bold shadow-sm">Details</button>
      </div>
    );
  }

  return (
    <div className="bg-white border-t border-slate-200 shrink-0 h-[60px] overflow-hidden flex flex-col justify-center items-center">
      <div className="text-[8px] text-slate-300 uppercase tracking-tighter mb-0.5">Advertisement</div>
      <ins className="adsbygoogle aiveno-ad-slot"
           data-ad-client={AD_CONFIG.PUBLISHER_ID}
           data-ad-slot={AD_CONFIG.BANNER_SLOT_ID}
           data-ad-format="horizontal"
           data-full-width-responsive="true"></ins>
    </div>
  );
};

const InterstitialAd: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [timer, setTimer] = useState(3);
  
  useEffect(() => {
    if (timer > 0) {
      const t = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [timer]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-6 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
        <div className="relative h-64 bg-indigo-100 flex items-center justify-center">
          <div className="absolute top-3 left-3 bg-white/80 px-2 py-0.5 rounded text-[10px] font-bold text-slate-600">Sponsored</div>
          <button 
            onClick={timer === 0 ? onClose : undefined}
            className={`absolute top-3 right-3 p-2 rounded-full transition-all ${timer === 0 ? 'bg-slate-200 text-slate-800 hover:bg-slate-300' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}
          >
            {timer > 0 ? <span className="text-xs font-bold px-1">{timer}</span> : <X size={20} />}
          </button>
          <div className="text-center p-6">
            <div className="w-20 h-20 bg-indigo-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-xl">
              <Wallet className="text-white" size={40} />
            </div>
            <h3 className="text-xl font-bold text-indigo-900">Aiveno Premium Finance</h3>
          </div>
        </div>
        <div className="p-6 text-center space-y-4">
          <h2 className="text-lg font-bold text-slate-800 leading-tight">Take Control of Your Indian Taxes with Expert Filing</h2>
          <p className="text-sm text-slate-500 italic">"I saved ₹15,000 this year with Aiveno's partner!"</p>
          <button className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">
            Check Eligibility Now
          </button>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Advertisement</p>
        </div>
      </div>
    </div>
  );
};

// --- MAIN APP ---

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dash' | 'chat' | 'money' | 'docs'>('dash');
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [adCooldown, setAdCooldown] = useState(0);

  const [appState, setAppState] = useState<AppState>(() => {
    const saved = localStorage.getItem('aiveno_state');
    return saved ? JSON.parse(saved) : {
      reminders: [],
      expenses: [],
      documents: [],
      memory: { name: 'User', preferences: [], keyFacts: [] }
    };
  });

  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([
    { role: 'ai', text: "Hello! I'm Aiveno, your personal assistant. How can I help you manage your day?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('aiveno_state', JSON.stringify(appState));
  }, [appState]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleAction = (action: any) => {
    const { name, args } = action;
    if (name === 'add_reminder') {
      const newRem: Reminder = {
        id: Math.random().toString(36).substr(2, 9),
        title: args.title,
        dueDate: args.dueDate,
        priority: args.priority || 'medium',
        completed: false
      };
      setAppState(prev => ({ ...prev, reminders: [...prev.reminders, newRem] }));
    } else if (name === 'add_expense') {
      const newExp: Expense = {
        id: Math.random().toString(36).substr(2, 9),
        amount: args.amount,
        description: args.description,
        category: args.category || Category.OTHER,
        date: new Date().toISOString()
      };
      setAppState(prev => ({ ...prev, expenses: [...prev.expenses, newExp] }));
    } else if (name === 'update_memory') {
      setAppState(prev => ({
        ...prev,
        memory: { ...prev.memory, keyFacts: [...prev.memory.keyFacts, args.fact] }
      }));
    }
  };

  const handleTabChange = (tab: 'dash' | 'chat' | 'money' | 'docs') => {
    if (adCooldown >= 3 && (tab === 'chat' || tab === 'money')) {
      setShowInterstitial(true);
      setAdCooldown(0);
    } else {
      setAdCooldown(prev => prev + 1);
    }
    setActiveTab(tab);
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg = input;
    setInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const reply = await aiveno.chat(userMsg, appState, handleAction);
      setChatMessages(prev => [...prev, { role: 'ai', text: reply }]);
      setAdCooldown(prev => prev + 0.5);
    } catch (error) {
      setChatMessages(prev => [...prev, { role: 'ai', text: "Sorry, I had a little hiccup. Could you try again?" }]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleReminder = (id: string) => {
    setAppState(prev => ({
      ...prev,
      reminders: prev.reminders.map(r => r.id === id ? { ...r, completed: !r.completed } : r)
    }));
  };

  const deleteReminder = (id: string) => {
    setAppState(prev => ({
      ...prev,
      reminders: prev.reminders.filter(r => r.id !== id)
    }));
  };

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto bg-white shadow-2xl relative overflow-hidden">
      {showInterstitial && <InterstitialAd onClose={() => setShowInterstitial(false)} />}
      
      <header className="bg-indigo-600 text-white p-4 flex justify-between items-center shrink-0 shadow-md z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-inner">
            <span className="text-indigo-600 font-bold">A</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">Aiveno</h1>
        </div>
        <div className="flex gap-4">
          <button className="bg-indigo-500/50 p-1.5 rounded-lg hover:bg-indigo-500 transition-colors">
            <Bell size={20} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto bg-slate-50 pb-4">
        {activeTab === 'dash' && (
          <div className="p-4 space-y-6">
            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-slate-700">
                <LayoutDashboard className="text-indigo-600" size={20} /> Today's Overview
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-slate-500 text-xs font-semibold uppercase mb-1">Spent Today</p>
                  <p className="text-2xl font-bold text-slate-800">
                    ₹{appState.expenses
                      .filter(e => new Date(e.date).toDateString() === new Date().toDateString())
                      .reduce((sum, e) => sum + e.amount, 0)}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-slate-500 text-xs font-semibold uppercase mb-1">Tasks Left</p>
                  <p className="text-2xl font-bold text-slate-800">
                    {appState.reminders.filter(r => !r.completed).length}
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-slate-700">
                <Calendar className="text-indigo-600" size={20} /> Active Reminders
              </h2>
              <div className="space-y-3">
                {appState.reminders.filter(r => !r.completed).length === 0 ? (
                  <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                    <p className="text-slate-400 italic text-sm">No tasks for now. Rest up!</p>
                  </div>
                ) : (
                  appState.reminders.filter(r => !r.completed).map(rem => (
                    <div key={rem.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between group shadow-sm">
                      <div className="flex items-center gap-4">
                        <button onClick={() => toggleReminder(rem.id)} className="text-slate-200 hover:text-indigo-600">
                          <CheckCircle2 size={26} />
                        </button>
                        <div>
                          <p className="font-semibold text-slate-800">{rem.title}</p>
                          <p className="text-xs text-slate-400">{new Date(rem.dueDate).toLocaleString()}</p>
                        </div>
                      </div>
                      <button onClick={() => deleteReminder(rem.id)} className="text-slate-200 hover:text-red-400 opacity-0 group-hover:opacity-100 p-1">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'money' && (
          <div className="p-4 space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2"><Wallet className="text-emerald-600" /> Expense Tracker</h2>
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-6 rounded-3xl text-white shadow-xl">
              <h3 className="text-emerald-100 font-medium mb-1">Total Expenses</h3>
              <p className="text-3xl font-bold">₹{appState.expenses.reduce((s, e) => s + e.amount, 0).toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
              {appState.expenses.length === 0 ? (
                <div className="p-10 text-center text-slate-400 italic">Log an expense to see your spending!</div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {appState.expenses.slice().reverse().map(exp => (
                    <div key={exp.id} className="p-4 flex justify-between items-center hover:bg-slate-50">
                      <div>
                        <p className="font-semibold text-slate-800">{exp.description}</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-tight">{exp.category} • {new Date(exp.date).toLocaleDateString()}</p>
                      </div>
                      <p className="font-bold text-slate-900">₹{exp.amount}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'docs' && (
          <div className="p-4 space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2"><FileText className="text-blue-600" /> Document Vault</h2>
            <div className="grid grid-cols-1 gap-4">
              {appState.documents.length === 0 && (
                <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-200 text-slate-400">
                  <FileText className="mx-auto text-slate-200 mb-2" size={48} />
                  <p>Chat with Aiveno to track Passport or License renewals.</p>
                </div>
              )}
              {appState.documents.map(doc => (
                <div key={doc.id} className="bg-white p-5 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-50 p-3 rounded-xl text-blue-600"><FileText size={20} /></div>
                    <div>
                      <p className="font-bold text-slate-800">{doc.name}</p>
                      <p className="text-xs text-slate-500">Expires: {new Date(doc.expiryDate).toLocaleDateString('en-IN')}</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 text-[10px] font-black rounded-lg uppercase tracking-widest">{doc.type}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="flex flex-col h-full bg-slate-50">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-4 rounded-3xl text-[13px] leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-br-none' 
                    : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 rounded-bl-none flex gap-1.5 items-center">
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-150"></div>
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-300"></div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            
            <div className="p-4 bg-white border-t border-slate-100">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Tell Aiveno about your day..."
                  className="flex-1 p-3.5 bg-slate-50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 border border-slate-100 text-sm"
                />
                <button 
                  onClick={sendMessage}
                  disabled={isLoading}
                  className="p-3.5 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 disabled:opacity-50 active:scale-95"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Production-Ready Monetization Unit */}
      <BannerAd />

      <nav className="bg-white border-t border-slate-100 flex justify-around p-3 shrink-0 shadow-2xl z-10">
        <button onClick={() => handleTabChange('dash')} className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all ${activeTab === 'dash' ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-400'}`}>
          <LayoutDashboard size={20} /><span className="text-[9px] font-bold uppercase tracking-widest">Home</span>
        </button>
        <button onClick={() => handleTabChange('chat')} className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all ${activeTab === 'chat' ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-400'}`}>
          <MessageCircle size={20} /><span className="text-[9px] font-bold uppercase tracking-widest">Chat</span>
        </button>
        <button onClick={() => handleTabChange('money')} className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all ${activeTab === 'money' ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-400'}`}>
          <Wallet size={20} /><span className="text-[9px] font-bold uppercase tracking-widest">Money</span>
        </button>
        <button onClick={() => handleTabChange('docs')} className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all ${activeTab === 'docs' ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-400'}`}>
          <FileText size={20} /><span className="text-[9px] font-bold uppercase tracking-widest">Docs</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
