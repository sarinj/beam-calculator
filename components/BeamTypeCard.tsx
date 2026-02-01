"use client"

import Link from "next/link"
import { useLanguage } from "@/contexts/LanguageContext"
import { Card, CardContent } from "@/components/ui/card"
import { TranslationKey } from "@/lib/translations"

interface BeamTypeCardProps {
  href: string
  titleKey: TranslationKey
  descriptionKey: TranslationKey
  type: "single" | "double"
}

function SingleBeamSvg() {
  return (
    <svg width="140" height="120" viewBox="0 0 140 120">
      {/* Concrete section */}
      <rect
        x="30"
        y="15"
        width="80"
        height="90"
        className="fill-slate-200 dark:fill-slate-600 stroke-slate-500 dark:stroke-slate-400"
        strokeWidth="2"
      />
      {/* Stirrup */}
      <rect
        x="38"
        y="23"
        width="64"
        height="74"
        fill="none"
        className="stroke-green-500"
        strokeWidth="3"
        rx="3"
      />
      {/* Bottom bars only */}
      <circle cx="50" cy="85" r="6" className="fill-blue-500 stroke-blue-700" strokeWidth="1" />
      <circle cx="70" cy="85" r="6" className="fill-blue-500 stroke-blue-700" strokeWidth="1" />
      <circle cx="90" cy="85" r="6" className="fill-blue-500 stroke-blue-700" strokeWidth="1" />
    </svg>
  )
}

function DoubleBeamSvg() {
  return (
    <svg width="140" height="120" viewBox="0 0 140 120">
      {/* Concrete section */}
      <rect
        x="30"
        y="15"
        width="80"
        height="90"
        className="fill-slate-200 dark:fill-slate-600 stroke-slate-500 dark:stroke-slate-400"
        strokeWidth="2"
      />
      {/* Stirrup */}
      <rect
        x="38"
        y="23"
        width="64"
        height="74"
        fill="none"
        className="stroke-green-500"
        strokeWidth="3"
        rx="3"
      />
      {/* Top bars (compression) */}
      <circle cx="55" cy="35" r="5" className="fill-orange-500 stroke-orange-700" strokeWidth="1" />
      <circle cx="85" cy="35" r="5" className="fill-orange-500 stroke-orange-700" strokeWidth="1" />
      {/* Bottom bars (tension) */}
      <circle cx="50" cy="85" r="6" className="fill-blue-500 stroke-blue-700" strokeWidth="1" />
      <circle cx="70" cy="85" r="6" className="fill-blue-500 stroke-blue-700" strokeWidth="1" />
      <circle cx="90" cy="85" r="6" className="fill-blue-500 stroke-blue-700" strokeWidth="1" />
    </svg>
  )
}

export function BeamTypeCard({ href, titleKey, descriptionKey, type }: BeamTypeCardProps) {
  const { t } = useLanguage()

  return (
    <Link href={href}>
      <Card className="group cursor-pointer hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-500 transition-all duration-200 h-full dark:bg-slate-800 dark:border-slate-700">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col items-center text-center">
            {/* Beam Diagram */}
            <div className="w-full h-32 sm:h-40 bg-slate-100 dark:bg-slate-700 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
              {type === "single" ? <SingleBeamSvg /> : <DoubleBeamSvg />}
            </div>

            <h3 className="text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {t(titleKey)}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2">
              {t(descriptionKey)}
            </p>

            <div className="mt-4 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-xs sm:text-sm font-medium group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
              {t("calculate")} →
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
