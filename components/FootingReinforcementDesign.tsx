'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalculatedFooting, CriticalFooting, ReinforcementInputs } from '@/types/footing';
import { selectCriticalFootings, designFootingReinforcement } from '@/lib/calculations/footing-reinforcement';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageToggle } from '@/components/LanguageToggle';
import { ThemeToggle } from '@/components/ThemeToggle';
import { FootingCalculationSteps } from '@/components/FootingCalculationSteps';
import { FootingDiagram } from '@/components/FootingDiagram';
import { exportFootingReinforcementToPDF, exportAllFootingsToPDF } from '@/lib/pdf-export';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function FootingReinforcementDesign() {
  const { t } = useLanguage();
  const router = useRouter();
  
  const [footings, setFootings] = useState<CalculatedFooting[]>([]);
  const [bearingCapacity, setBearingCapacity] = useState<number>(10);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('0');
  const [showSteps, setShowSteps] = useState<Record<string, boolean>>({});
  const [showDiagrams, setShowDiagrams] = useState<Record<string, boolean>>({});
  
  const [globalInputs, setGlobalInputs] = useState<ReinforcementInputs>({
    fc: 240,
    fy: 4000,
    barSize: 16,
    cover: 75,
    columnWidth: 0.4,
    columnDepth: 0.4,
  });
  
  const [footingNames, setFootingNames] = useState<Record<string, string>>({});
  const [customInputs, setCustomInputs] = useState<Record<string, Partial<CriticalFooting>>>({});
  
  useEffect(() => {
    const savedFootings = localStorage.getItem('footingResults');
    const savedBearingCapacity = localStorage.getItem('footingBearingCapacity');
    
    if (!savedFootings) {
      router.push('/footing-design');
      return;
    }
    
    try {
      const parsedFootings = JSON.parse(savedFootings);
      setFootings(parsedFootings);
      if (savedBearingCapacity) {
        setBearingCapacity(parseFloat(savedBearingCapacity));
      }
      
      const names: Record<string, string> = {};
      const selected = selectCriticalFootings(parsedFootings);
      selected.forEach((_: any, index: number) => {
        names[index] = `F${index + 1}`;
      });
      setFootingNames(names);
    } catch (error) {
      console.error('Error loading footing data:', error);
      router.push('/footing-design');
    } finally {
      setIsLoading(false);
    }
  }, [router]);
  
  const criticalFootings = useMemo(() => {
    if (footings.length === 0) return [];
    return selectCriticalFootings(footings);
  }, [footings]);
  
  const designedFootings = useMemo<CriticalFooting[]>(() => {
    if (criticalFootings.length === 0) return [];
    
    return criticalFootings.map((footing, index) => {
      const custom = customInputs[index] || {};
      const inputs: ReinforcementInputs = {
        fc: (custom as any).customFc || globalInputs.fc,
        fy: (custom as any).customFy || globalInputs.fy,
        cover: (custom as any).customCover || globalInputs.cover,
        barSize: custom.customBarSize || globalInputs.barSize,
        columnWidth: custom.customColumnWidth || globalInputs.columnWidth,
        columnDepth: custom.customColumnDepth || globalInputs.columnDepth,
      };
      
      // Use customThickness if provided
      const designed = designFootingReinforcement(
        footing, 
        inputs, 
        bearingCapacity,
        custom.customThickness
      );
      
      return {
        ...designed,
        footingName: footingNames[index] || `F${index + 1}`,
        customColumnWidth: custom.customColumnWidth,
        customColumnDepth: custom.customColumnDepth,
        customBarSize: custom.customBarSize,
        customThickness: custom.customThickness,
      };
    });
  }, [criticalFootings, globalInputs, customInputs, bearingCapacity, footingNames]);
  
  const handleGlobalInputChange = (field: keyof ReinforcementInputs, value: number) => {
    setGlobalInputs(prev => ({ ...prev, [field]: value }));
  };
  
  const handleFootingNameChange = (index: number, name: string) => {
    setFootingNames(prev => ({ ...prev, [index]: name }));
  };
  
  const handleCustomInputChange = (
    index: number,
    field: keyof CriticalFooting,
    value: number
  ) => {
    setCustomInputs(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        [field]: value,
      },
    }));
  };
  
  const toggleSteps = (index: string) => {
    setShowSteps(prev => ({ ...prev, [index]: !prev[index] }));
  };
  
  const toggleDiagrams = (index: string) => {
    setShowDiagrams(prev => ({ ...prev, [index]: !prev[index] }));
  };
  
  const handleExportPDF = async (footing: CriticalFooting, index: number) => {
    const custom = customInputs[index] || {};
    const inputs: ReinforcementInputs = {
      fc: (custom as any).customFc || globalInputs.fc,
      fy: (custom as any).customFy || globalInputs.fy,
      cover: (custom as any).customCover || globalInputs.cover,
      barSize: custom.customBarSize || globalInputs.barSize,
      columnWidth: custom.customColumnWidth || globalInputs.columnWidth,
      columnDepth: custom.customColumnDepth || globalInputs.columnDepth,
    };
    
    // Get canvas images from FootingDiagram
    const planCanvas = document.querySelector(`canvas[data-footing-plan="${index}"]`) as HTMLCanvasElement;
    const sectionCanvas = document.querySelector(`canvas[data-footing-section="${index}"]`) as HTMLCanvasElement;
    
    const planImageData = planCanvas?.toDataURL('image/png');
    const sectionImageData = sectionCanvas?.toDataURL('image/png');
    
    exportFootingReinforcementToPDF(footing, inputs, bearingCapacity, planImageData, sectionImageData);
  };
  
  const handleExportAllPDF = async () => {
    // Temporarily show all diagrams to ensure canvas elements exist
    const originalShowDiagrams = { ...showDiagrams };
    const allDiagramsShown: Record<string, boolean> = {};
    designedFootings.forEach((_, index) => {
      allDiagramsShown[index.toString()] = true;
    });
    setShowDiagrams(allDiagramsShown);
    
    // Wait for diagrams to render
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Prepare all footings with their inputs for PDF export
    const footingsWithInputs = designedFootings.map((footing, index) => {
      const custom = customInputs[index] || {};
      return {
        ...footing,
        inputs: {
          fc: (custom as any).customFc || globalInputs.fc,
          fy: (custom as any).customFy || globalInputs.fy,
          cover: (custom as any).customCover || globalInputs.cover,
          barSize: custom.customBarSize || globalInputs.barSize,
          columnWidth: custom.customColumnWidth || globalInputs.columnWidth,
          columnDepth: custom.customColumnDepth || globalInputs.columnDepth,
        }
      };
    });
    
    // Collect all diagram images
    const diagramsData = designedFootings.map((_, index) => {
      const planCanvas = document.querySelector(`canvas[data-footing-plan="${index}"]`) as HTMLCanvasElement;
      const sectionCanvas = document.querySelector(`canvas[data-footing-section="${index}"]`) as HTMLCanvasElement;
      
      return {
        plan: planCanvas?.toDataURL('image/png'),
        section: sectionCanvas?.toDataURL('image/png')
      };
    });
    
    // Export all to single PDF
    exportAllFootingsToPDF(footingsWithInputs, globalInputs, bearingCapacity, diagramsData);
    
    // Restore original showDiagrams state
    setTimeout(() => {
      setShowDiagrams(originalShowDiagrams);
    }, 1000);
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900">
        <div className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          Loading...
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex flex-col">
      <header className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 px-4 sm:px-6 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/footing-design">
            <Button variant="ghost" size="sm" className="text-slate-600 dark:text-slate-300 px-2">
              ← Back
            </Button>
          </Link>
          <div className="border-l dark:border-slate-600 pl-2 sm:pl-3">
            <h1 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">
              🔧 Footing Design Reinforcement
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleExportAllPDF} variant="outline" size="sm">
            📄 Export All
          </Button>
          <ThemeToggle />
          <LanguageToggle />
        </div>
      </header>
      
      <div className="flex-1 p-2 sm:p-4 overflow-auto">
        <div className="max-w-[1600px] mx-auto space-y-3">
          <Card className="p-3 sm:p-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="flex flex-wrap gap-1 bg-transparent mb-3">
                {designedFootings.map((footing, index) => (
                  <TabsTrigger
                    key={index}
                    value={index.toString()}
                    className="data-[state=active]:bg-blue-600 data-[state=active]:text-white px-3 py-1 text-xs"
                  >
                    <div className="flex flex-col items-center">
                      <span className="font-semibold">{footing.footingName}</span>
                      <span className="text-xs opacity-80">{footing.dimension.toFixed(2)}m</span>
                    </div>
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {designedFootings.map((footing, index) => (
                <TabsContent key={index} value={index.toString()} className="space-y-3 mt-0">
                  {/* Footing Details - Compact Row */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-8 gap-2 sm:gap-3">
                      <div>
                        <Label className="text-xs">Footing Name</Label>
                        <Input
                          value={footingNames[index] || `F${index + 1}`}
                          onChange={(e) => handleFootingNameChange(index, e.target.value)}
                          placeholder="F1, F2, etc."
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">f'c (ksc)</Label>
                        <Select
                          value={((customInputs[index] as any)?.customFc || globalInputs.fc).toString()}
                          onValueChange={(value) => handleCustomInputChange(index, 'customFc' as any, Number(value))}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="f'c" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="180">180</SelectItem>
                            <SelectItem value="210">210</SelectItem>
                            <SelectItem value="240">240</SelectItem>
                            <SelectItem value="280">280</SelectItem>
                            <SelectItem value="320">320</SelectItem>
                            <SelectItem value="350">350</SelectItem>
                            <SelectItem value="400">400</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">fy (ksc)</Label>
                        <Select
                          value={((customInputs[index] as any)?.customFy || globalInputs.fy).toString()}
                          onValueChange={(value) => handleCustomInputChange(index, 'customFy' as any, Number(value))}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="fy" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="2400">2400</SelectItem>
                            <SelectItem value="3000">3000</SelectItem>
                            <SelectItem value="4000">4000</SelectItem>
                            <SelectItem value="5000">5000</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Cover (mm)</Label>
                        <Input
                          type="number"
                          value={(customInputs[index] as any)?.customCover || globalInputs.cover}
                          onChange={(e) => handleCustomInputChange(index, 'customCover' as any, Number(e.target.value))}
                          min={50}
                          max={150}
                          step={5}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Bar Size (mm)</Label>
                        <Select
                          value={(customInputs[index]?.customBarSize || globalInputs.barSize).toString()}
                          onValueChange={(value) => handleCustomInputChange(index, 'customBarSize', Number(value))}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Bar size" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="12">DB12</SelectItem>
                            <SelectItem value="16">DB16</SelectItem>
                            <SelectItem value="20">DB20</SelectItem>
                            <SelectItem value="25">DB25</SelectItem>
                            <SelectItem value="28">DB28</SelectItem>
                            <SelectItem value="32">DB32</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Thickness (cm)</Label>
                        <Input
                          type="number"
                          value={customInputs[index]?.customThickness ? (customInputs[index].customThickness! * 100).toFixed(0) : ((footing.footingThickness || 0) * 100).toFixed(0)}
                          onChange={(e) => handleCustomInputChange(index, 'customThickness', Number(e.target.value) / 100)}
                          min={20}
                          max={100}
                          step={5}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Column Width (m)</Label>
                        <Input
                          type="number"
                          value={customInputs[index]?.customColumnWidth || globalInputs.columnWidth}
                          onChange={(e) => handleCustomInputChange(index, 'customColumnWidth', Number(e.target.value))}
                          min={0.2}
                          max={2}
                          step={0.05}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Column Depth (m)</Label>
                        <Input
                          type="number"
                          value={customInputs[index]?.customColumnDepth || globalInputs.columnDepth}
                          onChange={(e) => handleCustomInputChange(index, 'customColumnDepth', Number(e.target.value))}
                          min={0.2}
                          max={2}
                          step={0.05}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Design Results - Split View: Data + Diagrams */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {/* Left Column: Design Results */}
                    <div className="border rounded-lg p-3 bg-white dark:bg-slate-800">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                          Design Results - {footing.footingName}
                        </h3>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => toggleDiagrams(index.toString())}
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                          >
                            {showDiagrams[index.toString()] ? '▼ Hide Diagrams' : '▶ Show Diagrams'}
                          </Button>
                          <Button
                            onClick={() => toggleSteps(index.toString())}
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                          >
                            {showSteps[index.toString()] ? '▼ Hide Steps' : '▶ Show Steps'}
                          </Button>
                          <Button onClick={() => handleExportPDF(footing, index)} size="sm" className="h-7 text-xs">
                            📄 PDF
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Footing Dimensions */}
                        <div className="bg-slate-50 dark:bg-slate-900 rounded p-2">
                          <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2 text-xs">
                            📐 Dimensions
                          </h4>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-600 dark:text-slate-400">Size:</span>
                              <span className="font-medium">{footing.dimension.toFixed(2)} × {footing.dimension.toFixed(2)} m</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600 dark:text-slate-400">h:</span>
                              <span className="font-medium">{((footing.footingThickness || 0) * 100).toFixed(0)} cm</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600 dark:text-slate-400">d:</span>
                              <span className="font-medium">{((footing.effectiveDepth || 0) * 100).toFixed(1)} cm</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600 dark:text-slate-400">Load:</span>
                              <span className="font-medium">{footing.totalLoad.toFixed(2)} Tonf</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600 dark:text-slate-400">Util:</span>
                              <span className={`font-semibold ${
                                footing.utilizationRatio > 100 ? 'text-red-600' :
                                footing.utilizationRatio > 85 ? 'text-orange-600' : 'text-green-600'
                              }`}>
                                {footing.utilizationRatio.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Design Moments */}
                        <div className="bg-slate-50 dark:bg-slate-900 rounded p-2">
                          <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2 text-xs">
                            ⚡ Moments
                          </h4>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-600 dark:text-slate-400">Mu-x:</span>
                              <span className="font-medium">{(footing.momentX || 0).toFixed(2)} Tonf-m</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600 dark:text-slate-400">Mu-y:</span>
                              <span className="font-medium">{(footing.momentY || 0).toFixed(2)} Tonf-m</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Reinforcement X */}
                        <div className="bg-slate-50 dark:bg-slate-900 rounded p-2">
                          <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2 text-xs">
                            🔩 Reinf. X
                          </h4>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-600 dark:text-slate-400">As,req:</span>
                              <span className="font-medium">{(footing.asReqX || 0).toFixed(2)} cm²</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600 dark:text-slate-400">As,min:</span>
                              <span className="font-medium">{(footing.asMinX || 0).toFixed(2)} cm²</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600 dark:text-slate-400">Bars:</span>
                              <span className="font-medium text-blue-600 dark:text-blue-400">
                                {footing.numBarsX}-DB{footing.customBarSize || globalInputs.barSize}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600 dark:text-slate-400">@ :</span>
                              <span className="font-medium">{(footing.spacingX || 0).toFixed(0)} mm</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Reinforcement Y */}
                        <div className="bg-slate-50 dark:bg-slate-900 rounded p-2">
                          <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2 text-xs">
                            🔩 Reinf. Y
                          </h4>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-600 dark:text-slate-400">As,req:</span>
                              <span className="font-medium">{(footing.asReqY || 0).toFixed(2)} cm²</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600 dark:text-slate-400">As,min:</span>
                              <span className="font-medium">{(footing.asMinY || 0).toFixed(2)} cm²</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600 dark:text-slate-400">Bars:</span>
                              <span className="font-medium text-blue-600 dark:text-blue-400">
                                {footing.numBarsY}-DB{footing.customBarSize || globalInputs.barSize}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600 dark:text-slate-400">@ :</span>
                              <span className="font-medium">{(footing.spacingY || 0).toFixed(0)} mm</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Beam Shear */}
                        <div className="bg-slate-50 dark:bg-slate-900 rounded p-2">
                          <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2 text-xs">
                            ✂️ Beam Shear
                          </h4>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-600 dark:text-slate-400">Vu(X):</span>
                              <span className="font-medium">{(footing.beamShearX || 0).toFixed(2)} T</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600 dark:text-slate-400">φVc(X):</span>
                              <span className="font-medium">{(footing.beamShearCapacityX || 0).toFixed(2)} T</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600 dark:text-slate-400">X:</span>
                              <span className={`font-semibold ${footing.beamShearOkX ? 'text-green-600' : 'text-red-600'}`}>
                                {footing.beamShearOkX ? '✓ OK' : '✗ NG'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600 dark:text-slate-400">Y:</span>
                              <span className={`font-semibold ${footing.beamShearOkY ? 'text-green-600' : 'text-red-600'}`}>
                                {footing.beamShearOkY ? '✓ OK' : '✗ NG'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Punching Shear */}
                        <div className="bg-slate-50 dark:bg-slate-900 rounded p-2">
                          <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2 text-xs">
                            🎯 Punching Shear
                          </h4>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-600 dark:text-slate-400">Vu:</span>
                              <span className="font-medium">{(footing.punchingShear || 0).toFixed(2)} Tonf</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600 dark:text-slate-400">φVc:</span>
                              <span className="font-medium">{(footing.punchingShearCapacity || 0).toFixed(2)} Tonf</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600 dark:text-slate-400">Util:</span>
                              <span className="font-medium">
                                {((footing.punchingShear || 0) / (footing.punchingShearCapacity || 1) * 100).toFixed(1)}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600 dark:text-slate-400">Status:</span>
                              <span className={`font-semibold ${footing.punchingShearOk ? 'text-green-600' : 'text-red-600'}`}>
                                {footing.punchingShearOk ? '✓ OK' : '✗ NG'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Right Column: Diagrams */}
                    {showDiagrams[index.toString()] && (
                      <div>
                        <FootingDiagram 
                          footing={footing}
                          inputs={{
                            fc: (customInputs[index] as any)?.customFc || globalInputs.fc,
                            fy: (customInputs[index] as any)?.customFy || globalInputs.fy,
                            cover: (customInputs[index] as any)?.customCover || globalInputs.cover,
                            barSize: footing.customBarSize || globalInputs.barSize,
                            columnWidth: footing.customColumnWidth || globalInputs.columnWidth,
                            columnDepth: footing.customColumnDepth || globalInputs.columnDepth,
                          }}
                          index={index}
                        />
                      </div>
                    )}
                  </div>
                  
                  {showSteps[index.toString()] && (
                    <FootingCalculationSteps
                      footing={footing}
                      inputs={{
                        fc: (customInputs[index] as any)?.customFc || globalInputs.fc,
                        fy: (customInputs[index] as any)?.customFy || globalInputs.fy,
                        cover: (customInputs[index] as any)?.customCover || globalInputs.cover,
                        barSize: footing.customBarSize || globalInputs.barSize,
                        columnWidth: footing.customColumnWidth || globalInputs.columnWidth,
                        columnDepth: footing.customColumnDepth || globalInputs.columnDepth,
                      }}
                      bearingCapacity={bearingCapacity}
                    />
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
}
