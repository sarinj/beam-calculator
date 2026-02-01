'use client';

import { CalculationResults, CalculationMethod } from '@/types/beam';
import { formatNumber } from '@/lib/calculations/common';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ResultsDisplayProps {
  results: CalculationResults | null;
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
      className={`p-3 rounded-lg border ${
        highlight
          ? 'bg-blue-50 border-blue-200'
          : 'bg-slate-50 border-slate-100'
      }`}
    >
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className={`font-semibold ${highlight ? 'text-blue-700' : 'text-slate-800'} ${large ? 'text-xl' : 'text-base'}`}>
          {value}
        </span>
        <span className="text-xs text-slate-400">{unit}</span>
      </div>
    </div>
  );
}

export function ResultsDisplay({ results, method, onMethodChange }: ResultsDisplayProps) {
  const { t } = useLanguage();

  if (!results) {
    return (
      <Card className="h-full">
        <CardContent className="h-full flex items-center justify-center text-slate-400">
          Enter beam parameters to see results
        </CardContent>
      </Card>
    );
  }

  const { section, wsd, sdm } = results;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{t('results')}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col space-y-4 overflow-auto">
        {/* Key Results */}
        <div className="grid grid-cols-4 gap-3">
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

        {/* Method Tabs */}
        <Tabs value={method} onValueChange={(v) => onMethodChange(v as CalculationMethod)} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="WSD">{t('wsdMethod')}</TabsTrigger>
            <TabsTrigger value="SDM">{t('sdmMethod')}</TabsTrigger>
          </TabsList>

          <TabsContent value="WSD" className="flex-1 mt-4 space-y-4">
            <div>
              <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                {t('allowableStresses')}
              </h4>
              <div className="grid grid-cols-3 gap-3">
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
              <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                Section Analysis
              </h4>
              <div className="grid grid-cols-2 gap-3">
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
              <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                Capacity
              </h4>
              <div className="grid grid-cols-2 gap-3">
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
          </TabsContent>

          <TabsContent value="SDM" className="flex-1 mt-4 space-y-4">
            <div>
              <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                Reinforcement Ratios
              </h4>
              <div className="grid grid-cols-3 gap-3">
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
              <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                Section Analysis
              </h4>
              <div className="grid grid-cols-1 gap-3">
                <ResultCard
                  label={t('compressionBlock') + ' (a)'}
                  value={formatNumber(sdm.compressionBlockDepth, 2)}
                  unit={t('cm')}
                />
              </div>
            </div>

            <div>
              <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                Moment Capacity
              </h4>
              <div className="grid grid-cols-2 gap-3">
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
              <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                Shear Capacity
              </h4>
              <div className="grid grid-cols-2 gap-3">
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
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
