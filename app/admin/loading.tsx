export default function AdminLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2"><div className="skeleton h-8 w-56" /><div className="skeleton h-4 w-80" /></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="panel space-y-4 p-5"><div className="skeleton h-3 w-24" /><div className="skeleton h-7 w-16" /></div>)}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => <div key={i} className="flex gap-4 rounded-lg border border-line bg-ink-900 p-4"><div className="skeleton h-4 w-1/4" /><div className="skeleton h-4 w-1/3" /><div className="skeleton ml-auto h-4 w-16" /></div>)}
      </div>
    </div>
  );
}
