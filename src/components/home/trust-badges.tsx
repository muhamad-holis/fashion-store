import { Truck, Zap, PackageCheck, ShieldCheck } from "lucide-react";

const badges = [
  {
    icon: Truck,
    title: "Gratis Ongkir",
    desc: "Min. belanja 150K",
  },
  {
    icon: Zap,
    title: "Pengiriman Cepat",
    desc: "1-2 hari sampai",
  },
  {
    icon: PackageCheck,
    title: "Packing Aman",
    desc: "Keamanan terjamin",
  },
  {
    icon: ShieldCheck,
    title: "100% Original",
    desc: "Garansi original",
  },
];

export function TrustBadges() {
  return (
    <section className="container">
      <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-4">
        {badges.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex items-start gap-2.5">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-foreground" strokeWidth={1.8} />
            <div>
              <p className="text-xs font-semibold leading-tight">{title}</p>
              <p className="text-[11px] leading-tight text-muted-foreground">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
