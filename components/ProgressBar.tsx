import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface ProgressBarProps {
  current: number;
  total: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ current, total }) => {
  const percentage = Math.min(100, Math.max(0, (current / total) * 100));
  const { t } = useLanguage();

  return (
    <div className="w-full mb-6">
      <div className="flex justify-between items-center mb-2 text-sm font-medium text-slate-700">
        <span>{t('progress_title')}</span>
        <span>{t('progress_step', { current, total })}</span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
        <div
          className="bg-gov-blue h-2.5 rounded-full relative overflow-hidden transition-all duration-700 ease-in-out"
          style={{ width: `${percentage}%` }}
        >
          <div className="absolute top-0 left-0 h-full w-2/3 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full animate-progress-shimmer"></div>
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;
