const statusConfig: Record<string, { label: string; class: string }> = {
  open: { label: 'Open', class: 'bg-[#F2F0EB] text-[#4F4A42]' },
  bidding: { label: 'Bidding', class: 'bg-[#F5E4B2] text-[#8C6614]' },
  accepted: { label: 'Accepted', class: 'bg-[#E8F4EC] text-[#0F5132]' },
  cancelled: { label: 'Cancelled', class: 'bg-[#F4E7E7] text-[#8A2F2F]' },
  expired: { label: 'Expired', class: 'bg-[#F5F1EC] text-[#5E5A53]' },
  pending: { label: 'Pending', class: 'bg-[#F5E2B9] text-[#8A5B12]' },
  payment_pending: { label: 'Payment Pending', class: 'bg-[#F5E2B9] text-[#8A5B12]' },
  payment_failed: { label: 'Payment Failed', class: 'bg-[#F4E7E7] text-[#8A2F2F]' },
  payment_confirmed: { label: 'Paid', class: 'bg-[#E6F4EA] text-[#0F5132]' },
  payout_pending: { label: 'Payout Pending', class: 'bg-[#F5E4B2] text-[#8C6614]' },
  payout_completed: { label: 'Payout Completed', class: 'bg-[#E6F4EA] text-[#0F5132]' },
  preparing: { label: 'Preparing', class: 'bg-[#E8F1FF] text-[#1B3D6F]' },
  out_for_delivery: { label: 'Out for Delivery', class: 'bg-[#F5E4B2] text-[#8C6614]' },
  delivered: { label: 'Delivered', class: 'bg-[#E6F4EA] text-[#0F5132]' },
  completed: { label: 'Completed', class: 'bg-[#E6F4EA] text-[#0F5132]' },
  disputed: { label: 'Disputed', class: 'bg-[#F4E7E7] text-[#8A2F2F]' },
  rejected: { label: 'Rejected', class: 'bg-[#F4E7E7] text-[#8A2F2F]' },
  withdrawn: { label: 'Withdrawn', class: 'bg-[#F5F1EC] text-[#5E5A53]' },
  open_dispute: { label: 'Open', class: 'bg-[#F4E7E7] text-[#8A2F2F]' },
  investigating: { label: 'Investigating', class: 'bg-[#F5E4B2] text-[#8C6614]' },
  resolved: { label: 'Resolved', class: 'bg-[#E6F4EA] text-[#0F5132]' },
  closed: { label: 'Closed', class: 'bg-[#F5F1EC] text-[#5E5A53]' },
  approved: { label: 'Approved', class: 'bg-[#E6F4EA] text-[#0F5132]' },
  not_approved: { label: 'Pending Approval', class: 'bg-[#F5E4B2] text-[#8C6614]' },
};

export default function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? { label: status, class: 'bg-[#F5F1EC] text-[#5E5A53]' };
  return (
    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-[0.68rem] font-semibold tracking-[0.08em] ${config.class}`}>
      {config.label}
    </span>
  );
}
