import React from 'react'

interface TooltipProps {
  text: string
  children: React.ReactNode
}

function Tooltip({ text, children }: TooltipProps): React.ReactElement {
  return (
    <div className="tooltip-wrapper">
      {children}
      <div className="tooltip">{text}</div>
    </div>
  )
}

export default Tooltip
