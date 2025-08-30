'use client'

import { useState } from 'react'

type Period = {
  key: string
  label: string
  from: string
  to: string
}

type PeriodSelectorProps = {
  onPeriodsChange: (periods: Period[]) => void
  maxSelections?: number
}

export default function PeriodSelector({ onPeriodsChange, maxSelections = 3 }: PeriodSelectorProps) {
  const [selectedPeriods, setSelectedPeriods] = useState<Period[]>([])
  const [isCompareMode, setIsCompareMode] = useState(false)

  const todayISO = new Date().toISOString().slice(0, 10)
  const currentYear = new Date().getFullYear()
  
  const availablePeriods: Period[] = [
    {
      key: '1w',
      label: '1 Semana',
      from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      to: todayISO
    },
    {
      key: '1m',
      label: '1 Mes',
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      to: todayISO
    },
    {
      key: '3m',
      label: '3 Meses',
      from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      to: todayISO
    },
    {
      key: '6m',
      label: '6 Meses',
      from: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      to: todayISO
    },
    {
      key: 'ytd',
      label: 'Este Año',
      from: `${currentYear}-01-01`,
      to: todayISO
    },
    {
      key: '1y',
      label: '1 Año',
      from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      to: todayISO
    },
    {
      key: 'prev-year',
      label: 'Año Anterior',
      from: `${currentYear - 1}-01-01`,
      to: `${currentYear - 1}-12-31`
    },
    {
      key: 'all',
      label: 'Todo el Tiempo',
      from: '2010-01-01',
      to: todayISO
    }
  ]

  const handlePeriodToggle = (period: Period) => {
    const isSelected = selectedPeriods.some(p => p.key === period.key)
    
    if (isSelected) {
      const newPeriods = selectedPeriods.filter(p => p.key !== period.key)
      setSelectedPeriods(newPeriods)
      onPeriodsChange(newPeriods)
    } else if (selectedPeriods.length < maxSelections) {
      const newPeriods = [...selectedPeriods, period]
      setSelectedPeriods(newPeriods)
      onPeriodsChange(newPeriods)
    }
  }

  const handleCompareModeToggle = () => {
    if (!isCompareMode) {
      setIsCompareMode(true)
      if (selectedPeriods.length === 0) {
        // Pre-select some common comparisons
        const defaultPeriods = [
          availablePeriods.find(p => p.key === '1m')!,
          availablePeriods.find(p => p.key === 'ytd')!
        ]
        setSelectedPeriods(defaultPeriods)
        onPeriodsChange(defaultPeriods)
      }
    } else {
      setIsCompareMode(false)
      setSelectedPeriods([])
      onPeriodsChange([])
    }
  }

  const clearAll = () => {
    setSelectedPeriods([])
    onPeriodsChange([])
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={handleCompareModeToggle}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              isCompareMode
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {isCompareMode ? 'Comparando' : 'Comparar Períodos'}
          </button>
          
          {isCompareMode && selectedPeriods.length > 0 && (
            <span className="text-xs text-gray-400">
              {selectedPeriods.length}/{maxSelections} períodos seleccionados
            </span>
          )}
        </div>

        {isCompareMode && selectedPeriods.length > 0 && (
          <button
            onClick={clearAll}
            className="text-xs text-gray-400 hover:text-gray-200 underline"
          >
            Limpiar todo
          </button>
        )}
      </div>

      {isCompareMode && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {availablePeriods.map((period) => {
            const isSelected = selectedPeriods.some(p => p.key === period.key)
            const isDisabled = !isSelected && selectedPeriods.length >= maxSelections
            
            return (
              <button
                key={period.key}
                onClick={() => handlePeriodToggle(period)}
                disabled={isDisabled}
                className={`rounded border px-2 py-1.5 text-xs font-medium transition-colors ${
                  isSelected
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : isDisabled
                    ? 'border-gray-700 text-gray-500 cursor-not-allowed'
                    : 'border-gray-700 text-gray-300 hover:bg-gray-800 hover:border-gray-600'
                }`}
              >
                {period.label}
              </button>
            )
          })}
        </div>
      )}

      {isCompareMode && selectedPeriods.length > 0 && (
        <div className="bg-gray-900/40 rounded-lg p-3 border border-gray-800">
          <div className="text-xs text-gray-400 mb-2">Períodos seleccionados:</div>
          <div className="flex flex-wrap gap-2">
            {selectedPeriods.map((period, index) => (
              <div
                key={period.key}
                className="inline-flex items-center gap-2 bg-blue-600/20 border border-blue-600/30 rounded px-2 py-1 text-xs"
              >
                <span className="text-blue-300">{period.label}</span>
                <span className="text-gray-400 text-[10px]">
                  {period.from} → {period.to}
                </span>
                <button
                  onClick={() => handlePeriodToggle(period)}
                  className="text-blue-400 hover:text-blue-200 ml-1"
                  title="Remover período"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}