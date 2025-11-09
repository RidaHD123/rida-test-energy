import React, { useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { EligibilityResult, UserAnswers, AidSchemeResult, IncomeProfile } from '../types';
import { CheckCircle2, XCircle, RefreshCcw, Printer, FileText, ShieldCheck } from 'lucide-react';
import { DEPARTMENT_DB } from '../constants';

interface ResultReportProps {
  result: EligibilityResult;
  answers: UserAnswers;
  onRestart: () => void;
}

const ResultReport: React.FC<ResultReportProps> = ({ result, answers, onRestart }) => {
  const { t } = useLanguage();
  const reportRef = useRef<HTMLDivElement>(null);

  // GENERATE COMPLETE TXT CONTENT including Personal Data
  const handleDownloadTxt = () => {
      let txt = `${t('report.title')}\n=======================\n\n`;
      txt += `${t('report.id')} ${Math.random().toString(36).substr(2, 9).toUpperCase()}\n`;
      txt += `Date: ${new Date().toLocaleDateString()}\n\n`;

      txt += `[ ${t('report.personal')} ]\n`;
      txt += `${t('sidebar.fname')}: ${answers.firstName || 'N/A'}\n`;
      txt += `${t('sidebar.lname')}: ${answers.lastName || 'N/A'}\n`;
      txt += `${t('sidebar.phone')}: ${answers.phone || 'N/A'}\n`;
      txt += `${t('sidebar.email')}: ${answers.email || 'N/A'}\n`;
      txt += `${t('sidebar.address')}: ${answers.address || 'N/A'}\n`;
      txt += `${t('sidebar.cp')}: ${answers.postalCode || 'N/A'} (${answers.city || 'N/A'})\n\n`;

      txt += `[ ${t('report.profile')} ]\n`;
      txt += `- ${t('report.zone')} ${result.climateZone}\n`;
      txt += `- ${t('report.income_cat')} ${result.incomeProfile}\n`;
      txt += `\n-----------------------\n`;
      txt += `RÉSULTAT GLOBAL: ${result.isGlobalEligible ? t('report.eligible_global') : t('report.ineligible_global')}\n`;
      txt += `-----------------------\n\n`;

      Object.entries(result.schemes).forEach(([key, scheme]) => {
          const s = scheme as AidSchemeResult;
          txt += `\n>>> ${t(s.schemeNameKey).toUpperCase()} <<<\n`;
          txt += `Status: ${s.eligible ? 'ÉLIGIBLE ✅' : 'NON ÉLIGIBLE ❌'}\n`;
          txt += `Détails de la décision :\n`;
          s.reasons.forEach(r => txt += ` - ${t(r)}\n`);
          txt += `\n`;
      });

      txt += `\n=======================\nDocument généré officiellement via France Rénov' Simulator 2025.\n`;

      const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Rapport_Eligibilite_${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const getProfileColor = (p: IncomeProfile) => {
      switch(p) {
          case IncomeProfile.BLUE: return 'bg-blue-600 text-white';
          case IncomeProfile.YELLOW: return 'bg-yellow-500 text-white';
          case IncomeProfile.VIOLET: return 'bg-purple-500 text-white';
          case IncomeProfile.PINK: return 'bg-pink-500 text-white';
          default: return 'bg-slate-500 text-white';
      }
  };

  return (
    <div className="animate-fade-in w-full pb-12">
        {/* ACTIONS BAR */}
        <div className="flex justify-end mb-6 space-x-4 no-print">
            <button onClick={handleDownloadTxt} className="flex items-center px-4 py-2 bg-white border-2 border-slate-200 rounded-lg font-bold text-slate-700 hover:border-gov-blue hover:text-gov-blue transition-all shadow-sm">
                <FileText className="w-5 h-5 mr-2" /> {t('btn.download_txt')}
            </button>
            <button onClick={() => window.print()} className="flex items-center px-4 py-2 bg-gov-blue text-white rounded-lg font-bold hover:bg-blue-800 transition-all shadow-sm">
                <Printer className="w-5 h-5 mr-2" /> Imprimer / PDF
            </button>
        </div>

        <div ref={reportRef} className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 print:shadow-none print:border-none">
            {/* OFFICIAL HEADER */}
            <div className="bg-slate-50 p-8 border-b-2 border-gov-blue/20 flex flex-col md:flex-row justify-between items-start md:items-center">
                <div>
                    <div className="flex items-center space-x-2 text-gov-blue mb-2">
                        <ShieldCheck className="w-6 h-6" />
                        <span className="font-bold tracking-widest uppercase text-sm">République Française</span>
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-900">{t('report.title')}</h1>
                    <p className="text-slate-500 mt-1 font-medium">{t('report.id')} <span className="font-mono bg-slate-200 px-2 py-0.5 rounded">{Math.random().toString(36).substr(2, 9).toUpperCase()}</span></p>
                </div>
                <div className="mt-6 md:mt-0 flex flex-col items-end space-y-2">
                    <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-slate-500 uppercase">{t('report.zone')}</span>
                        <span className="px-3 py-1 bg-slate-800 text-white font-bold rounded">{result.climateZone}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-slate-500 uppercase">{t('report.income_cat')}</span>
                        <span className={`px-3 py-1 font-bold rounded ${getProfileColor(result.incomeProfile)}`}>{result.incomeProfile}</span>
                    </div>
                </div>
            </div>

            {/* GLOBAL VERDICT */}
            <div className={`p-6 text-center text-white font-bold text-xl uppercase tracking-wider ${result.isGlobalEligible ? 'bg-green-600' : 'bg-slate-700'}`}>
                {result.isGlobalEligible ? t('report.eligible_global') : t('report.ineligible_global')}
            </div>

            {/* SCHEME DETAILS */}
            <div className="p-8 space-y-8">
                {Object.entries(result.schemes).map(([key, scheme]) => {
                     const s = scheme as AidSchemeResult;
                     return (
                         <div key={key} className={`rounded-2xl border-2 overflow-hidden ${s.eligible ? 'border-green-500/30 bg-green-50/50' : 'border-slate-200 bg-slate-50/50'}`}>
                             <div className={`px-6 py-4 flex justify-between items-center ${s.eligible ? 'bg-green-100/50 text-green-800' : 'bg-slate-100 text-slate-700'}`}>
                                 <h3 className="text-xl font-extrabold flex items-center">
                                     {s.eligible ? <CheckCircle2 className="w-6 h-6 mr-3 text-green-600" /> : <XCircle className="w-6 h-6 mr-3 text-slate-400" />}
                                     {t(s.schemeNameKey)}
                                 </h3>
                                 {s.eligible && <span className="px-3 py-1 bg-green-600 text-white text-xs font-bold uppercase rounded-full tracking-wider">Éligible</span>}
                             </div>
                             <div className="p-6">
                                 <ul className="space-y-3">
                                     {s.reasons.map((r, idx) => (
                                         <li key={idx} className="flex items-start">
                                             <span className="mr-3 mt-1 text-lg">{t(r).startsWith('✅') ? '✅' : '❌'}</span>
                                             <span className={`font-medium ${t(r).startsWith('✅') ? 'text-slate-700' : 'text-red-700'}`}>
                                                 {t(r).substring(2).trim()}
                                             </span>
                                         </li>
                                     ))}
                                 </ul>
                             </div>
                         </div>
                     );
                })}
            </div>

            {/* FOOTER */}
            <div className="bg-slate-50 p-6 border-t border-slate-200 text-center">
                <button onClick={onRestart} className="no-print inline-flex items-center px-6 py-3 bg-white border-2 border-slate-300 rounded-xl font-bold text-slate-600 hover:border-gov-blue hover:text-gov-blue transition-colors">
                    <RefreshCcw className="mr-2 w-5 h-5"/> {t('btn.restart')}
                </button>
                <p className="mt-6 text-xs text-slate-400 uppercase tracking-widest print:block">Document généré officiellement - France Rénov' 2025</p>
            </div>
        </div>
    </div>
  );
};

export default ResultReport;