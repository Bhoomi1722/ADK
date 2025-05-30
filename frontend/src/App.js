import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import OrchestrationDetails from './components/OrchestrationDetails';
import LoadingSpinner from './components/LoadingSpinner';
import './App.css';

const App = () => {
  const [destination, setDestination] = useState('Paris');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState(1000);
  const [interests, setInterests] = useState(['museums', 'food']);
  const [itinerary, setItinerary] = useState(null);
  const [error, setError] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:8000/api/plan-itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination, start_date: startDate, end_date: endDate, budget, interests })
      });
      if (!response.ok) throw new Error('Failed to fetch itinerary');
      const data = await response.json();
      setItinerary(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  return (
    <div className={`container mx-auto p-6 ${isDarkMode ? 'dark' : ''}`}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex justify-between items-center mb-6"
      >
        <h1 className="text-4xl font-bold text-white dark:text-gray-200">Travel Itinerary Planner</h1>
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
            <label className="block text-sm font-medium text-gray-200 dark:text-gray-300">Destination</label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="mt-1 p-3 border border-gray-300 dark:border-gray-600 rounded w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., Paris"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 dark:text-gray-300">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 p-3 border border-gray-300 dark:border-gray-600 rounded w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 dark:text-gray-300">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 p-3 border border-gray-300 dark:border-gray-600 rounded w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 dark:text-gray-300">Budget ($)</label>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="mt-1 p-3 border border-gray-300 dark:border-gray-600 rounded w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., 1000"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-200 dark:text-gray-300">Interests</label>
            <input
              type="text"
              value={interests.join(', ')}
              onChange={(e) => setInterests(e.target.value.split(',').map(i => i.trim()))}
              className="mt-1 p-3 border border-gray-300 dark:border-gray-600 rounded w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., museums, food, hiking"
            />
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSubmit}
          className="mt-4 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition w-full md:w-auto"
        >
          Plan Itinerary
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
          {itinerary?.weather && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white/10 dark:bg-gray-800/50 backdrop-blur-lg p-6 rounded-lg shadow-lg"
            >
              <h2 className="text-2xl font-semibold text-white dark:text-gray-200 mb-4">Weather Forecast</h2>
              <p className="text-gray-200 dark:text-gray-300">Destination: {itinerary.weather.destination}</p>
              <p className="text-gray-200 dark:text-gray-300">Temperature: {itinerary.weather.temperature}°C</p>
              <p className="text-gray-200 dark:text-gray-300">Humidity: {itinerary.weather.humidity}%</p>
              <p className="text-gray-200 dark:text-gray-300">Condition: {itinerary.weather.condition}</p>
              <p className="text-gray-200 dark:text-gray-300">Timestamp: {itinerary.weather.timestamp}</p>
            </motion.div>
          )}
          {itinerary?.activities && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white/10 dark:bg-gray-800/50 backdrop-blur-lg p-6 rounded-lg shadow-lg"
            >
              <h2 className="text-2xl font-semibold text-white dark:text-gray-200 mb-4">Recommended Activities</h2>
              {itinerary.activities.map((activity, index) => (
                <div key={index} className="mb-2">
                  <p className="text-gray-200 dark:text-gray-300">Activity: {activity.name}</p>
                  <p className="text-gray-200 dark:text-gray-300">Cost: ${activity.cost}</p>
                  <p className="text-gray-200 dark:text-gray-300">Weather Suitability: {activity.suitable_weather}</p>
                </div>
              ))}
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