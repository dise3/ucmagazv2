import React, { useState, useEffect } from 'react';
import { ChevronLeft, HelpCircle, ArrowLeftRight, Info } from 'lucide-react';
import Checkout from './Checkout';

interface SteamProps {
  onBack: () => void;
}

const Steam: React.FC<SteamProps> = ({ onBack }) => {
  const [login, setLogin] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'RUB' | 'USD'>('RUB');
  const [mode, setMode] = useState<'receive' | 'pay'>('receive');
  const [showCheckout, setShowCheckout] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  const VITE_API_NGROK = import.meta.env.VITE_API_NGROK;

  useEffect(() => {
    fetch(`${VITE_API_NGROK}/api/settings`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
    }).then(res => res.json()).then(setSettings);
  }, []);

  const usdRate = settings?.usd_rate_store || settings?.usd_rate || 95;
  const steamMarkup = settings?.steam_fee_percent ?? 0.15;

  const calculateFinalPriceRub = () => {
    const val = parseFloat(amount) || 0;
    if (mode === 'pay') {
      return currency === 'RUB' ? val : Math.ceil(val * usdRate * (1 + steamMarkup) * 1.0485);
    } else {
      const base = currency === 'RUB' ? val : val * usdRate;
      return Math.ceil(base * (1 + steamMarkup) * 1.0485 + 1);
    }
  };

  const calculateUsdForApi = () => {
    const val = parseFloat(amount) || 0;
    if (mode === 'pay') {
      const payInRub = currency === 'RUB' ? val : val * usdRate * (1 + steamMarkup) * 1.0485;
      return (payInRub / 1.0485 / (1 + steamMarkup) / usdRate).toFixed(2);
    } else {
      return currency === 'USD' ? val.toFixed(2) : (val / usdRate).toFixed(2);
    }
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
    <div className="flex flex-col gap-4 pb-12 animate-in fade-in duration-500 px-4 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 py-2">
        <button onClick={onBack} className="p-2 bg-white/5 rounded-xl active:scale-90 transition-all">
          <ChevronLeft size={20} className="text-gray-400" />
        </button>
        <h1 className="text-xl font-bold text-white uppercase italic tracking-tight">Steam</h1>
      </div>

      {/* Step 01 - Login */}
      <div className="relative group">
        <span className="absolute -top-2 -left-1 text-2xl font-black text-white/5 italic">01</span>
        <div className="bg-[#242429] border border-white/5 rounded-[28px] p-5 space-y-3 shadow-xl">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-sm font-bold text-white/90">Пополнение РФ/СНГ</h2>
            <button className="flex items-center gap-1 text-[#7c7cf5] font-bold text-xs hover:opacity-80">
              Где логин? <HelpCircle size={14} />
            </button>
          </div>

          <input 
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            placeholder="Введите логин Steam"
            className="w-full bg-[#1c1c21] border border-white/10 rounded-xl py-4 px-5 text-white text-base outline-none focus:border-[#7c7cf5]/50 transition-all"
          />

          <p className="text-gray-500 text-[10px] leading-tight px-1 uppercase tracking-tighter">
            RU, BY, UA, AM, AZ, GE, KZ, KG, MD, TJ, TM, UZ
          </p>
        </div>
      </div>

      {/* Step 02 - Amount */}
      <div className="relative group">
        <span className="absolute -top-2 -left-1 text-2xl font-black text-white/5 italic">02</span>
        <div className="bg-[#242429] border border-white/5 rounded-[28px] p-5 space-y-4 shadow-xl">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-sm font-bold text-white/90">
              {mode === 'receive' ? 'Сколько придет' : 'На сколько пополнить'}
            </h2>
            <button 
                onClick={() => setMode(m => m === 'receive' ? 'pay' : 'receive')}
                className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg active:scale-75 transition-all"
            >
                <ArrowLeftRight size={16} className={mode === 'pay' ? 'text-[#7c7cf5]' : 'text-gray-400'} />
            </button>
          </div>

          <div className="relative flex items-center">
            <input 
              type="number"
              min="0"
              value={amount}
              onKeyDown={(e) => ["-", "e", "E"].includes(e.key) && e.preventDefault()}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-[#1c1c21] border border-white/10 rounded-xl py-4 pl-5 pr-24 text-white text-lg font-bold outline-none focus:border-[#7c7cf5]/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <div className="absolute right-2 flex bg-[#2a2a32] rounded-lg p-0.5 border border-white/5">
              {(['RUB', 'USD'] as const).map(curr => (
                <button 
                  key={curr}
                  onClick={() => setCurrency(curr)}
                  className={`px-3 py-1.5 rounded-md text-[10px] font-black transition-all ${currency === curr ? 'bg-[#4e4ef2] text-white shadow-md' : 'text-gray-500'}`}
                >{curr}</button>
              ))}
            </div>
          </div>

          {amount && (
            <div className="bg-[#1c1c21]/50 rounded-xl p-3 flex justify-between items-center border border-white/5 animate-in fade-in slide-in-from-top-1">
              <span className="text-[10px] font-bold text-gray-500 uppercase">Итоговый расчет:</span>
              <span className="text-xs font-black text-[#7c7cf5]">
                {mode === 'receive' 
                    ? `К оплате: ${calculateFinalPriceRub()} ₽` 
                    : `Придет: $${calculateUsdForApi()}`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Rules */}
      <div className="space-y-3 px-1">
        <div className="flex items-center gap-2 text-white/50 text-[11px] font-bold uppercase tracking-wider">
          <Info size={14} className="text-[#4e4ef2]" />
          <span>Важные правила:</span>
        </div>
        <div className="grid gap-2">
          {[
            'Вводите логин, а не никнейм (средства уйдут другому)',
            'Пополнение до 10 минут после оплаты',
            'При ошибке — сразу в поддержку',
          ].map((text, i) => (
            <div key={i} className="flex gap-3 items-center bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
              <div className="w-5 h-5 shrink-0 bg-[#4e4ef2]/10 border border-[#4e4ef2]/20 rounded flex items-center justify-center text-[#7c7cf5] font-black text-[10px]">
                {i + 1}
              </div>
              <p className="text-gray-400 text-[10px] leading-tight font-medium">{text}</p>
            </div>
          ))}
        </div>
      </div>

      <button 
        disabled={!login || !amount || parseFloat(amount) <= 0}
        onClick={() => setShowCheckout(true)}
        className="w-full bg-[#4e4ef2] hover:bg-[#5a5af5] disabled:opacity-20 py-5 rounded-2xl text-white font-black text-lg uppercase transition-all shadow-lg shadow-[#4e4ef2]/10 mt-2 active:scale-95"
      >
        Продолжить
      </button>
    </div>
  );
};

export default Steam;