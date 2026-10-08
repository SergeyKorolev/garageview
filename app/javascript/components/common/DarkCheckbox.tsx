interface DarkCheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  disabled?: boolean;
  size?: number;
}

export default function DarkCheckbox({ checked, indeterminate, onChange, disabled, size = 16 }: DarkCheckboxProps) {
  const isActive = checked || indeterminate;
  return (
    <div
      onClick={(e) => { e.stopPropagation(); if (!disabled) onChange(); }}
      style={{
        width: size,
        height: size,
        borderRadius: 4,
        border: `1.5px solid ${isActive ? "#22c55e" : "#4b5563"}`,
        backgroundColor: isActive ? "#22c55e" : "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.4 : 1,
        transition: "all 0.15s",
        flexShrink: 0,
      }}
    >
      {checked && !indeterminate && (
        <svg width={size - 6} height={size - 6} viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 5.5L4 7.5L8 3" />
        </svg>
      )}
      {indeterminate && (
        <svg width={size - 6} height={size - 6} viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round">
          <path d="M2 5H8" />
        </svg>
      )}
    </div>
  );
}
