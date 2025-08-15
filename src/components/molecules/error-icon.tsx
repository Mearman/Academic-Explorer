interface ErrorIconProps {
  isNotFound: boolean;
}

export function ErrorIcon({ isNotFound }: ErrorIconProps) {
  const iconClass = isNotFound 
    ? "w-16 h-16 mx-auto mb-4 text-gray-400" 
    : "w-16 h-16 mx-auto mb-4 text-red-400";

  const iconPath = isNotFound 
    ? "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
    : "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z";

  return (
    <div className={iconClass}>
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d={iconPath} />
      </svg>
    </div>
  );
}