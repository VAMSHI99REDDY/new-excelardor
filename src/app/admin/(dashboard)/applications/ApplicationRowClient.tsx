'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { deleteApplicationAction } from '../actions';
import { useState } from 'react';

const statusColors: Record<string, string> = {
  New: 'bg-blue-100 text-blue-800',
  Reviewing: 'bg-yellow-100 text-yellow-800',
  Shortlisted: 'bg-purple-100 text-purple-800',
  Interview: 'bg-indigo-100 text-indigo-800',
  Selected: 'bg-green-100 text-green-800',
  Rejected: 'bg-red-100 text-red-800',
  default: 'bg-gray-100 text-gray-800',
};

export default function ApplicationRowClient({ app }: { app: any }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete the application for ${app.full_name}? This cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const resume = app.resume_path || app.resume_file_path || null;
      await deleteApplicationAction(app.id, resume);
      router.refresh();
    } catch (e: any) {
      alert(`Failed to delete application: ${e?.message || e || 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const statusClass = statusColors[app.status] ?? statusColors.default;

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="p-3 sm:p-4">
        <div className="font-bold text-black text-sm sm:text-base">{app.full_name}</div>
        <div className="text-xs sm:text-sm text-gray-500 break-all">{app.email}</div>
        <div className="text-xs text-gray-400 mt-1 sm:hidden">{app.position}</div>
      </td>
      {/* Position – hidden on extra small screens */}
      <td className="p-3 sm:p-4 text-gray-800 font-medium text-xs sm:text-sm hidden sm:table-cell">
        {app.position}
      </td>
      {/* Experience – hidden on mobile screens */}
      <td className="p-3 sm:p-4 text-gray-600 text-xs sm:text-sm hidden md:table-cell">
        {app.years_of_experience} yrs
      </td>
      <td className="p-3 sm:p-4">
        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider ${statusClass}`}>
          {app.status || 'New'}
        </span>
      </td>
      <td className="p-3 sm:p-4 text-gray-600 text-xs sm:text-sm hidden lg:table-cell">
        {app.created_at ? new Date(app.created_at).toLocaleDateString() : 'N/A'}
      </td>
      <td className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <Link
            href={`/admin/applications/${app.id}`}
            className="text-[#4A6B35] hover:text-green-800 font-bold text-xs uppercase tracking-wider px-2 py-1 rounded hover:bg-green-50 transition-colors"
          >
            View
          </Link>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-red-600 hover:text-red-800 font-bold text-xs uppercase tracking-wider px-2 py-1 rounded hover:bg-red-50 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </td>
    </tr>
  );
}
