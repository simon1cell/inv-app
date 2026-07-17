"use client";

import { useEffect, useState } from "react";

type QuantityStepperProps = {
  value: number;
  canIncrease: boolean;
  onChange: (nextValue: number) => void;
};

export default function QuantityStepper({
  value,
  canIncrease,
  onChange,
}: QuantityStepperProps) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  function commit(rawValue: string) {
    const parsed = Number(rawValue);

    if (!Number.isInteger(parsed) || parsed < 0) {
      setDraft(String(value));
      return;
    }

    onChange(parsed);
  }

  return (
    <span className="qty">
      <button
        type="button"
        disabled={value <= 0}
        aria-label="Decrease quantity"
        onClick={() => onChange(Math.max(0, value - 1))}
      >
        −
      </button>

      <input
        value={draft}
        inputMode="numeric"
        aria-label="Quantity"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={(event) => commit(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit(event.currentTarget.value);
          }

          if (event.key === "Escape") {
            setDraft(String(value));
          }
        }}
      />

      {canIncrease && (
        <button
          type="button"
          aria-label="Increase quantity"
          onClick={() => onChange(value + 1)}
        >
          +
        </button>
      )}
    </span>
  );
}