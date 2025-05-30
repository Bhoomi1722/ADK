import React from 'react';
import { motion } from 'framer-motion';

const OrchestrationDetails = () => {
  const steps = [
    {
      name: 'Weather Agent',
      description: 'Fetches weather forecast for the destination using OpenWeatherMap API via MCP.',
      status: 'Completed',
    },
    {
      name: 'Activity Agent',
      description: 'Suggests activities based on weather, user interests, and budget constraints.',
      status: 'Completed',
    },
    {
      name: 'Orchestrator Agent',
      description: 'Coordinates weather and activity agents to create a personalized travel itinerary.',
      status: 'Completed',
    },
  ];

  return (
    <div className="bg-white/10 dark:bg-gray-800/50 backdrop-blur-lg p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-semibold text-white dark:text-gray-200 mb-4">Orchestration Workflow</h2>
      <div className="space-y-4">
        {steps.map((step, index) => (
          <motion.div
            key={step.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: index * 0.2 }}
            className="flex items-start space-x-4"
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white">
              {index + 1}
            </div>
            <div>
              <h3 className="text-lg font-medium text-white dark:text-gray-200">{step.name}</h3>
              <p className="text-gray-200 dark:text-gray-300">{step.description}</p>
              <p className="text-sm text-green-400">Status: {step.status}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default OrchestrationDetails;