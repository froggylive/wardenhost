import { LegalPage } from "@/components/legal-page";

export const dynamic = "force-dynamic";

export default function CopyrightPage() {
  return <LegalPage eyebrow="Legal" title="Copyright & Intellectual Property" contentKey="copyrightContent" fallback="All rights reserved." />;
}
