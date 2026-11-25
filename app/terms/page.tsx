import { LegalPage } from "@/components/legal-page";

export const dynamic = "force-dynamic";

export default function TermsPage() {
  return <LegalPage eyebrow="Legal" title="Terms of Service" contentKey="termsContent" fallback="Terms of Service" />;
}
