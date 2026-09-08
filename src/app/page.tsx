import Playground from "@/components/playground/Playground";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 min-h-screen">
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-zinc-100">Furniture 360</h1>
            <p className="text-sm text-zinc-500">AI-powered 360° furniture visualization</p>
          </div>
        </div>
      </header>
      <main className="flex-1 px-6 py-6 max-w-7xl mx-auto w-full">
        <Playground />
      </main>
    </div>
  );
}