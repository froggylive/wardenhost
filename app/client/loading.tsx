export default function ClientLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2"><div className="skeleton h-8 w-64" /><div className="skeleton h-4 w-96" /></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="panel space-y-4 p-5"><div className="skeleton h-3 w-24" /><div className="skeleton h-7 w-16" /></div>)}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => <div key={i} className="panel space-y-2 p-5">{Array.from({ length: 4 }).map((__, j) => <div key={j} className="skeleton h-10 w-full" />)}</div>)}
      </div>
    </div>
  );
}
