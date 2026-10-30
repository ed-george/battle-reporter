import { redirect } from 'next/navigation';
import { TAG_MATCH_URL } from '@/config';

export const metadata = {
  title: 'Tag a Stream Match — Battle Reporter',
  description: 'Contribute and tag official Pokémon TCG stream matches via our submission form.',
};

export default function SubmitPage() {
  redirect(TAG_MATCH_URL);
}
