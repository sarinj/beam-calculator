"use client"

import Link from "next/link"
import { useLanguage } from "@/contexts/LanguageContext"
import { LanguageToggle } from "@/components/LanguageToggle"
import { Card, CardContent } from "@/components/ui/card"

export default function Home() {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {t("appTitle")}
            </h1>
            <p className="text-sm text-slate-500">{t("appSubtitle")}</p>
          </div>
          <LanguageToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <h2 className="text-xl font-semibold text-slate-700 mb-2">
            {t("selectBeamType")}
          </h2>
          <p className="text-slate-500">{t("selectBeamTypeDesc")}</p>
        </div>

        {/* Beam Type Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Single RC Beam */}
          <Link href="/single-beam">
            <Card className="group cursor-pointer hover:shadow-lg hover:border-blue-300 transition-all duration-200 h-full">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center">
                  {/* Beam Diagram */}
                  <div className="w-full h-40 bg-slate-100 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                    <svg width="140" height="120" viewBox="0 0 140 120">
                      {/* Concrete section */}
                      <rect
                        x="30"
                        y="15"
                        width="80"
                        height="90"
                        fill="#e2e8f0"
                        stroke="#64748b"
                        strokeWidth="2"
                      />
                      {/* Stirrup */}
                      <rect
                        x="38"
                        y="23"
                        width="64"
                        height="74"
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth="3"
                        rx="3"
                      />
                      {/* Bottom bars only */}
                      <circle
                        cx="50"
                        cy="85"
                        r="6"
                        fill="#3b82f6"
                        stroke="#1e40af"
                        strokeWidth="1"
                      />
                      <circle
                        cx="70"
                        cy="85"
                        r="6"
                        fill="#3b82f6"
                        stroke="#1e40af"
                        strokeWidth="1"
                      />
                      <circle
                        cx="90"
                        cy="85"
                        r="6"
                        fill="#3b82f6"
                        stroke="#1e40af"
                        strokeWidth="1"
                      />
                    </svg>
                  </div>

                  <h3 className="text-lg font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                    {t("singleBeam")}
                  </h3>
                  <p className="text-sm text-slate-500 mt-2">
                    {t("singleBeamDesc")}
                  </p>

                  <div className="mt-4 px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-sm font-medium group-hover:bg-blue-100 transition-colors">
                    {t("calculate")} →
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Double RC Beam */}
          <Link href="/double-beam">
            <Card className="group cursor-pointer hover:shadow-lg hover:border-blue-300 transition-all duration-200 h-full">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center">
                  {/* Beam Diagram */}
                  <div className="w-full h-40 bg-slate-100 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                    <svg width="140" height="120" viewBox="0 0 140 120">
                      {/* Concrete section */}
                      <rect
                        x="30"
                        y="15"
                        width="80"
                        height="90"
                        fill="#e2e8f0"
                        stroke="#64748b"
                        strokeWidth="2"
                      />
                      {/* Stirrup */}
                      <rect
                        x="38"
                        y="23"
                        width="64"
                        height="74"
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth="3"
                        rx="3"
                      />
                      {/* Top bars (compression) */}
                      <circle
                        cx="55"
                        cy="35"
                        r="5"
                        fill="#f97316"
                        stroke="#c2410c"
                        strokeWidth="1"
                      />
                      <circle
                        cx="85"
                        cy="35"
                        r="5"
                        fill="#f97316"
                        stroke="#c2410c"
                        strokeWidth="1"
                      />
                      {/* Bottom bars (tension) */}
                      <circle
                        cx="50"
                        cy="85"
                        r="6"
                        fill="#3b82f6"
                        stroke="#1e40af"
                        strokeWidth="1"
                      />
                      <circle
                        cx="70"
                        cy="85"
                        r="6"
                        fill="#3b82f6"
                        stroke="#1e40af"
                        strokeWidth="1"
                      />
                      <circle
                        cx="90"
                        cy="85"
                        r="6"
                        fill="#3b82f6"
                        stroke="#1e40af"
                        strokeWidth="1"
                      />
                    </svg>
                  </div>

                  <h3 className="text-lg font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                    {t("doubleBeam")}
                  </h3>
                  <p className="text-sm text-slate-500 mt-2">
                    {t("doubleBeamDesc")}
                  </p>

                  <div className="mt-4 px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-sm font-medium group-hover:bg-blue-100 transition-colors">
                    {t("calculate")} →
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Features */}
        {/* <div className="mt-16 grid md:grid-cols-3 gap-6 text-center">
          <div className="p-4">
            <div className="text-3xl mb-2">📐</div>
            <h4 className="font-medium text-slate-700">
              {t("featureAccurate")}
            </h4>
            <p className="text-sm text-slate-500 mt-1">
              {t("featureAccurateDesc")}
            </p>
          </div>
          <div className="p-4">
            <div className="text-3xl mb-2">⚡</div>
            <h4 className="font-medium text-slate-700">
              {t("featureRealtime")}
            </h4>
            <p className="text-sm text-slate-500 mt-1">
              {t("featureRealtimeDesc")}
            </p>
          </div>
          <div className="p-4">
            <div className="text-3xl mb-2">🌏</div>
            <h4 className="font-medium text-slate-700">
              {t("featureBilingual")}
            </h4>
            <p className="text-sm text-slate-500 mt-1">
              {t("featureBilingualDesc")}
            </p>
          </div>
        </div> */}
      </main>

      {/* Footer */}
      {/* <footer className="border-t bg-white mt-12">
        <div className="max-w-5xl mx-auto px-6 py-6 text-center text-sm text-slate-500">
          RC Beam Analysis Calculator - Built with Next.js
        </div>
      </footer> */}
    </div>
  )
}
