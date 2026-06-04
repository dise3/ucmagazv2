import React from 'react';

interface IosSwitchProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
}

const IosSwitch: React.FC<IosSwitchProps> = ({ checked, onChange, disabled }) => (
    <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={(e) => {
            e.stopPropagation();
            if (!disabled) onChange(!checked);
        }}
        className={`relative inline-flex h-[31px] w-[51px] shrink-0 items-center rounded-full transition-colors duration-200 ${
            checked ? 'bg-[#34c759]' : 'bg-white/20'
        } ${disabled ? 'opacity-50' : ''}`}
    >
        <span
            className={`inline-block h-[27px] w-[27px] transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                checked ? 'translate-x-[22px]' : 'translate-x-[2px]'
            }`}
        />
    </button>
);

export default IosSwitch;
