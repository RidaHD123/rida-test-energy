import React, { useState, useEffect } from 'react';
import { useLanguage } from './contexts/LanguageContext';
import { calculateEligibility } from './services/eligibilityService';
import { UserAnswers, EligibilityResult, QuestionConfig, IncomeProfile, ClimateZone } from './types';
import { QUESTIONS, INCOME_CEILINGS_2025, DEPARTMENT_DB, ZONE_H1_DEPTS, ZONE_H2_DEPTS, ZONE_H3_DEPTS } from './constants';
import ProgressBar from './components/ProgressBar';
import LanguageSelector from './components/LanguageSelector';
import ResultReport from './components/ResultReport';
import { ChevronRight, ChevronLeft, Calculator, Table, XCircle, Map, MapPin, UserCircle } from 'lucide-react';

function App() {
  const { t, language } = useLanguage();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1); // -1 = Start Screen
  const [answers, setAnswers] = useState<UserAnswers>({});
  const [result, setResult] = useState<EligibilityResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showZonesModal, setShowZonesModal] = useState(false);

  // Filter relevant questions based on current answers
  const relevantQuestions = QUESTIONS.filter(q => !q.condition || q.condition(answers));
  const currentQuestion = relevantQuestions[currentQuestionIndex];
  const totalSteps = relevantQuestions.length;

  // Postal Code Auto-Lookup Effect
  useEffect(() => {
      if (answers.postalCode && answers.postalCode.length >= 2) {
          const deptCode = answers.postalCode.substring(0, 2).toUpperCase();
          const deptData = DEPARTMENT_DB[deptCode];
          if (deptData) {
              setAnswers(prev => ({
                  ...prev,
                  department: deptCode,
                  city: deptData.name, // Using Dept Name as City placeholder if full city DB is too large, typically sufficient for Zone detection.
                  // real city lookup would require a 36k line DB.
              }));
          }
      }
  }, [answers.postalCode]);

  const getDetectedZone = (): string => {
       if (!answers.department) return '---';
       return DEPARTMENT_DB[answers.department]?.zone || '---';
  };

  const handleStart = () => setCurrentQuestionIndex(0);

  const handleNext = async () => {
    if (currentQuestionIndex < relevantQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setLoading(true);
      const res = await calculateEligibility(answers);
      setResult(res);
      setLoading(false);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    } else {
      setCurrentQuestionIndex(-1); // Back to start
    }
  };

  const handleAnswer = (value: any, qId?: keyof UserAnswers) => {
    const id = qId || (currentQuestion ? currentQuestion.id : undefined);
    if (!id) return;

    setAnswers(prev => ({ ...prev, [id]: value }));
    // Auto-advance for radio/select if it's the current main question
    if (currentQuestion && id === currentQuestion.id && (currentQuestion.type === 'radio' || currentQuestion.type === 'select')) {
        setTimeout(handleNext, 250); // slight delay for UX
    }
  };

  const handleRestart = () => {
    // Keep personal info, reset technical answers? Or full reset?
    // Usually better to keep personal info in a persistent sidebar session.
    // Let's reset technical answers only.
    const personal = {
        firstName: answers.firstName,
        lastName: answers.lastName,
        phone: answers.phone,
        email: answers.email,
        address: answers.address,
        postalCode: answers.postalCode,
        city: answers.city,
        department: answers.department,
    };
    setAnswers(personal);
    setResult(null);
    setCurrentQuestionIndex(-1);
  };

  const isCurrentAnswerValid = () => {
      if (!currentQuestion) return false;
      const val = answers[currentQuestion.id];
      if (currentQuestion.type === 'number') {
          return typeof val === 'number' && val >= (currentQuestion.min || 0) && val <= (currentQuestion.max || 999999999);
      }
      return val !== undefined && val !== '' && val !== null;
  };

  // --- RENDER HELPERS ---
  const renderQuestionInput = (q: QuestionConfig) => {
      const val = answers[q.id];
      switch (q.type) {
          case 'radio':
          case 'select':
              return (
                  <div className="grid gap-3">
                      {q.options?.map(opt => {
                          const Icon = opt.icon;
                          const isSelected = val === opt.value;
                          return (
                              <button
                                  key={String(opt.value)}
                                  onClick={() => handleAnswer(opt.value)}
                                  className={`flex items-center p-4 rounded-xl border-2 text-left transition-all ${isSelected ? 'border-gov-blue bg-blue-50 text-gov-blue shadow-md' : 'border-slate-200 hover:border-gov-blue/50 hover:bg-slate-50'}`}
                              >
                                  {Icon && <div className={`p-2 mr-4 rounded-full ${isSelected ? 'bg-gov-blue text-white' : 'bg-slate-100 text-slate-500'}`}><Icon size={20}/></div>}
                                  <span className="font-medium text-lg">{t(opt.labelKey)}</span>
                              </button>
                          )
                      })}
                  </div>
              );
          case 'number':
          case 'department':
              return (
                  <div className="mt-4">
                      <div className="flex items-center border-2 border-slate-300 rounded-xl focus-within:border-gov-blue focus-within:ring-4 focus-within:ring-blue-100 transition-all overflow-hidden bg-white">
                          <input
                              type={q.type === 'number' ? 'number' : 'text'}
                              value={val?.toString() ?? ''}
                              onChange={(e) => handleAnswer(q.type === 'number' ? parseFloat(e.target.value) : e.target.value, q.id)}
                              placeholder={q.placeholderKey ? t(q.placeholderKey) : ''}
                              className="w-full p-4 text-2xl font-bold text-gov-blue focus:outline-none"
                              min={q.min} max={q.max}
                          />
                          {q.suffixKey && <div className="bg-slate-100 text-slate-500 px-4 py-4 font-medium border-l border-slate-200">{q.suffixKey}</div>}
                      </div>
                      {q.infoKey && <p className="mt-3 text-sm text-slate-500 flex items-center"><div className="w-4 h-4 mr-2 bg-gov-blue/10 text-gov-blue rounded-full flex items-center justify-center font-bold">i</div>{t(q.infoKey)}</p>}
                  </div>
              );
          default: return null;
      }
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 flex flex-col">
      {/* GOVERNMENT HEADER */}
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-30">
          <div className="h-1.5 w-full flex">
              <div className="h-full w-1/3 bg-gov-blue"></div>
              <div className="h-full w-1/3 bg-gov-white"></div>
              <div className="h-full w-1/3 bg-gov-red"></div>
          </div>
          <div className="w-full px-4 py-4 flex justify-between items-center">
             <div className="flex items-center space-x-3">
                 <div className="p-2 bg-gov-blue text-white rounded-lg"><Calculator /></div>
                 <div>
                     <h1 className="text-xl font-extrabold text-gov-blue tracking-tight uppercase">{t('app.title')}</h1>
                     <p className="text-xs text-slate-500 font-medium hidden sm:block">{t('header.subtitle')}</p>
                 </div>
             </div>
             <div className="flex items-center space-x-3">
                 <button onClick={() => setShowZonesModal(true)} className="hidden md:flex items-center px-3 py-2 text-sm font-medium text-gov-blue bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                     <Map size={16} className="mr-2"/>
                     {t('btn.view_zones')}
                 </button>
                 <button onClick={() => setShowIncomeModal(true)} className="hidden md:flex items-center px-3 py-2 text-sm font-medium text-gov-blue bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                     <Table size={16} className="mr-2"/>
                     {t('btn.view_income')}
                 </button>
                 <LanguageSelector />
             </div>
          </div>
      </header>

      {/* MAIN LAYOUT WITH SIDEBAR */}
      <div className="flex-grow flex flex-col md:flex-row">
          {/* PERSISTENT SIDEBAR */}
          <aside className="w-full md:w-80 lg:w-96 bg-white border-r border-slate-200 p-6 flex-shrink-0 md:sticky md:top-[73px] md:h-[calc(100vh-73px)] overflow-y-auto">
              <div className="flex items-center space-x-2 mb-6 text-gov-blue">
                  <UserCircle className="w-6 h-6" />
                  <h2 className="text-lg font-extrabold uppercase tracking-wider">{t('sidebar.title')}</h2>
              </div>
              <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('sidebar.fname')}</label>
                          <input type="text" value={answers.firstName || ''} onChange={e => handleAnswer(e.target.value, 'firstName')} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:border-gov-blue focus:ring-2 focus:ring-blue-100 outline-none transition-all" />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('sidebar.lname')}</label>
                          <input type="text" value={answers.lastName || ''} onChange={e => handleAnswer(e.target.value, 'lastName')} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:border-gov-blue focus:ring-2 focus:ring-blue-100 outline-none transition-all" />
                      </div>
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('sidebar.phone')}</label>
                      <input type="tel" value={answers.phone || ''} onChange={e => handleAnswer(e.target.value, 'phone')} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:border-gov-blue focus:ring-2 focus:ring-blue-100 outline-none transition-all" />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('sidebar.email')}</label>
                      <input type="email" value={answers.email || ''} onChange={e => handleAnswer(e.target.value, 'email')} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:border-gov-blue focus:ring-2 focus:ring-blue-100 outline-none transition-all" />
                  </div>

                  <hr className="border-slate-100 my-4"/>

                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('sidebar.address')}</label>
                      <input type="text" value={answers.address || ''} onChange={e => handleAnswer(e.target.value, 'address')} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:border-gov-blue focus:ring-2 focus:ring-blue-100 outline-none transition-all" />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                       <div className="col-span-1">
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('sidebar.cp')}</label>
                          <input
                              type="text"
                              maxLength={5}
                              value={answers.postalCode || ''}
                              onChange={e => handleAnswer(e.target.value, 'postalCode')}
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:border-gov-blue focus:ring-2 focus:ring-blue-100 outline-none transition-all font-mono font-bold"
                          />
                      </div>
                      <div className="col-span-2">
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('sidebar.city')}</label>
                          <input type="text" value={answers.city || ''} readOnly className="w-full p-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed font-medium" />
                      </div>
                  </div>
                   <div className={`p-3 rounded-lg flex items-center justify-between ${getDetectedZone() !== '---' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                       <span className="text-xs font-bold uppercase">{t('sidebar.zone')}</span>
                       <span className="font-extrabold text-lg flex items-center"><MapPin size={16} className="mr-1"/> {getDetectedZone()}</span>
                   </div>
              </div>
          </aside>

          {/* MAIN CONTENT AREA */}
          <main className="flex-grow flex flex-col justify-start py-8 px-4 md:px-8">
            <div className="max-w-2xl w-full mx-auto">
              {result ? (
                 <ResultReport result={result} answers={answers} onRestart={handleRestart} />
              ) : currentQuestionIndex === -1 ? (
                // START SCREEN
                <div className="bg-white rounded-3xl shadow-xl p-8 sm:p-12 text-center animate-fade-in border border-slate-100 mt-8">
                   <div className="w-24 h-24 bg-gov-blue/5 rounded-full flex items-center justify-center mx-auto mb-8">
                       <img src="https://www.gouvernement.fr/sites/default/files/static_assets/marianne.png" alt="Marianne" className="w-16 opacity-80" />
                   </div>
                   <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-6">{t('app.title')}</h2>
                   <p className="text-lg text-slate-600 mb-10 leading-relaxed max-w-lg mx-auto">{t('header.subtitle')}</p>
                   <button onClick={handleStart} className="w-full sm:w-auto px-10 py-4 bg-gov-blue text-white text-xl font-bold rounded-2xl hover:bg-blue-800 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center mx-auto">
                       {t('btn.start')} <ChevronRight className="ml-3" />
                   </button>
                </div>
              ) : (
                // WIZARD
                <div className="bg-white rounded-3xl shadow-xl overflow-hidden animate-fade-in border border-slate-100 mt-4">
                   <div className="px-8 pt-8 pb-0">
                       <ProgressBar current={currentQuestionIndex + 1} total={totalSteps} />
                   </div>
                   <div className="p-8 sm:p-12 min-h-[350px] flex flex-col">
                       {currentQuestion && (
                           <div key={currentQuestion.id} className="animate-fade-in flex-grow">
                               <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-8 leading-tight">{t(currentQuestion.questionKey)}</h3>
                               {renderQuestionInput(currentQuestion)}
                           </div>
                       )}
                   </div>
                   <div className="bg-slate-50 p-6 flex justify-between border-t border-slate-100">
                       <button onClick={handlePrev} className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors flex items-center">
                           <ChevronLeft className="mr-2" /> {t('btn.prev')}
                       </button>
                       <button
                           onClick={handleNext}
                           disabled={!isCurrentAnswerValid() || loading}
                           className={`px-8 py-3 font-bold rounded-xl transition-all flex items-center ${isCurrentAnswerValid() ? 'bg-gov-blue text-white hover:bg-blue-800 shadow-md' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                       >
                           {loading ? <div className="animate-spin w-6 h-6 border-4 border-white/30 border-t-white rounded-full"/> : <>{currentQuestionIndex === totalSteps - 1 ? t('btn.calculate') : t('btn.next')} <ChevronRight className="ml-2" /></>}
                       </button>
                   </div>
                </div>
              )}
            </div>
          </main>
      </div>

      {/* MODALS */}
      {showIncomeModal && <IncomeModal onClose={() => setShowIncomeModal(false)} />}
      {showZonesModal && <ZonesModal onClose={() => setShowZonesModal(false)} />}
    </div>
  );
}

// --- MODAL COMPONENTS ---

const IncomeModal = ({ onClose }: { onClose: () => void }) => {
    const { t } = useLanguage();
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
              <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-8" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-2xl font-bold text-gov-blue">{t('modal.income.title')}</h3>
                      <button onClick={onClose} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"><XCircle /></button>
                  </div>
                  <div className="space-y-8">
                      <div>
                          <h4 className="font-bold text-lg mb-4 text-center bg-slate-100 py-2 rounded-lg">ÎLE-DE-FRANCE</h4>
                          <IncomeTable region="IDF" />
                      </div>
                      <div>
                          <h4 className="font-bold text-lg mb-4 text-center bg-slate-100 py-2 rounded-lg">AUTRES RÉGIONS</h4>
                          <IncomeTable region="OTHER" />
                      </div>
                  </div>
              </div>
          </div>
    )
}

const IncomeTable = ({ region }: { region: 'IDF' | 'OTHER' }) => {
    const data = INCOME_CEILINGS_2025[region];
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-center">
                <thead>
                    <tr className="text-white">
                        <th className="p-3 bg-slate-700 rounded-tl-lg">Pers.</th>
                        <th className="p-3 bg-blue-600">Bleu</th>
                        <th className="p-3 bg-yellow-500">Jaune</th>
                        <th className="p-3 bg-purple-500 rounded-tr-lg">Violet</th>
                    </tr>
                </thead>
                <tbody>
                    {[0,1,2,3,4].map(i => (
                        <tr key={i} className="border-b border-slate-100 even:bg-slate-50">
                            <td className="p-3 font-bold">{i+1}</td>
                            <td className="p-3 font-medium text-blue-700">{data[IncomeProfile.BLUE][i].toLocaleString()} €</td>
                            <td className="p-3 font-medium text-yellow-700">{data[IncomeProfile.YELLOW][i].toLocaleString()} €</td>
                            <td className="p-3 font-medium text-purple-700">{data[IncomeProfile.VIOLET][i].toLocaleString()} €</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

const ZonesModal = ({ onClose }: { onClose: () => void }) => {
    const { t } = useLanguage();

    const getDeptList = (codes: string[]) => {
        return codes.map(code => (
            <div key={code} className="flex justify-between text-sm py-1 border-b border-slate-100 last:border-0">
                <span className="font-mono font-bold text-slate-600">{code}</span>
                <span className="text-slate-800 truncate ml-2">{DEPARTMENT_DB[code]?.name}</span>
            </div>
        ));
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <h3 className="text-2xl font-bold text-gov-blue">{t('modal.zones.title')}</h3>
                    <button onClick={onClose} className="p-2 bg-white border border-slate-200 rounded-full hover:bg-slate-100"><XCircle /></button>
                </div>
                <div className="flex-grow overflow-y-auto p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
                         <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                             <h4 className="text-center font-extrabold text-xl text-blue-800 mb-4 bg-white py-2 rounded-lg shadow-sm">ZONE H1</h4>
                             <div className="space-y-1 h-[60vh] overflow-y-auto pr-2">
                                 {getDeptList(ZONE_H1_DEPTS)}
                             </div>
                         </div>
                         <div className="bg-yellow-50 rounded-xl p-4 border-2 border-yellow-200">
                             <h4 className="text-center font-extrabold text-xl text-yellow-800 mb-4 bg-white py-2 rounded-lg shadow-sm">ZONE H2</h4>
                             <div className="space-y-1 h-[60vh] overflow-y-auto pr-2">
                                 {getDeptList(ZONE_H2_DEPTS)}
                             </div>
                         </div>
                         <div className="bg-orange-50 rounded-xl p-4 border-2 border-orange-200">
                             <h4 className="text-center font-extrabold text-xl text-orange-800 mb-4 bg-white py-2 rounded-lg shadow-sm">ZONE H3</h4>
                             <div className="space-y-1 h-[60vh] overflow-y-auto pr-2">
                                 {getDeptList(ZONE_H3_DEPTS)}
                             </div>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default App;