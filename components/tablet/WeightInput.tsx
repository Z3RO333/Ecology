'use client';

const QUICK_ADD = [0.1, 0.5, 1.0, 5.0];
const MAX_CENTS = 999_999; // caps entry at 9999,99 kg

interface Props {
  value: number;
  onChange: (v: number) => void;
}

function toCents(v: number): number {
  return Math.round(v * 100);
}

function formatCents(cents: number): string {
  const whole = Math.floor(cents / 100);
  const decimals = String(cents % 100).padStart(2, '0');
  return `${whole},${decimals}`;
}

export function WeightInput({ value, onChange }: Props) {
  const cents = toCents(value);
  const display = formatCents(cents);

  const setCents = (next: number) => {
    onChange(Math.max(0, Math.min(next, MAX_CENTS)) / 100);
  };

  // Digits fill from the right like a currency/scale keypad: each new digit
  // pushes the previous ones left instead of landing wherever the cursor is.
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawDigits = e.target.value.replace(/\D/g, '');
    const currentDigits = String(cents);
    if (rawDigits.length > currentDigits.length) {
      setCents(cents * 10 + Number(rawDigits[rawDigits.length - 1]));
    } else if (rawDigits.length < currentDigits.length) {
      setCents(Math.floor(cents / 10));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      setCents(Math.floor(cents / 10));
    }
  };

  return (
    <div>
      <p className="text-lg font-bold text-green-800 mb-3">3. Peso (kg) *</p>
      <input type="hidden" name="weight_kg" value={value} />
      <div className="bg-white border-2 border-gray-200 rounded-2xl p-5 text-center">
        <input
          type="text"
          inputMode="numeric"
          aria-label="Peso em quilogramas"
          value={display}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="0,00"
          className="w-full text-6xl font-bold text-center text-gray-900 outline-none"
        />
      </div>
      <div className="grid grid-cols-4 gap-3 mt-3">
        {QUICK_ADD.map((inc) => (
          <button
            key={inc}
            type="button"
            onClick={() => onChange(Math.round((value + inc) * 100) / 100)}
            className="bg-gray-100 active:bg-green-100 text-gray-700 text-xl font-semibold py-5 rounded-xl transition-colors"
          >
            +{inc.toString().replace('.', ',')}
          </button>
        ))}
      </div>
    </div>
  );
}
