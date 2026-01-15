import MagicalCanvas from "../components/MagicalCanvas";
import InterfaceOverlay from "../components/InterfaceOverlay";
import AssetManager from "../components/AssetManager";

export default function Home() {
  return (
    <main className="w-full h-screen bg-black overflow-hidden relative">
      <MagicalCanvas />
      <InterfaceOverlay />
      <AssetManager />
    </main>
  );
}
