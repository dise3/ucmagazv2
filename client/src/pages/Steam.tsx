import React, { useState, useEffect } from 'react';
import { ChevronLeft, HelpCircle, ArrowLeftRight, Info } from 'lucide-react';
import Checkout from './Checkout';

interface SteamProps {
  onBack: () => void;
}

const Steam: React.FC<SteamProps> = ({ onBack }) => {
  const [login, setLogin] = useState('');
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<'receive' | 'pay'>('receive'); // receive = сколько придет, pay = на сколько пополнить
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
  const paymentCommision = 1.0485; // 4.85%

  // --- ЛОГИКА РАСЧЕТОВ (Все в RUB) ---

  const calculateFinalPriceRub = () => {
    const val = parseFloat(amount) || 0;
    if (mode === 'pay') {
        return Math.ceil(val); // Юзер ввел сколько хочет потратить
    } else {
        // Юзер ввел сколько хочет получить в рублях на баланс
        // Прибавляем наценку магазина и комиссию платежки
        return Math.ceil(val * (1 + steamMarkup) * paymentCommision + 1);
    }
  };

  const calculateUsdForApi = () => {
    const val = parseFloat(amount) || 0;
    if (mode === 'pay') {
        // Высчитываем сколько чистых USD выйдет из суммы оплаты
        return (val / paymentCommision / (1 + steamMarkup) / usdRate).toFixed(2);
    } else {
        // Переводим желаемую сумму в рублях в USD для API
        return (val / usdRate).toFixed(2);
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
    <div className="flex flex-col gap-5 pb-12 animate-in fade-in duration-500 px-4 max-w-md mx-auto">
      {/* Шапка */}
      <div className="flex items-center gap-4 py-2">
        <button onClick={onBack} className="p-2 bg-white/5 rounded-xl active:scale-90 transition-all">
          <ChevronLeft size={20} className="text-gray-400" />
        </button>
        <h1 className="text-xl font-bold text-white uppercase italic tracking-tight">Steam</h1>
      </div>

      {/* БЛОК 01 - ЛОГИН */}
      <div className="relative">
        <span className="absolute -top-2 -left-1 text-2xl font-black text-white/5 italic">01</span>
        <div className="bg-[#242429] border border-white/5 rounded-[28px] p-5 space-y-4 shadow-xl">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-white">Пополнение РФ/СНГ региона</h2>
            <button className="flex items-center gap-1 text-[#7c7cf5] font-bold text-xs">
              Где логин? <HelpCircle size={14} />
            </button>
          </div>

          <input 
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            placeholder="Введите логин Steam"
            className="w-full bg-[#1c1c21] border border-white/10 rounded-xl py-4 px-5 text-white outline-none focus:border-[#7c7cf5]/50 transition-all"
          />

          <div className="space-y-1 px-1">
            <p className="text-gray-400 text-[11px] font-medium">Страны доступные для пополнения:</p>
            <p className="text-gray-500 text-[10px] leading-relaxed">
              Russia, Belarus, Ukraine, Armenia, Azerbaijan, Georgia, Kazakhstan, Kyrgyzstan, Moldova, Tajikistan, Turkmenistan and Uzbekistan
            </p>
          </div>
        </div>
      </div>

      {/* БЛОК 02 - СУММА */}
      <div className="relative">
        <span className="absolute -top-2 -left-1 text-2xl font-black text-white/5 italic">02</span>
        <div className="bg-[#242429] border border-white/5 rounded-[28px] p-5 space-y-4 shadow-xl">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-white">
              {mode === 'receive' ? 'Сколько должно прийти (РУБ)' : 'На сколько пополнить (РУБ)'}
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
              <span className="text-[10px] font-bold text-gray-500 uppercase">Результат:</span>
              <span className="text-xs font-black text-[#7c7cf5]">
                {mode === 'receive' 
                    ? `К оплате: ~${calculateFinalPriceRub()} ₽` 
                    : `Придет на баланс: ~$${calculateUsdForApi()}`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ПРАВИЛА (Полные и светлые) */}
      <div className="space-y-4 px-1 mt-2">
        <div className="flex items-center gap-2 text-white font-bold text-sm">
          <Info size={18} className="text-[#4e4ef2]" />
          <span>Важные правила:</span>
        </div>

        <div className="space-y-3">
          {[
            { id: 1, text: 'Нужно ввести логин аккаунта, если Вы введете его неправильно, то средства могут быть утеряны' },
            { id: 2, text: 'Никнейм не всегда совпадает с логином, нужно ввести именно логин.' },
            { id: 3, text: 'После успешной оплаты средства поступят до 10 минут, если они не пришли, то обратитесь в поддержку.' },
          ].map(rule => (
            <div key={rule.id} className="flex gap-4 items-start">
              <div className="w-8 h-8 shrink-0 bg-[#4e4ef2]/20 border border-[#4e4ef2]/40 rounded-lg flex items-center justify-center text-[#9c9cf5] font-black text-sm">
                {rule.id}
              </div>
              <p className="text-gray-200 text-[13px] leading-snug pt-0.5">{rule.text}</p>
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