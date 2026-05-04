import React from 'react'

interface BadgeProps {
  variant?: 'primary' | 'recall' | 'warning' | 'danger' | 'streak'
  children: React.ReactNode
}

function Badge({ variant = 'primary', children }: BadgeProps): React.ReactElement {
  return (
    <span className={`badge badge-${variant}`}>
      {children}
    </span>
  )
}

export default Badge
