import React from 'react';
import UniversalErrorPage from './UniversalErrorPage';

const ServerDownPage = ({ 
  statusCode = 503, 
  errorTitle = null, 
  errorMessage = null, 
  onRetry = null 
}) => {
  return (
    <UniversalErrorPage
      code={statusCode}
      customTitle={errorTitle}
      customMessage={errorMessage}
      onRetry={onRetry}
    />
  );
};

export default ServerDownPage;
