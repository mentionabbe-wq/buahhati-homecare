import Link from 'next/link';
import {
  BabyIcon,
  CalendarHeart,
  ChevronDown,
  ClipboardList,
  Clock,
  HeartHandshake,
  Home,
  MapPin,
  MessageCircle,
  Quote,
  ShieldCheck,
  Sparkles,
  Star,
  UserCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatCurrency, waLink } from '@/lib/utils';

export type LandingService = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  durationMinutes: number;
  price: number;
  imageUrl: string | null;
};

const SERVICE_TONES = [
  'from-[#fdf3e7] to-[#fbe2e9]',
  'from-[#dbeefa] to-[#e4f1ea]',
  'from-[#fbe2e9] to-[#dbeefa]',
  'from-[#e4f1ea] to-[#fdf3e7]',
];

export function Hero({ whatsapp, businessName }: { whatsapp: string; businessName: string }) {
  return (
    <section className="bh-gradient relative overflow-hidden">
      <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-white/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-20 size-80 rounded-full bg-white/30 blur-3xl" />
      <div className="mx-auto grid max-w-6xl gap-10 px-5 pb-16 pt-12 sm:pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:pb-24">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-xs font-semibold text-primary">
            <Sparkles className="size-3.5" /> Home care terapis berpengalaman
          </span>
          <h1 className="mt-4 font-display text-3xl font-bold leading-tight sm:text-5xl">
            Perawatan Bayi Nyaman Langsung di Rumah
          </h1>
          <p className="mt-4 max-w-xl text-base text-foreground/75 sm:text-lg">
            Layanan Baby Massage dan Baby Spa profesional dengan terapis berpengalaman.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/reservasi">
                <CalendarHeart className="size-4" /> Reservasi Sekarang
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
              <a href={waLink(whatsapp, `Halo ${businessName}, saya ingin bertanya tentang layanan home care.`)} target="_blank" rel="noreferrer">
                <MessageCircle className="size-4" /> Chat WhatsApp
              </a>
            </Button>
          </div>
          <dl className="mt-9 grid max-w-md grid-cols-3 gap-4">
            {[
              { label: 'Bayi terlayani', value: '1.200+' },
              { label: 'Rating orang tua', value: '4.9/5' },
              { label: 'Terapis tersertifikasi', value: '100%' },
            ].map((item) => (
              <div key={item.label}>
                <dt className="text-xs text-foreground/60">{item.label}</dt>
                <dd className="font-display text-xl font-bold text-primary">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative">
          <Card className="rotate-1 p-6">
            <div className="flex items-center gap-3">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-[var(--color-blush)]">
                <BabyIcon className="size-6 text-secondary-foreground" />
              </span>
              <div>
                <p className="font-display font-bold">Jadwal hari ini</p>
                <p className="text-xs text-muted-foreground">Terapis siap datang ke rumah</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {[
                { time: '09.00', name: 'Baby Massage', therapist: 'Siti' },
                { time: '11.00', name: 'Baby Spa', therapist: 'Rina' },
                { time: '15.00', name: 'Massage + Spa', therapist: 'Dewi' },
              ].map((row) => (
                <div key={row.time} className="flex items-center gap-3 rounded-2xl bg-muted/70 px-4 py-3">
                  <span className="font-display text-sm font-bold text-primary">{row.time}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{row.name}</p>
                    <p className="text-xs text-muted-foreground">Terapis {row.therapist}</p>
                  </div>
                  <span className="rounded-full bg-[var(--color-sage)] px-2.5 py-1 text-[11px] font-semibold text-primary">
                    Confirmed
                  </span>
                </div>
              ))}
            </div>
          </Card>
          <div className="absolute -bottom-6 -left-4 hidden rounded-2xl border border-border bg-card px-4 py-3 shadow-[var(--shadow-card)] sm:block">
            <p className="text-xs text-muted-foreground">Terapis menuju lokasi</p>
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <MapPin className="size-4 text-primary" /> Estimasi 15 menit
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ServicesSection({ services }: { services: LandingService[] }) {
  return (
    <section id="layanan" className="mx-auto max-w-6xl px-5 py-16">
      <SectionHeading
        eyebrow="Layanan"
        title="Pilih perawatan terbaik untuk si kecil"
        description="Semua layanan dilakukan di rumah Anda dengan peralatan dan minyak pijat khusus bayi."
      />
      <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service, index) => (
          <Card key={service.id} className="flex flex-col overflow-hidden">
            <div className={`flex h-32 items-center justify-center bg-gradient-to-br ${SERVICE_TONES[index % SERVICE_TONES.length]}`}>
              {service.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={service.imageUrl} alt={service.name} className="size-full object-cover" />
              ) : (
                <BabyIcon className="size-10 text-primary/70" />
              )}
            </div>
            <div className="flex flex-1 flex-col p-5">
              <h3 className="font-display text-lg font-bold">{service.name}</h3>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="size-3.5" /> {service.durationMinutes} menit
              </p>
              <p className="mt-3 flex-1 text-sm text-muted-foreground">
                {service.description ?? 'Perawatan lembut yang membantu si kecil lebih rileks.'}
              </p>
              <p className="mt-4 font-display text-xl font-bold text-primary">
                {formatCurrency(service.price)}
              </p>
              <Button asChild className="mt-4 w-full" variant="secondary">
                <Link href={`/reservasi?service=${service.id}`}>Reservasi</Link>
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

const ADVANTAGES = [
  { icon: Home, title: 'Home Care', text: 'Terapis datang ke rumah, si kecil tetap di zona nyamannya.' },
  { icon: UserCheck, title: 'Terapis Berpengalaman', text: 'Tersertifikasi dan terbiasa menangani bayi sejak newborn.' },
  { icon: Clock, title: 'Jadwal Fleksibel', text: 'Pilih slot pagi hingga sore sesuai jam tidur si kecil.' },
  { icon: HeartHandshake, title: 'Perawatan Nyaman', text: 'Peralatan dan minyak pijat khusus bayi yang aman.' },
  { icon: CalendarHeart, title: 'Booking Mudah', text: 'Reservasi dari HP dalam beberapa langkah singkat.' },
  { icon: ClipboardList, title: 'Terdokumentasi', text: 'Catatan treatment tersimpan rapi di profil bayi.' },
];

export function AdvantagesSection() {
  return (
    <section id="keunggulan" className="bg-[var(--color-cream)]/60 py-16">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHeading
          eyebrow="Keunggulan"
          title="Kenapa orang tua memilih kami"
          description="Layanan yang dirancang mengikuti ritme si kecil, bukan sebaliknya."
        />
        <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ADVANTAGES.map((item) => (
            <div key={item.title} className="rounded-3xl border border-border bg-card p-5">
              <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-[var(--color-sage)]">
                <item.icon className="size-5 text-primary" />
              </span>
              <h3 className="mt-4 font-display text-base font-bold">{item.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  { title: 'Isi data', text: 'Data orang tua dan profil bayi.' },
  { title: 'Pilih layanan', text: 'Baby massage, baby spa, atau paket.' },
  { title: 'Pilih jadwal', text: 'Tanggal dan jam yang masih tersedia.' },
  { title: 'Konfirmasi', text: 'Cek ringkasan lalu kirim reservasi.' },
  { title: 'Terapis datang', text: 'Terapis tiba di rumah sesuai jadwal.' },
];

export function StepsSection() {
  return (
    <section id="cara" className="mx-auto max-w-6xl px-5 py-16">
      <SectionHeading eyebrow="Cara Reservasi" title="Lima langkah, selesai dari HP" />
      <ol className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {STEPS.map((step, index) => (
          <li key={step.title} className="relative rounded-3xl border border-border bg-card p-5">
            <span className="font-display text-3xl font-bold text-primary/25">
              {String(index + 1).padStart(2, '0')}
            </span>
            <h3 className="mt-2 font-display text-base font-bold">{step.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

const TESTIMONIALS = [
  {
    name: 'Ibu Rani',
    baby: 'Bunda Aisyah, 5 bulan',
    text: 'Terapisnya sabar banget, Aisyah langsung tidur pulas setelah dipijat. Booking-nya juga gampang lewat HP.',
  },
  {
    name: 'Ibu Dinda',
    baby: 'Bunda Kenzo, 8 bulan',
    text: 'Suka karena ada catatan treatment tiap kunjungan. Jadi tahu perkembangan Kenzo dari sesi ke sesi.',
  },
  {
    name: 'Bapak Yoga',
    baby: 'Ayah Naura, 3 bulan',
    text: 'Tidak perlu keluar rumah dan terapis datang tepat waktu. Sangat membantu untuk newborn.',
  },
];

export function TestimonialsSection() {
  return (
    <section className="bg-[var(--color-sky)]/40 py-16">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHeading eyebrow="Testimonial" title="Cerita para orang tua" />
        <div className="mt-9 grid gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((item) => (
            <figure key={item.name} className="rounded-3xl border border-border bg-card p-5">
              <Quote className="size-6 text-secondary" />
              <blockquote className="mt-3 text-sm text-foreground/80">{item.text}</blockquote>
              <figcaption className="mt-4 flex items-center gap-3 border-t border-border pt-4">
                <span className="flex size-10 items-center justify-center rounded-full bg-[var(--color-blush)] text-sm font-bold text-secondary-foreground">
                  {item.name.split(' ')[1]?.[0] ?? item.name[0]}
                </span>
                <div>
                  <p className="text-sm font-semibold">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.baby}</p>
                </div>
                <span className="ml-auto flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="size-3.5 fill-[#e9b949] text-[#e9b949]" />
                  ))}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

const FAQS = [
  {
    q: 'Mulai usia berapa bayi boleh dipijat?',
    a: 'Umumnya bayi sehat sudah bisa mendapatkan pijat lembut sejak usia beberapa minggu. Terapis akan menyesuaikan teknik dengan usia dan kondisi bayi saat kunjungan.',
  },
  {
    q: 'Apa yang perlu disiapkan di rumah?',
    a: 'Cukup ruangan yang hangat, bersih, dan cukup luas untuk membaringkan bayi. Alas, minyak pijat, dan perlengkapan lain dibawa oleh terapis.',
  },
  {
    q: 'Bagaimana bila bayi sedang tidak enak badan?',
    a: 'Sampaikan kondisi bayi pada formulir reservasi. Tim kami akan mengonfirmasi terlebih dahulu sebelum jadwal dijalankan demi keamanan si kecil.',
  },
  {
    q: 'Bisakah memilih terapis tertentu?',
    a: 'Bisa. Pada langkah pemilihan terapis, sistem hanya menampilkan terapis yang benar-benar tersedia pada tanggal dan jam tersebut.',
  },
  {
    q: 'Bagaimana kebijakan pembatalan?',
    a: 'Pembatalan atau reschedule dapat dilakukan mandiri dari aplikasi selama masih dalam tenggat kebijakan. Setelah itu, silakan hubungi admin lewat WhatsApp.',
  },
  {
    q: 'Metode pembayaran apa saja yang tersedia?',
    a: 'Tersedia tunai saat treatment, transfer bank, dan QRIS. Status pembayaran dapat dipantau pada detail reservasi.',
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="mx-auto max-w-3xl px-5 py-16">
      <SectionHeading eyebrow="FAQ" title="Pertanyaan yang sering diajukan" />
      <div className="mt-8 space-y-3">
        {FAQS.map((faq) => (
          <details
            key={faq.q}
            className="group rounded-2xl border border-border bg-card px-5 py-4 [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex cursor-pointer items-center justify-between gap-4 text-sm font-semibold">
              {faq.q}
              <ChevronDown className="size-4 shrink-0 text-muted-foreground transition group-open:rotate-180" />
            </summary>
            <p className="mt-3 text-sm text-muted-foreground">{faq.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function CtaSection({ whatsapp }: { whatsapp: string }) {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-20">
      <div className="bh-gradient overflow-hidden rounded-4xl border border-border px-6 py-12 text-center">
        <ShieldCheck className="mx-auto size-10 text-primary" />
        <h2 className="mt-4 font-display text-2xl font-bold sm:text-3xl">
          Siap memberikan perawatan terbaik untuk si kecil?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-foreground/70">
          Pilih jadwal yang paling nyaman, terapis kami akan datang ke rumah Anda.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/reservasi">Reservasi Sekarang</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href={waLink(whatsapp)} target="_blank" rel="noreferrer">
              <MessageCircle className="size-4" /> Tanya dulu via WhatsApp
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
      <h2 className="mt-2 font-display text-2xl font-bold sm:text-3xl">{title}</h2>
      {description ? <p className="mt-3 text-sm text-muted-foreground sm:text-base">{description}</p> : null}
    </div>
  );
}
