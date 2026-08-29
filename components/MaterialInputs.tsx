'use client';

import { ConcreteGrade, SteelGradeFy, SteelGradeFv } from '@/types/beam';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface MaterialInputsProps {
  concreteGrade: ConcreteGrade;
  steelGradeFy: SteelGradeFy;
  steelGradeFv: SteelGradeFv;
  onConcreteGradeChange: (value: ConcreteGrade) => void;
  onSteelGradeFyChange: (value: SteelGradeFy) => void;
  onSteelGradeFvChange: (value: SteelGradeFv) => void;
}

const concreteGrades: ConcreteGrade[] = [180, 210, 240, 280, 320, 350];
const steelGrades: SteelGradeFy[] = [2400, 3000, 4000, 5000];

export function MaterialInputs({
  concreteGrade,
  steelGradeFy,
  steelGradeFv,
  onConcreteGradeChange,
  onSteelGradeFyChange,
  onSteelGradeFvChange,
}: MaterialInputsProps) {
  const { t } = useLanguage();

  return (
    <Card className="h-full dark:bg-slate-800 dark:border-slate-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold dark:text-slate-100">{t('materialProperties')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-600 dark:text-slate-400">f&apos;c</Label>
          <Select
            value={concreteGrade.toString()}
            onValueChange={(v) => onConcreteGradeChange(Number(v) as ConcreteGrade)}
          >
            <SelectTrigger className="h-9 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
              {concreteGrades.map((grade) => (
                <SelectItem key={grade} value={grade.toString()} className="dark:text-slate-100 dark:focus:bg-slate-700">
                  {grade} {t('kgcm2')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-slate-600 dark:text-slate-400">fy (Flexural)</Label>
          <Select
            value={steelGradeFy.toString()}
            onValueChange={(v) => onSteelGradeFyChange(Number(v) as SteelGradeFy)}
          >
            <SelectTrigger className="h-9 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
              {steelGrades.map((grade) => (
                <SelectItem key={grade} value={grade.toString()} className="dark:text-slate-100 dark:focus:bg-slate-700">
                  {grade} {t('kgcm2')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-slate-600 dark:text-slate-400">fv (Shear)</Label>
          <Select
            value={steelGradeFv.toString()}
            onValueChange={(v) => onSteelGradeFvChange(Number(v) as SteelGradeFv)}
          >
            <SelectTrigger className="h-9 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
              {steelGrades.map((grade) => (
                <SelectItem key={grade} value={grade.toString()} className="dark:text-slate-100 dark:focus:bg-slate-700">
                  {grade} {t('kgcm2')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
