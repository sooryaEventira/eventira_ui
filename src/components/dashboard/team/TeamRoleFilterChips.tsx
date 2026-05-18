import React from 'react'
import { ROLE_LABELS, ROLE_OPTIONS, type TeamRoleFilterValue } from './teamTypes'

interface TeamRoleFilterChipsProps {
  value: TeamRoleFilterValue
  onChange: (next: TeamRoleFilterValue) => void
  /** Extra wrapper classes (e.g. rounded border for team table subheader) */
  className?: string
}

const TeamRoleFilterChips: React.FC<TeamRoleFilterChipsProps> = ({ value, onChange, className = '' }) => {
  const chip = (active: boolean) =>
    [
      'rounded-full px-3 py-1 text-xs font-medium transition-colors',
      active
        ? 'bg-primary text-white'
        : 'border border-slate-200 bg-white text-slate-700 hover:border-primary/40',
    ].join(' ')

  return (
    <div className={className}>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Role</div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => onChange('all')} className={chip(value === 'all')}>
          All
        </button>
        {ROLE_OPTIONS.map((role) => (
          <button key={role} type="button" onClick={() => onChange(role)} className={chip(value === role)}>
            {ROLE_LABELS[role]}
          </button>
        ))}
      </div>
    </div>
  )
}

export default TeamRoleFilterChips
