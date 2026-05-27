import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { ThemeProvider } from "@/components/ThemeProvider";
import Head from "next/head";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <Head>
        <title>DigiSprint - Task Manager</title>
        <meta name="description" content="Professional task management by DigiBooking" />
      </Head>
      <Component {...pageProps} />
    </ThemeProvider>
  );
}
