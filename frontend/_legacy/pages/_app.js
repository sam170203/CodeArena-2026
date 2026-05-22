import '../styles/globals.css';
import Navbar from '../components/Navbar';
import Toast from '../components/Toast';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Navbar />
      <Component {...pageProps} />
      <Toast />
    </>
  );
}