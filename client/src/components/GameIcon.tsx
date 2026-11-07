import type { CSSProperties } from 'react';

export function GameIcon({ name, className = '' }: { name: 'mine' | 'map' | 'pickaxe' | 'user' | 'code' | 'arrow' | 'gold' | 'snow' | 'logout' | 'plus'; className?: string }) {
  const paths = {
    mine: <><path d="M3 21V10l9-7 9 7v11M7 21V11h10v10M1 21h22M9 21l2-10m4 10-2-10M8 17h8" /></>,
    map: <><path d="m3 5 6-2 6 3 6-2v16l-6 2-6-3-6 2ZM9 3v16m6-13v16" /></>,
    pickaxe: <><path d="m5 21 12-14M3 6c6-4 13-2 18 5l-6-2-4-5M12 10l3 3" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></>,
    code: <><path d="m7 6-5 6 5 6m10-12 5 6-5 6M14 3l-4 18" /></>,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    gold: <><path d="m4 18 3-11 10-2 5 9-7 7ZM7 7l8 14m2-16-2 16M4 18l18-4" /></>,
    snow: <><path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 3 3-3M9 20l3-3 3 3" /></>,
    logout: <><path d="M10 3H4v18h6m4-5 4-4-4-4m-5 4h12" /></>,
    plus: <path d="M12 4v16M4 12h16" />,
  };
  return <svg className={`game-icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{paths[name]}</svg>;
}

/** Vector sprite stays crisp even on a 15×15 board. The nose always faces north. */
export function MiningRobot({ style }: { style?: CSSProperties }) {
  return <svg className="mining-robot" viewBox="0 0 64 64" style={style} aria-hidden="true" focusable="false">
    <path d="m32 1 6 7H26Z" fill="#a3f4e9" />
    <rect x="7" y="24" width="12" height="31" rx="5" fill="#1b2529" stroke="#75837e" strokeWidth="2" />
    <rect x="45" y="24" width="12" height="31" rx="5" fill="#1b2529" stroke="#75837e" strokeWidth="2" />
    <path d="M8 31h10M8 38h10M8 45h10M46 31h10M46 38h10M46 45h10" stroke="#67706b" strokeWidth="2" />
    <rect x="17" y="25" width="30" height="30" rx="8" fill="#b88a52" stroke="#e6c799" strokeWidth="2" />
    <path d="M24 43h16m-16 5h16" stroke="#504232" strokeWidth="3" />
    <rect x="15" y="15" width="34" height="25" rx="10" fill="#e8d9bb" stroke="#9b784e" strokeWidth="2" />
    <rect x="19" y="22" width="26" height="13" rx="6" fill="#152c32" />
    <rect x="23" y="25" width="5" height="6" rx="2" fill="#8cf8ef" /><rect x="36" y="25" width="5" height="6" rx="2" fill="#8cf8ef" />
    <path d="M14 22c0-18 36-18 36 0Z" fill="#b57937" stroke="#f0c47c" strokeWidth="2" />
    <path d="M22 14q10-6 20 1" stroke="#e3f0ed" strokeWidth="4" strokeLinecap="round" fill="none" />
    <circle cx="32" cy="16" r="6" fill="#ffdd95" stroke="#7f592f" strokeWidth="2" /><circle cx="32" cy="16" r="3" fill="#fff5d9" />
    <path d="M16 38q17 7 33 0l-2 6q-16 6-29 0Zm26 6 6 12-7 2-4-12" fill="#b85045" />
  </svg>;
}
