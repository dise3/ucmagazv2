import React, { useState, useEffect } from 'react';
import { ChevronLeft, HelpCircle, CheckCircle2, X, Loader2, Home } from 'lucide-react';

// Компонент оверлея статуса оплаты
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
          // Безопасный вызов HapticFeedback
          const tg = (window as any).Telegram?.WebApp;
          if (tg?.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('success');
          }
        }
      } catch (e) { console.error("Status check error:", e); }
    }, 3000);
    return () => clearInterval(interval);
  }, [orderId, apiBase]);

  const getSuccessMessage = () => {
    if (type === 'steam_topup') return 'Средства будут зачислены на баланс Steam в течение 5-15 минут.';
    if (type === 'ps_gift') return 'Код активации придет в чат-бот в ближайшее время.';
    return 'Ваш заказ будет выполнен в течение 5-15 минут.';
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[200] flex flex-col items-center justify-center px-6 text-center animate-in fade-in duration-500">
      <div className="w-full max-w-xs space-y-8">
        {status === 'pending' ? (
          <div className="space-y-6">
            <div className="relative">
              <div className="absolute inset-0 bg-amber-500/20 blur-3xl rounded-full" />
              <Loader2 className="w-20 h-20 text-amber-500 animate-spin mx-auto relative z-10" strokeWidth={3} />
            </div>
            <h2 className="text-2xl font-black text-white uppercase italic">Ожидаем оплату</h2>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="relative">
              <div className="absolute inset-0 bg-green-500/20 blur-3xl rounded-full" />
              <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto relative z-10 animate-bounce" strokeWidth={3} />
            </div>
            <h2 className="text-2xl font-black text-white uppercase italic">Успешно!</h2>
            <p className="text-white/50 font-medium text-sm leading-relaxed">{getSuccessMessage()}</p>
          </div>
        )}
        <button onClick={onClose} className="w-full bg-white/10 hover:bg-white/20 py-5 rounded-2xl text-white font-black uppercase flex items-center justify-center gap-3 border border-white/10 active:scale-95 transition-all">
          <Home size={20} /><span>На главную</span>
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
    items?: Array<{ id: number; amount: number; price: number; quantity: number }>;
  };
  onBack: () => void;
}

const Checkout: React.FC<CheckoutProps> = ({ pack, onBack }) => {
  const [paymentMethod, setPaymentMethod] = useState<'sbp' | 'card'>('sbp');
  const [uid, setUid] = useState(pack.uid || '');
  const [showHelp, setShowHelp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState<any>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  const VITE_API_NGROK = import.meta.env.VITE_API_NGROK;
  
  // БЕЗОПАСНАЯ ИНИЦИАЛИЗАЦИЯ TELEGRAM
  const tg = typeof window !== 'undefined' ? (window as any).Telegram?.WebApp : null;

  useEffect(() => {
    fetch(`${VITE_API_NGROK}/api/settings`, { headers: { 'ngrok-skip-browser-warning': 'true' } })
      .then(res => res.json())
      .then(setSettings)
      .catch(console.error);
  }, [VITE_API_NGROK]);

  const COMMISSION_SBP = 0.0485;
  const COMMISSION_CARD = 0.071;

  const getTotalPrice = (): number => {
    if (!settings) return pack.price || 0;
    const comm = paymentMethod === 'sbp' ? COMMISSION_SBP : COMMISSION_CARD;

    if (pack.type === 'steam_topup') {
      const rate = settings.usd_rate_store || settings.usd_rate || 95;
      const steamFee = settings.steam_fee_percent ?? 0.15;
      const baseRubWithMarkup = (pack.amount || 0) * rate * (1 + steamFee);
      return Math.ceil(baseRubWithMarkup * (1 + comm) + 1);
    }

    const base = (pack.price || 0) / (1 + COMMISSION_SBP); 
    return Math.ceil(base * (1 + comm));
  };

  const handlePayment = async () => {
    const currentUid = uid ? uid.trim() : (pack.uid ? pack.uid.trim() : '');
    if (!pack.is_code && !currentUid) {
      setError(pack.type === 'steam_topup' ? 'Введите логин Steam' : 'Введите UID');
      return;
    }

    setIsLoading(true);
    setError('');
    
    // Использование Опциональной цепочки (?.) предотвращает ошибку, если tg или user равны null
    const user = tg?.initDataUnsafe?.user;
    
    const user_chat_id = user?.id || 0;
    const buyer_first_name = user?.first_name || 'Web';
    const buyer_last_name = user?.last_name || 'User';

    try {
      const totalPrice = getTotalPrice();
      const response = await fetch(`${VITE_API_NGROK}/api/create-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({
          uid: currentUid,
          amount: pack.amount || 0,
          price: totalPrice,
          method_slug: paymentMethod,
          user_chat_id: user_chat_id,
          buyer_first_name: buyer_first_name,
          buyer_last_name: buyer_last_name,
          type: pack.type || 'uc',
          is_code: pack.is_code || false
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Ошибка сервера');

      if (data.url) {
        setActiveOrderId(data.order_id);
        // Если открыто в Telegram, используем его метод для ссылок
        if (tg?.openLink) {
            tg.openLink(data.url);
        } else {
            window.location.href = data.url;
        }
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка сети');
    } finally { setIsLoading(false); }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 px-4 max-w-md mx-auto relative z-10 text-white">
      {activeOrderId && (
        <PaymentStatusOverlay 
          orderId={activeOrderId} 
          apiBase={VITE_API_NGROK} 
          type={pack.type} 
          onClose={() => { setActiveOrderId(null); onBack(); }} 
        />
      )}

      {/* Помощь */}
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

      {/* Header */}
      <div className="flex items-center gap-4 pt-6">
        <button 
          onClick={() => { 
            if(tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light'); 
            onBack(); 
          }} 
          className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/30 active:scale-90 transition-all"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-2xl font-black uppercase italic">Оформление</h1>
      </div>

      {/* Карточка */}
      <div className="bg-black/50 backdrop-blur-xl rounded-[32px] p-6 border border-amber-500/40 relative overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-50" />
        <div className="flex items-center gap-5 relative z-10">
          <img src={pack.image || '/pp.png'} className="w-16 h-16 rounded-[20px] object-cover border-2 border-white/20" alt="Pack" />
          <div className="flex flex-col">
            <span className="text-lg font-black italic uppercase leading-tight">{pack.title || `${pack.amount} UC`}</span>
            <span className="text-amber-400 font-black text-xl">{getTotalPrice().toLocaleString()} ₽</span>
          </div>
        </div>
      </div>

      {!pack.is_code && (
        <div className="space-y-3">
          <div className="flex justify-between items-end px-1 text-white/50">
            <label className="text-[12px] font-black uppercase tracking-widest">{pack.type === 'steam_topup' ? 'Логин Steam' : 'Игровой UID'}</label>
            <button onClick={() => setShowHelp(true)} className="flex items-center gap-1 text-[11px] text-amber-400 font-bold">Где найти? <HelpCircle size={14} /></button>
          </div>
          <input 
            value={uid} 
            onChange={(e) => setUid(e.target.value)} 
            placeholder={pack.type === 'steam_topup' ? "ivan_2005" : "Введите ID"} 
            className="w-full bg-white/5 border-2 border-white/10 rounded-2xl py-5 px-6 text-white font-black text-lg outline-none focus:border-amber-500/50 transition-all" 
          />
        </div>
      )}

      {/* Методы оплаты */}
      <div className="space-y-3">
        <label className="text-[11px] font-black text-white/30 uppercase tracking-widest text-center block">Метод оплаты</label>
        <div className="grid grid-cols-2 gap-4">
          {(['sbp', 'card'] as const).map((m) => (
            <button 
              key={m} 
              onClick={() => { 
                if(tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light'); 
                setPaymentMethod(m); 
              }} 
              className={`h-20 rounded-[24px] border-2 transition-all flex items-center justify-center relative ${paymentMethod === m ? 'bg-amber-500/10 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)]' : 'bg-white/5 border-white/5 opacity-60'}`}
            >
              <img src={m === 'sbp' ? '/sbp.jpg' : '/card.jpg'} className="h-8 object-contain" alt={m} />
              {paymentMethod === m && <div className="absolute -top-2 -right-2 bg-amber-500 rounded-full p-1 shadow-lg"><CheckCircle2 size={14} className="text-black" strokeWidth={4} /></div>}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-red-400 font-bold text-center text-sm">{error}</div>}

      <div className="mt-auto space-y-4 pt-4">
        <div className="flex justify-between items-end px-2">
            <div className="flex flex-col">
                <span className="text-[11px] font-black text-white/30 uppercase tracking-widest">К оплате:</span>
                <span className="text-3xl font-black tracking-tight">{getTotalPrice().toFixed(2)} <span className="text-amber-400">₽</span></span>
            </div>
            {paymentMethod === 'card' && (
              <div className='text-right'>
                <span className="text-[10px] text-white/20 font-bold block italic leading-tight">включая комиссию</span>
                <span className="text-[10px] text-white/20 font-bold block">+2.25%</span>
              </div>
            )}
        </div>
        <button 
          onClick={() => { 
            if(tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('heavy'); 
            handlePayment(); 
          }} 
          disabled={isLoading || (!pack.is_code && !uid.trim())} 
          className="w-full bg-amber-500 hover:bg-amber-400 py-6 rounded-[24px] font-black text-black text-xl uppercase transition-all active:scale-[0.97] disabled:opacity-50 shadow-xl shadow-amber-900/20"
        >
          {isLoading ? <Loader2 className="animate-spin mx-auto w-7 h-7" /> : 'Подтвердить и оплатить'}
        </button>
      </div>
    </div>
  );
};

export default Checkout;