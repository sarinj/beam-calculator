'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { Card } from '@/components/ui/card';
import { CalculatedFooting } from '@/types/footing';
import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface FootingTableProps {
  footings: CalculatedFooting[];
}

type SortColumn = 'uniqueName' | 'x' | 'y' | 'dl_sdl' | 'll' | 'totalLoad' | 'requiredArea' | 'dimension' | 'utilizationRatio';
type SortDirection = 'asc' | 'desc' | null;

export function FootingTable({ footings }: FootingTableProps) {
  const { t } = useLanguage();
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const sortedFootings = useMemo(() => {
    if (!sortColumn || !sortDirection) {
      return footings;
    }

    const sorted = [...footings].sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;

      switch (sortColumn) {
        case 'uniqueName':
          aVal = a.uniqueName;
          bVal = b.uniqueName;
          break;
        case 'x':
          aVal = a.x;
          bVal = b.x;
          break;
        case 'y':
          aVal = a.y;
          bVal = b.y;
          break;
        case 'dl_sdl':
          aVal = a.dl_sdl;
          bVal = b.dl_sdl;
          break;
        case 'll':
          aVal = a.ll;
          bVal = b.ll;
          break;
        case 'totalLoad':
          aVal = a.totalLoad;
          bVal = b.totalLoad;
          break;
        case 'requiredArea':
          aVal = a.requiredArea;
          bVal = b.requiredArea;
          break;
        case 'dimension':
          aVal = a.dimension;
          bVal = b.dimension;
          break;
        case 'utilizationRatio':
          aVal = a.utilizationRatio;
          bVal = b.utilizationRatio;
          break;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });

    return sorted;
  }, [footings, sortColumn, sortDirection]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortColumn(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const SortHeader = ({
    label,
    column,
    align = 'left',
  }: {
    label: string;
    column: SortColumn;
    align?: 'left' | 'right';
  }) => (
    <th
      className={`px-3 py-2 text-${align} font-semibold text-slate-700 dark:text-slate-200 text-xs sm:text-sm cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors`}
      onClick={() => handleSort(column)}
    >
      <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
        <span>{label}</span>
        {sortColumn === column && (
          <span className="flex-shrink-0">
            {sortDirection === 'asc' ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </span>
        )}
      </div>
    </th>
  );

  if (footings.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
          {t('noDataFound')}
        </p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden flex flex-col h-full">
      <div className="overflow-x-auto overflow-y-auto flex-1">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-100 dark:bg-slate-700 border-b dark:border-slate-600">
            <tr>
              <SortHeader label={t('uniqueName')} column="uniqueName" align="left" />
              <SortHeader label={t('xCoordinate')} column="x" align="right" />
              <SortHeader label={t('yCoordinate')} column="y" align="right" />
              <SortHeader label={t('dlSdl')} column="dl_sdl" align="right" />
              <SortHeader label={t('ll')} column="ll" align="right" />
              <SortHeader label={t('totalLoad')} column="totalLoad" align="right" />
              <SortHeader label={t('requiredArea')} column="requiredArea" align="right" />
              <SortHeader label={t('footingDimension')} column="dimension" align="right" />
              <SortHeader label={t('utilizationRatio')} column="utilizationRatio" align="right" />
            </tr>
          </thead>
          <tbody>
            {sortedFootings.map((footing, index) => (
              <tr
                key={index}
                className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <td className="px-3 py-2 text-slate-900 dark:text-slate-100 font-medium text-xs sm:text-sm">
                  {footing.uniqueName}
                </td>
                <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-300 text-xs sm:text-sm">
                  {footing.x.toFixed(2)}
                </td>
                <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-300 text-xs sm:text-sm">
                  {footing.y.toFixed(2)}
                </td>
                <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-300 text-xs sm:text-sm">
                  {footing.dl_sdl.toFixed(2)}
                </td>
                <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-300 text-xs sm:text-sm">
                  {footing.ll.toFixed(2)}
                </td>
                <td className="px-3 py-2 text-right text-slate-900 dark:text-slate-100 font-semibold text-xs sm:text-sm">
                  {footing.totalLoad.toFixed(2)}
                </td>
                <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-300 text-xs sm:text-sm">
                  {footing.requiredArea.toFixed(3)}
                </td>
                <td className="px-3 py-2 text-right text-slate-900 dark:text-slate-100 font-semibold text-xs sm:text-sm">
                  {footing.dimension.toFixed(2)}
                </td>
                <td
                  className={`px-3 py-2 text-right font-semibold text-xs sm:text-sm ${
                    footing.utilizationRatio > 100
                      ? 'text-red-600 dark:text-red-400'
                      : footing.utilizationRatio > 85
                        ? 'text-orange-600 dark:text-orange-400'
                        : 'text-green-600 dark:text-green-400'
                  }`}
                >
                  {footing.utilizationRatio.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
