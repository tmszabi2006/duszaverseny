import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { GameIcon } from './GameIcon';

type Weather = 'off' | 'soft' | 'snow';
const WeatherContext = createContext<{ weather: Weather; setWeather: (value: Weather) => void }>({ weather: 'soft', setWeather: () => {} });

export function WeatherControl() {
  const { weather, setWeather } = useContext(WeatherContext);
  return <label className="weather-control">
    <GameIcon name="snow" />
    <select value={weather} onChange={event => setWeather(event.target.value as Weather)} aria-label="Havazás">
      <option value="off">Hó nélkül</option><option value="soft">Finom hó</option><option value="snow">Sűrű hóesés</option>
    </select>
  </label>;
}

export function WinterProvider({ children }: { children: ReactNode }) {
  const [weather, setWeather] = useState<Weather>(() => {
    try {
      const saved = localStorage.getItem('minescript:weather');
      return saved === 'off' || saved === 'snow' || saved === 'soft' ? saved : localStorage.getItem('minescript:snow') === 'off' ? 'off' : 'soft';
    } catch { return 'soft'; }
  });
  useEffect(() => { try { localStorage.setItem('minescript:weather', weather); } catch { /* Helyi tárolás nélkül is működik. */ } }, [weather]);
  return <WeatherContext.Provider value={{ weather, setWeather }}><Snowfall weather={weather} />{children}</WeatherContext.Provider>;
}

/** Cached soft sprites, three depth layers, no per-frame React updates. */
function Snowfall({ weather }: { weather: Weather }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { pathname } = useLocation();
  const underground = /^\/maps\//.test(pathname);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || weather === 'off') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0, width = 0, height = 0, last = 0, elapsed = 0;
    let flakes: { x: number; y: number; depth: number; phase: number; radius: number }[] = [];
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 32;
    const brush = sprite.getContext('2d');
    if (!brush) return;
    const glow = brush.createRadialGradient(16, 16, 0, 16, 16, 16);
    glow.addColorStop(0, 'rgba(240,250,255,1)');
    glow.addColorStop(.25, 'rgba(231,246,255,.85)');
    glow.addColorStop(.65, 'rgba(217,236,251,.24)');
    glow.addColorStop(1, 'rgba(217,236,251,0)');
    brush.fillStyle = glow; brush.fillRect(0, 0, 32, 32);
    function resize() {
      width = window.innerWidth; height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas!.width = Math.round(width * dpr); canvas!.height = Math.round(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      const heavy = weather === 'snow';
      const cap = heavy ? (width < 640 ? 260 : 800) : (width < 640 ? 60 : 140);
      const count = Math.min(cap, Math.round(width * height / (heavy ? 1800 : 14000)));
      flakes = Array.from({ length: count }, (_, i) => {
        const depth = (i % 3 + 1) / 3;
        return { x: Math.random() * width, y: Math.random() * height, depth, phase: Math.random() * Math.PI * 2, radius: .9 + depth * depth * (heavy ? 6 : 4.5) };
      });
    }
    function draw(now: number) {
      frame = requestAnimationFrame(draw);
      if (now - last < 1000 / 30) return;
      const dt = Math.min((now - (last || now)) / 1000, .06);
      last = now; elapsed += dt;
      ctx!.clearRect(0, 0, width, height);
      const heavy = weather === 'snow';
      const wind = (Math.sin(elapsed * .21) * 12 + Math.sin(elapsed * .67) * 5) * (heavy ? 2.4 : 1) + (heavy ? 18 : 0);
      for (const p of flakes) {
        p.y += dt * (13 + p.depth * 34) * (heavy ? 2.3 : 1);
        p.x += dt * (wind * p.depth + Math.sin(elapsed * .6 + p.phase) * 9);
        if (p.y > height + 12) { p.y = -12; p.x = Math.random() * width; }
        if (p.x < -12) p.x = width + 12;
        if (p.x > width + 12) p.x = -12;
        ctx!.globalAlpha = (heavy ? .38 : .25) + p.depth * .48;
        ctx!.drawImage(sprite, p.x - p.radius, p.y - p.radius, p.radius * 2, p.radius * 2);
      }
    }
    function sync() {
      cancelAnimationFrame(frame); last = 0;
      ctx!.clearRect(0, 0, width, height);
      if (!document.hidden && !reduced.matches) frame = requestAnimationFrame(draw);
    }
    resize(); sync();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', sync);
    reduced.addEventListener('change', sync);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', sync);
      reduced.removeEventListener('change', sync);
      ctx.clearRect(0, 0, width, height);
    };
  }, [weather]);
  return weather === 'off' ? null : <canvas ref={ref} className={`snow-canvas${underground ? ' snow-underground' : ''}`} aria-hidden="true" />;
}
