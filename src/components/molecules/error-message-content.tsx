interface ErrorMessageContentProps {
  isNotFound: boolean;
  isNetworkError: boolean;
  entityType?: string;
  entityId?: string;
}

export function ErrorMessageContent({ 
  isNotFound, 
  isNetworkError, 
  entityType, 
  entityId 
}: ErrorMessageContentProps) {
  const getTitle = () => {
    if (isNotFound) {
      const entityName = entityType ? entityType.charAt(0).toUpperCase() + entityType.slice(1, -1) : 'Entity';
      return `${entityName} Not Found`;
    }
    return 'Something Went Wrong';
  };

  const getDescription = () => {
    if (isNotFound) {
      const entityName = entityType ? entityType.slice(0, -1) : 'entity';
      return (
        <>
          The {entityName}
          {entityId && (
            <> with ID <code className="bg-gray-100 px-1 rounded">{entityId}</code></>
          )} could not be found.
        </>
      );
    }
    
    if (isNetworkError) {
      return 'There was a problem connecting to the OpenAlex API. Please check your internet connection and try again.';
    }
    
    return 'An unexpected error occurred while loading this page. This might be a temporary issue.';
  };

  return (
    <>
      <h1 className="text-xl font-semibold text-gray-900 mb-2">
        {getTitle()}
      </h1>
      <p className="text-gray-600 mb-6">
        {getDescription()}
      </p>
    </>
  );
}