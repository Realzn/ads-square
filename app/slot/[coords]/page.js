// app/slot/[coords]/page.js
// Redirect legacy /slot/x-y URLs → /bloc/x-y (canonical route)
import { redirect } from 'next/navigation';

export default async function SlotRedirect({ params }) {
  const { coords } = await params;
  redirect(`/bloc/${coords}`);
}
