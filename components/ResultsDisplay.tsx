'use client';

import { useState } from 'react';
import { CalculationResults, CalculationMethod, BeamInputs } from '@/types/beam';
import { formatNumber } from '@/lib/calculations/common';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { CalculationSteps } from '@/components/CalculationSteps';
import { ChevronDown, ChevronUp, Calculator } from 'lucide-react';

interface ResultsDisplayProps {
  results: CalculationResults | null;
  inputs: BeamInputs | null;
  method: CalculationMethod;
  onMethodChange: (method: CalculationMethod) => void;
}

interface ResultCardProps {
  label: string;
  value: string | number;
  unit: string;
  highlight?: boolean;
  large?: boolean;
}

function ResultCard({ label, value, unit, highlight, large }: ResultCardProps) {
  return (
    <div
      className={`p-2 sm:p-3 rounded-lg border ${
        highlight
          ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800'
          : 'bg-slate-50 dark:bg-slate-700/50 border-slate-100 dark:border-slate-600'
      }`}
    >
      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className={`font-semibold ${highlight ? 'text-blue-700 dark:text-blue-400' : 'text-slate-800 dark:text-slate-100'} ${large ? 'text-lg sm:text-xl' : 'text-sm sm:text-base'}`}>
          {value}
        </span>
        <span className="text-xs text-slate-400">{unit}</span>
      </div>
    </div>
  );
}

export function ResultsDisplay({ results, inputs, method, onMethodChange }: ResultsDisplayProps) {
  const { t } = useLanguage();
  const [showSteps, setShowSteps] = useState(false);

  if (!results || !inputs) {
    return (
      <Card className="h-full dark:bg-slate-800 dark:border-slate-700">
        <CardContent className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500">
          Enter beam parameters to see results
        </CardContent>
      </Card>
    );
  }

  const { section, wsd, sdm } = results;

  return (
    <Card className="h-full flex flex-col dark:bg-slate-800 dark:border-slate-700">
      <CardHeader className="pb-2 shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold dark:text-slate-100">{t('results')}</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSteps(!showSteps)}
            className="h-8 text-xs gap-1 dark:border-slate-600 dark:text-slate-300"
          >
            <Calculator className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{showSteps ? t('hideSteps') : t('showSteps')}</span>
            {showSteps ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Method Tabs */}
        <Tabs value={method} onValueChange={(v) => onMethodChange(v as CalculationMethod)} className="flex-1 flex flex-col min-h-0">
          {/* Sticky Header: Key Results + TabsList */}
          <div className="shrink-0 space-y-4 pb-4">
            {/* Key Results */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              <ResultCard
                label={t('effectiveDepth') + ' (d)'}
                value={formatNumber(section.effectiveDepth, 2)}
                unit={t('cm')}
                large
              />
              <ResultCard
                label={t('steelArea') + ' (As)'}
                value={formatNumber(section.totalSteelArea, 2)}
                unit={t('cm2')}
                large
              />
              <ResultCard
                label={t('steelRatio') + ' (ρ)'}
                value={formatNumber(section.steelRatio * 100, 3)}
                unit="%"
                large
              />
              <ResultCard
                label={t('status')}
                value={sdm.isUnderReinforced ? 'OK' : 'NG'}
                unit={sdm.isUnderReinforced ? t('underReinforced') : t('overReinforced')}
                highlight={sdm.isUnderReinforced}
                large
              />
            </div>

            {/* TabsList */}
            <TabsList className="grid w-full grid-cols-2 dark:bg-slate-700">
              <TabsTrigger value="WSD" className="dark:data-[state=active]:bg-slate-600">{t('wsdMethod')}</TabsTrigger>
              <TabsTrigger value="SDM" className="dark:data-[state=active]:bg-slate-600">{t('sdmMethod')}</TabsTrigger>
            </TabsList>
          </div>

          {/* Scrollable Content */}
          <TabsContent value="WSD" className="flex-1 min-h-0 mt-0 overflow-auto">
            {showSteps ? (
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <CalculationSteps results={results} inputs={inputs} method="WSD" />
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                    {t('allowableStresses')}
                  </h4>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <ResultCard
                      label={t('allowableConcrete') + ' (fc)'}
                      value={formatNumber(wsd.allowableConcreteStress, 0)}
                      unit={t('kgcm2')}
                    />
                    <ResultCard
                      label={t('allowableSteel') + ' (fs)'}
                      value={formatNumber(wsd.allowableSteelStress, 0)}
                      unit={t('kgcm2')}
                    />
                    <ResultCard
                      label={t('modularRatio') + ' (n)'}
                      value={formatNumber(wsd.modularRatio, 2)}
                      unit=""
                    />
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                    Section Analysis
                  </h4>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <ResultCard
                      label={t('neutralAxis') + ' (kd)'}
                      value={formatNumber(wsd.neutralAxisDepth, 2)}
                      unit={t('cm')}
                    />
                    <ResultCard
                      label={t('leverArm') + ' (jd)'}
                      value={formatNumber(wsd.leverArm, 2)}
                      unit={t('cm')}
                    />
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                    Capacity
                  </h4>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <ResultCard
                      label={t('momentCapacity') + ' (M)'}
                      value={formatNumber(wsd.momentCapacity, 0)}
                      unit={t('kgm')}
                      highlight
                      large
                    />
                    <ResultCard
                      label={t('shearCapacity') + ' (V)'}
                      value={formatNumber(wsd.shearCapacity, 0)}
                      unit={t('kg')}
                      highlight
                      large
                    />
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="SDM" className="flex-1 min-h-0 mt-0 overflow-auto">
            {showSteps ? (
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <CalculationSteps results={results} inputs={inputs} method="SDM" />
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                    Reinforcement Ratios
                  </h4>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <ResultCard
                      label={t('beta1') + ' (β1)'}
                      value={formatNumber(sdm.beta1, 3)}
                      unit=""
                    />
                    <ResultCard
                      label={t('balancedRatio') + ' (ρb)'}
                      value={formatNumber(sdm.balancedRatio * 100, 3)}
                      unit="%"
                    />
                    <ResultCard
                      label={t('maxRatio') + ' (ρmax)'}
                      value={formatNumber(sdm.maxRatio * 100, 3)}
                      unit="%"
                    />
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                    Section Analysis
                  </h4>
                  <div className="grid grid-cols-1 gap-2 sm:gap-3">
                    <ResultCard
                      label={t('compressionBlock') + ' (a)'}
                      value={formatNumber(sdm.compressionBlockDepth, 2)}
                      unit={t('cm')}
                    />
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                    Moment Capacity
                  </h4>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <ResultCard
                      label={t('nominalMoment') + ' (Mn)'}
                      value={formatNumber(sdm.nominalMoment, 0)}
                      unit={t('kgm')}
                    />
                    <ResultCard
                      label={t('designMoment') + ' (φMn)'}
                      value={formatNumber(sdm.designMoment, 0)}
                      unit={t('kgm')}
                      highlight
                      large
                    />
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                    Shear Capacity
                  </h4>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <ResultCard
                      label={t('nominalShear') + ' (Vn)'}
                      value={formatNumber(sdm.nominalShear, 0)}
                      unit={t('kg')}
                    />
                    <ResultCard
                      label={t('designShear') + ' (φVn)'}
                      value={formatNumber(sdm.designShear, 0)}
                      unit={t('kg')}
                      highlight
                      large
                    />
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
