import React from 'react';
import { motion } from 'framer-motion';

const LoadingSpinner = () => {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      className="w-12 h-12 border-4 border-t-indigo-600 border-gray-200 dark:border-gray-600 rounded-full"
    ></motion.div>
  );
};

export default LoadingSpinner;