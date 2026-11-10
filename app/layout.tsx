import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ITDA | 수도권 데이터사이언스 학회 연합",
  description: "CODE, DAT, DScover, IBAS, INSIGHT가 함께하는 학회 연합",
  icons: {
    icon: "/assets/logo.png",
    shortcut: "/assets/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
