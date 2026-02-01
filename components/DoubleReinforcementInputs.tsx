'use client';

import { ReinforcementLayer, DeformedBar, RoundBar } from '@/types/beam';
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

// Real-world limits
const MAX_TENSION_LAYERS = 3;
const MAX_COMPRESSION_LAYERS = 2;
const MAX_BARS_PER_LAYER = 8;

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

  const canAddTensionLayer = tensionLayers.length < MAX_TENSION_LAYERS;
  const canAddCompressionLayer = compressionLayers.length < MAX_COMPRESSION_LAYERS;

  const addTensionLayer = () => {
    if (!canAddTensionLayer) return;
    const newLayer: ReinforcementLayer = {
      id: `tension-${Date.now()}`,
      barSize: 'DB20',
      count: 2,
    };
    onTensionLayersChange([...tensionLayers, newLayer]);
  };

  const addCompressionLayer = () => {
    if (!canAddCompressionLayer) return;
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
      className={`flex flex-wrap items-center gap-2 p-2 rounded ${
        type === 'tension'
          ? 'bg-blue-50 dark:bg-blue-900/20'
          : 'bg-orange-50 dark:bg-orange-900/20'
      }`}
    >
      <span className="text-xs text-slate-500 dark:text-slate-400 w-8">
        {index + 1}
      </span>

      <Select
        value={layer.barSize}
        onValueChange={(v) => updateLayer(layer.id, { barSize: v as DeformedBar }, type)}
      >
        <SelectTrigger className="w-20 h-7 text-xs dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
          {deformedBars.map((bar) => (
            <SelectItem key={bar} value={bar} className="dark:text-slate-100 dark:focus:bg-slate-700">
              {bar}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="text-slate-400 text-xs">×</span>

      <Input
        type="number"
        min={1}
        max={MAX_BARS_PER_LAYER}
        value={layer.count}
        onChange={(e) =>
          updateLayer(
            layer.id,
            { count: Math.min(MAX_BARS_PER_LAYER, Math.max(1, parseInt(e.target.value) || 1)) },
            type
          )
        }
        className="w-12 h-7 text-xs text-center dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
      />

      {canRemove && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => removeLayer(layer.id, type)}
          className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 ml-auto"
        >
          ×
        </Button>
      )}
    </div>
  );

  return (
    <Card className="h-full flex flex-col dark:bg-slate-800 dark:border-slate-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold dark:text-slate-100">{t('reinforcement')}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col space-y-3 overflow-auto">
        {/* Compression bars (top) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-orange-600 dark:text-orange-400 font-medium">
              {t('compressionReinforcement')} ({compressionLayers.length}/{MAX_COMPRESSION_LAYERS})
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addCompressionLayer}
              disabled={!canAddCompressionLayer}
              className="h-6 text-xs px-2 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
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
            <Label className="text-xs text-blue-600 dark:text-blue-400 font-medium">
              {t('tensionReinforcement')} ({tensionLayers.length}/{MAX_TENSION_LAYERS})
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addTensionLayer}
              disabled={!canAddTensionLayer}
              className="h-6 text-xs px-2 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
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
        <div className="space-y-2 pt-2 border-t dark:border-slate-700">
          <Label className="text-xs text-slate-600 dark:text-slate-400">{t('stirrups')}</Label>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={stirrupSize}
              onValueChange={(v) => onStirrupSizeChange(v as RoundBar)}
            >
              <SelectTrigger className="w-20 h-8 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                {roundBars.map((bar) => (
                  <SelectItem key={bar} value={bar} className="dark:text-slate-100 dark:focus:bg-slate-700">
                    {bar}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="text-slate-400 text-sm">@</span>

            <div className="relative flex-1 min-w-20">
              <Input
                type="number"
                min={5}
                max={30}
                value={stirrupSpacing}
                onChange={(e) =>
                  onStirrupSpacingChange(Math.min(30, Math.max(5, parseFloat(e.target.value) || 5)))
                }
                className="h-8 pr-10 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
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
