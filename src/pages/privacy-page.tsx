import { InfoPage, InfoSection } from "@/components/info-page"

export function PrivacyPage() {
  return (
    <InfoPage
      title="Privacy"
      updated="November 4, 2026"
      intro="Pulse has no accounts, no analytics and no server of its own. Here is everything that leaves your device and what stays on it."
    >
      <InfoSection title="What Cloudflare sees">
        <p>
          The test talks directly to Cloudflare's speed servers. Like any website you visit, Cloudflare sees your IP
          address and the requests your browser makes. Pulse also asks Cloudflare for your provider and approximate
          location, which is how the "Your connection" card is filled in. Your IP address, provider and location are
          only shown on your screen: Pulse doesn't save or send them anywhere.
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
          Select Clear history under Recent runs to delete your saved results. You can also clear this site's data in your browser settings (cookies and site data) to delete saved results and
          preferences. A private or incognito window saves nothing after you close it.
        </p>
      </InfoSection>

      <InfoSection title="Contact and grievances">
        <p>
          Pulse is made by CodesPanda, Mohali, Punjab, India. For a privacy question or a grievance under India's
          Digital Personal Data Protection Act, 2023, contact our Grievance Officer, Deepak Kumar, at{" "}
          <a href="mailto:contact@codespanda.com" className="text-primary underline">
            contact@codespanda.com
          </a>
          . We acknowledge requests within 7 days and resolve them within 30 days. If you're not satisfied, you can
          complain to the Data Protection Board of India.
        </p>
      </InfoSection>
    </InfoPage>
  )
}
