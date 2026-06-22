import React, { useState, useEffect } from 'react';
import { ChevronLeft, HelpCircle, CheckCircle2, X, Loader2, Home } from 'lucide-react';

const PaymentStatusOverlay: React.FC<{ orderId: string; onClose: () => void; apiBase: string; type?: string }> = ({ orderId, onClose, apiBase, type }) => {
  const [status, setStatus] = useState<'pending' | 'paid'>('pending');

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${apiBase}/api/check-status/${orderId}`, {
          headers: { 
            'ngrok-skip-browser-warning': 'true',
            'tuna-skip-browser-warning': 'true'
          }
        });
        const data = await res.json();
        if (data.status === 'paid' || data.status === 'completed') {
          setStatus('paid');
          clearInterval(interval);
          if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
          }
        }
      } catch (e) {
        console.error("Status check error:", e);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [orderId, apiBase]);

  const getSuccessMessage = () => {
    if (type === 'steam_topup') return 'Средства будут зачислены на ваш баланс Steam в течение 5-15 минут.';
    if (type === 'ps_gift') return 'Код активации придет в чат-бот в ближайшее время.';
    return 'Ваш заказ будет выполнен в течение 5-15 минут.';
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[200] flex flex-col items-center justify-center px-6 text-center animate-in fade-in duration-500">
      <div className="w-full max-w-xs space-y-8">
        {status === 'pending' ? (
          <>
            <div className="relative">
              <div className="absolute inset-0 bg-amber-500/20 blur-3xl rounded-full" />
              <Loader2 className="w-20 h-20 text-amber-500 animate-spin mx-auto relative z-10" strokeWidth={3} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white uppercase italic tracking-tight">Ожидаем оплату</h2>
              <p className="text-white/50 font-medium text-sm leading-relaxed">
                Пожалуйста, завершите платеж в открывшемся окне. Статус обновится автоматически.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="relative">
              <div className="absolute inset-0 bg-green-500/20 blur-3xl rounded-full" />
              <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto relative z-10 animate-bounce" strokeWidth={3} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white uppercase italic tracking-tight">Успешно!</h2>
              <p className="text-white/50 font-medium text-sm leading-relaxed">
                {getSuccessMessage()}
              </p>
            </div>
          </>
        )}
        
        <button 
          onClick={onClose}
          className="w-full bg-white/10 hover:bg-white/20 py-5 rounded-2xl text-white font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 border border-white/10"
        >
          <Home size={20} />
          <span>На главную</span>
        </button>
      </div>
    </div>
  );
};

interface CheckoutProps {
  pack: { 
    amount?: number; 
    price?: number; 
    basePrice?: number;
    type?: 'pp' | 'tickets' | 'skin' | 'prime' | 'prime_plus' | 'login' | 'steam_topup' | 'ps_gift';
    image?: string; 
    is_code?: boolean; 
    is_skin?: boolean;
    is_prime?: boolean;
    items?: Array<{ id: number; amount: number; price: number; quantity: number }>;
    title?: string;
    months?: number;
    uid?: string; // Для передачи логина из предыдущих окон
  };
  onBack: () => void;
}

const Checkout: React.FC<CheckoutProps> = ({ pack, onBack }) => {
  const [paymentMethod, setPaymentMethod] = useState<'sbp' | 'card'>('sbp');
  const [uid, setUid] = useState(pack.uid || '');
  const [accountLogin, setAccountLogin] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [gameNickname, setGameNickname] = useState('');
  const [username, setUsername] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [showUsernameHelp, setShowUsernameHelp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [settings, setSettings] = useState<any>(null);
  
  const isTelegramApp = !!(window as any).Telegram?.WebApp && 
                        !!(window as any).Telegram?.WebApp?.initDataUnsafe?.user;

  const VITE_API_NGROK = import.meta.env.VITE_API_NGROK;
  const isMultiCode = pack.items && pack.items.length > 0;
  const items = pack.items || [];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const settingsRes = await fetch(`${VITE_API_NGROK}/api/settings`, {
          headers: { 'ngrok-skip-browser-warning': 'true' }
        });
        setSettings(await settingsRes.json());
      } catch (e) {
        console.error("Settings load error:", e);
      }
    };
    fetchData(); // Загружаем настройки всегда для получения курса валют и наценок
  }, [VITE_API_NGROK]);

  const COMMISSION_SBP = 0.0485;
  const COMMISSION_CARD = 0.071;

  const calculatePriceWithCommission = (basePrice: number, method: 'sbp' | 'card'): number => {
    const commission = method === 'sbp' ? COMMISSION_SBP : COMMISSION_CARD;
    return Math.ceil(basePrice * (1 + commission));
  };

  const getBasePrice = (priceSbp: number): number => {
    return priceSbp / (1 + COMMISSION_SBP);
  };

  const getPriceForMethod = (originalPrice: number, method: 'sbp' | 'card'): number => {
    const basePrice = getBasePrice(originalPrice);
    return calculatePriceWithCommission(basePrice, method);
  };

  const getTotalPrice = (): number => {
    if (!settings) return 0;

    if (pack.type === 'steam_topup') {
      const rate = settings.usd_rate_store || settings.usd_rate || 95;
      const steamFee = settings.steam_fee_percent || 0.15; // 15% наценка по умолчанию
      const baseRub = (pack.amount || 0) * rate;
      const withMarkup = Math.ceil(baseRub * (1 + steamFee));
      return calculatePriceWithCommission(withMarkup, paymentMethod);
    }

    if (pack.type === 'ps_gift') {
      // Для PS цена уже передана фиксированная в рублях (без учета комиссии платежки)
      return calculatePriceWithCommission(pack.price || 0, paymentMethod);
    }

    if (pack.type === 'pp') {
      const base = (settings.pp_price_usd * ((pack.amount || 0) / 10000)) * settings.usd_rate + (settings.pp_markup_rub || 0);
      return calculatePriceWithCommission(Math.ceil(base * (1 + settings.fee_percent)), paymentMethod);
    } 
    
    if (pack.type === 'tickets') {
      const base = (settings.ticket_price_usd * ((pack.amount || 0) / 100)) * settings.usd_rate + (settings.ticket_markup_rub || 0);
      return calculatePriceWithCommission(Math.ceil(base * (1 + settings.fee_percent)), paymentMethod);
    } 
    
    if (pack.type === 'prime' || pack.type === 'prime_plus') {
      return calculatePriceWithCommission(pack.price || 0, paymentMethod);
    } 
    
    if (pack.type === 'skin') {
      return pack.price || 0; 
    } 
    
    if (isMultiCode) {
      return items.reduce((sum: number, item: any) => sum + (getPriceForMethod(item.price, paymentMethod) * item.quantity), 0);
    } 
    
    if (pack.type === 'login') {
      return calculatePriceWithCommission(pack.basePrice || pack.price || 0, paymentMethod);
    }

    // Стандартный UC
    return calculatePriceWithCommission((pack.price || 0) * (1 + (settings?.fee_percent || 0)), paymentMethod);
  };

  const triggerHapticFeedback = (style: 'light' | 'medium' | 'heavy' | 'success' | 'error' = 'medium') => {
    const tg = (window as any).Telegram?.WebApp?.HapticFeedback;
    if (tg) {
      style === 'success' || style === 'error' ? tg.notificationOccurred(style) : tg.impactOccurred(style);
    }
  };

  const handlePayment = async () => {
    setIsLoading(true);
    setError('');
    
    if (pack.type === 'login') {
      if (!accountLogin.trim() || !accountPassword.trim() || !gameNickname.trim()) {
        setError('Заполните логин, пароль и игровой никнейм');
        setIsLoading(false); return;
      }
    } else if (!pack.is_code && !uid.trim()) {
      setError(pack.type === 'steam_topup' ? 'Введите логин Steam' : 'Введите UID');
      setIsLoading(false); return;
    }
    
    const tg = (window as any).Telegram?.WebApp;
    const tgUser = tg?.initDataUnsafe?.user;

    const totalPrice = getTotalPrice();

    try {
      const response = await fetch(`${VITE_API_NGROK}/api/create-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: uid.trim(),
          amount: pack.amount || 0, // Для PS тут будет Service ID, для Steam - кол-во USD
          price: totalPrice,
          method_slug: paymentMethod,
          user_chat_id: tgUser?.id,
          buyer_first_name: tgUser?.first_name,
          buyer_last_name: tgUser?.last_name,
          is_code: pack.is_code || false,
          type: pack.type || 'uc',
          account_login: accountLogin.trim() || undefined,
          account_password: accountPassword.trim() || undefined,
          game_nickname: gameNickname.trim() || undefined,
          username: !isTelegramApp ? username.trim() : undefined
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Ошибка');

      if (data.url) {
        setActiveOrderId(data.order_id);
        tg?.openLink ? tg.openLink(data.url) : window.location.href = data.url;
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка сети');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 px-4 max-w-md mx-auto relative z-10">
      
      {activeOrderId && (
        <PaymentStatusOverlay 
          orderId={activeOrderId} 
          apiBase={VITE_API_NGROK} 
          type={pack.type}
          onClose={() => { setActiveOrderId(null); onBack(); }}
        />
      )}

      {/* Модалка помощи по UID */}
      <div className={`fixed bottom-0 left-0 right-0 z-[101] bg-[#1c1c1e] border-t border-white/10 rounded-t-[40px] transition-transform duration-500 ${showHelp ? 'translate-y-0' : 'translate-y-full'}`} style={{ height: '72%' }}>
        <div className="px-6 flex justify-between items-center mt-8 mb-6">
          <h2 className="text-xl font-black text-white uppercase italic">Помощь</h2>
          <button onClick={() => setShowHelp(false)} className="p-3 bg-white/5 rounded-full text-white/50"><X size={24} /></button>
        </div>
        <div className="px-6 pb-10 flex flex-col items-center justify-center text-white/70 text-center">
            <p className="mb-4">Для Steam используйте Логин (имя аккаунта), который вы вводите при входе.</p>
            <img src="/steam-help.jpg" className="rounded-2xl border border-white/10" alt="Steam Help" />
        </div>
      </div>

      <div className="flex items-center gap-4 pt-6">
        <button onClick={() => { triggerHapticFeedback('light'); onBack(); }} className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/30">
          <ChevronLeft size={20} className="text-white" strokeWidth={3} />
        </button>
        <h1 className="text-2xl font-black text-white uppercase italic">Оплата</h1>
      </div>

      {/* Карточка товара */}
      <div className="bg-black/50 backdrop-blur-xl rounded-[32px] p-6 border border-amber-500/40 relative overflow-hidden">
        <div className="flex items-center gap-5 relative z-10">
          <img src={pack.image || '/pp.png'} className="w-16 h-16 rounded-[20px] object-cover border-2 border-white/30" alt="Pack" />
          <div className="flex flex-col gap-1">
            <span className="text-xl font-black italic text-white tracking-tighter uppercase">
              {pack.title || `${pack.amount} UC`}
            </span>
            <span className="text-amber-400 font-black">{getTotalPrice().toLocaleString()} ₽</span>
          </div>
        </div>
      </div>

      {/* Поля ввода данных */}
      <div className="space-y-4">
        {pack.type === 'login' ? (
           <>
             {/* Поля для входа в PUBG */}
             <div className="space-y-2">
               <label className="text-[12px] font-black text-white uppercase px-1">Логин</label>
               <input value={accountLogin} onChange={(e) => setAccountLogin(e.target.value)} className="w-full bg-white/15 border-2 border-white/20 rounded-2xl py-4 px-6 text-white outline-none focus:border-amber-500/60" />
             </div>
             <div className="space-y-2">
               <label className="text-[12px] font-black text-white uppercase px-1">Пароль</label>
               <input type="password" value={accountPassword} onChange={(e) => setAccountPassword(e.target.value)} className="w-full bg-white/15 border-2 border-white/20 rounded-2xl py-4 px-6 text-white outline-none focus:border-amber-500/60" />
             </div>
             <div className="space-y-2">
               <label className="text-[12px] font-black text-white uppercase px-1">Никнейм</label>
               <input value={gameNickname} onChange={(e) => setGameNickname(e.target.value)} className="w-full bg-white/15 border-2 border-white/20 rounded-2xl py-4 px-6 text-white outline-none focus:border-amber-500/60" />
             </div>
           </>
        ) : !pack.is_code && (
          <div className="space-y-3">
            <div className="flex justify-between items-end px-1">
              <label className="text-[12px] font-black text-white uppercase tracking-widest">
                {pack.type === 'steam_topup' ? 'Логин Steam' : 'Игровой UID'}
              </label>
              {pack.type !== 'steam_topup' && (
                <button onClick={() => setShowHelp(true)} className="flex items-center gap-1.5 text-[11px] text-amber-400 font-bold uppercase">
                  Где найти? <HelpCircle size={14} />
                </button>
              )}
            </div>
            <input 
              value={uid} onChange={(e) => setUid(e.target.value)}
              placeholder={pack.type === 'steam_topup' ? "Введите имя аккаунта" : "Введите ID игрока"}
              className="w-full bg-white/15 border-2 border-white/20 rounded-2xl py-4 px-6 text-white font-black text-lg outline-none focus:border-amber-500/60" 
            />
          </div>
        )}

        {!isTelegramApp && (
          <div className="space-y-2">
            <label className="text-[12px] font-black text-white uppercase px-1">Тэг Telegram для связи</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="@username" className="w-full bg-white/15 border-2 border-white/20 rounded-2xl py-4 px-6 text-white outline-none" />
          </div>
        )}
      </div>

      {/* Выбор метода оплаты */}
      <div className="grid grid-cols-2 gap-4">
        {[{ id: 'sbp' as const, img: '/sbp.jpg' }, { id: 'card' as const, img: '/card.jpg' }].map((m) => (
          <button 
            key={m.id} onClick={() => { triggerHapticFeedback('light'); setPaymentMethod(m.id); }} 
            className={`h-24 rounded-3xl border-4 transition-all flex items-center justify-center relative ${paymentMethod === m.id ? 'bg-amber-500/20 border-amber-500 shadow-lg' : 'bg-white/5 border-white/10'}`}
          >
            <img src={m.img} className="h-10 object-contain" alt={m.id} />
            {paymentMethod === m.id && <div className="absolute top-2 right-2 bg-amber-500 rounded-full p-0.5"><CheckCircle2 size={16} className="text-black" /></div>}
          </button>
        ))}
      </div>

      {error && <div className="bg-red-500/20 border-2 border-red-500/50 rounded-2xl p-4 text-red-300 font-bold text-center text-sm">{error}</div>}

      <div className="mt-auto pt-4">
        <div className="flex justify-between items-center mb-6 px-2">
            <span className="text-xl font-black text-white uppercase italic">Итого:</span>
            <span className="text-3xl font-black text-amber-400">{getTotalPrice().toFixed(2)} ₽</span>
        </div>
        
        <button 
          onClick={() => { triggerHapticFeedback('heavy'); handlePayment(); }} 
          disabled={isLoading || (!pack.is_code && !uid.trim())}
          className="w-full bg-amber-500 hover:bg-amber-400 py-6 rounded-2xl font-black text-black text-xl uppercase transition-all disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="animate-spin mx-auto" /> : 'Оплатить'}
        </button>
      </div>
    </div>
  );
};

export default Checkout;