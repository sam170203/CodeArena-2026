import { Rail } from "./Rail";
import { Topbar } from "./Topbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen grid-cols-[72px_1fr]">
      <Rail />
      <div className="flex min-w-0 flex-col">
        <Topbar />
        <main className="mx-auto w-full max-w-[1280px] flex-1 px-10 py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
