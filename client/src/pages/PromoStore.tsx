import React, { useEffect, useState } from 'react';
import { ChevronLeft } from 'lucide-react';

const LOGIN_UC_AMOUNTS = [1800, 3850, 5650, 8100, 16200, 32400, 40500, 81000] as const;
const MANAGER_USERNAME = 'RAKUTAMANAGER';
const DEFAULT_IMAGE = '/uc-325.jpg';

interface Pack {
    amount: number;
    price: number | null;
    image: string;
}

interface PromoStoreProps {
    onBack: () => void;
}

function buildManagerMessage(amount: number): string {
    const qty = amount.toLocaleString('ru-RU');
    return `Привет, хочу купить «${qty}» UC по входу\n\n«Жду реквизиты для оплаты»`;
}

function openManagerChat(amount: number) {
    const url = `https://t.me/${MANAGER_USERNAME}?text=${encodeURIComponent(buildManagerMessage(amount))}`;
    const tg = window.Telegram?.WebApp;
    if (tg?.openTelegramLink) {
        tg.openTelegramLink(url);
    } else {
        window.open(url, '_blank');
    }
}

const PromoStore: React.FC<PromoStoreProps> = ({ onBack }) => {
    const [packs, setPacks] = useState<Pack[]>([]);
    const [loading, setLoading] = useState(true);
    const VITE_API_NGROK = import.meta.env.VITE_API_NGROK;

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await fetch(`${VITE_API_NGROK}/api/products?store=store`, {
                    headers: {
                        'ngrok-skip-browser-warning': 'true',
                        Accept: 'application/json',
                    },
                });
                const data = await response.json();
                const byAmount = new Map<number, { price: number; image_url: string }>();
                if (Array.isArray(data)) {
                    data.forEach((p: { amount_uc: number; price: number; image_url: string }) => {
                        byAmount.set(p.amount_uc, { price: Number(p.price), image_url: p.image_url });
                    });
                }

                const list: Pack[] = LOGIN_UC_AMOUNTS.map((amount) => {
                    const fromApi = byAmount.get(amount);
                    return {
                        amount,
                        price: fromApi?.price ?? null,
                        image: fromApi?.image_url || DEFAULT_IMAGE,
                    };
                });
                setPacks(list);
            } catch (error) {
                console.error('Ошибка при загрузке товаров:', error);
                setPacks(
                    LOGIN_UC_AMOUNTS.map((amount) => ({
                        amount,
                        price: null,
                        image: DEFAULT_IMAGE,
                    }))
                );
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [VITE_API_NGROK]);

    const handleSelect = (amount: number) => {
        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
        openManagerChat(amount);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="text-white/50 font-bold uppercase tracking-widest animate-pulse">
                    Загрузка...
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 animate-in slide-in-from-right duration-500 pb-32">
            <div className="flex items-center justify-between px-2 pt-2">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-white active:scale-90 transition-all outline-none"
                >
                    <div className="bg-white/10 p-2 rounded-xl">
                        <ChevronLeft size={20} />
                    </div>
                    <span className="text-sm font-bold uppercase tracking-wider">Назад</span>
                </button>
                <h1 className="text-xs font-bold text-white/40 uppercase tracking-[0.2em]">По входу</h1>
                <div className="w-10" />
            </div>

            <div className="relative overflow-hidden bg-gradient-to-br from-[#1c1c1e] to-[#0a0a0a] border border-white/10 rounded-[32px] p-6 shadow-2xl mx-1">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[50px] -mr-10 -mt-10" />
                <div className="relative z-10 flex items-center gap-4 mb-3">
                    <div className="relative w-14 h-14 bg-black rounded-2xl border border-white/10 flex items-center justify-center overflow-hidden">
                        <img src="/pubg-logo.jpg" alt="Logo" className="w-full h-full object-cover scale-150" />
                    </div>
                    <h2 className="text-xl font-black text-white tracking-tight italic uppercase">UC по входу</h2>
                </div>
                <p className="relative z-10 text-[13px] text-white/60 leading-relaxed font-medium">
                    Для пополнения необходим доступ к <span className="text-amber-400 font-bold">аккаунту</span> и ваш <span className="text-amber-400 font-bold">игровой никнейм</span>
                </p>
            </div>

            <div className="grid grid-cols-2 gap-3 px-2">
                {packs.map((pack) => (
                    <div
                        key={pack.amount}
                        onClick={() => handleSelect(pack.amount)}
                        className="relative bg-[#121212]/60 border border-white/10 rounded-[28px] p-3 flex flex-col items-center gap-3 active:scale-95 transition-all cursor-pointer group overflow-hidden"
                    >
                        <div className="relative w-full aspect-square rounded-[20px] overflow-hidden">
                            <img src={pack.image} className="w-full h-full object-cover" alt="" />
                        </div>

                        <div className="relative z-10 flex flex-col items-center gap-2 w-full overflow-hidden text-center">
                            <div className="text-lg font-black italic text-white whitespace-nowrap">
                                {pack.amount.toLocaleString('ru-RU')} UC
                            </div>

                            <div className="relative w-full group overflow-hidden rounded-2xl">
                                <div className="absolute inset-0 bg-[#d4af37] blur-lg opacity-10" />
                                <div className="relative p-[1.5px] bg-gradient-to-tr from-[#8a6d3b] via-[#e2c17d] to-[#8a6d3b] rounded-2xl">
                                    <div className="relative bg-[#0f0f0f] py-2.5 rounded-[14px] flex items-center justify-center overflow-hidden">
                                        <span className="relative z-10 bg-gradient-to-b from-[#f3d092] via-[#d4af37] to-[#8a6d3b] bg-clip-text text-transparent font-black text-[13px] uppercase tracking-wider">
                                            {pack.price != null
                                                ? `${Math.ceil(pack.price).toLocaleString('ru-RU')} ₽`
                                                : 'Написать'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PromoStore;
