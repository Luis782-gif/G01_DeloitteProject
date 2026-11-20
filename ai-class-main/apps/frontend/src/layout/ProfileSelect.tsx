'use client';

import { useRouter } from 'next/navigation';
import { PROFILE_COOKIE, PROFILE_OPTIONS, type ProfileId } from './model';

/** Seletor de perfil do cabeçalho. Sem autenticação: a escolha fica num cookie para o servidor desenhar o layout certo. */
export function ProfileSelect({ value }: { value: ProfileId }) {
  const router = useRouter();
  return (
    <label className="profile-select">
      Perfil{' '}
      <select
        value={value}
        onChange={(e) => {
          document.cookie = `${PROFILE_COOKIE}=${e.target.value}; path=/; max-age=31536000; samesite=lax`;
          router.refresh();
        }}
      >
        {PROFILE_OPTIONS.map((p) => (
          <option key={p.id} value={p.id}>{p.label}</option>
        ))}
      </select>
    </label>
  );
}
