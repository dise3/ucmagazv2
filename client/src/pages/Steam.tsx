import React, { useState, useEffect } from 'react';
import { ChevronLeft, Info, Wallet } from 'lucide-react';
import Checkout from './Checkout'; // Путь к твоему компоненту

interface SteamProps {
  onBack: () => void;
}

const Steam: React.FC<SteamProps> = ({ onBack }) => {
  const [amount, setAmount] = useState<string>('10');
  const [login, setLogin] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  const VITE_API_NGROK = import.meta.env.VITE_API_NGROK;

  useEffect(() => {
    fetch(`${VITE_API_NGROK}/api/settings`).then(res => res.json()).then(setSettings);
  }, []);

  const presets = [5, 10, 20, 50, 100];
  const rate = settings ? (settings.usd_rate_store || settings.usd_rate) : 95;

  if (showCheckout) {
    return (
      <Checkout 
        onBack={() => setShowCheckout(false)} 
        pack={{
          type: 'steam_topup',
          amount: parseFloat(amount),
          uid: login, // Передаем логин как UID
          title: `Steam $${amount}`,
          image: '/steam-icon.png' // Добавь иконку в public
        }} 
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-20">
      {/* Шапка */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-3 bg-white/10 rounded-2xl active:scale-90 transition-all border border-white/10">
          <ChevronLeft size={20} className="text-white" />
        </button>
        <h1 className="text-2xl font-black text-white uppercase italic">Steam Пополнение</h1>
      </div>

      {/* Инфо-блок */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-[24px] p-4 flex gap-3">
        <Info className="text-blue-400 shrink-0" size={20} />
        <p className="text-blue-100/80 text-xs leading-relaxed">
          Пополнение работает для аккаунтов <b>РФ, РБ, Казахстана и СНГ</b>. 
          Средства зачисляются в валюте вашего региона по курсу Steam.
        </p>
      </div>

      {/* Поле логина */}
      <div className="space-y-3">
        <label className="text-[12px] font-black text-white/50 uppercase tracking-widest ml-2">Логин Steam</label>
        <input 
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          placeholder="Введите логин (не никнейм)"
          className="w-full bg-white/5 border-2 border-white/10 rounded-[24px] py-5 px-6 text-white font-bold outline-none focus:border-blue-500/50 transition-all"
        />
      </div>

      {/* Выбор суммы */}
      <div className="space-y-4">
        <label className="text-[12px] font-black text-white/50 uppercase tracking-widest ml-2">Сумма пополнения ($)</label>
        <div className="grid grid-cols-3 gap-2">
          {presets.map(val => (
            <button 
              key={val}
              onClick={() => setAmount(val.toString())}
              className={`py-4 rounded-2xl font-black transition-all border-2 ${
                amount === val.toString() ? 'bg-blue-500 border-blue-400 text-white' : 'bg-white/5 border-white/5 text-white/60'
              }`}
            >
              ${val}
            </button>
          ))}
          <div className="relative col-span-3">
            <input 
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Другая сумма"
              className="w-full bg-white/5 border-2 border-white/10 rounded-2xl py-4 px-6 text-white font-bold outline-none focus:border-blue-500/50"
            />
            <span className="absolute right-6 top-1/2 -translate-y-1/2 text-white/30 font-black">USD</span>
          </div>
        </div>
      </div>

      {/* Итоговый расчет */}
      <div className="bg-black/40 border border-white/10 rounded-[32px] p-6 space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-white/50 font-bold">К зачислению:</span>
          <span className="text-white font-black text-xl">${amount || 0}</span>
        </div>
        <div className="flex justify-between items-center border-t border-white/5 pt-4">
          <span className="text-white/50 font-bold">Примерно в рублях:</span>
          <span className="text-blue-400 font-black text-2xl">
            {Math.ceil(parseFloat(amount || '0') * rate).toLocaleString()} ₽
          </span>
        </div>
      </div>

      {/* Кнопка далее */}
      <button 
        disabled={!login || !amount || parseFloat(amount) <= 0}
        onClick={() => setShowCheckout(true)}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 py-6 rounded-[24px] text-white font-black text-xl uppercase transition-all shadow-lg shadow-blue-900/20"
      >
        Перейти к оплате
      </button>
    </div>
  );
};

export default Steam;