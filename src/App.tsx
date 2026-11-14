import { useEffect } from 'react';
import { HashRouter, Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { CORE_CATEGORY } from './content/categories/registry';
import { EVERY_ITEM } from './content';
import { dueItems } from './learn/session';
import { CategoryPage } from './pages/CategoryPage';
import { Home } from './pages/Home';
import { Functions } from './pages/Functions';
import { ItemPage, Library } from './pages/Library';
import { Mistakes } from './pages/Mistakes';
import { Practice } from './pages/Practice';
import { SessionPage } from './pages/SessionPage';
import { Settings, Welcome } from './pages/Settings';
import { useProgress } from './store/progress';

/** Applies light or dark colours, following the computer's setting when asked to. */
function useTheme() {
  const theme = useProgress((s) => s.settings.theme);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);
}

function Icon({ d }: { d: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  home: 'M3 11l9-8 9 8M5 10v10h14V10',
  play: 'M7 4l13 8-13 8z',
  book: 'M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 5v16',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
  gear: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19 12a7 7 0 00-.1-1.3l2-1.5-2-3.4-2.3.9a7 7 0 00-2.2-1.3L14 3h-4l-.4 2.4a7 7 0 00-2.2 1.3l-2.3-.9-2 3.4 2 1.5a7 7 0 000 2.6l-2 1.5 2 3.4 2.3-.9a7 7 0 002.2 1.3L10 21h4l.4-2.4a7 7 0 002.2-1.3l2.3.9 2-3.4-2-1.5c.1-.4.1-.9.1-1.3z',
};

export function App() {
  useTheme();
  const onboarded = useProgress((s) => s.settings.onboarded);
  const cards = useProgress((s) => s.cards);
  const due = dueItems(EVERY_ITEM, cards, Date.now()).length;

  return (
    <HashRouter>
      <div className="app">
        <nav className="nav" aria-label="Main">
          <div className="brand">
            <span className="brand-mark">G</span>
            Groundwork
          </div>
          <NavLink to="/" end>
            <Icon d={ICONS.home} /> Home
          </NavLink>
          <NavLink to="/practice">
            <Icon d={ICONS.play} /> Practice
            {due > 0 && <span className="nav-badge" title={`${due} reviews due`}>{due}</span>}
          </NavLink>
          <NavLink to="/library">
            <Icon d={ICONS.book} /> Library
          </NavLink>
          <NavLink to="/functions">
            <span className="nav-fx" aria-hidden="true">
              fx
            </span>{' '}
            Functions
          </NavLink>
          <NavLink to="/mistakes">
            <Icon d={ICONS.flag} /> Mistakes
          </NavLink>
          <NavLink to="/settings">
            <Icon d={ICONS.gear} /> Settings
          </NavLink>
          <div className="nav-foot">{EVERY_ITEM.length} questions · saved on this computer</div>
        </nav>
        <main className="main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/c/:slug" element={<CategoryPage />} />
            <Route path="/dashboard" element={<Navigate to={`/c/${CORE_CATEGORY}`} replace />} />
            <Route path="/practice" element={<Practice />} />
            <Route path="/session" element={<SessionPage />} />
            <Route path="/library" element={<Library />} />
            <Route path="/item/:id" element={<ItemPage />} />
            <Route path="/functions" element={<Functions />} />
            <Route path="/functions/:name" element={<Functions />} />
            <Route path="/mistakes" element={<Mistakes />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </main>
      </div>
      {!onboarded && <Welcome />}
    </HashRouter>
  );
}
