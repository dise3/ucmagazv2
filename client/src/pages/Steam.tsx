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
  const [showCheckout, setShowCheckout] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  const VITE_API_NGROK = import.meta.env.VITE_API_NGROK;

  useEffect(() => {
    fetch(`${VITE_API_NGROK}/api/settings`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
    }).then(res => res.json()).then(setSettings);
  }, []);

  // Расчет логики цен
  const usdRate = settings?.usd_rate_store || settings?.usd_rate || 95;
  const steamMarkup = 0.15; // 15% наценка

  // Функция перевода из RUB в USD (то, что получит юзер)
  const getUsdFromRub = (rub: string) => {
    const val = parseFloat(rub) || 0;
    const cleanBase = val / (1 + steamMarkup); // Убираем наценку магазина
    return (cleanBase / usdRate).toFixed(2);
  };

  // Функция перевода из USD в RUB (то, что юзер заплатит)
  const getRubFromUsd = (usd: string) => {
    const val = parseFloat(usd) || 0;
    const baseRub = val * usdRate;
    return Math.ceil(baseRub * (1 + steamMarkup));
  };

  if (showCheckout) {
    const finalAmountUsd = currency === 'USD' ? parseFloat(amount) : parseFloat(getUsdFromRub(amount));
    return (
      <Checkout 
        onBack={() => setShowCheckout(false)} 
        pack={{
          type: 'steam_topup',
          amount: finalAmountUsd, // Отправляем чистые USD для API
          uid: login,
          title: `Steam пополнение`,
          image: '/steam-icon.png'
        }} 
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-20 animate-in fade-in duration-500 px-4">
      {/* Шапка */}
      <div className="flex items-center gap-4 py-2">
        <button onClick={onBack} className="p-2 bg-white/5 rounded-xl active:scale-90 transition-all">
          <ChevronLeft size={24} className="text-gray-400" />
        </button>
      </div>

      {/* БЛОК 01 - ЛОГИН */}
      <div className="relative">
        <span className="absolute -top-3 -left-2 text-[40px] font-black text-white/5 italic z-0">01</span>
        <div className="bg-[#242429] border border-white/5 rounded-[30px] p-6 space-y-4 relative z-10 shadow-xl">
          <div className="flex justify-between items-start">
            <h2 className="text-lg font-bold text-white leading-tight">Пополнение РФ/СНГ<br/>региона</h2>
            <button className="flex items-center gap-1 text-[#7c7cf5] font-bold text-sm">
              Где логин? <HelpCircle size={18} />
            </button>
          </div>

          <input 
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            placeholder="Введите логин Steam"
            className="w-full bg-[#1c1c21] border border-white/10 rounded-2xl py-5 px-6 text-white text-lg outline-none focus:border-[#7c7cf5]/50 transition-all"
          />

          <div className="space-y-1">
            <p className="text-gray-400 text-sm font-medium">Страны доступные для пополнения:</p>
            <p className="text-gray-500 text-xs leading-relaxed">
              Russia, Belarus, Ukraine, Armenia, Azerbaijan, Georgia, Kazakhstan, Kyrgyzstan, Moldova, Tajikistan, Turkmenistan and Uzbekistan
            </p>
          </div>
        </div>
      </div>

      {/* БЛОК 02 - СУММА */}
      <div className="relative">
        <span className="absolute -top-3 -left-2 text-[40px] font-black text-white/5 italic z-0">02</span>
        <div className="bg-[#242429] border border-white/5 rounded-[30px] p-6 space-y-4 relative z-10 shadow-xl">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-white">Сколько должно прийти</h2>
            <ArrowLeftRight size={20} className="text-gray-500" />
          </div>

          <div className="relative flex items-center">
            <input 
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Сумма"
              className="w-full bg-[#1c1c21] border border-white/10 rounded-2xl py-5 px-6 text-white text-lg outline-none"
            />
            <div className="absolute right-2 flex bg-[#2a2a32] rounded-xl p-1">
              <button 
                onClick={() => setCurrency('RUB')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${currency === 'RUB' ? 'bg-[#4e4ef2] text-white' : 'text-gray-400'}`}
              >РУБ</button>
              <button 
                onClick={() => setCurrency('USD')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${currency === 'USD' ? 'bg-[#4e4ef2] text-white' : 'text-gray-400'}`}
              >USD</button>
            </div>
          </div>

          <p className="text-gray-500 text-[11px] text-center">
            Нажмите на стрелочку, чтобы изменить способ пополнения
          </p>
        </div>
      </div>

      {/* ПРАВИЛА */}
      <div className="space-y-4 px-2">
        <div className="flex items-center gap-2 text-white font-bold">
          <Info size={20} className="text-white" />
          <span>Важные правила:</span>
        </div>

        <div className="space-y-3">
          {[
            { id: 1, text: 'Нужно ввести логин аккаунта, если Вы введете его неправильно, то средства могут быть утеряны' },
            { id: 2, text: 'Никнейм не всегда совпадает с логином, нужно ввести именно логин.' },
            { id: 3, text: 'После успешной оплаты средства поступят до 10 минут, если они не пришли, то обратитесь в поддержку.' },
          ].map(rule => (
            <div key={rule.id} className="flex gap-4 items-start">
              <div className="w-8 h-8 shrink-0 bg-[#4e4ef2]/20 border border-[#4e4ef2]/40 rounded-lg flex items-center justify-center text-[#7c7cf5] font-black text-sm">
                {rule.id}
              </div>
              <p className="text-gray-300 text-sm leading-snug pt-1">{rule.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* КНОПКА К ОПЛАТЕ */}
      <button 
        disabled={!login || !amount || parseFloat(amount) <= 0}
        onClick={() => setShowCheckout(true)}
        className="w-full bg-[#4e4ef2] hover:bg-[#5a5af5] disabled:opacity-30 py-6 rounded-[24px] text-white font-black text-xl uppercase transition-all shadow-lg shadow-[#4e4ef2]/20 mt-4"
      >
        Пополнить
      </button>
    </div>
  );
};

export default Steam;