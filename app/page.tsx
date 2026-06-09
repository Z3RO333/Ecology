import { redirect } from 'next/navigation';

// Root has no UI of its own: send visitors to the management dashboard.
// (The tablet kiosk lives at /tablet and is installed as a PWA directly.)
export default function Home() {
  redirect('/dashboard');
}
