import React from 'react';
import { Globe } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { SUPPORTED_LANGUAGES } from '../constants';
import { Language } from '../types';

const LanguageSelector: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center text-slate-600 bg-slate-50 rounded-lg px-2 py-1 border border-slate-200">
      <Globe className="w-4 h-4 mr-2 text-slate-400" />
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as Language)}
        className="bg-transparent text-sm font-medium focus:outline-none cursor-pointer"
      >
        {(Object.entries(SUPPORTED_LANGUAGES) as [Language, { name: string, flag: string }][]).map(([code, { name, flag }]) => (
          <option key={code} value={code}>
            {flag} {name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LanguageSelector;