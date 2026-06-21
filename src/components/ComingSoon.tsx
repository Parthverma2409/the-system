import { SysWindow } from "@/components/SystemUI";

// Placeholder for System sections not yet built (Quests/Inventory/Equipment/Log).
// Replaced by the real screen in the corresponding build phase.
export default function ComingSoon({
  title,
  phase,
  blurb,
}: {
  title: string;
  phase: string;
  blurb: string;
}) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <header className="mb-6 text-center sys-in">
        <p className="text-[10px] tracking-[0.5em] text-system/55">⟢ THE SYSTEM ⟣</p>
        <h1 className="glow mt-1 text-2xl font-black tracking-wide text-system">{title}</h1>
      </header>
      <SysWindow title="LOCKED">
        <div className="py-8 text-center">
          <p className="text-4xl">🔒</p>
          <p className="mt-3 text-sm tracking-widest text-system/70">{phase}</p>
          <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-system/45">{blurb}</p>
        </div>
      </SysWindow>
    </main>
  );
}
