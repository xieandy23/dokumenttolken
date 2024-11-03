import React from 'react';
import Chat from './components/Chat';

function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-xl overflow-hidden">
        <header className="bg-blue-600 text-white p-4">
          <h1 className="text-2xl font-bold">Dokument Tolken</h1>
        </header>
        <Chat />
      </div>
    </div>
  );
}

export default App;