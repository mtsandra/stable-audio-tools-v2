interface TransportControlsProps {
  isPlaying: boolean;
  bpm: number;
  totalSlots: number;
  metronomeEnabled: boolean;
  onPlayPause: () => void;
  onStop: () => void;
  onBpmChange: (bpm: number) => void;
  onSlotCountChange: (count: number) => void;
  onMetronomeToggle: () => void;
}

export function TransportControls({
  isPlaying,
  bpm,
  totalSlots,
  metronomeEnabled,
  onPlayPause,
  onStop,
  onBpmChange,
  onSlotCountChange,
  onMetronomeToggle,
}: TransportControlsProps) {
  return (
    <div className="flex items-center gap-6 bg-zinc-900 rounded-xl px-6 py-4 border border-zinc-800">
      {/* Play/Pause Button */}
      <button
        onClick={onPlayPause}
        className={`
          w-14 h-14 rounded-full flex items-center justify-center
          transition-all duration-200 text-2xl
          ${isPlaying 
            ? 'bg-purple-500 hover:bg-purple-400 text-white shadow-lg shadow-purple-500/30' 
            : 'bg-zinc-700 hover:bg-zinc-600 text-white'
          }
        `}
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>

      {/* Stop Button */}
      <button
        onClick={onStop}
        className="w-12 h-12 rounded-full flex items-center justify-center
          bg-zinc-700 hover:bg-zinc-600 text-white transition-all duration-200 text-xl"
        title="Stop"
      >
        ⏹
      </button>

      {/* BPM Control */}
      <div className="flex flex-col items-center gap-1">
        <label className="text-zinc-400 text-xs uppercase tracking-wider">BPM</label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="40"
            max="240"
            value={bpm}
            onChange={(e) => onBpmChange(Number(e.target.value))}
            className="w-32 accent-purple-500"
          />
          <input
            type="number"
            min="40"
            max="240"
            value={bpm}
            onChange={(e) => onBpmChange(Math.min(240, Math.max(40, Number(e.target.value))))}
            className="w-16 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-center text-white"
          />
        </div>
      </div>

      {/* Slot Count Control */}
      <div className="flex flex-col items-center gap-1">
        <label className="text-zinc-400 text-xs uppercase tracking-wider">Slots</label>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSlotCountChange(totalSlots - 1)}
            className="w-6 h-6 bg-zinc-700 hover:bg-zinc-600 rounded text-white text-sm"
            disabled={totalSlots <= 2}
          >
            −
          </button>
          <span className="w-8 text-center text-white font-mono">{totalSlots}</span>
          <button
            onClick={() => onSlotCountChange(totalSlots + 1)}
            className="w-6 h-6 bg-zinc-700 hover:bg-zinc-600 rounded text-white text-sm"
            disabled={totalSlots >= 32}
          >
            +
          </button>
        </div>
      </div>

      {/* Slot interval display */}
      <div className="flex flex-col items-center gap-1 text-zinc-500">
        <span className="text-xs uppercase tracking-wider">Interval</span>
        <span className="text-white font-mono">
          {((60 / bpm) * (32 / totalSlots)).toFixed(2)}s
        </span>
      </div>

      {/* Metronome Toggle */}
      <button
        onClick={onMetronomeToggle}
        className={`
          flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all
          ${metronomeEnabled 
            ? 'bg-purple-600 text-white' 
            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }
        `}
        title={metronomeEnabled ? 'Disable metronome' : 'Enable metronome'}
      >
        <span className="text-lg">🔔</span>
        <span className="text-xs uppercase tracking-wider">Metro</span>
      </button>
    </div>
  );
}
