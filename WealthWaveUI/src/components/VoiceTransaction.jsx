import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, X, Loader2, CheckCircle2 } from 'lucide-react';
import api from '../services/api';

const VoiceTransaction = ({ onSuccess, categories }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [parsed, setParsed] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    // Check for Web Speech API support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        const current = event.results[event.results.length - 1];
        const text = current[0].transcript;
        setTranscript(text);
        if (current.isFinal) {
          parseTransaction(text);
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const parseTransaction = (text) => {
    const lower = text.toLowerCase();
    
    // Extract amount — look for numbers with optional currency symbols or names
    const amountMatch = lower.match(/(?:₹|\$|\barupees?\b|\badollars?\b)\s*(\d+(?:\.\d{1,2})?)/i) || lower.match(/(\d+(?:\.\d{1,2})?)\s*(?:₹|\$|\barupees?\b|\badollars?\b)/i) || lower.match(/(\d+(?:\.\d{1,2})?)/);
    const amount = amountMatch ? parseFloat(amountMatch[amountMatch.length - 1]) : 0;

    // Determine type
    let type = 'EXPENSE';
    if (lower.includes('earn') || lower.includes('received') || lower.includes('got') || lower.includes('income') || lower.includes('salary')) {
      type = 'INCOME';
    }

    // Extract category hint
    const words = lower.replace(/[^\w\s]/g, '').split(/\s+/);
    const stopWords = ['spent', 'spend', 'paid', 'bought', 'got', 'earned', 'received', 'dollars', 'dollar', 'rupees', 'rupee', 'on', 'for', 'the', 'a', 'an', 'my', 'i', 'to', 'of', 'in', 'at'];
    const meaningful = words.filter(w => !stopWords.includes(w) && isNaN(w) && w.length > 2);
    
    // Try to match category from user's categories
    let matchedCategoryId = '';
    if (categories && categories.length > 0) {
      for (const cat of categories) {
        if (lower.includes(cat.name.toLowerCase())) {
          matchedCategoryId = cat.id;
          break;
        }
      }
      if (!matchedCategoryId) {
        // Match by type
        const filtered = categories.filter(c => c.type === type);
        if (filtered.length > 0) matchedCategoryId = filtered[0].id;
        else matchedCategoryId = categories[0].id;
      }
    }

    // Build title from meaningful words (or use full text)
    const title = meaningful.length > 0 
      ? meaningful.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      : text;

    setParsed({
      title: title.substring(0, 50),
      amount,
      type,
      categoryId: matchedCategoryId,
      note: `Voice: "${text}"`
    });
  };

  const startListening = () => {
    if (!recognitionRef.current) {
      alert('Voice recognition is not supported in your browser. Please use Chrome.');
      return;
    }
    setTranscript('');
    setParsed(null);
    setSaved(false);
    setShowModal(true);
    setIsListening(true);
    recognitionRef.current.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const handleSave = async () => {
    if (!parsed || parsed.amount <= 0) return;
    try {
      setSaving(true);
      await api.post('/transactions', parsed);
      setSaved(true);
      setTimeout(() => {
        setShowModal(false);
        setSaved(false);
        setParsed(null);
        setTranscript('');
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (err) {
      console.error('Error saving voice transaction:', err);
      alert('Failed to save transaction.');
    } finally {
      setSaving(false);
    }
  };

  const isSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  if (!isSupported) return null;

  return (
    <>
      {/* Voice Button */}
      <button
        onClick={startListening}
        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white rounded-xl font-medium transition-all shadow-sm shadow-purple-500/20 hover:shadow-md hover:shadow-purple-500/30"
        title="Add transaction by voice"
      >
        <Mic className="w-5 h-5" />
        Voice
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">🎤 Voice Transaction</h2>
              <button onClick={() => { setShowModal(false); stopListening(); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Mic indicator */}
              <div className="flex flex-col items-center">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                  isListening 
                    ? 'bg-rose-100 dark:bg-rose-500/20 animate-pulse ring-4 ring-rose-200 dark:ring-rose-800' 
                    : 'bg-slate-100 dark:bg-slate-800'
                }`}>
                  {isListening ? (
                    <Mic className="w-10 h-10 text-rose-600 dark:text-rose-400" />
                  ) : (
                    <MicOff className="w-10 h-10 text-slate-400" />
                  )}
                </div>
                <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                  {isListening ? 'Listening... Say something like "Spent 50 rupees on groceries"' : transcript ? 'Processing...' : 'Click mic to start'}
                </p>
                {isListening && (
                  <button
                    onClick={stopListening}
                    className="mt-2 px-4 py-1.5 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg font-medium transition-colors"
                  >
                    Stop Listening
                  </button>
                )}
              </div>

              {/* Transcript */}
              {transcript && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">You said:</p>
                  <p className="text-slate-800 dark:text-slate-200 font-medium italic">"{transcript}"</p>
                </div>
              )}

              {/* Parsed result */}
              {parsed && !saved && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Title</p>
                      <p className="font-bold text-slate-800 dark:text-white text-sm">{parsed.title}</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Amount</p>
                      <p className="font-bold text-slate-800 dark:text-white text-sm">₹{parsed.amount.toFixed(2)}</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Type</p>
                      <p className={`font-bold text-sm ${parsed.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>{parsed.type}</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Category</p>
                      <p className="font-bold text-slate-800 dark:text-white text-sm">
                        {categories?.find(c => c.id == parsed.categoryId)?.name || 'Auto'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleSave}
                    disabled={saving || parsed.amount <= 0}
                    className="w-full py-3 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 shadow-md"
                  >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Save Transaction'}
                  </button>
                </div>
              )}

              {/* Success */}
              {saved && (
                <div className="flex flex-col items-center py-4">
                  <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-3" />
                  <p className="font-bold text-emerald-600 dark:text-emerald-400">Transaction Saved!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default VoiceTransaction;
