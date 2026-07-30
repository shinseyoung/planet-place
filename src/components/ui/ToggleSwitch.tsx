import { cn } from '../../lib/utils';

export const ToggleSwitch = ({ checked, onChange }: { checked: boolean, onChange: () => void }) => (
  <button
    onClick={onChange}
    className={cn(
      "w-8 h-4 rounded-full transition-colors relative focus:outline-none shrink-0",
      checked ? "bg-blue-600" : "bg-gray-700"
    )}
  >
    <div className={cn(
      "w-3 h-3 bg-white rounded-full absolute top-0.5 transition-transform",
      checked ? "translate-x-4.5" : "translate-x-0.5"
    )} />
  </button>
);