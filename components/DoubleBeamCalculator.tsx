'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  DoubleBeamInputs,
  ConcreteGrade,
  SteelGrade,
  ReinforcementLayer,
  RoundBar,
  CalculationMethod,
  DoubleCalculationResults,
} from '@/types/beam';
import {
  calculateDoubleSectionProperties,
  calculateDoubleWSD,
  calculateDoubleSDM,
} from '@/lib/calculations/double-beam';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageToggle } from '@/components/LanguageToggle';
import { ThemeToggle } from '@/components/ThemeToggle';
import { DoubleBeamSection } from '@/components/DoubleBeamSection';
import { MaterialInputs } from '@/components/MaterialInputs';
import { DoubleReinforcementInputs } from '@/components/DoubleReinforcementInputs';
import { DoubleResultsDisplay } from '@/components/DoubleResultsDisplay';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

const defaultTensionLayers: ReinforcementLayer[] = [
  { id: 'tension-1', barSize: 'DB25', count: 3 },
];

const defaultCompressionLayers: ReinforcementLayer[] = [
  { id: 'comp-1', barSize: 'DB16', count: 2 },
];

export function DoubleBeamCalculator() {
  const { t } = useLanguage();

  // Input states
  const [concreteGrade, setConcreteGrade] = useState<ConcreteGrade>(240);
  const [steelGrade, setSteelGrade] = useState<SteelGrade>('SD40');
  const [width, setWidth] = useState(30);
  const [height, setHeight] = useState(50);
  const [cover, setCover] = useState(4);
  const [coverTop, setCoverTop] = useState(4);
  const [tensionLayers, setTensionLayers] = useState<ReinforcementLayer[]>(defaultTensionLayers);
  const [compressionLayers, setCompressionLayers] = useState<ReinforcementLayer[]>(defaultCompressionLayers);
  const [stirrupSize, setStirrupSize] = useState<RoundBar>('RB9');
  const [stirrupSpacing, setStirrupSpacing] = useState(20);
  const [method, setMethod] = useState<CalculationMethod>('SDM');

  // Create inputs object
  const inputs: DoubleBeamInputs = useMemo(() => ({
    concreteGrade,
    steelGrade,
    width,
    height,
    cover,
    coverTop,
    tensionLayers,
    compressionLayers,
    stirrupSize,
    stirrupSpacing,
  }), [concreteGrade, steelGrade, width, height, cover, coverTop, tensionLayers, compressionLayers, stirrupSize, stirrupSpacing]);

  // Calculate results
  const results = useMemo<DoubleCalculationResults | null>(() => {
    if (tensionLayers.length === 0 || compressionLayers.length === 0) return null;

    const sectionProps = calculateDoubleSectionProperties(inputs);
    const wsdResults = calculateDoubleWSD(inputs, sectionProps);
    const sdmResults = calculateDoubleSDM(inputs, sectionProps);

    return {
      section: sectionProps,
      wsd: wsdResults,
      sdm: sdmResults,
    };
  }, [inputs, tensionLayers.length, compressionLayers.length]);

  const handleNumberInput = (
    value: string,
    onChange: (value: number) => void,
    min: number = 0
  ) => {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= min) {
      onChange(num);
    }
  };

  return (
    <div className="min-h-screen lg:h-screen bg-slate-100 dark:bg-slate-900 flex flex-col lg:overflow-hidden">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 px-4 sm:px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 sm:gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-slate-600 dark:text-slate-300 px-2 sm:px-3">
              <span className="hidden sm:inline">{t('backToHome')}</span>
              <span className="sm:hidden">←</span>
            </Button>
          </Link>
          <div className="border-l dark:border-slate-600 pl-2 sm:pl-4">
            <h1 className="text-base sm:text-xl font-bold text-slate-800 dark:text-slate-100">{t('doubleBeam')}</h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 hidden sm:block">{t('appSubtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageToggle />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-3 sm:p-4 overflow-auto lg:overflow-hidden">
        <div className="h-full flex flex-col lg:flex-row gap-3 sm:gap-4">
          {/* Left Side - Inputs */}
          <div className="w-full lg:w-115 shrink-0 flex flex-col gap-3">
            {/* Top Row: Visualization + Materials */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Beam Visualization */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 p-3 flex items-center justify-center">
                <DoubleBeamSection
                  width={width}
                  height={height}
                  cover={cover}
                  coverTop={coverTop}
                  tensionLayers={tensionLayers}
                  compressionLayers={compressionLayers}
                  stirrupSize={stirrupSize}
                  effectiveDepth={results?.section.effectiveDepth}
                  effectiveDepthPrime={results?.section.effectiveDepthPrime}
                />
              </div>

              {/* Material Properties */}
              <div className="flex-1">
                <MaterialInputs
                  concreteGrade={concreteGrade}
                  steelGrade={steelGrade}
                  onConcreteGradeChange={setConcreteGrade}
                  onSteelGradeChange={setSteelGrade}
                />
              </div>
            </div>

            {/* Section Dimensions */}
            <Card className="dark:bg-slate-800 dark:border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold dark:text-slate-100">{t('sectionDimensions')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-600 dark:text-slate-400">{t('width')} (b)</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min={10}
                        max={200}
                        value={width}
                        onChange={(e) => handleNumberInput(e.target.value, setWidth, 10)}
                        className="h-8 text-sm pr-8 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                        {t('cm')}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-slate-600 dark:text-slate-400">{t('height')} (h)</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min={10}
                        max={300}
                        value={height}
                        onChange={(e) => handleNumberInput(e.target.value, setHeight, 10)}
                        className="h-8 text-sm pr-8 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                        {t('cm')}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-slate-600 dark:text-slate-400">{t('cover')} (bot)</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min={2}
                        max={10}
                        step={0.5}
                        value={cover}
                        onChange={(e) => handleNumberInput(e.target.value, setCover, 2)}
                        className="h-8 text-sm pr-8 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                        {t('cm')}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-slate-600 dark:text-slate-400">{t('cover')} (top)</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min={2}
                        max={10}
                        step={0.5}
                        value={coverTop}
                        onChange={(e) => handleNumberInput(e.target.value, setCoverTop, 2)}
                        className="h-8 text-sm pr-8 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                        {t('cm')}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reinforcement */}
            <div className="flex-1 min-h-0">
              <DoubleReinforcementInputs
                tensionLayers={tensionLayers}
                compressionLayers={compressionLayers}
                stirrupSize={stirrupSize}
                stirrupSpacing={stirrupSpacing}
                onTensionLayersChange={setTensionLayers}
                onCompressionLayersChange={setCompressionLayers}
                onStirrupSizeChange={setStirrupSize}
                onStirrupSpacingChange={setStirrupSpacing}
              />
            </div>
          </div>

          {/* Right Side - Results */}
          <div className="flex-1 min-w-0">
            <DoubleResultsDisplay
              results={results}
              inputs={tensionLayers.length > 0 && compressionLayers.length > 0 ? inputs : null}
              method={method}
              onMethodChange={setMethod}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
