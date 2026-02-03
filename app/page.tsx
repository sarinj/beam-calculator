"use client"

import { useLanguage } from "@/contexts/LanguageContext"
import { LanguageToggle } from "@/components/LanguageToggle"
import { ThemeToggle } from "@/components/ThemeToggle"
import { BeamTypeCard } from "@/components/BeamTypeCard"
import { FootingTypeCard } from "@/components/FootingTypeCard"

export default function Home() {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-slate-800 dark:text-slate-100">
              {t("appTitle")}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">{t("appSubtitle")}</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="text-center mb-8 sm:mb-10">
          <h2 className="text-lg sm:text-xl font-semibold text-slate-700 dark:text-slate-200 mb-2">
            {t("selectBeamType")}
          </h2>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400">{t("selectBeamTypeDesc")}</p>
        </div>

        {/* Beam Type Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-3xl mx-auto">
          <BeamTypeCard
            href="/single-beam"
            titleKey="singleBeam"
            descriptionKey="singleBeamDesc"
            type="single"
          />
          <BeamTypeCard
            href="/double-beam"
            titleKey="doubleBeam"
            descriptionKey="doubleBeamDesc"
            type="double"
          />
        </div>

        {/* Footing Design Section */}
        <div className="mt-12 sm:mt-16 pt-8 sm:pt-12 border-t dark:border-slate-700">
          <div className="text-center mb-8 sm:mb-10">
            <h2 className="text-lg sm:text-xl font-semibold text-slate-700 dark:text-slate-200 mb-2">
              {t("footingDesign")}
            </h2>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400">{t("footingDesignDesc")}</p>
          </div>

          {/* Footing Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-3xl mx-auto">
            <FootingTypeCard
              href="/footing-design"
              titleKey="footingDesign"
              descriptionKey="footingDesignDesc"
            />
          </div>
        </div>
      </main>
    </div>
  )
}
