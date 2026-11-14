/** Profile, appearance, backup and reset. Also the first-launch welcome dialog. */
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ALL_ITEMS } from '../content';
import { LEVELS } from '../content/topics';
import { levelHasContent } from '../learn/mastery';
import { startPlacement } from '../learn/start';
import { downloadProgress, importProgress } from '../store/backup';
import { startingLevel, useProgress, type Settings as SettingsType } from '../store/progress';

const COMFORT = [1, 2, 3, 4, 5];

function ProfileFields({
  value,
  onChange,
}: {
  value: SettingsType;
  onChange: (patch: Partial<SettingsType>) => void;
}) {
  return (
    <div className="form-grid">
      <label className="field">
        Computer
        <select value={value.os} onChange={(e) => onChange({ os: e.target.value as SettingsType['os'] })}>
          <option value="mac">Mac</option>
          <option value="win">Windows</option>
        </select>
      </label>
      <label className="field">
        Excel version
        <select value={value.excel} onChange={(e) => onChange({ excel: e.target.value as SettingsType['excel'] })}>
          <option value="365">Microsoft 365</option>
          <option value="2021">Excel 2021</option>
          <option value="2019">Excel 2019 or older</option>
          <option value="none">No desktop Excel</option>
        </select>
      </label>
      <label className="field">
        Comfort with Excel (1 to 5)
        <select value={value.excelComfort} onChange={(e) => onChange({ excelComfort: Number(e.target.value) })}>
          {COMFORT.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Comfort with real estate finance (1 to 5)
        <select value={value.reComfort} onChange={(e) => onChange({ reComfort: Number(e.target.value) })}>
          {COMFORT.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function Settings() {
  const settings = useProgress((s) => s.settings);
  const updateSettings = useProgress((s) => s.updateSettings);
  const resetProgress = useProgress((s) => s.resetProgress);
  const attempts = useProgress((s) => s.attempts.length);
  const [note, setNote] = useState<{ text: string; error: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const levels = LEVELS.filter((l) => levelHasContent(l.level, ALL_ITEMS));

  async function onImport(file: File | undefined) {
    if (!file) return;
    try {
      const summary = importProgress(await file.text());
      setNote({ text: summary, error: false });
    } catch (err) {
      setNote({ text: err instanceof Error ? err.message : 'Import failed.', error: true });
    }
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div className="page narrow">
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p>Everything is stored in this browser on this computer. Nothing is sent anywhere.</p>
        </div>
      </div>
      <div className="stack">
        <div className="card">
          <h2>Your profile</h2>
          <ProfileFields value={settings} onChange={updateSettings} />
          <p className="muted small" style={{ marginTop: 12, marginBottom: 0 }}>
            The computer setting controls which keyboard shortcuts are shown. The Excel version controls whether
            newer functions such as XLOOKUP are taught as available.
          </p>
        </div>

        <div className="card">
          <h2>Levels</h2>
          <label className="field" style={{ maxWidth: 320 }}>
            Open every level up to
            <select value={settings.manualLevel} onChange={(e) => updateSettings({ manualLevel: Number(e.target.value) })}>
              {levels.map((l) => (
                <option key={l.level} value={l.level}>
                  L{l.level} {l.name}
                </option>
              ))}
            </select>
          </label>
          <p className="muted small" style={{ marginTop: 12 }}>
            Later levels also open by themselves once the earlier ones reach 80% mastery.
          </p>
          <button
            type="button"
            className="btn"
            onClick={() => {
              if (startPlacement() > 0) navigate('/session');
            }}
          >
            Take the placement diagnostic (about 10 minutes)
          </button>
        </div>

        <div className="card">
          <h2>Appearance</h2>
          <div className="seg" role="group" aria-label="Theme">
            {(['system', 'light', 'dark'] as const).map((t) => (
              <button key={t} type="button" className={settings.theme === t ? 'on' : ''} onClick={() => updateSettings({ theme: t })}>
                {t === 'system' ? 'Match my computer' : t === 'light' ? 'Light' : 'Dark'}
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <h2>Back up your progress</h2>
          <p className="muted small">
            Export saves a file with your profile, review schedule and all {attempts.toLocaleString('en-US')} logged
            answers. Import replaces what is in this browser with the contents of that file.
          </p>
          <div className="row">
            <button type="button" className="btn" onClick={downloadProgress}>
              Export progress (JSON)
            </button>
            <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
              Import progress
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => onImport(e.target.files?.[0])}
            />
          </div>
          {note && (
            <div className={`toast${note.error ? ' error' : ''}`} style={{ marginTop: 12 }} role="status">
              {note.text}
            </div>
          )}
        </div>

        <div className="card">
          <h2>Start over</h2>
          <p className="muted small">Clears your review schedule and answer log. Your profile stays. Export first if you might want it back.</p>
          <button
            type="button"
            className="btn danger"
            onClick={() => {
              if (window.confirm('Erase all progress in this browser? This cannot be undone.')) {
                resetProgress();
                setNote({ text: 'Progress cleared.', error: false });
              }
            }}
          >
            Erase all progress
          </button>
        </div>

        <p className="muted small">
          Pro Forma Gym uses HyperFormula (GPL-3.0) to evaluate formulas. That is fine for personal use; it only
          matters if you distribute the app.
        </p>
      </div>
    </div>
  );
}

/** Shown once, on first launch. */
export function Welcome() {
  const settings = useProgress((s) => s.settings);
  const updateSettings = useProgress((s) => s.updateSettings);
  const [draft, setDraft] = useState<SettingsType>(settings);
  const navigate = useNavigate();
  const finish = (placement: boolean) => {
    updateSettings({ ...draft, manualLevel: startingLevel(draft.excelComfort, draft.reComfort), onboarded: true });
    if (placement && startPlacement() > 0) navigate('/session');
  };

  return (
    <div className="modal-back" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
      <div className="modal">
        <h1 id="welcome-title">Welcome to Pro Forma Gym</h1>
        <p className="muted" style={{ marginTop: 8 }}>
          Short, mixed practice sessions for Excel and real estate modeling. Questions you miss come back soon;
          questions you know space out.
        </p>
        <p className="small muted">These are the answers you gave during setup. Change anything that is off.</p>
        <ProfileFields value={draft} onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))} />
        <div className="hints" style={{ marginTop: 16 }}>
          <strong>In every spreadsheet task</strong>
          <ul style={{ margin: '6px 0 0', paddingLeft: 20 }}>
            <li>Yellow cells are yours to fill. Grey cells are locked. Empty cells are free scratch space.</li>
            <li>Blue numbers are typed inputs, black is a formula, green links to another sheet.</li>
            <li>Grading changes the blue inputs behind the scenes, so only real formulas pass.</li>
          </ul>
        </div>
        <p className="small muted" style={{ marginTop: 14, marginBottom: 0 }}>
          A short placement quiz (12 quick questions, about 10 minutes) sets your starting level more accurately than
          the ratings above.
        </p>
        <div className="row" style={{ marginTop: 12, justifyContent: 'flex-end' }}>
          <button type="button" className="btn" onClick={() => finish(false)}>
            Skip, use my ratings
          </button>
          <button type="button" className="btn primary big" autoFocus onClick={() => finish(true)}>
            Take the placement quiz
          </button>
        </div>
      </div>
    </div>
  );
}
