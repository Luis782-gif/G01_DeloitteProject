'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { detailHref, type DetailKind } from './detail';

/** Link acessível que abre o painel de detalhe, preservando os filtros do URL atual. */
export function DetailLink({ kind, itemRef, children }: { kind: DetailKind; itemRef: string; children?: ReactNode }) {
  const params = useSearchParams();
  return (
    <Link href={detailHref(params?.toString() ?? '', kind, itemRef)} scroll={false} aria-label={`Abrir detalhe de ${itemRef}`}>
      {children ?? itemRef}
    </Link>
  );
}
