'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  BeamInputs,
  ConcreteGrade,
  SteelGrade,
  ReinforcementLayer,
  RoundBar,
  CalculationMethod,
  CalculationResults,
} from '@/types/beam';
import { calculateSectionProperties } from '@/lib/calculations/common';
import { calculateWSD } from '@/lib/calculations/wsd';
import { calculateSDM } from '@/lib/calculations/sdm';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageToggle } from '@/components/LanguageToggle';
import { ThemeToggle } from '@/components/ThemeToggle';
import { BeamSection } from '@/components/BeamSection';
import { MaterialInputs } from '@/components/MaterialInputs';
import { SectionInputs } from '@/components/SectionInputs';
import { ReinforcementInputs } from '@/components/ReinforcementInputs';
import { ResultsDisplay } from '@/components/ResultsDisplay';
import { Button } from '@/components/ui/button';

const defaultLayers: ReinforcementLayer[] = [
  { id: 'layer-1', barSize: 'DB25', count: 3 },
];

export function SingleBeamCalculator() {
  const { t } = useLanguage();

  // Input states
  const [concreteGrade, setConcreteGrade] = useState<ConcreteGrade>(240);
  const [steelGrade, setSteelGrade] = useState<SteelGrade>('SD40');
  const [width, setWidth] = useState(30);
  const [height, setHeight] = useState(50);
  const [cover, setCover] = useState(4);
  const [layers, setLayers] = useState<ReinforcementLayer[]>(defaultLayers);
  const [stirrupSize, setStirrupSize] = useState<RoundBar>('RB9');
  const [stirrupSpacing, setStirrupSpacing] = useState(20);
  const [method, setMethod] = useState<CalculationMethod>('SDM');

  // Create inputs object
  const inputs: BeamInputs = useMemo(() => ({
    concreteGrade,
    steelGrade,
    width,
    height,
    cover,
    layers,
    stirrupSize,
    stirrupSpacing,
  }), [concreteGrade, steelGrade, width, height, cover, layers, stirrupSize, stirrupSpacing]);

  // Calculate results
  const results = useMemo<CalculationResults | null>(() => {
    if (layers.length === 0) return null;

    const sectionProps = calculateSectionProperties(inputs);
    const wsdResults = calculateWSD(inputs, sectionProps);
    const sdmResults = calculateSDM(inputs, sectionProps);

    return {
      section: sectionProps,
      wsd: wsdResults,
      sdm: sdmResults,
    };
  }, [inputs, layers.length]);

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
            <h1 className="text-base sm:text-xl font-bold text-slate-800 dark:text-slate-100">{t('singleBeam')}</h1>
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
        <div className="h-full flex flex-col lg:flex-row gap-4">
          {/* Left Side - Inputs */}
          <div className="w-full lg:w-105 shrink-0 flex flex-col gap-3 sm:gap-4">
            {/* Top Row: Visualization + Materials */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              {/* Beam Visualization */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 p-3 sm:p-4 flex items-center justify-center">
                <BeamSection
                  width={width}
                  height={height}
                  cover={cover}
                  layers={layers}
                  stirrupSize={stirrupSize}
                  effectiveDepth={results?.section.effectiveDepth}
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
            <SectionInputs
              width={width}
              height={height}
              cover={cover}
              onWidthChange={setWidth}
              onHeightChange={setHeight}
              onCoverChange={setCover}
            />

            {/* Reinforcement */}
            <div className="flex-1 min-h-0">
              <ReinforcementInputs
                layers={layers}
                stirrupSize={stirrupSize}
                stirrupSpacing={stirrupSpacing}
                onLayersChange={setLayers}
                onStirrupSizeChange={setStirrupSize}
                onStirrupSpacingChange={setStirrupSpacing}
              />
            </div>
          </div>

          {/* Right Side - Results */}
          <div className="flex-1 min-w-0">
            <ResultsDisplay
              results={results}
              inputs={layers.length > 0 ? inputs : null}
              method={method}
              onMethodChange={setMethod}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
