import type { ReactNode } from "react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"

/** Shared layout for the text pages (Methodology, Privacy, Help). */
export function InfoPage({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[34px] font-normal tracking-[0.25px]">{title}</h1>
        <p className="mt-1.5 max-w-[720px] text-base text-muted-foreground">{intro}</p>
      </div>
      {children}
      <div>
        <Button asChild className="h-10 rounded px-4 tracking-[0.4px] uppercase hover:bg-primary-hover">
          <Link to="/">Start a test</Link>
        </Button>
      </div>
    </div>
  )
}

export function InfoSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 rounded-lg bg-card p-5 shadow-paper">
      <h2 className="text-lg font-medium">{title}</h2>
      <div className="flex max-w-[760px] flex-col gap-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  )
}
