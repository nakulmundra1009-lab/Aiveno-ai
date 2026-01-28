
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
  CheckCircle2
} from 'lucide-react';

// Use standard lucide-react-style components if imports fail, or just SVG
const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dash' | 'chat' | 'money' | 'docs'>('dash');
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
    { role: 'ai', text: "Hello! I'm Aiveno, your personal assistant. How's your day going?" }
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

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg = input;
    setInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const reply = await aiveno.chat(userMsg, appState, handleAction);
      setChatMessages(prev => [...prev, { role: 'ai', text: reply }]);
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
      {/* Header */}
      <header className="bg-indigo-600 text-white p-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
            <span className="text-indigo-600 font-bold">A</span>
          </div>
          <h1 className="text-xl font-bold">Aiveno</h1>
        </div>
        <div className="flex gap-4">
          <Bell size={20} className="cursor-pointer hover:opacity-80" />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-slate-50">
        {activeTab === 'dash' && (
          <div className="p-4 space-y-6">
            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <LayoutDashboard className="text-indigo-600" size={20} /> Today's Overview
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-slate-500 text-sm">Spent Today</p>
                  <p className="text-2xl font-bold text-slate-800">
                    ₹{appState.expenses
                      .filter(e => new Date(e.date).toDateString() === new Date().toDateString())
                      .reduce((sum, e) => sum + e.amount, 0)}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-slate-500 text-sm">Tasks Left</p>
                  <p className="text-2xl font-bold text-slate-800">
                    {appState.reminders.filter(r => !r.completed).length}
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Calendar className="text-indigo-600" size={20} /> Active Reminders
              </h2>
              <div className="space-y-2">
                {appState.reminders.filter(r => !r.completed).length === 0 ? (
                  <p className="text-slate-400 italic text-sm text-center py-4 bg-white rounded-xl border border-dashed">No active reminders. Ask Aiveno to add some!</p>
                ) : (
                  appState.reminders.filter(r => !r.completed).map(rem => (
                    <div key={rem.id} className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <button onClick={() => toggleReminder(rem.id)} className="text-slate-300 hover:text-indigo-600">
                          <CheckCircle2 size={24} />
                        </button>
                        <div>
                          <p className="font-medium text-slate-800">{rem.title}</p>
                          <p className="text-xs text-slate-500">{new Date(rem.dueDate).toLocaleString()}</p>
                        </div>
                      </div>
                      <button onClick={() => deleteReminder(rem.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
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
            <div className="space-y-4">
              <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                <h3 className="text-emerald-800 font-medium mb-1">Total Expenses</h3>
                <p className="text-3xl font-bold text-emerald-900">₹{appState.expenses.reduce((s, e) => s + e.amount, 0)}</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                {appState.expenses.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 italic">No expenses recorded yet.</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {appState.expenses.slice().reverse().map(exp => (
                      <div key={exp.id} className="p-4 flex justify-between items-center">
                        <div>
                          <p className="font-medium">{exp.description}</p>
                          <p className="text-xs text-slate-500">{exp.category} • {new Date(exp.date).toLocaleDateString()}</p>
                        </div>
                        <p className="font-bold text-slate-800">₹{exp.amount}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'docs' && (
          <div className="p-4 space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2"><FileText className="text-blue-600" /> Document Vault</h2>
            <div className="grid grid-cols-1 gap-3">
              {appState.documents.length === 0 && (
                <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-300 text-slate-400">
                  <p>You haven't saved any renewal reminders like Passport or Insurance yet.</p>
                  <p className="text-sm mt-2">Chat with Aiveno to store them!</p>
                </div>
              )}
              {appState.documents.map(doc => (
                <div key={doc.id} className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                  <div>
                    <p className="font-bold">{doc.name}</p>
                    <p className="text-sm text-slate-500">Expires: {new Date(doc.expiryDate).toLocaleDateString()}</p>
                  </div>
                  <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded uppercase">{doc.type}</span>
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
                  <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                    msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-br-none' 
                    : 'bg-white text-slate-800 shadow-sm border border-slate-200 rounded-bl-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 rounded-bl-none flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-100"></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-200"></span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            
            <div className="p-4 bg-white border-t border-slate-200">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Ask Aiveno... (e.g. Spent 500 on dinner)"
                  className="flex-1 p-3 bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
                <button 
                  onClick={sendMessage}
                  disabled={isLoading}
                  className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Navigation Footer */}
      <nav className="bg-white border-t border-slate-200 flex justify-around p-3 shrink-0">
        <button 
          onClick={() => setActiveTab('dash')} 
          className={`flex flex-col items-center gap-1 ${activeTab === 'dash' ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <LayoutDashboard size={20} />
          <span className="text-[10px] font-medium uppercase tracking-wider">Home</span>
        </button>
        <button 
          onClick={() => setActiveTab('chat')} 
          className={`flex flex-col items-center gap-1 ${activeTab === 'chat' ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <MessageCircle size={20} />
          <span className="text-[10px] font-medium uppercase tracking-wider">Assistant</span>
        </button>
        <button 
          onClick={() => setActiveTab('money')} 
          className={`flex flex-col items-center gap-1 ${activeTab === 'money' ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <Wallet size={20} />
          <span className="text-[10px] font-medium uppercase tracking-wider">Finances</span>
        </button>
        <button 
          onClick={() => setActiveTab('docs')} 
          className={`flex flex-col items-center gap-1 ${activeTab === 'docs' ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <FileText size={20} />
          <span className="text-[10px] font-medium uppercase tracking-wider">Docs</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
