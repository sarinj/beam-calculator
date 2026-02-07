'use client';

import { useState, useRef } from 'react';
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
  const [isLoading, setIsLoading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate results directly (no need for useMemo, calculation is fast and pure)
  const results: CalculatedFooting[] =
    footingData.length === 0 ? [] : calculateAllFootings(footingData, allowableBearingCapacity);

  // Handle file import with loading state and improved error handling
  const handleFileImport = async (footings: ProcessedFooting[]) => {
    setIsLoading(true);
    try {
      setFootingData(footings);
      setError('');
      setSuccessMessage(t('importSuccess'));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('fileParseFailed');
      setError(errorMessage);
      setSuccessMessage('');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle proceed to reinforcement design
  const handleProceedToReinforcement = () => {
    if (results.length === 0) return;
    
    // Save footing data to localStorage
    localStorage.setItem('footingResults', JSON.stringify(results));
    localStorage.setItem('footingConcreteStrength', concreteStrength.toString());
    localStorage.setItem('footingBearingCapacity', allowableBearingCapacity.toString());
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
        <div className="h-full flex flex-col lg:flex-row gap-4">
          {/* Left Side - Inputs and Table */}
          <div className="w-full lg:w-[30%] shrink-0 flex flex-col gap-3 sm:gap-4 lg:overflow-y-auto">
            {/* Input Controls */}
            <div>
              <FootingInputsComponent
                concreteStrength={concreteStrength}
                allowableBearingCapacity={allowableBearingCapacity}
                onConcreteStrengthChange={setConcreteStrength}
                onAllowableBearingCapacityChange={setAllowableBearingCapacity}
                onFileImport={handleFileImport}
                isLoading={isLoading}
                error={error}
                successMessage={successMessage}
              />
            </div>

            {/* Footing Data Table */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <FootingTable footings={results} />
            </div>
          </div>

          {/* Right Side - Footing Plot (Enlarged) */}
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col gap-3">
            <FootingPlot footings={results} />
            
            {/* Reinforcement Design Button */}
            {results.length > 0 && (
              <Link href="/footing-reinforcement" onClick={handleProceedToReinforcement}>
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3"
                  size="lg"
                >
                  🔧 Footing Design Reinforcement →
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
