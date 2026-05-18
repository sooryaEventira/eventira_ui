import React from 'react'
import type { TeamMember } from './teamTypes'

const TeamStatusBadge: React.FC<{ status: TeamMember['status'] }> = ({ status }) => {
  const isActive = status === 'active'
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        isActive ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700',
      ].join(' ')}
    >
      {isActive ? 'Active' : 'Pending'}
    </span>
  )
}

export default TeamStatusBadge
