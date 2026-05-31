'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Sparkles, Loader2, CheckCircle, ChevronRight, Eye, Tag, Brain, Layers, StopCircle, AlertTriangle } from 'lucide-react'
import * as Progress from '@radix-ui/react-progress'
import { useLocale } from '@/lib/locale-context'

type Stage = 'vision' | 'entities' | 'enrichment' | 'categorize' | 'parallel' | null

interface StageCounts {
  visionTagged: number
  entitiesExtracted: number
  enriched: number
  categorized: number
}

interface CategorizeStatus {
  done: number
  total: number
  status: 'idle' | 'running' | 'stopping'
  stage: Stage
  stageCounts: StageCounts
  lastError: string | null
  error: string | null
  rateLimitHit: boolean
}

export default function CategorizePage() {
  const { t } = useLocale()
  const [status, setStatus] = useState<CategorizeStatus | null>(null)
  const [running, setRunning] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const STAGE_INFO: Record<NonNullable<Stage>, { label: string; icon: React.ReactNode; desc: string }> = {
    vision: {
      label: t('categorize.stage.vision'),
      icon: <Eye size={14} />,
      desc: t('categorize.stage.visionDesc'),
    },
    entities: {
      label: t('categorize.stage.entities'),
      icon: <Tag size={14} />,
      desc: t('categorize.stage.entitiesDesc'),
    },
    enrichment: {
      label: t('categorize.stage.enrichment'),
      icon: <Brain size={14} />,
      desc: t('categorize.stage.enrichmentDesc'),
    },
    categorize: {
      label: t('categorize.stage.categorize'),
      icon: <Layers size={14} />,
      desc: t('categorize.stage.categorizeDesc'),
    },
    parallel: {
      label: t('categorize.stage.parallel'),
      icon: <Sparkles size={14} />,
      desc: t('categorize.stage.parallelDesc'),
    },
  }

  // On mount, check if pipeline is already running on the server
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/categorize')
        const data = (await res.json()) as CategorizeStatus
        if (data.status === 'running' || data.status === 'stopping') {
          setStatus(data)
          setRunning(true)
          setStopping(data.status === 'stopping')
          pollStatus()
        }
      } catch { /* ignore */ }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function stopCategorization() {
    setStopping(true)
    try {
      await fetch('/api/categorize', { method: 'DELETE' })
    } catch { /* ignore */ }
  }

  async function startCategorization(force = false) {
    setError('')
    setRunning(true)
    setStopping(false)
    setDone(false)
    try {
      const res = await fetch('/api/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        throw new Error(data.error ?? 'Failed to start')
      }
      pollStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start')
      setRunning(false)
    }
  }

  function pollStatus() {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/categorize')
        const data = (await res.json()) as CategorizeStatus
        setStatus(data)
        if (data.status === 'stopping') {
          setStopping(true)
        }
        if (data.status === 'idle') {
          clearInterval(interval)
          setDone(true)
          setRunning(false)
          setStopping(false)
        }
      } catch {
        clearInterval(interval)
        setRunning(false)
      }
    }, 1000)
  }

  const progress = status
    ? Math.round((status.done / Math.max(status.total, 1)) * 100)
    : 0

  const currentStageInfo = status?.stage ? STAGE_INFO[status.stage] : null

  return (
    <div className="p-8 max-w-xl mx-auto">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-4">
          <Sparkles size={12} /> {t('categorize.badge')}
        </div>
        <h1 className="text-2xl font-bold text-zinc-100">{t('categorize.title')}</h1>
        <p className="text-zinc-400 mt-1 text-sm">
          {t('categorize.description')}
        </p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
        {!running && !done && (
          <>
            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                {error}
              </p>
            )}
            <p className="text-sm text-zinc-400 leading-relaxed">
              {t('categorize.intro')}
            </p>
            <div className="space-y-2">
              <button
                onClick={() => void startCategorization(false)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
              >
                <Sparkles size={16} />
                {t('categorize.startButton')}
              </button>
              <button
                onClick={() => void startCategorization(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-sm font-medium transition-colors border border-zinc-700"
              >
                {t('categorize.forceButton')}
              </button>
            </div>
          </>
        )}

        {running && (
          <div className="space-y-5">
            {/* Rate limit error — prominent warning */}
            {status?.rateLimitHit && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-300 text-sm font-semibold">{t('categorize.rateLimitTitle')}</p>
                  <p className="text-red-400/80 text-xs mt-1">{t('categorize.rateLimitDesc')}</p>
                  {status.lastError && (
                    <p className="text-red-500/70 text-xs mt-1 font-mono break-all">{status.lastError}</p>
                  )}
                </div>
              </div>
            )}

            {/* Current stage indicator */}
            {currentStageInfo && !status?.rateLimitHit && (
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-indigo-500/8 border border-indigo-500/20">
                <div className="text-indigo-400 mt-0.5 shrink-0">{currentStageInfo.icon}</div>
                <div>
                  <p className="text-zinc-200 text-sm font-medium">{currentStageInfo.label}</p>
                  <p className="text-zinc-500 text-xs mt-0.5">{currentStageInfo.desc}</p>
                </div>
                <Loader2 size={14} className="text-indigo-400 animate-spin shrink-0 ml-auto mt-0.5" />
              </div>
            )}

            {/* Stage counters — live updating rows */}
            {status?.stageCounts && (
              <div className="space-y-1.5">
                {[
                  { key: 'visionTagged', label: t('categorize.counter.vision'), icon: <Eye size={13} />, active: status.stage === 'vision' || status.stage === 'parallel' },
                  { key: 'entitiesExtracted', label: t('categorize.counter.entities'), icon: <Tag size={13} />, active: status.stage === 'entities' },
                  { key: 'enriched', label: t('categorize.counter.enriched'), icon: <Brain size={13} />, active: status.stage === 'enrichment' || status.stage === 'parallel' },
                  { key: 'categorized', label: t('categorize.counter.categorized'), icon: <Layers size={13} />, active: status.stage === 'categorize' || status.stage === 'parallel' },
                ].map(({ key, label, icon, active }) => {
                  const count = status.stageCounts[key as keyof StageCounts]
                  const total = key === 'categorized' ? status.total : null
                  return (
                    <div key={key} className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${active ? 'bg-indigo-500/8 border-indigo-500/20' : 'bg-zinc-800/40 border-zinc-700/30'}`}>
                      <span className={active ? 'text-indigo-400' : 'text-zinc-600'}>{icon}</span>
                      <span className={`text-sm font-semibold tabular-nums ${active ? 'text-indigo-300' : count > 0 ? 'text-zinc-200' : 'text-zinc-600'}`}>
                        {count}
                      </span>
                      <span className="text-zinc-500 text-sm">
                        {label}
                        {total != null && total > 0 ? <span className="text-zinc-600"> — {t('categorize.remaining', { n: total - count })}</span> : null}
                      </span>
                      {active && <Loader2 size={12} className="text-indigo-400 animate-spin ml-auto shrink-0" />}
                      {!active && count > 0 && <CheckCircle size={12} className="text-emerald-500 ml-auto shrink-0" />}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Stop button */}
            <button
              onClick={() => void stopCategorization()}
              disabled={stopping}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed text-red-400 text-sm font-medium transition-colors border border-red-500/20"
            >
              <StopCircle size={15} />
              {stopping ? t('categorize.stopping') : t('categorize.stopButton')}
            </button>

            {/* Last error warning (non-rate-limit) */}
            {status?.lastError && !status.rateLimitHit && (
              <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                ⚠ {status.lastError}
              </p>
            )}

            {/* Overall progress bar */}
            {(status?.stage === 'categorize' || status?.stage === 'parallel') && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>{status.done} / {status.total} {t('categorize.bookmarks')}</span>
                  <span>{progress}%</span>
                </div>
                <Progress.Root className="relative h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                  <Progress.Indicator
                    className="h-full bg-indigo-500 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </Progress.Root>
              </div>
            )}
          </div>
        )}

        {done && (
          <div className="flex flex-col items-center gap-5 py-4 text-center">
            {/* Rate limit ended the pipeline */}
            {status?.rateLimitHit ? (
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
                <AlertTriangle size={32} className="text-red-400" />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle size={32} className="text-emerald-400" />
              </div>
            )}
            <div>
              <p className="text-xl font-bold text-zinc-100">
                {status?.rateLimitHit ? t('categorize.rateLimitStopped') : t('categorize.complete')}
              </p>
              {status?.rateLimitHit && (
                <p className="text-red-400/80 text-sm mt-1">{t('categorize.rateLimitRetryHint')}</p>
              )}
              {status?.stageCounts && (
                <p className="text-zinc-500 text-sm mt-1">
                  {t('categorize.completeSummary', {
                    vision: status.stageCounts.visionTagged,
                    enriched: status.stageCounts.enriched,
                    categorized: status.stageCounts.categorized,
                  })}
                </p>
              )}
            </div>
            {status?.error && !status.rateLimitHit && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-left w-full">
                {status.error}
              </p>
            )}
            <div className="flex gap-3">
              <Link
                href="/bookmarks"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-colors"
              >
                {t('categorize.viewBookmarks')} <ChevronRight size={14} />
              </Link>
              <button
                onClick={() => { setDone(false); setStatus(null) }}
                className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors border border-zinc-700"
              >
                {t('categorize.runAgain')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
