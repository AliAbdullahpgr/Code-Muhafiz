export const metadata = {
  title: "Code-Muhafiz",
  description: "Gemma 4 reads your dependencies so you don't have to.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
