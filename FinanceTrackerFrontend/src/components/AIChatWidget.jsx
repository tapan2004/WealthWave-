import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import api from '../services/api';

const INITIAL_MESSAGE = {
  role: 'bot',
  text: "Hi! I'm your AI Financial Advisor 🤖. Ask me anything about your finances — spending patterns, budget status, savings tips, and more!",
};

const AIChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Cache for API data
  const dataCache = useRef({});

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const fetchData = async () => {
    if (dataCache.current.loaded) return dataCache.current;
    try {
      const [summary, analytics, budgets, recent, prediction] = await Promise.all([
        api.get('/transactions/summary'),
        api.get('/transactions/analytics'),
        api.get('/budgets/check'),
        api.get('/transactions/recent'),
        api.get('/transactions/prediction'),
      ]);
      dataCache.current = {
        loaded: true,
        summary: summary.data,
        analytics: analytics.data,
        budgets: budgets.data,
        recent: recent.data,
        prediction: prediction.data,
      };
      return dataCache.current;
    } catch (err) {
      console.error('Error fetching data for chat:', err);
      return null;
    }
  };

  const generateResponse = (question, data) => {
    if (!data) return "Sorry, I couldn't retrieve your financial data right now. Please try again later.";

    const q = question.toLowerCase();
    const { summary, analytics, budgets, recent, prediction } = data;

    // --- Financial Intent Detection (Using Regex for flexibility) ---

    // Spending / Expenses (Handles: spend, spent, spending, speand, speant, expense, expenses, cost, pay, outgoings, etc. + typos like speand/speant)
    if (/\b(spent|spend|spending|speand|speant|expense|expenses|cost|paid|money out|outgoings)\b/i.test(q)) {
      const expense = summary.totalExpense || 0;
      const top = analytics.topExpenseCategory || 'N/A';
      const avg = analytics.monthlyAverageExpense || 0;

      if (expense === 0) {
        return `📊 **Spending Overview:**\n\nYou haven't recorded any expenses yet! 📥\n\nTry:\n• Clicking **"Add Transaction"**\n• Using the 🎙️ **Voice** button to say *"Spent 50 rupees on lunch"*`;
      }

      return `📊 **Spending Overview:**\n\n• **Total Expenses:** ₹${expense.toFixed(2)}\n• **Top Category:** ${top}\n• **Monthly Average:** ₹${avg.toFixed(2)}\n\n${expense > avg * 1.2 && avg > 0 ? '⚠️ You\'re spending more than your monthly average. Consider checking your budgets!' : '✅ Your spending seems to be under control.'}`;
    }

    // Income / Earnings (Handles: income, earn, salary, deposit, money in, etc.)
    if (/\b(income|earned?|earning|salary|paycheck|deposit|money in|revenue)\b/i.test(q)) {
      const income = summary.totalIncome || 0;
      const rate = income > 0 ? ((income - (summary.totalExpense || 0)) / income * 100) : 0;
      return `💰 **Income Summary:**\n\n• **Total Income:** ₹${income.toFixed(2)}\n• **Savings Rate:** ${rate.toFixed(1)}%\n\n${rate >= 20 ? '🎉 Excellent savings rate! Keep it up.' : '💡 Aiming for a 20% savings rate is a common financial goal.'}`;
    }

    // Balance / Net worth (Handles: balance, left, net, total, remaining, etc.)
    if (/\b(balance|left|remaining|net|total|account)\b/i.test(q)) {
      return `🏦 **Your Current Balance:** ₹${(summary.balance || 0).toFixed(2)}\n\n• **Income:** ₹${(summary.totalIncome || 0).toFixed(2)}\n• **Expenses:** ₹${(summary.totalExpense || 0).toFixed(2)}`;
    }

    // Budgets (Handles: budget, limit, allowance, target, etc.)
    if (/\b(budgets?|limits?|thresholds?|allowance)\b/i.test(q)) {
      if (!budgets || budgets.length === 0) return "📋 You haven't set any budgets yet. Head over to the **Budgets** page to set your limits!";
      let response = "📋 **Budget Status:**\n\n";
      budgets.forEach(b => {
        const pct = ((b.spent / b.budget) * 100).toFixed(0);
        const icon = b.spent > b.budget ? '🔴' : pct >= 80 ? '🟡' : '🟢';
        response += `${icon} **${b.category}:** ₹${b.spent.toFixed(2)} / ₹${b.budget.toFixed(2)} (${pct}%)\n`;
      });
      return response;
    }

    // Prediction / Future (Handles: predict, forecast, next month, future, trajectory, etc.)
    if (/\b(predict|forecast|next month|future|trajectory|will i spend|expect)\b/i.test(q)) {
      const pred = prediction.predictedNextMonthExpense || 0;
      return `🔮 **Forecast for Next Month:**\n\nBased on your history, I predict you will spend around **₹${pred.toFixed(2)}** next month.\n\n${pred > (summary.totalIncome || 0) ? '⚠️ Warning: This exceeds your current income! You might want to review your recurring expenses.' : '✅ This looks sustainable based on your income.'}`;
    }

    // Recent Activity (Handles: recent, last, latest, history, transactions, etc.)
    if (/\b(recent|last|latest|history|transactions|activity|lately)\b/i.test(q)) {
      if (!recent || recent.length === 0) return "📝 No recent transactions found in your account.";
      let response = "📝 **Your Latest Activity:**\n\n";
      recent.forEach(t => {
        const icon = t.type === 'INCOME' ? '💚' : '🔴';
        response += `${icon} **${t.title}** — ₹${Math.abs(t.amount).toFixed(2)} (${t.categoryName || 'General'})\n`;
      });
      return response;
    }

    // Savings Tips / Advice
    if (/\b(save|tips?|advice|help me|improve|guide|how to)\b/i.test(q)) {
      const tips = [
        "💡 Review your **Top Expense Category** and see if there are any subscriptions you don't use.",
        "📊 Use the **Spending Heatmap** to identify which days of the week you spend the most.",
        "🎯 Aim to set at least one **Budget** for a category you struggle with.",
        "✅ Try to increase your **Savings Rate** by just 1% each month."
      ];
      return `💡 **Personalized Tips:**\n\n${tips.join('\n')}`;
    }

    // --- Conversational / casual messages ---

    // Greetings
    if (/^(hi|hey|hello|hii+|hola|sup|yo|good\s?(morning|evening|afternoon|night))[\s!.?]*$/i.test(q.trim())) {
      return "Hey there! 👋 How can I help you with your finances today? You can ask me about your spending, budgets, predictions, or just say **\"tips\"** for personalized advice!";
    }

    // Thanks
    if (/\b(thanks?|thank\s?you|thx|tysm|appreciate|cheers)\b/i.test(q)) {
      return "You're welcome! 😊 Happy to help. Let me know if you have any more questions about your finances!";
    }

    // OK / acknowledgement
    if (/^(ok|okay|k|got\s?it|alright|sure|cool|nice|great|awesome|perfect|understood|noted)[\s!.?]*$/i.test(q.trim())) {
      return "Great! 👍 I'm here whenever you need anything. Just ask about your spending, budgets, or savings anytime!";
    }

    // Goodbye
    if (/\b(bye|goodbye|see\s?you|later|cya|good\s?night)\b/i.test(q)) {
      return "Goodbye! 👋 Keep tracking your finances — you're doing great! Come back anytime you need financial insights. 💰";
    }

    // How are you
    if (/\b(how\s?are\s?you|how\s?do\s?you\s?do|how.?s\s?it\s?going|what.?s\s?up)\b/i.test(q)) {
      return "I'm doing great, thanks for asking! 😄 I'm always ready to crunch your financial numbers. What would you like to know?";
    }

    // Who are you
    if (/\b(who\s?are\s?you|what\s?are\s?you|what\s?can\s?you\s?do|your\s?name)\b/i.test(q)) {
      return "I'm your **AI Financial Advisor** 🤖 — built right into FinTrack! I analyze your real transaction data to give you insights on spending, budgets, predictions, and personalized savings tips.";
    }

    // Help
    if (/^(help|menu|commands|options|what\s?can\s?(i|you))[\s!.?]*$/i.test(q.trim()) || q.includes('help')) {
      return `💬 Here's what I can do:\n\n• **"How much have I spent?"** — Spending overview\n• **"What's my balance?"** — Income vs expenses\n• **"Show my budgets"** — Budget status check\n• **"Predict next month"** — Expense forecast\n• **"Recent transactions"** — Latest activity\n• **"Give me savings tips"** — Personalized advice\n\nJust type naturally — I'll understand! 😊`;
    }

    // Fallback — friendly, not robotic
    return `I'm not sure I understood that, but I'd love to help! 😊\n\nTry asking things like:\n• **"How much have I spent?"**\n• **"What's my balance?"**\n• **"Show my budgets"**\n• **"Predict next month"**\n• **"Give me tips"**\n\nOr just say **"help"** to see everything I can do!`;
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    const data = await fetchData();
    const response = generateResponse(userMsg, data);

    // Simulate typing delay
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'bot', text: response }]);
      setLoading(false);
    }, 800);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 ${isOpen
            ? 'bg-slate-800 dark:bg-slate-600 rotate-90 scale-90'
            : 'bg-gradient-to-br from-primary-500 to-indigo-600 hover:from-primary-600 hover:to-indigo-700 shadow-primary-500/40 hover:scale-110'
          }`}
      >
        {isOpen ? <X className="w-6 h-6 text-white" /> : <MessageCircle className="w-6 h-6 text-white" />}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-96 max-h-[550px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-600 to-indigo-600 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold">AI Financial Advisor</h3>
              <p className="text-primary-100 text-xs">Powered by your transaction data</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[350px]">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user'
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}>
                  {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${msg.role === 'user'
                    ? 'bg-primary-600 text-white rounded-br-md'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-bl-md'
                  }`}>
                  {msg.text.split('**').map((part, idx) =>
                    idx % 2 === 1 ? <strong key={idx}>{part}</strong> : part
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-bl-md px-4 py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your finances..."
                className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIChatWidget;