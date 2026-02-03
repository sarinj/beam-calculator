'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { TranslationKey } from '@/lib/translations';

interface FootingTypeCardProps {
  href: string;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
}

function FootingSvg() {
  return (
    <svg width="140" height="120" viewBox="0 0 140 120">
      {/* Grid background */}
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#cbd5e1" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="140" height="120" fill="url(#grid)" />

      {/* Soil surface */}
      <line x1="10" y1="50" x2="130" y2="50" stroke="#8b7355" strokeWidth="3" />

      {/* Footing squares */}
      {/* Footing 1 */}
      <rect
        x="25"
        y="40"
        width="20"
        height="20"
        className="fill-blue-200 dark:fill-blue-600 stroke-blue-600 dark:stroke-blue-400"
        strokeWidth="2"
      />
      <circle cx="35" cy="50" r="2" className="fill-blue-600 dark:fill-blue-300" />

      {/* Footing 2 */}
      <rect
        x="60"
        y="35"
        width="20"
        height="20"
        className="fill-green-200 dark:fill-green-600 stroke-green-600 dark:stroke-green-400"
        strokeWidth="2"
      />
      <circle cx="70" cy="45" r="2" className="fill-green-600 dark:fill-green-300" />

      {/* Footing 3 */}
      <rect
        x="95"
        y="40"
        width="20"
        height="20"
        className="fill-orange-200 dark:fill-orange-600 stroke-orange-600 dark:stroke-orange-400"
        strokeWidth="2"
      />
      <circle cx="105" cy="50" r="2" className="fill-orange-600 dark:fill-orange-300" />

      {/* X and Y axes */}
      <g stroke="#64748b" strokeWidth="1" opacity="0.5">
        <line x1="10" y1="80" x2="130" y2="80" />
        <line x1="10" y1="60" x2="10" y2="100" />
        <text x="130" y="95" fontSize="10" fill="#64748b">
          x
        </text>
        <text x="8" y="65" fontSize="10" fill="#64748b">
          y
        </text>
      </g>
    </svg>
  );
}

export function FootingTypeCard({
  href,
  titleKey,
  descriptionKey,
}: FootingTypeCardProps) {
  const { t } = useLanguage();

  return (
    <Link href={href}>
      <Card className="group cursor-pointer hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-500 transition-all duration-200 h-full dark:bg-slate-800 dark:border-slate-700">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col items-center text-center">
            {/* Footing Diagram */}
            <div className="w-full h-32 sm:h-40 bg-slate-100 dark:bg-slate-700 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
              <FootingSvg />
            </div>

            <h3 className="text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {t(titleKey)}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2">
              {t(descriptionKey)}
            </p>

            <div className="mt-4 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-xs sm:text-sm font-medium group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
              {t('calculate')} →
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
