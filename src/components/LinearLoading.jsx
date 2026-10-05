export default function LinearLoading({ message = "Memuat data terbaru dari server...", className = "" }) {
  return (
    <div className={`w-full overflow-hidden rounded-xl transition-all duration-300 ${className}`}>
      <div className="linear-progress-bar w-full h-1 sm:h-1.5 bg-blue-100 relative overflow-hidden rounded-full">
        <div className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-primary to-accent animate-[linear-progress_1.8s_ease-in-out_infinite] rounded-full w-2/5" />
      </div>
      {message && (
        <div className="flex items-center justify-between text-[11px] font-semibold text-primary pt-1.5 px-1 animate-pulse">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
            {message}
          </span>
          <span className="text-[10px] text-gray-400 font-normal">Sinkronisasi API</span>
        </div>
      )}
    </div>
  );
}
