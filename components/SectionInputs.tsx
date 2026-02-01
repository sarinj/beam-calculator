'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface SectionInputsProps {
  width: number;
  height: number;
  cover: number;
  onWidthChange: (value: number) => void;
  onHeightChange: (value: number) => void;
  onCoverChange: (value: number) => void;
}

export function SectionInputs({
  width,
  height,
  cover,
  onWidthChange,
  onHeightChange,
  onCoverChange,
}: SectionInputsProps) {
  const { t } = useLanguage();

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
    <Card className="dark:bg-slate-800 dark:border-slate-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold dark:text-slate-100">{t('sectionDimensions')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600 dark:text-slate-400">{t('width')} (b)</Label>
            <div className="relative">
              <Input
                type="number"
                min={10}
                max={200}
                value={width}
                onChange={(e) => handleNumberInput(e.target.value, onWidthChange, 10)}
                className="h-9 pr-10 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                {t('cm')}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600 dark:text-slate-400">{t('height')} (h)</Label>
            <div className="relative">
              <Input
                type="number"
                min={10}
                max={300}
                value={height}
                onChange={(e) => handleNumberInput(e.target.value, onHeightChange, 10)}
                className="h-9 pr-10 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                {t('cm')}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600 dark:text-slate-400">{t('cover')}</Label>
            <div className="relative">
              <Input
                type="number"
                min={2}
                max={10}
                step={0.5}
                value={cover}
                onChange={(e) => handleNumberInput(e.target.value, onCoverChange, 2)}
                className="h-9 pr-10 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
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
