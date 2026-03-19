import { Toaster } from "@/components/ui/sonner";
import { History, Package, ShoppingCart, Zap } from "lucide-react";
import { useState } from "react";
import HistoryPage from "./pages/HistoryPage";
import POSPage from "./pages/POSPage";
import ProductsPage from "./pages/ProductsPage";

type Tab = "pos" | "products" | "history";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("pos");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="bg-nav-bg text-nav-fg flex items-center justify-between px-4 py-0 h-14 shrink-0 shadow-lg z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg tracking-tight text-nav-fg">
            QuickBill
          </span>
          <span className="text-xs text-nav-fg/40 ml-1 hidden sm:block">
            POS System
          </span>
        </div>
        <nav className="flex items-center gap-1">
          <button
            type="button"
            data-ocid="nav.pos.tab"
            onClick={() => setActiveTab("pos")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "pos"
                ? "bg-primary text-primary-foreground"
                : "text-nav-fg/70 hover:text-nav-fg hover:bg-white/10"
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>POS</span>
          </button>
          <button
            type="button"
            data-ocid="nav.products.tab"
            onClick={() => setActiveTab("products")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "products"
                ? "bg-primary text-primary-foreground"
                : "text-nav-fg/70 hover:text-nav-fg hover:bg-white/10"
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Products</span>
          </button>
          <button
            type="button"
            data-ocid="nav.history.tab"
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "history"
                ? "bg-primary text-primary-foreground"
                : "text-nav-fg/70 hover:text-nav-fg hover:bg-white/10"
            }`}
          >
            <History className="w-4 h-4" />
            <span>History</span>
          </button>
        </nav>
      </header>

      <main className="flex-1 overflow-hidden">
        {activeTab === "pos" && <POSPage />}
        {activeTab === "products" && <ProductsPage />}
        {activeTab === "history" && <HistoryPage />}
      </main>

      <Toaster richColors position="top-right" />

      <footer className="bg-nav-bg text-nav-fg/40 text-center text-xs py-2 shrink-0">
        © {new Date().getFullYear()} Built with love using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-nav-fg/70"
        >
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}
