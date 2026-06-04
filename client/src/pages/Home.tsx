import React, { useState, useEffect } from 'react';
import { Trophy, Loader2 } from 'lucide-react';

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
    const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
    const [loadingTop, setLoadingTop] = useState(true);
    const [topError, setTopError] = useState('');

    useEffect(() => {
        if (!VITE_API_NGROK) {
            setTopError('API не настроен');
            setLoadingTop(false);
            return;
        }
        (async () => {
            try {
                const res = await fetch(`${VITE_API_NGROK}/api/leaderboard`, { headers: API_HEADERS });
                if (!res.ok) throw new Error();
                const data = await res.json();
                setLeaders(Array.isArray(data) ? data : []);
            } catch {
                setTopError('Не удалось загрузить топ');
            } finally {
                setLoadingTop(false);
            }
        })();
    }, [VITE_API_NGROK]);

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

            <section className="bg-[#1c1c1e]/80 backdrop-blur-lg rounded-[28px] border border-white/10 px-4 py-4">
                <div className="flex items-center gap-2 mb-3 px-1">
                    <Trophy className="w-5 h-5 text-[#d4af37]" />
                    <h2 className="font-black text-white text-sm uppercase tracking-wide">
                        Топ 10 покупателей
                    </h2>
                </div>

                {loadingTop && (
                    <div className="flex items-center justify-center gap-2 py-8 text-white/50">
                        <Loader2 className="w-5 h-5 animate-spin text-[#d4af37]" />
                        <span className="text-sm">Загрузка...</span>
                    </div>
                )}

                {!loadingTop && topError && (
                    <p className="text-center text-white/50 py-6 text-sm">{topError}</p>
                )}

                {!loadingTop && !topError && leaders.length === 0 && (
                    <p className="text-center text-white/50 py-6 text-sm">Пока нет покупок UC</p>
                )}

                {!loadingTop && !topError && leaders.length > 0 && (
                    <ul className="flex flex-col gap-1.5">
                        {leaders.map((row) => (
                            <li
                                key={row.rank}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${
                                    row.rank <= 3 ? 'bg-white/5' : ''
                                }`}
                            >
                                <span className={`w-7 font-black text-base tabular-nums ${rankStyle(row.rank)}`}>
                                    {row.rank}
                                </span>
                                <span className="flex-1 font-medium text-white text-sm truncate">
                                    {row.displayName}
                                </span>
                                <span className="font-bold text-[#d4af37] text-sm tabular-nums whitespace-nowrap">
                                    {row.totalUc.toLocaleString('ru-RU')} UC
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
};

export default Home;
