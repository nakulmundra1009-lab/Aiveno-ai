
import React, { useState, useEffect, useRef } from 'react';
import { AppState, Category, Reminder, Expense, Document } from './types.ts';
import { aiveno } from './services/geminiService.ts';
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
  IS_DEV_MODE: false
};

// --- AD COMPONENTS ---

const BannerAd: React.FC = () => {
  const adInited = useRef(false);

  useEffect(() => {
    if (!AD_CONFIG.IS_DEV_MODE && !adInited.current) {
      const initAd = () => {
        try {
          // @ts-ignore
          const adsbygoogle = window.adsbygoogle;
          if (adsbygoogle && typeof adsbygoogle.push === 'function') {
            adsbygoogle.push({});
            adInited.current = true;
          } else {
            setTimeout(initAd, 1000);
          }
        } catch (e) {
          console.warn("Aiveno AdSense initialization deferred.");
        }
      };
      initAd();
    }
  }, []);

  if (AD_CONFIG.IS_DEV_MODE) {
    return (
      <div className="bg-slate-100 border-t border-slate-200 px-4 py-2 flex items-center justify-between shrink-0 h-[60px]">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold bg-amber-400 text-amber-900 px-1 rounded">AD</span>
          <span className="text-xs font-bold text-slate-800">Mock Advertisement</span>
        </div>
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
          <button 
            onClick={timer === 0 ? onClose : undefined}
            className={`absolute top-3 right-3 p-2 rounded-full transition-all ${timer === 0 ? 'bg-slate-200 text-slate-800' : 'bg-slate-100 text-slate-300'}`}
          >
            {timer > 0 ? <span className="text-xs font-bold px-1">{timer}</span> : <X size={20} />}
          </button>
          <div className="text-center p-6">
            <div className="w-20 h-20 bg-indigo-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-xl">
              <Wallet className="text-white" size={40} />
            </div>
            <h3 className="text-xl font-bold text-indigo-900">Aiveno Premium</h3>
          </div>
        </div>
        <div className="p-6 text-center space-y-4">
          <h2 className="text-lg font-bold text-slate-800 leading-tight">Simplify your life with Aiveno.</h2>
          <button onClick={onClose} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg">
            Dismiss Ad
          </button>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dash' | 'chat' | 'money' | 'docs'>('dash');
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [adCooldown, setAdCooldown] = useState(0);

  const [appState, setAppState] = useState<AppState>(() => {
    try {
      const saved = localStorage.getItem('aiveno_state');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to load local storage state:", e);
    }
    return {
      reminders: [],
      expenses: [],
      documents: [],
      memory: { name: 'User', preferences: [], keyFacts: [] }
    };
  });

  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([
    { role: 'ai', text: "Hello! I'm Aiveno. How can I assist you today?" }
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
      setAdCooldown(prev => prev + 1);
    } catch (error) {
      setChatMessages(prev => [...prev, { role: 'ai', text: "I'm having trouble connecting. Check your internet?" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto bg-white shadow-2xl relative overflow-hidden">
      {showInterstitial && <InterstitialAd onClose={() => setShowInterstitial(false)} />}
      
      <header className="bg-indigo-600 text-white p-4 flex justify-between items-center shrink-0 shadow-md z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
            <span className="text-indigo-600 font-bold">A</span>
          </div>
          <h1 className="text-xl font-bold">Aiveno</h1>
        </div>
        <Bell size={20} />
      </header>

      <main className="flex-1 overflow-y-auto bg-slate-50 pb-4">
        {activeTab === 'dash' && (
          <div className="p-4 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-2xl shadow-sm">
                <p className="text-slate-500 text-xs font-semibold mb-1">Spent Today</p>
                <p className="text-2xl font-bold">₹{appState.expenses.filter(e => new Date(e.date).toDateString() === new Date().toDateString()).reduce((s, e) => s + e.amount, 0)}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm">
                <p className="text-slate-500 text-xs font-semibold mb-1">Tasks</p>
                <p className="text-2xl font-bold">{appState.reminders.filter(r => !r.completed).length}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm">
              <h2 className="font-bold mb-3 flex items-center gap-2"><Calendar size={18}/> Upcoming</h2>
              {appState.reminders.filter(r => !r.completed).length === 0 ? <p className="text-slate-400 text-sm">Clear!</p> : <p className="text-sm">You have tasks waiting.</p>}
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="flex flex-col h-full bg-slate-50">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-4 rounded-3xl text-[13px] ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 shadow-sm'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="p-4 bg-white border-t flex gap-2">
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Ask Aiveno..." className="flex-1 p-3 bg-slate-50 rounded-2xl border-none outline-none text-sm"/>
              <button onClick={sendMessage} disabled={isLoading} className="p-3 bg-indigo-600 text-white rounded-2xl"><Plus size={20}/></button>
            </div>
          </div>
        )}
      </main>

      <BannerAd />

      <nav className="bg-white border-t flex justify-around p-3 shrink-0 shadow-2xl z-10">
        <button onClick={() => handleTabChange('dash')} className={`flex flex-col items-center gap-1 ${activeTab === 'dash' ? 'text-indigo-600' : 'text-slate-400'}`}>
          <LayoutDashboard size={20} /><span className="text-[9px] font-bold">HOME</span>
        </button>
        <button onClick={() => handleTabChange('chat')} className={`flex flex-col items-center gap-1 ${activeTab === 'chat' ? 'text-indigo-600' : 'text-slate-400'}`}>
          <MessageCircle size={20} /><span className="text-[9px] font-bold">CHAT</span>
        </button>
        <button onClick={() => handleTabChange('money')} className={`flex flex-col items-center gap-1 ${activeTab === 'money' ? 'text-indigo-600' : 'text-slate-400'}`}>
          <Wallet size={20} /><span className="text-[9px] font-bold">MONEY</span>
        </button>
        <button onClick={() => handleTabChange('docs')} className={`flex flex-col items-center gap-1 ${activeTab === 'docs' ? 'text-indigo-600' : 'text-slate-400'}`}>
          <FileText size={20} /><span className="text-[9px] font-bold">DOCS</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
