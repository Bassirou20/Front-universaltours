// src/ui/PasswordStrength.tsx
import { useMemo } from 'react'
import { Check, X } from 'lucide-react'

/**
 * Indicateur de robustesse de mot de passe.
 *
 * Score 0–4 calculé sur la longueur + la variété de caractères.
 * Affiche une barre segmentée colorée, un libellé, et la liste des
 * critères à remplir (utile pour guider l'utilisateur pendant la saisie).
 */

export type StrengthCriteria = {
  length: boolean   // ≥ 8 caractères
  lower: boolean    // une minuscule
  upper: boolean    // une majuscule
  digit: boolean    // un chiffre
  symbol: boolean   // un caractère spécial
}

export function evaluatePassword(pwd: string): { score: number; criteria: StrengthCriteria } {
  const criteria: StrengthCriteria = {
    length: pwd.length >= 8,
    lower: /[a-z]/.test(pwd),
    upper: /[A-Z]/.test(pwd),
    digit: /\d/.test(pwd),
    symbol: /[^A-Za-z0-9]/.test(pwd),
  }

  if (!pwd) return { score: 0, criteria }

  // Base : variété de caractères
  let variety = 0
  if (criteria.lower) variety++
  if (criteria.upper) variety++
  if (criteria.digit) variety++
  if (criteria.symbol) variety++

  // Score 0–4
  let score = 0
  if (criteria.length) score++
  if (variety >= 2) score++
  if (variety >= 3 && pwd.length >= 10) score++
  if (variety >= 4 && pwd.length >= 12) score++

  // Un mot de passe trop court ne dépasse jamais 1, même varié
  if (!criteria.length) score = Math.min(score, 1)

  return { score: Math.min(score, 4), criteria }
}

const LEVELS = [
  { label: 'Trop faible', color: '#dc2626', bar: 'bg-red-500' },
  { label: 'Faible',      color: '#f97316', bar: 'bg-orange-500' },
  { label: 'Moyen',       color: '#eab308', bar: 'bg-yellow-500' },
  { label: 'Bon',         color: '#16a34a', bar: 'bg-green-500' },
  { label: 'Excellent',   color: '#059669', bar: 'bg-emerald-600' },
]

export function PasswordStrength({ password }: { password: string }) {
  const { score, criteria } = useMemo(() => evaluatePassword(password), [password])

  if (!password) return null

  const level = LEVELS[score]

  const hints: { ok: boolean; label: string }[] = [
    { ok: criteria.length, label: '8 caractères' },
    { ok: criteria.upper && criteria.lower, label: 'Maj. + min.' },
    { ok: criteria.digit, label: 'Un chiffre' },
    { ok: criteria.symbol, label: 'Un symbole' },
  ]

  return (
    <div className="mt-2">
      {/* Barre segmentée */}
      <div className="flex items-center gap-1.5">
        <div className="flex-1 flex gap-1">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i < score ? level.bar : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
        <span className="text-[12px] font-semibold shrink-0 w-16 text-right" style={{ color: level.color }}>
          {level.label}
        </span>
      </div>

      {/* Critères */}
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
        {hints.map((h) => (
          <span
            key={h.label}
            className={`inline-flex items-center gap-0.5 text-[12px] ${
              h.ok ? 'text-emerald-600' : 'text-gray-400'
            }`}
          >
            {h.ok ? <Check size={9} className="stroke-[3]" /> : <X size={9} className="stroke-[3]" />}
            {h.label}
          </span>
        ))}
      </div>
    </div>
  )
}
