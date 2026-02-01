"use client"

import { ReinforcementLayer, DeformedBar, RoundBar } from "@/types/beam"
import { useLanguage } from "@/contexts/LanguageContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Trash2 } from "lucide-react"

// Real-world limits
const MAX_LAYERS = 3
const MAX_BARS_PER_LAYER = 8

interface ReinforcementInputsProps {
  layers: ReinforcementLayer[]
  stirrupSize: RoundBar
  stirrupSpacing: number
  onLayersChange: (layers: ReinforcementLayer[]) => void
  onStirrupSizeChange: (size: RoundBar) => void
  onStirrupSpacingChange: (spacing: number) => void
}

const deformedBars: DeformedBar[] = [
  "DB10",
  "DB12",
  "DB16",
  "DB20",
  "DB25",
  "DB28",
  "DB32",
]
const roundBars: RoundBar[] = ["RB6", "RB9", "RB12"]

export function ReinforcementInputs({
  layers,
  stirrupSize,
  stirrupSpacing,
  onLayersChange,
  onStirrupSizeChange,
  onStirrupSpacingChange,
}: ReinforcementInputsProps) {
  const { t } = useLanguage()

  const canAddLayer = layers.length < MAX_LAYERS

  const addLayer = () => {
    if (!canAddLayer) return
    const newLayer: ReinforcementLayer = {
      id: `layer-${Date.now()}`,
      barSize: "DB20",
      count: 2,
    }
    onLayersChange([...layers, newLayer])
  }

  const removeLayer = (id: string) => {
    if (layers.length > 1) {
      onLayersChange(layers.filter((layer) => layer.id !== id))
    }
  }

  const updateLayer = (id: string, updates: Partial<ReinforcementLayer>) => {
    onLayersChange(
      layers.map((layer) =>
        layer.id === id ? { ...layer, ...updates } : layer,
      ),
    )
  }

  return (
    <Card className="h-full flex flex-col dark:bg-slate-800 dark:border-slate-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold dark:text-slate-100">
          {t("reinforcement")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col space-y-4">
        {/* Main bars */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-slate-600 dark:text-slate-400">
              {t("mainBars")} ({layers.length}/{MAX_LAYERS} {t("layers")})
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addLayer}
              disabled={!canAddLayer}
              className="h-7 text-xs dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              + {t("addLayer")}
            </Button>
          </div>

          <div className="space-y-2">
            {layers.map((layer, index) => (
              <div
                key={layer.id}
                className="flex flex-wrap items-center gap-2 sm:gap-3 p-2.5 bg-slate-50 dark:bg-slate-700/50 rounded-lg"
              >
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 w-14">
                  {t("layer")} {index + 1}
                </span>

                <Select
                  value={layer.barSize}
                  onValueChange={(v) =>
                    updateLayer(layer.id, { barSize: v as DeformedBar })
                  }
                >
                  <SelectTrigger className="w-24 h-8 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                    {deformedBars.map((bar) => (
                      <SelectItem
                        key={bar}
                        value={bar}
                        className="dark:text-slate-100 dark:focus:bg-slate-700"
                      >
                        {bar}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <span className="text-slate-400">×</span>

                <Input
                  type="number"
                  min={1}
                  max={MAX_BARS_PER_LAYER}
                  value={layer.count}
                  onChange={(e) =>
                    updateLayer(layer.id, {
                      count: Math.min(
                        MAX_BARS_PER_LAYER,
                        Math.max(1, parseInt(e.target.value) || 1),
                      ),
                    })
                  }
                  className="w-16 h-8 text-center dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
                />

                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {t("bars")}
                </span>

                {layers.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLayer(layer.id)}
                    className="h-7 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 ml-auto"
                  >
                    <Trash2 />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Stirrups */}
        <div className="space-y-2 pt-3 border-t dark:border-slate-700">
          <Label className="text-xs text-slate-600 dark:text-slate-400">
            {t("stirrups")}
          </Label>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Select
              value={stirrupSize}
              onValueChange={(v) => onStirrupSizeChange(v as RoundBar)}
            >
              <SelectTrigger className="w-24 h-9 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                {roundBars.map((bar) => (
                  <SelectItem
                    key={bar}
                    value={bar}
                    className="dark:text-slate-100 dark:focus:bg-slate-700"
                  >
                    {bar}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="text-slate-400">@</span>

            <div className="relative w-24">
              <Input
                type="number"
                min={5}
                max={30}
                value={stirrupSpacing}
                onChange={(e) =>
                  onStirrupSpacingChange(
                    Math.min(30, Math.max(5, parseFloat(e.target.value) || 5)),
                  )
                }
                className="h-9 pr-10 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                {t("cm")}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
