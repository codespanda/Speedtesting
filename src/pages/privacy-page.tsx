import { InfoPage, InfoSection } from "@/components/info-page"

export function PrivacyPage() {
  return (
    <InfoPage
      title="Privacy"
      intro="Pulse has no accounts, no analytics and no server of its own. Here is everything that leaves your device and what stays on it."
    >
      <InfoSection title="What Cloudflare sees">
        <p>
          The test talks directly to Cloudflare's speed servers. Like any website you visit, Cloudflare sees your IP
          address and the requests your browser makes. Pulse also asks Cloudflare for your provider and approximate
          location, which is how the "Your connection" card is filled in.
        </p>
        <p>
          Your results are not sent anywhere or published. Cloudflare's own handling of request data is covered by the{" "}
          <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noreferrer" className="text-primary underline">
            Cloudflare privacy policy
          </a>
          .
        </p>
      </InfoSection>

      <InfoSection title="What stays on this device">
        <p>
          Your most recent results (up to 100) are saved in this browser's local storage so they can appear under Recent
          runs and on the mobile result screen. Your light or dark theme choice is saved the same way.
        </p>
        <p>Nothing is synced between devices or browsers.</p>
      </InfoSection>

      <InfoSection title="Clearing your data">
        <p>
          Clear this site's data in your browser settings (cookies and site data) to delete saved results and
          preferences. A private or incognito window saves nothing after you close it.
        </p>
      </InfoSection>
    </InfoPage>
  )
}
