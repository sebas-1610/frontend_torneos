import type { CSSProperties } from 'react'
import type { TicketStatus } from '../../api/tickets'
import { TICKET_STATUSES } from './ticketInfo'

// El estado de un boleto con su color.
export function TicketStatusTag({ status }: { status: TicketStatus }) {
  const { label, tone } = TICKET_STATUSES[status]
  return (
    <span className="tag" style={{ '--tag': tone } as CSSProperties}>
      {label}
    </span>
  )
}
