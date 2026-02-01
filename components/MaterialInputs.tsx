'use client';

import { ConcreteGrade, SteelGrade } from '@/types/beam';
import { steelGradeData } from '@/lib/calculations/common';
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
  steelGrade: SteelGrade;
  onConcreteGradeChange: (value: ConcreteGrade) => void;
  onSteelGradeChange: (value: SteelGrade) => void;
}

const concreteGrades: ConcreteGrade[] = [180, 210, 240, 280, 320, 350];
const steelGrades: SteelGrade[] = ['SD30', 'SD40', 'SD50'];

export function MaterialInputs({
  concreteGrade,
  steelGrade,
  onConcreteGradeChange,
  onSteelGradeChange,
}: MaterialInputsProps) {
  const { t } = useLanguage();

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{t('materialProperties')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-600">f&apos;c</Label>
          <Select
            value={concreteGrade.toString()}
            onValueChange={(v) => onConcreteGradeChange(Number(v) as ConcreteGrade)}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {concreteGrades.map((grade) => (
                <SelectItem key={grade} value={grade.toString()}>
                  {grade} {t('kgcm2')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-slate-600">fy</Label>
          <Select
            value={steelGrade}
            onValueChange={(v) => onSteelGradeChange(v as SteelGrade)}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {steelGrades.map((grade) => (
                <SelectItem key={grade} value={grade}>
                  {grade} ({steelGradeData[grade].fy})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
