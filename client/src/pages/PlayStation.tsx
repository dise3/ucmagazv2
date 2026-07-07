import React, { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import Checkout from './Checkout';

const PlayStation = ({ onBack }: { onBack: () => void }) => {
  const [currency, setCurrency] = useState<'TRY' | 'USD' | 'PLN'>('TRY');
  const [selectedCard, setSelectedCard] = useState<any>(null);

  const cards = {
    TRY: [
      { id: 72, label: '250 TRY', price: 950, image: '/ps-try.jpg' },
      { id: 73, label: '500 TRY', price: 1850, image: '/ps-try.jpg' },
      { id: 75, label: '1000 TRY', price: 3600, image: '/ps-try.jpg' },
      { id: 78, label: '2500 TRY', price: 8900, image: '/ps-try.jpg' },
    ],
    USD: [
      { id: 117, label: '$10 USA', price: 1150, image: '/ps-usa.jpg' },
      { id: 118, label: '$25 USA', price: 2700, image: '/ps-usa.jpg' },
      { id: 119, label: '$50 USA', price: 5300, image: '/ps-usa.jpg' },
      { id: 121, label: '$100 USA', price: 10400, image: '/ps-usa.jpg' },
    ],
    PLN: [
      { id: 106, label: '50 PLN', price: 1450, image: '/ps-pln.jpg' },
      { id: 107, label: '100 PLN', price: 2850, image: '/ps-pln.jpg' },
    ]
  };

  if (selectedCard) {
    return (
      <Checkout 
        onBack={() => setSelectedCard(null)}
        pack={{
          type: 'ps_gift',
          amount: selectedCard.id,
          price: selectedCard.price,
          title: `PS Store ${selectedCard.label}`,
          image: '/ps-icon.png'
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-20 px-4">
      <div className="flex items-center gap-4">
        <button 
          onClick={onBack} 
          className="p-3 bg-white/10 rounded-2xl active:scale-90 border border-amber-500/30 hover:border-amber-500/60 transition-all backdrop-blur-sm"
        >
          <ChevronLeft size={20} className="text-amber-500" />
        </button>
        <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600 uppercase italic">
          PlayStation
        </h1>
      </div>

      <div className="grid grid-cols-3 gap-2 bg-white/5 backdrop-blur-sm p-1 rounded-2xl border border-amber-500/30">
        {(['TRY', 'USD', 'PLN'] as const).map(curr => (
          <button
            key={curr}
            onClick={() => setCurrency(curr)}
            className={`py-3 rounded-xl font-black text-[10px] transition-all ${
              currency === curr 
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-600/30' 
                : 'text-amber-600/60 hover:text-amber-400'
            }`}
          >
            {curr === 'TRY' ? 'TURKEY 🇹🇷' : curr === 'USD' ? 'USA 🇺🇸' : 'POLAND 🇵🇱'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {cards[currency].map(card => (
          <button
            key={card.id}
            onClick={() => setSelectedCard(card)}
            className="bg-white/5 backdrop-blur-sm border border-amber-500/30 rounded-[28px] p-4 active:scale-[0.97] transition-all hover:border-amber-400/70 hover:shadow-lg hover:shadow-amber-600/20 flex flex-col items-center group"
          >
            {/* Картинка */}
            <div className="w-full aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-amber-600/20 to-amber-800/20 mb-3 relative">
              {/* Показываем картинку */}
              <img 
                src={card.image} 
                alt={card.label}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Если картинка не загрузилась - показываем эмодзи
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.parentElement?.querySelector('.fallback-icon');
                  if (fallback) fallback.classList.remove('hidden');
                }}
              />
              
              {/* Fallback эмодзи (скрыт по умолчанию) */}
              <div className="w-full h-full flex items-center justify-center text-4xl fallback-icon hidden">
                🎮
              </div>
              
              {/* Рамка при наведении */}
              <div className="absolute inset-0 border-2 border-transparent group-hover:border-amber-400/50 rounded-2xl transition-all"></div>
            </div>

            <div className="w-full text-center">
              <div className="text-white font-bold text-lg group-hover:text-amber-400 transition-colors">
                {card.label}
              </div>
              <div className="text-amber-600/40 text-[10px] font-bold uppercase tracking-widest mb-1">
                Код активации
              </div>
              <div className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">
                {card.price} ₽
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-center gap-2 mt-2">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-500/30 to-transparent"></div>
        <p className="text-amber-600/40 text-[10px] font-medium px-4 text-center">
          ⚡ Код придет в чат-бот сразу после подтверждения оплаты
        </p>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-500/30 to-transparent"></div>
      </div>

      <div className="flex justify-center gap-1">
        {[...Array(5)].map((_, i) => (
          <div 
            key={i} 
            className="w-1 h-1 rounded-full bg-amber-500/30"
            style={{ animationDelay: `${i * 0.1}s` }}
          ></div>
        ))}
      </div>
    </div>
  );
};

export default PlayStation;