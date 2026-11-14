export default function MapMarker({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-green-500 border-2 border-white shadow-lg">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="white"
          className="w-4 h-4"
        >
          <path
            fillRule="evenodd"
            d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-green-500 -mt-[2px]" />
      {label && (
        <span className="mt-1 px-2 py-0.5 text-xs font-semibold bg-black/70 text-white rounded whitespace-nowrap">
          {label}
        </span>
      )}
    </div>
  );
}
