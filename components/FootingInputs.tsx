'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertCircle, Upload, CheckCircle } from 'lucide-react';
import { useState, useRef } from 'react';
import { ProcessedFooting } from '@/types/footing';

interface FootingInputsProps {
  concreteStrength: number;
  allowableBearingCapacity: number;
  onConcreteStrengthChange: (value: number) => void;
  onAllowableBearingCapacityChange: (value: number) => void;
  onFileImport: (footings: ProcessedFooting[]) => void;
  isLoading?: boolean;
  error?: string;
  successMessage?: string;
}

export function FootingInputs({
  concreteStrength,
  allowableBearingCapacity,
  onConcreteStrengthChange,
  onAllowableBearingCapacityChange,
  onFileImport,
  isLoading = false,
  error,
  successMessage,
}: FootingInputsProps) {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const { parseExcelFile } = await import('@/lib/excel-parser');
      const footings = await parseExcelFile(file);
      
      if (footings.length === 0) {
        throw new Error(t('noDataFound'));
      }

      onFileImport(footings);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Error parsing file:', err);
      const errorMessage = err instanceof Error ? err.message : t('fileParseFailed');
      // Error will be displayed via error prop
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Material Properties */}
      <Card className="p-3 sm:p-4">
        <h3 className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100 mb-3">
          {t('materialProperties')}
        </h3>
        <div className="space-y-3">
          <div>
            <Label htmlFor="concrete-strength" className="text-xs sm:text-sm">
              {t('concreteGrade')} (ksc)
            </Label>
            <Input
              id="concrete-strength"
              type="number"
              value={concreteStrength}
              onChange={(e) => onConcreteStrengthChange(Number(e.target.value) || 0)}
              min={100}
              max={500}
              step={10}
              className="mt-1 text-sm"
            />
          </div>

          <div>
            <Label htmlFor="bearing-capacity" className="text-xs sm:text-sm">
              {t('allowableBearingCapacity')} ({t('soilBearingCapacityUnit')})
            </Label>
            <Input
              id="bearing-capacity"
              type="number"
              value={allowableBearingCapacity}
              onChange={(e) => onAllowableBearingCapacityChange(Number(e.target.value) || 0)}
              min={1}
              max={100}
              step={0.5}
              className="mt-1 text-sm"
            />
          </div>
        </div>
      </Card>

      {/* File Import */}
      <Card className="p-3 sm:p-4">
        <h3 className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100 mb-3">
          {t('importExcel')}
        </h3>
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileImport}
            disabled={isLoading}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="w-full text-xs sm:text-sm"
          >
            <Upload className="w-3.5 h-3.5 mr-2" />
            {isLoading ? 'Importing...' : t('selectFile')}
          </Button>

          {/* Sheet Info */}
          <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
            <p className="font-medium">{t('requiredSheets')}:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>{t('jointReactionsSheet')} (Columns: C, D, H)</li>
              <li>{t('pointObjectConnectivitySheet')} (Columns: A, F, G)</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Messages */}
      {error && (
        <div className="flex gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs sm:text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="flex gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs sm:text-sm text-green-700 dark:text-green-300">{successMessage}</p>
        </div>
      )}
    </div>
  );
}
