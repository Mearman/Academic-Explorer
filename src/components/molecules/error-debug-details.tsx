interface ErrorDebugDetailsProps {
  error: Error;
}

export function ErrorDebugDetails({ error }: ErrorDebugDetailsProps) {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <details className="mt-6 text-left">
      <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
        Technical Details
      </summary>
      <pre className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded overflow-auto">
        {error.stack}
      </pre>
    </details>
  );
}