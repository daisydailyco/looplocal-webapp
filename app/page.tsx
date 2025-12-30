import { LandingAccordionItem } from "@/components/ui/interactive-image-accordion";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-[#f9f8e5]">
      {/* Header */}
      <header className="border-b border-black/10">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-5xl font-bold tracking-wider mb-2">LoopLocal</h1>
            <p className="text-lg opacity-90 tracking-wide">Your Loop. Your Local.</p>
          </div>
        </div>
      </header>

      <main>
        {/* Interactive Accordion Section */}
        <LandingAccordionItem />

        {/* Try It Now Banner */}
        <section className="container mx-auto px-4 py-12">
          <div className="bg-white border-2 border-[#42a746] rounded-3xl p-12 text-center shadow-lg">
            <h2 className="text-3xl font-bold mb-3">Start Creating Your List Now!</h2>
            <p className="text-base opacity-90 mb-6 max-w-2xl mx-auto">
              Try LoopLocal instantly - no login required. Log in to save your lists permanently.
            </p>
            <Link
              href="/login.html"
              className="inline-block bg-white text-gray-900 font-semibold px-8 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all border-2 border-[#42a746] hover:border-[#3a9340]"
            >
              Log In
            </Link>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="container mx-auto px-4 py-16">
          <h2 className="text-4xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 text-center shadow-md hover:shadow-xl transition-all">
              <h3 className="text-2xl font-bold mb-3">Browse & Discover</h3>
              <p className="text-gray-600 leading-relaxed">
                Scroll through Instagram or TikTok and find local spots, events, and hidden gems
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 text-center shadow-md hover:shadow-xl transition-all">
              <h3 className="text-2xl font-bold mb-3">Save & Organize</h3>
              <p className="text-gray-600 leading-relaxed">
                Click the extension to save spots into custom categories and add locations to your personal map
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 text-center shadow-md hover:shadow-xl transition-all">
              <h3 className="text-2xl font-bold mb-3">Share Your Loop</h3>
              <p className="text-gray-600 leading-relaxed">
                Generate a shareable link with an interactive map so friends can see your curated list
              </p>
            </div>
          </div>
        </section>

        {/* See It In Action Section */}
        <section className="container mx-auto px-4 py-16">
          <h2 className="text-4xl font-bold text-center mb-12">See It In Action</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-all">
              <div className="bg-gradient-to-br from-gray-100 to-[#f9f8e5] rounded-xl p-16 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center min-h-[250px]">
                <div className="text-5xl mb-3">📋</div>
                <p className="text-sm text-gray-600">Extension Popup</p>
              </div>
              <p className="text-center mt-4 font-semibold">Organize your saves by category</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-all">
              <div className="bg-gradient-to-br from-gray-100 to-[#f9f8e5] rounded-xl p-16 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center min-h-[250px]">
                <div className="text-5xl mb-3">🗺️</div>
                <p className="text-sm text-gray-600">Share Page</p>
              </div>
              <p className="text-center mt-4 font-semibold">Share lists with interactive maps</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-all">
              <div className="bg-gradient-to-br from-gray-100 to-[#f9f8e5] rounded-xl p-16 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center min-h-[250px]">
                <div className="text-5xl mb-3">📍</div>
                <p className="text-sm text-gray-600">Map View</p>
              </div>
              <p className="text-center mt-4 font-semibold">See all your spots on one map</p>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 py-16 pb-24">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white rounded-2xl p-8 text-center shadow-md hover:shadow-xl transition-all">
              <div className="text-5xl mb-4">📍</div>
              <h3 className="text-xl font-semibold mb-3">Save from Instagram</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                One-click save local spots while browsing
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 text-center shadow-md hover:shadow-xl transition-all">
              <div className="text-5xl mb-4">🗂️</div>
              <h3 className="text-xl font-semibold mb-3">Organize & Filter</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Create custom categories for restaurants, bars, events
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 text-center shadow-md hover:shadow-xl transition-all">
              <div className="text-5xl mb-4">🔗</div>
              <h3 className="text-xl font-semibold mb-3">Share Lists</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Send curated local guides to friends instantly
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 text-center shadow-md hover:shadow-xl transition-all">
              <div className="text-5xl mb-4">🗺️</div>
              <h3 className="text-xl font-semibold mb-3">Map View</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                See all your spots on an interactive map
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-black/10 py-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm opacity-70">Made with ❤️ for local explorers</p>
        </div>
      </footer>
    </div>
  );
}
