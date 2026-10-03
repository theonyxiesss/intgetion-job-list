/* eslint-disable intgetion/no-hardcoded-jsx-text -- dev-only showcase, never shipped (D142) */
import { ArrowRight, Bookmark, EyeOff, Search } from "lucide-react";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import {
  Alert,
  Badge,
  Button,
  Choice,
  Container,
  EmptyState,
  ErrorState,
  Field,
  Icon,
  Input,
  JobCard,
  LinkTabs,
  OrbitBackdrop,
  PageHeader,
  Select,
  Skeleton,
  Stat,
  StatRow,
  StatusBadge,
  StatusDot,
  Switch,
  Table,
  Tag,
  Td,
  Textarea,
  Th,
  Tr,
} from "@/components/ui";
import { InteractiveDemo } from "./interactive";

export const dynamic = "force-dynamic";

function Block({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-6 border-t border-line pt-10">
      <h2 className="t-h2">{title}</h2>
      {children}
    </section>
  );
}

/** Every UI component in every state (DESIGN.md 13). 404 in production. */
export default async function UiShowcase({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const { locale } = await params;
  setRequestLocale(locale);

  const actions = (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Save"
        icon={<Icon icon={Bookmark} />}
      />
      <Button
        variant="ghost"
        size="icon"
        aria-label="Hide"
        icon={<Icon icon={EyeOff} />}
      />
    </>
  );

  return (
    <main className="py-12">
      <Container className="flex flex-col gap-16">
        <PageHeader
          label="Design system · v1"
          title="UI kit"
          intro="All components from docs/DESIGN.md in every state. Switch the theme in the header."
        />

        <Block title="Type">
          <div className="relative overflow-hidden border border-line p-8">
            <OrbitBackdrop />
            <div className="relative flex flex-col gap-4">
              <p className="t-label text-fg-muted">
                Remote work · matched by skills
              </p>
              <p className="t-display-xl">Find work in your orbit</p>
            </div>
          </div>
          <p className="t-display-l">Display L heading</p>
          <p className="t-h2">H2 section</p>
          <p className="t-h3">H3 card title</p>
          <p className="t-label text-fg-muted">Label · uppercase</p>
          <p className="t-body-l max-w-[68ch]">
            Body L. Описание вакансии — обычный регистр, 68 символов в строке,
            межстрочный интервал 1.6.
          </p>
          <p className="t-data-l">€70 000 – €85 000</p>
          <p className="t-data">UTC+01:00 · 09:00–17:00 · 2026-10-03</p>
        </Block>

        <Block title="Buttons">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button loading>Loading</Button>
            <Button disabled>Disabled</Button>
            <Button size="lg" trailingIcon={<Icon icon={ArrowRight} />}>
              Large
            </Button>
            <Button
              variant="secondary"
              size="icon"
              aria-label="Search"
              icon={<Icon icon={Search} />}
            />
          </div>
        </Block>

        <Block title="Fields">
          <div className="grid max-w-[720px] gap-6 md:grid-cols-2">
            <Field label="Job title" help="As it appears in the listing.">
              <Input placeholder="Backend Engineer" />
            </Field>
            <Field label="Minimum salary" error="Enter a whole number.">
              <Input numeric defaultValue="70k" />
            </Field>
            <Field label="Work format">
              <Select defaultValue="remote">
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
              </Select>
            </Field>
            <Field label="Disabled">
              <Input disabled defaultValue="Read only" />
            </Field>
            <Field label="Description" className="md:col-span-2">
              <Textarea placeholder="What the role is about" />
            </Field>
          </div>
          <div className="flex flex-wrap gap-6">
            <Choice label="Full time" defaultChecked />
            <Choice label="Contract" hint="B2B or freelance" />
            <Choice type="radio" name="demo" label="Gross" defaultChecked />
            <Choice type="radio" name="demo" label="Net" />
            <Switch label="Email" defaultChecked />
            <Switch label="In-app" />
          </div>
        </Block>

        <Block title="Badges and tags">
          <div className="flex flex-wrap gap-2">
            <Badge tone="verified">Verified</Badge>
            <Badge tone="trusted">Trusted</Badge>
            <Badge tone="imported">Imported</Badge>
            <Badge tone="new">New</Badge>
            <Badge>Engineering</Badge>
            <StatusBadge status="pending_moderation">On moderation</StatusBadge>
            <StatusBadge status="published">Published</StatusBadge>
            <StatusBadge status="rejected">Rejected</StatusBadge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Tag>TypeScript</Tag>
            <Tag>PostgreSQL</Tag>
            <Tag selected>Remote</Tag>
            <span className="inline-flex items-center gap-2">
              <StatusDot label="Unread" /> Unread notification
            </span>
          </div>
        </Block>

        <Block title="Telemetry">
          <StatRow>
            <Stat label="Salary" value="€70k–85k / year" />
            <Stat label="Format" value="Remote" />
            <Stat label="Time zone" value="UTC+01:00 · ≥4 h" />
            <Stat label="Employment" value="Full time" />
            <Stat label="Languages" value="en · C1" />
          </StatRow>
          <dl className="flex gap-12">
            <Stat large label="Jobs" value="5 128" />
            <Stat large label="Companies" value="412" />
            <Stat large label="Match" value="87%" />
          </dl>
        </Block>

        <Block title="Job cards">
          <div className="flex flex-col gap-4">
            <JobCard
              href="/jobs"
              title="Senior Backend Engineer"
              category="Engineering"
              badges={
                <>
                  <Badge tone="verified">Verified</Badge>
                  <Badge tone="new">New</Badge>
                </>
              }
              companyName="Northstar Widgets"
              companyHref="/jobs"
              stats={[
                { label: "Salary", value: "€70k–85k" },
                { label: "Format", value: "Remote" },
                { label: "Time zone", value: "UTC+01:00" },
                { label: "Type", value: "Full time" },
              ]}
              skills={[
                "TypeScript",
                "Node.js",
                "PostgreSQL",
                "Docker",
                "AWS",
                "Redis",
                "Kafka",
              ]}
              moreSkillsLabel={(n) => `+${n}`}
              actions={actions}
            />
            <JobCard
              href="/jobs"
              title="Illustration Designer"
              category="Design"
              badges={<Badge tone="imported">Imported</Badge>}
              companyName="Amber Lantern Studio"
              stats={[
                { label: "Salary", value: "Not specified", muted: true },
                { label: "Format", value: "Remote" },
              ]}
              skills={["Figma"]}
            />
          </div>
        </Block>

        <Block title="Tabs and table">
          <LinkTabs
            label="Application status"
            items={[
              { label: "All", href: "/dev/ui", active: true, count: 12 },
              { label: "Viewed", href: "/dev/ui", active: false, count: 4 },
              { label: "Interview", href: "/dev/ui", active: false, count: 1 },
            ]}
          />
          <Table caption="Jobs">
            <thead>
              <tr>
                <Th>Title</Th>
                <Th>Status</Th>
                <Th numeric>Applications</Th>
                <Th>Published</Th>
              </tr>
            </thead>
            <tbody>
              <Tr>
                <Td>Senior Backend Engineer</Td>
                <Td>
                  <StatusBadge status="published">Published</StatusBadge>
                </Td>
                <Td numeric>24</Td>
                <Td mono>2026-10-01</Td>
              </Tr>
              <Tr>
                <Td>Product Designer</Td>
                <Td>
                  <StatusBadge status="pending_moderation">
                    On moderation
                  </StatusBadge>
                </Td>
                <Td numeric>0</Td>
                <Td mono>—</Td>
              </Tr>
            </tbody>
          </Table>
        </Block>

        <Block title="Feedback">
          <div className="flex flex-col gap-3">
            <Alert title="Saved">Your profile is up to date.</Alert>
            <Alert tone="success" title="Domain confirmed" />
            <Alert tone="warning" title="Email sending is not set up">
              Use the DNS method instead.
            </Alert>
            <Alert tone="danger" title="Could not apply">
              The job is no longer published.
            </Alert>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <EmptyState
              title="Nothing found"
              text="Try fewer filters or another role."
              action={<Button variant="secondary">Reset filters</Button>}
            />
            <ErrorState
              title="Something went wrong"
              text="Try again in a moment."
              requestId="3f9c2a1e-7b4d-4c1a"
              requestIdLabel="Request ID"
              action={<Button variant="secondary">Retry</Button>}
            />
          </div>
          <div className="flex flex-col gap-3 border border-line p-6">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </Block>

        <Block title="Dialogs, confirmations, toasts">
          <InteractiveDemo />
        </Block>
      </Container>
    </main>
  );
}
