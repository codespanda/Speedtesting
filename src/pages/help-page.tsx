import { InfoPage, InfoSection } from "@/components/info-page"

const FAQ = [
  {
    q: "Why is my result lower than my plan?",
    a: [
      "Wi‑Fi is the most common cause. Walls, distance from the router and busy channels all cut speed. For the most accurate number, plug your computer into the router with a cable.",
      "Other devices and apps using the connection during the test (streaming, updates, cloud sync) take a share of the bandwidth. Pause them and run the test again.",
    ],
  },
  {
    q: "Why do results change from one test to the next?",
    a: [
      "Internet speed varies with how busy your provider's network is, especially in the evening. Run two or three tests and look at the typical value rather than a single run.",
    ],
  },
  {
    q: "Why can't I choose a server?",
    a: [
      "Cloudflare automatically connects you to its nearest data center, so there is only one server to test against. It is shown on the test page and in the Your connection card.",
    ],
  },
  {
    q: "The test fails or says it can't reach the test server",
    a: [
      "Check that you are online, then press Try again or Refresh. Ad blockers, VPNs, company firewalls and some privacy extensions can block speed.cloudflare.com; try turning them off for this page.",
    ],
  },
  {
    q: "Does a VPN affect the result?",
    a: [
      "Yes. With a VPN on, you are measuring the VPN connection, which is usually slower than your own line. Turn it off to measure your provider's speed.",
    ],
  },
  {
    q: "How much data does a test use?",
    a: [
      "It depends on your speed: the test transfers as much as it can for 10 seconds in each direction. On a 100 Mbps connection that is roughly 125 MB down plus whatever your upload manages in 10 seconds.",
    ],
  },
]

export function HelpPage() {
  return (
    <InfoPage title="Help" intro="Answers to common questions about running a test and reading the results.">
      {FAQ.map((f) => (
        <InfoSection key={f.q} title={f.q}>
          {f.a.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </InfoSection>
      ))}
    </InfoPage>
  )
}
