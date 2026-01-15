import MagicalCanvas from "../components/MagicalCanvas";
import InterfaceOverlay from "../components/InterfaceOverlay";

export default function Home() {
  return (
    <main className="w-full h-screen bg-black overflow-hidden relative">
      <InterfaceOverlay />
      <MagicalCanvas />
    </main>
  );
}
