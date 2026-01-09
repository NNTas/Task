// app/layout.tsx（完全例）
import type { Metadata } from "next";
import "./globals.css"; // 既存のスタイルがあれば

export const metadata: Metadata = {
  title: "俺の究極Todoアプリ",
  description: "シンプルでカスタムなTodo管理アプリ",
  manifest: "/manifest.json", // これでmanifestを指定
  icons: {
    icon: "/icon-192.png", // アイコン指定
  },
  themeColor: "#3b82f6", // ブラウザバー色
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        {/* PWA用の追加meta（任意で入れるとより安定） */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>{children}</body>
    </html>
  );
}

