import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Delete, Divide, X as Multiply, Minus, Plus, Equal, RefreshCw, History, Copy, Check } from 'lucide-react';

interface CalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CalculatorModal({ isOpen, onClose }: CalculatorModalProps) {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isNewValue, setIsNewValue] = useState(true);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleNum = (num: string) => {
    if (isNewValue) {
      setDisplay(num);
      setIsNewValue(false);
    } else {
      setDisplay(display === '0' ? num : display + num);
    }
  };

  const handleOp = (op: string) => {
    setEquation(`${display} ${op} `);
    setIsNewValue(true);
  };

  const calculate = () => {
    if (!equation) return;
    try {
      const expression = equation + display;
      // Replace symbols for evaluation
      const evalExpression = expression.replace(/×/g, '*').replace(/÷/g, '/');
      const result = new Function('return ' + evalExpression)();
      
      const formattedResult = Number.isInteger(result) ? result.toString() : result.toFixed(4).replace(/\.?0+$/, '');
      
      setDisplay(formattedResult);
      setHistory(prev => [`${expression} = ${formattedResult}`, ...prev].slice(0, 20));
      setEquation('');
      setIsNewValue(true);
    } catch (e) {
      setDisplay('خطا');
      setEquation('');
      setIsNewValue(true);
    }
  };

  const handleAction = (action: string) => {
    switch(action) {
      case 'C':
        setDisplay('0');
        setEquation('');
        setIsNewValue(true);
        break;
      case 'CE':
        setDisplay('0');
        setIsNewValue(true);
        break;
      case 'DEL':
        setDisplay(display.length > 1 ? display.slice(0, -1) : '0');
        if (display.length === 1 || display === '0') setIsNewValue(true);
        break;
      case '+/-':
        setDisplay(display.startsWith('-') ? display.slice(1) : '-' + display);
        break;
      case '.':
        if (!display.includes('.')) setDisplay(display + '.');
        setIsNewValue(false);
        break;
    }
  };

  // Handle keyboard events
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow shortcuts like Ctrl+C to work
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // Handle other keys
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleNum(e.key);
      } else if (e.key === '.' || e.key === ',') {
        e.preventDefault();
        handleAction('.');
      } else if (e.key === '+') {
        e.preventDefault();
        handleOp('+');
      } else if (e.key === '-') {
        e.preventDefault();
        handleOp('-');
      } else if (e.key === '*') {
        e.preventDefault();
        handleOp('×');
      } else if (e.key === '/') {
        e.preventDefault();
        handleOp('÷');
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        calculate();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleAction('DEL');
      } else if (e.key === 'Delete') {
        e.preventDefault();
        handleAction('C');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, display, equation, isNewValue, history]);

  return (
    <AnimatePresence>
      {isOpen && (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
        onClick={onClose}
        dir="ltr"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-sm flex flex-col border border-slate-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-100" dir="rtl">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              ماشین حساب
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`p-2 rounded-xl transition-colors ${showHistory ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400 hover:bg-slate-200 hover:text-slate-700'}`}
                title="تاریخچه"
              >
                <History className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex relative h-[450px] overflow-hidden">
            {/* Main Calculator */}
            <div className={`flex flex-col w-full h-full p-6 transition-transform duration-300 ${showHistory ? '-translate-x-full absolute' : 'translate-x-0'}`}>
              {/* Display */}
              <div className="flex flex-col items-end justify-end mb-6 bg-slate-50 rounded-2xl p-4 h-28 border border-slate-100 shadow-inner shrink-0 relative group">
                <div className="flex w-full justify-between items-start mb-2">
                  <button 
                    onClick={() => handleCopy(display)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="کپی مبلغ"
                  >
                    {isCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <div className="text-slate-400 text-sm h-6 font-medium font-mono">{equation}</div>
                </div>
                <div className="text-4xl font-black text-slate-800 tracking-tight font-mono overflow-hidden text-right w-full whitespace-nowrap overflow-ellipsis">
                  {display}
                </div>
              </div>

              {/* Keypad */}
              <div className="grid grid-cols-4 gap-3 flex-1 font-mono">
                <button onClick={() => handleAction('CE')} className="text-rose-500 font-bold bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors text-lg">CE</button>
                <button onClick={() => handleAction('C')} className="text-rose-500 font-bold bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors text-lg">C</button>
                <button onClick={() => handleAction('DEL')} className="text-indigo-500 flex items-center justify-center bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors"><Delete className="w-6 h-6" /></button>
                <button onClick={() => handleOp('÷')} className="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors flex items-center justify-center"><Divide className="w-6 h-6" /></button>

                <button onClick={() => handleNum('7')} className="bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold rounded-xl transition-colors text-xl shadow-sm border border-slate-100">7</button>
                <button onClick={() => handleNum('8')} className="bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold rounded-xl transition-colors text-xl shadow-sm border border-slate-100">8</button>
                <button onClick={() => handleNum('9')} className="bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold rounded-xl transition-colors text-xl shadow-sm border border-slate-100">9</button>
                <button onClick={() => handleOp('×')} className="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors flex items-center justify-center"><Multiply className="w-6 h-6" /></button>

                <button onClick={() => handleNum('4')} className="bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold rounded-xl transition-colors text-xl shadow-sm border border-slate-100">4</button>
                <button onClick={() => handleNum('5')} className="bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold rounded-xl transition-colors text-xl shadow-sm border border-slate-100">5</button>
                <button onClick={() => handleNum('6')} className="bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold rounded-xl transition-colors text-xl shadow-sm border border-slate-100">6</button>
                <button onClick={() => handleOp('-')} className="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors flex items-center justify-center"><Minus className="w-6 h-6" /></button>

                <button onClick={() => handleNum('1')} className="bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold rounded-xl transition-colors text-xl shadow-sm border border-slate-100">1</button>
                <button onClick={() => handleNum('2')} className="bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold rounded-xl transition-colors text-xl shadow-sm border border-slate-100">2</button>
                <button onClick={() => handleNum('3')} className="bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold rounded-xl transition-colors text-xl shadow-sm border border-slate-100">3</button>
                <button onClick={() => handleOp('+')} className="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors flex items-center justify-center"><Plus className="w-6 h-6" /></button>

                <button onClick={() => handleAction('+/-')} className="bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold rounded-xl transition-colors text-lg shadow-sm border border-slate-100">±</button>
                <button onClick={() => handleNum('0')} className="bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold rounded-xl transition-colors text-xl shadow-sm border border-slate-100">0</button>
                <button onClick={() => handleAction('.')} className="bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold rounded-xl transition-colors text-2xl shadow-sm border border-slate-100">.</button>
                <button onClick={calculate} className="text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 rounded-xl transition-colors flex items-center justify-center"><Equal className="w-6 h-6" /></button>
              </div>
            </div>

            {/* History Panel */}
            <div className={`flex flex-col w-full h-full bg-slate-50 transition-transform duration-300 absolute inset-0 ${showHistory ? 'translate-x-0' : 'translate-x-full'}`}>
              <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white shrink-0" dir="rtl">
                <span className="font-bold text-slate-700">تاریخچه محاسبات</span>
                <button 
                  onClick={() => setHistory([])}
                  className="text-sm text-rose-500 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors font-medium flex items-center gap-1.5"
                >
                  <Delete className="w-4 h-4" />
                  پاک کردن
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar" dir="rtl">
                {history.length > 0 ? (
                  history.map((item, index) => (
                    <button 
                      key={index} 
                      onClick={() => handleCopy(item.split('=')[1].trim())}
                      className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 text-left font-mono hover:bg-indigo-50 hover:border-indigo-100 transition-colors w-full group relative focus:outline-none"
                    >
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Copy className="w-4 h-4 text-indigo-400" />
                      </div>
                      <div className="text-slate-500 text-sm mb-1">{item.split('=')[0]}</div>
                      <div className="text-slate-800 font-bold text-lg">{item.split('=')[1]}</div>
                    </button>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                    <History className="w-8 h-8 opacity-20" />
                    <span className="text-sm font-medium">تاریخچه‌ای وجود ندارد</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
}
