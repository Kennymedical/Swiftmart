import { Truck, ShieldCheck, MapPin } from 'lucide-react';

export default function AdminLogisticsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#D4AF37]">Logistics & Delivery Operations</h2>
          <p className="text-xs sm:text-sm text-[#A8B0C5]">
            Courier integrations, delivery escrow release tracking, and waybill margins.
          </p>
        </div>
        <div className="px-3.5 py-1.5 rounded-xl bg-[#142850] border border-[#D4AF37]/30 text-xs text-[#2ED573] font-bold flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#2ED573] animate-pulse" />
          Shipbubble Gateway Configured
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/25 rounded-2xl p-5 shadow-[0_4px_20px_rgba(212,175,55,0.08)]">
          <Truck className="w-5 h-5 text-[#D4AF37] mb-2" />
          <h3 className="font-bold text-[#F5F7FA]">Courier Partners</h3>
          <p className="text-xs text-[#A8B0C5] mt-1">
            GIG Logistics, DHL, FedEx, and localized courier networks routed through Shipbubble.
          </p>
        </div>
        <div className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/25 rounded-2xl p-5 shadow-[0_4px_20px_rgba(212,175,55,0.08)]">
          <ShieldCheck className="w-5 h-5 text-[#2ED573] mb-2" />
          <h3 className="font-bold text-[#F5F7FA]">Waybill Security</h3>
          <p className="text-xs text-[#A8B0C5] mt-1">
            Escrow release is guarded until customer delivery confirmation or 12h safety window expires.
          </p>
        </div>
        <div className="bg-gradient-to-br from-[#142850] to-[#1B2F5E] border border-[#D4AF37]/25 rounded-2xl p-5 shadow-[0_4px_20px_rgba(212,175,55,0.08)]">
          <MapPin className="w-5 h-5 text-[#E8C874] mb-2" />
          <h3 className="font-bold text-[#F5F7FA]">Fixed Platform Margin</h3>
          <p className="text-xs text-[#A8B0C5] mt-1">
            ₦500 standard SwiftMart profit margin retained on fulfilled delivery waybills.
          </p>
        </div>
      </div>
    </div>
  );
}
