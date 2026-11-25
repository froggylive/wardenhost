import { LegalPage } from "@/components/legal-page";

export const dynamic = "force-dynamic";

export default function PrivacyPage() {
  return <LegalPage eyebrow="Legal" title="Privacy Policy" contentKey="privacyContent" fallback="Privacy Policy" />;
}
