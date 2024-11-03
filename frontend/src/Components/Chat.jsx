import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import html2pdf from 'html2pdf.js';

function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [activeDocuments, setActiveDocuments] = useState([]);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const clearMemory = async () => {
    try {
      const response = await axios.post('http://localhost:8000/clear-memory');
      setActiveDocuments([]);
      alert('Minnet har rensats. Du kan nu ladda upp nya dokument.');
    } catch (error) {
      console.error('Error clearing memory:', error);
    }
  };

  const handleFileChange = (e) => {
    setFile(Array.from(e.target.files));
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (file && file.length > 0) {
      setUploading(true);
      try {
        for (const singleFile of file) {
          const formData = new FormData();
          formData.append('file', singleFile);
          const response = await axios.post('http://localhost:8000/upload-pdf', formData);
          setActiveDocuments(response.data.active_documents);
        }
        setFile(null);
        const fileInput = document.querySelector('input[type="file"]');
        if (fileInput) fileInput.value = '';
      } catch (error) {
        console.error('Error uploading PDFs:', error);
        alert('Ett fel uppstod vid uppladdning av dokumenten.');
      } finally {
        setUploading(false);
      }
    }

    if (input.trim()) {
      const userMessage = { text: input, user: true };
      setMessages(prevMessages => [...prevMessages, userMessage]);
      setInput('');

      try {
        const response = await axios.post('http://localhost:8000/chat', { message: input });
        const botMessage = { text: response.data.response, user: false };
        setMessages(prevMessages => [...prevMessages, botMessage]);
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const saveChat = () => {
    const chatContent = document.getElementById('chat-content');
    const opt = {
      margin: 1,
      filename: 'chat-historik.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(chatContent).save();
  };

  const removeFile = (indexToRemove) => {
    setFile(prevFiles => {
      const newFiles = prevFiles.filter((_, index) => index !== indexToRemove);
      if (newFiles.length === 0) {
        const fileInput = document.querySelector('input[type="file"]');
        if (fileInput) fileInput.value = '';
      }
      return newFiles;
    });
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="flex flex-col h-[800px]">
      <div className="bg-gray-100 p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Aktiva dokument:</h2>
          <div className="flex gap-2">
            <button
              onClick={clearMemory}
              className="bg-red-500 text-white px-4 py-2 rounded-full hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Rensa alla dokument
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {activeDocuments.map((doc, index) => (
            <span
              key={index}
              className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
            >
              {doc}
            </span>
          ))}
          {activeDocuments.length === 0 && (
            <span className="text-gray-500 italic">
              Inga aktiva dokument
            </span>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4" id="chat-content">
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.user ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${message.user ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
              {message.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="bg-gray-50 px-4 py-2 border-t border-gray-200">
        <div className="flex justify-end gap-2 mb-2">
          <button
            onClick={clearChat}
            className="text-gray-600 hover:text-red-600 text-sm font-medium"
          >
            Rensa chatten
          </button>
          <button
            onClick={saveChat}
            className="text-gray-600 hover:text-blue-600 text-sm font-medium"
          >
            Spara som PDF
          </button>
        </div>
      </div>
      
      <div className="border-t p-4">
        {file && file.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {file.map((f, index) => (
              <div key={index} className="flex items-center bg-gray-100 rounded-full px-3 py-1">
                <span className="text-sm text-gray-600">{f.name}</span>
                <button
                  onClick={() => removeFile(index)}
                  className="ml-2 text-gray-500 hover:text-red-500"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={sendMessage} className="flex items-end gap-4">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(e);
                }
              }}
              rows="1"
              className="w-full border rounded-xl px-4 py-3 pr-24 resize-none overflow-hidden min-h-[48px] outline-none"
              placeholder="Skriv ditt meddelande..."
              style={{ lineHeight: '1.0' }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
            />
            <div className="absolute right-3 top-1.5 flex items-center gap-1">
              <button
                type="button"
                onClick={triggerFileInput}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 flex items-center justify-center"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  strokeWidth={1.5} 
                  stroke="currentColor" 
                  className="w-5 h-5"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" 
                  />
                </svg>
              </button>
              {input.trim() && (
                <button
                  type="submit"
                  className="p-2 rounded-full hover:bg-gray-100 text-blue-500 hover:text-blue-600 flex items-center justify-center"
                  aria-label="Skicka meddelande"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    strokeWidth={2} 
                    stroke="currentColor" 
                    className="w-5 h-5"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" 
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Chat;