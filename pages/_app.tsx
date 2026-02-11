import '@/styles/globals.css';
import 'molstar/build/viewer/molstar.css';
import 'molstar/build/viewer/theme/light.css';
import type { AppProps } from 'next/app';


import { V0Badge } from '../components/V0Badge';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <V0Badge />
    </>
  );
}
