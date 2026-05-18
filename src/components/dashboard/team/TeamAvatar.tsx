import React from 'react'

const TeamAvatar: React.FC<{ name: string }> = ({ name }) => {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
      {initials || 'U'}
    </div>
  )
}

export default TeamAvatar
