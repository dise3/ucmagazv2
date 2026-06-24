import React, { useState, useEffect } from 'react';
import { ChevronLeft, HelpCircle, ArrowLeftRight, Info, X } from 'lucide-react';
import Checkout from './Checkout';

interface SteamProps {
  onBack: () => void;
}

const Steam: React.FC<SteamProps> = ({ onBack }) => {
  const [login, setLogin] = useState('');
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<'receive' | 'pay'>('receive');
  const [showCheckout, setShowCheckout] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [showLoginPhoto, setShowLoginPhoto] = useState(false); // Состояние только для фото

  const VITE_API_NGROK = import.meta.env.VITE_API_NGROK;

  useEffect(() => {
    fetch(`${VITE_API_NGROK}/api/settings`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
    }).then(res => res.json()).then(setSettings);
  }, []);

  const usdRate = settings?.usd_rate_store || settings?.usd_rate || 95;
  const steamMarkup = settings?.steam_fee_percent ?? 0.15;
  const paymentCommision = 1.0485;

  const calculateFinalPriceRub = () => {
    const val = parseFloat(amount) || 0;
    if (mode === 'pay') return Math.ceil(val);
    return Math.ceil(val * (1 + steamMarkup) * paymentCommision + 1);
  };

  const calculateUsdForApi = () => {
    const val = parseFloat(amount) || 0;
    if (mode === 'pay') return (val / paymentCommision / (1 + steamMarkup) / usdRate).toFixed(2);
    return (val / usdRate).toFixed(2);
  };

  if (showCheckout) {
    return (
      <Checkout 
        onBack={() => setShowCheckout(false)} 
        pack={{
          type: 'steam_topup',
          amount: parseFloat(calculateUsdForApi()), 
          price: calculateFinalPriceRub(),
          uid: login,
          title: `Steam пополнение`,
          image: '/steam-icon.png'
        }} 
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-12 animate-in fade-in duration-500 px-4 max-w-md mx-auto relative">
      
      {/* ПЛАШКА С ФОТО (Bottom Sheet) */}
      {showLoginPhoto && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] animate-in fade-in duration-300"
          onClick={() => setShowLoginPhoto(false)}
        />
      )}
      <div 
        className={`fixed bottom-0 left-0 right-0 z-[101] bg-[#1c1c21] border-t border-white/10 rounded-t-[32px] transition-transform duration-300 ease-out shadow-2xl ${
          showLoginPhoto ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="p-4 flex flex-col items-center">
          {/* Полоска сверху для красоты */}
          <div className="w-12 h-1.5 bg-white/10 rounded-full mb-4" />
          
          <div className="relative w-full">
            <button 
              onClick={() => setShowLoginPhoto(false)}
              className="absolute -top-2 -right-2 p-2 bg-white/10 rounded-full text-white z-10 active:scale-90"
            >
              <X size={20} />
            </button>
            
            {/* ТВОЁ ФОТО */}
            <div className="rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
              <img src="/steam-i.png" alt="Инструкция" className="w-full h-auto block" />
            </div>
          </div>
          
          <button 
            onClick={() => setShowLoginPhoto(false)}
            className="w-full py-4 text-white/40 font-bold text-sm mt-2 uppercase tracking-widest"
          >
            Закрыть
          </button>
        </div>
      </div>

      {/* Шапка */}
      <div className="flex items-center gap-4 py-2">
        <button onClick={onBack} className="p-2 bg-white/5 rounded-xl active:scale-90 transition-all">
          <ChevronLeft size={20} className="text-gray-400" />
        </button>
        <h1 className="text-xl font-bold text-white uppercase italic tracking-tight">Steam</h1>
      </div>

      {/* 01 - ЛОГИН */}
      <div className="relative">
        <span className="absolute -top-2 -left-1 text-2xl font-black text-white/5 italic">01</span>
        <div className="bg-[#242429] border border-white/5 rounded-[28px] p-5 space-y-4 shadow-xl">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-white/90">Пополнение РФ/СНГ</h2>
            <button 
              onClick={() => setShowLoginPhoto(true)}
              className="flex items-center gap-1 text-[#7c7cf5] font-bold text-xs active:scale-95"
            >
              Где логин? <HelpCircle size={14} />
            </button>
          </div>

          <input 
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            placeholder="Введите логин Steam"
            className="w-full bg-[#1c1c21] border border-white/10 rounded-xl py-4 px-5 text-white outline-none focus:border-[#7c7cf5]/50 transition-all"
          />

          <p className="text-gray-500 text-[10px] leading-tight px-1">
            RU, BY, UA, AM, AZ, GE, KZ, KG, MD, TJ, TM, UZ
          </p>
        </div>
      </div>

      {/* 02 - СУММА */}
      <div className="relative">
        <span className="absolute -top-2 -left-1 text-2xl font-black text-white/5 italic">02</span>
        <div className="bg-[#242429] border border-white/5 rounded-[28px] p-5 space-y-4 shadow-xl">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-white/90 uppercase">
              {mode === 'receive' ? 'Сколько придет' : 'На сколько пополнить'}
            </h2>
            <button 
                onClick={() => setMode(m => m === 'receive' ? 'pay' : 'receive')}
                className="p-1.5 bg-white/5 rounded-lg active:scale-75 transition-all"
            >
                <ArrowLeftRight size={16} className="text-[#7c7cf5]" />
            </button>
          </div>

          <input 
            type="number"
            min="0"
            value={amount}
            onKeyDown={(e) => ["-", "e", "E"].includes(e.key) && e.preventDefault()}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="w-full bg-[#1c1c21] border border-white/10 rounded-xl py-4 px-5 text-white text-lg font-bold outline-none focus:border-[#7c7cf5]/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />

          {amount && (
            <div className="bg-white/[0.03] rounded-xl p-3 flex justify-between items-center border border-white/5">
              <span className="text-[10px] font-bold text-gray-500 uppercase">Расчет:</span>
              <span className="text-xs font-black text-[#7c7cf5]">
                {mode === 'receive' 
                    ? `К оплате: ~${calculateFinalPriceRub()} ₽` 
                    : `Придет: ~$${calculateUsdForApi()}`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ПРАВИЛА */}
      <div className="space-y-4 px-1 mt-2">
        <div className="flex items-center gap-2 text-white font-bold text-xs uppercase tracking-widest opacity-60">
          <Info size={16} className="text-[#4e4ef2]" />
          <span>Важные правила</span>
        </div>

        <div className="space-y-2.5">
          {[
            { id: 1, text: 'Нужно ввести логин аккаунта, если Вы введете его неправильно, то средства могут быть утеряны' },
            { id: 2, text: 'Никнейм не всегда совпадает с логином, нужно ввести именно логин.' },
            { id: 3, text: 'После успешной оплаты средства поступят до 10 минут, если они не пришли, то обратитесь в поддержку.' },
          ].map(rule => (
            <div key={rule.id} className="flex gap-4 items-start">
              <div className="w-7 h-7 shrink-0 bg-[#4e4ef2]/20 border border-[#4e4ef2]/40 rounded-lg flex items-center justify-center text-[#9c9cf5] font-black text-xs">
                {rule.id}
              </div>
              <p className="text-gray-200 text-[12px] leading-snug pt-0.5">{rule.text}</p>
            </div>
          ))}
        </div>
      </div>

      <button 
        disabled={!login || !amount || parseFloat(amount) <= 0}
        onClick={() => setShowCheckout(true)}
        className="w-full bg-[#4e4ef2] hover:bg-[#5a5af5] disabled:opacity-30 py-5 rounded-2xl text-white font-black text-lg uppercase transition-all shadow-lg shadow-[#4e4ef2]/20 mt-2 active:scale-[0.98]"
      >
        Пополнить
      </button>
    </div>
  );
};

export default Steam;