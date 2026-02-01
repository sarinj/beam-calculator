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

  // Calculate results
  const results = useMemo<CalculationResults | null>(() => {
    if (layers.length === 0) return null;

    const inputs: BeamInputs = {
      concreteGrade,
      steelGrade,
      width,
      height,
      cover,
      layers,
      stirrupSize,
      stirrupSpacing,
    };

    const sectionProps = calculateSectionProperties(inputs);
    const wsdResults = calculateWSD(inputs, sectionProps);
    const sdmResults = calculateSDM(inputs, sectionProps);

    return {
      section: sectionProps,
      wsd: wsdResults,
      sdm: sdmResults,
    };
  }, [concreteGrade, steelGrade, width, height, cover, layers, stirrupSize, stirrupSpacing]);

  return (
    <div className="h-screen bg-slate-100 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-slate-600">
              {t('backToHome')}
            </Button>
          </Link>
          <div className="border-l pl-4">
            <h1 className="text-xl font-bold text-slate-800">{t('singleBeam')}</h1>
            <p className="text-sm text-slate-500">{t('appSubtitle')}</p>
          </div>
        </div>
        <LanguageToggle />
      </header>

      {/* Main Content */}
      <div className="flex-1 p-4 overflow-hidden">
        <div className="h-full flex gap-4">
          {/* Left Side - Inputs */}
          <div className="w-[420px] shrink-0 flex flex-col gap-4">
            {/* Top Row: Visualization + Materials */}
            <div className="flex gap-4">
              {/* Beam Visualization */}
              <div className="bg-white rounded-xl border p-4 flex items-center justify-center">
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
              method={method}
              onMethodChange={setMethod}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
