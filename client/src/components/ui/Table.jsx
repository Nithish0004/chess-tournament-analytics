import React from 'react';

/**
 * Design System Dark Monochrome Table Component
 */
export const Table = ({ children, className = '' }) => (
  <div className="w-full overflow-x-auto rounded-xl border border-[#262628] bg-[#161617]">
    <table className={`w-full text-left text-xs sm:text-sm text-[#F5F5F5] ${className}`}>
      {children}
    </table>
  </div>
);

export const TableHead = ({ children, className = '' }) => (
  <thead className={`bg-[#141415] border-b border-[#262628] text-[11px] font-condensed font-bold uppercase tracking-wider text-zinc-400 ${className}`}>
    {children}
  </thead>
);

export const TableBody = ({ children, className = '' }) => (
  <tbody className={`divide-y divide-[#202022] ${className}`}>
    {children}
  </tbody>
);

export const TableRow = ({ children, className = '', hover = true, onClick }) => (
  <tr
    onClick={onClick}
    className={`transition-colors ${hover ? 'hover:bg-white/[0.03]' : ''} ${onClick ? 'cursor-pointer' : ''} ${className}`}
  >
    {children}
  </tr>
);

export const TableHeaderCell = ({ children, className = '' }) => (
  <th className={`px-4 py-3 font-bold select-none ${className}`}>
    {children}
  </th>
);

export const TableCell = ({ children, className = '' }) => (
  <td className={`px-4 py-3.5 align-middle ${className}`}>
    {children}
  </td>
);

export default Table;
