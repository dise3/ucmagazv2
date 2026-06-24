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

  // --- ЛОГИКА РАСЧЕТОВ ---

  // Сколько в итоге спишется с пользователя в рублях (для Checkout)
  const calculateFinalPriceRub = () => {
    const val = parseFloat(amount) || 0;
    if (mode === 'pay') {
        // Если юзер ввел "Я хочу потратить 1000 рублей"
        return currency === 'RUB' ? val : Math.ceil(val * usdRate * (1 + steamMarkup));
    } else {
        // Если юзер ввел "Я хочу чтобы на баланс пришло 1000 рублей/10$"
        const base = currency === 'RUB' ? val : val * usdRate;
        return Math.ceil(base * (1 + steamMarkup));
    }
  };

  // Сколько чистых USD отправить в NS API
  const calculateUsdForApi = () => {
    const val = parseFloat(amount) || 0;
    if (mode === 'pay') {
        // Режим "Трачу": вычитаем наценку и делим на курс
        const payInRub = currency === 'RUB' ? val : val * usdRate * (1 + steamMarkup);
        return (payInRub / (1 + steamMarkup) / usdRate).toFixed(2);
    } else {
        // Режим "Придет": если ввел USD - отправляем как есть, если RUB - переводим в USD
        return currency === 'USD' ? val.toFixed(2) : (val / usdRate).toFixed(2);
    }
  };

  const toggleMode = () => {
    setMode(prev => prev === 'receive' ? 'pay' : 'receive');
    // Опционально: можно сбрасывать сумму при переключении
    // setAmount('');
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
        <div className="bg-[#242429] border border-white/5 rounded-[30px] p-6 space-y-4 relative z-10">
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
            <p className="text-gray-500 text-[11px] leading-relaxed">
              Russia, Belarus, Ukraine, Armenia, Azerbaijan, Georgia, Kazakhstan, Kyrgyzstan, Moldova, Tajikistan, Turkmenistan and Uzbekistan
            </p>
          </div>
        </div>
      </div>

      {/* БЛОК 02 - СУММА */}
      <div className="relative">
        <span className="absolute -top-3 -left-2 text-[40px] font-black text-white/5 italic z-0">02</span>
        <div className="bg-[#242429] border border-white/5 rounded-[30px] p-6 space-y-4 relative z-10">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-white transition-all">
              {mode === 'receive' ? 'Сколько должно прийти' : 'На сколько пополнить'}
            </h2>
            <button 
                onClick={toggleMode}
                className="p-2 hover:bg-white/5 rounded-full active:scale-75 transition-all"
            >
                <ArrowLeftRight size={20} className={mode === 'pay' ? 'text-[#7c7cf5]' : 'text-gray-500'} />
            </button>
          </div>

          <div className="flex flex-col items-center gap-1">
            <p className="text-gray-500 text-[11px]">
                {mode === 'receive' 
                    ? 'Укажите сумму, которую хотите получить на баланс' 
                    : 'Укажите сумму, которую готовы оплатить'}
            </p>
            {amount && (
                <div className="text-[13px] font-bold text-[#7c7cf5] animate-in fade-in zoom-in duration-300">
                    {mode === 'receive' 
                        ? `К оплате: ~${calculateFinalPriceRub()} ₽` 
                        : `Придет на Steam: ~$${calculateUsdForApi()}`}
                </div>
            )}
          </div>
        </div>
      </div>

      {/* ПРАВИЛА */}
      <div className="space-y-4 px-2">
        <div className="flex items-center gap-2 text-white font-bold">
          <Info size={20} className="text-blue-400" />
          <span>Важные правила:</span>
        </div>
        <div className="space-y-3">
          {[
            { id: 1, text: 'Нужно ввести логин аккаунта, если Вы введете его неправильно, то средства могут быть утеряны' },
            { id: 2, text: 'Никнейм не всегда совпадает с логином, нужно ввести именно логин.' },
            { id: 3, text: 'После успешной оплаты средства поступят до 10 минут, если они не пришли, то обратитесь в поддержку.' },
          ].map(rule => (
            <div key={rule.id} className="flex gap-4 items-start bg-white/5 p-3 rounded-2xl border border-white/5">
              <div className="w-8 h-8 shrink-0 bg-[#4e4ef2]/20 border border-[#4e4ef2]/40 rounded-lg flex items-center justify-center text-[#7c7cf5] font-black text-sm">
                {rule.id}
              </div>
              <p className="text-gray-300 text-xs leading-snug pt-1">{rule.text}</p>
            </div>
          ))}
        </div>
      </div>

      <button 
        disabled={!login || !amount || parseFloat(amount) <= 0}
        onClick={() => setShowCheckout(true)}
        className="w-full bg-[#4e4ef2] hover:bg-[#5a5af5] disabled:opacity-30 py-6 rounded-[24px] text-white font-black text-xl uppercase transition-all shadow-lg shadow-[#4e4ef2]/20 mt-4 active:scale-[0.98]"
      >
        Пополнить
      </button>
    </div>
  );
};

export default Steam;