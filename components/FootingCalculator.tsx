'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  CalculatedFooting,
  FootingInputs,
  ProcessedFooting,
  FootingCalculationResults,
} from '@/types/footing';
import { calculateAllFootings } from '@/lib/calculations/footing';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageToggle } from '@/components/LanguageToggle';
import { ThemeToggle } from '@/components/ThemeToggle';
import { FootingInputs as FootingInputsComponent } from '@/components/FootingInputs';
import { FootingTable } from '@/components/FootingTable';
import { FootingPlot } from '@/components/FootingPlot';
import { Button } from '@/components/ui/button';

export function FootingCalculator() {
  const { t } = useLanguage();

  // Input states
  const [concreteStrength, setConcreteStrength] = useState(240);
  const [allowableBearingCapacity, setAllowableBearingCapacity] = useState(10);
  const [footingData, setFootingData] = useState<ProcessedFooting[]>([]);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Create inputs object
  const inputs: FootingInputs = useMemo(
    () => ({
      concreteStrength,
      allowableBearingCapacity,
    }),
    [concreteStrength, allowableBearingCapacity]
  );

  // Calculate results
  const results = useMemo<CalculatedFooting[]>(() => {
    if (footingData.length === 0) return [];

    return calculateAllFootings(footingData, allowableBearingCapacity);
  }, [footingData, allowableBearingCapacity]);

  const handleFileImport = (footings: ProcessedFooting[]) => {
    try {
      setFootingData(footings);
      setError('');
      setSuccessMessage(t('importSuccess'));
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('fileParseFailed');
      setError(errorMessage);
      setSuccessMessage('');
    }
  };

  return (
    <div className="min-h-screen lg:h-screen bg-slate-100 dark:bg-slate-900 flex flex-col lg:overflow-hidden">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 px-4 sm:px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 sm:gap-4">
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-600 dark:text-slate-300 px-2 sm:px-3"
            >
              <span className="hidden sm:inline">{t('backToHome')}</span>
              <span className="sm:hidden">←</span>
            </Button>
          </Link>
          <div className="border-l dark:border-slate-600 pl-2 sm:pl-4">
            <h1 className="text-base sm:text-xl font-bold text-slate-800 dark:text-slate-100">
              {t('footingDesign')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 hidden sm:block">
              {t('footingDesignDesc')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageToggle />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-3 sm:p-4 overflow-hidden">
        <div className="h-full flex flex-col lg:flex-row gap-4 overflow-y-auto">
          {/* Left Side - Inputs */}
          <div className="w-full lg:w-80 shrink-0 flex flex-col gap-3 sm:gap-4 lg:overflow-y-auto">
            <FootingInputsComponent
              concreteStrength={concreteStrength}
              allowableBearingCapacity={allowableBearingCapacity}
              onConcreteStrengthChange={setConcreteStrength}
              onAllowableBearingCapacityChange={setAllowableBearingCapacity}
              onFileImport={handleFileImport}
              error={error}
              successMessage={successMessage}
            />
          </div>

          {/* Right Side - Table and Plot */}
          <div className="flex-1 flex flex-col gap-4 min-w-0 lg:overflow-hidden">
            {/* Table */}
            <div className="flex-shrink-0">
              <h2 className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100 mb-2">
                {t('footingData')}
              </h2>
              <div className="overflow-auto">
                <FootingTable footings={results} />
              </div>
            </div>

            {/* Plot */}
            <div className="flex-1 min-h-0 overflow-auto">
              <FootingPlot footings={results} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
