import { LandingAccordionItem } from "@/components/ui/interactive-image-accordion";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-[#f9f8e5]">
      {/* Header */}
      <header className="border-b border-black/10">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-5xl font-bold tracking-wider mb-2">ParaSosh</h1>
            <p className="text-lg opacity-90 tracking-wide">What Locals Are Talking About</p>
          </div>
        </div>
      </header>

      <main>
        {/* Try It Now Banner */}
        <section className="container mx-auto px-4 py-12">
          <div className="bg-white border-2 border-[#42a746] rounded-3xl p-12 text-center shadow-lg">
            <h2 className="text-3xl font-bold mb-3">Start Creating Your List Now!</h2>
            <p className="text-base opacity-90 mb-6 max-w-2xl mx-auto">
              Try ParaSosh instantly - no login required. Log in to save your lists permanently.
            </p>
            <Link
              href="/login.html"
              className="inline-block bg-white text-gray-900 font-semibold px-8 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all border-2 border-[#42a746] hover:border-[#3a9340]"
            >
              Log In
            </Link>
          </div>
        </section>

        {/* Interactive Accordion Section */}
        <LandingAccordionItem />
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
