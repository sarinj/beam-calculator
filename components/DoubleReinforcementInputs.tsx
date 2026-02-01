'use client';

import { ReinforcementLayer, DeformedBar, RoundBar } from '@/types/beam';
import { deformedBarData, roundBarData } from '@/lib/calculations/common';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DoubleReinforcementInputsProps {
  tensionLayers: ReinforcementLayer[];
  compressionLayers: ReinforcementLayer[];
  stirrupSize: RoundBar;
  stirrupSpacing: number;
  onTensionLayersChange: (layers: ReinforcementLayer[]) => void;
  onCompressionLayersChange: (layers: ReinforcementLayer[]) => void;
  onStirrupSizeChange: (size: RoundBar) => void;
  onStirrupSpacingChange: (spacing: number) => void;
}

const deformedBars: DeformedBar[] = ['DB10', 'DB12', 'DB16', 'DB20', 'DB25', 'DB28', 'DB32'];
const roundBars: RoundBar[] = ['RB6', 'RB9', 'RB12'];

export function DoubleReinforcementInputs({
  tensionLayers,
  compressionLayers,
  stirrupSize,
  stirrupSpacing,
  onTensionLayersChange,
  onCompressionLayersChange,
  onStirrupSizeChange,
  onStirrupSpacingChange,
}: DoubleReinforcementInputsProps) {
  const { t } = useLanguage();

  const addTensionLayer = () => {
    const newLayer: ReinforcementLayer = {
      id: `tension-${Date.now()}`,
      barSize: 'DB20',
      count: 2,
    };
    onTensionLayersChange([...tensionLayers, newLayer]);
  };

  const addCompressionLayer = () => {
    const newLayer: ReinforcementLayer = {
      id: `comp-${Date.now()}`,
      barSize: 'DB16',
      count: 2,
    };
    onCompressionLayersChange([...compressionLayers, newLayer]);
  };

  const removeLayer = (id: string, type: 'tension' | 'compression') => {
    if (type === 'tension' && tensionLayers.length > 1) {
      onTensionLayersChange(tensionLayers.filter((layer) => layer.id !== id));
    } else if (type === 'compression' && compressionLayers.length > 1) {
      onCompressionLayersChange(compressionLayers.filter((layer) => layer.id !== id));
    }
  };

  const updateLayer = (
    id: string,
    updates: Partial<ReinforcementLayer>,
    type: 'tension' | 'compression'
  ) => {
    if (type === 'tension') {
      onTensionLayersChange(
        tensionLayers.map((layer) =>
          layer.id === id ? { ...layer, ...updates } : layer
        )
      );
    } else {
      onCompressionLayersChange(
        compressionLayers.map((layer) =>
          layer.id === id ? { ...layer, ...updates } : layer
        )
      );
    }
  };

  const renderLayerInput = (
    layer: ReinforcementLayer,
    index: number,
    type: 'tension' | 'compression',
    canRemove: boolean
  ) => (
    <div
      key={layer.id}
      className={`flex items-center gap-2 p-2 rounded ${
        type === 'tension' ? 'bg-blue-50' : 'bg-orange-50'
      }`}
    >
      <span className="text-xs text-slate-500 w-8">
        {index + 1}
      </span>

      <Select
        value={layer.barSize}
        onValueChange={(v) => updateLayer(layer.id, { barSize: v as DeformedBar }, type)}
      >
        <SelectTrigger className="w-20 h-7 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {deformedBars.map((bar) => (
            <SelectItem key={bar} value={bar}>
              {bar}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="text-slate-400 text-xs">×</span>

      <Input
        type="number"
        min={1}
        max={10}
        value={layer.count}
        onChange={(e) =>
          updateLayer(layer.id, { count: Math.max(1, parseInt(e.target.value) || 1) }, type)
        }
        className="w-12 h-7 text-xs text-center"
      />

      {canRemove && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => removeLayer(layer.id, type)}
          className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 ml-auto"
        >
          ×
        </Button>
      )}
    </div>
  );

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{t('reinforcement')}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col space-y-3 overflow-auto">
        {/* Compression bars (top) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-orange-600 font-medium">{t('compressionReinforcement')}</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addCompressionLayer}
              className="h-6 text-xs px-2"
            >
              +
            </Button>
          </div>
          <div className="space-y-1">
            {compressionLayers.map((layer, index) =>
              renderLayerInput(layer, index, 'compression', compressionLayers.length > 1)
            )}
          </div>
        </div>

        {/* Tension bars (bottom) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-blue-600 font-medium">{t('tensionReinforcement')}</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addTensionLayer}
              className="h-6 text-xs px-2"
            >
              +
            </Button>
          </div>
          <div className="space-y-1">
            {tensionLayers.map((layer, index) =>
              renderLayerInput(layer, index, 'tension', tensionLayers.length > 1)
            )}
          </div>
        </div>

        {/* Stirrups */}
        <div className="space-y-2 pt-2 border-t">
          <Label className="text-xs text-slate-600">{t('stirrups')}</Label>
          <div className="flex items-center gap-2">
            <Select
              value={stirrupSize}
              onValueChange={(v) => onStirrupSizeChange(v as RoundBar)}
            >
              <SelectTrigger className="w-20 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roundBars.map((bar) => (
                  <SelectItem key={bar} value={bar}>
                    {bar}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="text-slate-400 text-sm">@</span>

            <div className="relative flex-1">
              <Input
                type="number"
                min={5}
                max={50}
                value={stirrupSpacing}
                onChange={(e) =>
                  onStirrupSpacingChange(Math.max(5, parseFloat(e.target.value) || 5))
                }
                className="h-8 pr-10"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                {t('cm')}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
