import React, { useState } from 'react';
import ResultEntryForm from './components/ResultEntryForm.tsx';

const TestFormPage: React.FC = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Form Page</h1>
      <p className="mb-4">This is a test page to isolate the form opening issue.</p>
      
      <div className="mb-4">
        <p>Form state: {isFormOpen ? 'OPEN' : 'CLOSED'}</p>
      </div>
      
      <button
        onClick={() => {
          console.log('Test button clicked, current state:', isFormOpen);
          setIsFormOpen(true);
          console.log('Form should now be open');
        }}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mr-4"
      >
        Open Form
      </button>
      
      <button
        onClick={() => {
          console.log('Close button clicked');
          setIsFormOpen(false);
        }}
        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
      >
        Close Form
      </button>
      
      <ResultEntryForm
        isOpen={isFormOpen}
        onClose={() => {
          console.log('Form onClose called');
          setIsFormOpen(false);
        }}
        initialAcademicYear="2024/2025"
        initialTerm="first"
      />
    </div>
  );
};

export default TestFormPage;