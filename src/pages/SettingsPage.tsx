import React, { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  ArrowLeft, 
  User, 
  Settings as SettingsIcon, 
  CreditCard, 
  Database,
  Check
} from "lucide-react";
import { Button } from "../components/ui/button";
import { useAuth } from "../auth/auth-context";

const TABS = [
  { id: "profile", label: "Studio Profile", icon: User },
  { id: "preferences", label: "Preferences", icon: SettingsIcon },
  { id: "billing", label: "Plan & Billing", icon: CreditCard },
  { id: "data", label: "Data & Export", icon: Database },
];

export function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");

  return (
    <main className="min-h-screen bg-[#13010C] text-white flex flex-col">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-(--gold-500)/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 border-b border-white/10 bg-[#13010C]/80 backdrop-blur-md px-6 py-4 flex items-center gap-4">
        <Link to="/chat" className="p-2 -ml-2 text-white/60 hover:text-white transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-lg font-medium text-white">Settings</h1>
          <p className="text-xs text-white/50">Manage your workspace configuration</p>
        </div>
      </div>

      <div className="relative z-10 flex flex-1 flex-col md:flex-row max-w-6xl mx-auto w-full p-4 md:p-8 gap-8">
        
        <aside className="w-full md:w-64 space-y-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                ${activeTab === tab.id 
                  ? "bg-white/10 text-white shadow-lg border border-white/5" 
                  : "text-white/50 hover:bg-white/5 hover:text-white"
                }`}
            >
              <tab.icon className={`h-4 w-4 ${activeTab === tab.id ? "text-(--gold-500)" : ""}`} />
              {tab.label}
            </button>
          ))}
        </aside>

        <div className="flex-1 min-w-0">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {activeTab === "profile" && <ProfileSection user={user} />}
            {activeTab === "preferences" && <PreferencesSection />}
            {activeTab === "billing" && <BillingSection />}
            {activeTab === "data" && <DataSection />}
          </motion.div>
        </div>
      </div>
    </main>
  );
}

function ProfileSection({ user }: { user: any }) {
  return (
    <div className="space-y-6">
      <SectionCard title="Personal Information">
        <div className="grid gap-4 max-w-md">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-white/50">Full Name</label>
            <input 
              defaultValue={user?.displayName || ""} 
              className="glassy-input" 
              placeholder="Your Name"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-white/50">Email Address</label>
            <input 
              defaultValue={user?.email || ""} 
              className="glassy-input opacity-60 cursor-not-allowed" 
              readOnly 
            />
          </div>
        </div>
        <div className="mt-6">
          <Button size="sm" className="rounded-xl">Save Changes</Button>
        </div>
      </SectionCard>

      <SectionCard title="Studio Details">
        <div className="space-y-4 max-w-md">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-white/50">Studio Name</label>
            <input className="glassy-input" placeholder="e.g. Aurum Atelier" />
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function PreferencesSection() {
  return (
    <div className="space-y-6">
      <SectionCard title="Measurement Units">
        <div className="grid gap-4 sm:grid-cols-2 max-w-lg">
          <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-white/5 cursor-pointer hover:border-(--gold-500)/50 transition-colors">
            <div className="h-4 w-4 rounded-full border border-white/30 flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-(--gold-500)" />
            </div>
            <div>
              <div className="text-sm font-medium">Millimeters (mm)</div>
              <div className="text-xs text-white/50">Standard for jewelry CAD</div>
            </div>
          </label>
          <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-transparent cursor-pointer hover:bg-white/5 opacity-60">
            <div className="h-4 w-4 rounded-full border border-white/30" />
            <div>
              <div className="text-sm font-medium">Inches (in)</div>
              <div className="text-xs text-white/50">US standard</div>
            </div>
          </label>
        </div>
      </SectionCard>

      <SectionCard title="Default Metal Material">
        <select className="glassy-select w-full max-w-md bg-[#1a0510] text-sm p-3 rounded-xl border border-white/15">
          <option>18k Yellow Gold</option>
          <option>14k Rose Gold</option>
          <option>Platinum 950</option>
          <option>Sterling Silver</option>
        </select>
        <p className="mt-2 text-xs text-white/40">Used for weight estimation in chat.</p>
      </SectionCard>
    </div>
  );
}

function BillingSection() {
  return (
    <SectionCard title="Current Subscription">
      <div className="bg-linear-to-br from-[#1a0510] to-[#0a0005] border border-white/10 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-white">Professional Plan</h3>
            <span className="bg-(--gold-500)/20 text-(--gold-500) text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">Active</span>
          </div>
          <p className="text-sm text-white/60">Unlimited mesh generations & STL exports.</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white">$25<span className="text-sm font-normal text-white/40">/mo</span></div>
          <div className="text-xs text-white/40">Renews Nov 28, 2025</div>
        </div>
      </div>
      <div className="mt-4 flex gap-3">
        <Button variant="outline" size="sm" className="rounded-xl border-white/10">Manage Subscription</Button>
        <Button variant="outline" size="sm" className="rounded-xl border-white/10">View Invoices</Button>
      </div>
    </SectionCard>
  );
}

function DataSection() {
  return (
    <div className="space-y-6">
      <SectionCard title="Export Defaults">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
            <div>
              <div className="text-sm font-medium">Auto-Healing</div>
              <div className="text-xs text-white/50">Attempt to fix non-manifold edges on export</div>
            </div>
            <div className="h-5 w-9 bg-(--gold-500) rounded-full p-0.5 cursor-pointer">
              <div className="h-4 w-4 bg-black rounded-full shadow-sm translate-x-4" />
            </div>
          </div>
          
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
            <div>
              <div className="text-sm font-medium">Export Format</div>
              <div className="text-xs text-white/50">Preferred file type for downloads</div>
            </div>
            <div className="flex gap-2">
              <span className="px-2 py-1 bg-white/10 rounded text-xs text-white/60">OBJ</span>
              <span className="px-2 py-1 bg-(--gold-500)/20 text-(--gold-500) border border-(--gold-500)/30 rounded text-xs">STL</span>
              <span className="px-2 py-1 bg-white/10 rounded text-xs text-white/60">STEP</span>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function SectionCard({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="bg-white/2 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
      <h2 className="text-base font-medium text-white mb-6 border-b border-white/5 pb-2">{title}</h2>
      {children}
    </div>
  );
}