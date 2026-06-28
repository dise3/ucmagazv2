import React, { useState, useEffect } from 'react';
import { ChevronLeft, HelpCircle, CheckCircle2, X, Loader2, Home } from 'lucide-react';

const PaymentStatusOverlay: React.FC<{ orderId: string; onClose: () => void; apiBase: string; type?: string }> = ({ orderId, onClose, apiBase, type }) => {
  const [status, setStatus] = useState<'pending' | 'paid'>('pending');

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${apiBase}/api/check-status/${orderId}`, {
          headers: { 'ngrok-skip-browser-warning': 'true' }
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
              <p className="text-white/50 font-medium text-sm leading-relaxed">{getSuccessMessage()}</p>
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
    image?: string; 
    is_code?: boolean; 
    type?: 'uc' | 'pp' | 'tickets' | 'skin' | 'prime' | 'prime_plus' | 'login' | 'steam_topup' | 'ps_gift';
    title?: string;
    months?: number;
    uid?: string;
    // ДОБАВЛЕНО: типизация для корзины промокодов
    items?: Array<{ id: number; amount: number; price: number; quantity: number }>;
  };
  onBack: () => void;
}

const Checkout: React.FC<CheckoutProps> = ({ pack, onBack }) => {
  const [paymentMethod, setPaymentMethod] = useState<'sbp' | 'card'>('sbp');
  const [uid, setUid] = useState(pack.uid || '');
  const [username, setUsername] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [settings, setSettings] = useState<any>(null);
  
  const tg = (window as any).Telegram?.WebApp;
  const tgUser = tg?.initDataUnsafe?.user;
  const isTelegramApp = !!tgUser;

  const VITE_API_NGROK = import.meta.env.VITE_API_NGROK;
  const isMultiCode = !!(pack.items && pack.items.length > 0);
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
    fetchData();
  }, [VITE_API_NGROK]);

  const COMMISSION_SBP = 0.0485;
  const COMMISSION_CARD = 0.071;

  const calculatePriceWithCommission = (basePrice: number, method: 'sbp' | 'card'): number => {
    const commission = method === 'sbp' ? COMMISSION_SBP : COMMISSION_CARD;
    return Math.ceil(basePrice * (1 + commission));
  };

  const getPriceForMethod = (originalPrice: number, method: 'sbp' | 'card'): number => {
    const basePrice = originalPrice / (1 + COMMISSION_SBP);
    return calculatePriceWithCommission(basePrice, method);
  };

  const getTotalPrice = (): number => {
    if (!settings) return pack.price || 0;

    // 1. Steam
    if (pack.type === 'steam_topup') {
      const rate = settings.usd_rate_store || settings.usd_rate || 95;
      const steamFee = settings.steam_fee_percent ?? 0.15;
      const baseRubWithMarkup = (pack.amount || 0) * rate * (1 + steamFee);
      return calculatePriceWithCommission(baseRubWithMarkup, paymentMethod);
    }

    // 2. PlayStation / Skin / Prime
    if (pack.type === 'ps_gift' || pack.type === 'skin' || pack.type === 'prime' || pack.type === 'prime_plus') {
      const base = (pack.price || 0) / (1 + COMMISSION_SBP);
      return calculatePriceWithCommission(base, paymentMethod);
    }

    // 3. Multi-items (Корзина промокодов)
    if (isMultiCode) {
      const totalOriginal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const base = totalOriginal / (1 + COMMISSION_SBP);
      return calculatePriceWithCommission(base, paymentMethod);
    }

    // 4. PP / Tickets
    if (pack.type === 'pp') {
      const base = (settings.pp_price_usd * ((pack.amount || 0) / 10000)) * settings.usd_rate + (settings.pp_markup_rub || 0);
      return calculatePriceWithCommission(Math.ceil(base * (1 + settings.fee_percent)), paymentMethod);
    } else if (pack.type === 'tickets') {
      const base = (settings.ticket_price_usd * ((pack.amount || 0) / 100)) * settings.usd_rate + (settings.ticket_markup_rub || 0);
      return calculatePriceWithCommission(Math.ceil(base * (1 + settings.fee_percent)), paymentMethod);
    }

    // 5. UC
    return calculatePriceWithCommission((pack.price || 0) * (1 + (settings?.fee_percent || 0)), paymentMethod);
  };

  const handlePayment = async () => {
    const currentUid = uid ? uid.trim() : (pack.uid ? pack.uid.trim() : '');
    
    if (!pack.is_code && !currentUid) {
      setError(pack.type === 'steam_topup' ? 'Введите логин Steam' : 'Введите UID');
      return;
    }

    setIsLoading(true);
    setError('');
    
    const currentUser = tg?.initDataUnsafe?.user || null;
    const user_chat_id = currentUser ? currentUser.id : 0;

    try {
      const totalPrice = getTotalPrice();
      const response = await fetch(`${VITE_API_NGROK}/api/create-payment`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({
          uid: currentUid,
          amount: isMultiCode 
            ? items.reduce((sum, item) => sum + (item.amount * item.quantity), 0)
            : (pack.amount || 0),
          price: totalPrice,
          method_slug: paymentMethod,
          user_chat_id: user_chat_id,
          buyer_first_name: currentUser?.first_name || 'Web',
          buyer_last_name: currentUser?.last_name || 'User',
          is_code: pack.is_code || false,
          type: pack.type || 'uc',
          promo_items: isMultiCode ? items : undefined
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Ошибка при создании заказа');

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

  const triggerHapticFeedback = (style: 'light' | 'medium' | 'heavy' | 'success' | 'error' = 'medium') => {
    if (tg?.HapticFeedback) {
      if (style === 'success' || style === 'error') {
        tg.HapticFeedback.notificationOccurred(style);
      } else {
        tg.HapticFeedback.impactOccurred(style);
      }
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 px-4 max-w-md mx-auto relative z-10 text-white">
      
      {activeOrderId && <PaymentStatusOverlay orderId={activeOrderId} apiBase={VITE_API_NGROK} type={pack.type} onClose={() => { setActiveOrderId(null); onBack(); }} />}

      {/* Bottom Sheet Help */}
      <div className={`fixed bottom-0 left-0 right-0 z-[101] bg-[#1c1c21] border-t border-white/10 rounded-t-[40px] transition-transform duration-500 ${showHelp ? 'translate-y-0' : 'translate-y-full'}`} style={{ height: '70%' }}>
        <div className="px-6 flex justify-between items-center mt-8 mb-6">
          <h2 className="text-xl font-black uppercase italic">Помощь</h2>
          <button onClick={() => setShowHelp(false)} className="p-3 bg-white/5 rounded-full text-white/50 active:scale-90"><X size={24} /></button>
        </div>
        <div className="px-6 flex flex-col items-center text-center text-white/60">
            <p className="mb-6">{pack.type === 'steam_topup' ? 'Нужен Логин аккаунта (Account Name), а не никнейм.' : 'ID можно найти в профиле игры.'}</p>
            <img src={pack.type === 'steam_topup' ? "/steam-help.jpg" : "/guide-1.jpg"} className="rounded-3xl border border-white/10 max-h-64 object-contain shadow-2xl" alt="Help" />
        </div>
      </div>

      <div className="flex items-center gap-4 pt-6">
        <button onClick={() => { triggerHapticFeedback('light'); onBack(); }} className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/30 active:scale-90 transition-all">
          <ChevronLeft size={20} className="text-white" strokeWidth={3} />
        </button>
        <h1 className="text-2xl font-black tracking-tight uppercase italic">Оплата</h1>
      </div>

      {/* Карточка товара */}
      <div className="bg-black/50 backdrop-blur-xl rounded-[32px] p-6 border border-amber-500/40 relative overflow-hidden group shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/15 to-transparent opacity-60" />
        <div className="flex items-center gap-5 relative z-10">
          <img src={pack.image || '/pp.png'} className="w-16 h-16 rounded-[20px] object-cover border-2 border-white/30" alt="Pack" />
          <div className="flex flex-col gap-1">
            <span className="text-lg font-black italic tracking-tighter uppercase leading-tight">
              {pack.title || (isMultiCode ? `${items.reduce((s, i) => s + (i.amount * i.quantity), 0)} UC` : `${pack.amount} UC`)}
            </span>
            <div className="flex items-center gap-2 bg-amber-500/30 border border-amber-500/50 px-3 py-1 rounded-full w-fit">
              <span className="text-amber-400 text-[14px] font-black">{getTotalPrice().toLocaleString()} ₽</span>
            </div>
          </div>
        </div>
      </div>

      {/* Инпут UID */}
      {(!pack.is_code) && (
        <div className="space-y-3">
          <div className="flex justify-between items-end px-1">
            <label className="text-[12px] font-black uppercase tracking-[0.2em] text-white/50">{pack.type === 'steam_topup' ? 'Логин Steam' : 'PUBG UID'}</label>
            <button onClick={() => { triggerHapticFeedback('light'); setShowHelp(true); }} className="flex items-center gap-1.5 text-[12px] text-amber-400 font-black uppercase tracking-wider">
              <span>Где найти?</span><HelpCircle size={14} strokeWidth={3} />
            </button>
          </div>
          <input 
            value={uid} onChange={(e) => setUid(e.target.value)}
            className="w-full bg-white/15 border-2 border-white/20 rounded-2xl py-5 px-6 text-white font-black text-lg outline-none focus:border-amber-500/60 transition-all shadow-inner" 
            placeholder={pack.type === 'steam_topup' ? "ivan_2005" : "Введите ID"} 
            disabled={isLoading}
          />
        </div>
      )}

      {/* Метод оплаты */}
      <div className="space-y-3">
        <label className="text-[12px] font-black uppercase tracking-[0.2em] px-1 text-center block text-white/30">Метод оплаты</label>
        <div className="grid grid-cols-2 gap-4">
          {[
            { id: 'sbp' as const, img: '/sbp.jpg', label: 'СБП' },
            { id: 'card' as const, img: '/card.jpg', label: 'Карты' }
          ].map((method) => (
            <button key={method.id} onClick={() => { triggerHapticFeedback('light'); setPaymentMethod(method.id); }} className={`h-20 rounded-[28px] border-2 transition-all flex items-center justify-center relative ${paymentMethod === method.id ? 'bg-amber-500/10 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)]' : 'bg-white/5 border-white/5 opacity-70'}`}>
              <img src={method.img} className="h-8 object-contain" alt={method.label} />
              {paymentMethod === method.id && <div className="absolute top-2 right-2 bg-amber-500 rounded-full p-0.5 shadow-lg"><CheckCircle2 size={16} className="text-black" strokeWidth={3} /></div>}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="bg-red-500/20 border-2 border-red-500/50 rounded-2xl p-4 animate-in fade-in"><p className="text-red-300 font-bold text-center text-sm">{error}</p></div>}

      <div className="bg-black/70 backdrop-blur-2xl rounded-[40px] p-8 space-y-4 border-2 border-white/10 shadow-2xl mt-auto">
        <div className="flex justify-between items-center">
          <span className="text-xl font-black uppercase italic tracking-tight text-white/50">Итого</span>
          <div className="flex flex-col items-end">
            <span className="text-3xl font-black text-amber-400 tracking-tighter">
                {getTotalPrice().toFixed(2)}<span className="text-xl ml-1">₽</span>
            </span>
            {paymentMethod === 'card' && <span className="text-[10px] text-white/40 font-bold uppercase animate-in fade-in">Вкл. комиссию 7.1%</span>}
          </div>
        </div>
      </div>

      <button 
        onClick={() => { triggerHapticFeedback('heavy'); handlePayment(); }} 
        className="w-full bg-amber-500 hover:bg-amber-400 py-6 rounded-2xl font-black text-black text-xl active:scale-[0.98] transition-all uppercase tracking-tight disabled:opacity-50 shadow-xl shadow-amber-900/20"
        disabled={(!pack.is_code && !uid.trim()) || isLoading}
      >
        {isLoading ? <><Loader2 className="w-5 h-5 animate-spin mr-2" />Обработка...</> : 'Оплатить'}
      </button>
    </div>
  );
};

export default Checkout;