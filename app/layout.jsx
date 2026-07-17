import "./globals.css";

export const metadata = {
  title: "Indipet HRMS Command Center",
  description: "Indipet HRMS operations and workforce command center"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
