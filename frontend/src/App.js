import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import OrchestrationDetails from './components/OrchestrationDetails';
import LoadingSpinner from './components/LoadingSpinner';
import './App.css';

const App = () => {
  const [ticker, setTicker] = useState('ADM');
  const [location, setLocation] = useState('Chicago');
  const [weather, setWeather] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState(null);
  const [ws, setWs] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const connectWebSocket = () => {
    const websocket = new WebSocket('ws://localhost:8000/ws/predict');
    setWs(websocket);

    websocket.onopen = () => {
      console.log('WebSocket connected');
      websocket.send(JSON.stringify({ ticker, location }));
      setIsLoading(true);
      setError(null);
    };

    websocket.onmessage = (event) => {
      setIsLoading(false);
      try {
        const data = JSON.parse(event.data);
        if (data.weather) setWeather(data.weather);
        if (data.prediction) setPrediction(data.prediction);
        if (data.status === 'error') setError(data.error_message);
      } catch (e) {
        setError('Failed to parse server response');
      }
    };

    websocket.onclose = () => {
      console.log('WebSocket closed, attempting to reconnect...');
      setError('WebSocket connection closed. Reconnecting...');
      setTimeout(connectWebSocket, 5000); // Reconnect after 5 seconds
    };

    websocket.onerror = (event) => {
      console.error('WebSocket error:', event);
      setError('WebSocket connection failed');
      websocket.close();
    };
  };

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (ws) ws.close();
    };
  }, []);

  const handleSubmit = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      setIsLoading(true);
      setError(null);
      ws.send(JSON.stringify({ ticker, location }));
    } else {
      setError('WebSocket not connected. Reconnecting...');
      connectWebSocket();
    }
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <div className={`container mx-auto p-6 ${isDarkMode ? 'dark' : ''}`}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex justify-between items-center mb-6"
      >
        <h1 className="text-4xl font-bold text-white dark:text-gray-200">Stock Price Predictor</h1>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
        >
          {isDarkMode ? '☀️ Light' : '🌙 Dark'}
        </button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="bg-white/10 dark:bg-gray-800/50 backdrop-blur-lg p-6 rounded-lg shadow-lg mb-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-200 dark:text-gray-300">Ticker Symbol</label>
            <input
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              className="mt-1 p-3 border border-gray-300 dark:border-gray-600 rounded w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., ADM"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 dark:text-gray-300">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-1 p-3 border border-gray-300 dark:border-gray-600 rounded w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., Chicago"
            />
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSubmit}
          className="mt-4 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition w-full md:w-auto"
        >
          Get Prediction
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex justify-center mb-6"
          >
            <LoadingSpinner />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AnimatePresence>
          {weather && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white/10 dark:bg-gray-800/50 backdrop-blur-lg p-6 rounded-lg shadow-lg"
            >
              <h2 className="text-2xl font-semibold text-white dark:text-gray-200 mb-4">Weather Data</h2>
              <p className="text-gray-200 dark:text-gray-300">Location: {weather.location}</p>
              <p className="text-gray-200 dark:text-gray-300">Temperature: {weather.temperature}°C</p>
              <p className="text-gray-200 dark:text-gray-300">Humidity: {weather.humidity}%</p>
              <p className="text-gray-200 dark:text-gray-300">Condition: {weather.weather_condition}</p>
              <p className="text-gray-200 dark:text-gray-300">Timestamp: {weather.timestamp}</p>
            </motion.div>
          )}
          {prediction && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white/10 dark:bg-gray-800/50 backdrop-blur-lg p-6 rounded-lg shadow-lg"
            >
              <h2 className="text-2xl font-semibold text-white dark:text-gray-200 mb-4">Stock Prediction</h2>
              <p className="text-gray-200 dark:text-gray-300">Ticker: {prediction.ticker}</p>
              <p className="text-gray-200 dark:text-gray-300">Predicted Price: ${prediction.predicted_price}</p>
              <p className="text-gray-200 dark:text-gray-300">Timestamp: {prediction.timestamp}</p>
            </motion.div>
          )}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-red-100/50 dark:bg-red-900/50 backdrop-blur-lg p-6 rounded-lg shadow-lg col-span-1 md:col-span-2"
            >
              <p className="text-red-700 dark:text-red-300">Error: {error}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="mt-6"
      >
        <OrchestrationDetails />
      </motion.div>
    </div>
  );
};

export default App;