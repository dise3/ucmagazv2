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
        <button onClick={onBack} className="p-3 bg-white/10 rounded-2xl active:scale-90 border border-white/10">
          <ChevronLeft size={20} className="text-white" />
        </button>
        <h1 className="text-2xl font-black text-white uppercase italic">PlayStation</h1>
      </div>

      {/* Выбор валюты */}
      <div className="grid grid-cols-3 gap-2 bg-white/5 p-1 rounded-2xl border border-white/10">
        {(['TRY', 'USD', 'PLN'] as const).map(curr => (
          <button
            key={curr}
            onClick={() => setCurrency(curr)}
            className={`py-3 rounded-xl font-black text-[10px] transition-all ${
              currency === curr ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-white/40'
            }`}
          >
            {curr === 'TRY' ? 'TURKEY 🇹🇷' : curr === 'USD' ? 'USA 🇺🇸' : 'POLAND 🇵🇱'}
          </button>
        ))}
      </div>

      {/* Карточки товаров в сетке 2 колонки */}
      <div className="grid grid-cols-2 gap-3">
        {cards[currency].map(card => (
          <button
            key={card.id}
            onClick={() => setSelectedCard(card)}
            className="bg-[#1c1c1e] border border-white/10 rounded-[28px] p-4 active:scale-[0.97] transition-all hover:border-blue-500/50 flex flex-col items-center"
          >
            {/* Картинка */}
            <div className="w-full aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-blue-600/20 to-purple-600/20 mb-3">
              <img 
                src={card.image} 
                alt={card.label}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Если картинка не загрузилась, показываем иконку
                  e.currentTarget.style.display = 'none';
                }}
              />
              {/* Fallback иконка */}
              <div className="w-full h-full flex items-center justify-center text-4xl">
                🎮
              </div>
            </div>

            {/* Информация */}
            <div className="w-full text-center">
              <div className="text-white font-bold text-lg">{card.label}</div>
              <div className="text-white/30 text-[10px] font-bold uppercase tracking-widest mb-1">
                Код активации
              </div>
              <div className="text-xl font-black text-white">
                {card.price} ₽
              </div>
            </div>
          </button>
        ))}
      </div>

      <p className="text-center text-white/20 text-[10px] font-medium px-10">
        Код придет в чат-бот сразу после подтверждения оплаты
      </p>
    </div>
  );
};

export default PlayStation;