import Header from "@/components/Header";
import CooldownTimer from "@/components/CooldownTimer";
import ColorPicker from "@/components/ColorPicker";
import InfiniteCanvas from "@/components/InfiniteCanvas";

export default function Home() {
  return (
    <main className="relative w-screen h-screen overflow-hidden bg-background">
      {/* Grid Pattern Background for aesthetic before canvas loads fully */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(var(--grid-color) 1px, transparent 1px), linear-gradient(90deg, var(--grid-color) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }}
      />

      <InfiniteCanvas />
      <Header />
      <ColorPicker />
      <CooldownTimer />
    </main>
  );
}
