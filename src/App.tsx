import { Navigate, Outlet, Route, Routes } from "react-router-dom"

import { AppFooter, AppHeader } from "@/components/app-header"
import { HelpPage } from "@/pages/help-page"
import { MethodologyPage } from "@/pages/methodology-page"
import { MobileResultPage } from "@/pages/mobile-result-page"
import { PrivacyPage } from "@/pages/privacy-page"
import { TestPage } from "@/pages/test-page"

function Layout() {
  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader />
      <main className="mx-auto box-border flex w-full max-w-[1200px] flex-auto flex-col px-6 pt-8 pb-12">
        <Outlet />
      </main>
      <AppFooter />
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<TestPage />} />
        <Route path="methodology" element={<MethodologyPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="help" element={<HelpPage />} />
      </Route>
      <Route path="result" element={<MobileResultPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
