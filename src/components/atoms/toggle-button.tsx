interface ToggleButtonProps {
  isCollapsed: boolean;
  onToggle: (collapsed: boolean) => void;
  className?: string;
  expandedText?: string;
  collapsedText?: string;
}

export function ToggleButton({ 
  isCollapsed, 
  onToggle, 
  className = '',
  expandedText = 'Hide Advanced Options',
  collapsedText = 'Show Advanced Options'
}: ToggleButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onToggle(!isCollapsed)}
      className={className}
      aria-expanded={!isCollapsed}
    >
      {isCollapsed ? collapsedText : expandedText}
    </button>
  );
}