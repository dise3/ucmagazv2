import React, { useState, useEffect, useCallback } from 'react';
import { Trophy, X, Loader2 } from 'lucide-react';

interface LeaderboardEntry {
    rank: number;
    displayName: string;
    totalUc: number;
}

interface HomeProps {
    onShopClick: () => void;
}

const API_HEADERS = {
    'ngrok-skip-browser-warning': 'true',
    'tuna-skip-browser-warning': 'true',
    Accept: 'application/json',
};

const Home: React.FC<HomeProps> = ({ onShopClick }) => {
    const VITE_API_NGROK = import.meta.env.VITE_API_NGROK;
    const [topOpen, setTopOpen] = useState(false);
    const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
    const [loadingTop, setLoadingTop] = useState(false);
    const [topError, setTopError] = useState('');

    const fetchLeaderboard = useCallback(async () => {
        if (!VITE_API_NGROK) {
            setTopError('API не настроен');
            return;
        }
        setLoadingTop(true);
        setTopError('');
        try {
            const res = await fetch(`${VITE_API_NGROK}/api/leaderboard`, { headers: API_HEADERS });
            if (!res.ok) throw new Error('Не удалось загрузить топ');
            const data = await res.json();
            setLeaders(Array.isArray(data) ? data : []);
        } catch {
            setTopError('Ошибка загрузки');
            setLeaders([]);
        } finally {
            setLoadingTop(false);
        }
    }, [VITE_API_NGROK]);

    const openTop = () => {
        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
        setTopOpen(true);
        fetchLeaderboard();
    };

    useEffect(() => {
        if (!topOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setTopOpen(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [topOpen]);

    const rankStyle = (rank: number) => {
        if (rank === 1) return 'text-[#f3d092]';
        if (rank === 2) return 'text-[#c0c0c0]';
        if (rank === 3) return 'text-[#cd7f32]';
        return 'text-white/50';
    };

    return (
        <div className="flex flex-col gap-4 animate-in fade-in duration-700">
            <div className="relative bg-[#1c1c1e]/80 backdrop-blur-lg rounded-[35px] overflow-hidden border border-white/10 shadow-2xl">
                <div className="relative h-56">
                    <img
                        src="/photo-banner.jpg"
                        className="w-full h-full object-cover"
                        alt="PUBG Banner"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1c1c1e] via-transparent to-transparent" />
                </div>

                <div className="relative px-6 py-6 -mt-12">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <div className="absolute inset-0 bg-blue-500/20 blur-lg rounded-2xl" />
                                <div className="relative w-14 h-14 bg-black rounded-2xl border border-white/10 flex items-center justify-center overflow-hidden">
                                    <img src="/pubg-logo.jpg" alt="Logo" className="w-full h-full object-cover scale-150" />
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <h3 className="font-bold text-white text-lg tracking-tight uppercase">
                                    PUBG MOBILE
                                </h3>
                            </div>
                        </div>

                        <button
                            type="button"
                            className="relative w-full max-w-[160px] active:scale-95 transition-all duration-200 outline-none select-none group overflow-hidden rounded-2xl"
                            onClick={() => {
                                window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
                                onShopClick();
                            }}
                        >
                            <div className="absolute inset-0 bg-[#d4af37] blur-lg opacity-10 group-hover:opacity-20 transition-opacity" />
                            <div className="relative p-[1.5px] bg-gradient-to-tr from-[#8a6d3b] via-[#e2c17d] to-[#8a6d3b] rounded-2xl">
                                <div className="relative bg-[#0f0f0f] py-3 rounded-[14px] flex items-center justify-center overflow-hidden">
                                    <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shine" />
                                    <span className="relative z-10 bg-gradient-to-b from-[#f3d092] via-[#d4af37] to-[#8a6d3b] bg-clip-text text-transparent font-black text-xs uppercase tracking-[0.1em]">
                                        Пополнить
                                    </span>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            <button
                type="button"
                onClick={openTop}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#1c1c1e]/80 border border-white/10 backdrop-blur-lg active:scale-[0.98] transition-transform"
            >
                <Trophy className="w-5 h-5 text-[#d4af37]" />
                <span className="font-bold text-white text-sm uppercase tracking-wide">
                    Топ покупателей
                </span>
            </button>

            {topOpen && (
                <div
                    className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setTopOpen(false)}
                >
                    <div
                        className="w-full max-w-md bg-[#1c1c1e] border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                            <div className="flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-[#d4af37]" />
                                <h2 className="font-black text-white uppercase tracking-tight text-sm">
                                    Топ 10 · UC за всё время
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setTopOpen(false)}
                                className="p-2 rounded-xl bg-white/5 text-white/70 hover:bg-white/10"
                                aria-label="Закрыть"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="px-4 py-3 max-h-[60vh] overflow-y-auto">
                            {loadingTop && (
                                <div className="flex flex-col items-center justify-center py-12 gap-3">
                                    <Loader2 className="w-8 h-8 text-[#d4af37] animate-spin" />
                                    <span className="text-white/50 text-sm">Загрузка...</span>
                                </div>
                            )}

                            {!loadingTop && topError && (
                                <p className="text-center text-white/50 py-8 text-sm">{topError}</p>
                            )}

                            {!loadingTop && !topError && leaders.length === 0 && (
                                <p className="text-center text-white/50 py-8 text-sm">
                                    Пока нет покупок UC
                                </p>
                            )}

                            {!loadingTop && !topError && leaders.length > 0 && (
                                <ul className="flex flex-col gap-2">
                                    {leaders.map((row) => (
                                        <li
                                            key={row.rank}
                                            className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${
                                                row.rank <= 3
                                                    ? 'bg-white/5 border-[#d4af37]/20'
                                                    : 'bg-black/20 border-white/5'
                                            }`}
                                        >
                                            <span
                                                className={`w-8 font-black text-lg tabular-nums ${rankStyle(row.rank)}`}
                                            >
                                                {row.rank}
                                            </span>
                                            <span className="flex-1 font-semibold text-white truncate">
                                                {row.displayName}
                                            </span>
                                            <span className="font-bold text-[#d4af37] text-sm whitespace-nowrap tabular-nums">
                                                {row.totalUc.toLocaleString('ru-RU')} UC
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <p className="px-5 pb-4 text-[10px] text-white/30 text-center leading-relaxed">
                            Имена частично скрыты. Учитываются оплаченные заказы UC.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Home;
