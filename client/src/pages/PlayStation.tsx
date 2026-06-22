import React, { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import Checkout from './Checkout';

const PlayStation = ({ onBack }: { onBack: () => void }) => {
  const [currency, setCurrency] = useState<'TRY' | 'USD' | 'PLN'>('TRY');
  const [selectedCard, setSelectedCard] = useState<any>(null);

  // Твои ручные настройки цен
  const cards = {
    TRY: [
      { id: 72, label: '250 TRY', price: 950 },
      { id: 73, label: '500 TRY', price: 1850 },
      { id: 75, label: '1000 TRY', price: 3600 },
      { id: 78, label: '2500 TRY', price: 8900 },
    ],
    USD: [
      { id: 117, label: '$10 USA', price: 1150 },
      { id: 118, label: '$25 USA', price: 2700 },
      { id: 119, label: '$50 USA', price: 5300 },
      { id: 121, label: '$100 USA', price: 10400 },
    ],
    PLN: [
      { id: 106, label: '50 PLN', price: 1450 },
      { id: 107, label: '100 PLN', price: 2850 },
    ]
  };

  if (selectedCard) {
    return (
      <Checkout 
        onBack={() => setSelectedCard(null)}
        pack={{
          type: 'ps_gift',
          amount: selectedCard.id, // Передаем ID товара NS API
          price: selectedCard.price, // Фиксированная цена в рублях
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

      {/* Карточки товаров */}
      <div className="grid grid-cols-1 gap-3">
        {cards[currency].map(card => (
          <button
            key={card.id}
            onClick={() => setSelectedCard(card)}
            className="bg-[#1c1c1e] border border-white/10 p-5 rounded-[28px] flex justify-between items-center active:scale-[0.98] transition-all hover:border-blue-500/50"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center">
                <span className="text-blue-400 font-black">PS</span>
              </div>
              <div className="flex flex-col items-start">
                <span className="text-white font-black text-lg">{card.label}</span>
                <span className="text-white/30 text-[10px] font-bold uppercase tracking-widest">Код активации</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-black text-white">{card.price} ₽</div>
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