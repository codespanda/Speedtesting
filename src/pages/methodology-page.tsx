import { InfoPage, InfoSection } from "@/components/info-page"
import { PathIcon } from "@/components/path-icon"
import { TEST_SECONDS } from "@/hooks/use-speed-test"
import { ICONS } from "@/lib/speed"

const STEPS = [
  {
    title: "Latency",
    icon: ICONS.latency,
    tone: "bg-pu-soft text-pu-ink",
    body: "Ten tiny requests go to the server. For each one we read the TCP round trip time Cloudflare measured for the connection. Latency is the median; jitter is the average change between samples.",
  },
  {
    title: "Download",
    icon: ICONS.download,
    tone: "bg-dl-soft text-dl-ink",
    body: `Four parallel connections pull data for ${TEST_SECONDS} seconds. The first 1.5 seconds are ignored while the connections speed up; the result is the average over the rest.`,
  },
  {
    title: "Upload",
    icon: ICONS.upload,
    tone: "bg-ul-soft text-ul-ink",
    body: `The same in the other direction: four connections send data for ${TEST_SECONDS} seconds, skipping the ramp-up.`,
  },
]

export function MethodologyPage() {
  return (
    <InfoPage
      title="Methodology"
      intro="Each test runs three measurements against the Cloudflare data center nearest to you, straight from your browser."
    >
      <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
        {STEPS.map((s, i) => (
          <section key={s.title} className="flex flex-col gap-3 rounded-lg bg-card p-5 shadow-paper">
            <span className={`flex size-12 items-center justify-center rounded-full ${s.tone}`}>
              <PathIcon d={s.icon} />
            </span>
            <h2 className="text-lg font-medium">
              {i + 1}. {s.title}
            </h2>
            <p className="text-sm text-muted-foreground">{s.body}</p>
          </section>
        ))}
      </div>

      <InfoSection title="Test server">
        <p>
          Tests use Cloudflare's public speed endpoints, the same ones behind speed.cloudflare.com. Cloudflare sends
          every visitor to its closest data center, so you can't pick a server; the one used is shown on the test page.
        </p>
      </InfoSection>

      <InfoSection title="What the live numbers mean">
        <p>
          While a test runs, the gauge and chart show the speed over the last second, so they move up and down. The
          final result is the average across the whole run after warm-up, so it can differ from the last number you
          saw.
        </p>
        <p>
          The browser reports upload progress in bursts, so the upload line on the chart looks jumpier than the
          connection really is.
        </p>
      </InfoSection>

      <InfoSection title="What your connection can handle">
        <p>
          These ratings compare your result with typical needs: 25 Mbps down for 4K streaming, 4 Mbps up for HD video
          calls, 20 Mbps up for cloud backups, latency under 40 ms for gaming, and enough speed to download 100 GB in
          under an hour. Bandwidth is split evenly across the number of devices you set.
        </p>
      </InfoSection>
    </InfoPage>
  )
}
