'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { Card } from '@/components/ui/card';
import { CalculatedFooting } from '@/types/footing';

interface FootingTableProps {
  footings: CalculatedFooting[];
}

export function FootingTable({ footings }: FootingTableProps) {
  const { t } = useLanguage();

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
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-700 border-b dark:border-slate-600">
              <th className="px-3 py-2 text-left font-semibold text-slate-700 dark:text-slate-200 text-xs sm:text-sm">
                {t('uniqueName')}
              </th>
              <th className="px-3 py-2 text-right font-semibold text-slate-700 dark:text-slate-200 text-xs sm:text-sm">
                {t('xCoordinate')}
              </th>
              <th className="px-3 py-2 text-right font-semibold text-slate-700 dark:text-slate-200 text-xs sm:text-sm">
                {t('yCoordinate')}
              </th>
              <th className="px-3 py-2 text-right font-semibold text-slate-700 dark:text-slate-200 text-xs sm:text-sm">
                {t('dlSdl')}
              </th>
              <th className="px-3 py-2 text-right font-semibold text-slate-700 dark:text-slate-200 text-xs sm:text-sm">
                {t('ll')}
              </th>
              <th className="px-3 py-2 text-right font-semibold text-slate-700 dark:text-slate-200 text-xs sm:text-sm">
                {t('totalLoad')}
              </th>
              <th className="px-3 py-2 text-right font-semibold text-slate-700 dark:text-slate-200 text-xs sm:text-sm">
                {t('requiredArea')}
              </th>
              <th className="px-3 py-2 text-right font-semibold text-slate-700 dark:text-slate-200 text-xs sm:text-sm">
                {t('footingDimension')}
              </th>
              <th className="px-3 py-2 text-right font-semibold text-slate-700 dark:text-slate-200 text-xs sm:text-sm">
                {t('utilizationRatio')}
              </th>
            </tr>
          </thead>
          <tbody>
            {footings.map((footing, index) => (
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
