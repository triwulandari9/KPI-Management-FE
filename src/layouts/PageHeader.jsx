export default function PageHeader({ title, subtitle, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-5 sm:mb-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 tracking-tight">{title}</h1>
        {subtitle && <p className="text-gray-400 text-xs sm:text-sm mt-0.5 leading-relaxed">{subtitle}</p>}
      </div>

      {children && (
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {children}
        </div>
      )}
    </div>
  );
}