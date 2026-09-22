import Link from 'next/link';
import { Search } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/features/admin/shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/misc';
import { TableWrapper, Tbody, Td, Th, Thead, Tr } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { formatDateId } from '@/lib/datetime';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Pelanggan' };

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const customers = await prisma.customer.findMany({
    where: q
      ? { OR: [{ name: { contains: q } }, { phone: { contains: q } }, { email: { contains: q } }] }
      : {},
    include: {
      babies: { select: { id: true, name: true } },
      _count: { select: { reservations: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return (
    <div>
      <PageHeader
        title="Data Pelanggan"
        description="Riwayat orang tua, daftar bayi, dan total transaksi."
      />

      <form className="mb-4 flex gap-2" action="/admin/pelanggan">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q ?? ''} placeholder="Cari nama, nomor HP, atau email" className="pl-10" />
        </div>
        <Button type="submit">Cari</Button>
      </form>

      {customers.length === 0 ? (
        <EmptyState
          title="Belum ada pelanggan"
          description="Data pelanggan otomatis dibuat saat reservasi pertama masuk."
        />
      ) : (
        <>
          <ul className="space-y-2 lg:hidden">
            {customers.map((customer) => (
              <li key={customer.id}>
                <Link
                  href={`/admin/pelanggan/${customer.id}`}
                  className="block rounded-2xl border border-border bg-card p-4"
                >
                  <p className="font-semibold">{customer.name}</p>
                  <p className="text-xs text-muted-foreground">{customer.phone}</p>
                  <p className="mt-2 text-xs">
                    {customer.babies.length} bayi · {customer._count.reservations} reservasi ·{' '}
                    {formatCurrency(customer.totalSpent)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>

          <div className="hidden lg:block">
            <TableWrapper>
              <Thead>
                <tr>
                  <Th>Nama</Th>
                  <Th>WhatsApp</Th>
                  <Th>Alamat</Th>
                  <Th>Bayi</Th>
                  <Th>Reservasi</Th>
                  <Th className="text-right">Total transaksi</Th>
                  <Th>Bergabung</Th>
                </tr>
              </Thead>
              <Tbody>
                {customers.map((customer) => (
                  <Tr key={customer.id}>
                    <Td>
                      <Link href={`/admin/pelanggan/${customer.id}`} className="font-semibold hover:text-primary">
                        {customer.name}
                      </Link>
                      {customer.email ? (
                        <span className="block text-xs text-muted-foreground">{customer.email}</span>
                      ) : null}
                    </Td>
                    <Td>{customer.phone}</Td>
                    <Td className="max-w-56 truncate text-muted-foreground">
                      {[customer.address, customer.district].filter(Boolean).join(', ') || '—'}
                    </Td>
                    <Td>{customer.babies.map((baby) => baby.name).join(', ') || '—'}</Td>
                    <Td>{customer._count.reservations}</Td>
                    <Td className="text-right font-semibold">{formatCurrency(customer.totalSpent)}</Td>
                    <Td className="text-xs text-muted-foreground">
                      {formatDateId(customer.createdAt, { short: true })}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </TableWrapper>
          </div>
        </>
      )}
    </div>
  );
}
